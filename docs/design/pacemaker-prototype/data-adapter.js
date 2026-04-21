// Adapter: bridges data.js shapes to what pages-core/pages-extra expect.
// Creates derived constants with the names the UI references.

// INCOHS — expected shape: { id, kind, severity, title, detected, conf, a:{kind,who,ts,quote}, b:{kind,who,ts,quote}, reco }
const INCOHS = [
  {
    id: "i1", kind: "constraint_change", severity: "major", detected: "il y a 2h", conf: 0.74,
    title: "Bascule scope R6/R7 — Nathalie vs décision S1",
    a: { kind: "photo", who: "Nathalie Lazardeux · atelier", ts: "17/04 17:40",
         quote: "Il faut qu'on récupère R6 et R7 d'ici fin mai — c'est attendu au COPIL." },
    b: { kind: "doc", who: "Décision d1 · kick-off", ts: "08/04",
         quote: "Lot 3 (R6/R7) passe en backlog — sera repris en mission ultérieure si besoin." },
    reco: "Confirmer avec Benoît Baret avant S4. Sinon : recalibrer (+5jh) ou acter trade-off explicite.",
  },
  {
    id: "i2", kind: "factual", severity: "moderate", detected: "hier", conf: 0.88,
    title: "R4 — cartographie contredite par vocal Paul B.",
    a: { kind: "vocal", who: "Paul B.", ts: "15/04",
         quote: "Sur R4, il manque trois mesures DAX — le modèle n'est pas complet." },
    b: { kind: "doc", who: "Cartographie S1", ts: "10/04",
         quote: "R4 — modèle sémantique existant, OK. Complexité basse." },
    reco: "Auto-résolu : cartographie mise à jour, +0,5jh ajouté en S5. Validation Paul D. requise.",
  },
  {
    id: "i3", kind: "scope_drift", severity: "minor", detected: "il y a 5h", conf: 0.91,
    title: "Demande onglet benchmark ECO — hors cadrage R2",
    a: { kind: "whatsapp", who: "Julien Moreau · métier ECO", ts: "18/04 09:12",
         quote: "Est-ce qu'on peut avoir un onglet benchmark inter-régions ? C'est critique pour moi." },
    b: { kind: "doc", who: "Scope R2 cadré", ts: "08/04",
         quote: "R2 — ECO standard, structure conforme à la v1 existante." },
    reco: "Documenter, arbitrer au hebdo S4. Pas d'action immédiate.",
  },
];

// DECISIONS reshape: add fields the UI expects (text, state, when, reasoning, sources[], conflictsWith)
const _origDecisions = window.DECISIONS || [];
window.DECISIONS = [
  {
    id: "d1", text: "Priorisation des 7 rapports en 3 lots — R6/R7 en backlog.",
    state: "contredite", conf: null, when: "08/04", conflictsWith: "Incohérence i1 (atelier 17/04)",
    reasoning: "Budget réel 30jh vs 60 vendus. R1/R2/R3 critiques sponsor. R6/R7 peu d'existant, reprise ultérieure possible.",
    sources: [
      { kind: "doc", label: "CR kick-off 08/04", ts: "08/04" },
      { kind: "ctx", label: "Contexte mission v3", ts: "07/04" },
    ],
  },
  {
    id: "d2", text: "Abandon du modèle sémantique R1 existant — reconstruction complète.",
    state: "en vigueur", conf: 0.78, when: "14/04",
    reasoning: "Modèle à 30%, nommage incohérent, pas de dimensions communes. Reprendre coûterait plus qu'une reconstruction.",
    sources: [
      { kind: "doc", label: "CR visio 14/04 (parsé)", ts: "14/04" },
      { kind: "vocal", label: "Vocal Paul B. contexte", ts: "14/04" },
    ],
  },
  {
    id: "d3", text: "DirectQuery vs Import — Import pour R2/R3.",
    state: "proposée", conf: 0.65, when: "15/04",
    reasoning: "Volumes Excel réduits, refresh quotidien suffisant. Maintenance simplifiée.",
    sources: [
      { kind: "doc", label: "Atelier technique 15/04", ts: "15/04" },
    ],
  },
  {
    id: "d4", text: "Clara Meyer désignée ambassadrice métier pour validation transverse.",
    state: "en vigueur", conf: 0.84, when: "il y a 4j",
    reasoning: "Satisfaction 0.88, historique positif, dispo suffisante. Extrait automatiquement du vocal post-atelier.",
    sources: [
      { kind: "vocal", label: "Vocal post-atelier 14/04", ts: "14/04" },
    ],
  },
];

// LIVRABLES reshape: add preview, kind, deliverable, genRatio, conf
window.LIVRABLES = [
  { id: "l1", title: "Cartographie des sources & propriétaires", kind: "Cartographie", deliverable: "AGIRC_BI_Cartographie_v1.xlsx",
    week: 1, status: "envoyé", genRatio: "70% Pacemaker", sources: 6, conf: 0.88,
    preview: [85, 72, 90, 55, 78, 40, 68] },
  { id: "l2", title: "Dictionnaire KPI v1", kind: "Dictionnaire", deliverable: "AGIRC_BI_KPI_v1.docx",
    week: 1, status: "envoyé", genRatio: "50% Pacemaker", sources: 4, conf: 0.82,
    preview: [90, 65, 80, 70, 55, 85, 50] },
  { id: "l3", title: "Architecture cible validée", kind: "Deck",  deliverable: "AGIRC_BI_Archi_v1.pptx",
    week: 1, status: "envoyé", genRatio: "30% Pacemaker", sources: 3, conf: null,
    preview: [95, 80, 70, 60, 85, 65, 78] },
  { id: "l4", title: "Modèle sémantique v1", kind: "Diagramme", deliverable: "AGIRC_BI_ModSem_v1.pptx",
    week: 2, status: "envoyé", genRatio: "40% Pacemaker", sources: 5, conf: 0.74,
    preview: [78, 90, 65, 80, 55, 72, 88] },
  { id: "l5", title: "Rapport R1 — Événements action sociale", kind: "PBIX", deliverable: "AGIRC_R1_v0.3.pbix",
    week: 3, status: "brouillon", genRatio: "80% Pacemaker", sources: 8, conf: 0.77,
    preview: [88, 75, 92, 68, 80, 55, 85] },
  { id: "l6", title: "Brief sponsor — point S3", kind: "Brief", deliverable: "AGIRC_Brief_S3.docx",
    week: 3, status: "révision", genRatio: "90% Pacemaker", sources: 12, conf: 0.81,
    preview: [92, 70, 80, 60, 75, 85, 55] },
  { id: "l7", title: "Rapport R2 — ECO automatisé", kind: "PBIX", deliverable: "AGIRC_R2_v0.1.pbix",
    week: 4, status: "brouillon", genRatio: "planifié", sources: 0, conf: null,
    preview: [50, 40, 55, 45, 35, 48, 42] },
  { id: "l8", title: "Rapport R3 — Centres de prévention", kind: "PBIX", deliverable: "AGIRC_R3_v0.1.pbix",
    week: 4, status: "brouillon", genRatio: "planifié", sources: 0, conf: null,
    preview: [45, 38, 50, 42, 35, 45, 40] },
];

// SOURCES reshape: add freshnessLabel, summary, chunks, tokens, producer, usedIn[]
window.SOURCES = [
  { id: "s1", kind: "doc", title: "CR Kick-off 08/04.docx", freshness: "old", freshnessLabel: "12j",
    ts: "08/04", summary: "Compte-rendu atelier de cadrage — 6 décisions, 23 tâches, 4 risques.",
    chunks: 18, tokens: 5400, producer: "Paul D. · upload manuel",
    usedIn: ["d1", "r-plan"] },
  { id: "s2", kind: "vocal", title: "Vocal Paul D. — retour atelier 14/04", freshness: "stale", freshnessLabel: "6j",
    ts: "14/04", summary: "4m12s · Retour atelier R1. Transcription Whisper · 2 décisions, 5 tâches.",
    chunks: 7, tokens: 1800, producer: "Plaud · transcription auto",
    usedIn: ["d2", "d4"] },
  { id: "s3", kind: "photo", title: "Paperboard atelier 17/04", freshness: "live", freshnessLabel: "3j", unique: true,
    ts: "17/04 17:40", summary: "Vision — 3 actions détectées, 1 décision contestée (confiance 0.68).",
    chunks: 3, tokens: 620, producer: "Photo iPhone · OCR Vision",
    usedIn: ["i1"] },
  { id: "s4", kind: "whatsapp", title: "WA — Julien Moreau 18/04", freshness: "live", freshnessLabel: "2j",
    ts: "18/04 09:12", summary: "Demande onglet benchmark inter-régions. Classé scope_drift.",
    chunks: 1, tokens: 140, producer: "WhatsApp · allowlist",
    usedIn: ["i3"] },
  { id: "s5", kind: "doc", title: "Cartographie sources S1.xlsx", freshness: "stale", freshnessLabel: "10j",
    ts: "10/04", summary: "Référence structurelle — ligne R4 contredite par vocal 15/04.",
    chunks: 24, tokens: 7200, producer: "Paul D. · upload",
    usedIn: ["plan", "i2"] },
];

// MISSION.stakeholders already has ids matching Pulse positions (bb, nl, pd, pb, ea, jm, cm) — good.

Object.assign(window, { INCOHS });
