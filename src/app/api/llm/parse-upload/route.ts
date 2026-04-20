import { NextRequest, NextResponse } from "next/server";
import { callLLMCached, parseJSON } from "@/lib/llm";
import { buildParseUploadPrompt } from "@/lib/prompts";
import { execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";
// parse-upload fait 1 appel LLM (parse CR) puis déclenche une recalib qui
// inclut désormais la détection d'incohérences dans sa sortie JSON.
export const maxDuration = 60;

interface RichDecision {
  statement: string;
  rationale?: string | null;
  alternatives?: string[] | null;
  author?: "paul" | "paul_b" | "client";
}

interface ParseResult {
  // L'ancien prompt renvoyait `decisions: string[]` ; le nouveau renvoie des
  // objets enrichis. On accepte les deux formats pour ne rien casser.
  decisions: Array<RichDecision | string>;
  actions: {
    label: string;
    owner: string;
    priority: string;
    confidence?: number;
    reasoning?: string;
  }[];
  risks: {
    label: string;
    impact: number;
    probability: number;
    confidence?: number;
    reasoning?: string;
  }[];
  opportunities: string[];
}

export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const { text, weekId } = await req.json();
    if (!text || !weekId) {
      return NextResponse.json(
        { error: "text et weekId requis" },
        { status: 400 },
      );
    }

    const { getRelevantContext, indexDocument } = await import("@/lib/rag");
    const { getRelevantRules } = await import("@/lib/rules");
    const { trackGeneration } = await import("@/lib/corrections");
    const { getMissionContext } = await import("@/lib/mission-context");

    const ragContext = await getRelevantContext(text, {
      weekId,
      missionId: mission.id,
    });
    const rules = await getRelevantRules(
      "parse_cr",
      { weekId },
      { missionId: mission.id },
    );
    const missionContext = await getMissionContext({ missionId: mission.id });
    const { system, user } = buildParseUploadPrompt(
      text,
      weekId,
      ragContext,
      rules,
      missionContext,
    );
    const { text: result, usage, model } = await callLLMCached(system, user, 3000);

    const generationId = await trackGeneration({
      generationType: "parse_cr",
      context: { weekId },
      prompt: `=== SYSTEM ===\n${system}\n\n=== USER ===\n${user}`,
      rawOutput: result,
      appliedRuleIds: rules.map((r) => r.id),
      weekId,
      missionId: mission.id,
      usage,
      model,
      route: "llm/parse-upload",
      triggeredBy: "user",
    });

    const parsed = parseJSON<ParseResult>(result);

    for (const action of parsed.actions) {
      const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        `INSERT INTO tasks
           (id, week_id, label, owner, priority, source, mission_id, confidence, reasoning)
         VALUES (?, ?, ?, ?, ?, 'upload', ?, ?, ?)`,
        [
          id,
          weekId,
          action.label,
          action.owner,
          action.priority,
          mission.id,
          typeof action.confidence === "number" ? action.confidence : null,
          action.reasoning ?? null,
        ],
      );
    }

    for (const risk of parsed.risks) {
      const id = `risk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        `INSERT INTO risks
           (id, label, impact, probability, mission_id, confidence, reasoning)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          risk.label,
          risk.impact,
          risk.probability,
          mission.id,
          typeof risk.confidence === "number" ? risk.confidence : null,
          risk.reasoning ?? null,
        ],
      );
    }

    const { createDecision } = await import("@/lib/decisions");
    for (const raw of parsed.decisions) {
      const d: RichDecision =
        typeof raw === "string" ? { statement: raw } : raw;
      if (!d.statement || !d.statement.trim()) continue;
      const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        "INSERT INTO events (id, type, label, week_id, content, mission_id) VALUES (?, 'decision', ?, ?, ?, ?)",
        [eventId, d.statement, weekId, d.rationale ?? d.statement, mission.id],
      );
      try {
        // skipAutoRecalibration : le CR peut contenir 3+ décisions, on ne
        // veut pas 3 recalibrations successives. On fait UNE recalibration
        // à la fin de parse-upload.
        await createDecision(
          mission.id,
          {
            statement: d.statement,
            rationale: d.rationale ?? null,
            alternatives: d.alternatives?.length ? d.alternatives : null,
            author: d.author ?? "paul",
            status: "actée",
            sourceType: "parse_cr",
            sourceRef: eventId,
            weekId,
          },
          { skipAutoRecalibration: true },
        );
      } catch {
        // si createDecision échoue (DB inconsistante, etc.) on garde au moins
        // l'event pour ne rien perdre — le chantier 02 peut être rejoué.
      }
    }

    for (const opp of parsed.opportunities) {
      const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        "INSERT INTO events (id, type, label, week_id, content, mission_id) VALUES (?, 'opportunity', ?, ?, ?, ?)",
        [id, opp, weekId, opp, mission.id],
      );
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute(
      `INSERT INTO documents (id, title, type, source, week_id, content, mission_id)
       VALUES (?, ?, 'cr', 'upload', ?, ?, ?)`,
      [docId, `CR S${weekId}`, weekId, text, mission.id],
    );
    try {
      await indexDocument(docId, text);
    } catch {
      // RAG optionnelle
    }

    const evtId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute(
      "INSERT INTO events (id, type, label, week_id, content, mission_id) VALUES (?, 'upload', ?, ?, ?, ?)",
      [evtId, `CR importé — S${weekId}`, weekId, text.slice(0, 500), mission.id],
    );

    // Chantier 8 : temps gagné par parsing CR (action user-triggered).
    try {
      const { logTimeSaving } = await import("@/lib/time-savings");
      await logTimeSaving({
        missionId: mission.id,
        activity: "cr_parsing",
        sourceEntityType: "document",
        sourceEntityId: docId,
      });
    } catch {
      /* best-effort */
    }

    // Une seule recalibration synchrone à la fin pour absorber le CR
    // (plutôt qu'une par décision). Permet au client d'afficher le plan
    // à jour dès que la réponse revient. Fire-and-forget meurt sur
    // Vercel serverless, d'où l'await.
    if (parsed.decisions.length > 0 || parsed.actions.length > 0) {
      try {
        const { kickOffAutoRecalibration } = await import(
          "@/lib/recalibration"
        );
        await kickOffAutoRecalibration({
          missionId: mission.id,
          scope: "full_plan",
          trigger: "auto_on_input",
          triggerRef: docId,
          wait: true,
        });
      } catch (err) {
        console.warn("[parse-upload] recalib post-CR échouée:", err);
      }
    }

    return NextResponse.json({
      decisions: parsed.decisions.length,
      actions: parsed.actions.length,
      risks: parsed.risks.length,
      opportunities: parsed.opportunities.length,
      generationId,
      rawOutput: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
