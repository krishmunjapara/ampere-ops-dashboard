import { NextResponse } from 'next/server';
import { loadTranscriptPage } from '@/lib/openclaw';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await ctx.params;
    const url = new URL(_req.url);
    const offset = url.searchParams.get('offset');
    const limit = url.searchParams.get('limit');

    const page = await loadTranscriptPage({
      sessionId,
      offset: offset ? Number(offset) : 0,
      limit: limit ? Number(limit) : 200,
    });

    return NextResponse.json({ ok: true, ...page });
  } catch (e: any) {
    // Return 200 with ok:false so missing OpenClaw files don’t present as "Internal Server Error".
    return NextResponse.json({
      ok: false,
      error: e?.message ?? String(e),
    });
  }
}
