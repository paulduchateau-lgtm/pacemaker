# CLAUDE.md — Pacemaker / Mission Pilotage App

## Contexte projet

Application web de pilotage de mission de consulting (transformation BI Power BI pour la Direction de l'Action Sociale de l'Agirc-Arrco, 7 semaines effectives sur 30 jh). Deux interfaces : une vue **Admin** (chef de projet) et une vue **Client** (lecture seule, Agirc-Arrco). L'app intègre l'API Anthropic pour générer des tâches, parser des comptes-rendus, recalibrer le plan en temps réel, et analyser des photos prises en atelier (tableau blanc, slides, Post-it). Une base documentaire RAG enrichit automatiquement les prompts LLM avec le contexte projet.

Le prototype fonctionnel existe en artifact React monofichier (voir `docs/prototype.jsx`). Ce repo est la version industrialisée, découpée et maintenable.

---

## Stack technique

- **Framework** : Next.js 14 (App Router)
- **UI** : React 18, Tailwind CSS, pas de bibliothèque de composants externe
- **State** : Zustand (store unique, slices par domaine)
- **Persistence** : SQLite via Turso (libsql)
- **Extension vectorielle** : Turso avec `libsql-vector` (embeddings dans la même DB)
- **LLM** : API Anthropic (claude-sonnet-4-20250514) — appels serveur uniquement
- **Vision / OCR** : Claude Vision API (même modèle, multimodal natif)
- **Embeddings** : Voyage AI (`voyage-3`, 1024 dimensions)
- **Stockage images** : Vercel Blob
- **Auth** : simple token/mot de passe pour la vue admin
- **Deploy** : Vercel
- **Langue UI** : français uniquement

---

## Charte graphique

Tout le design suit la charte Lite Ops / Infinitif. Ne jamais dévier.

```
COULEURS
  --ink:    #1C1C1A   (texte, headers, fonds sombres)
  --paper:  #F0EEEB   (fond principal)
  --green:  #A5D900   (accent, CTA, indicateurs positifs)
  --border: #D4D0CA   (séparateurs, bordures)
  --muted:  #8A8680   (texte secondaire, labels)

COULEURS DE PHASE
  Cadrage:              #A5D900
  Construction socle:   #7AB800
  Développement:        #2D7D9A
  Stabilisation:        #E8A317
  Transfert:            #D95B2F

TYPOGRAPHIE
  Sans:  "DM Sans" (titres, corps)
  Mono:  "JetBrains Mono" (labels, badges, données, code)

PRINCIPES
  - Fond --paper, cartes blanches, bordures --border
  - Header sticky fond --ink, texte --paper
  - Badges en mono 10px, uppercase, letter-spacing 1px
  - Pas d'emoji dans l'UI. Symboles typographiques : ◆ ★ ⚠ ⟳ ↑ ▶
  - Pas de border-radius > 6px
  - Inspiré Teenage Engineering / fiches techniques
```

---

## Principes responsive (non négociables)

L'app est **mobile-first**. Tous les composants doivent respecter ces règles :

1. **Breakpoints Tailwind** : base = mobile (< 640px), `sm:` = ≥ 640px, `md:` = ≥ 768px, `lg:` = ≥ 1024px
2. **Largeur max containers** : `max-w-4xl mx-auto px-4 md:px-6`
3. **Header** : stack vertical compact sur mobile, horizontal avec onglets sur desktop
4. **Grids** : `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` pour KPI cards
5. **Tables/listes** : pas de tables HTML sur mobile — cards empilées
6. **Zones tactiles** : minimum 44×44px
7. **Font sizes** : base 14px mobile, 14-16px desktop — jamais < 12px
8. **Modales mobile** : fullscreen (`inset-0`), centrées sur desktop
9. **Bottom bar navigation** : visible uniquement sur mobile (`lg:hidden`)
10. **Formulaires mobile** : labels au-dessus des inputs
11. **Pas de hover-only** : toute interaction accessible au tap

---

## Architecture fichiers

```
mission-pilotage/
├── CLAUDE.md                        ← CE FICHIER — lire en premier
├── docs/
│   ├── prototype.jsx                ← artifact React de référence
│   ├── DATA.md
│   ├── PROMPTS.md
│   └── PLAN.md                      ← plan mission (7 semaines)
├── src/
│   ├── app/
│   │   ├── layout.tsx               ← layout racine (charset utf-8)
│   │   ├── page.tsx                 ← redirect vers /admin
│   │   ├── admin/
│   │   │   ├── layout.tsx           ← auth + TopBar + BottomBar
│   │   │   ├── page.tsx             ← backlog (défaut)
│   │   │   ├── risques/page.tsx
│   │   │   ├── journal/page.tsx
│   │   │   ├── capture/page.tsx     ← capture photo + Vision
│   │   │   └── docs/page.tsx        ← base documentaire RAG
│   │   ├── client/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx             ← dashboard client
│   │   └── api/
│   │       ├── llm/
│   │       │   ├── generate-tasks/route.ts
│   │       │   ├── parse-upload/route.ts
│   │       │   └── recalibrate/route.ts
│   │       ├── vision/
│   │       │   └── extract/route.ts
│   │       ├── docs/
│   │       │   ├── upload/route.ts
│   │       │   ├── search/route.ts
│   │       │   └── [id]/route.ts
│   │       ├── embeddings/route.ts
│   │       └── data/
│   │           ├── tasks/route.ts
│   │           ├── risks/route.ts
│   │           ├── livrables/route.ts
│   │           └── events/route.ts
│   ├── lib/
│   │   ├── db.ts                    ← client Turso
│   │   ├── llm.ts                   ← wrapper Anthropic texte
│   │   ├── vision.ts                ← wrapper Claude Vision
│   │   ├── embeddings.ts            ← wrapper Voyage AI
│   │   ├── rag.ts                   ← chunking + recherche + getRelevantContext
│   │   ├── storage-blob.ts          ← Vercel Blob
│   │   ├── image-utils.ts           ← resize client-side
│   │   ├── prompts.ts               ← construction prompts
│   │   ├── computed.ts              ← calculs dérivés
│   │   └── seed.ts                  ← init DB
│   ├── store/
│   │   ├── index.ts
│   │   ├── tasks.ts
│   │   ├── risks.ts
│   │   ├── livrables.ts
│   │   ├── events.ts
│   │   ├── docs.ts
│   │   └── project.ts
│   ├── components/
│   │   ├── ui/                      ← atomiques responsive
│   │   │   ├── Badge.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── KpiCard.tsx
│   │   │   └── Button.tsx
│   │   ├── admin/
│   │   │   ├── WeekAccordion.tsx
│   │   │   ├── TaskRow.tsx
│   │   │   ├── AddTaskInline.tsx
│   │   │   ├── UploadZone.tsx
│   │   │   ├── RecalibrateButton.tsx
│   │   │   ├── RiskRow.tsx
│   │   │   └── AddRiskForm.tsx
│   │   ├── capture/
│   │   │   ├── CameraButton.tsx
│   │   │   ├── PhotoPreview.tsx
│   │   │   └── ExtractionResult.tsx
│   │   ├── docs/
│   │   │   ├── DocCard.tsx
│   │   │   ├── DocSearch.tsx
│   │   │   └── DocModal.tsx
│   │   ├── client/
│   │   │   ├── PhaseProgress.tsx
│   │   │   ├── CurrentWeekCard.tsx
│   │   │   ├── RisksSummary.tsx
│   │   │   ├── LivrablesGrid.tsx
│   │   │   ├── DecisionsTimeline.tsx
│   │   │   └── RoiStrip.tsx
│   │   └── nav/
│   │       ├── TopBar.tsx
│   │       └── BottomBar.tsx        ← lg:hidden
│   ├── hooks/
│   │   └── useMediaQuery.ts
│   ├── types/
│   │   └── index.ts
│   └── config/
│       ├── phases.ts
│       └── mission.ts               ← INITIAL_WEEKS, RISKS, BUDGET, RAPPORTS
├── schema.sql
├── tailwind.config.ts
├── .env.local.example
└── package.json
```

### Règle de découpage

Chaque fichier a **une seule responsabilité** et fait **moins de 150 lignes**. Si un composant dépasse 150 lignes, le découper. Objectif : évolutions chirurgicales en lisant 1-3 fichiers.

---

## Schéma de données

Voir `src/types/index.ts` pour les types complets (Week, Task, Risk, Livrable, MissionEvent, Rapport, Document, DocChunk, VisionExtraction, RagSearchResult, Budget, ProjectState) et `schema.sql` pour le DDL complet. Points clés :

- **Enums** : Phase, TaskStatus, TaskOwner, TaskSource ("manual"|"llm"|"upload"|"recalib"|"vision"), EventType (avec "vision"), DocType, DocSource
- **Tables principales** : weeks, tasks, risks, livrables, rapports, events, documents, doc_chunks, project
- **Index vectoriel** : `CREATE INDEX doc_chunks_embedding_idx ON doc_chunks(libsql_vector_idx(embedding))`
- **Embeddings** : colonne `F32_BLOB(1024)` dans `doc_chunks` (voyage-3 = 1024 dim)

---

## Prompts LLM

Tous les prompts sont dans `src/lib/prompts.ts` sous forme de fonctions pures. **Jamais de prompt en dur dans un composant ou une route.**

### 1. `buildGenerateTasksPrompt(week, existingTasks, prevWeekTasks, ragContext)`
Sortie : `[{"label", "owner", "priority"}]` — 4-6 tâches concrètes.

### 2. `buildParseUploadPrompt(uploadText, weekId, ragContext)`
Sortie : `{decisions, actions, risks, opportunities}`.

### 3. `buildRecalibrationPrompt(state, ragContext)`
Sortie : `{weeks: {"5": [...], "6": [...]}, carryover_notes}`.
Comportement : supprime les tâches non-faites des semaines ≥ currentWeek, préserve "fait", reporte les blocages, respecte les jalons.

### 4. `buildVisionExtractionPrompt()`
Sortie : `{ocr_text, summary, detected_elements: [{type, content}], confidence}`.
Photos possibles : tableau blanc, Post-it, slide, écran, cahier, schéma manuscrit.
Types détectés : decision, action, risk, kpi, schema, note.

**Règle d'or** : les 3 premiers prompts appellent `getRelevantContext()` avant construction pour injecter le RAG.

---

## Pipeline Vision (photo → extraction)

**Flow** :
1. `CameraButton` avec `<input capture="environment">` — caméra arrière mobile, file picker desktop
2. Resize client-side (max 1600px, JPEG 85%) via `lib/image-utils.ts`
3. Upload FormData vers `/api/vision/extract`
4. Route : upload Vercel Blob → appel Claude Vision → retour extraction
5. Preview dans `ExtractionResult.tsx`
6. Actions : Intégrer (crée tâches/risques source "vision") / Garder en doc / Rejeter

**Appel Vision** : model `claude-sonnet-4-20250514`, content type `image` avec source URL.

---

## Pipeline RAG

**Chunking** (`lib/rag.ts`) : ~500 tokens, overlap 50, respect des phrases.

**Embedding** (`lib/embeddings.ts`) : Voyage AI `voyage-3`, batch 128, `input_type: "document"` à l'indexation, `"query"` à la recherche.

**Recherche** : `searchDocs(query, limit)` utilise `vector_distance_cos` de libsql-vector, retourne résultats triés par distance croissante.

**Injection** : `getRelevantContext(query, weekId)` filtre par seuil (0.75 si semaine concernée, 0.70 sinon) et retourne un bloc `=== CONTEXTE DOCUMENTAIRE PERTINENT (RAG) ===` à injecter en tête des prompts.

---

## Navigation responsive

**Desktop (≥ lg)** : TopBar sticky avec onglets (Backlog, Risques, Journal, Capture, Docs) + toggle Admin/Client.

**Mobile (< lg)** : TopBar compacte + BottomBar fixe 4 icônes (Backlog, Capture, Docs, Plus→drawer Risques/Journal).

---

## Conventions de code

### Nommage
- Composants : PascalCase
- Utils : camelCase
- Constantes : UPPER_SNAKE_CASE

### Composants
- Un composant par fichier, export default
- Responsive dès la création
- Pas de `useEffect` pour la logique métier
- `components/ui/` : purement visuels

### API Routes
- Handler dédié par fichier
- Validation côté serveur
- Appels LLM via `lib/llm.ts`, Vision via `lib/vision.ts`, embeddings via `lib/embeddings.ts`
- Retour `Response.json()` (UTF-8 auto)

### Store
- Un slice par domaine
- Fetch initial au mount, mutations via API puis store
- Pas de logique LLM/Vision/RAG dans le store

---

## Logique métier clé

### Calculs dérivés (`src/lib/computed.ts`)
```
getWeekTasks, getTaskStats, getAllTaskStats, getPhaseProgress,
getLivrableStats, riskScore, getBudgetConsumed, getBudgetRemaining
```

### Flux de recalibration
1. Admin clique "⟳ Recalibrer"
2. `POST /api/llm/recalibrate` avec état complet
3. Enrichissement RAG via `getRelevantContext()`
4. Prompt construit + appel LLM (max_tokens 4000)
5. Suppression tâches non-faites semaines ≥ currentWeek
6. Insertion nouvelles tâches (source: "recalib")
7. Événement "recalib" logué
8. Store rechargé

### Flux d'upload CR texte
1. Admin colle CR dans une semaine
2. `POST /api/llm/parse-upload` avec `{text, weekId}`
3. Enrichissement RAG
4. Parsing → décisions/actions/risques/opportunités
5. Insertion en DB (tâches source: "upload")
6. Le CR est aussi indexé dans `documents` + `doc_chunks`
7. Store rechargé

### Flux capture photo
1. Photo via `CameraButton` → resize → FormData
2. `POST /api/vision/extract`
3. Upload Vercel Blob → Claude Vision
4. Preview dans `ExtractionResult.tsx`
5. "Intégrer" → crée entités depuis `detected_elements` + indexe OCR dans RAG + événement "vision"

---

## Variables d'environnement

```
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
ADMIN_PASSWORD=...
```

---

## Ordre de build recommandé

1. **Setup** : Next.js 14 + Tailwind (tokens charte)
2. **Schema DB** : `schema.sql` complet (toutes tables + index vectoriel)
3. **Types** : `src/types/index.ts` exhaustif
4. **Config** : `phases.ts`, `mission.ts` (seed)
5. **lib/db.ts + lib/seed.ts** : init DB avec 7 semaines, 7 risques, livrables, rapports, budget
6. **lib/computed.ts** : calculs purs
7. **lib/llm.ts + lib/prompts.ts** : wrapper + prompts (sans Vision/RAG d'abord)
8. **Store Zustand** : slices tasks, risks, livrables, events, project
9. **components/ui/** : atomiques (responsive dès le départ)
10. **components/nav/** : TopBar + BottomBar
11. **API routes data** : CRUD
12. **API routes LLM** : generate-tasks, parse-upload, recalibrate
13. **Pages admin** : backlog, risques, journal (responsive)
14. **Page client** : dashboard (responsive)
15. **Auth admin** : middleware
16. **Extension Vision/RAG** :
    - lib/image-utils.ts
    - lib/storage-blob.ts
    - lib/vision.ts
    - lib/embeddings.ts
    - lib/rag.ts
    - Routes `/api/vision/extract`, `/api/docs/*`, `/api/embeddings`
    - Store `docs.ts`
    - components/capture/ et components/docs/
    - Pages `/admin/capture` et `/admin/docs`
    - Intégration RAG dans les 3 prompts existants
17. **Tests end-to-end** : photo → extraction → intégration → recherche → recalibration enrichie

---

## Points d'attention

### Encodage UTF-8 (critique)
Tous les fichiers en **UTF-8 sans BOM**. Vérif : `file -I <fichier>` → `charset=utf-8`. Layout racine avec `<meta charSet="utf-8" />` et `<html lang="fr">`. Réponses API via `Response.json()` (charset auto).

### Performance
- Resize client-side OBLIGATOIRE avant Vision (max 1600px)
- `loading="lazy"` sur images docs
- Pagination si > 50 docs
- Debounce 500ms recherche sémantique

### Coûts
- Claude Vision : ~0.015 $/image → 0.75-1.50 $ total
- Claude texte : 5-10 $ sur la mission
- Voyage embeddings : négligeable
- Vercel Blob : négligeable

### Sécurité
- URLs Blob privées + URLs signées pour affichage
- Validation serveur : max 10MB, types jpg/png/webp/heic
- Middleware auth sur `/admin/*`
- Aucune API key côté client

---

## Ce que tu ne dois PAS faire

- Prompt LLM en dur dans un composant
- Fichier > 150 lignes
- Bibliothèque de composants (shadcn, MUI, etc.)
- Logique métier dans un composant UI
- Appels API Anthropic/Voyage/Blob côté client
- Dévier de la charte graphique
- Emoji dans l'UI (sauf ◆ ★ ⚠ ⟳ ↑ ▶)
- Anglais dans l'UI
- Route `/m/*` séparée (app responsive unique)
- Tesseract.js côté client
- Images en base64 dans la DB
- Chunking à taille fixe sans respect des phrases
- Recherche sémantique côté client
- Oublier le resize client-side avant Vision
- Tables HTML sur mobile (cards empilées)
- Interactions hover-only
- Zones tactiles < 44×44px sur mobile
- Fichiers en Latin-1 (UTF-8 sans BOM obligatoire)

---

## Pour les évolutions futures

1. **Lis ce CLAUDE.md d'abord**
2. Identifie les 1-3 fichiers concernés via l'arborescence
3. Lis uniquement ces fichiers + `types/index.ts` si besoin
4. Évolution chirurgicale
5. Nouveau type → `types/index.ts` + `schema.sql`
6. Nouveau prompt → `lib/prompts.ts`
7. Nouveau composant → fichier dédié dans le bon dossier
8. Toujours responsive
9. Vérifie l'UTF-8

Ce fichier est la source de vérité.
