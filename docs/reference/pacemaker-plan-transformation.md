# Plan de transformation Pacemaker

**Date** : 17 avril 2026
**Version** : v0.1.1 (patch de cohérence)
**Destinataire** : Claude Code (exécutant) + Paul (pilote)
**Références** :
- Manifeste Pacemaker v0.2 (`pacemaker-manifeste-v02.md`)
- Product map actuel (`PRODUCT_MAP.md` daté 17/04/2026)
- Spec WhatsApp v0.1 (`pacemaker-whatsapp-agent-spec.md`)
- Repo : `/Users/paulduchateau/projects/liteops/pacemaker`

**Changelog v0.1.1** :
- Chantier 1 : suppression de la table `project` retirée (déplacée en chantier de nettoyage ultérieur, respect règle "migrations additives"). Ajout étape 0 de vérification git et de la stratégie slug + redirection.
- Chantier 2 : ajout de la colonne `rationale_source` pour distinguer décisions legacy (rationale absent) des décisions nativement argumentées.
- Chantier 3 : schéma `incoherences` aligné avec la spec WhatsApp (champs communs : `kind`, `source_message_id`, `resolution_status`). Critère de rappel harmonisé à 70 % (cohérent avec le prompt d'amorçage).
- Chantier 4 : note explicite que `recalibrations` sera réconciliée avec `agent_actions` au chantier 7.
- Chantier 7 : étape préliminaire obligatoire = proposer un modèle unifié `agent_actions` ↔ `decisions` ↔ `recalibrations` ↔ `incoherences` avant d'ouvrir le moindre code.

---

## Préambule — Comment utiliser ce plan

Ce document décrit **huit chantiers** qui, ensemble, transforment Pacemaker de sa version actuelle (copilote mono-mission 7 semaines) vers la vision du manifeste (copilote multi-mission qui libère 2/3 du temps consultant). Les chantiers sont ordonnés par **dépendances techniques** (ce qui doit être fait avant le reste), pas par priorité métier.

**Pour chaque chantier** :
- *Principe(s) du manifeste servi(s)* : lien explicite avec le manifeste
- *État actuel* : ce qui existe déjà
- *État cible* : ce qu'on veut obtenir
- *Changements de schéma* : DDL à appliquer
- *Fichiers impactés* : existants à modifier et nouveaux à créer
- *Étapes dans l'ordre* : séquence à exécuter
- *Critères de validation* : comment on sait que c'est fini

**Règles de fonctionnement avec Claude Code** :

1. **Un chantier à la fois**. Ne pas lancer le chantier N+1 avant que N soit validé par Paul.
2. **Branches dédiées**. Un chantier = une branche Git (`feat/chantier-01-mission-entity` par exemple), merge après validation.
3. **Migrations de DB non destructives**. Toujours additive, jamais destructive dans le même PR. Les colonnes obsolètes sont déprécées puis supprimées dans un chantier de nettoyage ultérieur.
4. **Tests au moins sur les chemins critiques**. Pas de test unitaire exhaustif (Pacemaker n'en a pas aujourd'hui), mais un test end-to-end manuel documenté par chantier.
5. **Un seul `CLAUDE.md` maintenu à jour**. À chaque chantier, mise à jour des sections concernées.
6. **Pas de refactor opportuniste**. Si un chantier est petit, il reste petit. Les envies de nettoyage vont dans un backlog dédié.

**Coût estimatif total** : environ 6–10 semaines de travail effectif avec Claude Code, selon la disponibilité de Paul pour valider. Certains chantiers sont parallélisables (indiqués).

---

## Table des chantiers

| # | Nom | Principe(s) | Effort | Dépend de |
|---|-----|-------------|--------|-----------|
| 1 | Entité Mission multi-tenant | P7 | Grand | — |
| 2 | Enrichissement du modèle de décision | P2, P6 | Moyen | 1 |
| 3 | Détection d'incohérences | P4 | Moyen | 2 |
| 4 | Réévaluation automatique sur input | P3 | Moyen | 2, 3 |
| 5 | Briefing adaptatif | P5 | Moyen | 1, 4 |
| 6 | Confiance et argumentation visibles | P6 | Petit | 2 |
| 7 | Canal vocal + WhatsApp | P1 | Grand | 1, 3, 4 |
| 8 | Indicateurs de temps libéré | P7 | Petit | tout le reste |

Les chantiers 2 et 3 peuvent être attaqués en parallèle si deux sessions Claude Code sont ouvertes, à condition de gérer les conflits de schéma.

---

# Chantier 1 — Entité Mission multi-tenant

**Principe manifeste servi** : P7 (temps libéré comme unité de mesure — nécessite de pouvoir gérer plusieurs missions).

**Pourquoi en premier** : aujourd'hui Pacemaker est structurellement mono-mission (seed `config/mission.ts`, `week_id` 1–7 figé, pas de notion de `mission_id` dans les tables). Tout chantier qui ajoute de la logique sur une "mission" sans cette refonte amplifie la dette technique. C'est la migration la plus lourde, elle doit se faire tôt.

## État actuel

- Une table `project` en k/v avec `mission_start_date`, `jh_consommes`, `currentWeek`, `mission_context`, `livrable_theme`.
- Toutes les tables (`weeks`, `tasks`, `risks`, `livrables`, `events`, `documents`, `doc_chunks`, `generations`, `corrections`, `schedule_changes`, `task_attachments`) sont implicitement scopées à cette unique mission.
- L'UI (`/admin`, `/client`) n'a pas de sélecteur de mission.
- `src/config/mission.ts` contient le seed des 7 semaines hardcodé.

## État cible

- Une table `missions` avec `id`, `slug`, `label`, `client`, `start_date`, `end_date`, `status` (active|archivée|en pause), `theme`, `context`, `owner_user_id`, `created_at`.
- Toutes les tables scope-dépendantes portent un `mission_id FOREIGN KEY`.
- L'UI permet de sélectionner, créer, archiver une mission. Le nombre de semaines n'est plus figé (une mission est définie par des dates de début/fin + une cadence hebdo, pas par un `week_id` 1–7).
- Un utilisateur (Paul, au MVP) peut avoir plusieurs missions actives en parallèle.
- Les URL sont scoped : `/admin/missions/[slug]/...` et `/client/[slug]/...`.

## Changements de schéma

```sql
-- Nouvelle table missions
CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  client TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived')),
  theme TEXT NOT NULL DEFAULT 'liteops',
  context TEXT,
  owner_user_id TEXT NOT NULL DEFAULT 'paul',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_missions_status ON missions(status, owner_user_id);

-- Ajout de mission_id sur toutes les tables scopées
ALTER TABLE weeks ADD COLUMN mission_id TEXT REFERENCES missions(id);
ALTER TABLE tasks ADD COLUMN mission_id TEXT REFERENCES missions(id);
ALTER TABLE risks ADD COLUMN mission_id TEXT REFERENCES missions(id);
ALTER TABLE livrables ADD COLUMN mission_id TEXT REFERENCES missions(id);
ALTER TABLE events ADD COLUMN mission_id TEXT REFERENCES missions(id);
ALTER TABLE documents ADD COLUMN mission_id TEXT REFERENCES missions(id);
ALTER TABLE generations ADD COLUMN mission_id TEXT REFERENCES missions(id);
ALTER TABLE corrections ADD COLUMN mission_id TEXT REFERENCES missions(id);
ALTER TABLE schedule_changes ADD COLUMN mission_id TEXT REFERENCES missions(id);

-- Migration des données existantes
-- (Un script de migration créera une mission 'agirc-arrco-2026' et y rattachera toutes les données existantes)

-- Indexes composites pour les requêtes fréquentes
CREATE INDEX idx_tasks_mission ON tasks(mission_id, week_id);
CREATE INDEX idx_events_mission ON events(mission_id, date);
CREATE INDEX idx_documents_mission ON documents(mission_id);
```

**Note importante** : la notion de `week_id` reste, mais devient une clé locale à une mission (semaine 1 de la mission X ≠ semaine 1 de la mission Y). Un champ `week_number` est ajouté pour clarifier. La contrainte `week_id IN (1..7)` doit être assouplie ; remplacée par un calcul dynamique basé sur start_date + cadence.

## Fichiers impactés

### Existants à modifier

- `schema.sql` — ajout des DDL ci-dessus.
- `src/lib/db.ts` — helpers `getCurrentMission()`, `listMissions()`, `requireMission(slug)`.
- `src/store/*.ts` — tous les slices prennent un `missionId` en paramètre. Refactor Zustand vers un slice `mission` qui détient le contexte actif.
- `src/app/admin/**/*.tsx` — toutes les routes admin passent sous `/admin/missions/[slug]/...`. La page `/admin` devient la liste des missions.
- `src/app/client/page.tsx` — devient `/client/[slug]/page.tsx`.
- `src/app/api/data/**/*.ts` — toutes les API filtrent par `mission_id`.
- `src/app/api/llm/**/*.ts` — contexte de prompt inclut le `mission_id`. Le `getMissionContext` (dans `lib/mission-context.ts`) charge le contexte de la bonne mission.
- `src/config/mission.ts` — devient `src/config/mission-seed.ts` (template de mission, pas de seed unique).
- `src/lib/mission-context.ts` — `getMissionContext(missionId)` avec signature mise à jour.
- `src/components/nav/TopBar.tsx`, `BottomBar.tsx` — ajout sélecteur de mission (dropdown ou pill switcher).

### Nouveaux fichiers

- `src/app/admin/missions/page.tsx` — liste des missions (cards avec statut, avancement, next deadline).
- `src/app/admin/missions/new/page.tsx` — formulaire création mission.
- `src/app/api/missions/route.ts` — GET list, POST create.
- `src/app/api/missions/[slug]/route.ts` — GET detail, PATCH update, DELETE archive.
- `src/lib/mission.ts` — helpers de résolution de mission (slug → id, validation, check ownership).
- `src/components/mission/MissionCard.tsx`, `MissionSwitcher.tsx`, `CreateMissionForm.tsx`.
- `scripts/migrate-to-multi-mission.ts` — script one-shot qui crée la mission initiale et rattache les données existantes.

## Étapes dans l'ordre

0. **Préflight git et DB**. Vérifier que `pacemaker/` est bien un repo git avec remote configurée et working tree propre. Si le repo n'est pas initialisé ou si l'historique n'est pas poussé, c'est la première chose à corriger avant tout. Faire un `turso db dump` de la DB de production et le stocker en local + cloud avant toute migration.
1. **Créer la table `missions`** et le script de migration. Tester en local avec une copie de la DB Turso.
2. **Ajouter la colonne `mission_id` sur toutes les tables** (additive, nullable au début). Exécuter le script de migration qui remplit pour les données existantes.
3. **Stratégie slug et redirection**. Le script de migration crée une mission avec `slug='agirc-arrco-2026'` et y rattache toutes les données existantes. Un middleware Next.js redirige `/admin/*` (et `/client/*`) vers `/admin/missions/agirc-arrco-2026/*` pendant toute la durée du chantier. La redirection est retirée une fois que l'UI de sélection de mission est en place et validée.
4. **Créer les helpers `lib/mission.ts`** et refactorer `lib/db.ts` pour exposer le contexte mission.
5. **Refactorer les API `/api/data/*` et `/api/llm/*`** pour filtrer par mission. Conservation temporaire d'un fallback vers la mission par défaut pour ne pas casser l'UI pendant la transition.
6. **Créer les nouvelles pages `/admin/missions/*`** (liste, création).
7. **Renommer les routes existantes sous `/admin/missions/[slug]/...`**.
8. **Mettre à jour l'UI** : TopBar / BottomBar avec switcher de mission, breadcrumb mission.
9. **Refactorer les Zustand stores** pour tenir compte du mission actif.
10. **Rendre `mission_id` NOT NULL** une fois que toutes les données et le code sont migrés.

**Hors scope de ce chantier** : suppression de la table `project` k/v. Les champs pertinents sont déplacés dans `missions` mais `project` est conservée tant qu'elle n'est plus lue nulle part. Sa suppression fera l'objet d'un chantier de nettoyage dédié, une fois que l'on aura confirmé qu'elle n'est plus référencée pendant au moins un cycle de mission complet. Cohérent avec la règle "migrations additives".

## Critères de validation

- Création d'une nouvelle mission via UI fonctionne.
- Switch entre deux missions dans l'UI fonctionne sans rechargement de page.
- Création de tâche sur la mission A n'apparaît pas dans la mission B.
- Recalibration, parse-upload, vision, génération de livrables fonctionnent tous sur chaque mission indépendamment.
- Le script de migration appliqué sur la DB existante ne perd aucune donnée.
- `/client/[slug]` affiche le dashboard de la mission correspondante.

---

# Chantier 2 — Enrichissement du modèle de décision

**Principes manifeste servis** : P2 (chaque décision laisse une trace argumentée), P6 (l'agent argumente).

**Pourquoi maintenant** : aujourd'hui la `Decision` est un simple `Event` de type `decision` avec un `content` textuel. Pour que le principe 2 soit respecté ("son énoncé, sa date, ses motifs explicites, les alternatives envisagées, la personne qui l'a prise"), il faut un modèle enrichi. Les chantiers suivants (détection d'incohérences, argumentation) reposent sur ce modèle.

## État actuel

- Les décisions sont des rangées dans `events` avec `type = 'decision'`, `label` (texte court), `content` (texte libre éventuellement structuré par `parse-upload`).
- Pas de motifs, pas d'alternatives, pas d'auteur, pas de confiance.
- DecisionsTimeline (`src/components/client/DecisionsTimeline.tsx`) filtre les events de ce type et les affiche chronologiquement.
- `parse-upload` extrait des "décisions" depuis un CR mais sans structure riche.

## État cible

- Une table dédiée `decisions` avec structure riche.
- Les événements de type `decision` deviennent des *pointeurs* vers une entrée de `decisions` (rétrocompat via jointure).
- Toute création de décision (manuelle ou par parsing LLM) capture : énoncé, motifs, alternatives envisagées, auteur, confiance (si LLM), statut (proposée | actée | révisée | annulée), liens vers entités impactées (tâches, livrables, risques).
- L'UI d'une décision permet de voir l'historique (révisions) et les éléments de mission qui en dépendent.

## Changements de schéma

```sql
CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  statement TEXT NOT NULL,                  -- énoncé court de la décision
  rationale TEXT,                           -- motifs (markdown, long)
  rationale_source TEXT NOT NULL DEFAULT 'native'
    CHECK(rationale_source IN ('native','legacy_no_rationale','user_added_later','llm_inferred')),
  alternatives TEXT,                        -- JSON array : alternatives envisagées
  author TEXT NOT NULL,                     -- 'paul' | 'paul_b' | 'client' | 'agent'
  confidence REAL,                          -- 0..1 si issue LLM, NULL si humain pur
  status TEXT NOT NULL DEFAULT 'actée' CHECK(status IN ('proposée','actée','révisée','annulée')),
  source_type TEXT NOT NULL,                -- 'manual' | 'parse_cr' | 'vision' | 'agent'
  source_ref TEXT,                          -- ref vers generation_id ou document_id
  revised_from TEXT REFERENCES decisions(id),  -- décision qu'elle remplace
  created_at INTEGER NOT NULL,
  acted_at INTEGER NOT NULL
);

-- Note sur `rationale_source` :
-- 'native'               : décision créée après le chantier 2, rationale rempli à la création
-- 'legacy_no_rationale'  : décision migrée depuis un event historique, rationale non disponible
-- 'user_added_later'     : Paul a complété a posteriori le rationale d'une décision legacy
-- 'llm_inferred'         : rationale déduit par LLM depuis le contexte (à utiliser avec prudence)
-- L'UI DOIT afficher honnêtement l'absence de rationale pour les décisions legacy
-- (principe manifeste P6 : afficher l'incertitude, ne pas simuler une trace qui n'existe pas).

CREATE INDEX idx_decisions_mission ON decisions(mission_id, acted_at);
CREATE INDEX idx_decisions_status ON decisions(mission_id, status);

-- Table de liaison entité impactée ↔ décision
CREATE TABLE decision_links (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id),
  entity_type TEXT NOT NULL CHECK(entity_type IN ('task','risk','livrable','week','document')),
  entity_id TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK(link_type IN ('impacts','derives_from','blocks','supersedes')),
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_decision_links_decision ON decision_links(decision_id);
CREATE INDEX idx_decision_links_entity ON decision_links(entity_type, entity_id);

-- Migration des events existants
-- Un script crée une decision par event type=decision, avec rationale vide
-- et auteur='paul' par défaut (rétrocompat).
```

## Fichiers impactés

### Existants à modifier

- `schema.sql` — ajout DDL.
- `src/types/index.ts` — types `Decision`, `DecisionLink`, `DecisionStatus`, `DecisionAuthor`.
- `src/lib/prompts.ts` — `buildParseUploadPrompt` demande maintenant à Claude d'extraire motifs et alternatives pour chaque décision. `buildGenerateTasksPrompt` peut aussi créer des décisions si une décision émerge du LLM.
- `src/app/api/llm/parse-upload/route.ts` — crée des `decisions` structurées au lieu d'events simples.
- `src/app/api/vision/extract/route.ts` — idem pour les décisions détectées sur photo.
- `src/components/client/DecisionsTimeline.tsx` — consomme la table `decisions` directement, affiche rationale et alternatives.

### Nouveaux fichiers

- `src/app/api/decisions/route.ts` — GET list, POST create manuelle.
- `src/app/api/decisions/[id]/route.ts` — GET detail, PATCH (révision), DELETE (annulation, soft).
- `src/app/api/decisions/[id]/links/route.ts` — gestion des liens entité.
- `src/app/admin/missions/[slug]/decisions/page.tsx` — vue dédiée décisions avec filtres (statut, auteur, date).
- `src/components/decisions/DecisionCard.tsx`, `DecisionDetail.tsx`, `DecisionForm.tsx`, `DecisionRevisionHistory.tsx`.
- `src/lib/decisions.ts` — helpers (créer, lier à entité, réviser, détecter supersession).
- `scripts/migrate-events-to-decisions.ts` — migration des events `type=decision` existants.

## Étapes dans l'ordre

1. Ajouter les tables `decisions` et `decision_links`.
2. Écrire `lib/decisions.ts` (helpers côté serveur, pas d'UI encore).
3. Script de migration des events → decisions avec rationale vide.
4. API `/api/decisions/*` fonctionnelles.
5. Mise à jour de `parse-upload` pour créer décisions structurées (avec motifs et alternatives demandés au LLM).
6. Même traitement pour vision extract.
7. UI : page décisions, modal détail, formulaire création manuelle.
8. Refactor de DecisionsTimeline (client) pour lire `decisions` directement.
9. Ajout du lien cliquable tâche/risque/livrable → décision(s) dont ils dérivent.
10. Tests end-to-end : créer une décision manuelle, la réviser, la lier à une tâche.

## Critères de validation

- Une décision créée manuellement stocke bien motifs et alternatives.
- Un CR parsé produit des décisions avec motifs extraits (ou "non précisé" si le CR ne les contient pas).
- La DecisionsTimeline affiche chaque décision avec son rationale déroulable.
- Depuis une tâche, on peut voir les décisions qui l'ont motivée ; inversement, depuis une décision, on voit les tâches impactées.
- La révision d'une décision (nouvelle version qui supersede l'ancienne) est tracée et consultable.

---

# Chantier 3 — Détection d'incohérences

**Principe manifeste servi** : P4 (le silence n'est jamais permanent sur une incohérence).

**Pourquoi maintenant** : c'est la fonctionnalité la plus distinctive de Pacemaker vs un outil de gestion de projet classique. Elle suppose le modèle de décision enrichi (chantier 2) pour comparer un nouvel input avec les décisions antérieures.

## État actuel

- Aucune détection d'incohérence.
- Le LLM qui parse un CR peut créer une tâche qui contredit une tâche existante sans le signaler.
- Aucune table `incoherences`, aucun mécanisme d'alerte.

## État cible

- Quatre types d'incohérences détectés : `factual` (un fait contredit), `scope_drift` (hors périmètre initial), `constraint_change` (contrainte qui bouge), `hypothesis_invalidated` (hypothèse démentie).
- À chaque input structuré (nouvelle tâche, nouvelle décision, nouveau risque, vision/CR parsé), un passage de détection est effectué en arrière-plan via un appel LLM dédié.
- Les incohérences sont stockées, classées par gravité, résolues automatiquement si possible (auto_resolution), sinon flaggées pour le consultant au prochain briefing.
- Un journal d'incohérences consultable.

## Changements de schéma

```sql
CREATE TABLE incoherences (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  kind TEXT NOT NULL CHECK(kind IN ('factual','scope_drift','constraint_change','hypothesis_invalidated')),
  severity TEXT NOT NULL CHECK(severity IN ('minor','moderate','major')),
  description TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,         -- entité qui a introduit l'incohérence
  source_entity_id TEXT NOT NULL,
  source_message_id TEXT,                   -- référence optionnelle vers wa_messages (chantier 7)
  conflicting_entity_type TEXT NOT NULL,
  conflicting_entity_id TEXT NOT NULL,
  auto_resolution TEXT,                     -- action prise par l'agent (si auto-résolue)
  resolution_status TEXT NOT NULL DEFAULT 'pending' CHECK(resolution_status IN ('pending','auto_resolved','user_acknowledged','user_rejected','ignored')),
  resolved_at INTEGER,
  resolved_by TEXT,                         -- 'agent' | 'paul' | ...
  briefed_to_user_at INTEGER,               -- timestamp où remontée dans un briefing
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_incoherences_mission_pending ON incoherences(mission_id, resolution_status, created_at);
```

**Compatibilité avec la spec WhatsApp** : le schéma ci-dessus remplace celui, plus léger, décrit dans `pacemaker-whatsapp-agent-spec.md` §3. Au moment du chantier 7, la spec WA devra être mise à jour pour s'appuyer sur ce schéma enrichi. Les champs additionnels du chantier 3 (`severity`, `source_entity_*`, `resolution_status` étendu, `briefed_to_user_at`) sont compatibles avec les usages WhatsApp : le webhook fournit `source_message_id` et la sévérité est inférée par le LLM de détection.

## Fichiers impactés

### Existants à modifier

- `schema.sql`.
- `src/lib/prompts.ts` — nouveau `buildIncoherenceDetectionPrompt(mission_state, new_input)`.
- `src/app/api/llm/parse-upload/route.ts`, `src/app/api/vision/extract/route.ts` — après création des entités, déclencher `detectIncoherences` en async (ne pas bloquer le retour utilisateur).
- `src/app/api/llm/generate-tasks/route.ts` — idem, check incohérence entre nouvelles tâches et plan existant.
- `src/components/admin/*` — badge d'incohérence sur les entités concernées.

### Nouveaux fichiers

- `src/lib/incoherences.ts` — `detectIncoherences(missionId, changedEntity)`, `tryAutoResolve(incoherence)`, `markBriefedToUser(ids)`.
- `src/app/api/incoherences/route.ts` — GET list par mission/statut, POST manuelle (cas où Paul flag lui-même).
- `src/app/api/incoherences/[id]/route.ts` — PATCH résolution, acknowledgment.
- `src/app/admin/missions/[slug]/incoherences/page.tsx` — journal dédié.
- `src/components/incoherences/IncoherenceCard.tsx`, `IncoherenceBadge.tsx`, `IncoherenceList.tsx`.

## Étapes dans l'ordre

1. Table `incoherences`.
2. `lib/incoherences.ts` avec `detectIncoherences` qui construit un prompt dédié :
   ```
   Contexte : décisions actées, contraintes, hypothèses courantes de la mission.
   Nouvel input : [l'entité qui vient d'être créée/modifiée].
   Question : ce nouvel input entre-t-il en contradiction avec un élément existant ?
   Si oui, kind (factual|scope_drift|constraint_change|hypothesis_invalidated), severity, description, conflicting_entity, auto_resolution_proposed.
   Format de sortie : JSON strict.
   ```
3. Câblage dans parse-upload et vision extract (async, pas bloquant).
4. API CRUD incohérences.
5. UI journal incohérences.
6. Badge visuel sur tâches/décisions/risques qui ont une incohérence pending.
7. Test end-to-end : modifier une contrainte d'une mission existante → une incohérence doit apparaître dans le journal avec proposition de résolution.

## Critères de validation

- Sur une mission réelle, après 10 inputs de test incluant 3 contradictions volontaires, au moins 2 incohérences sur 3 sont détectées (rappel ≥ 70 %, seuil aligné avec le prompt d'amorçage).
- Les faux positifs (incohérences remontées à tort) sont rares (< 15 % des cas détectés).
- Quand une auto_resolution est appliquée, elle est traçable dans le journal.
- L'incohérence apparaît comme badge dans l'UI sur l'entité source.

---

# Chantier 4 — Réévaluation automatique sur input

**Principe manifeste servi** : P3 (toute nouvelle information déclenche une réévaluation).

**Pourquoi après le chantier 3** : la réévaluation automatique est puissante mais dangereuse si elle n'est pas couplée à la détection d'incohérences. Avant ce chantier, les modifications en cascade seraient silencieuses et non-tracées. Maintenant elles sont couplées au journal d'incohérences et de décisions.

## État actuel

- Recalibration déclenchée *manuellement* par le bouton "⟳ Recalibrer" sur l'UI admin.
- `/api/llm/recalibrate` supprime les tâches non-faites des semaines ≥ currentWeek et reprévoit.
- Aucun déclenchement automatique sur nouvel input.

## État cible

- À chaque ingestion structurée d'input (CR, photo, décision, changement de contrainte), Pacemaker évalue si une réévaluation du plan est nécessaire.
- Heuristique de décision : si l'incohérence détectée est `major` ou de type `constraint_change`, déclencher une réévaluation partielle (recalcul de la chaîne de tâches impactée uniquement, pas du plan entier).
- La réévaluation est exécutée silencieusement (cf. ta directive "auto-recalibrage silencieux + journal").
- Chaque recalibration est tracée dans `agent_actions` (nouvelle table du chantier 7) ou dans `schedule_changes` étendue, avec rationale auto-généré.
- Bouton manuel "⟳ Recalibrer" conservé pour déclenchement ponctuel par Paul.

## Changements de schéma

Minimes. Extension de `schedule_changes` et ajout d'une table `recalibrations` pour tracer les cycles :

```sql
CREATE TABLE recalibrations (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  trigger TEXT NOT NULL CHECK(trigger IN ('manual','auto_on_incoherence','auto_on_input','scheduled')),
  trigger_ref TEXT,                         -- ref vers incoherence_id ou event_id
  scope TEXT NOT NULL CHECK(scope IN ('full_plan','downstream_only','single_week')),
  changes_summary TEXT,                     -- résumé LLM des changements
  tasks_added INTEGER NOT NULL DEFAULT 0,
  tasks_modified INTEGER NOT NULL DEFAULT 0,
  tasks_removed INTEGER NOT NULL DEFAULT 0,
  reasoning TEXT,                           -- argumentaire de l'agent
  reverted_at INTEGER,
  reverted_by TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_recalibrations_mission ON recalibrations(mission_id, created_at);
```

**Note de convergence vers `agent_actions`** : la table `recalibrations` est introduite ici comme trace spécialisée. Au chantier 7 (WhatsApp), la spec prévoit une table `agent_actions` générique qui peut représenter toute action autonome de l'agent (création de tâche, update, recalibration, flag d'incohérence). Plutôt que de dupliquer, le chantier 7 devra proposer soit (a) la fusion de `recalibrations` dans `agent_actions` via un `action_type='recalibrate_plan'`, soit (b) le maintien des deux tables avec un lien `agent_actions.target_entity_id → recalibrations.id` pour les actions de type recalibration. La décision est repoussée au chantier 7 pour que les contraintes WA soient connues au moment du choix.

## Fichiers impactés

### Existants à modifier

- `src/app/api/llm/recalibrate/route.ts` — refactor en `recalibrate(missionId, scope, trigger, triggerRef)`. Expose aussi une version scope=`downstream_only` plus ciblée.
- `src/lib/prompts.ts` — `buildRecalibrationPrompt` supporte le scope.
- `src/app/api/llm/parse-upload/route.ts`, `src/app/api/vision/extract/route.ts` — après détection d'incohérence majeure, déclenchement d'une recalibration async.

### Nouveaux fichiers

- `src/lib/recalibration.ts` — `shouldAutoRecalibrate(incoherence)`, `triggerRecalibration({missionId, scope, trigger, ref})`, `revertRecalibration(id)`.
- `src/app/api/recalibrations/route.ts`, `src/app/api/recalibrations/[id]/route.ts` — consultation et rollback.
- `src/components/admin/RecalibrationHistory.tsx` — visualisation des cycles.

## Étapes dans l'ordre

1. Table `recalibrations`.
2. Refactor de `recalibrate` avec paramètre `scope` (full | downstream | week).
3. Helper `shouldAutoRecalibrate` avec heuristique :
   - `incoherence.severity === 'major'` → true
   - `incoherence.kind === 'constraint_change'` → true
   - `incoherence.kind === 'scope_drift' && severity === 'moderate'` → true
   - sinon → false (flag pour briefing, pas d'action immédiate)
4. Câblage dans parse-upload et vision extract.
5. UI : visualisation des recalibrations dans le journal, bouton "Annuler ce recalibrage" sur chaque entrée.
6. Test : modifier une deadline de livrable → recalibration automatique visible, toutes les tâches en aval réajustées, entrée de journal lisible.

## Critères de validation

- Une `constraint_change` (ex. deadline décalée) déclenche une recalibration `downstream_only` en < 5s.
- Le changement est visible dans le journal de mission avec rationale.
- Le bouton "Annuler" restore l'état antérieur (soft revert).
- La recalibration manuelle existante continue à fonctionner.

---

# Chantier 5 — Briefing adaptatif

**Principe manifeste servi** : P5 (chaque mission se rouvre en 30 secondes).

**Pourquoi maintenant** : dépend du chantier 1 (multi-mission) pour avoir du sens, et des chantiers 2/3/4 pour avoir du contenu riche à synthétiser (décisions, incohérences, recalibrations récentes).

## État actuel

- Aucun briefing automatique à l'ouverture d'une mission.
- Le consultant doit relire le backlog, le journal, les risques pour se remettre à jour.

## État cible

- À l'ouverture d'une mission (route `/admin/missions/[slug]`), un composant `MissionBriefing` est affiché en tête, généré à la demande, adapté au temps disponible.
- Trois niveaux : 30s (3–4 puces), 2min (paragraphe structuré), 10min (synthèse complète avec points d'action priorisés).
- Le briefing répond à : (a) ce qui a bougé depuis ma dernière visite, (b) les décisions qui m'attendent, (c) ce qui est urgent, (d) ce qui est bloqué.
- Cache du briefing : généré à la demande mais caché 15 min (ou invalidé par tout nouvel input).

## Changements de schéma

```sql
CREATE TABLE mission_visits (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  user_id TEXT NOT NULL,
  last_visit_at INTEGER NOT NULL,
  briefing_cache TEXT,                      -- JSON : {30s, 2min, 10min}
  briefing_cache_generated_at INTEGER,
  UNIQUE(mission_id, user_id)
);
```

## Fichiers impactés

### Existants

- Route admin mission : load `last_visit_at`, affichage du briefing, update visit après affichage.

### Nouveaux

- `src/lib/briefing.ts` — `generateBriefing(missionId, userId, level)`, `invalidateBriefingCache(missionId)`.
- `src/lib/prompts.ts` — `buildBriefingPrompt(missionState, changesSinceLastVisit, level)`.
- `src/app/api/briefing/[slug]/route.ts` — GET avec `?level=30s|2min|10min`.
- `src/components/briefing/MissionBriefing.tsx` — affichage avec sélecteur de niveau (3 pills).

## Étapes dans l'ordre

1. Table `mission_visits`, tracking à chaque entrée sur une route mission.
2. `lib/briefing.ts` avec `getChangesSince(missionId, since)` qui compile : décisions récentes, tâches modifiées, incohérences pending, recalibrations, événements.
3. Prompt de briefing avec 3 variantes de longueur cible (adapté au `level`).
4. Cache avec invalidation automatique sur écriture dans les tables de la mission.
5. UI : `MissionBriefing` en tête de `/admin/missions/[slug]`, avec les 3 pills (30s | 2min | 10min) et bouton ↻ rafraîchir.
6. Invalidation automatique du cache sur tout nouvel input via hook dans les API d'écriture.

## Critères de validation

- À l'ouverture d'une mission non-visitée depuis 5 jours, le briefing 30s s'affiche en < 2s (cache first, fetch si absent).
- Le briefing cite effectivement les changements depuis la dernière visite (pas un résumé général).
- Bascule entre 30s et 2min instantanée (même payload en cache).
- Nouvel input dans la mission → à la prochaine ouverture, cache invalidé, nouveau briefing généré.

---

# Chantier 6 — Confiance et argumentation visibles

**Principe manifeste servi** : P6 (l'agent argumente, le consultant tranche).

**Pourquoi ici** : chantier court qui rend visible dans l'UI ce qui est déjà partiellement présent dans le code (Vision expose un champ `confidence`, non exploité ; parse-upload n'expose ni confiance ni alternatives).

## État actuel

- `Vision` renvoie `confidence` mais l'UI ne l'affiche pas.
- Les décisions/tâches générées par LLM n'ont pas de score de confiance.
- Aucune présentation d'alternatives "l'agent a aussi envisagé X et Y".

## État cible

- Tous les outputs LLM structurés incluent un champ `confidence` (0..1) et un champ `reasoning` (pourquoi ce choix, alternatives écartées).
- L'UI affiche la confiance de manière sobre (petite jauge colorée, tooltip avec le reasoning).
- Seuil critique en dessous duquel Pacemaker ne produit *pas* l'action mais pose une question (déjà prévu dans le spec WhatsApp, à généraliser ici).

## Changements de schéma

```sql
ALTER TABLE tasks ADD COLUMN confidence REAL;
ALTER TABLE tasks ADD COLUMN reasoning TEXT;
ALTER TABLE risks ADD COLUMN confidence REAL;
ALTER TABLE risks ADD COLUMN reasoning TEXT;
-- decisions a déjà confidence + rationale
```

## Fichiers impactés

### Existants

- `src/lib/prompts.ts` — ajout systématique d'une consigne "retourne également `confidence` (0..1) et `reasoning` (pourquoi ce choix, alternatives écartées)".
- `src/app/api/llm/*` — stockage de ces champs.
- `src/types/index.ts` — ajout aux types.
- `src/components/admin/TaskRow.tsx`, `TaskDetail.tsx` — affichage discret de la confiance (petite jauge).

### Nouveaux

- `src/components/ui/ConfidenceGauge.tsx` — composant visuel (bar, dot, ou %).
- `src/components/ui/ReasoningPopover.tsx` — popover avec l'argumentaire.

## Étapes dans l'ordre

1. Ajouter les colonnes DB.
2. Modifier tous les prompts LLM pour demander `confidence` + `reasoning`.
3. Mettre à jour les routes API pour les stocker.
4. Implémenter les composants UI discrets.
5. Afficher sur tasks, risks, decisions, incoherences, recalibrations.
6. Optionnel : filtre "tâches à faible confiance" pour auditer.

## Critères de validation

- Chaque tâche générée par LLM a une valeur de confidence stockée.
- L'UI affiche la confiance sur chaque entité applicable.
- Le reasoning est accessible en 1 clic/hover.
- Un filtre "confiance < 0,7" remonte les éléments à auditer.

---

# Chantier 7 — Canal vocal + WhatsApp

**Principe manifeste servi** : P1 (le consultant parle, Pacemaker structure).

**Pourquoi ici, pas plus tôt** : le canal WhatsApp est le plus ambitieux des canaux d'entrée. Il suppose que la détection d'incohérences (chantier 3) et la réévaluation automatique (chantier 4) fonctionnent, sinon le canal vocal crée du désordre plus vite qu'il ne produit de la valeur. Il suppose aussi le multi-mission (chantier 1) pour pouvoir router les messages vers la bonne mission.

## État actuel

- Aucun canal vocal.
- Aucune intégration WhatsApp.
- Le spec technique complet a été produit dans `pacemaker-whatsapp-agent-spec.md`.

## État cible

Voir spec détaillé. En résumé :

- Meta WhatsApp Cloud API branchée en webhook.
- Paul envoie texte, vocal, photo → transcription (Whisper) si vocal, Vision si photo, puis agent Claude avec tool use qui appelle les mutations Pacemaker existantes.
- Allowlist sur numéro de Paul uniquement au MVP.
- Journal d'actions agent (cf. chantier pour `agent_actions`) réversible.

## Changements de schéma

Cf. spec WhatsApp, tables `wa_conversations`, `wa_messages`, `agent_actions`.

**Étape préliminaire obligatoire** (avant toute écriture de code) : Claude Code doit produire un document `docs/design/agent-actions-unification.md` qui propose un modèle unifié pour les actions autonomes de l'agent, en couvrant les quatre sources existantes :

1. `decisions` (chantier 2) — l'agent acte/propose une décision.
2. `incoherences` (chantier 3) — l'agent détecte une contradiction.
3. `recalibrations` (chantier 4) — l'agent réévalue le plan.
4. `agent_actions` (chantier 7, spec WA) — l'agent crée/modifie une entité depuis un message WhatsApp.

Le document doit :
- Trancher entre fusion (table unique `agent_actions` qui englobe tout) et fédération (chaque table reste, `agent_actions` référence via `target_entity_*`).
- Préserver la capacité de revert (chantier 4) et le journal narratif (spec WA §6).
- Être validé par Paul avant le moindre coup de hache dans le schéma.

Sans ce document validé, le chantier 7 ne démarre pas.

## Fichiers impactés

Cf. spec dédié.

## Étapes dans l'ordre

Cf. spec dédié, 3 itérations en 3–4 semaines.

## Critères de validation

Cf. spec dédié.

---

# Chantier 8 — Indicateurs de temps libéré

**Principe manifeste servi** : P7 (le temps libéré est l'unité de mesure).

**Pourquoi en dernier** : c'est un chantier de mesure, qui suppose que tous les autres soient en place pour qu'il y ait du temps réellement libéré à mesurer.

## État actuel

- Aucune mesure du temps économisé par l'usage de Pacemaker.
- Les corrections apprises sont comptées (`applied_count`) mais pas converties en gain de temps.

## État cible

- Un dashboard "Temps libéré" par consultant + global mission.
- Estimation heuristique : chaque action de l'agent (tâche créée automatiquement, CR parsé, livrable structuré, briefing consulté) a un `estimated_time_saved_minutes` selon une table de conversion.
- Tableau de bord visuel : heures économisées cette semaine, ce mois, depuis le début de la mission.
- Décomposition par activité : formalisation, préparation COPIL, rédaction CR, suivi tâches, etc.

## Changements de schéma

```sql
CREATE TABLE time_savings (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,              -- 'task_creation','cr_parsing','livrable_generation','briefing','recalibration',...
  estimated_minutes_saved INTEGER NOT NULL,
  source_entity_type TEXT,
  source_entity_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_time_savings_mission ON time_savings(mission_id, created_at);
CREATE INDEX idx_time_savings_user ON time_savings(user_id, created_at);
```

Une table de référence `time_conversion_rules` (simple JSON en config au début) donne les estimations par activité.

## Fichiers impactés

### Nouveaux

- `src/config/time-conversion.ts` — table de référence (ex. : parsing CR = 20 min économisées, génération tâches week = 15 min, briefing consulté = 10 min, livrable généré = 45 min, recalibration auto = 20 min).
- `src/lib/time-savings.ts` — `logTimeSaving(activity, missionId)`.
- `src/app/api/time-savings/route.ts` — GET aggregate par période.
- `src/app/admin/missions/[slug]/temps-libere/page.tsx` — dashboard dédié.
- `src/components/time-savings/TimeSavingsDashboard.tsx`, `ActivityBreakdown.tsx`.

## Étapes dans l'ordre

1. Table `time_savings` + config `time-conversion.ts`.
2. Hooks dans les API existantes pour logger les économies à chaque action automatique.
3. Endpoint d'agrégation.
4. Dashboard UI (sobre : 3 chiffres clés + un camembert des activités).
5. Ajout de la métrique sur le dashboard client (visible aussi au client, comme démonstration de valeur).

## Critères de validation

- Après une semaine d'usage réel, le compteur affiche un nombre crédible (ordre de grandeur 5–15h économisées pour une mission active).
- La décomposition par activité est cohérente avec l'usage observé.
- La valeur est consultable côté admin (par consultant) et côté client (témoignage de valeur).

---

## Synthèse — ordre d'exécution recommandé

```
Semaines 1–2 : Chantier 1 (multi-mission) — CRITIQUE, bloque tout
Semaines 2–3 : Chantier 2 (modèle décisions) — parallèlisable avec 3
Semaines 3–4 : Chantier 3 (incohérences)
Semaine 4   : Chantier 6 (confiance UI) — court, peut s'intercaler
Semaine 5   : Chantier 4 (réévaluation auto)
Semaine 6   : Chantier 5 (briefing)
Semaines 7–10 : Chantier 7 (WhatsApp) — le plus gros, en 3 itérations
Semaine 11  : Chantier 8 (temps libéré)
```

Total estimé : **10–12 semaines** à rythme soutenu, Paul validant chaque chantier avant de lancer le suivant.

---

## Notes transversales pour Claude Code

1. **Préserve la rétrocompatibilité** pendant les chantiers 1 et 2. Les migrations doivent pouvoir être appliquées sur la DB Turso de production sans perte de données, avec un flag de fallback pour revenir à l'ancien comportement en cas de régression.

2. **Mets à jour `CLAUDE.md`** à la fin de chaque chantier avec les nouvelles conventions, modèles de données, routes API. Ce fichier est la mémoire collective du projet.

3. **Évite l'explosion de composants**. Pacemaker a aujourd'hui une architecture lisible ; ne la noie pas sous une prolifération de petits composants. Regroupe par domaine (`components/decisions/*`, `components/incoherences/*`) plutôt que par atomicité.

4. **Tests minimaux mais présents**. Au moins un test manuel documenté par chantier (scénario reproductible qui démontre que ça marche). Tests unitaires seulement sur les helpers purs (`lib/*` sans effets de bord).

5. **Sur les prompts LLM** : extrais systématiquement les prompts dans `lib/prompts.ts` sous forme de fonctions pures qui retournent un string. Jamais de prompt inline dans les routes API. Cette discipline existe déjà dans le repo, à maintenir.

6. **Surveille la consommation API Anthropic**. Plusieurs chantiers (3 détection, 4 recalibration auto, 5 briefing) ajoutent des appels LLM automatiques. Ajoute un compteur de tokens journalier par mission pour ne pas découvrir une facture surprise.

7. **En cas de doute, produire une proposition minimale et la présenter à Paul avant de la coder**. Pacemaker est un produit avec une vision claire (manifeste v0.2) ; toute feature qui s'éloigne de cette vision doit être discutée.

---

*Fin du plan.*
