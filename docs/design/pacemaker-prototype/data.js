// Pacemaker seed data for the mock — derived from the real AGIRC-Arrco mission
// Extracted from Claude Design prototype via get_page_text on the rendered JS file,
// then manually restructured (newlines were collapsed during extraction).

const MISSION = {
  slug: "agirc-arrco-2026",
  client: "AGIRC-ARRCO — DAS",
  label: "BI DAS — 7 rapports Power BI",
  owner: "Paul D.",
  coOwner: "Paul B.",
  start: "2026-04-07",
  end: "2026-05-26",
  currentWeek: 3,
  totalWeeks: 7,
  jhConsumed: 8.5,
  jhBudget: 30,
  jhSold: 60,
  phase: "Développement",
  stakeholders: [
    { id: "bb", name: "Benoît Baret", role: "Sponsor — Dir. DAS", sat: 0.78, trend: "up", last: "Hier, 17:12" },
    { id: "nl", name: "Nathalie Lazardeux", role: "Co-sponsor — Resp. pilotage", sat: 0.58, trend: "down", last: "Lun. 14:02" },
    { id: "pd", name: "Paul D.", role: "Senior — pilote", sat: 0.82, trend: "flat", last: "Aujourd'hui" },
    { id: "pb", name: "Paul B.", role: "Consultant — Power BI", sat: 0.65, trend: "down", last: "Aujourd'hui" },
    { id: "ea", name: "Élise Abadie", role: "Référente IRC Humanis", sat: 0.72, trend: "flat", last: "Ven. 11:30" },
    { id: "jm", name: "Julien Moreau", role: "Métier DAS — ECO", sat: 0.45, trend: "down", last: "Mer. 09:15" },
    { id: "cm", name: "Clara Meyer", role: "Métier DAS — Prévention", sat: 0.88, trend: "up", last: "Mar. 16:48" },
  ],
};

const WEEKS = [
  { id: 1, phase: "Cadrage", title: "Cadrage & cartographie", budget: 4, jhUsed: 4.5, status: "fait", startIso: "2026-04-07", endIso: "2026-04-10" },
  { id: 2, phase: "Construction socle", title: "Modèle sémantique & dataset", budget: 5, jhUsed: 4.0, status: "fait", startIso: "2026-04-13", endIso: "2026-04-17" },
  { id: 3, phase: "Développement", title: "Rapport R1 — Événements action sociale", budget: 5, jhUsed: 0, status: "en cours", startIso: "2026-04-20", endIso: "2026-04-24" },
  { id: 4, phase: "Développement", title: "Rapports R2 (ECO) & R3 (Prévention)", budget: 5, jhUsed: 0, status: "à venir", startIso: "2026-04-27", endIso: "2026-05-01" },
  { id: 5, phase: "Développement", title: "Rapports R4 (75 ans) & R5 (Habitat)", budget: 5, jhUsed: 0, status: "à venir", startIso: "2026-05-04", endIso: "2026-05-08" },
  { id: 6, phase: "Stabilisation", title: "Industrialisation & gouvernance", budget: 3, jhUsed: 0, status: "à venir", startIso: "2026-05-11", endIso: "2026-05-15" },
  { id: 7, phase: "Transfert", title: "Formation, documentation, clôture", budget: 3, jhUsed: 0, status: "à venir", startIso: "2026-05-18", endIso: "2026-05-22" },
];

const PHASE_COLOR = {
  "Cadrage": "var(--green)",
  "Construction socle": "var(--green-deep)",
  "Développement": "var(--sky)",
  "Stabilisation": "var(--amber)",
  "Transfert": "var(--alert)",
};

const TASKS = [
  { id: "t1", weekId: 3, label: "Maquettage fonctionnel R1 avec les métiers DAS", owner: "Paul D.", priority: "haute", status: "en cours", source: "llm", jh: 0.8, conf: 0.82 },
  { id: "t2", weekId: 3, label: "Construction modèle sémantique R1 (pas d'existant)", owner: "Paul B.", priority: "haute", status: "en cours", source: "manual", jh: 1.5, conf: null },
  { id: "t3", weekId: 3, label: "Intégration Power Query — sources Excel R1", owner: "Paul B.", priority: "moyenne", status: "à faire", source: "llm", jh: 0.8, conf: 0.74 },
  { id: "t4", weekId: 3, label: "Développement visuels R1 + filtres + drill-down", owner: "Paul B.", priority: "moyenne", status: "à faire", source: "llm", jh: 1.0, conf: 0.77 },
  { id: "t5", weekId: 3, label: "Mesures DAX spécifiques R1", owner: "Paul B.", priority: "moyenne", status: "à faire", source: "llm", jh: 0.6, conf: 0.69 },
  { id: "t6", weekId: 3, label: "Atelier validation R1 avec Clara Meyer", owner: "Paul D.", priority: "haute", status: "bloqué", source: "vision", jh: 0.3, conf: 0.61, blocker: "Disponibilité Clara: semaine 4" },
  { id: "t7", weekId: 4, label: "Audit existant R2 ECO — automatisation refresh", owner: "Paul B.", priority: "haute", status: "à faire", source: "llm", jh: 1.2, conf: 0.8 },
  { id: "t8", weekId: 4, label: "R3 Prévention — reprise modèle sémantique", owner: "Paul B.", priority: "haute", status: "à faire", source: "manual", jh: 1.5, conf: null },
  { id: "t9", weekId: 4, label: "Validation croisée R2+R3 avec référents", owner: "Paul D.", priority: "moyenne", status: "à faire", source: "recalib", jh: 0.5, conf: 0.72 },
];

const INCOHERENCES = [
  { id: "i1", kind: "constraint_change", severity: "major",
    description: "Nouveau périmètre entendu en atelier jeudi : R6 et R7 redeviennent 'attendus' par Nathalie Lazardeux — contredit le cadrage S1 où R6/R7 ont été placés en backlog Lot 3.",
    source: { kind: "photo", label: "Capture paperboard 17/04" },
    conflict: { kind: "decision", label: "Décision S1 — Lot 1/2/3 priorisé, R6/R7 en backlog" },
    proposal: "Confirmer avec Benoît Baret avant S4. Sinon : recalibrer budget (+5jh) ou acter trade-off.",
    status: "pending", when: "il y a 2h" },
  { id: "i2", kind: "factual", severity: "moderate",
    description: "Rapport R4 (Services 75 ans) décrit comme 'existant, OK' au cadrage. Vocal Paul B. mardi : modèle sémantique incomplet, 3 mesures DAX manquantes.",
    source: { kind: "vocal", label: "Vocal Paul B. 15/04 (2m14s)" },
    conflict: { kind: "cartographie", label: "Cartographie S1 — R4" },
    proposal: "Mettre à jour la cartographie. Risque budget +0,5jh sur S5.",
    status: "auto_resolved",
    resolution: "Cartographie mise à jour ; ligne R4 passée de 'basse' à 'moyenne' complexité.",
    when: "hier" },
  { id: "i3", kind: "scope_drift", severity: "minor",
    description: "Julien Moreau (métier ECO) demande un onglet 'benchmark inter-régions' — non prévu au cadrage R2.",
    source: { kind: "whatsapp", label: "WA — Julien Moreau 18/04" },
    conflict: { kind: "cadrage", label: "Scope R2 — ECO standard" },
    proposal: "Documenter demande. À arbitrer en point hebdo S4.",
    status: "pending", when: "il y a 5h" },
];

const DECISIONS = [
  { id: "d1", date: "2026-04-08", author: "Paul D.", conf: null, status: "actée",
    statement: "Priorisation des 7 rapports en 3 lots — Lot 1 (R1/R2/R3), Lot 2 (R4/R5), Lot 3 (R6/R7) en backlog.",
    rationale: "Budget réel 30jh vs 60jh vendus. R1/R2/R3 sont critiques pour le sponsor Benoît Baret. R6/R7 ont peu d'existant et seront repris en mission ultérieure si besoin.",
    alternatives: ["Livrer 5 rapports complets (R1-R5) sans backlog documenté", "Livrer 7 rapports en qualité réduite"],
    impactsOn: ["Budget", "Toutes les semaines", "Risque r3 (scope creep)"],
    source: "Kick-off — atelier de cadrage" },
  { id: "d2", date: "2026-04-14", author: "Paul D.", conf: 0.78, status: "actée",
    confNote: "extraite par LLM du CR — à confirmer",
    statement: "Abandon du modèle sémantique existant R1 — reconstruction complète.",
    rationale: "Modèle initié à 30%, incohérences de nommage, pas de dimensions communes. Reprendre coûterait plus qu'une reconstruction.",
    alternatives: ["Compléter l'existant (+1,5jh d'audit avant de savoir)"],
    impactsOn: ["Semaine 3", "Tâches R1"],
    source: "CR visio 14/04 — parsé par Pacemaker" },
  { id: "d3", date: "2026-04-15", author: "Paul B.", conf: 0.65, status: "proposée",
    confNote: "confiance faible — rationale à enrichir",
    statement: "Utilisation de DirectQuery vs Import pour les datasets R2/R3.",
    rationale: "Volumes Excel réduits, refresh quotidien suffisant — Import plus simple à maintenir.",
    alternatives: ["DirectQuery si refresh temps-réel devient un besoin"],
    impactsOn: ["Architecture socle", "Gouvernance"],
    source: "Discussion atelier 15/04" },
];

const RECALIBRATIONS = [
  { id: "r1", when: "hier, 14:22", trigger: "auto_on_incoherence",
    ref: "Incohérence i2 (R4 incomplet)", scope: "downstream_only",
    summary: "Ré-estimation S5 après découverte que R4 nécessite +0,5jh de mesures DAX manquantes.",
    changes: ["+1 tâche ajoutée en S5", "+0,5jh budget S5", "Risque r1 réévalué: 3/5 → 4/5"],
    reasoning: "Nouveau fait déclaré par Paul B. invalide l'hypothèse initiale. Impact borné à S5 — pas besoin de toucher S6/S7." },
  { id: "r2", when: "11/04 09:40", trigger: "manual",
    ref: "Paul D. — recalage début réel mission", scope: "full_plan",
    summary: "Décalage +2 jours du démarrage technique suite à retard accès Turso.",
    changes: ["7 semaines décalées de +2j", "S3 démarre 20/04 au lieu de 18/04"],
    reasoning: "Accès data reçu en retard — cascade sur toutes les semaines." },
];

const LIVRABLES = [
  { id: "l1", label: "Cartographie des sources & propriétaires", week: 1, status: "livré", fmt: "XLSX", delivered: "2026-04-10" },
  { id: "l2", label: "Dictionnaire KPI v1", week: 1, status: "validé", fmt: "DOCX", delivered: "2026-04-10" },
  { id: "l3", label: "Architecture cible validée", week: 1, status: "validé", fmt: "PPTX", delivered: "2026-04-10" },
  { id: "l4", label: "Modèle sémantique v1", week: 2, status: "livré", fmt: "PPTX", delivered: "2026-04-17" },
  { id: "l5", label: "Dataset Power BI v1", week: 2, status: "livré", fmt: "PBIX", delivered: "2026-04-17" },
  { id: "l6", label: "Rapport R1 — Événements action sociale", week: 3, status: "en cours", fmt: "PBIX", delivered: null },
  { id: "l7", label: "Rapport R2 — ECO (automatisé)", week: 4, status: "planifié", fmt: "PBIX", delivered: null },
  { id: "l8", label: "Rapport R3 — Centres de prévention", week: 4, status: "planifié", fmt: "PBIX", delivered: null },
];

const RISKS = [
  { id: "r1", label: "Dépassement de charge — 30 jh réel vs 60 jh vendus", impact: 5, prob: 4, status: "actif", trend: "up" },
  { id: "r2", label: "Qualité hétérogène des fichiers Excel sources", impact: 4, prob: 5, status: "mitigé", trend: "down" },
  { id: "r3", label: "Scope creep — 7 rapports attendus, budget pour 5", impact: 5, prob: 4, status: "actif", trend: "up" },
  { id: "r4", label: "Validation lente côté DAS (direction métier)", impact: 4, prob: 4, status: "actif", trend: "flat" },
  { id: "r5", label: "Dépendance aux référents IRC pour accès données", impact: 4, prob: 2, status: "mitigé", trend: "down" },
  { id: "r6", label: "Modèles sémantiques partiels à auditer/reprendre", impact: 3, prob: 4, status: "actif", trend: "flat" },
];

const SOURCES = [
  { id: "s1", kind: "doc", title: "CR Kick-off 08/04", fmt: "DOCX", uploaded: "08/04", freshness: "old", used: 18, extracts: ["6 décisions", "23 tâches", "4 risques"], stale: false, inconsistency: false },
  { id: "s2", kind: "vocal", title: "Vocal Paul D. 14/04 — retour atelier", fmt: "MP3 · 4m12s", uploaded: "14/04", freshness: "fresh", used: 7, extracts: ["2 décisions", "5 tâches"], stale: false, inconsistency: false },
  { id: "s3", kind: "photo", title: "Paperboard atelier 17/04", fmt: "JPG + Vision", uploaded: "17/04", freshness: "live", used: 3, extracts: ["3 actions", "1 décision contestée"], stale: false, inconsistency: true },
  { id: "s4", kind: "whatsapp", title: "WA — Julien Moreau 18/04", fmt: "TEXT", uploaded: "18/04", freshness: "live", used: 1, extracts: ["1 demande scope"], stale: false, inconsistency: true },
  { id: "s5", kind: "doc", title: "Cartographie sources S1", fmt: "XLSX", uploaded: "10/04", freshness: "stale", used: 24, extracts: ["modèle référence"], stale: true, stalenote: "Ligne R4 contredite par vocal 15/04", inconsistency: true },
  { id: "s6", kind: "doc", title: "Charte graphique AGIRC-ARRCO", fmt: "PDF", uploaded: "09/04", freshness: "old", used: 12, extracts: ["thème livrables"], stale: false, inconsistency: false },
  { id: "s7", kind: "ctx", title: "Contexte mission", fmt: "Markdown", uploaded: "07/04", freshness: "stale", used: 47, extracts: ["Injecté dans tous les prompts"], stale: true, stalenote: "Ne mentionne pas la scope_drift R6/R7", inconsistency: false },
];

// Stakeholder interactions for Pulse view
const PULSE_EVENTS = [
  { t: 0.05, who: "bb", kind: "meeting", label: "Kick-off — Benoît Baret", tone: "pos" },
  { t: 0.08, who: "nl", kind: "meeting", label: "Kick-off — Nathalie Lazardeux", tone: "pos" },
  { t: 0.14, who: "ea", kind: "email", label: "Accès data Élise — OK", tone: "pos" },
  { t: 0.22, who: "pb", kind: "vocal", label: "Vocal Paul B. — R1 complexe", tone: "neu" },
  { t: 0.32, who: "cm", kind: "meeting", label: "Atelier Clara — très positif", tone: "pos" },
  { t: 0.41, who: "jm", kind: "meeting", label: "Atelier Julien — frustration sur R2", tone: "neg" },
  { t: 0.48, who: "nl", kind: "email", label: "Nathalie relance ETA R6/R7", tone: "neg", pivot: true, pivotLabel: "Bascule — scope R6/R7 rouvert" },
  { t: 0.55, who: "pb", kind: "vocal", label: "Vocal Paul B. — R4 incomplet", tone: "neg" },
  { t: 0.62, who: "jm", kind: "whatsapp", label: "WA Julien — demande onglet benchmark", tone: "neu" },
  { t: 0.7, who: "bb", kind: "meeting", label: "Point sponsor — rassurant", tone: "pos" },
];
