'use client';

import { useEffect, useMemo, useState } from 'react';
import Pager from '@/components/Pager';

type EventRow = {
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
};

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function badge(kind: string | undefined) {
  const k = (kind ?? 'unknown').toLowerCase();
  const base = 'text-[11px] rounded-md border px-2 py-0.5';
  if (k.includes('tool')) return base + ' border-amber-500/30 bg-amber-500/10 text-amber-100';
  if (k.includes('assistant')) return base + ' border-sky-500/30 bg-sky-500/10 text-sky-100';
  if (k.includes('user')) return base + ' border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
  return base + ' border-white/10 bg-white/5 text-white/70';
}

function preview(e: EventRow) {
  if (e.tool_name) return `tool: ${e.tool_name}`;
  return e.content_preview ?? '';
}

export default function AgentWorkFeed() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [before, setBefore] = useState<number | null>(null);
  const [stack, setStack] = useState<number[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(pageBefore: number | null) {
    setLoading(true);
    try {
      const qsBefore = pageBefore ? `before=${pageBefore}&` : '';
      const res = await fetch(`/api/openclaw/activity?${qsBefore}limit=50`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? 'Failed');
        return;
      }
      setError(null);
      setEvents(json.events ?? []);
      setNextBefore(json.page?.nextBefore ?? null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(null);
  }, []);

  const grouped = useMemo(() => {
    // Simple grouping: show newest first.
    return events;
  }, [events]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2">
        <div className="text-xs font-semibold text-white/80">Agent work feed</div>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="text-[11px] rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/70 hover:text-white hover:border-white/20"
            onClick={() => {
              setBefore(null);
              setStack([]);
              load(null);
            }}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-3">
        {error ? <div className="text-sm text-red-300">{error}</div> : null}
        {!error && grouped.length === 0 ? (
          <div className="text-sm text-white/60">
            No activity ingested yet. Ensure the exporter cron is enabled on the Ampere server.
          </div>
        ) : null}

        <div className="space-y-2">
          {grouped.map(e => (
            <div key={e.event_id} className="rounded-lg border border-white/10 bg-black/20 p-2">
              <div className="flex items-center gap-2 text-[11px] text-white/50">
                <span className={badge(e.role || e.type)}>{e.role || e.type || 'event'}</span>
                <span className="truncate text-white/40">{e.session_key ?? e.session_id}</span>
                <span className="ml-auto">{formatTime(e.created_at)}</span>
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-white/80">
                {preview(e)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <Pager
            canPrev={stack.length > 0}
            canNext={Boolean(nextBefore) && grouped.length > 0}
            onPrev={() => {
              const prev = stack[stack.length - 1];
              if (prev == null) return;
              const newStack = stack.slice(0, -1);
              setStack(newStack);
              const cursor = prev === 0 ? null : prev;
              setBefore(cursor);
              load(cursor);
            }}
            onNext={() => {
              if (!nextBefore) return;
              setStack(s => [...s, before ?? 0]);
              setBefore(nextBefore);
              load(nextBefore);
            }}
            right={<div className="text-[11px] text-white/40">Page size: 50</div>}
          />
        </div>
      </div>
    </div>
  );
}
