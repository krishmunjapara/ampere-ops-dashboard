import { NextResponse } from 'next/server';
import { getOpenClawPaths, loadSessions } from '@/lib/openclaw';

export const runtime = 'nodejs';

export async function GET() {
  try {
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
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? String(e),
      },
      { status: 500 },
    );
  }
}
