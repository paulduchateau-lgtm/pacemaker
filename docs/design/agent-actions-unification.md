# Design doc — Consolidation des actions autonomes

**Statut** : proposition v0.1, **en attente de validation Paul** avant implémentation du chantier 7 (WhatsApp).
**Références** : `pacemaker-whatsapp-agent-spec.md` §3 et §3bis, `pacemaker-plan-transformation.md` §Chantier 7.
**Contexte** : les chantiers 2–4 ont introduit trois tables qui tracent toutes des *actions autonomes de l'agent*, avec des chevauchements réels. Le chantier 7 (WhatsApp agent) prévoit d'en ajouter une quatrième, `agent_actions`. Cette note tranche entre trois options avant d'écrire la moindre ligne de WhatsApp.

---

## 1. Ce qui existe aujourd'hui

Après les chantiers 2–4, trois tables spécialisées tracent les actions de l'agent (ou d'un utilisateur humain) sur la mission :

| Table          | Chantier | Portée             | Ce qu'elle répond                                      |
|----------------|----------|--------------------|--------------------------------------------------------|
| `decisions`    | 2        | Contenu métier     | *Qu'est-ce qui a été décidé, par qui, pourquoi ?*      |
| `incoherences` | 3        | Détection          | *Qu'est-ce qui ne colle pas entre deux éléments ?*     |
| `recalibrations` | 4      | Réplanification    | *Comment le plan a-t-il été reforgé et par quel cycle ?* |

Chacune a une structure riche et spécifique. Elles sont **scopées par mission**, tracent `trigger` / `source_type` / `author`, et permettent (pour `recalibrations`) un revert via snapshot.

La spec WhatsApp §3 propose une 4e table `agent_actions` plus générique :

```
id, mission_id, source_message_id, action_type, target_entity_type,
target_entity_id, before_state, after_state, reasoning, confidence,
reverted_at, created_at
```

Elle est conçue pour répondre à : *quelle action l'agent a prise, sur quel message, avec quelle argumentation, et peut-on l'annuler ?*

---

## 2. Le chevauchement

Un message WhatsApp de Paul ("on décale le COPIL au 30 mai") peut déclencher **simultanément** :

1. Une **décision** (`decisions` : statement, rationale, alternatives, author).
2. Une **incohérence** (`incoherences` : `constraint_change`, conflict with deliverable X).
3. Une **recalibration** downstream (`recalibrations` : trigger=`auto_on_incoherence`, scope=`downstream_only`).
4. Une **action agent** (spec WA : `action_type=update_deliverable`, before/after state).

Sans stratégie, on écrit la même chose dans 4 tables.

---

## 3. Les trois options

### Option A — Fusion complète

`agent_actions` devient l'unique table des actions. `decisions`, `incoherences`, `recalibrations` deviennent des vues calculées (ou disparaissent).

- **Avantages** : un seul journal narratif, un seul mécanisme de revert, une seule UI pour le "Journal agent".
- **Inconvénients majeurs** :
  - Les champs riches (rationale, alternatives, snapshot_before, severity, etc.) disparaissent dans un `before_state`/`after_state` JSON peu requêtable.
  - On perd les indexes spécialisés (idx_decisions_status, idx_incoherences_pending) qui servent les vues dédiées.
  - La migration détruit la trace des chantiers 2-4 déjà déployée en prod.
- **Coût de migration** : élevé, **destructif** (viole la règle additive).
- **Verdict** : rejetée.

### Option B — Fédération complète

Les trois tables restent. `agent_actions` est une **vue d'agrégation** SQL sur `decisions UNION ALL incoherences UNION ALL recalibrations UNION ALL wa_messages`.

- **Avantages** : zero migration destructrice ; chaque table garde ses champs riches ; le revert reste géré par `recalibrations` comme aujourd'hui.
- **Inconvénients** :
  - Une vue SQL sur 4+ tables devient vite complexe à maintenir, surtout avec `triggered_by` et `confidence` déjà dispersés.
  - Le "Journal agent" côté UI doit faire 4 requêtes, interclasser, paginer. Simple à écrire, pénible à faire scaler.
  - Les actions WhatsApp pures (ex : juste un ajout de contexte sans décision ni incohérence) n'ont nulle part où vivre — ou retombent dans une 4e table `wa_messages` qui n'est pas narrative.
- **Verdict** : praticable mais ergonomiquement faible côté journal unifié.

### Option C — Hybride (recommandée)

`agent_actions` devient un **journal narratif léger** qui pointe vers les tables spécialisées quand elles existent. C'est un registre des actions, pas un doublon des contenus.

Structure proposée :

```sql
CREATE TABLE agent_actions (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  source_message_id TEXT REFERENCES wa_messages(id),
  action_type TEXT NOT NULL CHECK(action_type IN (
    'create_task', 'update_task', 'update_deliverable',
    'add_context', 'create_decision', 'flag_incoherence',
    'recalibrate_plan', 'ask_user', 'noop'
  )),
  target_entity_type TEXT,              -- 'task' | 'decision' | 'incoherence' | 'recalibration' | 'document' | 'mission'
  target_entity_id TEXT,                -- pointeur vers la ligne de contenu, quand elle existe
  narrative TEXT NOT NULL,              -- une phrase : "Tu as dit X → j'ai fait Y parce que Z"
  reasoning TEXT,                       -- développement optionnel
  confidence REAL,                      -- hérité de l'entité cible si applicable
  reverted_at TEXT,
  reverted_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Principes :
1. **Une action = une ligne narrative**. `agent_actions` ne duplique pas les contenus. Une décision vit dans `decisions`, une incohérence dans `incoherences`, une recalibration dans `recalibrations`. `agent_actions` les référence via `target_entity_*`.
2. **Les actions "pures WhatsApp"** (`add_context`, `ask_user`, `noop`) n'ont pas de ligne de contenu associée. Elles vivent uniquement dans `agent_actions`.
3. **Le revert reste géré là où il est le mieux implémenté** :
   - Une recalibration → `revertRecalibration()` (chantier 4) restaure depuis snapshot.
   - Une décision → soft archive via `cancelDecision()` (chantier 2).
   - Une incohérence → `setResolutionStatus(rejected)` (chantier 3).
   - `agent_actions.reverted_at` est mis à jour par le helper correspondant, pour unification côté UI.
4. **Le journal UI** lit uniquement `agent_actions` et joint à la demande vers la table cible pour afficher le détail. Une seule requête paginée.

Étapes d'implémentation (chantier 7 itération 1) :
- Migration `chantier-07a` : `wa_conversations`, `wa_messages`, `agent_actions`.
- Lib `lib/agent-actions.ts` : `logAgentAction(...)`, `revertAgentAction(id)` qui dispatch vers le helper spécialisé selon `target_entity_type`.
- Adapter `createDecision`, `detectIncoherences`, `performRecalibration` pour accepter un paramètre optionnel `triggeringMessageId` et écrire une ligne `agent_actions` en parallèle.

### Comparatif final

| Critère                        | A fusion | B fédération | C hybride |
|--------------------------------|:--------:|:------------:|:---------:|
| Migration additive             | ❌       | ✅           | ✅        |
| Champs riches préservés        | ❌       | ✅           | ✅        |
| Journal UI en une requête      | ✅       | ❌           | ✅        |
| Revert correctement chaîné     | ⚠ à réécrire | ✅        | ✅        |
| Complexité d'écriture          | haute    | basse        | moyenne   |
| Aligné sur le manifeste P2/P6  | ⚠ perd la trace argumentée | ✅ | ✅ |

**Recommandation : option C.**

---

## 4. Implications pour le chantier 7

Si C est validée :

- La spec WhatsApp §3 reste telle quelle **pour les tables `wa_conversations` et `wa_messages`**.
- La table `agent_actions` doit être **ré-écrite** selon le schéma §3 de ce document (plus léger, narrative-first, pointeur vers les entités existantes).
- Les 6 tools du prompt WhatsApp (§5.2) sont conservés, mais leurs handlers serveur :
  - `create_task` → INSERT tasks + INSERT agent_actions(narrative, target_entity=task)
  - `update_task` → UPDATE tasks + INSERT agent_actions(narrative, target_entity=task)
  - `update_deliverable` → UPDATE livrables + INSERT agent_actions + (si deadline change) trigger detection → potentiellement trigger recalibrate → INSERT supplémentaires agent_actions
  - `add_context` → UPDATE missions.context + INSERT agent_actions (pas d'entité cible)
  - `flag_incoherence` → INSERT incoherences + INSERT agent_actions(target=incoherence)
  - `ask_user` → send WhatsApp message + INSERT agent_actions (pas de cible, narrative="Ambiguïté X : posé la question")

- Le schéma `incoherences` proposé par la spec WA §3 est **remplacé** par celui du chantier 3 (déjà en prod, plus riche). On se contente d'utiliser le champ `source_message_id` qui existe déjà.

---

## 5. Questions à Paul avant d'ouvrir le code du chantier 7

1. **Option C validée ?** Si oui, on fige le schéma `agent_actions` ci-dessus et on migre en `chantier-07a` une fois les secrets Meta/OpenAI en place.
2. **Stratégie de revert unifiée** : un bouton "Annuler" dans le journal WhatsApp doit-il pouvoir annuler *n'importe quelle* action, y compris une décision (soft-delete) ? Ou limite-t-on le revert aux actions "mécaniques" (create_task, update_deliverable, recalibrate_plan) ?
3. **Narrative auto vs narrative LLM** : le champ `narrative` est la phrase "Tu as dit X → j'ai fait Y parce que Z" qui nourrit le journal. Option (a) on la construit mécaniquement côté serveur depuis le tool_input et l'entité créée ; option (b) on demande au LLM de la rédiger dans la même réponse qui appelle le tool. (b) est plus fluide mais coûte des tokens ; (a) est déterministe.
4. **Setup externe requis avant code** (non-négociable, pas à moi à faire) :
   - Meta WhatsApp Business Account + numéro de test + vérification Meta.
   - `META_APP_SECRET`, `META_WA_TOKEN`, `META_PHONE_NUMBER_ID`, `ALLOWED_WA_NUMBERS` sur Vercel prod.
   - `OPENAI_API_KEY` pour Whisper (actuellement seulement `ANTHROPIC_API_KEY` et `VOYAGE_API_KEY`).

Sans les 4 points de (4), pas d'itération 1 possible. Je peux en revanche préparer dès maintenant **la migration `chantier-07a`** et le squelette de route webhook si tu veux, mais ça ne sert à rien tant que Meta n'envoie rien.

---

*Fin du doc.* À ta signature pour débloquer le chantier 7.
