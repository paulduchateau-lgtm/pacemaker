import type { Week, Risk, Rapport, Budget } from "@/types";

export const INITIAL_WEEKS: Week[] = [
  {
    id: 1,
    phase: "Cadrage",
    title: "Cadrage & cartographie",
    budget_jh: 4,
    actions: [
      "R\u00e9union de lancement avec Beno\u00eet Baret et Nathalie Lazardeux",
      "Cartographie des 7 fichiers Excel sources (structure, propri\u00e9taires, fr\u00e9quence MAJ)",
      "Entretiens flash avec les r\u00e9f\u00e9rents IRC et \u00e9quipes m\u00e9tier DAS",
      "Audit des rapports Power BI existants (ECO, Pr\u00e9vention, 75 ans, Habitat, Tickets, Cotisantes)",
      "D\u00e9finition des KPI prioritaires et r\u00e8gles de gestion",
      "Priorisation des rapports : Lot 1 (R1-R3), Lot 2 (R4-R5), Lot 3 (R6-R7)",
      "Proposition architecture cible (datasets, workspaces, gouvernance)",
    ],
    livrables: [
      "Cartographie des sources et propri\u00e9taires",
      "Dictionnaire KPI v1",
      "Architecture cible valid\u00e9e",
      "Backlog rapports prioris\u00e9",
    ],
    owner: "Paul",
  },
  {
    id: 2,
    phase: "Construction socle",
    title: "Mod\u00e8le s\u00e9mantique & dataset",
    budget_jh: 5,
    actions: [
      "Centralisation des donn\u00e9es Excel dans Power BI (Power Query)",
      "Cr\u00e9ation des tables de faits et dimensions communes",
      "Mise en place des relations et hi\u00e9rarchies",
      "Premi\u00e8res mesures DAX transversales",
      "Nettoyage et normalisation des sources",
      "Documentation du mod\u00e8le (dictionnaire de donn\u00e9es, r\u00e8gles de calcul)",
    ],
    livrables: [
      "Mod\u00e8le s\u00e9mantique v1",
      "Dataset Power BI v1",
      "Dictionnaire de donn\u00e9es",
    ],
    owner: "Paul + Paul B.",
  },
  {
    id: 3,
    phase: "D\u00e9veloppement",
    title: "Rapport R1 \u2014 \u00c9v\u00e9nements action sociale territoriale",
    budget_jh: 5,
    actions: [
      "Maquettage fonctionnel avec les m\u00e9tiers DAS",
      "Construction du mod\u00e8le s\u00e9mantique sp\u00e9cifique R1 (pas d'existant)",
      "Int\u00e9gration des donn\u00e9es Excel \u2192 Power Query",
      "D\u00e9veloppement des visuels, filtres, drill-down",
      "Mesures DAX sp\u00e9cifiques R1",
      "Validation utilisateurs et corrections",
    ],
    livrables: ["Rapport R1 \u2014 \u00c9v\u00e9nements action sociale (valid\u00e9)"],
    owner: "Paul + Paul B.",
  },
  {
    id: 4,
    phase: "D\u00e9veloppement",
    title: "Rapports R2 (ECO) & R3 (Pr\u00e9vention)",
    budget_jh: 5,
    actions: [
      "R2 ECO : audit de l'existant Power BI, automatisation de l'actualisation",
      "R2 ECO : correction du mod\u00e8le, ajout mesures DAX, automatisation refresh",
      "R3 Pr\u00e9vention : reprise du mod\u00e8le s\u00e9mantique existant",
      "R3 Pr\u00e9vention : reconstruction des visuels, tests coh\u00e9rence",
      "Validation crois\u00e9e R2 + R3 avec les m\u00e9tiers",
    ],
    livrables: [
      "Rapport R2 \u2014 ECO (automatis\u00e9, valid\u00e9)",
      "Rapport R3 \u2014 Centres de pr\u00e9vention (valid\u00e9)",
    ],
    owner: "Paul + Paul B.",
  },
  {
    id: 5,
    phase: "D\u00e9veloppement",
    title: "Rapports R4 (75 ans) & R5 (Habitat)",
    budget_jh: 5,
    actions: [
      "R4 Services 75 ans : ajustements pour automatisation (existant OK)",
      "R4 : automatisation du refresh, tests",
      "R5 Politique habitat : finalisation du rapport initi\u00e9",
      "R5 : compl\u00e9tion du mod\u00e8le s\u00e9mantique, visuels, validation",
      "Harmonisation UX/UI sur l'ensemble des rapports livr\u00e9s",
    ],
    livrables: [
      "Rapport R4 \u2014 Services 75 ans (automatis\u00e9, valid\u00e9)",
      "Rapport R5 \u2014 Politique habitat (finalis\u00e9, valid\u00e9)",
    ],
    owner: "Paul + Paul B.",
  },
  {
    id: 6,
    phase: "Stabilisation",
    title: "Industrialisation & gouvernance",
    budget_jh: 3,
    actions: [
      "Publication des datasets et rapports dans les workspaces Power BI",
      "Mise en place RLS si n\u00e9cessaire",
      "Automatisation des rafra\u00eechissements",
      "Structuration des droits d'acc\u00e8s",
      "Harmonisation des composants r\u00e9utilisables (th\u00e8me, mesures communes)",
      "R\u00e9daction du plan de gouvernance Power BI",
    ],
    livrables: [
      "Rapports publi\u00e9s en production",
      "Plan de gouvernance Power BI",
      "Rafra\u00eechissements automatis\u00e9s",
    ],
    owner: "Paul B.",
  },
  {
    id: 7,
    phase: "Transfert",
    title: "Formation, documentation & cl\u00f4ture",
    budget_jh: 3,
    actions: [
      "Formation de l'\u00e9quipe DAS \u00e0 la maintenance du mod\u00e8le",
      "Formation \u00e0 l'utilisation des rapports",
      "R\u00e9daction du guide utilisateur",
      "Finalisation de la documentation technique et fonctionnelle",
      "Backlog d'\u00e9volutions (R6 Tickets, R7 Cotisantes) document\u00e9 pour reprise",
      "Validation de cl\u00f4ture avec Beno\u00eet Baret / Nathalie Lazardeux",
    ],
    livrables: [
      "Guide utilisateur",
      "Documentation technique et fonctionnelle",
      "Support de formation",
      "Backlog d'\u00e9volutions (R6, R7)",
      "PV de cl\u00f4ture mission",
    ],
    owner: "Paul",
  },
];

export const INITIAL_RISKS: Risk[] = [
  {
    id: "r1",
    label: "D\u00e9passement de charge \u2014 budget r\u00e9el 30 jh vs 60 jh vendus",
    impact: 5,
    probability: 3,
    status: "actif",
    mitigation:
      "Pilotage serr\u00e9 du temps pass\u00e9, priorisation Lot 1 d'abord, R6-R7 en backlog si n\u00e9cessaire",
  },
  {
    id: "r2",
    label: "Qualit\u00e9 h\u00e9t\u00e9rog\u00e8ne des fichiers Excel sources",
    impact: 4,
    probability: 5,
    status: "actif",
    mitigation:
      "Cartographie exhaustive en S1, nettoyage int\u00e9gr\u00e9 \u00e0 la construction du socle S2",
  },
  {
    id: "r3",
    label: "Scope creep \u2014 le client attend 7 rapports, budget pour 5",
    impact: 5,
    probability: 4,
    status: "actif",
    mitigation:
      "Poser le cadre d\u00e8s le kick-off : Lot 1 (3), Lot 2 (2), Lot 3 si budget \u2014 R6/R7 document\u00e9s en backlog",
  },
  {
    id: "r4",
    label: "Validation lente c\u00f4t\u00e9 DAS (direction m\u00e9tier, pas DSI)",
    impact: 4,
    probability: 4,
    status: "actif",
    mitigation:
      "D\u00e9mos courtes toutes les semaines, validation int\u00e9gr\u00e9e au cycle, pas de phase validation s\u00e9par\u00e9e",
  },
  {
    id: "r5",
    label: "D\u00e9pendance aux r\u00e9f\u00e9rents IRC pour l'acc\u00e8s aux donn\u00e9es",
    impact: 4,
    probability: 3,
    status: "actif",
    mitigation:
      "Identifier les r\u00e9f\u00e9rents IRC d\u00e8s S1, s\u00e9curiser les acc\u00e8s avant le d\u00e9marrage technique S2",
  },
  {
    id: "r6",
    label: "Mod\u00e8les s\u00e9mantiques existants partiels \u00e0 auditer/reprendre",
    impact: 3,
    probability: 4,
    status: "actif",
    mitigation:
      "Audit de l'existant int\u00e9gr\u00e9 \u00e0 S1, d\u00e9cision kill/rebuild par rapport d\u00e8s le cadrage",
  },
  {
    id: "r7",
    label: "Attentes reporting non align\u00e9es entre les \u00e9quipes DAS",
    impact: 3,
    probability: 3,
    status: "actif",
    mitigation:
      "Atelier de cadrage KPI unique en S1 avec tous les r\u00e9f\u00e9rents concern\u00e9s",
  },
];

export const BUDGET: Budget = {
  vendu_jh: 60,
  reel_cible_jh: 30,
  forfait_ht: 53900,
  tjm_affiche: 898,
  tjm_reel_cible: 1797,
  echeances: [
    { date: "2026-04-10", pct: 10, montant: 5390, label: "Commande" },
    { date: "2026-04-27", pct: 20, montant: 10780, label: "Jalon S3" },
    { date: "2026-05-27", pct: 30, montant: 16170, label: "Jalon S7" },
    { date: "2026-06-27", pct: 30, montant: 16170, label: "Jalon S10" },
    { date: "2026-07-07", pct: 10, montant: 5390, label: "Cl\u00f4ture" },
  ],
};

export const RAPPORTS: Rapport[] = [
  { id: "R1", label: "\u00c9v\u00e9nements action sociale territoriale", etat: "Excel, pas de mod\u00e8le s\u00e9mantique", complexite: "haute", lot: 1, weekId: 3 },
  { id: "R2", label: "ECO", etat: "Power BI existant, actualisation manuelle", complexite: "moyenne", lot: 1, weekId: 4 },
  { id: "R3", label: "Centres de pr\u00e9vention", etat: "Initi\u00e9, mod\u00e8le s\u00e9mantique \u00e0 revoir", complexite: "moyenne", lot: 1, weekId: 4 },
  { id: "R4", label: "Services 75 ans", etat: "Existant, ajustements pour automatisation", complexite: "basse", lot: 2, weekId: 5 },
  { id: "R5", label: "Politique habitat", etat: "Initi\u00e9, non finalis\u00e9", complexite: "moyenne", lot: 2, weekId: 5 },
  { id: "R6", label: "Tickets DAS", etat: "Initi\u00e9, n\u00e9cessite actualisation", complexite: "basse", lot: 3, weekId: null },
  { id: "R7", label: "Entreprises cotisantes", etat: "Initi\u00e9, mod\u00e8le s\u00e9mantique non finalis\u00e9", complexite: "haute", lot: 3, weekId: null },
];
