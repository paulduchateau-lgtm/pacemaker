import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { execute } from "@/lib/db";
import { put } from "@vercel/blob";
import { buildCreateLivrablePrompt } from "@/lib/prompts";
import { loadLivrableContext } from "@/lib/livrables/context";
import { parseLivrablePayload } from "@/lib/livrables/validate";
import { markdownToPayload } from "@/lib/livrables/fallback";
import { renderLivrable, detectFormat } from "@/lib/livrables/render";
import { getLivrableTheme } from "@/lib/livrables/theme-store";
import { getTheme } from "@/lib/livrables/themes";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { taskId, livrable, customPrompt, themeId } = await req.json();
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

    // Thème : paramètre explicite > projet > défaut
    const resolvedThemeId = themeId || (await getLivrableTheme());
    const theme = getTheme(resolvedThemeId);

    const defaultPrompt = buildCreateLivrablePrompt(
      { titre, description, format },
      ctx.task,
      ctx.week,
      { weeks: ctx.allWeeks, tasks: ctx.allTasks, risks: ctx.risks, budget: ctx.budget, currentWeek: ctx.currentWeek },
      ragContext,
      rules,
      missionContext,
      theme.promptHints
    );
    const prompt = customPrompt || defaultPrompt;

    // 1re tentative
    let aiContent = await callLLM(prompt, 4000);
    let payload = parseLivrablePayload(aiContent);

    // Retry si JSON invalide
    if (!payload) {
      const retryPrompt = `${prompt}\n\nTA RÉPONSE PRÉCÉDENTE N'ÉTAIT PAS UN JSON VALIDE.
Retourne UNIQUEMENT un objet JSON conforme au schéma LivrablePayload, sans aucun texte autour ni balise \`\`\`.`;
      aiContent = await callLLM(retryPrompt, 4000);
      payload = parseLivrablePayload(aiContent);
    }

    // Fallback final : on traite la sortie comme markdown
    if (!payload) {
      payload = markdownToPayload(aiContent, { title: titre, subtitle: description });
    }

    const extension = detectFormat(format);
    const result = await renderLivrable(payload, { themeId: resolvedThemeId, format: extension });

    const blob = await put(`pacemaker/livrables/${result.filename}`, result.buffer, {
      access: "public",
      contentType: result.contentType,
    });

    const { trackGeneration } = await import("@/lib/corrections");
    const generationId = await trackGeneration({
      generationType: "livrables",
      context: { taskId, titre, format, themeId: resolvedThemeId },
      prompt,
      rawOutput: aiContent,
      appliedRuleIds: [],
      weekId: ctx.task.weekId,
    });

    // Indexe en base documentaire pour la découverte
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await execute(
      `INSERT INTO documents (id, title, type, source, week_id, blob_url, content, created_at)
       VALUES (?, ?, 'spec', 'manual', ?, ?, ?, datetime('now'))`,
      [docId, titre, ctx.task.weekId, blob.url, aiContent.substring(0, 2000)]
    );

    return NextResponse.json({
      url: blob.url,
      filename: result.filename,
      format: result.extension,
      docId,
      generationId,
      aiContent, // JSON brut du payload — consommé par la modale de correction
      themeId: resolvedThemeId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
