import { NextResponse } from 'next/server';
import { dbExec } from '@/lib/db';

export const runtime = 'nodejs';

type Payload = {
  idempotencyKey: string;
  startedAt?: number;
  finishedAt?: number;
  status?: 'ok' | 'error';
  payload: {
    competitors: Array<{ name: string; url?: string; source?: string }>;
    ideas: Array<{ title: string; description: string; category?: string; sources?: string[] }>;
    sources?: string[];
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;
    if (!body?.idempotencyKey) {
      return NextResponse.json({ ok: false, error: 'Missing idempotencyKey' }, { status: 400 });
    }

    const now = Date.now();
    const id = body.idempotencyKey;
    const startedAt = body.startedAt ?? now;
    const finishedAt = body.finishedAt ?? now;
    const status = body.status ?? 'ok';

    await dbExec(db => {
      db.prepare(
        `INSERT OR IGNORE INTO competitor_runs (id, started_at, finished_at, status, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
      ).run([id, startedAt, finishedAt, status, JSON.stringify(body.payload), now]);

      db.prepare(
        `INSERT OR IGNORE INTO cron_runs (id, type, started_at, finished_at, status, summary_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
      ).run([id, 'competitor_intel', startedAt, finishedAt, status, JSON.stringify(body.payload), now]);
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
