import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";

export const dynamic = "force-dynamic";
import { buildParseUploadPrompt } from "@/lib/prompts";
import { execute } from "@/lib/db";

interface ParseResult {
  decisions: string[];
  actions: { label: string; owner: string; priority: string }[];
  risks: { label: string; impact: number; probability: number }[];
  opportunities: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { text, weekId } = await req.json();
    if (!text || !weekId) {
      return NextResponse.json(
        { error: "text et weekId requis" },
        { status: 400 }
      );
    }

    const { getRelevantContext, indexDocument } = await import("@/lib/rag");
    const { getRelevantRules } = await import("@/lib/rules");
    const { trackGeneration } = await import("@/lib/corrections");

    const ragContext = await getRelevantContext(text, weekId);
    const rules = await getRelevantRules("parse_cr", { weekId });
    const prompt = buildParseUploadPrompt(text, weekId, ragContext, rules);
    const result = await callLLM(prompt, 3000);

    const generationId = await trackGeneration({
      generationType: "parse_cr",
      context: { weekId },
      prompt,
      rawOutput: result,
      appliedRuleIds: rules.map((r) => r.id),
      weekId,
    });

    const parsed = parseJSON<ParseResult>(result);

    // Insert tasks
    for (const action of parsed.actions) {
      const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        "INSERT INTO tasks (id, week_id, label, owner, priority, source) VALUES (?, ?, ?, ?, ?, 'upload')",
        [id, weekId, action.label, action.owner, action.priority]
      );
    }

    // Insert risks
    for (const risk of parsed.risks) {
      const id = `risk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        "INSERT INTO risks (id, label, impact, probability) VALUES (?, ?, ?, ?)",
        [id, risk.label, risk.impact, risk.probability]
      );
    }

    // Insert events
    for (const decision of parsed.decisions) {
      const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        "INSERT INTO events (id, type, label, week_id, content) VALUES (?, 'decision', ?, ?, ?)",
        [id, decision, weekId, decision]
      );
    }

    for (const opp of parsed.opportunities) {
      const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await execute(
        "INSERT INTO events (id, type, label, week_id, content) VALUES (?, 'opportunity', ?, ?, ?)",
        [id, opp, weekId, opp]
      );
    }

    // Index CR as document for RAG
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute(
      `INSERT INTO documents (id, title, type, source, week_id, content)
       VALUES (?, ?, 'cr', 'upload', ?, ?)`,
      [docId, `CR S${weekId}`, weekId, text]
    );
    try {
      await indexDocument(docId, text);
    } catch {
      // RAG indexing is optional
    }

    // Upload event
    const evtId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute(
      "INSERT INTO events (id, type, label, week_id, content) VALUES (?, 'upload', ?, ?, ?)",
      [evtId, `CR importé — S${weekId}`, weekId, text.slice(0, 500)]
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
