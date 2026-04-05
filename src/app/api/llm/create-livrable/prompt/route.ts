import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { Week, Task, Risk, Budget } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { taskId, livrable } = await req.json();
    const { titre, description, format } = livrable;

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
      completedAt: (t.completed_at as string) || null,
    };

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

    const budgetRow = await query("SELECT value FROM project WHERE key = 'budget'");
    const budget: Budget = budgetRow.length
      ? JSON.parse(budgetRow[0].value as string)
      : { vendu_jh: 60, reel_cible_jh: 30, forfait_ht: 53900, tjm_affiche: 898, tjm_reel_cible: 1797, echeances: [] };

    const cwRow = await query("SELECT value FROM project WHERE key = 'current_week'");
    const currentWeek = cwRow.length ? parseInt(cwRow[0].value as string) : 1;

    const { getRelevantContext } = await import("@/lib/rag");
    const ragContext = await getRelevantContext(`${titre} ${description} ${task.label}`);

    const activeRisks = risks.filter((r) => r.status === "actif");
    const weekTasks = allTasks.filter((at) => at.weekId === week.id);

    const prompt = `Tu es un consultant senior en transformation BI Power BI pour l'Agirc-Arrco (Direction de l'Action Sociale).
Mission : 7 semaines effectives, 30 jh budget réel, forfait 60 jh / 53 900 € HT.
${ragContext}

CONTEXTE PROJET COMPLET :
- Semaine courante : S${currentWeek} / 7
- Phase : ${week.phase} — "${week.title}"
- Budget : ${budget.forfait_ht.toLocaleString("fr-FR")} € HT, ${budget.vendu_jh} jh vendus, ${budget.reel_cible_jh} jh réels
- Client : Agirc-Arrco, Direction de l'Action Sociale (DAS)
- Contacts : Benoît Baret, Nathalie Lazardeux

RISQUES ACTIFS :
${activeRisks.map((r) => `- ${r.label} (impact: ${r.impact}/5, proba: ${r.probability}/5) → ${r.mitigation}`).join("\n")}

TÂCHES SEMAINE ${week.id} :
${weekTasks.map((wt) => `- [${wt.status}] ${wt.label} (${wt.owner})`).join("\n")}

LIVRABLES PRÉVUS SEMAINE ${week.id} :
${week.livrables.map((l) => `- ${l}`).join("\n")}

---

LIVRABLE À CRÉER :
- Titre : ${titre}
- Description : ${description}
- Format cible : ${format}
- Tâche source : ${task.label}
${task.description ? `- Détail tâche : ${task.description}` : ""}

Rédige le contenu complet de ce livrable, prêt à être utilisé.
Utilise des sections avec des titres (## Titre de section).
Pré-remplis avec toutes les données connues du projet (risques, planning, budget, tâches, livrables, etc.).
Le document doit être professionnel, structuré, et directement exploitable par le client.
Rédige en français. Ne mets pas de marqueurs de placeholder — utilise les vraies données projet.`;

    return NextResponse.json({ prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
