import { NextResponse } from 'next/server';
import { loadTranscriptPage } from '@/lib/openclaw';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  try {
    // Vercel serverless cannot read OpenClaw's on-disk transcript files.
    if (process.env.VERCEL) {
      return NextResponse.json({
        ok: false,
        error:
          'OpenClaw transcripts are not available on Vercel. Run the dashboard on the OpenClaw host (Ampere server) and access it via SSH tunnel, or add a connector/ingestion bridge.',
      });
    }

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
    return NextResponse.json({
      ok: false,
      error: e?.message ?? String(e),
    });
  }
}
