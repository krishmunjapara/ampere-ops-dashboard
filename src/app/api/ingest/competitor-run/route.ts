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

    // Dedupe ideas across runs (30d+) using DB-level seen_items.
    const ideas = body.payload?.ideas ?? [];
    const kept: typeof ideas = [];
    let dropped = 0;

    for (const it of ideas) {
      const keyInput = {
        title: it.title?.trim() ?? '',
        description: it.description?.trim() ?? '',
        sources: (it.sources ?? []).slice().sort(),
      };
      const itemKey = crypto.createHash('sha256').update(JSON.stringify(keyInput)).digest('hex');

      const isNew = await markSeenItem({
        kind: 'competitor_idea',
        itemKey,
        now,
        meta: { title: it.title, sources: it.sources?.slice(0, 3) },
      });

      if (isNew) kept.push(it);
      else dropped += 1;
    }

    const payload: any = {
      ...body.payload,
      ideas: kept,
      notes: dropped ? `Deduped ${dropped} repeated ideas from prior runs.` : undefined,
    };

    await appendCronRun({
      id,
      type: 'competitor_intel',
      started_at: startedAt,
      finished_at: finishedAt,
      status,
      summary_json: JSON.stringify(payload),
      created_at: now,
    });

    return NextResponse.json({ ok: true, kept: kept.length, dropped });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
