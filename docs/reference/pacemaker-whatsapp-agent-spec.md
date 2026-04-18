# Pacemaker × WhatsApp Agent — Spec technique MVP

**Version** : v0.1.1 (17 avril 2026 — patch de cohérence)
**Auteur** : Paul Duchâteau
**Statut** : Spec pour build

**Changelog v0.1.1** :
- Table `incoherences` : schéma aligné sur celui du chantier 3 du plan de transformation (champs supplémentaires `severity`, `source_entity_*`, `resolution_status` étendu). `source_message_id` conservé comme référence optionnelle vers `wa_messages`.
- Tables `agent_actions` / `decisions` / `recalibrations` / `incoherences` : leur consolidation est repoussée à une note de design unifiée, à produire en début de chantier 7. Voir §3bis.
- §9 question 2 tranchée : réponse par défaut = silence, sauf cas explicites listés (voir §5.2).

---

## 1. Principe directeur

Un agent WhatsApp qui absorbe des inputs non-structurés (vocal, photo, texte) tout au long d'une mission et les intègre **silencieusement** dans Pacemaker : création de tâches, mise à jour du contexte, recalibrage du plan. L'utilisateur (Paul uniquement au MVP) ne répond que si l'agent a une ambiguïté qu'il ne peut pas lever par lui-même.

**Contrat de confiance** : chaque action de l'agent est journalisée, lisible comme un récit, et réversible en un geste depuis l'UI Pacemaker.

---

## 2. Stack retenue

| Composant | Choix | Justification |
|---|---|---|
| Messagerie | **Meta WhatsApp Cloud API** | Gratuit jusqu'à 1000 conv/mois ; single-user = pas besoin du scale Twilio |
| Webhook | Route Next.js App Router (`/api/whatsapp/webhook`) | Prolongement du déploiement Vercel existant |
| Transcription audio | **Whisper API (OpenAI)** | Meilleure qualité FR avec jargon métier ; ~0,006$/min |
| Vision | **Claude Sonnet 4.5 multimodal** natif | Photos de paperboard, screenshots, schémas — pas besoin d'OCR séparé |
| Agent core | **Claude Sonnet 4.5 avec tool use** | Déjà intégré côté serveur Pacemaker |
| Persistance | **Turso/libsql** (extension du schéma existant) | Continuité |
| Files (audio/photos) | **Vercel Blob** (déjà utilisé) | Continuité |

**Coût estimé mensuel (usage personnel Paul, ~200 messages/mois)** : ~5–10€ (Whisper + Claude API).

---

## 3. Schéma Turso additionnel

```sql
-- Fil conversationnel WhatsApp par mission
CREATE TABLE wa_conversations (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  phone_number TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);

-- Messages bruts entrants/sortants (audit trail)
CREATE TABLE wa_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES wa_conversations(id),
  direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
  type TEXT NOT NULL CHECK(type IN ('text', 'audio', 'image', 'document')),
  raw_content TEXT,              -- transcription pour audio, description pour image
  blob_url TEXT,                 -- URL Vercel Blob si média
  wa_message_id TEXT,            -- ID côté Meta pour idempotence
  created_at INTEGER NOT NULL
);

-- Journal des actions de l'agent (le fil narratif)
CREATE TABLE agent_actions (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  source_message_id TEXT REFERENCES wa_messages(id),
  action_type TEXT NOT NULL,     -- 'create_task' | 'update_task' | 'update_deliverable' | 'add_context' | 'flag_incoherence' | 'recalibrate_plan'
  target_entity_type TEXT,        -- 'task' | 'deliverable' | 'mission' | 'context'
  target_entity_id TEXT,
  before_state TEXT,              -- JSON snapshot avant
  after_state TEXT,               -- JSON snapshot après
  reasoning TEXT NOT NULL,        -- "Tu as dit X → j'ai fait Y parce que Z"
  confidence REAL NOT NULL,       -- 0.0–1.0
  reverted_at INTEGER,            -- timestamp si annulé par Paul
  created_at INTEGER NOT NULL
);

-- Incohérences détectées — schéma UNIFIÉ avec le chantier 3 du plan de transformation.
-- Au chantier 7, si le chantier 3 a été livré, cette table existe déjà : on l'utilise telle quelle.
-- Sinon (chantier 7 livré avant 3, hypothèse peu probable vu l'ordre du plan), on crée avec ce schéma
-- et le chantier 3 n'aura pas à migrer.
CREATE TABLE incoherences (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  kind TEXT NOT NULL CHECK(kind IN ('factual','scope_drift','constraint_change','hypothesis_invalidated')),
  severity TEXT NOT NULL CHECK(severity IN ('minor','moderate','major')),
  description TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  source_message_id TEXT REFERENCES wa_messages(id),  -- lien optionnel vers le message WA déclencheur
  conflicting_entity_type TEXT NOT NULL,
  conflicting_entity_id TEXT NOT NULL,
  auto_resolution TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(resolution_status IN ('pending','auto_resolved','user_acknowledged','user_rejected','ignored')),
  resolved_at INTEGER,
  resolved_by TEXT,
  briefed_to_user_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_wa_messages_conv ON wa_messages(conversation_id, created_at);
CREATE INDEX idx_agent_actions_mission ON agent_actions(mission_id, created_at);
CREATE INDEX idx_incoherences_mission ON incoherences(mission_id, created_at);
```

**Note** : la table `agent_actions` est le cœur du contrat de confiance. C'est elle qui alimentera la vue "Journal" dans Pacemaker.

---

## 3bis. Consolidation des tables d'actions autonomes

Le plan de transformation introduit, avant ce chantier, trois tables voisines :

- `decisions` (chantier 2) — décisions de mission, avec auteur `'agent'` possible.
- `incoherences` (chantier 3) — détection de contradictions.
- `recalibrations` (chantier 4) — cycles de réévaluation du plan.

La table `agent_actions` ici décrite chevauche partiellement ces trois tables (une recalibration EST une action agent, un flag d'incohérence EST une action agent). Avant la moindre ligne de code du chantier 7, Claude Code doit produire `docs/design/agent-actions-unification.md` qui tranche :

- **Option A — Fusion** : `agent_actions` devient la seule table d'actions autonomes. `decisions`, `incoherences`, `recalibrations` restent comme entités métier (le quoi), `agent_actions` devient le journal narratif (le comment / pourquoi / quand / par quoi).
- **Option B — Fédération** : `agent_actions` est une vue d'agrégation sur les trois tables via `target_entity_type + target_entity_id`.
- **Option C — Hybride** : `agent_actions` absorbe les actions créatrices (create_task, add_context) mais les trois tables spécialisées restent pour les domaines qui ont des champs riches.

Le document doit préserver :
- Le mécanisme de revert du chantier 4 (bouton "Annuler cette recalibration").
- Le journal narratif lisible comme un récit (§6).
- La confiance `confidence` + `reasoning` du chantier 6.

Paul valide le document avant écriture de code.

---

## 4. Flow webhook

```
Meta Cloud API
   │
   ▼ POST /api/whatsapp/webhook
┌──────────────────────────────────────┐
│ 1. Vérif signature HMAC Meta         │
│ 2. Vérif phone_number in ALLOWLIST   │
│ 3. Dédup via wa_message_id           │
│ 4. ACK 200 immédiat (< 5s)           │
└──────────────────────────────────────┘
   │
   ▼ (async, via waitUntil ou queue)
┌──────────────────────────────────────┐
│ 5. Download média si audio/image      │
│    → Vercel Blob                     │
│ 6. Transcription (Whisper) si audio  │
│ 7. Insert wa_messages                │
│ 8. Détection mission active          │
│    (défaut : dernière mission        │
│     modifiée OU inférence LLM        │
│     depuis le contenu)               │
│ 9. Invocation agent core             │
│    (voir §5)                          │
│10. Exécution des tool_calls           │
│11. Insert agent_actions & inco.      │
│12. Réponse WhatsApp si nécessaire    │
└──────────────────────────────────────┘
```

**Point d'attention** : Meta exige un ACK < 5s sinon re-delivery. Toute la logique lourde doit être asynchrone (Vercel `waitUntil` ou Upstash QStash si besoin).

---

## 5. Agent core — architecture

Un seul agent Claude Sonnet 4.5, avec 6 outils. Pas d'orchestrateur multi-agents (overkill pour le MVP).

### 5.1 Tools exposés à l'agent

```typescript
const tools = [
  {
    name: "create_task",
    description: "Créer une tâche sur la mission. Utiliser pour tout item d'action identifié (réunion décidée, engagement pris, todo mentionné).",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        deliverable_id: { type: "string", description: "ID du livrable rattaché si applicable" },
        due_date: { type: "string", format: "date" },
        assignee: { type: "string", enum: ["paul_d", "paul_b", "client", "unassigned"] },
        confidence: { type: "number", minimum: 0, maximum: 1 }
      },
      required: ["title", "confidence"]
    }
  },
  {
    name: "update_task",
    description: "Mettre à jour une tâche existante (avancement, statut, contenu).",
    input_schema: { /* ... */ }
  },
  {
    name: "update_deliverable",
    description: "Mettre à jour l'état d'un livrable (progression, statut, blocages).",
    input_schema: { /* ... */ }
  },
  {
    name: "add_context",
    description: "Ajouter une information contextuelle à la mission (décision client, info métier, contrainte). Utiliser quand l'info est du contexte permanent, pas une tâche.",
    input_schema: { /* ... */ }
  },
  {
    name: "flag_incoherence",
    description: "Signaler une incohérence entre l'input courant et l'état actuel de la mission. À utiliser quand l'input contredit un élément précédent.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["factual", "scope_drift", "constraint_change", "hypothesis_invalidated"] },
        description: { type: "string" },
        conflicting_entity_type: { type: "string" },
        conflicting_entity_id: { type: "string" },
        auto_resolution: {
          type: "string",
          description: "Action que l'agent propose de prendre pour résoudre (ex: 'mettre à jour la deadline du livrable X à Y')"
        }
      },
      required: ["kind", "description", "auto_resolution"]
    }
  },
  {
    name: "ask_user",
    description: "Poser UNE question courte à l'utilisateur. À utiliser UNIQUEMENT si la classification a une confiance < 0.6 OU si l'action envisagée est destructive sans retour simple. Ne pas abuser.",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string" },
        options: { type: "array", items: { type: "string" }, description: "2-4 options courtes, optionnel" }
      },
      required: ["question"]
    }
  }
];
```

### 5.2 System prompt de l'agent

```
Tu es l'agent de capture de Pacemaker, l'outil de pilotage de missions de Paul Duchâteau (Lite Ops / Ijen).

TON RÔLE : absorber des inputs non-structurés envoyés par Paul sur WhatsApp (vocal transcrit, photos décrites, texte) et les intégrer dans la mission active.

CONTEXTE MISSION ACTIVE :
<mission_state>
{{mission_name}}, {{mission_dates}}
Livrables en cours : {{deliverables_summary}}
Tâches ouvertes récentes : {{tasks_summary}}
Dernier contexte ajouté : {{recent_context}}
</mission_state>

DERNIERS ÉCHANGES WHATSAPP (pour continuité) :
{{recent_wa_messages}}

PRINCIPES DE FONCTIONNEMENT :

1. AGIS SILENCIEUSEMENT. Paul préfère que tu fasses le travail plutôt que tu ne lui poses des questions. Ne réponds sur WhatsApp que si :
   - Tu as utilisé l'outil `ask_user` (ambiguïté non-levable)
   - Tu as détecté une incohérence AVEC UN IMPACT MAJEUR sur le plan
   - Paul a posé une question explicite

2. CLASSIFIE AVANT D'AGIR. Pour chaque input :
   - Est-ce une TÂCHE (quelque chose à faire, un engagement, une action) ? → create_task
   - Est-ce une MISE À JOUR (avancement, changement d'état d'un item existant) ? → update_task/update_deliverable
   - Est-ce du CONTEXTE (info métier, décision client, contrainte nouvelle) ? → add_context
   - Est-ce une INCOHÉRENCE (contredit quelque chose que je sais déjà) ? → flag_incoherence + action corrective

3. UN INPUT PEUT GÉNÉRER PLUSIEURS ACTIONS. Un vocal de réunion peut contenir 3 tâches + 1 décision contextuelle + 1 changement de deadline. Utilise plusieurs tool_calls dans la même réponse.

4. DÉTECTION D'INCOHÉRENCE — 4 types à surveiller :
   - FACTUAL : l'input dit X, mais l'état actuel dit non-X (ex: "livrable fini" vs état "en cours")
   - SCOPE_DRIFT : le client demande quelque chose hors périmètre initial
   - CONSTRAINT_CHANGE : une contrainte bouge (deadline, budget, effectif, accès data)
   - HYPOTHESIS_INVALIDATED : une hypothèse de travail s'effondre (ex: "en fait la source X n'existe pas")

5. CONFIANCE. Tu dois scorer chaque action. Heuristique :
   - > 0.85 : input explicite et non-ambigu ("ajoute une tâche : relancer Benoît sur l'accès Power BI")
   - 0.6–0.85 : inférence raisonnable ("il faudrait qu'on relance Benoît" → tâche probable)
   - < 0.6 : ambigu → utilise `ask_user`

6. RATTACHEMENT. Essaie toujours de rattacher une tâche/update à un livrable existant si le lien est évident. Sinon, laisse `deliverable_id` vide.

7. STYLE DE RÉPONSE (quand tu réponds). Court, direct, français. Pas de préambule. Pas d'emoji sauf ✓ pour confirmer une action majeure.

EXEMPLES DE BONNE EXÉCUTION :

Input vocal : "Je sors du rendez-vous avec Benoît, il veut qu'on ajoute une vue sur les effectifs par direction régionale, il peut nous filer les data RH jeudi prochain"
→ create_task (titre: "Intégrer vue effectifs par DR", deliverable: inferred Power BI, due: jeudi prochain + 1 semaine buffer, confidence: 0.9)
→ create_task (titre: "Récupérer data RH auprès de Benoît", due: jeudi prochain, confidence: 0.95)
→ flag_incoherence si c'est hors scope initial (scope_drift) avec auto_resolution: "j'ajoute la tâche mais tu devrais valider avec le client que c'est in-scope"
→ pas de réponse WhatsApp

Input texte : "deadline du livrable 2 décalée au 30 mai"
→ update_deliverable (progression intacte, due_date: 2026-05-30, confidence: 0.95)
→ flag_incoherence (kind: constraint_change, auto_resolution: "deadline mise à jour, plan recalibré")
→ réponse WhatsApp : "✓ Livrable 2 décalé au 30 mai. 2 tâches ont glissé en conséquence."

N'INVENTE RIEN. Si un détail n'est pas dans l'input, ne l'invente pas. Laisse les champs vides ou demande.
```

### 5.3 Détection de la mission active

Heuristique simple pour le MVP :
1. Si Paul a une seule mission active → c'est elle
2. Si plusieurs missions actives → inférence LLM à partir du contenu (noms de personnes, jargon client, sujets évoqués)
3. Si ambigu → `ask_user` avec options

Plus tard : commandes slash (`/mission agirc` pour switcher).

---

## 6. UX côté Pacemaker (UI)

Deux ajouts minimaux au MVP :

**a) Bandeau "Journal agent" dans la vue mission**
Fil inversé chronologique, lisible comme un récit :
```
Aujourd'hui 18h42 · depuis WhatsApp (vocal 34s)
Tu as dit : "Benoît veut une vue effectifs par DR, data jeudi..."
J'ai fait :
  + Tâche "Intégrer vue effectifs par DR" (Power BI, due 30/04)
  + Tâche "Récupérer data RH" (due 24/04)
  ⚠ Flag scope_drift — à valider avec le client
[Annuler toutes ces actions] [Voir le message original]
```

**b) Badge d'incohérence sur les entités affectées**
Un petit indicateur sur les tâches/livrables récemment modifiés par l'agent, pour que tu voies d'un coup d'œil ce qui a bougé sans ton intervention directe.

---

## 7. Sécurité

- **Allowlist numéro** : `ALLOWED_WA_NUMBERS` env var, check dès le webhook.
- **Vérif signature Meta** : HMAC SHA256 avec `APP_SECRET`.
- **Idempotence** : dédup sur `wa_message_id`.
- **Rate limit** : 30 msg/min max par numéro (protection contre boucle d'erreur).
- **Secrets** : `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (Whisper), `META_APP_SECRET`, `META_WA_TOKEN`, `META_PHONE_NUMBER_ID` — tous côté server env Vercel.

---

## 8. Plan de build en 3 itérations

### Itération 1 (1 semaine) — "Le tuyau fonctionne"
- [ ] Setup Meta WhatsApp Business Account + numéro de test
- [ ] Route webhook Next.js, vérif signature, ACK
- [ ] Schéma Turso migré
- [ ] Flow texte simple : réception → insert wa_messages → echo simple
- [ ] Allowlist fonctionnelle

**Critère de succès** : tu envoies "test" sur WhatsApp, le message apparaît dans la DB et tu reçois une réponse.

### Itération 2 (1 semaine) — "L'agent agit"
- [ ] Intégration Claude avec les 6 tools
- [ ] Implémentation des 6 tools côté mutations Pacemaker
- [ ] System prompt v1 + contexte mission injecté
- [ ] Table `agent_actions` + journal UI dans Pacemaker
- [ ] Bouton "Annuler" sur chaque action du journal

**Critère de succès** : tu envoies un texte "il faut que je rappelle Cyril demain", une tâche se crée, apparaît dans le journal, tu peux l'annuler.

### Itération 3 (1–2 semaines) — "Multimodal + incohérences"
- [ ] Réception audio + Whisper + transcription dans wa_messages
- [ ] Réception image + description via Claude vision
- [ ] Tool `flag_incoherence` câblé + table `incoherences`
- [ ] Logique de recalibrage silencieux du plan
- [ ] Badge incohérence dans l'UI

**Critère de succès** : tu envoies un vocal de 30s post-réunion, plusieurs tâches + un changement de deadline sont créés, une incohérence est flaggée, tout est dans le journal, tu peux tout annuler.

---

## 9. Questions ouvertes (à trancher avant Itération 2)

1. **Recalibrage du plan** : aujourd'hui Pacemaker a une fonction de recalibrage LLM (cf. CLAUDE.md). Est-ce qu'on la réutilise en aveugle à chaque `update_deliverable`, ou on ne la déclenche que sur certains types d'incohérence (constraint_change typiquement) ? **Tranché par le chantier 4 du plan** : `shouldAutoRecalibrate(incoherence)` déclenche uniquement sur `severity='major'` ou `kind='constraint_change'`, scope `downstream_only`.

2. **Réponse par défaut** (tranché v0.1.1) : **silence par défaut**. L'agent ne répond sur WhatsApp QUE dans les cas listés au §5.2 (ambiguïté → `ask_user`, incohérence majeure avec impact plan, question explicite de Paul). Rationale :
   - L'ACK 200 du webhook Meta confirme la réception côté serveur (WhatsApp affiche les deux coches grises côté client).
   - Le journal agent dans l'UI Pacemaker (§6) est la confirmation de valeur (tu vois ce que l'agent a fait).
   - Un `✓` systématique crée du bruit notificationnel sur le téléphone de Paul et dilue la signification des vraies réponses.
   - **Exception** : si le message a mis plus de 60s à être traité (file d'attente Whisper engorgée par exemple), envoyer un court `✓ traité` pour rassurer sur la non-perte.

3. **Stockage des vocaux** (tranché v0.1.1, à confirmer avec Paul) : conservation 90 jours dans Vercel Blob, puis purge automatique. La transcription Whisper est conservée indéfiniment dans `wa_messages.raw_content` (coût négligeable). 90 jours couvrent une mission complète type. Paul peut forcer la conservation d'un audio particulier via un flag `keep_audio=true` sur le message (ex: vocal de référence sur une décision majeure).

---

## 10. Extensions post-MVP (backlog)

- Commandes slash : `/mission`, `/journal`, `/today`, `/undo`
- Mode "dictée de CR" : tu envoies 3 vocaux d'affilée, l'agent assemble un CR structuré
- Résumé quotidien poussé à 19h sur WhatsApp ("voilà ce qui a bougé aujourd'hui")
- Ouverture à Paul B. avec distinction d'énonciateur
- Ouverture au client (rôle lecture seule + capacité à déposer docs)
- Intégration inverse : déclencher un message WhatsApp quand une tâche approche sa deadline
