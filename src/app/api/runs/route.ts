import { NextResponse } from 'next/server';
import { listCronRuns } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 25)));
    const beforeRaw = url.searchParams.get('before');
    const before = beforeRaw ? Number(beforeRaw) : undefined;

    const rows = await listCronRuns({ type: type ?? undefined, limit, before });
    const nextBefore = rows.length ? rows[rows.length - 1]!.created_at : null;

    return NextResponse.json({ ok: true, runs: rows, page: { nextBefore } });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
