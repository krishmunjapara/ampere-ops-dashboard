import { NextResponse } from 'next/server';
import { appendOpenClawEvents, upsertOpenClawSessions } from '@/lib/storage_openclaw';

export const runtime = 'nodejs';

type Payload = {
  idempotencyKey: string;
  payload: {
    sessions?: Array<{
      session_key: string;
      session_id: string;
      updated_at: number;
      kind?: string;
      provider?: string;
      surface?: string;
      chat_type?: string;
      last_channel?: string;
    }>;
    events?: Array<{
      event_id: string;
      session_key?: string;
      session_id: string;
      line: number;
      timestamp?: string;
      type?: string;
      role?: string;
      tool_name?: string;
      content_preview?: string;
      raw_json?: string;
      created_at: number;
    }>;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;
    if (!body?.idempotencyKey) {
      return NextResponse.json({ ok: false, error: 'Missing idempotencyKey' }, { status: 400 });
    }

    const sessions = body.payload?.sessions ?? [];
    const events = body.payload?.events ?? [];

    if (sessions.length) await upsertOpenClawSessions(sessions);
    if (events.length) await appendOpenClawEvents(events);

    return NextResponse.json({ ok: true, sessions: sessions.length, events: events.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
