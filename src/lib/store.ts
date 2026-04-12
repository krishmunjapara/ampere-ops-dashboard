import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Cross-platform local store.
 *
 * Why not SQLite?
 * - Native sqlite bindings (better-sqlite3) break on many Windows setups.
 * - WASM sqlite (sql.js) can break in Turbopack bundling.
 *
 * This store uses JSON/JSONL files in ./data/ (gitignored).
 */

type CronRunRow = {
  id: string;
  type: string;
  started_at: number;
  finished_at: number;
  status: string;
  summary_json: string;
  created_at: number;
};

type IdIndex = Record<string, number>; // id -> created_at

const DEFAULT_DATA_DIR = './data';

function dataDir() {
  return process.env.DASHBOARD_DATA_DIR?.trim() || DEFAULT_DATA_DIR;
}

function paths() {
  const dir = dataDir();
  return {
    dir,
    runsJsonl: path.join(dir, 'cron_runs.jsonl'),
    idIndex: path.join(dir, 'id_index.json'),
    signatures: path.join(dir, 'self_heal_signatures.json'),

    ocEventsJsonl: path.join(dir, 'openclaw_events.jsonl'),
    ocEventsIndex: path.join(dir, 'openclaw_events_index.json'),
    ocSessionsJson: path.join(dir, 'openclaw_sessions.json'),
  };
}

async function ensureDir() {
  await fs.mkdir(paths().dir, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(file: string, value: any) {
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

export async function appendCronRun(row: CronRunRow) {
  await ensureDir();
  const { runsJsonl, idIndex } = paths();

  const idx = await readJson<IdIndex>(idIndex, {});
  if (idx[row.id]) {
    // idempotent
    return;
  }

  // Append JSONL
  await fs.appendFile(runsJsonl, JSON.stringify(row) + '\n', 'utf8');
  idx[row.id] = row.created_at;
  await writeJsonAtomic(idIndex, idx);
}

export async function listCronRuns(params: { type?: string; limit: number }): Promise<CronRunRow[]> {
  await ensureDir();
  const { runsJsonl } = paths();

  let raw = '';
  try {
    raw = await fs.readFile(runsJsonl, 'utf8');
  } catch {
    return [];
  }

  const rows: CronRunRow[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as CronRunRow;
      if (params.type && row.type !== params.type) continue;
      rows.push(row);
    } catch {
      // skip bad line
    }
  }

  rows.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
  return rows.slice(0, params.limit);
}

type SignatureRow = {
  signature: string;
  status: string;
  first_seen?: number;
  last_seen?: number;
  last_count?: number;
  daily_branch?: string;
  daily_pr_url?: string;
  last_fix_commit_sha?: string;
};

export async function upsertSelfHealSignatures(
  sigs: SignatureRow[],
): Promise<void> {
  await ensureDir();
  const { signatures } = paths();

  const existing = await readJson<Record<string, SignatureRow>>(signatures, {});
  const now = Date.now();

  for (const s of sigs) {
    if (!s.signature) continue;
    const prev = existing[s.signature];
    existing[s.signature] = {
      signature: s.signature,
      status: s.status ?? prev?.status ?? 'new',
      first_seen: prev?.first_seen ?? s.first_seen ?? now,
      last_seen: Math.max(prev?.last_seen ?? 0, s.last_seen ?? now),
      last_count: s.last_count ?? prev?.last_count,
      daily_branch: s.daily_branch ?? prev?.daily_branch,
      daily_pr_url: s.daily_pr_url ?? prev?.daily_pr_url,
      last_fix_commit_sha: s.last_fix_commit_sha ?? prev?.last_fix_commit_sha,
    };
  }

  await writeJsonAtomic(signatures, existing);
}

// -------- OpenClaw activity (file store) --------

export type OpenClawSessionRow = {
  session_key: string;
  session_id: string;
  updated_at: number;
  kind?: string;
  provider?: string;
  surface?: string;
  chat_type?: string;
  last_channel?: string;
};

export type OpenClawEventRow = {
  event_id: string; // `${session_id}:${line}`
  session_key?: string;
  session_id: string;
  line: number;
  timestamp?: string;
  type?: string;
  role?: string;
  tool_name?: string;
  content_preview?: string;
  raw_json?: string;
  created_at: number;
};

export async function upsertOpenClawSessions(rows: OpenClawSessionRow[]) {
  await ensureDir();
  const { ocSessionsJson } = paths();

  const existing = await readJson<Record<string, OpenClawSessionRow>>(ocSessionsJson, {});
  for (const r of rows) {
    if (!r.session_key) continue;
    const prev = existing[r.session_key];
    existing[r.session_key] = {
      ...prev,
      ...r,
    };
  }
  await writeJsonAtomic(ocSessionsJson, existing);
}

export async function appendOpenClawEvents(rows: OpenClawEventRow[]) {
  await ensureDir();
  const { ocEventsJsonl, ocEventsIndex } = paths();

  const idx = await readJson<Record<string, number>>(ocEventsIndex, {});
  const toWrite: OpenClawEventRow[] = [];

  for (const r of rows) {
    if (!r.event_id) continue;
    if (idx[r.event_id]) continue;
    idx[r.event_id] = r.created_at;
    toWrite.push(r);
  }

  if (toWrite.length) {
    await fs.appendFile(ocEventsJsonl, toWrite.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
    await writeJsonAtomic(ocEventsIndex, idx);
  }
}

export async function listOpenClawEvents(params: { limit: number; sessionId?: string }): Promise<OpenClawEventRow[]> {
  await ensureDir();
  const { ocEventsJsonl } = paths();

  let raw = '';
  try {
    raw = await fs.readFile(ocEventsJsonl, 'utf8');
  } catch {
    return [];
  }

  const rows: OpenClawEventRow[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as OpenClawEventRow;
      if (params.sessionId && row.session_id !== params.sessionId) continue;
      rows.push(row);
    } catch {
      // skip
    }
  }

  rows.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
  return rows.slice(0, params.limit);
}

export async function listOpenClawSessions(): Promise<OpenClawSessionRow[]> {
  await ensureDir();
  const { ocSessionsJson } = paths();

  const obj = await readJson<Record<string, OpenClawSessionRow>>(ocSessionsJson, {});
  const rows = Object.values(obj);
  rows.sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0));
  return rows;
}
