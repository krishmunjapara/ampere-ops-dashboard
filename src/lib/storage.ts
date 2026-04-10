import { neon } from '@neondatabase/serverless';
import { appendCronRun as appendCronRunFile, listCronRuns as listCronRunsFile, upsertSelfHealSignatures as upsertSelfHealSignaturesFile } from '@/lib/store';

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

  // Minimal schema for our needs.
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

export async function listCronRuns(params: { type?: string; limit: number }): Promise<CronRunRow[]> {
  if (shouldUseFileStore()) {
    return listCronRunsFile(params);
  }

  const url = getDatabaseUrl();
  const sql = neon(url);
  await migrate(sql);

  if (params.type) {
    const rows = await sql`
      SELECT id, type, started_at, finished_at, status, summary_json, created_at
      FROM cron_runs
      WHERE type = ${params.type}
      ORDER BY created_at DESC
      LIMIT ${params.limit};
    `;
    return rows as CronRunRow[];
  }

  const rows = await sql`
    SELECT id, type, started_at, finished_at, status, summary_json, created_at
    FROM cron_runs
    ORDER BY created_at DESC
    LIMIT ${params.limit};
  `;
  return rows as CronRunRow[];
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
