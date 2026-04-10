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
