# CLAUDE.md — Extension Apprentissage continu

> Addendum au CLAUDE.md existant. Cette extension ajoute un système d'apprentissage par correction : chaque fois que l'utilisateur corrige une génération LLM, l'app apprend et applique la règle aux générations futures.

---

## Principe

Chaque génération LLM (ODJ, tâches, CR parsé, recalibration, extraction vision) est **traçable** et **corrigeable**. Quand l'utilisateur corrige une sortie, l'app :

1. Capture le diff entre la sortie brute et la version corrigée
2. Demande au LLM d'extraire une règle généralisable
3. Indexe la règle dans un store vectoriel dédié
4. Injecte automatiquement les règles pertinentes dans les prompts futurs du même type

Le système est **automatique et transparent** : l'utilisateur clique "J'ai corrigé", tout le reste se fait en arrière-plan.

---

## Types de générations trackées

Toutes les générations LLM sont trackées avec un `generation_type` :

- `"odj"` — ordres du jour de réunions
- `"tasks"` — génération de tâches par semaine
- `"parse_cr"` — parsing d'un compte-rendu en décisions/actions/risques
- `"recalib"` — recalibration du plan
- `"vision"` — extraction depuis photo

Chaque type a son propre corpus de règles apprises.

---

## Architecture fichiers additionnels

```
src/
├── app/
│   ├── api/
│   │   ├── generations/
│   │   │   ├── route.ts              ← GET liste des générations trackées
│   │   │   └── [id]/route.ts         ← GET une génération spécifique
│   │   └── corrections/
│   │       ├── route.ts              ← POST nouvelle correction
│   │       ├── [id]/route.ts         ← GET/DELETE correction
│   │       └── stats/route.ts        ← GET statistiques (compteur header)
│   └── admin/
│       └── regles/page.tsx           ← page de consultation des règles apprises
├── components/
│   └── corrections/
│       ├── CorrectionButton.tsx      ← bouton "✎ J'ai corrigé"
│       ├── CorrectionModal.tsx       ← modale édition côte-à-côte
│       ├── RulesCounter.tsx          ← compteur dans le header
│       └── RuleCard.tsx              ← affichage d'une règle
├── lib/
│   ├── corrections.ts                ← logique extraction règle + indexation
│   └── rules.ts                      ← récupération règles pour prompts
└── store/
    └── corrections.ts                ← slice Zustand corrections
```

---

## Schéma de données additionnel

```sql
-- Table des générations LLM trackées
CREATE TABLE generations (
  id TEXT PRIMARY KEY,
  generation_type TEXT NOT NULL,       -- 'odj' | 'tasks' | 'parse_cr' | 'recalib' | 'vision'
  context TEXT NOT NULL,               -- JSON: contexte (weekId, type réunion, etc.)
  prompt TEXT NOT NULL,                -- prompt complet envoyé au LLM
  raw_output TEXT NOT NULL,            -- sortie brute du LLM (JSON ou texte)
  applied_rules TEXT,                  -- JSON array des rule_ids appliquées à cette génération
  week_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Table des corrections (lien generation → version corrigée)
CREATE TABLE corrections (
  id TEXT PRIMARY KEY,
  generation_id TEXT NOT NULL REFERENCES generations(id),
  corrected_output TEXT NOT NULL,      -- version corrigée par l'utilisateur
  diff_summary TEXT NOT NULL,          -- résumé Claude du diff
  rule_learned TEXT NOT NULL,          -- règle extraite
  rule_embedding F32_BLOB(1024),       -- embedding voyage-3 de la règle
  generation_type TEXT NOT NULL,       -- dénormalisé pour filtrage rapide
  applied_count INTEGER DEFAULT 0,     -- combien de fois la règle a été réutilisée
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'superseded' | 'archived'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index
CREATE INDEX idx_generations_type ON generations(generation_type);
CREATE INDEX idx_generations_week ON generations(week_id);
CREATE INDEX idx_corrections_gen_id ON corrections(generation_id);
CREATE INDEX idx_corrections_type ON corrections(generation_type, status);
CREATE INDEX rules_embedding_idx ON corrections(libsql_vector_idx(rule_embedding));
```

---

## Types additionnels

```typescript
export type GenerationType = "odj" | "tasks" | "parse_cr" | "recalib" | "vision";
export type CorrectionStatus = "active" | "superseded" | "archived";

export interface Generation {
  id: string;
  generationType: GenerationType;
  context: Record<string, any>;
  prompt: string;
  rawOutput: string;
  appliedRules: string[];        // IDs des règles appliquées
  weekId: number | null;
  createdAt: string;
}

export interface Correction {
  id: string;
  generationId: string;
  correctedOutput: string;
  diffSummary: string;
  ruleLearned: string;
  generationType: GenerationType;
  appliedCount: number;
  status: CorrectionStatus;
  createdAt: string;
}

export interface Rule {
  id: string;                    // = correction.id
  type: GenerationType;
  text: string;                  // rule_learned
  appliedCount: number;
  createdAt: string;
}
```

---

## Flow complet (exemple ODJ)

### 1. Génération initiale

L'utilisateur clique "Générer ODJ" pour la réunion de lancement S1.

```typescript
// /api/llm/generate-odj/route.ts
const rules = await getRelevantRules("odj", { weekId: 1, meetingType: "lancement" });
const ragContext = await getRelevantContext("ODJ lancement S1", 1);

const prompt = buildOdjPrompt({ weekId: 1, meetingType: "lancement", rules, ragContext });
const rawOutput = await callLLM(prompt, 2000);

// Tracker la génération
const generationId = await db.execute({
  sql: `INSERT INTO generations (id, generation_type, context, prompt, raw_output, applied_rules, week_id)
        VALUES (?, 'odj', ?, ?, ?, ?, ?)`,
  args: [genId, JSON.stringify({ meetingType: "lancement" }), prompt, rawOutput, JSON.stringify(rules.map(r => r.id)), 1]
});

// Incrémenter applied_count des règles utilisées
for (const rule of rules) {
  await db.execute({
    sql: `UPDATE corrections SET applied_count = applied_count + 1 WHERE id = ?`,
    args: [rule.id]
  });
}

return Response.json({ generationId, output: rawOutput });
```

### 2. Correction utilisateur

L'utilisateur voit l'ODJ, clique **"✎ J'ai corrigé"**, une modale s'ouvre avec :
- **Gauche** : la génération brute (lecture seule, scrollable)
- **Droite** : textarea pré-rempli avec la génération, éditable

L'utilisateur modifie (par exemple retire "Tour de table" et ajoute "Point budget"), clique **"Enregistrer la correction"**.

### 3. Extraction de la règle

```typescript
// /api/corrections/route.ts
const { generationId, correctedOutput } = await req.json();
const generation = await getGeneration(generationId);

const analysisPrompt = `Tu analyses la correction d'une génération LLM pour en extraire une règle réutilisable.

CONTEXTE : ${generation.generation_type} (${JSON.stringify(generation.context)})

VERSION GÉNÉRÉE PAR LE LLM :
---
${generation.raw_output}
---

VERSION CORRIGÉE PAR L'UTILISATEUR :
---
${correctedOutput}
---

Produis une analyse en 2 parties :
1. Un résumé court et factuel du diff (ce qui a été ajouté, retiré, reformulé)
2. Une règle généralisable, applicable aux futures générations du même type

La règle doit être :
- Concrète et actionnable ("Toujours inclure X", "Ne jamais utiliser Y")
- Généralisable (pas spécifique à ce contexte précis)
- Courte (1-2 phrases max)

Réponds UNIQUEMENT en JSON sans backticks :
{
  "diff_summary": "...",
  "rule_learned": "..."
}`;

const analysis = await callLLM(analysisPrompt, 500);
const { diff_summary, rule_learned } = JSON.parse(analysis);

// Embed la règle
const [embedding] = await embed([rule_learned], "document");

// Sauvegarder
await db.execute({
  sql: `INSERT INTO corrections (id, generation_id, corrected_output, diff_summary, rule_learned, rule_embedding, generation_type)
        VALUES (?, ?, ?, ?, ?, vector32(?), ?)`,
  args: [corrId, generationId, correctedOutput, diff_summary, rule_learned, JSON.stringify(embedding), generation.generation_type]
});

return Response.json({ success: true, rule: rule_learned });
```

### 4. Application future

À la prochaine génération d'ODJ (même type, même contexte), les règles pertinentes sont injectées dans le prompt :

```typescript
// lib/rules.ts
export async function getRelevantRules(
  generationType: GenerationType,
  context: Record<string, any>,
  limit = 5
): Promise<Rule[]> {
  // Construire une query textuelle depuis le contexte
  const query = `${generationType} ${Object.entries(context).map(([k, v]) => `${k}:${v}`).join(" ")}`;
  const [queryEmbedding] = await embed([query], "query");

  const results = await db.execute({
    sql: `
      SELECT id, rule_learned, generation_type, applied_count,
             vector_distance_cos(rule_embedding, vector32(?)) as distance
      FROM corrections
      WHERE generation_type = ? AND status = 'active'
      ORDER BY distance ASC
      LIMIT ?
    `,
    args: [JSON.stringify(queryEmbedding), generationType, limit]
  });

  // Filtre par similarité minimum
  return results.rows
    .filter(r => (1 - r.distance) > 0.65)
    .map(r => ({
      id: r.id,
      type: r.generation_type,
      text: r.rule_learned,
      appliedCount: r.applied_count,
      createdAt: "",
    }));
}
```

### 5. Injection dans les prompts

Les fonctions de construction de prompts (`buildOdjPrompt`, `buildGenerateTasksPrompt`, `buildParseUploadPrompt`, `buildRecalibrationPrompt`, `buildVisionExtractionPrompt`) acceptent un paramètre `rules: Rule[]` et l'injectent en tête :

```typescript
export function buildOdjPrompt(params: { weekId, meetingType, rules, ragContext }): string {
  const rulesBlock = params.rules.length > 0 ? `
=== RÈGLES APPRISES (corrections précédentes) ===
${params.rules.map(r => `- ${r.text} (appliquée ${r.appliedCount}x)`).join("\n")}
=== FIN RÈGLES ===

Tu dois appliquer ces règles systématiquement dans ta génération.

` : "";

  return `${rulesBlock}${params.ragContext}

Tu es un chef de projet BI senior...

[reste du prompt]`;
}
```

---

## Composants UI

### `CorrectionButton.tsx`

Bouton discret visible sur chaque sortie LLM taggée avec un `generationId`.

```tsx
export function CorrectionButton({ generationId, rawOutput, onCorrected }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink px-2 py-1 border border-border rounded"
      >
        ✎ J'ai corrigé
      </button>
      {open && (
        <CorrectionModal
          generationId={generationId}
          rawOutput={rawOutput}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); onCorrected?.(); }}
        />
      )}
    </>
  );
}
```

### `CorrectionModal.tsx`

Modale fullscreen mobile, centrée desktop, 2 colonnes sur desktop, stack sur mobile.

```tsx
<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-0 md:p-6">
  <div className="bg-paper w-full h-full md:h-auto md:max-h-[90vh] md:max-w-5xl md:rounded-md flex flex-col">
    {/* Header */}
    <div className="bg-ink text-paper px-4 py-3 flex items-center justify-between">
      <span className="font-mono text-xs uppercase tracking-wider">Corriger la génération</span>
      <button onClick={onClose}>×</button>
    </div>

    {/* Body - 2 colonnes desktop, stack mobile */}
    <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 p-4">
      {/* Gauche : original */}
      <div>
        <label className="font-mono text-[10px] uppercase text-muted mb-2 block">Version générée</label>
        <pre className="bg-white border border-border rounded p-3 text-xs whitespace-pre-wrap font-sans">
          {rawOutput}
        </pre>
      </div>
      {/* Droite : correction */}
      <div>
        <label className="font-mono text-[10px] uppercase text-muted mb-2 block">Ta correction</label>
        <textarea
          value={corrected}
          onChange={(e) => setCorrected(e.target.value)}
          className="w-full min-h-[400px] bg-white border border-border rounded p-3 text-xs font-sans"
        />
      </div>
    </div>

    {/* Footer */}
    <div className="border-t border-border p-4 flex justify-end gap-2">
      <button onClick={onClose} className="font-mono text-xs uppercase px-4 py-2 border border-border rounded">
        Annuler
      </button>
      <button onClick={save} disabled={saving} className="font-mono text-xs uppercase px-4 py-2 bg-ink text-green rounded">
        {saving ? "Analyse..." : "Enregistrer la correction"}
      </button>
    </div>
  </div>
</div>
```

### `RulesCounter.tsx`

Affiché dans le header admin (desktop) ou dans le drawer (mobile).

```tsx
export function RulesCounter() {
  const { total, applications } = useRulesStats();
  return (
    <a href="/admin/regles" className="font-mono text-[10px] uppercase tracking-wider text-paper/60 hover:text-green">
      {total} règles · {applications} appl.
    </a>
  );
}
```

Clic → page `/admin/regles`.

### `/admin/regles` — Page de consultation

- Liste des règles groupées par `generation_type`
- Chaque règle affiche : texte, compteur d'applications, date de création, bouton "Archiver"
- Recherche textuelle dans les règles
- Filtre par type

---

## Intégration dans les vues existantes

Toutes les générations LLM existantes doivent retourner leur `generationId` au frontend :

### Backlog — génération de tâches

Après la génération, affichage inline d'un petit `CorrectionButton` à côté du bouton "Générer tâches". L'output brut des tâches (JSON) est corrigeable.

**Spécificité tâches** : le format corrigé est aussi du JSON. Le LLM d'analyse comprend le format structuré.

### Backlog — upload CR

Après parsing, modale avec les 4 listes extraites (décisions, actions, risques, opportunités). Bouton "✎ J'ai corrigé" permet de modifier ces listes avant l'intégration finale.

### Backlog — recalibration

Après recalibration, une modale de preview affiche le plan régénéré avec un `CorrectionButton` global. L'utilisateur peut modifier le plan avant de le valider.

### Capture — extraction Vision

Déjà une preview (`ExtractionResult.tsx`). Ajouter un `CorrectionButton` sur cette preview.

### ODJ (nouveau flow — à construire)

Nouvelle page `/admin/odj` avec :
- Formulaire : semaine, type réunion (lancement, atelier, démo, copil, clôture), participants
- Bouton "Générer ODJ"
- Preview avec `CorrectionButton`

---

## Variables d'environnement additionnelles

Aucune nouvelle variable. Le système réutilise `ANTHROPIC_API_KEY` et `VOYAGE_API_KEY`.

---

## Ordre de build (extension apprentissage)

1. **Schema DB** : ajouter tables `generations` et `corrections` + index vectoriel
2. **Types** : ajouter `Generation`, `Correction`, `Rule`, `GenerationType`
3. **lib/corrections.ts** : extraction règle + indexation
4. **lib/rules.ts** : `getRelevantRules()` pour récupération
5. **Modifier lib/prompts.ts** : les 5 fonctions de prompt acceptent `rules: Rule[]` et injectent le bloc en tête
6. **Modifier routes LLM existantes** : tracker les générations dans `generations`, appliquer les règles
7. **API routes** : `/api/corrections/*`, `/api/generations/*`
8. **Store** : slice `corrections.ts`
9. **Composants** : `CorrectionButton`, `CorrectionModal`, `RulesCounter`, `RuleCard`
10. **Intégration UI** : bouton dans backlog (tâches, CR, recalib), capture vision
11. **Page** : `/admin/regles` consultation
12. **Header** : ajouter `RulesCounter`
13. **Tests** : générer → corriger → regénérer et vérifier que la règle est appliquée

---

## Points d'attention

### Performance

- Les requêtes vectorielles sur `corrections` sont scopées par `generation_type` — indexer dessus est critique
- Limiter à 5 règles max par prompt (au-delà, le prompt devient trop long et dilue les règles)
- Seuil de similarité à 0.65 — en dessous, les règles deviennent hors-sujet

### Qualité des règles

- Si une règle est contredite par une correction ultérieure, la marquer `status='superseded'`
- Nettoyage périodique manuel possible via `/admin/regles` (bouton archiver)
- Pas de dédoublonnage automatique en v1 — on verra si nécessaire

### Coûts

- Chaque correction = 1 appel LLM d'analyse (~0.02 $) + 1 embedding (négligeable)
- Budget : sur 7 semaines × 5 corrections/semaine = 35 corrections × 0.02 $ = 0.70 $

### UX

- Le bouton "J'ai corrigé" doit être discret mais toujours visible
- Confirmation après enregistrement : toast "Règle apprise — sera appliquée aux prochaines générations"
- Le compteur `RulesCounter` doit être motivant : voir le système devenir plus précis

---

## Ce qu'il ne faut PAS faire

- Appliquer toutes les règles d'un type à chaque génération (filtrer par similarité)
- Laisser les règles s'accumuler sans jamais les archiver
- Écrire manuellement les règles (le LLM les extrait automatiquement)
- Injecter plus de 5 règles dans un prompt
- Oublier d'incrémenter `applied_count` quand une règle est utilisée
- Utiliser les règles d'un type pour un autre type (les corpus sont étanches)

---

## Pour les évolutions futures

Si le système d'apprentissage devient central, envisager :
- **Méta-synthèse** : job hebdomadaire qui consolide les règles similaires
- **Feedback négatif** : bouton "Cette règle ne s'applique pas ici" pour raffiner
- **Export des règles** : extraction des patterns en markdown pour analyse manuelle
- **A/B testing** : générer avec et sans règles pour mesurer l'impact
