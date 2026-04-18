import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";
import { buildParseUploadPrompt } from "@/lib/prompts";
import { execute } from "@/lib/db";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

interface ParseResult {
  decisions: string[];
  actions: { label: string; owner: string; priority: string }[];
  risks: { label: string; impact: number; probability: number }[];
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
    const result = await callLLM(prompt, 3000);

    const generationId = await trackGeneration({
      generationType: "parse_cr",
      context: { weekId },
      prompt,
      rawOutput: result,
      appliedRuleIds: rules.map((r) => r.id),
      weekId,
      missionId: mission.id,
    });

    const parsed = parseJSON<ParseResult>(result);

    for (const action of parsed.actions) {
      const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        "INSERT INTO tasks (id, week_id, label, owner, priority, source, mission_id) VALUES (?, ?, ?, ?, ?, 'upload', ?)",
        [id, weekId, action.label, action.owner, action.priority, mission.id],
      );
    }

    for (const risk of parsed.risks) {
      const id = `risk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        "INSERT INTO risks (id, label, impact, probability, mission_id) VALUES (?, ?, ?, ?, ?)",
        [id, risk.label, risk.impact, risk.probability, mission.id],
      );
    }

    for (const decision of parsed.decisions) {
      const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        "INSERT INTO events (id, type, label, week_id, content, mission_id) VALUES (?, 'decision', ?, ?, ?, ?)",
        [id, decision, weekId, decision, mission.id],
      );
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
