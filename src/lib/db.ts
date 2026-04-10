import fs from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';

const DEFAULT_DB_PATH = './data/dashboard.sqlite';

function getDbPath() {
  return process.env.DASHBOARD_DB_PATH?.trim() || DEFAULT_DB_PATH;
}

let _db: Database.Database | null = null;
let _dbPath: string | null = null;

async function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

function migrate(db: Database.Database) {
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS cron_runs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      started_at INTEGER,
      finished_at INTEGER,
      status TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS self_heal_signatures (
      signature TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      first_seen INTEGER,
      last_seen INTEGER,
      last_count INTEGER,
      daily_branch TEXT,
      daily_pr_url TEXT,
      last_fix_commit_sha TEXT
    );

    CREATE TABLE IF NOT EXISTS competitor_runs (
      id TEXT PRIMARY KEY,
      started_at INTEGER,
      finished_at INTEGER,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}

export async function getDb() {
  const dbPath = getDbPath();

  if (_db && _dbPath === dbPath) {
    return { db: _db, dbPath };
  }

  await ensureDir(dbPath);
  const db = new Database(dbPath);
  migrate(db);

  _db = db;
  _dbPath = dbPath;

  return { db, dbPath };
}

export async function dbExec(writeFn: (db: Database.Database) => void) {
  const { db } = await getDb();
  writeFn(db);
}

export async function dbQuery<T = any>(queryFn: (db: Database.Database) => T): Promise<T> {
  const { db } = await getDb();
  return queryFn(db);
}

export function rowsFromStmt<T = any>(stmt: Database.Statement<any[]>) {
  return stmt.all() as T[];
}
