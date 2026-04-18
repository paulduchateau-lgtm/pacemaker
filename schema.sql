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
  mission_id TEXT REFERENCES missions(id)
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
  mission_id TEXT REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS livrables (
  id TEXT PRIMARY KEY,
  week_id INTEGER NOT NULL REFERENCES weeks(id),
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planifié',
  delivery_date TEXT,
  mission_id TEXT REFERENCES missions(id)
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
  mission_id TEXT REFERENCES missions(id)
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
