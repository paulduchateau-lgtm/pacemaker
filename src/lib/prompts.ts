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

function buildGenerateTasksSystem(missionContext: string): string {
  return `Tu es un assistant de pilotage de mission de consulting.

${buildMissionBlock(missionContext)}Tu génères une liste de tâches concrètes pour une semaine de mission.

CONSIGNES :
- Génère 4 à 6 tâches concrètes et actionnables par semaine.
- owners autorisés : "Paul", "Paul B.", "Client"
- priorités : "haute", "moyenne", "basse"

Pour CHAQUE tâche :
- confidence : 0..1 (0.85+ = évidence claire, 0.6–0.85 = inférence raisonnable, <0.6 = hypothèse fragile)
- reasoning : phrase courte qui explique pourquoi cette tâche et pourquoi
  maintenant. Mentionne l'alternative si tu en as écartée une.

Réponds UNIQUEMENT avec un tableau JSON :
[
  {
    "label": "...",
    "owner": "Paul|Paul B.|Client",
    "priority": "haute|moyenne|basse",
    "confidence": 0.0-1.0,
    "reasoning": "phrase courte"
  }
]`;
}

export function buildGenerateTasksPrompt(
  week: Week,
  existingTasks: Task[],
  prevWeekTasks: Task[],
  ragContext: string = "",
  rules: Rule[] = [],
  missionContext: string = ""
): { system: string; user: string } {
  const blocked = prevWeekTasks.filter((t) => t.status === "bloqué");
  const notDone = prevWeekTasks.filter(
    (t) => t.status !== "fait" && t.status !== "bloqué"
  );

  const user = `${buildRulesBlock(rules)}${ragContext}
Semaine ${week.id} — "${week.title}" (phase ${week.phase})
Budget : ${week.budget_jh} jh
Actions prévues : ${week.actions.join(", ")}
Livrables attendus : ${week.livrables.join(", ")}
Responsable : ${week.owner}

Tâches déjà créées : ${existingTasks.length > 0 ? existingTasks.map((t) => t.label).join(", ") : "aucune"}

${blocked.length > 0 ? `Tâches bloquées semaine précédente : ${blocked.map((t) => t.label).join(", ")}` : ""}
${notDone.length > 0 ? `Tâches non terminées semaine précédente : ${notDone.map((t) => t.label).join(", ")}` : ""}

Génère les tâches selon le format JSON défini.`;

  return { system: buildGenerateTasksSystem(missionContext), user };
}

function buildParseUploadSystem(missionContext: string): string {
  return `Tu es un assistant de pilotage de mission de consulting.

${buildMissionBlock(missionContext)}Tu parses un compte-rendu de réunion pour en extraire les éléments structurés.

CONSIGNES :
- owners autorisés pour actions : "Paul", "Paul B.", "Client"
- priorités : "haute", "moyenne", "basse"
- auteurs de décision : "paul", "paul_b", "client" (default "paul" si pas clair)
- Pour chaque décision, essaie d'extraire ses motifs explicites et les
  alternatives envisagées. Si le CR ne les mentionne pas, laisse ces champs
  vides (null / []) — n'invente rien.
- Pour chaque action et chaque risque, ajoute confidence (0..1) + reasoning
  (phrase courte).
- Pour chaque décision, ajoute confidence (0..1) si c'est toi qui l'infères
  depuis le CR.

Réponds UNIQUEMENT avec du JSON :
{
  "decisions": [
    {
      "statement": "énoncé court de la décision",
      "rationale": "motifs explicites (null si non mentionnés)",
      "alternatives": ["alternative 1", "..."],
      "author": "paul|paul_b|client",
      "confidence": 0.0-1.0
    }
  ],
  "actions": [{"label": "...", "owner": "...", "priority": "...", "confidence": 0.0-1.0, "reasoning": "..."}],
  "risks": [{"label": "...", "impact": 1, "probability": 1, "confidence": 0.0-1.0, "reasoning": "..."}],
  "opportunities": ["..."]
}`;
}

export function buildParseUploadPrompt(
  uploadText: string,
  weekId: number,
  ragContext: string = "",
  rules: Rule[] = [],
  missionContext: string = ""
): { system: string; user: string } {
  const user = `${buildRulesBlock(rules)}${ragContext}
Voici un compte-rendu de réunion pour la semaine ${weekId} :

---
${uploadText}
---

Extrais les éléments structurés selon le schéma JSON défini.`;

  return { system: buildParseUploadSystem(missionContext), user };
}

export interface RecalibDecision {
  id: string;
  statement: string;
  rationale: string | null;
  weekId: number | null;
}

export interface RecalibLivrable {
  id: string;
  label: string;
  weekId: number;
  status: string;
  deliveryDate: string | null;
}

export interface RecalibRapport {
  id: string;
  label: string;
  weekId: number | null;
  lot: number;
  etat: string;
  complexite: string;
}

interface RecalibrationState {
  currentWeek: number;
  weeks: Week[];
  tasks: Task[];
  risks: Risk[];
  events: MissionEvent[];
  decisions: RecalibDecision[];
  livrables: RecalibLivrable[];
  rapports: RecalibRapport[];
  scope: "full_plan" | "downstream_only" | "single_week";
}

/**
 * Bloc système stable pour la recalibration : rôle, contexte mission,
 * consignes métier fixes, schéma JSON de sortie. Ce bloc ne dépend PAS
 * de l'état courant de la mission — il ne change qu'à la modification
 * manuelle du contexte mission par l'admin. Cachable côté Anthropic via
 * `callLLMCached` (chantier 4, audit LLM).
 */
function buildRecalibrationSystem(missionContext: string): string {
  return `Tu es un assistant de pilotage de mission de consulting.

${buildMissionBlock(missionContext)}Tu effectues une recalibration du plan de mission : tu reçois l'état
courant (semaines, tâches, risques, décisions, événements, changements
récents, contexte documentaire RAG) et tu proposes les modifications
nécessaires pour que le plan reste cohérent.

CONSIGNES MÉTIER (impératives) :
- Préserve TOUJOURS les tâches dont status = "fait".
- Si une décision dit "focus X sur semaines A-B", les livrables/rapports qui
  sortent de ce focus DOIVENT être déplacés hors de ces semaines (ou annulés).
- Les livrables/rapports peuvent changer de semaine, changer de statut, ou
  être marqués "annulés" si une décision les rend caducs.
- Reporte les blocages intelligemment.
- Respecte le budget jh par semaine.
- N'invente pas de nouveaux livrables/rapports sans fondement — si tu penses
  qu'il en manque, signale-le dans carryover_notes plutôt que d'en créer.
- Tu peux modifier le **descriptif** d'une semaine (titre, phase, budget,
  actions, livrables prévus) si une décision rend caduque la définition
  initiale. Ex : S4 "Rapports R2 & R3" devient phase AST si la décision
  "focus AST S1-S5" réaffecte R2/R3 ailleurs.

VALEURS AUTORISÉES :
- owners : "Paul", "Paul B.", "Client"
- priorités : "haute", "moyenne", "basse"
- statuts livrable : "planifié" | "en cours" | "livré" | "validé" | "annulé"
- états rapport : "à faire" | "en cours" | "livré" | "annulé"

DÉTECTION D'INCOHÉRENCES :
En plus de la recalibration, signale les CONTRADICTIONS que tu repères entre
les données fraîches (CHANGEMENTS RÉCENTS, décisions, événements) et l'état
figé (contexte mission, chunks RAG, plan initial). C'est un signal user,
séparé de la recalib. Sois prudent : si tu n'es pas sûr, ne signale pas.

4 types :
- factual : A dit X, B dit non-X (ex : CR "rapport fini", DB "en cours")
- scope_drift : nouvel input hors périmètre initial
- constraint_change : deadline, budget, effectif, accès data qui bouge
- hypothesis_invalidated : hypothèse de travail qui s'effondre
3 sévérités : minor, moderate, major.

FORMAT DE RÉPONSE (strict JSON, sans backticks) :
{
  "weeks": {
    "1": [{"label": "...", "owner": "...", "priority": "...", "confidence": 0.7, "reasoning": "..."}]
  },
  "week_changes": [
    {
      "id": 4,
      "new_title": "AST — Conception d'architecture",
      "new_phase": "Construction socle",
      "new_budget_jh": 5,
      "new_actions": ["Atelier AST 1", "Cadrage SI cible"],
      "new_livrables_plan": ["Note de cadrage AST validée"],
      "reason": "Décision focus AST S1-S5 → S4 devient phase AST, R2/R3 déplacés"
    }
  ],
  "livrable_changes": [
    {"id": "livrable-xxx", "new_week_id": 3, "new_status": "planifié", "reason": "décision focus AST"}
  ],
  "rapport_changes": [
    {"id": "rapport-xxx", "new_week_id": 5, "new_etat": "à faire", "reason": "réalignement après focus AST"}
  ],
  "detected_incoherences": [
    {
      "kind": "factual|scope_drift|constraint_change|hypothesis_invalidated",
      "severity": "minor|moderate|major",
      "description": "phrase courte décrivant le conflit",
      "conflicting_entity_type": "task|risk|livrable|rapport|decision|week|document",
      "conflicting_entity_id": "id de l'entité en conflit",
      "auto_resolution": "action proposée, ou null si l'utilisateur doit trancher"
    }
  ],
  "carryover_notes": "Explication synthétique : ce qui bouge, ce qui est préservé, pourquoi."
}

Tous les champs de *_changes sont optionnels sauf "id" (ne mets que ce qui
CHANGE). new_week_id peut être null pour désaffecter un livrable/rapport.
Les "weeks" doivent couvrir UNIQUEMENT les semaines que tu modifies dans ton
scope. Pour une semaine dont tu changes le descriptif (week_changes), pense
aussi à régénérer ses tasks dans "weeks" — la table tasks a été vidée.
"detected_incoherences" peut être [] si tu n'as rien détecté de sûr.`;
}

/**
 * Retourne `{ system, user }` pour un appel `callLLMCached`. Le `system`
 * est stable (cachable 5 min), `user` contient tout l'état frais.
 */
export function buildRecalibrationPrompt(
  state: RecalibrationState,
  ragContext: string = "",
  rules: Rule[] = [],
  missionContext: string = "",
  recentChanges: string = ""
): { system: string; user: string } {
  const weekSummaries = state.weeks.map((w) => {
    const weekTasks = state.tasks.filter((t) => t.weekId === w.id);
    const done = weekTasks.filter((t) => t.status === "fait").length;
    const blocked = weekTasks.filter((t) => t.status === "bloqué").length;
    const isPast = w.id < state.currentWeek;
    const weekLivrables = state.livrables.filter((l) => l.weekId === w.id);
    const weekRapports = state.rapports.filter((r) => r.weekId === w.id);

    return `Semaine ${w.id} (${w.phase} — ${w.title}) [${w.budget_jh} jh]${isPast ? " [PASSÉE]" : w.id === state.currentWeek ? " [EN COURS]" : ""}
  Tâches : ${weekTasks.length} total, ${done} faites, ${blocked} bloquées
  Tâches non-faites : ${weekTasks.filter((t) => t.status !== "fait").map((t) => `[${t.id}] ${t.label}`).join(" ; ") || "—"}
  Livrables rattachés : ${weekLivrables.map((l) => `[${l.id}] ${l.label} (${l.status})`).join(" ; ") || "—"}
  Rapports rattachés : ${weekRapports.map((r) => `[${r.id}] ${r.label} (lot ${r.lot}, ${r.etat})`).join(" ; ") || "—"}`;
  });

  const activeRisks = state.risks.filter((r) => r.status === "actif");
  const orphanRapports = state.rapports.filter((r) => r.weekId === null);

  const scopeInstructions: Record<typeof state.scope, string> = {
    full_plan: `Scope : PLAN COMPLET — tu peux ré-attribuer des tâches, livrables et rapports sur N'IMPORTE QUELLE semaine (1 à ${state.weeks.length}), y compris celles déjà passées si une décision récente le rend nécessaire. Ne touche PAS les tâches marquées "fait".`,
    downstream_only: `Scope : AVAL UNIQUEMENT — tu ne modifies que les semaines ≥ ${state.currentWeek}. Les semaines passées sont intouchables.`,
    single_week: `Scope : SEMAINE UNIQUE — tu ne modifies que la semaine ${state.currentWeek}.`,
  };

  const user = `${buildRulesBlock(rules)}La mission est actuellement à la semaine ${state.currentWeek}.
${ragContext}
${scopeInstructions[state.scope]}

État complet du projet :

${weekSummaries.join("\n\n")}
${orphanRapports.length > 0 ? `\nRapports non-affectés : ${orphanRapports.map((r) => `[${r.id}] ${r.label} (lot ${r.lot})`).join(" ; ")}\n` : ""}
Risques actifs :
${activeRisks.map((r) => `- ${r.label} (impact: ${r.impact}, proba: ${r.probability})`).join("\n") || "(aucun)"}

DÉCISIONS ACTIVES (tu DOIS les respecter impérativement) :
${state.decisions.length > 0 ? state.decisions.map((d) => `- [${d.id}] S${d.weekId ?? "?"} : ${d.statement}${d.rationale ? ` — motifs : ${d.rationale}` : ""}`).join("\n") : "(aucune)"}

Pour les documents de la mission (CR, specs, engagements client), réfère-toi au bloc "CONTEXTE DOCUMENTAIRE PERTINENT (RAG)" ci-dessus.

Derniers événements :
${state.events.slice(0, 15).map((e) => `- ${e.type}: ${e.label}`).join("\n")}
${recentChanges}
Recalibre maintenant le plan dans le scope autorisé et réponds en JSON strict selon le schéma défini.`;

  return { system: buildRecalibrationSystem(missionContext), user };
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
