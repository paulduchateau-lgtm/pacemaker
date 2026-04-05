import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { query } from "@/lib/db";
import { generateDocx, generateXlsx, generatePptx } from "@/lib/livrable-generator";
import { put } from "@vercel/blob";
import type { Week, Task, Risk, Budget } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { taskId, livrable } = await req.json();
    const { titre, description, format } = livrable;

    // Fetch task
    const taskRows = await query("SELECT * FROM tasks WHERE id = ?", [taskId]);
    if (taskRows.length === 0) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 });
    }
    const t = taskRows[0];
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
    };

    // Fetch full context for pre-filling
    const allWeeks = (await query("SELECT * FROM weeks ORDER BY id")).map(
      (r) => ({
        id: r.id as number,
        phase: r.phase as Week["phase"],
        title: r.title as string,
        budget_jh: r.budget_jh as number,
        actions: JSON.parse(r.actions as string),
        livrables: JSON.parse(r.livrables_plan as string),
        owner: r.owner as string,
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
      : { vendu_jh: 60, reel_cible_jh: 30, forfait_ht: 53900, tjm_affiche: 898, tjm_reel_cible: 1797, echeances: [] };

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

    // Generate content with AI
    const { getRelevantContext } = await import("@/lib/rag");
    const ragContext = await getRelevantContext(
      `${titre} ${description} ${task.label}`
    );

    const prompt = buildCreateLivrablePrompt(
      { titre, description, format },
      task,
      week,
      ctx,
      ragContext
    );

    const aiContent = await callLLM(prompt, 4000);

    // Detect output format
    const outputFormat = detectFormat(format);
    let fileBuffer: Buffer;
    let contentType: string;
    let extension: string;

    switch (outputFormat) {
      case "xlsx":
        fileBuffer = await generateXlsx(
          { titre, description, format },
          task,
          week,
          ctx,
          aiContent
        );
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        extension = "xlsx";
        break;
      case "pptx":
        fileBuffer = await generatePptx(
          { titre, description, format },
          task,
          week,
          ctx,
          aiContent
        );
        contentType =
          "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        extension = "pptx";
        break;
      default:
        fileBuffer = await generateDocx(
          { titre, description, format },
          task,
          week,
          ctx,
          aiContent
        );
        contentType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        extension = "docx";
        break;
    }

    // Upload to Blob
    const filename = `${sanitize(titre)}.${extension}`;
    const blob = await put(`pacemaker/livrables/${filename}`, fileBuffer, {
      access: "public",
      contentType,
    });

    return NextResponse.json({
      url: blob.url,
      filename,
      format: extension,
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

function buildCreateLivrablePrompt(
  livrable: { titre: string; description: string; format: string },
  task: Task,
  week: Week,
  ctx: {
    weeks: Week[];
    tasks: Task[];
    risks: Risk[];
    budget: Budget;
    currentWeek: number;
  },
  ragContext: string
): string {
  const activeRisks = ctx.risks.filter((r) => r.status === "actif");
  const weekTasks = ctx.tasks.filter((t) => t.weekId === week.id);

  return `Tu es un consultant senior en transformation BI Power BI pour l'Agirc-Arrco (Direction de l'Action Sociale).
Mission : 7 semaines effectives, 30 jh budget réel, forfait 60 jh / 53 900 € HT.
${ragContext}

CONTEXTE PROJET COMPLET :
- Semaine courante : S${ctx.currentWeek} / 7
- Phase : ${week.phase} — "${week.title}"
- Budget : ${ctx.budget.forfait_ht.toLocaleString("fr-FR")} € HT, ${ctx.budget.vendu_jh} jh vendus, ${ctx.budget.reel_cible_jh} jh réels
- Client : Agirc-Arrco, Direction de l'Action Sociale (DAS)
- Contacts : Benoît Baret, Nathalie Lazardeux

RISQUES ACTIFS :
${activeRisks.map((r) => `- ${r.label} (impact: ${r.impact}/5, proba: ${r.probability}/5) → ${r.mitigation}`).join("\n")}

TÂCHES SEMAINE ${week.id} :
${weekTasks.map((t) => `- [${t.status}] ${t.label} (${t.owner})`).join("\n")}

LIVRABLES PRÉVUS SEMAINE ${week.id} :
${week.livrables.map((l) => `- ${l}`).join("\n")}

---

LIVRABLE À CRÉER :
- Titre : ${livrable.titre}
- Description : ${livrable.description}
- Format cible : ${livrable.format}
- Tâche source : ${task.label}
${task.description ? `- Détail tâche : ${task.description}` : ""}

Rédige le contenu complet de ce livrable, prêt à être utilisé.
Utilise des sections avec des titres (## Titre de section).
Pré-remplis avec toutes les données connues du projet (risques, planning, budget, tâches, livrables, etc.).
Le document doit être professionnel, structuré, et directement exploitable par le client.
Rédige en français. Ne mets pas de marqueurs de placeholder — utilise les vraies données projet.`;
}
