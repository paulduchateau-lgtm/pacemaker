# PRODUCT_MAP.md — Pacemaker

**Date** : 2026-04-17
**Repo** : `/Users/paulduchateau/projects/liteops/pacemaker`
**Objet** : mapping exhaustif des fonctionnalités et de l'architecture pour confrontation au manifeste v0.1.

---

## 1. Vue d'ensemble

### Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 14 (App Router) |
| Frontend | React 18 + Tailwind CSS (variables custom) |
| State | Zustand 5 (slices modulaires) |
| Base de données | SQLite via Turso (`libsql` client) + vecteurs natifs |
| Embeddings | Voyage AI `voyage-3` (1024 dimensions) |
| LLM | Anthropic Claude `claude-sonnet-4-20250514` (appels serveur uniquement) |
| Vision | Claude Vision API (même modèle, multimodal natif) |
| Stockage fichiers | Vercel Blob (images et livrables générés) |
| Parsing fichiers | `mammoth` (DOCX), `exceljs` (XLSX), `pptxgenjs` (PPTX), `pdf-parse` (PDF) |
| Déploiement | Vercel |
| Auth | Token/mot de passe simple (middleware sur `/admin/*`) |
| Langue UI | Français uniquement |

### Structure du repo

```
src/
  app/
    admin/                    # Interface responsable projet
      page.tsx                # Backlog hebdomadaire (défaut)
      risques/page.tsx
      journal/page.tsx        # Timeline d'événements
      capture/page.tsx        # Photo + extraction Vision
      docs/page.tsx           # Base documentaire RAG
      contexte/page.tsx       # Contexte mission + thème livrables
      regles/page.tsx         # Consultation des règles apprises
      layout.tsx              # Auth + TopBar + BottomBar

    client/                   # Interface client (lecture seule)
      page.tsx                # Dashboard mission
      layout.tsx

    api/
      llm/
        generate-tasks/route.ts
        parse-upload/route.ts        # CR texte → tâches/risques/décisions
        recalibrate/route.ts         # Reprévision du plan
        generate-livrables/route.ts  # Livrables pour une tâche
        create-livrable/route.ts     # Génération + rendu document
        update-livrable-content/route.ts
      vision/extract/route.ts        # Photo → OCR + extraction structurée
      docs/ (route, upload, search)
      embeddings/route.ts            # Batch Voyage
      corrections/ (route, [id], stats)  # Tracking + règles apprises
      data/ (tasks, risks, livrables, events, weeks, project, schedule)
      generations/route.ts           # Historique générations
      seed/route.ts                  # Init 7 semaines + données pilote
      migrate/route.ts

  lib/
    db.ts                  # Client Turso + query/execute
    llm.ts                 # Wrapper Anthropic (text)
    vision.ts              # Claude Vision
    embeddings.ts          # Voyage AI batch + single
    rag.ts                 # Chunking + searchDocs + getRelevantContext
    prompts.ts             # Construction prompts (fonctions pures)
    rules.ts               # getRelevantRules pour injection
    corrections.ts         # trackGeneration + processCorrection
    mission-context.ts     # getMissionContext (injection tous prompts)
    computed.ts            # Calculs purs (stats, scores)
    dates.ts               # Gestion calendrier
    storage-blob.ts        # Vercel Blob upload
    image-utils.ts         # Resize client
    doc-parser.ts          # Extraction texte PDF/DOCX/PPTX/XLSX
    livrables/
      types.ts             # LivrablePayload (schéma structuré)
      context.ts           # loadLivrableContext
      validate.ts          # parseLivrablePayload
      render.ts            # renderLivrable (dispatch)
      fallback.ts          # markdownToPayload (secours)
      theme-store.ts       # Persistance thème
      renderers/ (docx, pptx, xlsx)
      themes/ (liteops, agirc-arrco)

  store/                   # Zustand (8 slices)
    tasks, risks, livrables, events, docs, project, schedule, corrections

  components/
    ui/                    # Atomiques
    admin/                 # WeekAccordion, TaskRow, TaskDetail, UploadZone…
    capture/               # CameraButton, PhotoPreview, ExtractionResult
    docs/                  # DocCard, DocSearch, DocModal
    client/                # PhaseProgress, CurrentWeekCard, RisksSummary…
    corrections/           # CorrectionButton, CorrectionModal, RuleCard
    nav/                   # TopBar, BottomBar

  types/index.ts
  config/ (phases.ts, mission.ts)
  hooks/useMediaQuery.ts

schema.sql                 # DDL complet (~153 lignes)
CLAUDE.md                  # Conventions projet
```

### Architecture

- Monolithe Next.js (frontend + API dans le même projet)
- Pas de BFF séparé, pas de microservices
- State UI en Zustand, persistance en Turso, vecteurs dans la même DB
- Auth : mot de passe simple, stockage localStorage (pas JWT, pas OAuth)

---

## 2. Modèle de données

### Entités principales

**Week** : `id` (1–7), `phase`, `title`, `budget_jh`, `actions` (JSON), `livrables_plan` (JSON), `owner`, `start_date`, `end_date`, `baseline_start_date`, `baseline_end_date`.

**Task** : `id`, `week_id`, `label`, `description`, `owner` (Paul | Paul B. | Client), `priority` (haute|moyenne|basse), `status` (à faire|en cours|bloqué|fait), `source` (manual|llm|upload|recalib|vision), `jh_estime`, `livrables_generes` (JSON), `created_at`, `completed_at`.

**Risk** : `id`, `label`, `impact` (1–5), `probability` (1–5), `status` (actif|mitigé|clos), `mitigation`.

**Livrable** : `id`, `week_id`, `label`, `status` (planifié|en cours|livré|validé), `delivery_date`.

**Event** : `id`, `type` (decision|upload|opportunity|recalib|task|risk|budget|vision|schedule), `label`, `week_id`, `date`, `content`.

**Document** : `id`, `title`, `type` (cr|note|spec|photo|autre), `source` (upload|vision|manual), `week_id`, `blob_url`, `content`, `created_at`.

**DocChunk** : `id`, `doc_id`, `chunk_index`, `content` (~500 tokens), `embedding` (F32_BLOB 1024).

**Generation** : `id`, `generation_type` (tasks|parse_cr|recalib|vision|livrables), `context` (JSON), `prompt`, `raw_output`, `applied_rules` (JSON), `week_id`, `created_at`.

**Correction** : `id`, `generation_id`, `corrected_output`, `diff_summary`, `rule_learned`, `rule_embedding` (F32_BLOB 1024), `generation_type`, `applied_count`, `status` (active|superseded|archived), `created_at`.

**ScheduleChange** : `id`, `week_id`, `field`, `old_value`, `new_value`, `change_type` (recalage_planifie|deviation), `cascaded`, `reason`, `created_at`.

**TaskAttachment** : `id`, `task_id`, `filename`, `blob_url`, `content_type`, `created_at`.

**Project (k/v)** : `mission_start_date`, `jh_consommes`, `currentWeek`, `mission_context`, `livrable_theme`.

### Stockage

| Type | Emplacement |
|------|-------------|
| Relationnel | Turso (SQLite) |
| Vecteurs embeddings | F32_BLOB(1024) dans `doc_chunks` et `corrections` |
| Images | Vercel Blob (URLs signées) |
| Documents générés | Vercel Blob |
| State applicatif | Zustand (mémoire React) |

---

## 3. Fonctionnalités existantes

### 3.1 Ingestion d'input

- **Génération tâches IA** — `src/app/api/llm/generate-tasks/route.ts` + bouton "GENERATION…" sur WeekAccordion. Produit 4–6 tâches pour une semaine. Fonctionnel.
- **Parsing CR texte** — `src/app/api/llm/parse-upload/route.ts`, UploadZone sur page admin. Paste texte → extraction décisions/actions/risques/opportunités. Fonctionnel.
- **Capture photo + Vision** — `/admin/capture` → `/api/vision/extract`. Caméra ou file picker, resize client, Claude Vision, éléments structurés (decision/action/risk/kpi/schema/note). Fonctionnel.
- **Upload documents** — `/admin/docs` → `/api/docs/upload`. PDF/DOCX/PPTX/XLSX/images, parsing, chunking, embedding, indexation RAG. Fonctionnel.
- **Contexte mission** — `/admin/contexte`. Rich textarea injecté dans TOUS les prompts LLM. Fonctionnel.
- **Saisie manuelle** — AddTaskInline, AddRiskForm. Fonctionnel.

### 3.2 Restitution / briefing

- **Backlog par semaine (admin)** — `/admin` par défaut. 7 semaines en accordéons. Fonctionnel et responsive.
- **Dashboard client (lecture seule)** — `/client`. Phase progress, semaine courante, risques, livrables, timeline décisions, ROI strip. Fonctionnel.
- **Journal de mission** — `/admin/journal`. Timeline événements, icônes/couleurs par type. Fonctionnel.
- **TaskRow / TaskDetail** — édition inline, statut, génération livrables. Fonctionnel.
- **KPI cards** — tâches total, avancement, semaine courante, jh. Fonctionnel.

### 3.3 Décisions / traçabilité

- **Event "decision"** créé automatiquement via parse-upload ou vision. Pas de création manuelle dédiée.
- **DecisionsTimeline (client)** — `src/components/client/DecisionsTimeline.tsx`. Filtre events type "decision".
- **Historique calendrier** — `/api/data/schedule/history`. GET audit des changements (raison, cascade).

### 3.4 Multi-missions (pilotage)

- **7 semaines figées** — seed `src/config/mission.ts`. L'app est structurée autour d'UNE mission de 7 semaines.
- **Recalibration** — `/api/llm/recalibrate` + bouton RecalibrateButton. Reprévoit semaines ≥ currentWeek. Fonctionnel, déclenchement manuel.
- **Gestion risques** — `/admin/risques`. CRUD, grid impact × probabilité.
- **Budget jour-homme** — affichage via KPI et `lib/computed.ts`. Pas de workflow de suivi actif.
- **Cascade dates** — `/api/data/schedule` + DateChangeModal. Change date + option cascade + raison.

### 3.5 Livrables

- **Génération livrables pour une tâche** — `/api/llm/generate-livrables`. 1–3 livrables proposés (titre, description, format).
- **Création + rendu document** — `/api/llm/create-livrable`. LLM → JSON payload → DOCX/XLSX/PPTX (pptxgenjs, exceljs). Fallback markdown.
- **Visualisation** — `LivrableViewer.tsx`, placeholders `[X]` et `{{Y}}` détectés et colorés.
- **Thèmes** — `liteops` (défaut) et `agirc-arrco` (client), sélection dans `/admin/contexte`.

### 3.6 RAG

- **Indexation sémantique** — `lib/rag.ts:indexDocument()`. Chunking ~500 tokens, overlap 50, embeddings Voyage batch.
- **Recherche sémantique** — `/api/docs/search`, composant DocSearch (debounce 500ms). Cosine, seuil 0.75 (week-local) / 0.70 (global).
- **Injection RAG dans tous les prompts** — `getRelevantContext()` appelé avant generate-tasks, parse-upload, recalibrate, livrables, vision. Bloc `=== CONTEXTE DOCUMENTAIRE PERTINENT (RAG) ===`.

### 3.7 Apprentissage continu

- **trackGeneration** — `lib/corrections.ts`. Toutes les routes LLM enregistrent prompt, raw output, applied rules.
- **processCorrection** — `/api/corrections`. User corrige sortie → LLM extrait `diff_summary` + `rule_learned` → embedding Voyage.
- **getRelevantRules** — `lib/rules.ts`. Filtre par type + similarité (seuil 0.65), max 5 règles, injection `=== RÈGLES APPRISES ===`.
- **UI règles** — `/admin/regles`. Liste, groupement par type, search, archive.
- **Compteur `applied_count`** — incrémenté à chaque injection.
- **Historique générations** — `/api/generations`. Consultation prompt/output/rules par génération.

### 3.8 Navigation / UI

- **TopBar desktop + BottomBar mobile** — responsive natif, toggle admin/client.
- **Auth simple** — `ADMIN_PASSWORD`, token localStorage.

---

## 4. Pipeline IA

### Modèles utilisés

| Usage | Modèle | Max tokens |
|-------|--------|-----------|
| Génération tâches | `claude-sonnet-4-20250514` | 2000 |
| Parsing CR | `claude-sonnet-4-20250514` | 3000 |
| Recalibration | `claude-sonnet-4-20250514` | 4000 |
| Vision (photo) | `claude-sonnet-4-20250514` (multimodal) | 2000 |
| Génération livrables | `claude-sonnet-4-20250514` | 2000–4000 |
| Analyse correction | `claude-sonnet-4-20250514` | 1500 |

### Structure des prompts (`src/lib/prompts.ts`)

Tous les prompts suivent la même architecture empilée :

```
1. Bloc RÈGLES APPRISES       (getRelevantRules, max 5)
2. Bloc CONTEXTE MISSION      (getMissionContext)
3. Bloc CONTEXTE DOCUMENTAIRE (getRelevantContext, RAG)
4. Instruction métier + données (week, tasks, etc.)
5. Consigne de format (JSON attendu, tableau, etc.)
```

### Prompts clés

- `buildGenerateTasksPrompt` → `[{label, owner, priority}]`
- `buildParseUploadPrompt` → `{decisions, actions, risks, opportunities}`
- `buildRecalibrationPrompt` → `{weeks: {N: [...]}, carryover_notes}`
- `buildGenerateLivrablesPrompt` → `{livrables: [{titre, description, format}], plan_action}`
- `buildCreateLivrablePrompt` → `LivrablePayload` (blocks ou sheets)
- Vision extract → `{ocr_text, summary, detected_elements[], confidence}`

### RAG & embeddings

- Chunking : ~500 tokens, overlap 50, respect des phrases
- Embeddings : Voyage `voyage-3`, 1024d, batch 128
- Recherche : `vector_distance_cos`, seuil 0.75 / 0.70, top 8
- `input_type` : "document" (indexation) vs "query" (recherche)

### Détection d'incohérences & confiance

- **Pas de scoring de confiance affiché** à l'utilisateur.
- **Pas de détection de contradictions** entre entités.
- **Parsing JSON faible** (pas de validation schéma stricte, sauf livrables via `validate.ts`).
- **Fallback** existe pour les livrables (JSON invalide → markdown → payload).
- **Confidence** présente dans la sortie Vision (`confidence`) mais pas exploitée dans l'UI.

### Règles apprises — discipline

- Max 5 règles injectées / prompt
- Seuil similarité 0.65
- Filtrage par `generation_type`
- Statut : active / superseded / archived

---

## 5. Canaux d'entrée

### Branchés

| Canal | Où | État |
|-------|-----|------|
| Texte libre (CR paste) | UploadZone page admin | Fonctionnel |
| Caméra (photo) | `/admin/capture` (`<input capture=environment>`) | Fonctionnel |
| File picker images | `/admin/capture` | Fonctionnel |
| Upload multi-format | `/admin/docs` (PDF/DOCX/PPTX/XLSX/images) | Fonctionnel |
| Forms (saisie directe) | AddTaskInline, AddRiskForm | Fonctionnel |
| Contexte mission | `/admin/contexte` | Fonctionnel |

### Absents

- **Vocal** (pas d'API speech-to-text branchée, aucun composant micro visible)
- **Email entrant** (pas de webhook, pas d'intégration Gmail/Outlook)
- **Slack / Teams** (aucune intégration)
- **Calendrier** (Google/Outlook) — aucun sync
- **Jira / Linear / Monday** — aucune intégration
- **Power BI** (client AGIRC-Arrco) — aucun export

---

## 6. Visiblement absent ou stubbed

### Démarré, incomplet

1. **Rapports** — table `rapports` existe dans `schema.sql` (lots 1/2/3, état, complexité) mais **aucune UI**, aucune génération LLM, aucun linking.
2. **Budget détaillé** — entité avec `vendu_jh`, `reel_cible_jh`, `forfait_ht`, `tjm_affiche`, `echeances` — affichage KPI seulement, **pas de workflow** paiement/échéances.
3. **Workflow livrables** — les statuts `planifié|en cours|livré|validé` existent mais **ne sont pas enforced**, pas de validation client.
4. **Modale correction** — `CorrectionModal.tsx` existe, intégration **partielle** dans TaskDetail (pas visible partout où ce serait utile).
5. **Export PDF / mail client** — pas de route, pas d'UI.

### Nominal mais sous-exploité

- **Phases colorées** — couleurs définies dans `config/phases.ts` mais **pas de bande de phase** dans le backlog (accents seulement).
- **Historique `schedule_changes`** — bien structuré, UI minimaliste.

### Endpoints sans UI

- `DELETE /api/corrections/[id]` — pas de bouton "supprimer règle" visible.
- `/api/corrections/stats` — pas de page stats règles.
- `/api/llm/update-livrable-content` — pas d'UI "re-générer".
- `/api/llm/create-livrable/prompt` — pas de modale "voir le prompt".

---

## 7. Flux utilisateur types

### Flux 1 — Création tâches et suivi hebdo

```
1. Admin /admin (login)
2. Backlog 7 semaines (accordéons)
3. Semaine 2 vide → "GENERATION…"
   POST /api/llm/generate-tasks {weekId: 2}
   LLM génère 4–6 tâches, stockage DB, refresh store
4. Admin corrige / ajoute manuellement
5. TaskDetail → "Générer livrables"
   POST /api/llm/generate-livrables {taskId}
6. Mission avance → Admin "⟳ Recalibrer"
   POST /api/llm/recalibrate {currentWeek}
   Supprime tâches non-faites semaines ≥ currentWeek
   LLM reprévoit le reste
```

### Flux 2 — Capture atelier

```
1. /admin/capture
2. CameraButton → caméra (capture=environment)
3. Photo → resize client → Vercel Blob → Claude Vision
4. Preview : OCR + detected_elements
5. "Intégrer" → crée tâches (source=vision), risks, events
6. OCR indexé en documents RAG
7. Event "vision" loggé en journal
```

### Flux 3 — Correction et apprentissage

```
1. Admin génère tâches semaine
2. Une tâche est mauvaise → correction
3. CorrectionModal → POST /api/corrections
   LLM extrait diff_summary + rule_learned (généralisée)
   Embedding Voyage → stockage corrections
4. Prochaine génération :
   getRelevantRules → filtre par type + similarité 0.65
   Règle injectée dans prompt → LLM respecte
5. /admin/regles : liste + applied_count
```

---

## 8. Cartographie principes (manifeste) ↔ features

| Feature | Implémentation | Principes candidats |
|---------|----------------|---------------------|
| Parse CR (texte) | `/api/llm/parse-upload` | 1 (parler+absorber), 2 (trace) |
| Vision photo | `/api/vision/extract` | 1 (parler+absorber) |
| **Pas de vocal** | — | **1 violé partiellement** |
| Event "decision" | parse-upload + vision | 2 (trace argumentée) — **manque motifs/alternatives** |
| Recalibrate | `/api/llm/recalibrate` (manuel) | 3 (réévaluation) — **pas automatique sur input** |
| Détection incohérences | — | **4 non adressé** |
| Briefing adaptatif 30s/2min/10min | — | **5 non adressé** |
| Confidence affichée | sortie Vision (non exploitée) | **6 partiel** — pas d'alternative, pas d'argumentaire visible |
| Apprentissage règles | corrections + rules.ts | 6 (enregistre désaccords), 7 (aide senior) |
| 7 semaines figées mono-mission | seed mission.ts | **7 violé** — produit actuellement mono-mission |
| Journal événements | `/admin/journal` | 2 (trace) |
| Livrables structurés | create-livrable + renderers | Utile mais non directement couvert par manifeste |
| Dashboard client read-only | `/client` | Utile mais hors scope strict manifeste |

---

## 9. Points flous / à clarifier

- **Authentification client** : aucune UI login sur `/client`, accès direct — voulu ?
- **`currentWeek`** : comment/quand incrémenté ? pas de trigger automatique visible.
- **Retention** des corrections/générations : pas de politique de purge.
- **Édition concurrente** : pas de lock visible.
- **Logs persistants** : seulement `console.*` en dev.

---

## 10. Résumé pour confrontation au manifeste

Pacemaker est aujourd'hui un **copilote IA mono-mission structuré en 7 semaines**, avec :

1. **Capture multi-canal** (texte + photo + documents) — manque vocal et email/Slack entrant.
2. **Pipeline LLM unifié** (Claude Sonnet 4) avec RAG systématique et règles apprises injectées.
3. **Traçabilité partielle** : events, generations, schedule_changes — mais **sans champ motifs/alternatives/confiance** sur les décisions.
4. **Recalibration manuelle** déclenchée par bouton — pas automatique sur nouvel input.
5. **Apprentissage continu** opérationnel (corrections → règles → injection).
6. **Livrables structurés** (DOCX/XLSX/PPTX) avec thèmes et fallback robuste.
7. **Mono-mission** : toute l'UI, le seed, les énumérations (`week_id` 1–7) sont figés autour d'une seule mission.

**Écarts manifeste les plus visibles** :
- P1 : pas de vocal, beaucoup de forms subsistent
- P2 : décisions tracées mais pas de motifs/alternatives/auteur explicite
- P3 : réévaluation manuelle, pas automatique
- P4 : aucune détection d'incohérences
- P5 : aucun briefing adaptatif au temps disponible
- P6 : pas de confidence ni d'argumentaire structuré exposés à l'utilisateur
- P7 : produit mono-mission, pas multi-mission

**Points où Pacemaker va déjà dans le sens du manifeste** :
- Génération de tâches et de livrables qui décharge la formalisation (P1)
- Apprentissage continu à partir des corrections (P6 implicite)
- Journal et historique des changements calendrier (P2)
- Dashboard client temps-réel qui rend caduque la réunion de statut (manifeste §"Contre la réunion de statut")
