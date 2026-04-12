import { NextResponse } from 'next/server';
import { listOpenClawEvents } from '@/lib/storage_openclaw';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));
    const sessionId = url.searchParams.get('sessionId') ?? undefined;
    const beforeRaw = url.searchParams.get('before');
    const before = beforeRaw ? Number(beforeRaw) : undefined;

    const events = await listOpenClawEvents({ limit, sessionId, before });
    const nextBefore = events.length ? events[events.length - 1]!.created_at : null;

    return NextResponse.json({ ok: true, events, page: { nextBefore } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
