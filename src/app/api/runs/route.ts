import { NextResponse } from 'next/server';
import { dbQuery, rowsFromStmt } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));

    const rows = await dbQuery(db => {
      if (type) {
        const q = db.prepare(
          `SELECT id, type, started_at, finished_at, status, summary_json, created_at
           FROM cron_runs
           WHERE type = ?
           ORDER BY created_at DESC
           LIMIT ?;`,
        );
        return rowsFromStmt(q.bind(type, limit));
      }

      const q = db.prepare(
        `SELECT id, type, started_at, finished_at, status, summary_json, created_at
         FROM cron_runs
         ORDER BY created_at DESC
         LIMIT ?;`,
      );
      return rowsFromStmt(q.bind(limit));
    });

    return NextResponse.json({ ok: true, runs: rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
