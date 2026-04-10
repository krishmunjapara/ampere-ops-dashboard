import { NextResponse } from 'next/server';
import { appendCronRun } from '@/lib/storage';

export const runtime = 'nodejs';

type Payload = {
  idempotencyKey: string;
  startedAt?: number;
  finishedAt?: number;
  status?: 'ok' | 'error';
  payload: {
    window: { sinceMinutes: number };
    ga4?: { propertyId?: string };
    ideas: Array<{ title: string; description: string; category?: string; sources?: string[] }>;
    notes?: string;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;
    if (!body?.idempotencyKey) {
      return NextResponse.json({ ok: false, error: 'Missing idempotencyKey' }, { status: 400 });
    }

    const now = Date.now();
    await appendCronRun({
      id: body.idempotencyKey,
      type: 'ux_ideas',
      started_at: body.startedAt ?? now,
      finished_at: body.finishedAt ?? now,
      status: body.status ?? 'ok',
      summary_json: JSON.stringify(body.payload),
      created_at: now,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
