import { NextRequest, NextResponse } from "next/server";
import { callLLMCached, parseJSON } from "@/lib/llm";
import { buildParseUploadPrompt } from "@/lib/prompts";
import { execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RichDecision {
  statement: string;
  rationale?: string | null;
  alternatives?: string[] | null;
  author?: "paul" | "paul_b" | "client";
  confidence?: number;
  severity?: string;
}

interface ParseResult {
  decisions: Array<RichDecision | string>;
  actions: { label: string; owner: string; priority: string; confidence?: number; reasoning?: string; severity?: string }[];
  risks: { label: string; impact: number; probability: number; confidence?: number; reasoning?: string; severity?: string }[];
  opportunities: string[];
}

async function applyImmediate(parsed: ParseResult, mission: { id: string }, weekId: string | number, docId: string, eventId: string) {
  for (const action of parsed.actions) {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute(
      `INSERT INTO tasks (id, week_id, label, owner, priority, source, mission_id, confidence, reasoning)
       VALUES (?, ?, ?, ?, ?, 'upload', ?, ?, ?)`,
      [id, weekId, action.label, action.owner, action.priority, mission.id,
       typeof action.confidence === "number" ? action.confidence : null, action.reasoning ?? null],
    );
  }
  for (const risk of parsed.risks) {
    const id = `risk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute(
      `INSERT INTO risks (id, label, impact, probability, mission_id, confidence, reasoning)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, risk.label, risk.impact, risk.probability, mission.id,
       typeof risk.confidence === "number" ? risk.confidence : null, risk.reasoning ?? null],
    );
  }
  const { createDecision } = await import("@/lib/decisions");
  for (const raw of parsed.decisions) {
    const d: RichDecision = typeof raw === "string" ? { statement: raw } : raw;
    if (!d.statement?.trim()) continue;
    const eId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute(
      "INSERT INTO events (id, type, label, week_id, content, mission_id) VALUES (?, 'decision', ?, ?, ?, ?)",
      [eId, d.statement, weekId, d.rationale ?? d.statement, mission.id],
    );
    try {
      await createDecision(mission.id, { statement: d.statement, rationale: d.rationale ?? null, alternatives: d.alternatives?.length ? d.alternatives : null, author: d.author ?? "paul", status: "actée", sourceType: "parse_cr", sourceRef: eId, weekId: Number(weekId) }, { skipAutoRecalibration: true });
    } catch { /* best-effort */ }
  }
  for (const opp of parsed.opportunities) {
    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute("INSERT INTO events (id, type, label, week_id, content, mission_id) VALUES (?, 'opportunity', ?, ?, ?, ?)", [id, opp, weekId, opp, mission.id]);
  }
  await execute("INSERT INTO events (id, type, label, week_id, content, mission_id) VALUES (?, 'upload', ?, ?, ?, ?)", [eventId, `CR importé — S${weekId}`, weekId, `doc:${docId}`, mission.id]);
}

export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const body = await req.json();
    const { text, weekId } = body;
    if (!text || !weekId) return NextResponse.json({ error: "text et weekId requis" }, { status: 400 });

    const applyMode: "propose" | "immediate" = body.apply_mode ?? (process.env.NEXT_PUBLIC_V2_ARBITRAGE === "true" ? "propose" : "immediate");

    const { getRelevantContext, indexDocument } = await import("@/lib/rag");
    const { getRelevantRules } = await import("@/lib/rules");
    const { trackGeneration } = await import("@/lib/corrections");
    const { getMissionContext } = await import("@/lib/mission-context");

    const ragContext = await getRelevantContext(text, { weekId, missionId: mission.id });
    const rules = await getRelevantRules("parse_cr", { weekId }, { missionId: mission.id });
    const missionContext = await getMissionContext({ missionId: mission.id });
    const { system, user } = buildParseUploadPrompt(text, weekId, ragContext, rules, missionContext);
    const { text: result, usage, model } = await callLLMCached(system, user, 3000);

    const generationId = await trackGeneration({ generationType: "parse_cr", context: { weekId }, prompt: `=== SYSTEM ===\n${system}\n\n=== USER ===\n${user}`, rawOutput: result, appliedRuleIds: rules.map((r) => r.id), weekId, missionId: mission.id, usage, model, route: "llm/parse-upload", triggeredBy: "user" });
    const parsed = parseJSON<ParseResult>(result);

    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute(`INSERT INTO documents (id, title, type, source, week_id, content, mission_id) VALUES (?, ?, 'cr', 'upload', ?, ?, ?)`, [docId, `CR S${weekId}`, weekId, text, mission.id]);
    try { await indexDocument(docId, text); } catch { /* RAG optionnel */ }

    if (applyMode === "propose") {
      const { createIntake, updateIntakeStatus, parseIntakeFromText } = await import("@/lib/intakes");
      const intake = await createIntake(mission.id, { source_type: "cr_text", raw_content_excerpt: text.slice(0, 500), document_id: docId });
      const impactInputs = [
        ...parsed.actions.map((a, i) => ({ target_type: "task" as const, change_type: "add" as const, diff_after: a, rationale: a.reasoning, confidence: a.confidence ?? 0.6, severity: (a.severity as "minor" | "moderate" | "major" | undefined) ?? "moderate", order_index: i })),
        ...parsed.decisions.map((d, i) => { const dec = typeof d === "string" ? { statement: d } : d; return { target_type: "decision" as const, change_type: "add" as const, diff_after: dec, rationale: dec.rationale ?? undefined, confidence: typeof d !== "string" ? dec.confidence ?? 0.6 : 0.6, severity: (typeof d !== "string" ? (d as RichDecision).severity as "minor" | "moderate" | "major" | undefined : undefined) ?? "moderate", order_index: parsed.actions.length + i }; }),
        ...parsed.risks.map((r, i) => ({ target_type: "risk" as const, change_type: "add" as const, diff_after: r, rationale: r.reasoning, confidence: r.confidence ?? 0.6, severity: (r.severity as "minor" | "moderate" | "major" | undefined) ?? "moderate", order_index: parsed.actions.length + parsed.decisions.length + i })),
      ];
      const impacts = await parseIntakeFromText(mission.id, intake.id, impactInputs);
      await updateIntakeStatus(intake.id, "parsed", { parsed_at: new Date().toISOString(), parse_generation_id: generationId });
      return NextResponse.json({ intakeId: intake.id, impactCount: impacts.length, impacts, generationId });
    }

    const evtId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await applyImmediate(parsed, mission, weekId, docId, evtId);

    try { const { logTimeSaving } = await import("@/lib/time-savings"); await logTimeSaving({ missionId: mission.id, activity: "cr_parsing", sourceEntityType: "document", sourceEntityId: docId }); } catch { /* best-effort */ }

    if (parsed.decisions.length > 0 || parsed.actions.length > 0) {
      try { const { kickOffAutoRecalibration } = await import("@/lib/recalibration"); await kickOffAutoRecalibration({ missionId: mission.id, scope: "full_plan", trigger: "auto_on_input", triggerRef: docId, wait: true }); } catch (err) { console.warn("[parse-upload] recalib post-CR echouee:", err); }
    }

    return NextResponse.json({ decisions: parsed.decisions.length, actions: parsed.actions.length, risks: parsed.risks.length, opportunities: parsed.opportunities.length, generationId, rawOutput: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
