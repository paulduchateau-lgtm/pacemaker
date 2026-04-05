import type { Week, Risk, Rapport, Budget } from "@/types";

export const INITIAL_WEEKS: Week[] = [
  {
    id: 1,
    phase: "Cadrage",
    title: "Cadrage & cartographie",
    budget_jh: 4,
    actions: [
      "Réunion de lancement avec Benoît Baret et Nathalie Lazardeux",
      "Cartographie des 7 fichiers Excel sources (structure, propriétaires, fréquence MAJ)",
      "Entretiens flash avec les référents IRC et équipes métier DAS",
      "Audit des rapports Power BI existants (ECO, Prévention, 75 ans, Habitat, Tickets, Cotisantes)",
      "Définition des KPI prioritaires et règles de gestion",
      "Priorisation des rapports : Lot 1 (R1-R3), Lot 2 (R4-R5), Lot 3 (R6-R7)",
      "Proposition architecture cible (datasets, workspaces, gouvernance)",
    ],
    livrables: [
      "Cartographie des sources et propriétaires",
      "Dictionnaire KPI v1",
      "Architecture cible validée",
      "Backlog rapports priorisé",
    ],
    owner: "Paul",
  },
  {
    id: 2,
    phase: "Construction socle",
    title: "Modèle sémantique & dataset",
    budget_jh: 5,
    actions: [
      "Centralisation des données Excel dans Power BI (Power Query)",
      "Création des tables de faits et dimensions communes",
      "Mise en place des relations et hiérarchies",
      "Premières mesures DAX transversales",
      "Nettoyage et normalisation des sources",
      "Documentation du modèle (dictionnaire de données, règles de calcul)",
    ],
    livrables: [
      "Modèle sémantique v1",
      "Dataset Power BI v1",
      "Dictionnaire de données",
    ],
    owner: "Paul + Paul B.",
  },
  {
    id: 3,
    phase: "Développement",
    title: "Rapport R1 — Événements action sociale territoriale",
    budget_jh: 5,
    actions: [
      "Maquettage fonctionnel avec les métiers DAS",
      "Construction du modèle sémantique spécifique R1 (pas d'existant)",
      "Intégration des données Excel → Power Query",
      "Développement des visuels, filtres, drill-down",
      "Mesures DAX spécifiques R1",
      "Validation utilisateurs et corrections",
    ],
    livrables: ["Rapport R1 — Événements action sociale (validé)"],
    owner: "Paul + Paul B.",
  },
  {
    id: 4,
    phase: "Développement",
    title: "Rapports R2 (ECO) & R3 (Prévention)",
    budget_jh: 5,
    actions: [
      "R2 ECO : audit de l'existant Power BI, automatisation de l'actualisation",
      "R2 ECO : correction du modèle, ajout mesures DAX, automatisation refresh",
      "R3 Prévention : reprise du modèle sémantique existant",
      "R3 Prévention : reconstruction des visuels, tests cohérence",
      "Validation croisée R2 + R3 avec les métiers",
    ],
    livrables: [
      "Rapport R2 — ECO (automatisé, validé)",
      "Rapport R3 — Centres de prévention (validé)",
    ],
    owner: "Paul + Paul B.",
  },
  {
    id: 5,
    phase: "Développement",
    title: "Rapports R4 (75 ans) & R5 (Habitat)",
    budget_jh: 5,
    actions: [
      "R4 Services 75 ans : ajustements pour automatisation (existant OK)",
      "R4 : automatisation du refresh, tests",
      "R5 Politique habitat : finalisation du rapport initié",
      "R5 : complétion du modèle sémantique, visuels, validation",
      "Harmonisation UX/UI sur l'ensemble des rapports livrés",
    ],
    livrables: [
      "Rapport R4 — Services 75 ans (automatisé, validé)",
      "Rapport R5 — Politique habitat (finalisé, validé)",
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
      "Mise en place RLS si nécessaire",
      "Automatisation des rafraîchissements",
      "Structuration des droits d'accès",
      "Harmonisation des composants réutilisables (thème, mesures communes)",
      "Rédaction du plan de gouvernance Power BI",
    ],
    livrables: [
      "Rapports publiés en production",
      "Plan de gouvernance Power BI",
      "Rafraîchissements automatisés",
    ],
    owner: "Paul B.",
  },
  {
    id: 7,
    phase: "Transfert",
    title: "Formation, documentation & clôture",
    budget_jh: 3,
    actions: [
      "Formation de l'équipe DAS à la maintenance du modèle",
      "Formation à l'utilisation des rapports",
      "Rédaction du guide utilisateur",
      "Finalisation de la documentation technique et fonctionnelle",
      "Backlog d'évolutions (R6 Tickets, R7 Cotisantes) documenté pour reprise",
      "Validation de clôture avec Benoît Baret / Nathalie Lazardeux",
    ],
    livrables: [
      "Guide utilisateur",
      "Documentation technique et fonctionnelle",
      "Support de formation",
      "Backlog d'évolutions (R6, R7)",
      "PV de clôture mission",
    ],
    owner: "Paul",
  },
];

export const INITIAL_RISKS: Risk[] = [
  {
    id: "r1",
    label: "Dépassement de charge — budget réel 30 jh vs 60 jh vendus",
    impact: 5,
    probability: 3,
    status: "actif",
    mitigation:
      "Pilotage serré du temps passé, priorisation Lot 1 d'abord, R6-R7 en backlog si nécessaire",
  },
  {
    id: "r2",
    label: "Qualité hétérogène des fichiers Excel sources",
    impact: 4,
    probability: 5,
    status: "actif",
    mitigation:
      "Cartographie exhaustive en S1, nettoyage intégré à la construction du socle S2",
  },
  {
    id: "r3",
    label: "Scope creep — le client attend 7 rapports, budget pour 5",
    impact: 5,
    probability: 4,
    status: "actif",
    mitigation:
      "Poser le cadre dès le kick-off : Lot 1 (3), Lot 2 (2), Lot 3 si budget — R6/R7 documentés en backlog",
  },
  {
    id: "r4",
    label: "Validation lente côté DAS (direction métier, pas DSI)",
    impact: 4,
    probability: 4,
    status: "actif",
    mitigation:
      "Démos courtes toutes les semaines, validation intégrée au cycle, pas de phase validation séparée",
  },
  {
    id: "r5",
    label: "Dépendance aux référents IRC pour l'accès aux données",
    impact: 4,
    probability: 3,
    status: "actif",
    mitigation:
      "Identifier les référents IRC dès S1, sécuriser les accès avant le démarrage technique S2",
  },
  {
    id: "r6",
    label: "Modèles sémantiques existants partiels à auditer/reprendre",
    impact: 3,
    probability: 4,
    status: "actif",
    mitigation:
      "Audit de l'existant intégré à S1, décision kill/rebuild par rapport dès le cadrage",
  },
  {
    id: "r7",
    label: "Attentes reporting non alignées entre les équipes DAS",
    impact: 3,
    probability: 3,
    status: "actif",
    mitigation:
      "Atelier de cadrage KPI unique en S1 avec tous les référents concernés",
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
    { date: "2026-07-07", pct: 10, montant: 5390, label: "Clôture" },
  ],
};

export const RAPPORTS: Rapport[] = [
  { id: "R1", label: "Événements action sociale territoriale", etat: "Excel, pas de modèle sémantique", complexite: "haute", lot: 1, weekId: 3 },
  { id: "R2", label: "ECO", etat: "Power BI existant, actualisation manuelle", complexite: "moyenne", lot: 1, weekId: 4 },
  { id: "R3", label: "Centres de prévention", etat: "Initié, modèle sémantique à revoir", complexite: "moyenne", lot: 1, weekId: 4 },
  { id: "R4", label: "Services 75 ans", etat: "Existant, ajustements pour automatisation", complexite: "basse", lot: 2, weekId: 5 },
  { id: "R5", label: "Politique habitat", etat: "Initié, non finalisé", complexite: "moyenne", lot: 2, weekId: 5 },
  { id: "R6", label: "Tickets DAS", etat: "Initié, nécessite actualisation", complexite: "basse", lot: 3, weekId: null },
  { id: "R7", label: "Entreprises cotisantes", etat: "Initié, modèle sémantique non finalisé", complexite: "haute", lot: 3, weekId: null },
];
