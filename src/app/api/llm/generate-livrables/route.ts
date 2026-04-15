import { NextRequest, NextResponse } from "next/server";
import { callLLM, parseJSON } from "@/lib/llm";
import { query, execute } from "@/lib/db";
import { buildGenerateLivrablesPrompt } from "@/lib/prompts";

export const dynamic = "force-dynamic";

interface LivrableResult {
  livrables: {
    titre: string;
    description: string;
    format: string;
  }[];
  plan_action: string;
}

export async function POST(req: NextRequest) {
  try {
    const { taskId } = await req.json();

    const rows = await query("SELECT * FROM tasks WHERE id = ?", [taskId]);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Tâche non trouvée" },
        { status: 404 }
      );
    }
    const task = rows[0];

    const weekRows = await query("SELECT * FROM weeks WHERE id = ?", [
      task.week_id,
    ]);
    const week = weekRows[0];

    const { getRelevantContext } = await import("@/lib/rag");
    const ragContext = await getRelevantContext(
      `${task.label} ${task.description || ""}`,
      task.week_id as number
    );

    const { getRelevantRules } = await import("@/lib/rules");
    const { trackGeneration } = await import("@/lib/corrections");

    // Fetch existing deliverables from other tasks to avoid duplicates
    const allTasks = await query(
      "SELECT livrables_generes FROM tasks WHERE id != ? AND livrables_generes IS NOT NULL",
      [taskId]
    );
    const existingLivrables: string[] = [];
    for (const t of allTasks) {
      try {
        const parsed = JSON.parse(t.livrables_generes as string);
        if (parsed?.livrables) {
          for (const l of parsed.livrables) {
            if (l.titre) existingLivrables.push(l.titre);
          }
        }
      } catch {
        // skip malformed
      }
    }

    const rules = await getRelevantRules("livrables", { weekId: week.id as number, taskLabel: task.label as string });
    const prompt = buildGenerateLivrablesPrompt(
      {
        label: task.label as string,
        description: (task.description as string) || "",
        owner: task.owner as string,
        priority: task.priority as string,
      },
      {
        phase: week.phase as string,
        title: week.title as string,
        weekId: week.id as number,
      },
      ragContext,
      rules,
      existingLivrables
    );

    const result = await callLLM(prompt, 2000);

    const generationId = await trackGeneration({
      generationType: "livrables",
      context: { taskId, weekId: week.id as number },
      prompt,
      rawOutput: result,
      appliedRuleIds: rules.map((r) => r.id),
      weekId: week.id as number,
    });

    const parsed = parseJSON<LivrableResult>(result);

    const livrables_generes = JSON.stringify(parsed);
    await execute(
      "UPDATE tasks SET livrables_generes = ? WHERE id = ?",
      [livrables_generes, taskId]
    );

    return NextResponse.json({ ...parsed, generationId, rawOutput: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
