# Audit de consommation LLM — Pacemaker

**Date** : 2026-04-20
**Scope** : appels Anthropic `claude-sonnet-4-20250514` côté serveur, après chantiers 1-3.

---

## 1. Inventaire des call sites actifs

| # | Call site | Fichier | Modèle | max_tokens out | Fréquence typique/mission active |
|---|---|---|---|---|---|
| 1 | Recalibration (manuel + 4 triggers auto) | [lib/recalibration.ts:613](../src/lib/recalibration.ts) | sonnet-4 | 4000 | 15-30 / semaine |
| 2 | Parse CR | [api/llm/parse-upload/route.ts:73](../src/app/api/llm/parse-upload/route.ts) | sonnet-4 | 3000 | 5-15 / semaine |
| 3 | Génération tâches semaine | [api/llm/generate-tasks/route.ts:79](../src/app/api/llm/generate-tasks/route.ts) | sonnet-4 | 2000 | 5-10 / semaine |
| 4 | Génération livrables depuis tâche | [api/llm/generate-livrables/route.ts:93](../src/app/api/llm/generate-livrables/route.ts) | sonnet-4 | 2000 | 10-30 / semaine |
| 5 | Création livrable DOCX/XLSX/PPTX | [api/llm/create-livrable/route.ts:69](../src/app/api/llm/create-livrable/route.ts) | sonnet-4 | 4000 | 5-15 / semaine |
| 6 | Vision (extraction photo) | [lib/vision.ts:33](../src/lib/vision.ts) | sonnet-4 | 2000 | 2-10 / semaine |
| 7 | Briefing adaptatif (**caché 15min**) | [lib/briefing.ts:208](../src/lib/briefing.ts) | sonnet-4 | 3000 | 3-5 / jour effectif |
| 8 | Extraction règle depuis correction | [lib/corrections.ts:109](../src/lib/corrections.ts) | sonnet-4 | 500 | 1-3 / semaine |

**Observation 1** : Aucun appel n'utilise `cache_control` (prompt caching Anthropic). Les blocs stables (contexte mission, règles apprises, schémas JSON) sont refacturés plein tarif à chaque appel.

**Observation 2** : Seul le briefing a un cache applicatif (TTL 15 min). Les 7 autres n'ont aucune couche cache.

---

## 2. Taille estimée des prompts (recalibration — le plus lourd)

Décomposition de `buildRecalibrationPrompt` ([prompts.ts:205](../src/lib/prompts.ts)), mesure approximative caractères → tokens ÷4 :

| Bloc | Caractères | Tokens (~) | Stable ? | RAG-able ? |
|---|---|---|---|---|
| Règles apprises (max 5) | 750 | 190 | **Oui** (ttl court) | Non |
| Contexte mission (`missions.context`) | 500-1000 | 125-250 | **Oui** | Non |
| Consignes + schéma JSON | 2000 | 500 | **Oui** (fixe) | Non |
| Intro + semaine courante | 200 | 50 | Non (fresh) | Non |
| Scope instructions | 300 | 75 | Non | Non |
| RAG context (8 chunks max) | jusqu'à 16000 | 4000 | Non | déjà RAG |
| État semaines (weekSummaries) | 2100 | 525 | Non (fresh) | Non |
| Risques actifs | 500 | 125 | Non | Non |
| Décisions actives (40 max) | 4000 | 1000 | Non | **Oui** (candidat) |
| **Documents index (40 snippets × 250c)** | **10000** | **2500** | **Non (instable)** | **Oui — déjà RAG-able** |
| Événements (15) | 1200 | 300 | Non | Non |
| CHANGEMENTS RÉCENTS (chantier 1) | 500-2000 | 125-500 | Non (fresh) | Non |
| **Total input estimé** | **~38000** | **~9500** | | |

Output max : 4000 tokens.

**Le bloc "DOCUMENTS DE LA MISSION"** à lui seul représente **~26% de l'input**. Son but ([recalibration.ts:502-521](../src/lib/recalibration.ts)) : "le LLM voit qu'un doc existe même si le RAG filtre son chunk". **Mais** le `CONTEXTE DOCUMENTAIRE PERTINENT (RAG)` retourne déjà 8 chunks pertinents avec le titre du doc en préfixe ([rag.ts:130](../src/lib/rag.ts)). Le doublon coûte cher.

---

## 3. Architecture cible par type de donnée

| Type de donnée | Aujourd'hui | Cible |
|---|---|---|
| Contexte mission (`missions.context`) | Injecté en full, tous les prompts | **Prompt système caché** (`cache_control: ephemeral`) |
| Règles apprises (corrections) | Injectées en full | **Prompt système caché** |
| Schéma JSON de sortie (consignes) | En fin de prompt utilisateur | **Prompt système caché** (c'est stable par call site) |
| Décisions actives | 40 × 100c en plein dans le prompt | **RAG-indexées** : chaque décision → chunk. Sur 5-10 par recalib. Les "DÉCISIONS RÉCEMMENT ACTÉES" restent en plein (c'est du signal fort) |
| Documents de la mission (index exhaustif) | 40 snippets × 250c en plein | **SUPPRIMÉ** — remplacé par RAG seul (déjà branché). Le LLM n'a pas besoin de connaître l'existence d'un doc dont aucun chunk n'est pertinent. |
| Notes de réunion historiques, CR anciens | Indirectement via RAG | Inchangé — RAG fait déjà le travail |
| Métadonnées projet stables (contacts, scope) | Dans `missions.context` | **Prompt système caché** (cf. plus haut) |
| État courant (tâches, statuts, plan) | Prompt utilisateur, frais | **Inchangé** — doivent rester frais |
| Changements récents (chantier 1) | Prompt utilisateur, frais | **Inchangé** — signal fort à garder en clair |
| Événements (15 derniers) | Prompt utilisateur | **Inchangé** (c'est peu) |

---

## 4. Gains estimés

### Gain A — Suppression du bloc `DOCUMENTS DE LA MISSION` (recalib uniquement)

- **Avant** : 2500 tokens input / recalib × 3$/M = 0.0075$ / recalib
- **Après** : 0 token (RAG seul)
- **Gain** : ~25% de l'input de recalib
- **Risque** : LLM pourrait rater un doc non-pertinent au RAG mais sémantiquement utile. Mitigation : baisser le seuil RAG de 0.70 → 0.65 pour recalibration, augmenter limit de 8 → 12.

### Gain B — Prompt caching Anthropic sur blocs stables

Blocs cachables par call site (estimation conservative) :
- Recalib : règles (190) + contexte mission (200) + schéma/consignes (500) = **~890 tokens stables**
- Parse-upload : ~700 tokens stables
- Generate-tasks : ~600 tokens stables
- Autres : 400-500 tokens stables chacun

Coût Sonnet : 3$/M input, cache write 3.75$/M (+25%), cache read 0.3$/M (-90%).

Sur une mission active ~40 appels/semaine :
- **Avant** (sans cache) : 40 × 700 tokens stables × 3$/M = 0.084$/semaine
- **Après** (avec cache, hit 80%) : 8 writes × 700 × 3.75/M + 32 reads × 700 × 0.3/M = 0.028$/semaine
- **Gain** : ~65% sur la partie stable, soit **~15-20% sur le total LLM**

### Gain C — RAG-iser les décisions anciennes

Aujourd'hui les 40 décisions actives tapent en plein (~1000 tokens). Garder uniquement les décisions récentes (< 14 jours ou < N=10) en plein, basculer les autres sur le RAG dédié. Gain : ~600 tokens / recalib ≈ 6% input.

### Total estimé

| Action | Gain input tokens (recalib) | Gain coût/mois (100 appels LLM) |
|---|---|---|
| A — Suppression doc index | -2500 tk (-25%) | -0.75$ |
| B — Prompt caching (tous call sites) | -500 tk effectifs par appel | -1.50$ |
| C — RAG-iser décisions anciennes | -600 tk (-6%) | -0.20$ |
| **Total** | **-35-40% input sur recalib** | **-2.5$/mois** |

Absolu modeste (le CLAUDE.md table "5-10$ sur la mission" pour Claude texte), mais ratio significatif. Et surtout : **scalable** — le gain croît linéairement avec le volume de missions.

---

## 5. Plan d'action proposé (ordre décroissant d'impact/effort)

| Priorité | Action | Effort | Effet |
|---|---|---|---|
| **1** | Supprimer `DOCUMENTS DE LA MISSION` du prompt recalib | 15 min (5 lignes à retirer) | -25% input recalib, zéro risque |
| 2 | Activer `cache_control: ephemeral` sur blocs stables — refactor `buildMissionBlock` + `buildRulesBlock` pour les sortir en **prompt système** plutôt qu'utilisateur | ~2h (modifier `callLLMWithUsage` pour accepter un `system` avec cache, adapter les 5 `buildXxxPrompt`) | -15% coût global, 0 changement UX |
| 3 | Baisser seuil RAG recalib 0.70 → 0.65, limit 8 → 12 | 5 min | Compense la perte du bloc documents (action 1) |
| 4 | RAG-iser les décisions > 14 jours | ~1h (nouvelle query + filtre dans `performRecalibration`) | -6% input, secondary |
| 5 | Cache applicatif type briefing sur generate-tasks (invalider sur update de la semaine) | ~2h | -30% appels generate-tasks |

---

## 6. Points bizarres repérés en cours d'audit (hors scope, je signale)

- [vision.ts:30](../src/lib/vision.ts) : `getMissionContext()` appelé **sans paramètre** → utilise `DEFAULT_MISSION_SLUG` en fallback. En multi-mission, les extractions Vision voient systématiquement le contexte d'Agirc-Arrco, pas de la mission active. Bug silencieux.
- [vision.ts:31](../src/lib/vision.ts) : re-implémente le bloc `=== CONTEXTE MISSION ===` au lieu d'utiliser `buildMissionBlock()`. Doublon de format, à factoriser.
- [llm.ts:28](../src/lib/llm.ts) : `callLLM` est un wrapper rétrocompat sur `callLLMWithUsage` qui jette l'info `usage`. Si plus personne ne l'utilise que `corrections.ts`, on pourrait le retirer et forcer le logging partout.
