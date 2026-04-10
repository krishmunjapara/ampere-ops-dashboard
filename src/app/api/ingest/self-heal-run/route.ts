import { NextResponse } from 'next/server';
import { dbExec } from '@/lib/db';

export const runtime = 'nodejs';

type Payload = {
  idempotencyKey: string;
  startedAt?: number;
  finishedAt?: number;
  status?: 'ok' | 'error';
  digest: {
    sinceMinutes: number;
    topNew: Array<{ signature: string; count: number }>;
    topRecurring: Array<{ signature: string; count: number }>;
  };
  action?: {
    pickedSignature?: string;
    prUrl?: string;
    commitSha?: string;
    dailyBranch?: string;
  };
  signatures?: Array<{
    signature: string;
    status?: 'new' | 'pr_opened' | 'fixed' | 'ignored';
    firstSeen?: number;
    lastSeen?: number;
    lastCount?: number;
  }>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;
    if (!body?.idempotencyKey) {
      return NextResponse.json({ ok: false, error: 'Missing idempotencyKey' }, { status: 400 });
    }

    const now = Date.now();
    const id = body.idempotencyKey;
    const type = 'self_heal';
    const startedAt = body.startedAt ?? now;
    const finishedAt = body.finishedAt ?? now;
    const status = body.status ?? 'ok';
    const summary = {
      digest: body.digest,
      action: body.action ?? null,
    };

    await dbExec(db => {
      db.prepare(
        `INSERT OR IGNORE INTO cron_runs (id, type, started_at, finished_at, status, summary_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
      ).run([id, type, startedAt, finishedAt, status, JSON.stringify(summary), now]);

      const sigs = body.signatures ?? [];
      const up = db.prepare(
        `INSERT INTO self_heal_signatures (signature, status, first_seen, last_seen, last_count, daily_branch, daily_pr_url, last_fix_commit_sha)
         VALUES (@signature, @status, @first_seen, @last_seen, @last_count, @daily_branch, @daily_pr_url, @last_fix_commit_sha)
         ON CONFLICT(signature) DO UPDATE SET
           status=excluded.status,
           first_seen=COALESCE(self_heal_signatures.first_seen, excluded.first_seen),
           last_seen=MAX(COALESCE(self_heal_signatures.last_seen, 0), COALESCE(excluded.last_seen, 0)),
           last_count=COALESCE(excluded.last_count, self_heal_signatures.last_count),
           daily_branch=COALESCE(excluded.daily_branch, self_heal_signatures.daily_branch),
           daily_pr_url=COALESCE(excluded.daily_pr_url, self_heal_signatures.daily_pr_url),
           last_fix_commit_sha=COALESCE(excluded.last_fix_commit_sha, self_heal_signatures.last_fix_commit_sha);
        `,
      );

      for (const s of sigs) {
        if (!s.signature) continue;
        up.run({
          signature: s.signature,
          status: s.status ?? 'new',
          first_seen: s.firstSeen ?? now,
          last_seen: s.lastSeen ?? now,
          last_count: s.lastCount ?? null,
          daily_branch: body.action?.dailyBranch ?? null,
          daily_pr_url: body.action?.prUrl ?? null,
          last_fix_commit_sha: body.action?.commitSha ?? null,
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
