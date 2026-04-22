-- =========================================================================
-- Chantier 1 (multi-mission) : table missions + colonne mission_id partout.
-- Les colonnes mission_id sont ajoutées par la migration (additive, nullable
-- pendant toute la durée du chantier, passera NOT NULL au chantier 1.bis de
-- nettoyage une fois le code 100 % scoped). Cf. docs/reference/.
-- =========================================================================

CREATE TABLE IF NOT EXISTS missions (
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status, owner_user_id);

CREATE TABLE IF NOT EXISTS weeks (
  id INTEGER PRIMARY KEY,
  phase TEXT NOT NULL,
  title TEXT NOT NULL,
  budget_jh REAL NOT NULL DEFAULT 0,
  actions TEXT NOT NULL DEFAULT '[]',
  livrables_plan TEXT NOT NULL DEFAULT '[]',
  owner TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  baseline_start_date TEXT,
  baseline_end_date TEXT,
  mission_id TEXT REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  week_id INTEGER NOT NULL REFERENCES weeks(id),
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT 'Paul',
  priority TEXT NOT NULL DEFAULT 'moyenne',
  status TEXT NOT NULL DEFAULT 'à faire',
  source TEXT NOT NULL DEFAULT 'manual',
  jh_estime REAL,
  livrables_generes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  mission_id TEXT REFERENCES missions(id),
  -- Chantier 6 : confiance (0..1) et argumentaire court.
  confidence REAL,
  reasoning TEXT
);

CREATE TABLE IF NOT EXISTS task_attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  blob_url TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
  probability INTEGER NOT NULL CHECK (probability BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'actif',
  mitigation TEXT NOT NULL DEFAULT '',
  mission_id TEXT REFERENCES missions(id),
  confidence REAL,
  reasoning TEXT
);

CREATE TABLE IF NOT EXISTS livrables (
  id TEXT PRIMARY KEY,
  week_id INTEGER NOT NULL REFERENCES weeks(id),
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planifié',
  delivery_date TEXT,
  mission_id TEXT REFERENCES missions(id),
  confidence REAL,
  reasoning TEXT,
  source_task_id TEXT REFERENCES tasks(id),
  format TEXT
);

CREATE TABLE IF NOT EXISTS rapports (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  etat TEXT NOT NULL,
  complexite TEXT NOT NULL DEFAULT 'moyenne',
  lot INTEGER NOT NULL DEFAULT 1,
  week_id INTEGER REFERENCES weeks(id),
  mission_id TEXT REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  week_id INTEGER NOT NULL,
  date TEXT NOT NULL DEFAULT (datetime('now')),
  content TEXT DEFAULT '',
  mission_id TEXT REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'autre',
  source TEXT NOT NULL DEFAULT 'manual',
  week_id INTEGER REFERENCES weeks(id),
  blob_url TEXT,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  mission_id TEXT REFERENCES missions(id),
  status TEXT NOT NULL DEFAULT 'active'   -- 'active' | 'obsolete'
);

CREATE TABLE IF NOT EXISTS doc_chunks (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES documents(id),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding F32_BLOB(1024)
);

CREATE TABLE IF NOT EXISTS project (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_week ON tasks(week_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_attachments ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_livrables_week ON livrables(week_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_week ON events(week_id);
CREATE INDEX IF NOT EXISTS idx_rapports_lot ON rapports(lot);
CREATE TABLE IF NOT EXISTS schedule_changes (
  id TEXT PRIMARY KEY,
  week_id INTEGER NOT NULL REFERENCES weeks(id),
  field TEXT NOT NULL DEFAULT 'start_date',
  old_value TEXT,
  new_value TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'deviation',
  cascaded INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  mission_id TEXT REFERENCES missions(id)
);

CREATE INDEX IF NOT EXISTS idx_docs_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON doc_chunks(doc_id);
CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx ON doc_chunks(libsql_vector_idx(embedding));
CREATE INDEX IF NOT EXISTS idx_schedule_changes_week ON schedule_changes(week_id);

-- Apprentissage continu : tracking des générations LLM
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  generation_type TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '{}',
  prompt TEXT NOT NULL,
  raw_output TEXT NOT NULL,
  applied_rules TEXT NOT NULL DEFAULT '[]',
  week_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  mission_id TEXT REFERENCES missions(id)
);

-- Apprentissage continu : corrections utilisateur + règles apprises
CREATE TABLE IF NOT EXISTS corrections (
  id TEXT PRIMARY KEY,
  generation_id TEXT NOT NULL REFERENCES generations(id),
  corrected_output TEXT NOT NULL,
  diff_summary TEXT NOT NULL,
  rule_learned TEXT NOT NULL,
  rule_embedding F32_BLOB(1024),
  generation_type TEXT NOT NULL,
  applied_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  mission_id TEXT REFERENCES missions(id)
);

CREATE INDEX IF NOT EXISTS idx_generations_type ON generations(generation_type);
CREATE INDEX IF NOT EXISTS idx_generations_week ON generations(week_id);
CREATE INDEX IF NOT EXISTS idx_corrections_gen_id ON corrections(generation_id);
CREATE INDEX IF NOT EXISTS idx_corrections_type ON corrections(generation_type, status);
CREATE INDEX IF NOT EXISTS rules_embedding_idx ON corrections(libsql_vector_idx(rule_embedding));

-- =========================================================================
-- Chantier 2 (modèle de décision enrichi) : table `decisions` avec motifs,
-- alternatives, auteur, confiance, statut. `decision_links` relie une décision
-- aux entités (task/risk/livrable/week/document) qu'elle impacte ou dont elle
-- dérive. Les events type='decision' restent pour compat legacy.
-- =========================================================================

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  statement TEXT NOT NULL,
  rationale TEXT,
  rationale_source TEXT NOT NULL DEFAULT 'native'
    CHECK(rationale_source IN ('native','legacy_no_rationale','user_added_later','llm_inferred')),
  alternatives TEXT,
  author TEXT NOT NULL DEFAULT 'paul',
  confidence REAL,
  status TEXT NOT NULL DEFAULT 'actée'
    CHECK(status IN ('proposée','actée','révisée','annulée')),
  source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK(source_type IN ('manual','parse_cr','vision','agent','legacy_event')),
  source_ref TEXT,
  revised_from TEXT REFERENCES decisions(id),
  week_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  acted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_decisions_mission ON decisions(mission_id, acted_at);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(mission_id, status);
CREATE INDEX IF NOT EXISTS idx_decisions_author ON decisions(mission_id, author);

CREATE TABLE IF NOT EXISTS decision_links (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK(entity_type IN ('task','risk','livrable','week','document')),
  entity_id TEXT NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'impacts'
    CHECK(link_type IN ('impacts','derives_from','blocks','supersedes')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_decision_links_decision ON decision_links(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_links_entity ON decision_links(entity_type, entity_id);

-- =========================================================================
-- Chantier 3 (détection d'incohérences + télémétrie tokens).
-- Le schéma `incoherences` est compatible avec la spec WhatsApp du chantier 7
-- (source_message_id optionnel pour lier au wa_messages à venir).
-- =========================================================================

CREATE TABLE IF NOT EXISTS token_usage (
  id TEXT PRIMARY KEY,
  mission_id TEXT REFERENCES missions(id),
  generation_id TEXT REFERENCES generations(id),
  route TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_creation_tokens INTEGER,
  cache_read_tokens INTEGER,
  triggered_by TEXT NOT NULL DEFAULT 'user'
    CHECK(triggered_by IN ('user','auto')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_token_usage_mission ON token_usage(mission_id, created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_route ON token_usage(route, created_at);

CREATE TABLE IF NOT EXISTS incoherences (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  kind TEXT NOT NULL
    CHECK(kind IN ('factual','scope_drift','constraint_change','hypothesis_invalidated')),
  severity TEXT NOT NULL DEFAULT 'moderate'
    CHECK(severity IN ('minor','moderate','major')),
  description TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  source_message_id TEXT,
  conflicting_entity_type TEXT NOT NULL,
  conflicting_entity_id TEXT NOT NULL,
  auto_resolution TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(resolution_status IN ('pending','auto_resolved','user_acknowledged','user_rejected','ignored')),
  resolved_at TEXT,
  resolved_by TEXT,
  briefed_to_user_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_incoherences_mission_pending ON incoherences(mission_id, resolution_status, created_at);
CREATE INDEX IF NOT EXISTS idx_incoherences_source ON incoherences(mission_id, source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_incoherences_briefed ON incoherences(mission_id, briefed_to_user_at);

-- =========================================================================
-- Chantier 4 (recalibration automatique + revert).
-- Chaque cycle de recalibration est tracé avec son snapshot avant / IDs des
-- tâches insérées après. Le revert restaure le snapshot.
-- =========================================================================

CREATE TABLE IF NOT EXISTS recalibrations (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  trigger TEXT NOT NULL
    CHECK(trigger IN ('manual','auto_on_incoherence','auto_on_input','scheduled')),
  trigger_ref TEXT,
  scope TEXT NOT NULL
    CHECK(scope IN ('full_plan','downstream_only','single_week')),
  changes_summary TEXT,
  snapshot_before TEXT,
  inserted_task_ids TEXT,
  tasks_added INTEGER NOT NULL DEFAULT 0,
  tasks_modified INTEGER NOT NULL DEFAULT 0,
  tasks_removed INTEGER NOT NULL DEFAULT 0,
  current_week INTEGER,
  reasoning TEXT,
  reverted_at TEXT,
  reverted_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_recalibrations_mission ON recalibrations(mission_id, created_at);
CREATE INDEX IF NOT EXISTS idx_recalibrations_trigger ON recalibrations(mission_id, trigger, created_at);

-- =========================================================================
-- Chantier 5 (briefing adaptatif). mission_visits stocke la date de dernière
-- visite par utilisateur + un cache de briefing (TTL 15 min côté lib).
-- =========================================================================

CREATE TABLE IF NOT EXISTS mission_visits (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  user_id TEXT NOT NULL DEFAULT 'paul',
  last_visit_at TEXT NOT NULL DEFAULT (datetime('now')),
  briefing_cache TEXT,
  briefing_cache_generated_at TEXT,
  UNIQUE(mission_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_mission_visits_mission ON mission_visits(mission_id, last_visit_at);

-- =========================================================================
-- Chantier 7 itération 1a (préparation WhatsApp — option C hybride).
-- Tables WhatsApp brutes + `agent_actions` qui est le journal narratif
-- unifié. Les contenus riches restent dans decisions/incoherences/
-- recalibrations (pointés via target_entity_type/_id).
-- =========================================================================

CREATE TABLE IF NOT EXISTS wa_conversations (
  id TEXT PRIMARY KEY,
  mission_id TEXT REFERENCES missions(id),
  phone_number TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wa_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES wa_conversations(id),
  direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
  type TEXT NOT NULL CHECK(type IN ('text','audio','image','document')),
  raw_content TEXT,
  blob_url TEXT,
  wa_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wa_messages_conv ON wa_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wa_messages_dedup ON wa_messages(wa_message_id);

CREATE TABLE IF NOT EXISTS agent_actions (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  source_message_id TEXT REFERENCES wa_messages(id),
  action_type TEXT NOT NULL CHECK(action_type IN (
    'create_task','update_task','update_deliverable',
    'add_context','create_decision','flag_incoherence',
    'recalibrate_plan','ask_user','noop'
  )),
  target_entity_type TEXT,
  target_entity_id TEXT,
  narrative TEXT NOT NULL,
  reasoning TEXT,
  before_state TEXT,
  after_state TEXT,
  confidence REAL,
  reverted_at TEXT,
  reverted_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_agent_actions_mission ON agent_actions(mission_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_actions_target ON agent_actions(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_source_msg ON agent_actions(source_message_id);

-- =========================================================================
-- Chantier 8 (indicateurs de temps libéré). Chaque ligne = une occurrence
-- d'activité automatisée avec sa conversion minutes-consultant (médianes
-- validées dans config/time-conversion.ts).
-- =========================================================================

CREATE TABLE IF NOT EXISTS time_savings (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  user_id TEXT NOT NULL DEFAULT 'paul',
  activity_type TEXT NOT NULL,
  estimated_minutes_saved INTEGER NOT NULL,
  source_entity_type TEXT,
  source_entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_time_savings_mission ON time_savings(mission_id, created_at);
CREATE INDEX IF NOT EXISTS idx_time_savings_activity ON time_savings(mission_id, activity_type);

-- =========================================================================
-- Chantier 5 (intégration Plaud). Les transcripts de réunion enregistrés
-- via Plaud arrivent en texte brut. Chaque transcript donne lieu à :
--   1) une row dans `plaud_transcripts` (metadata + raw_content + résumé)
--   2) une row dans `documents` (type='plaud') indexée en chunks RAG
--   3) N rows dans `plaud_signals` extraits par LLM (signaux structurels
--      decision/action/risk/opportunity + signaux émotionnels satisfaction/
--      frustration/uncertainty/tension/posture_shift)
-- =========================================================================

CREATE TABLE IF NOT EXISTS plaud_transcripts (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  document_id TEXT REFERENCES documents(id),
  author TEXT NOT NULL DEFAULT 'paul',
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  context_label TEXT,
  duration_seconds INTEGER,
  raw_content TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_plaud_transcripts_mission ON plaud_transcripts(mission_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS plaud_signals (
  id TEXT PRIMARY KEY,
  transcript_id TEXT NOT NULL REFERENCES plaud_transcripts(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  kind TEXT NOT NULL CHECK(kind IN
    ('decision','action','risk','opportunity',
     'satisfaction','frustration','uncertainty','tension','posture_shift')),
  content TEXT NOT NULL,
  intensity TEXT NOT NULL DEFAULT 'moderate'
    CHECK(intensity IN ('weak','moderate','strong')),
  subject TEXT,
  raw_excerpt TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_plaud_signals_mission_kind ON plaud_signals(mission_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plaud_signals_transcript ON plaud_signals(transcript_id);

-- Index composites mission-first (chantier 1)
CREATE INDEX IF NOT EXISTS idx_weeks_mission ON weeks(mission_id);
CREATE INDEX IF NOT EXISTS idx_tasks_mission_week ON tasks(mission_id, week_id);
CREATE INDEX IF NOT EXISTS idx_risks_mission ON risks(mission_id);
CREATE INDEX IF NOT EXISTS idx_livrables_mission_week ON livrables(mission_id, week_id);
CREATE INDEX IF NOT EXISTS idx_rapports_mission ON rapports(mission_id);
CREATE INDEX IF NOT EXISTS idx_events_mission_date ON events(mission_id, date);
CREATE INDEX IF NOT EXISTS idx_documents_mission ON documents(mission_id);
CREATE INDEX IF NOT EXISTS idx_generations_mission ON generations(mission_id, created_at);
CREATE INDEX IF NOT EXISTS idx_corrections_mission ON corrections(mission_id, generation_type);
CREATE INDEX IF NOT EXISTS idx_schedule_changes_mission ON schedule_changes(mission_id, week_id);

-- =========================================================================
-- LOT A v2 (squelette du plan). Introduction des entités `phases`,
-- `milestones`, `success_criteria`, `deliverable_iterations`.
-- Migration additive. FK nullables pendant la transition.
-- =========================================================================

CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  order_index INTEGER NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#A5D900',
  start_date TEXT,
  end_date TEXT,
  actual_start_date TEXT,
  actual_end_date TEXT,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK(status IN ('not_started','in_progress','completed','compromised')),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(mission_id, order_index)
);
CREATE INDEX IF NOT EXISTS idx_phases_mission ON phases(mission_id, order_index);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  phase_id TEXT NOT NULL REFERENCES phases(id),
  label TEXT NOT NULL,
  target_date TEXT,
  actual_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','reached','missed','postponed')),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_milestones_mission ON milestones(mission_id, target_date);
CREATE INDEX IF NOT EXISTS idx_milestones_phase ON milestones(phase_id);

CREATE TABLE IF NOT EXISTS success_criteria (
  id TEXT PRIMARY KEY,
  milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  assessment_type TEXT NOT NULL DEFAULT 'binary'
    CHECK(assessment_type IN ('binary','qualitative','quantitative')),
  target_value TEXT,
  current_value TEXT,
  status TEXT NOT NULL DEFAULT 'not_evaluated'
    CHECK(status IN ('not_evaluated','met','not_met','partially_met')),
  last_assessed_at TEXT,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_success_criteria_milestone ON success_criteria(milestone_id);

CREATE TABLE IF NOT EXISTS deliverable_iterations (
  id TEXT PRIMARY KEY,
  deliverable_id TEXT NOT NULL REFERENCES livrables(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  phase_id TEXT NOT NULL REFERENCES phases(id),
  order_index INTEGER NOT NULL,
  label_suffix TEXT,
  target_milestone_id TEXT REFERENCES milestones(id),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK(status IN ('planned','in_progress','blocked','delivered','validated')),
  target_date TEXT,
  actual_delivery_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(deliverable_id, order_index)
);
CREATE INDEX IF NOT EXISTS idx_iterations_deliverable ON deliverable_iterations(deliverable_id, order_index);
CREATE INDEX IF NOT EXISTS idx_iterations_phase ON deliverable_iterations(phase_id);
CREATE INDEX IF NOT EXISTS idx_iterations_mission ON deliverable_iterations(mission_id);

-- Ajouts aux tables existantes (additifs, nullable)
ALTER TABLE weeks ADD COLUMN phase_id TEXT REFERENCES phases(id);
ALTER TABLE livrables ADD COLUMN primary_phase_id TEXT REFERENCES phases(id);
ALTER TABLE livrables ADD COLUMN type TEXT NOT NULL DEFAULT 'intermediate'
  CHECK(type IN ('phase','intermediate','continuous'));
ALTER TABLE tasks ADD COLUMN iteration_id TEXT REFERENCES deliverable_iterations(id);

CREATE INDEX IF NOT EXISTS idx_weeks_phase ON weeks(phase_id);
CREATE INDEX IF NOT EXISTS idx_livrables_phase ON livrables(primary_phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_iteration ON tasks(iteration_id);

-- =========================================================================
-- LOT B v2 (palier d'arbitrage).
-- =========================================================================

CREATE TABLE IF NOT EXISTS intake_items (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  source_type TEXT NOT NULL
    CHECK(source_type IN ('cr_text','upload','capture','vocal','pdf','json','note','wa_message')),
  source_ref TEXT,
  raw_content_ref TEXT,
  raw_content_excerpt TEXT,
  parsed_content TEXT,
  parse_generation_id TEXT REFERENCES generations(id),
  status TEXT NOT NULL DEFAULT 'pending_parse'
    CHECK(status IN ('pending_parse','parsed','reviewed','archived')),
  ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
  parsed_at TEXT,
  reviewed_at TEXT,
  document_id TEXT REFERENCES documents(id),
  created_by TEXT NOT NULL DEFAULT 'paul'
);
CREATE INDEX IF NOT EXISTS idx_intake_items_mission ON intake_items(mission_id, ingested_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_items_status ON intake_items(mission_id, status);

CREATE TABLE IF NOT EXISTS plan_impacts (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES missions(id),
  intake_id TEXT REFERENCES intake_items(id),
  generation_id TEXT REFERENCES generations(id),
  target_type TEXT NOT NULL
    CHECK(target_type IN (
      'task','risk','livrable','iteration','phase','milestone',
      'success_criterion','decision','week','context_item'
    )),
  target_id TEXT,
  change_type TEXT NOT NULL
    CHECK(change_type IN ('add','modify','remove','reorder','reclassify','link','unlink')),
  diff_before TEXT,
  diff_after TEXT,
  rationale TEXT,
  confidence REAL,
  severity TEXT NOT NULL DEFAULT 'moderate'
    CHECK(severity IN ('minor','moderate','major')),
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK(status IN ('proposed','modified','accepted','rejected','superseded','auto_applied')),
  order_index INTEGER NOT NULL DEFAULT 0,
  decided_at TEXT,
  decided_by TEXT,
  agent_action_id TEXT REFERENCES agent_actions(id),
  superseded_by TEXT REFERENCES plan_impacts(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_plan_impacts_mission ON plan_impacts(mission_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_plan_impacts_intake ON plan_impacts(intake_id, order_index);
CREATE INDEX IF NOT EXISTS idx_plan_impacts_target ON plan_impacts(target_type, target_id);
