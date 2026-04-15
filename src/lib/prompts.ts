import type { Week, Task, Risk, MissionEvent, Rule } from "@/types";
import { buildRulesBlock } from "./rules";

interface TaskForLivrables {
  label: string;
  description: string;
  owner: string;
  priority: string;
}

interface WeekContext {
  phase: string;
  title: string;
  weekId: number;
}

export function buildGenerateLivrablesPrompt(
  task: TaskForLivrables,
  week: WeekContext,
  ragContext: string = "",
  rules: Rule[] = [],
  existingLivrables: string[] = []
): string {
  const existingBlock = existingLivrables.length > 0
    ? `\nLIVRABLES DÉJÀ EXISTANTS DANS LA MISSION (ne pas les reproduire) :\n${existingLivrables.map((l) => `- ${l}`).join("\n")}\n`
    : "";

  return `${buildRulesBlock(rules)}Tu es un assistant de pilotage de mission de consulting BI Power BI pour Agirc-Arrco (DAS).
Mission : 7 semaines effectives, 30 jh budget réel, forfait 60 jh / 53 900 € HT.
${ragContext}
Contexte : Semaine ${week.weekId} — "${week.title}" (phase ${week.phase})

Tâche à analyser :
- Libellé : ${task.label}
- Description : ${task.description || "Aucune description"}
- Responsable : ${task.owner}
- Priorité : ${task.priority}
${existingBlock}
CONSIGNES IMPORTANTES :
- Propose uniquement les livrables strictement nécessaires pour cette tâche (1 à 3 maximum).
- Certaines tâches ne nécessitent aucun livrable formel — dans ce cas, retourne une liste vide.
- Ne duplique jamais un livrable déjà existant dans la mission (voir liste ci-dessus).
- Le plan d'action doit être synthétique : 2 à 4 étapes clés, pas de micro-détail.

Pour chaque livrable, indique le titre, une description courte, et le format attendu
(ex: "Document Word", "Fichier Power BI .pbix", "Email", "Présentation PPT", "Tableau Excel", "Capture écran", etc.)

Réponds UNIQUEMENT avec du JSON :
{
  "livrables": [
    {"titre": "...", "description": "...", "format": "..."}
  ],
  "plan_action": "Étapes clés pour réaliser cette tâche (2-4 étapes)"
}`;
}

export function buildGenerateTasksPrompt(
  week: Week,
  existingTasks: Task[],
  prevWeekTasks: Task[],
  ragContext: string = "",
  rules: Rule[] = []
): string {
  const blocked = prevWeekTasks.filter((t) => t.status === "bloqué");
  const notDone = prevWeekTasks.filter(
    (t) => t.status !== "fait" && t.status !== "bloqué"
  );

  return `${buildRulesBlock(rules)}Tu es un assistant de pilotage de mission de consulting BI Power BI pour Agirc-Arrco (DAS).
Mission : 7 semaines effectives, 30 jh budget réel, forfait 60 jh / 53 900 € HT.
${ragContext}
Semaine ${week.id} — "${week.title}" (phase ${week.phase})
Budget : ${week.budget_jh} jh
Actions prévues : ${week.actions.join(", ")}
Livrables attendus : ${week.livrables.join(", ")}
Responsable : ${week.owner}

Tâches déjà créées : ${existingTasks.length > 0 ? existingTasks.map((t) => t.label).join(", ") : "aucune"}

${blocked.length > 0 ? `Tâches bloquées semaine précédente : ${blocked.map((t) => t.label).join(", ")}` : ""}
${notDone.length > 0 ? `Tâches non terminées semaine précédente : ${notDone.map((t) => t.label).join(", ")}` : ""}

Génère 4 à 6 tâches concrètes et actionnables pour cette semaine.
Les owners possibles sont : "Paul", "Paul B.", "Client".
Les priorités possibles sont : "haute", "moyenne", "basse".

Réponds UNIQUEMENT avec un tableau JSON :
[{"label": "...", "owner": "Paul|Paul B.|Client", "priority": "haute|moyenne|basse"}]`;
}

export function buildParseUploadPrompt(
  uploadText: string,
  weekId: number,
  ragContext: string = "",
  rules: Rule[] = []
): string {
  return `${buildRulesBlock(rules)}Tu es un assistant de pilotage de mission de consulting BI Power BI pour Agirc-Arrco (DAS).
${ragContext}
Voici un compte-rendu de réunion pour la semaine ${weekId} :

---
${uploadText}
---

Extrais les éléments structurés suivants du compte-rendu.
Les owners possibles pour les actions sont : "Paul", "Paul B.", "Client".
Les priorités possibles sont : "haute", "moyenne", "basse".

Réponds UNIQUEMENT avec du JSON :
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
  ragContext: string = "",
  rules: Rule[] = []
): string {
  const weekSummaries = state.weeks.map((w) => {
    const weekTasks = state.tasks.filter((t) => t.weekId === w.id);
    const done = weekTasks.filter((t) => t.status === "fait").length;
    const blocked = weekTasks.filter((t) => t.status === "bloqué").length;
    const isPast = w.id < state.currentWeek;

    return `Semaine ${w.id} (${w.phase} — ${w.title}) [${w.budget_jh} jh]${isPast ? " [PASSÉE]" : w.id === state.currentWeek ? " [EN COURS]" : ""}
  Tâches : ${weekTasks.length} total, ${done} faites, ${blocked} bloquées
  Livrables prévus : ${w.livrables.join(", ")}`;
  });

  const activeRisks = state.risks.filter((r) => r.status === "actif");
  const decisions = state.events.filter((e) => e.type === "decision");

  return `${buildRulesBlock(rules)}Tu es un assistant de pilotage de mission BI Power BI pour Agirc-Arrco (DAS).
Mission : 7 semaines, 30 jh budget réel, forfait 60 jh / 53 900 € HT.
La mission est actuellement à la semaine ${state.currentWeek}.
${ragContext}
État complet du projet :

${weekSummaries.join("\n\n")}

Risques actifs :
${activeRisks.map((r) => `- ${r.label} (impact: ${r.impact}, proba: ${r.probability})`).join("\n")}

Décisions prises :
${decisions.map((d) => `- S${d.weekId}: ${d.label}`).join("\n")}

Recalibre le plan pour les semaines à venir (à partir de la semaine ${state.currentWeek}).
- Préserve les tâches "fait"
- Reporte les blocages intelligemment
- Respecte les jalons/livrables de chaque semaine
- Respecte le budget jh par semaine

Les owners possibles sont : "Paul", "Paul B.", "Client".
Les priorités possibles sont : "haute", "moyenne", "basse".

Réponds UNIQUEMENT avec du JSON :
{
  "weeks": {
    "${state.currentWeek}": [{"label": "...", "owner": "...", "priority": "..."}]
  },
  "carryover_notes": "Explication"
}`;
}
