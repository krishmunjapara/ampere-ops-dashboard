import { NextResponse } from 'next/server';
import { appendCronRun, upsertSelfHealSignatures } from '@/lib/storage';

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

    await appendCronRun({
      id,
      type,
      started_at: startedAt,
      finished_at: finishedAt,
      status,
      summary_json: JSON.stringify(summary),
      created_at: now,
    });

    const sigs = body.signatures ?? [];
    await upsertSelfHealSignatures(
      sigs.map(s => ({
        signature: s.signature,
        status: s.status ?? 'new',
        first_seen: s.firstSeen ?? now,
        last_seen: s.lastSeen ?? now,
        last_count: s.lastCount,
        daily_branch: body.action?.dailyBranch,
        daily_pr_url: body.action?.prUrl,
        last_fix_commit_sha: body.action?.commitSha,
      })),
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
