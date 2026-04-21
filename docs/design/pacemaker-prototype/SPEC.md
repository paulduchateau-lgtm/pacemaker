# Pacemaker Prototype — Spec d'implémentation

**Source** : Claude Design (`claude.ai/design/p/10699fdf-…`)
**Date** : 2026-04-21
**État** : le prototype React du Claude Design présente une erreur d'exécution (`BriefingPage is not defined`) — le rendu visuel n'est pas observable à ce jour. Cette spec est extraite du HTML + data.js + styles.css + screenshots + historique de conversation Claude Design.

---

## 1. Intention produit (résumée du prompt de Paul à Claude)

> Interface Pacemaker "type Linear ou Confluence" + "très IA type Claude ou Plaud". UX complète pour qu'un user n'ait pas besoin de guide pour setup / visualiser le plan / générer les livrables / donner des inputs et voir que Pacemaker les a pris en compte. Une **feature novelle** pour "comprendre le projet dans son essence, les interactions humaines, les niveaux de satisfaction des acteurs, et voir à quel moment il y a eu des bascules du projet". Les **données d'entrée utilisées dans les prompts doivent être bien visibles** et flagger si certaines sont obsolètes, incohérentes ou autre.

Inputs prévus : Plaud, WhatsApp, chatbot intégré, uploads structurés (décisions, CR, docs).

---

## 2. Architecture de l'interface

### 2.1 Shell 3 colonnes

```
┌──────────────┬─────────────────────────────────┬──────────────────┐
│ SIDEBAR      │ MAIN (breadcrumb + page)        │ COPILOTE CONSOLE │
│ 220px        │ flex                            │ 360px            │
│ ink bg       │ paper bg                        │ paper-sunk bg    │
│              │                                 │                  │
│ Mission      │ Breadcrumb                      │ 3 tabs :         │
│ switcher     │ ─────                           │ • Conversation   │
│              │                                 │ • Signaux bruts  │
│ Nav groupes  │ Page courante                   │ • Raisonnement   │
│ ─ Signal     │                                 │                  │
│ ─ Trace      │                                 │ Input command-   │
│ ─ Inputs     │                                 │ bar en bas       │
│ ─ Méta       │                                 │                  │
└──────────────┴─────────────────────────────────┴──────────────────┘
```

**Tweaks panel** : flottant (icône engrenage) — density (compact/cozy), accent palette, copilote show/hide, ambient motion. Persisté en `localStorage`.

### 2.2 Les 9 pages

| Page | Chemin prototype | Rôle |
|---|---|---|
| Mission Home / Briefing | `/` | Briefing adaptatif + "what moved" depuis la dernière visite |
| Plan vivant | `/plan` | Semaines, tâches, livrables, recalibrations, tout interconnecté |
| **Pulse** (novel) | `/pulse` | Stakeholder map + courbes de satisfaction + **bascules projet** (pivots) |
| Décisions | `/decisions` | Décisions actées / proposées / révisées + alternatives + impacts |
| Incohérences | `/incoherences` | Flag des contradictions entre inputs et état courant |
| Livrables | `/livrables` | Grid livrables par semaine + statut |
| Sources | `/sources` | Inputs alimentant les prompts — staleness, inconsistency flags |
| Inbox | `/inbox` | Centre de notifs : nouveaux inputs, recalibs à confirmer, etc. |
| Temps libéré | `/temps-libere` | Médianes temps gagné par automatisation (déjà existant) |

---

## 3. Design tokens (depuis `styles.css` du prototype)

⚠️ **Divergence avec la charte Lite Ops actuelle** : paper blanc au lieu d'ivory, radius 10px au lieu de 6px max, ajouts sky/violet/accent. À valider avec Paul avant adoption globale.

```css
:root {
  /* Couleurs neutres */
  --ink: #1F1F1D;             /* ≠ actuel #1C1C1A */
  --ink-soft: #2D2D2A;
  --ink-dim: #5E5B55;
  --paper: #FFFFFF;           /* ≠ actuel #F0EEEB (ivory) */
  --paper-elevated: #FFFFFF;
  --paper-sunk: #F6F5F2;
  --border: #E8E5DE;
  --border-soft: #EEEBE4;
  --muted: #8F8B84;
  --muted-soft: #BEBAB2;

  /* Couleurs sémantiques */
  --green: #A5D900;            /* accent principal (inchangé) */
  --green-deep: #7AB800;
  --amber: #C4872E;            /* badges agents */
  --amber-soft: #EDC98A;
  --copper: #A0694A;           /* systèmes */
  --alert: #D95B2F;            /* incoherence, risk */
  --sky: #2D7D9A;              /* nouveau — phase Développement */
  --sky-soft: #B6D3DE;
  --violet: #6B5BB5;           /* nouveau */
  --accent: #F2EFE4;           /* surface "accent" (entre paper et border) */
  --accent-line: #E0DBC8;

  /* Rayons */
  --radius: 10px;              /* ≠ charte (6px max) */
  --radius-sm: 6px;
  --radius-xs: 4px;

  /* Ombres */
  --shadow-xs: 0 1px 0 rgba(28,28,26,0.03);
  --shadow-sm: 0 1px 2px rgba(28,28,26,0.04);
  --shadow-md: 0 4px 12px -6px rgba(28,28,26,0.08);
  --shadow-lg: 0 16px 36px -20px rgba(28,28,26,0.18), 0 2px 4px rgba(28,28,26,0.03);

  /* Typo */
  --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
  --sans: "DM Sans", "Inter", system-ui, sans-serif;
  --serif: "Instrument Serif", "Iowan Old Style", "Cambria", serif;
}
```

**Phase colors** (carte dans `data.js`):
- Cadrage → `--green`
- Construction socle → `--green-deep`
- Développement → `--sky`
- Stabilisation → `--amber`
- Transfert → `--alert`

---

## 4. Data model observé

Entités dans `data.js` (enrichissent le modèle actuel) :

- **Stakeholders** : {id, name, role, sat ∈ [0,1], trend "up|down|flat", last} — **nouveau** (pas en DB actuelle). Les 7 personnes de la mission avec score satisfaction.
- **Pulse events** : {t ∈ [0,1], who, kind "meeting|email|vocal|whatsapp", label, tone "pos|neu|neg", pivot?, pivotLabel?} — **nouveau**. Interactions datées qui alimentent la courbe de satisfaction et marquent les bascules projet.
- **Sources** : {id, kind "doc|vocal|photo|whatsapp|ctx", title, freshness "live|fresh|old|stale", used:N, extracts:[…], stale:bool, stalenote, inconsistency:bool} — **nouveau**. Le "tracker d'inputs" qui alimente les prompts.
- **Incohérences** : {kind, severity, description, source, conflict, proposal, status, resolution?} — **existant**, à remonter dans UI.
- **Decisions** : {statement, rationale, alternatives, impactsOn, conf, confNote} — **existant**, enrichi avec alternatives (déjà en schéma).
- **Recalibrations** : {trigger, scope, summary, changes:[…], reasoning} — **existant**.

---

## 5. Feature phare : la page Pulse

**C'est la feature novelle** demandée par Paul.

### 5.1 Contenu

1. **Stakeholder Map** (visuel circulaire) : chaque stakeholder = cercle dont
   - rayon = fréquence d'interaction récente
   - couleur = satisfaction (red→amber→green)
   - position = proximité au centre = criticité (sponsor au centre, métier en périphérie)

2. **Courbes de satisfaction** (temporel) : une ligne par stakeholder sur la durée mission, avec tone pos/neu/neg marqué par des points colorés. Les points `pivot: true` sont marqués explicitement avec un label "Bascule — …".

3. **Timeline des bascules** (en bas) : liste chronologique des pivots clés avec explication et impact dérivé (recalibs déclenchées, décisions révisées).

4. **Panneau latéral** : détail du stakeholder survolé (last interaction, type, historique).

### 5.2 Source de données (dans le repo actuel)

- Stakeholders : table à créer (ou dériver de `decisions.author` + `tasks.owner` + contacts mission). Placeholder : tirer depuis `missions.context` au parsing manuel pour l'instant.
- Pulse events : dériver de `events`, `decisions`, `plaud_signals` (chantier 5), `incoherences`.
- Tone : depuis `plaud_signals.kind` pour les émotionnels ; pour les autres, heuristique (auto_on_incoherence → neg, manual → neu, decision actée → pos).
- Pivot : marquer un event comme pivot si il déclenche une recalibration avec `scope = full_plan` ou une incohérence `severity = major`.

---

## 6. Mapping des 9 pages → pages actuelles du repo

| Prototype | Repo actuel | Action |
|---|---|---|
| Mission Home | *n'existe pas, il y a juste backlog par défaut* | Créer `/admin/missions/[slug]/briefing` ou repositionner `/` |
| Plan vivant | `/admin/missions/[slug]` (backlog) | Garder, renommer dans nav |
| **Pulse** | **néant** | **Créer** |
| Décisions | `/admin/missions/[slug]/decisions` | Existe, adapter design |
| Incohérences | `/admin/missions/[slug]/incoherences` | Existe, adapter design |
| Livrables | pas de page dédiée | Créer |
| Sources | `/admin/missions/[slug]/docs` | Étendre pour afficher staleness/inconsistency |
| Inbox | néant | Créer (optionnel MVP) |
| Temps libéré | `/admin/missions/[slug]/temps-libere` | Existe |

---

## 7. Pistes d'implémentation pour la suite

1. **Commencer par la Pulse page** (feature novelle, valeur produit la plus haute). Les autres pages existent déjà et n'ont "que" besoin d'un relift tokens.
2. **Copilote console** latéral : extraction en composant `<CopiloteConsole>` réutilisable. Peut se brancher sur `/api/agent-actions` pour feed "raisonnement" + sur `recent-changes.ts` pour "signaux bruts".
3. **Adopter les tokens du prototype** OU garder la charte Lite Ops actuelle — à trancher.
4. **Ne PAS** se jeter sur le port byte-à-byte des JSX du prototype (buggé, peu sont utilisables en l'état).

---

## 8. Fichiers sources disponibles dans ce dossier

- `Pacemaker Prototype.html` (13.9 KB) — HTML d'intégration (scripts Babel + React UMD), capturé via curl avec token signé
- `data.js` (~8 KB, re-formaté manuellement) — toutes les seed-data du prototype
- **Non récupérés** (bloqués par filtres extension Chrome + download multi-fichier) :
  - `styles.css` (52 KB) — partiellement lu via screenshot (tokens `:root` dans section 3)
  - `data-adapter.js` (7.5 KB) — bridge de nommage
  - `shell.jsx` (14.7 KB) — sidebar, copilote, breadcrumbs
  - `pages-core.jsx` (51 KB) — Briefing, Plan, Pulse, Décisions, Inputs
  - `pages-extra.jsx` (40 KB) — Incohérences, Livrables, Sources, Inbox

Si besoin de ces fichiers pour une implémentation fidèle : Paul doit les exporter manuellement depuis Claude Design (bouton "Share" / export zip) et les déposer ici.
