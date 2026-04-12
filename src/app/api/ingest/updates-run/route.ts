import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { appendCronRun, markSeenItem } from '@/lib/storage';

export const runtime = 'nodejs';

type Payload = {
  idempotencyKey: string;
  startedAt?: number;
  finishedAt?: number;
  status?: 'ok' | 'error';
  payload: {
    sources: string[];
    updates: Array<{ title: string; summary: string; url?: string; platform?: string }>;
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

    const updates = body.payload?.updates ?? [];
    const kept: typeof updates = [];
    let dropped = 0;

    for (const u of updates) {
      const stableKey = u.url?.trim()
        ? `url:${u.url.trim()}`
        : crypto
            .createHash('sha256')
            .update(JSON.stringify({ title: u.title?.trim() ?? '', summary: u.summary?.trim() ?? '', platform: u.platform ?? '' }))
            .digest('hex');

      const itemKey = stableKey.startsWith('url:')
        ? crypto.createHash('sha256').update(stableKey).digest('hex')
        : stableKey;

      const isNew = await markSeenItem({
        kind: 'update_item',
        itemKey,
        now,
        meta: { title: u.title, url: u.url, platform: u.platform },
      });

      if (isNew) kept.push(u);
      else dropped += 1;
    }

    const payload: any = {
      ...body.payload,
      updates: kept,
      notes: dropped ? `Deduped ${dropped} repeated updates from prior runs.` : undefined,
    };

    await appendCronRun({
      id: body.idempotencyKey,
      type: 'updates_feed',
      started_at: body.startedAt ?? now,
      finished_at: body.finishedAt ?? now,
      status: body.status ?? 'ok',
      summary_json: JSON.stringify(payload),
      created_at: now,
    });

    return NextResponse.json({ ok: true, kept: kept.length, dropped });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
