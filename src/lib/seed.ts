import { execute } from "./db";
import { INITIAL_WEEKS, INITIAL_RISKS, BUDGET, RAPPORTS } from "@/config/mission";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS weeks (
    id INTEGER PRIMARY KEY, phase TEXT NOT NULL, title TEXT NOT NULL,
    budget_jh REAL NOT NULL DEFAULT 0, actions TEXT NOT NULL DEFAULT '[]',
    livrables_plan TEXT NOT NULL DEFAULT '[]', owner TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, week_id INTEGER NOT NULL REFERENCES weeks(id),
    label TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    owner TEXT NOT NULL DEFAULT 'Paul',
    priority TEXT NOT NULL DEFAULT 'moyenne', status TEXT NOT NULL DEFAULT '\u00e0 faire',
    source TEXT NOT NULL DEFAULT 'manual', jh_estime REAL,
    livrables_generes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS task_attachments (
    id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    filename TEXT NOT NULL, blob_url TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS risks (
    id TEXT PRIMARY KEY, label TEXT NOT NULL,
    impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
    probability INTEGER NOT NULL CHECK (probability BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'actif', mitigation TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS livrables (
    id TEXT PRIMARY KEY, week_id INTEGER NOT NULL REFERENCES weeks(id),
    label TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'planifi\u00e9'
  )`,
  `CREATE TABLE IF NOT EXISTS rapports (
    id TEXT PRIMARY KEY, label TEXT NOT NULL, etat TEXT NOT NULL,
    complexite TEXT NOT NULL DEFAULT 'moyenne', lot INTEGER NOT NULL DEFAULT 1,
    week_id INTEGER REFERENCES weeks(id)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, label TEXT NOT NULL,
    week_id INTEGER NOT NULL, date TEXT NOT NULL DEFAULT (datetime('now')),
    content TEXT DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS project (
    key TEXT PRIMARY KEY, value TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_week ON tasks(week_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_task_attachments ON task_attachments(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_livrables_week ON livrables(week_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`,
  `CREATE INDEX IF NOT EXISTS idx_rapports_lot ON rapports(lot)`,
  `CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'autre',
    source TEXT NOT NULL DEFAULT 'manual', week_id INTEGER,
    blob_url TEXT, content TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS doc_chunks (
    id TEXT PRIMARY KEY, doc_id TEXT NOT NULL REFERENCES documents(id),
    chunk_index INTEGER NOT NULL, content TEXT NOT NULL,
    embedding F32_BLOB(1024)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc ON doc_chunks(doc_id)`,
];

export async function seed() {
  // Create tables
  for (const sql of CREATE_TABLES) {
    await execute(sql);
  }

  // Weeks
  for (const week of INITIAL_WEEKS) {
    await execute(
      `INSERT OR REPLACE INTO weeks (id, phase, title, budget_jh, actions, livrables_plan, owner)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        week.id, week.phase, week.title, week.budget_jh,
        JSON.stringify(week.actions), JSON.stringify(week.livrables), week.owner,
      ]
    );
  }

  // Livrables
  for (const week of INITIAL_WEEKS) {
    for (const label of week.livrables) {
      await execute(
        `INSERT OR REPLACE INTO livrables (id, week_id, label, status) VALUES (?, ?, ?, 'planifi\u00e9')`,
        [generateId(), week.id, label]
      );
    }
  }

  // Risks
  for (const risk of INITIAL_RISKS) {
    await execute(
      `INSERT OR REPLACE INTO risks (id, label, impact, probability, status, mitigation)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [risk.id, risk.label, risk.impact, risk.probability, risk.status, risk.mitigation]
    );
  }

  // Rapports
  for (const rapport of RAPPORTS) {
    await execute(
      `INSERT OR REPLACE INTO rapports (id, label, etat, complexite, lot, week_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [rapport.id, rapport.label, rapport.etat, rapport.complexite, rapport.lot, rapport.weekId]
    );
  }

  // Project state
  await execute(
    `INSERT OR REPLACE INTO project (key, value) VALUES ('budget', ?)`,
    [JSON.stringify(BUDGET)]
  );
  await execute(
    `INSERT OR REPLACE INTO project (key, value) VALUES ('current_week', '1')`
  );
  await execute(
    `INSERT OR REPLACE INTO project (key, value) VALUES ('jh_consommes', '0')`
  );
}
