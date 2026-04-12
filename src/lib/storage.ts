import { neon } from '@neondatabase/serverless';
import {
  appendCronRun as appendCronRunFile,
  listCronRuns as listCronRunsFile,
  getCronRunById as getCronRunByIdFile,
  upsertSelfHealSignatures as upsertSelfHealSignaturesFile,
  appendOpenClawEvents as appendOpenClawEventsFile,
  listOpenClawEvents as listOpenClawEventsFile,
  listOpenClawSessions as listOpenClawSessionsFile,
  upsertOpenClawSessions as upsertOpenClawSessionsFile,
} from '@/lib/store';

export type CronRunRow = {
  id: string;
  type: string;
  started_at: number;
  finished_at: number;
  status: string;
  summary_json: string;
  created_at: number;
};

export type SignatureRow = {
  signature: string;
  status: string;
  first_seen?: number;
  last_seen?: number;
  last_count?: number;
  daily_branch?: string;
  daily_pr_url?: string;
  last_fix_commit_sha?: string;
};

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

function getDatabaseUrl() {
  // Common envs across Vercel/Neon + local overrides.
  return (
    process.env.DASHBOARD_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    ''
  );
}

function shouldUseFileStore() {
  if (process.env.DASHBOARD_USE_FILE_STORE === 'true') return true;
  return !getDatabaseUrl();
}

let _migrated = false;
async function migrate(sql: any) {
  if (_migrated) return;

  // Neon serverless doesn't allow multiple SQL commands per prepared statement.
  await sql`
    CREATE TABLE IF NOT EXISTS cron_runs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      started_at BIGINT,
      finished_at BIGINT,
      status TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS self_heal_signatures (
      signature TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      first_seen BIGINT,
      last_seen BIGINT,
      last_count BIGINT,
      daily_branch TEXT,
      daily_pr_url TEXT,
      last_fix_commit_sha TEXT
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS openclaw_sessions (
      session_key TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      updated_at BIGINT NOT NULL,
      kind TEXT,
      provider TEXT,
      surface TEXT,
      chat_type TEXT,
      last_channel TEXT
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS openclaw_events (
      event_id TEXT PRIMARY KEY,
      session_key TEXT,
      session_id TEXT NOT NULL,
      line BIGINT NOT NULL,
      timestamp TEXT,
      type TEXT,
      role TEXT,
      tool_name TEXT,
      content_preview TEXT,
      raw_json TEXT,
      created_at BIGINT NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS seen_items (
      kind TEXT NOT NULL,
      item_key TEXT NOT NULL,
      first_seen BIGINT NOT NULL,
      last_seen BIGINT NOT NULL,
      seen_count BIGINT NOT NULL,
      meta_json TEXT,
      PRIMARY KEY (kind, item_key)
    );
  `;

  _migrated = true;
}

export async function appendCronRun(row: CronRunRow) {
  if (shouldUseFileStore()) {
    return appendCronRunFile(row);
  }

  const url = getDatabaseUrl();
  const sql = neon(url);
  await migrate(sql);

  await sql`
    INSERT INTO cron_runs (id, type, started_at, finished_at, status, summary_json, created_at)
    VALUES (${row.id}, ${row.type}, ${row.started_at}, ${row.finished_at}, ${row.status}, ${row.summary_json}, ${row.created_at})
    ON CONFLICT (id) DO NOTHING;
  `;
}

function asNumber(v: any): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRunRow(r: any): CronRunRow {
  return {
    id: String(r.id),
    type: String(r.type),
    started_at: asNumber(r.started_at),
    finished_at: asNumber(r.finished_at),
    status: String(r.status),
    summary_json: String(r.summary_json),
    created_at: asNumber(r.created_at),
  };
}

export async function listCronRuns(params: {
  type?: string;
  status?: string;
  q?: string;
  limit: number;
  before?: number;
  offset?: number;
}): Promise<CronRunRow[]> {
  if (shouldUseFileStore()) {
    return listCronRunsFile(params as any);
  }

  const url = getDatabaseUrl();
  const sql = neon(url);
  await migrate(sql);

  const before = params.before ?? null;
  const offset = Math.max(0, Number(params.offset ?? 0) || 0);
  const q = (params.q ?? '').trim();

  // Neon template tags don't support dynamic WHERE composition elegantly;
  // keep it simple with explicit branches.
  if (params.type || params.status || q) {
    const type = params.type ?? null;
    const status = params.status ?? null;
    const qLike = q ? `%${q}%` : null;

    const rows = await sql`
      SELECT id, type, started_at, finished_at, status, summary_json, created_at
      FROM cron_runs
      WHERE (${type}::text IS NULL OR type = ${type})
        AND (${status}::text IS NULL OR status = ${status})
        AND (${qLike}::text IS NULL OR summary_json ILIKE ${qLike})
        AND (${before}::bigint IS NULL OR created_at < ${before})
      ORDER BY created_at DESC
      OFFSET ${offset}
      LIMIT ${params.limit};
    `;
    return (rows as any[]).map(normalizeRunRow);
  }

  const rows = await sql`
    SELECT id, type, started_at, finished_at, status, summary_json, created_at
    FROM cron_runs
    WHERE (${before}::bigint IS NULL OR created_at < ${before})
    ORDER BY created_at DESC
    OFFSET ${offset}
    LIMIT ${params.limit};
  `;
  return (rows as any[]).map(normalizeRunRow);
}

export async function getCronRunById(id: string): Promise<CronRunRow | null> {
  if (!id) return null;

  if (shouldUseFileStore()) {
    return getCronRunByIdFile(id) as any;
  }

  const url = getDatabaseUrl();
  const sql = neon(url);
  await migrate(sql);

  const rows = await sql`
    SELECT id, type, started_at, finished_at, status, summary_json, created_at
    FROM cron_runs
    WHERE id = ${id}
    LIMIT 1;
  `;

  const r = (rows as any[])[0];
  return r ? normalizeRunRow(r) : null;
}

export async function upsertSelfHealSignatures(sigs: SignatureRow[]) {
  if (shouldUseFileStore()) {
    return upsertSelfHealSignaturesFile(sigs);
  }

  const url = getDatabaseUrl();
  const sql = neon(url);
  await migrate(sql);

  for (const s of sigs) {
    if (!s.signature) continue;
    await sql`
      INSERT INTO self_heal_signatures (
        signature, status, first_seen, last_seen, last_count, daily_branch, daily_pr_url, last_fix_commit_sha
      ) VALUES (
        ${s.signature}, ${s.status}, ${s.first_seen ?? null}, ${s.last_seen ?? null}, ${s.last_count ?? null},
        ${s.daily_branch ?? null}, ${s.daily_pr_url ?? null}, ${s.last_fix_commit_sha ?? null}
      )
      ON CONFLICT (signature) DO UPDATE SET
        status = EXCLUDED.status,
        first_seen = COALESCE(self_heal_signatures.first_seen, EXCLUDED.first_seen),
        last_seen = GREATEST(COALESCE(self_heal_signatures.last_seen, 0), COALESCE(EXCLUDED.last_seen, 0)),
        last_count = COALESCE(EXCLUDED.last_count, self_heal_signatures.last_count),
        daily_branch = COALESCE(EXCLUDED.daily_branch, self_heal_signatures.daily_branch),
        daily_pr_url = COALESCE(EXCLUDED.daily_pr_url, self_heal_signatures.daily_pr_url),
        last_fix_commit_sha = COALESCE(EXCLUDED.last_fix_commit_sha, self_heal_signatures.last_fix_commit_sha);
    `;
  }
}

export async function markSeenItem(params: {
  kind: string;
  itemKey: string;
  now: number;
  meta?: any;
}): Promise<boolean> {
  // returns true if it was NEW, false if it already existed

  if (shouldUseFileStore()) {
    // file-store doesn't enforce cross-run dedupe reliably on Vercel; rely on postgres mode.
    return true;
  }

  const url = getDatabaseUrl();
  const sql = neon(url);
  await migrate(sql);

  const existing = await sql`
    SELECT item_key
    FROM seen_items
    WHERE kind = ${params.kind} AND item_key = ${params.itemKey}
    LIMIT 1;
  `;

  const isNew = (existing as any[]).length === 0;

  await sql`
    INSERT INTO seen_items (kind, item_key, first_seen, last_seen, seen_count, meta_json)
    VALUES (
      ${params.kind},
      ${params.itemKey},
      ${params.now},
      ${params.now},
      1,
      ${params.meta ? JSON.stringify(params.meta) : null}
    )
    ON CONFLICT (kind, item_key) DO UPDATE SET
      last_seen = EXCLUDED.last_seen,
      seen_count = seen_items.seen_count + 1,
      meta_json = COALESCE(EXCLUDED.meta_json, seen_items.meta_json);
  `;

  return isNew;
}
