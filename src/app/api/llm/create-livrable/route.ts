import { NextRequest, NextResponse } from "next/server";
import { callLLMWithUsage } from "@/lib/llm";
import { execute } from "@/lib/db";
import { put } from "@vercel/blob";
import { buildCreateLivrablePrompt } from "@/lib/prompts";
import { loadLivrableContext } from "@/lib/livrables/context";
import { parseLivrablePayload } from "@/lib/livrables/validate";
import { markdownToPayload } from "@/lib/livrables/fallback";
import { renderLivrable, detectFormat } from "@/lib/livrables/render";
import { getLivrableTheme } from "@/lib/livrables/theme-store";
import { getTheme } from "@/lib/livrables/themes";
import { resolveActiveMission } from "@/lib/mission";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const mission = await resolveActiveMission(req);
    const { taskId, livrable, customPrompt, themeId } = await req.json();
    const { titre, description, format } = livrable;

    const ctx = await loadLivrableContext(taskId, mission.id);
    if (!ctx) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }

    const { getRelevantContext } = await import("@/lib/rag");
    const { getRelevantRules } = await import("@/lib/rules");
    const { getMissionContext } = await import("@/lib/mission-context");

    const ragContext = await getRelevantContext(
      `${titre} ${description} ${ctx.task.label}`,
      { missionId: mission.id },
    );
    const rules = await getRelevantRules(
      "livrables",
      { weekId: ctx.week.id, taskLabel: ctx.task.label },
      { missionId: mission.id },
    );
    const missionContext = await getMissionContext({ missionId: mission.id });

    // Thème : paramètre explicite > mission > défaut
    const resolvedThemeId =
      themeId || (await getLivrableTheme({ missionId: mission.id }));
    const theme = getTheme(resolvedThemeId);

    const defaultPrompt = buildCreateLivrablePrompt(
      { titre, description, format },
      ctx.task,
      ctx.week,
      {
        weeks: ctx.allWeeks,
        tasks: ctx.allTasks,
        risks: ctx.risks,
        budget: ctx.budget,
        currentWeek: ctx.currentWeek,
      },
      ragContext,
      rules,
      missionContext,
      theme.promptHints,
    );
    const prompt = customPrompt || defaultPrompt;

    console.log(
      `[create-livrable] start taskId=${taskId} mission=${mission.slug} theme=${resolvedThemeId} format=${format}`,
    );
    const t0 = Date.now();
    const { text: aiContent, usage, model } = await callLLMWithUsage(prompt, 4000);
    console.log(
      `[create-livrable] llm#1 done in ${Date.now() - t0}ms, ${aiContent.length} chars`,
    );
    let payload = parseLivrablePayload(aiContent);
    let usedFallback = false;

    if (!payload) {
      console.warn(
        `[create-livrable] JSON invalide, fallback markdown. Preview: ${aiContent.slice(0, 200)}`,
      );
      payload = markdownToPayload(aiContent, {
        title: titre,
        subtitle: description,
      });
      usedFallback = true;
    }

    const extension = detectFormat(format);
    let result;
    try {
      result = await renderLivrable(payload, {
        themeId: resolvedThemeId,
        format: extension,
      });
    } catch (renderErr) {
      const msg =
        renderErr instanceof Error ? renderErr.message : String(renderErr);
      console.error(`[create-livrable] render ${extension} failed:`, msg);
      const fallbackPayload = markdownToPayload(aiContent, {
        title: titre,
        subtitle: description,
      });
      result = await renderLivrable(fallbackPayload, {
        themeId: resolvedThemeId,
        format: "docx",
      });
      usedFallback = true;
    }

    const blob = await put(
      `pacemaker/livrables/${result.filename}`,
      result.buffer,
      {
        access: "public",
        contentType: result.contentType,
      },
    );
    console.log(
      `[create-livrable] ok in ${Date.now() - t0}ms, fallback=${usedFallback}, url=${blob.url}`,
    );

    const { trackGeneration } = await import("@/lib/corrections");
    const generationId = await trackGeneration({
      generationType: "livrables",
      context: { taskId, titre, format, themeId: resolvedThemeId },
      prompt,
      rawOutput: aiContent,
      appliedRuleIds: [],
      weekId: ctx.task.weekId,
      missionId: mission.id,
      usage,
      model,
      route: "llm/create-livrable",
      triggeredBy: "user",
    });

    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute(
      `INSERT INTO documents (id, title, type, source, week_id, blob_url, content, created_at, mission_id)
       VALUES (?, ?, 'spec', 'manual', ?, ?, ?, datetime('now'), ?)`,
      [
        docId,
        titre,
        ctx.task.weekId,
        blob.url,
        aiContent.substring(0, 2000),
        mission.id,
      ],
    );

    return NextResponse.json({
      url: blob.url,
      filename: result.filename,
      format: result.extension,
      docId,
      generationId,
      aiContent,
      themeId: resolvedThemeId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[create-livrable] fatal:", message, stack);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
