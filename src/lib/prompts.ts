import type { Week, Task, Risk, MissionEvent } from "@/types";

export function buildGenerateTasksPrompt(
  week: Week,
  existingTasks: Task[],
  prevWeekTasks: Task[],
  ragContext: string = ""
): string {
  const blocked = prevWeekTasks.filter((t) => t.status === "bloqu\u00e9");
  const notDone = prevWeekTasks.filter(
    (t) => t.status !== "fait" && t.status !== "bloqu\u00e9"
  );

  return `Tu es un assistant de pilotage de mission de consulting BI Power BI pour Agirc-Arrco (DAS).
Mission : 7 semaines effectives, 30 jh budget r\u00e9el, forfait 60 jh / 53 900 \u20ac HT.
${ragContext}
Semaine ${week.id} \u2014 "${week.title}" (phase ${week.phase})
Budget : ${week.budget_jh} jh
Actions pr\u00e9vues : ${week.actions.join(", ")}
Livrables attendus : ${week.livrables.join(", ")}
Responsable : ${week.owner}

T\u00e2ches d\u00e9j\u00e0 cr\u00e9\u00e9es : ${existingTasks.length > 0 ? existingTasks.map((t) => t.label).join(", ") : "aucune"}

${blocked.length > 0 ? `T\u00e2ches bloqu\u00e9es semaine pr\u00e9c\u00e9dente : ${blocked.map((t) => t.label).join(", ")}` : ""}
${notDone.length > 0 ? `T\u00e2ches non termin\u00e9es semaine pr\u00e9c\u00e9dente : ${notDone.map((t) => t.label).join(", ")}` : ""}

G\u00e9n\u00e8re 4 \u00e0 6 t\u00e2ches concr\u00e8tes et actionnables pour cette semaine.
Les owners possibles sont : "Paul", "Paul B.", "Client".
Les priorit\u00e9s possibles sont : "haute", "moyenne", "basse".

R\u00e9ponds UNIQUEMENT avec un tableau JSON :
[{"label": "...", "owner": "Paul|Paul B.|Client", "priority": "haute|moyenne|basse"}]`;
}

export function buildParseUploadPrompt(
  uploadText: string,
  weekId: number,
  ragContext: string = ""
): string {
  return `Tu es un assistant de pilotage de mission de consulting BI Power BI pour Agirc-Arrco (DAS).
${ragContext}
Voici un compte-rendu de r\u00e9union pour la semaine ${weekId} :

---
${uploadText}
---

Extrais les \u00e9l\u00e9ments structur\u00e9s suivants du compte-rendu.
Les owners possibles pour les actions sont : "Paul", "Paul B.", "Client".
Les priorit\u00e9s possibles sont : "haute", "moyenne", "basse".

R\u00e9ponds UNIQUEMENT avec du JSON :
{
  "decisions": ["..."],
  "actions": [{"label": "...", "owner": "...", "priority": "..."}],
  "risks": [{"label": "...", "impact": 1, "probability": 1}],
  "opportunities": ["..."]
}`;
}

interface RecalibrationState {
  currentWeek: number;
  weeks: Week[];
  tasks: Task[];
  risks: Risk[];
  events: MissionEvent[];
}

export function buildRecalibrationPrompt(
  state: RecalibrationState,
  ragContext: string = ""
): string {
  const weekSummaries = state.weeks.map((w) => {
    const weekTasks = state.tasks.filter((t) => t.weekId === w.id);
    const done = weekTasks.filter((t) => t.status === "fait").length;
    const blocked = weekTasks.filter((t) => t.status === "bloqu\u00e9").length;
    const isPast = w.id < state.currentWeek;

    return `Semaine ${w.id} (${w.phase} \u2014 ${w.title}) [${w.budget_jh} jh]${isPast ? " [PASS\u00c9E]" : w.id === state.currentWeek ? " [EN COURS]" : ""}
  T\u00e2ches : ${weekTasks.length} total, ${done} faites, ${blocked} bloqu\u00e9es
  Livrables pr\u00e9vus : ${w.livrables.join(", ")}`;
  });

  const activeRisks = state.risks.filter((r) => r.status === "actif");
  const decisions = state.events.filter((e) => e.type === "decision");

  return `Tu es un assistant de pilotage de mission BI Power BI pour Agirc-Arrco (DAS).
Mission : 7 semaines, 30 jh budget r\u00e9el, forfait 60 jh / 53 900 \u20ac HT.
La mission est actuellement \u00e0 la semaine ${state.currentWeek}.
${ragContext}
\u00c9tat complet du projet :

${weekSummaries.join("\n\n")}

Risques actifs :
${activeRisks.map((r) => `- ${r.label} (impact: ${r.impact}, proba: ${r.probability})`).join("\n")}

D\u00e9cisions prises :
${decisions.map((d) => `- S${d.weekId}: ${d.label}`).join("\n")}

Recalibre le plan pour les semaines \u00e0 venir (\u00e0 partir de la semaine ${state.currentWeek}).
- Pr\u00e9serve les t\u00e2ches "fait"
- Reporte les blocages intelligemment
- Respecte les jalons/livrables de chaque semaine
- Respecte le budget jh par semaine

Les owners possibles sont : "Paul", "Paul B.", "Client".
Les priorit\u00e9s possibles sont : "haute", "moyenne", "basse".

R\u00e9ponds UNIQUEMENT avec du JSON :
{
  "weeks": {
    "${state.currentWeek}": [{"label": "...", "owner": "...", "priority": "..."}]
  },
  "carryover_notes": "Explication"
}`;
}
