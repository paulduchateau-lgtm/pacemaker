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
      ragContext
    );

    const result = await callLLM(prompt, 2000);
    const parsed = parseJSON<LivrableResult>(result);

    const livrables_generes = JSON.stringify(parsed);
    await execute(
      "UPDATE tasks SET livrables_generes = ? WHERE id = ?",
      [livrables_generes, taskId]
    );

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
