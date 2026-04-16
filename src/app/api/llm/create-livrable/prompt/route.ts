import { NextRequest, NextResponse } from "next/server";
import { buildCreateLivrablePrompt } from "@/lib/prompts";
import { loadLivrableContext } from "@/lib/livrables/context";
import { getLivrableTheme } from "@/lib/livrables/theme-store";
import { getTheme } from "@/lib/livrables/themes";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { taskId, livrable, themeId } = await req.json();
    const { titre, description, format } = livrable;

    const ctx = await loadLivrableContext(taskId);
    if (!ctx) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }

    const { getRelevantContext } = await import("@/lib/rag");
    const { getRelevantRules } = await import("@/lib/rules");
    const { getMissionContext } = await import("@/lib/mission-context");

    const ragContext = await getRelevantContext(`${titre} ${description} ${ctx.task.label}`);
    const rules = await getRelevantRules("livrables", {
      weekId: ctx.week.id,
      taskLabel: ctx.task.label,
    });
    const missionContext = await getMissionContext();
    const resolvedThemeId = themeId || (await getLivrableTheme());
    const theme = getTheme(resolvedThemeId);

    const prompt = buildCreateLivrablePrompt(
      { titre, description, format },
      ctx.task,
      ctx.week,
      { weeks: ctx.allWeeks, tasks: ctx.allTasks, risks: ctx.risks, budget: ctx.budget, currentWeek: ctx.currentWeek },
      ragContext,
      rules,
      missionContext,
      theme.promptHints
    );

    return NextResponse.json({ prompt, themeId: resolvedThemeId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
