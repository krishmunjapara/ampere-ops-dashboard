import { neon } from '@neondatabase/serverless';
import {
  appendOpenClawEvents as appendOpenClawEventsFile,
  listOpenClawEvents as listOpenClawEventsFile,
  listOpenClawSessions as listOpenClawSessionsFile,
  upsertOpenClawSessions as upsertOpenClawSessionsFile,
} from '@/lib/store';
import type { OpenClawEventRow, OpenClawSessionRow } from '@/lib/storage';

function getDatabaseUrl() {
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

  _migrated = true;
}

export async function upsertOpenClawSessions(rows: OpenClawSessionRow[]) {
  if (shouldUseFileStore()) {
    return upsertOpenClawSessionsFile(rows);
  }

  const url = getDatabaseUrl();
  const sql = neon(url);
  await migrate(sql);

  for (const r of rows) {
    if (!r.session_key) continue;
    await sql`
      INSERT INTO openclaw_sessions (session_key, session_id, updated_at, kind, provider, surface, chat_type, last_channel)
      VALUES (
        ${r.session_key}, ${r.session_id}, ${r.updated_at},
        ${r.kind ?? null}, ${r.provider ?? null}, ${r.surface ?? null}, ${r.chat_type ?? null}, ${r.last_channel ?? null}
      )
      ON CONFLICT (session_key) DO UPDATE SET
        session_id = EXCLUDED.session_id,
        updated_at = EXCLUDED.updated_at,
        kind = COALESCE(EXCLUDED.kind, openclaw_sessions.kind),
        provider = COALESCE(EXCLUDED.provider, openclaw_sessions.provider),
        surface = COALESCE(EXCLUDED.surface, openclaw_sessions.surface),
        chat_type = COALESCE(EXCLUDED.chat_type, openclaw_sessions.chat_type),
        last_channel = COALESCE(EXCLUDED.last_channel, openclaw_sessions.last_channel);
    `;
  }
}

export async function appendOpenClawEvents(rows: OpenClawEventRow[]) {
  if (shouldUseFileStore()) {
    return appendOpenClawEventsFile(rows);
  }

  const url = getDatabaseUrl();
  const sql = neon(url);
  await migrate(sql);

  for (const r of rows) {
    if (!r.event_id) continue;
    await sql`
      INSERT INTO openclaw_events (
        event_id, session_key, session_id, line, timestamp, type, role, tool_name, content_preview, raw_json, created_at
      ) VALUES (
        ${r.event_id}, ${r.session_key ?? null}, ${r.session_id}, ${r.line},
        ${r.timestamp ?? null}, ${r.type ?? null}, ${r.role ?? null}, ${r.tool_name ?? null},
        ${r.content_preview ?? null}, ${r.raw_json ?? null}, ${r.created_at}
      )
      ON CONFLICT (event_id) DO NOTHING;
    `;
  }
}

export async function listOpenClawEvents(params: { limit: number; sessionId?: string }): Promise<OpenClawEventRow[]> {
  if (shouldUseFileStore()) {
    return listOpenClawEventsFile(params);
  }

  const url = getDatabaseUrl();
  const sql = neon(url);
  await migrate(sql);

  if (params.sessionId) {
    const rows = await sql`
      SELECT event_id, session_key, session_id, line, timestamp, type, role, tool_name, content_preview, raw_json, created_at
      FROM openclaw_events
      WHERE session_id = ${params.sessionId}
      ORDER BY created_at DESC
      LIMIT ${params.limit};
    `;
    return rows as OpenClawEventRow[];
  }

  const rows = await sql`
    SELECT event_id, session_key, session_id, line, timestamp, type, role, tool_name, content_preview, raw_json, created_at
    FROM openclaw_events
    ORDER BY created_at DESC
    LIMIT ${params.limit};
  `;
  return rows as OpenClawEventRow[];
}

export async function listOpenClawSessions(): Promise<OpenClawSessionRow[]> {
  if (shouldUseFileStore()) {
    return listOpenClawSessionsFile();
  }

  const url = getDatabaseUrl();
  const sql = neon(url);
  await migrate(sql);

  const rows = await sql`
    SELECT session_key, session_id, updated_at, kind, provider, surface, chat_type, last_channel
    FROM openclaw_sessions
    ORDER BY updated_at DESC
    LIMIT 500;
  `;
  return rows as OpenClawSessionRow[];
}
