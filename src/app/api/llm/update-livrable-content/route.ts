import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import {
  generateDocx,
  generateXlsx,
  generatePptx,
} from "@/lib/livrable-generator";
import { put } from "@vercel/blob";
import type { Week, Task, Risk, Budget } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Applique un contenu corrigé à un livrable existant :
 * - remplace l'aiContent dans task.livrables_generes.livrables[index]
 * - régénère le fichier (DOCX/XLSX/PPTX) avec le nouveau contenu
 * - uploade le nouveau blob (remplace l'URL précédente dans l'entrée livrable)
 */
export async function POST(req: NextRequest) {
  try {
    const { taskId, livrableIndex, correctedContent } = await req.json();

    if (
      typeof taskId !== "string" ||
      typeof livrableIndex !== "number" ||
      typeof correctedContent !== "string"
    ) {
      return NextResponse.json(
        { error: "taskId, livrableIndex et correctedContent requis" },
        { status: 400 }
      );
    }

    // Fetch task
    const taskRows = await query("SELECT * FROM tasks WHERE id = ?", [taskId]);
    if (taskRows.length === 0) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }
    const t = taskRows[0];

    const livrablesData = t.livrables_generes
      ? JSON.parse(t.livrables_generes as string)
      : null;

    if (
      !livrablesData ||
      !Array.isArray(livrablesData.livrables) ||
      livrableIndex < 0 ||
      livrableIndex >= livrablesData.livrables.length
    ) {
      return NextResponse.json(
        { error: "Livrable introuvable à cet index" },
        { status: 404 }
      );
    }

    const livrable = livrablesData.livrables[livrableIndex];
    const task: Task = {
      id: t.id as string,
      weekId: t.week_id as number,
      label: t.label as string,
      description: (t.description as string) || "",
      owner: t.owner as Task["owner"],
      priority: t.priority as Task["priority"],
      status: t.status as Task["status"],
      source: t.source as Task["source"],
      createdAt: t.created_at as string,
      completedAt: (t.completed_at as string) || null,
    };

    // Fetch week
    const weekRows = await query("SELECT * FROM weeks WHERE id = ?", [task.weekId]);
    const w = weekRows[0];
    const week: Week = {
      id: w.id as number,
      phase: w.phase as Week["phase"],
      title: w.title as string,
      budget_jh: w.budget_jh as number,
      actions: JSON.parse(w.actions as string),
      livrables: JSON.parse(w.livrables_plan as string),
      owner: w.owner as string,
      startDate: (w.start_date as string) || null,
      endDate: (w.end_date as string) || null,
      baselineStartDate: (w.baseline_start_date as string) || null,
      baselineEndDate: (w.baseline_end_date as string) || null,
    };

    // Fetch context for regeneration
    const allWeeks: Week[] = (await query("SELECT * FROM weeks ORDER BY id")).map(
      (r) => ({
        id: r.id as number,
        phase: r.phase as Week["phase"],
        title: r.title as string,
        budget_jh: r.budget_jh as number,
        actions: JSON.parse(r.actions as string),
        livrables: JSON.parse(r.livrables_plan as string),
        owner: r.owner as string,
        startDate: (r.start_date as string) || null,
        endDate: (r.end_date as string) || null,
        baselineStartDate: (r.baseline_start_date as string) || null,
        baselineEndDate: (r.baseline_end_date as string) || null,
      })
    );

    const allTasks = (await query("SELECT * FROM tasks")).map((r) => ({
      id: r.id as string,
      weekId: r.week_id as number,
      label: r.label as string,
      description: (r.description as string) || "",
      owner: r.owner as Task["owner"],
      priority: r.priority as Task["priority"],
      status: r.status as Task["status"],
      source: r.source as Task["source"],
      createdAt: r.created_at as string,
      completedAt: (r.completed_at as string) || null,
    }));

    const riskRows = await query("SELECT * FROM risks");
    const risks: Risk[] = riskRows.map((r) => ({
      id: r.id as string,
      label: r.label as string,
      impact: r.impact as number,
      probability: r.probability as number,
      status: r.status as Risk["status"],
      mitigation: r.mitigation as string,
    }));

    const budgetRow = await query(
      "SELECT value FROM project WHERE key = 'budget'"
    );
    const budget: Budget = budgetRow.length
      ? JSON.parse(budgetRow[0].value as string)
      : { vendu_jh: 0, reel_cible_jh: 0, forfait_ht: 0, tjm_affiche: 0, tjm_reel_cible: 0, echeances: [] };

    const cwRow = await query(
      "SELECT value FROM project WHERE key = 'current_week'"
    );
    const currentWeek = cwRow.length ? parseInt(cwRow[0].value as string) : 1;

    const ctx = {
      weeks: allWeeks,
      tasks: allTasks,
      risks,
      budget,
      currentWeek,
    };

    // Detect format and regenerate file with corrected content
    const outputFormat = detectFormat(livrable.format || "docx");
    let fileBuffer: Buffer;
    let contentType: string;
    let extension: string;

    const livrableSpec = {
      titre: livrable.titre as string,
      description: (livrable.description as string) || "",
      format: (livrable.format as string) || "docx",
    };

    switch (outputFormat) {
      case "xlsx":
        fileBuffer = await generateXlsx(livrableSpec, task, week, ctx, correctedContent);
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        extension = "xlsx";
        break;
      case "pptx":
        fileBuffer = await generatePptx(livrableSpec, task, week, ctx, correctedContent);
        contentType =
          "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        extension = "pptx";
        break;
      default:
        fileBuffer = await generateDocx(livrableSpec, task, week, ctx, correctedContent);
        contentType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        extension = "docx";
        break;
    }

    // Upload new blob (Vercel Blob auto-appends random suffix so old URL stays accessible)
    const filename = `${sanitize(livrableSpec.titre)}.${extension}`;
    const blob = await put(`pacemaker/livrables/${filename}`, fileBuffer, {
      access: "public",
      contentType,
    });

    // Update livrable entry in task JSON
    livrablesData.livrables[livrableIndex] = {
      ...livrable,
      aiContent: correctedContent,
      url: blob.url,
    };

    await execute(
      "UPDATE tasks SET livrables_generes = ? WHERE id = ?",
      [JSON.stringify(livrablesData), taskId]
    );

    return NextResponse.json({
      ok: true,
      url: blob.url,
      filename,
      format: extension,
      livrables_generes: JSON.stringify(livrablesData),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function detectFormat(format: string): "docx" | "xlsx" | "pptx" {
  const f = format.toLowerCase();
  if (f.includes("excel") || f.includes("xlsx") || f.includes("tableur") || f.includes("tableau")) {
    return "xlsx";
  }
  if (f.includes("ppt") || f.includes("présentation") || f.includes("presentation") || f.includes("slide") || f.includes("diapo")) {
    return "pptx";
  }
  return "docx";
}

function sanitize(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s_-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}
