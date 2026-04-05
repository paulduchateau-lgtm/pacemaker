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
  baseline_end_date TEXT
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
  completed_at TEXT
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
  mitigation TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS livrables (
  id TEXT PRIMARY KEY,
  week_id INTEGER NOT NULL REFERENCES weeks(id),
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planifié',
  delivery_date TEXT
);

CREATE TABLE IF NOT EXISTS rapports (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  etat TEXT NOT NULL,
  complexite TEXT NOT NULL DEFAULT 'moyenne',
  lot INTEGER NOT NULL DEFAULT 1,
  week_id INTEGER REFERENCES weeks(id)
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  week_id INTEGER NOT NULL,
  date TEXT NOT NULL DEFAULT (datetime('now')),
  content TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'autre',
  source TEXT NOT NULL DEFAULT 'manual',
  week_id INTEGER REFERENCES weeks(id),
  blob_url TEXT,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_docs_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON doc_chunks(doc_id);
CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx ON doc_chunks(libsql_vector_idx(embedding));
CREATE INDEX IF NOT EXISTS idx_schedule_changes_week ON schedule_changes(week_id);
