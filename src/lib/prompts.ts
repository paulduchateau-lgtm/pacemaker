import type { Week, Task, Risk, MissionEvent, Rule, Budget } from "@/types";
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

function buildMissionBlock(missionContext: string): string {
  if (!missionContext || !missionContext.trim()) return "";
  return `=== CONTEXTE MISSION ===\n${missionContext.trim()}\n=== FIN CONTEXTE ===\n\n`;
}

export function buildGenerateLivrablesPrompt(
  task: TaskForLivrables,
  week: WeekContext,
  ragContext: string = "",
  rules: Rule[] = [],
  existingLivrables: string[] = [],
  missionContext: string = ""
): string {
  const existingBlock = existingLivrables.length > 0
    ? `\nLIVRABLES DÉJÀ EXISTANTS DANS LA MISSION (ne pas les reproduire) :\n${existingLivrables.map((l) => `- ${l}`).join("\n")}\n`
    : "";

  return `${buildRulesBlock(rules)}${buildMissionBlock(missionContext)}Tu es un assistant de pilotage de mission de consulting.
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
  rules: Rule[] = [],
  missionContext: string = ""
): string {
  const blocked = prevWeekTasks.filter((t) => t.status === "bloqué");
  const notDone = prevWeekTasks.filter(
    (t) => t.status !== "fait" && t.status !== "bloqué"
  );

  return `${buildRulesBlock(rules)}${buildMissionBlock(missionContext)}Tu es un assistant de pilotage de mission de consulting.
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
  rules: Rule[] = [],
  missionContext: string = ""
): string {
  return `${buildRulesBlock(rules)}${buildMissionBlock(missionContext)}Tu es un assistant de pilotage de mission de consulting.
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
  rules: Rule[] = [],
  missionContext: string = ""
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

  return `${buildRulesBlock(rules)}${buildMissionBlock(missionContext)}Tu es un assistant de pilotage de mission de consulting.
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

interface CreateLivrableContext {
  weeks: Week[];
  tasks: Task[];
  risks: Risk[];
  budget: Budget;
  currentWeek: number;
}

export function buildCreateLivrablePrompt(
  livrable: { titre: string; description: string; format: string },
  task: Task,
  week: Week,
  ctx: CreateLivrableContext,
  ragContext: string = "",
  rules: Rule[] = [],
  missionContext: string = "",
  themeHints: string = ""
): string {
  const activeRisks = ctx.risks.filter((r) => r.status === "actif");
  const weekTasks = ctx.tasks.filter((t) => t.weekId === week.id);
  const fmt = livrable.format.toLowerCase();
  const isXlsx = /(excel|xlsx|tableur|classeur|tableau)/.test(fmt);
  const isPptx = /(ppt|présentation|presentation|slide|diapo|deck)/.test(fmt);
  const targetFormat = isXlsx ? "xlsx" : isPptx ? "pptx" : "docx";

  return `${buildRulesBlock(rules)}${buildMissionBlock(missionContext)}Tu es un consultant senior en charge de la rédaction d'un livrable.
${ragContext}

CONTEXTE PROJET :
- Semaine courante : S${ctx.currentWeek}
- Phase : ${week.phase} — "${week.title}"

RISQUES ACTIFS :
${activeRisks.length > 0 ? activeRisks.map((r) => `- ${r.label} (impact: ${r.impact}/5, proba: ${r.probability}/5) → ${r.mitigation}`).join("\n") : "Aucun risque actif."}

TÂCHES SEMAINE ${week.id} :
${weekTasks.length > 0 ? weekTasks.map((t) => `- [${t.status}] ${t.label} (${t.owner})`).join("\n") : "Aucune tâche."}

LIVRABLES PRÉVUS SEMAINE ${week.id} :
${week.livrables.length > 0 ? week.livrables.map((l) => `- ${l}`).join("\n") : "Aucun livrable planifié."}

---

LIVRABLE À CRÉER :
- Titre : ${livrable.titre}
- Description : ${livrable.description}
- Format cible : ${livrable.format} (rendu final : ${targetFormat})
- Tâche source : ${task.label}
${task.description ? `- Détail tâche : ${task.description}` : ""}

${themeHints ? `${themeHints}\n\n` : ""}FORMAT DE SORTIE — STRICT :
Réponds UNIQUEMENT avec un objet JSON valide conforme au schéma LivrablePayload ci-dessous.
Aucun texte avant, aucun texte après, aucun bloc markdown \`\`\`.

SCHÉMA (TypeScript) :
{
  "title": string,                 // titre du livrable
  "subtitle"?: string,
  "docType"?: "CR" | "Annexe" | "Deck" | "Note" | "Rapport" | string,
  "format": "docx" | "xlsx" | "pptx",  // utilise "${targetFormat}"
  "blocks": Block[]                // requis sauf si sheets fourni (xlsx)
  "sheets"?: { "name": string, "blocks": Block[] }[]  // uniquement pour xlsx multi-onglets
}

Types de Block disponibles :
- { "kind": "cover", "title": string, "subtitle"?: string,
    "meta"?: { "client"?: string, "emitter"?: string, "date"?: string, "version"?: string, "confidential"?: string } }
- { "kind": "toc", "items": string[] }
- { "kind": "section", "level": 1 | 2 | 3, "title": string }
- { "kind": "paragraph", "text": string, "emphasis"?: boolean }
- { "kind": "bullet_list", "items": string[] }
- { "kind": "numbered_list", "items": string[] }
- { "kind": "kpi_grid", "cols": 2 | 3 | 4,
    "cards": { "label": string, "value": string, "delta"?: string, "tone": "positive"|"neutral"|"critical" }[] }
- { "kind": "table", "headers": string[],
    "rows": (string | { "value": string, "tone": "positive"|"neutral"|"critical" })[][],
    "totals"?: string[] }
- { "kind": "callout", "text": string, "tone": "positive"|"neutral"|"critical" }
- { "kind": "star_note", "text": string }
- { "kind": "footer_legal", "text": string }

CONSIGNES :
- Rédige en français, ton professionnel, directement exploitable par le client.
- Pré-remplis avec les VRAIES données projet (risques, tâches, planning, chiffres). Pas de placeholder.
- Commence typiquement par un bloc "cover" (toujours pour un Deck/Rapport ; optionnel pour une Note courte).
- Structure avec des "section" level=1 pour les grandes parties, level=2 pour les sous-parties.
${targetFormat === "xlsx" ? '- Pour un livrable Excel, préfère "sheets" avec onglets nommés (ex: "Lisez-moi", "Synthèse", "Données", "Suivi").' : ""}
${targetFormat === "pptx" ? '- Pour une présentation, chaque "section" level=1 démarre une nouvelle slide. Garde 3-6 slides maximum.' : ""}
- Termine par un "footer_legal" si une mention légale est pertinente.`;
}
