import { NextResponse } from 'next/server';
import { appendCronRun } from '@/lib/store';

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

    await appendCronRun({
      id,
      type: 'competitor_intel',
      started_at: startedAt,
      finished_at: finishedAt,
      status,
      summary_json: JSON.stringify(body.payload),
      created_at: now,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
