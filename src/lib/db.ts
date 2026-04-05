import { createClient, type Client, type InValue, type InStatement } from "@libsql/client";

let _db: Client | null = null;

function getDb(): Client {
  if (!_db) {
    const url = (process.env.TURSO_DATABASE_URL || "").trim();
    const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim();
    if (!url) throw new Error("TURSO_DATABASE_URL is not set");
    _db = createClient({ url, authToken });
  }
  return _db;
}

export async function query(sql: string, args: InValue[] = []) {
  const result = await getDb().execute({ sql, args });
  return result.rows;
}

export async function execute(sql: string, args: InValue[] = []) {
  return getDb().execute({ sql, args });
}

export async function batch(statements: InStatement[]) {
  return getDb().batch(statements);
}

export default { get db() { return getDb(); } };
