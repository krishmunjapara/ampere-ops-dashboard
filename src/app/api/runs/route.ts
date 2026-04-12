import { NextResponse } from 'next/server';
import { listCronRuns } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const q = url.searchParams.get('q');
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 25)));

    // Cursor paging (default)
    const beforeRaw = url.searchParams.get('before') ?? url.searchParams.get('cursor');
    const before = beforeRaw ? Number(beforeRaw) : undefined;

    // Offset paging (optional)
    const offsetRaw = url.searchParams.get('offset');
    const offset = offsetRaw ? Math.max(0, Number(offsetRaw) || 0) : undefined;

    const rows = await listCronRuns({
      type: type ?? undefined,
      status: status ?? undefined,
      q: q ?? undefined,
      limit,
      before,
      offset,
    });
    const nextBefore = rows.length ? rows[rows.length - 1]!.created_at : null;

    return NextResponse.json({ ok: true, runs: rows, page: { nextBefore } });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
