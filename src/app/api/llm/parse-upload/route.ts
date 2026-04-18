import { NextRequest, NextResponse } from "next/server";
import { callLLMWithUsage, parseJSON } from "@/lib/llm";
import { buildParseUploadPrompt } from "@/lib/prompts";
import { execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";
import { kickOffDetection } from "@/lib/incoherences";

export const dynamic = "force-dynamic";

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
    const prompt = buildParseUploadPrompt(
      text,
      weekId,
      ragContext,
      rules,
      missionContext,
    );
    const { text: result, usage, model } = await callLLMWithUsage(prompt, 3000);

    const generationId = await trackGeneration({
      generationType: "parse_cr",
      context: { weekId },
      prompt,
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
        await createDecision(mission.id, {
          statement: d.statement,
          rationale: d.rationale ?? null,
          alternatives: d.alternatives?.length ? d.alternatives : null,
          author: d.author ?? "paul",
          status: "actée",
          sourceType: "parse_cr",
          sourceRef: eventId,
          weekId,
        });
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

    // Détection d'incohérences en arrière-plan (non-bloquante, chantier 3).
    kickOffDetection({
      missionId: mission.id,
      sourceEntityType: "cr_upload",
      sourceEntityId: docId,
      summary: text.slice(0, 1500),
      triggerGenerationId: generationId,
    });

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
