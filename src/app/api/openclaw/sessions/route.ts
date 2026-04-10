import { NextResponse } from 'next/server';
import { getOpenClawPaths, loadSessions } from '@/lib/openclaw';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Vercel serverless cannot read OpenClaw's on-disk session files.
    if (process.env.VERCEL) {
      return NextResponse.json({
        ok: false,
        error:
          'OpenClaw sessions are not available on Vercel. Run the dashboard on the OpenClaw host (Ampere server) and access it via SSH tunnel, or add a connector/ingestion bridge.',
      });
    }

    const { sessionsFile, transcriptsDir } = getOpenClawPaths();
    const sessions = await loadSessions();

    return NextResponse.json({
      ok: true,
      config: { sessionsFile, transcriptsDir },
      sessions,
      stats: {
        total: sessions.length,
        active: sessions.filter(s => s.active).length,
        groups: sessions.filter(s => s.kind === 'group').length,
        crons: sessions.filter(s => s.kind === 'cron').length,
        direct: sessions.filter(s => s.kind === 'direct').length,
      },
    });
  } catch (e: any) {
    // Return 200 with ok:false so UIs don't look like a broken deployment.
    return NextResponse.json({
      ok: false,
      error: e?.message ?? String(e),
    });
  }
}
