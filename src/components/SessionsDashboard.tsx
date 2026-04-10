'use client';

import { useEffect, useMemo, useState } from 'react';

type SessionKind = 'direct' | 'group' | 'cron' | 'unknown';

type SessionSummary = {
  sessionKey: string;
  sessionId: string;
  updatedAt: number;
  origin?: { provider?: string; surface?: string; chatType?: string };
  kind: SessionKind;
  active: boolean;
};

type TranscriptEntry = {
  line: number;
  role?: string;
  type?: string;
  contentPreview?: string;
  ts?: number;
  raw: any;
};

type SessionsResponse = {
  ok: boolean;
  error?: string;
  config?: { sessionsFile: string; transcriptsDir: string };
  stats?: { total: number; active: number; groups: number; crons: number; direct: number };
  sessions?: SessionSummary[];
};

type TranscriptResponse = {
  ok: boolean;
  error?: string;
  sessionId?: string;
  file?: string;
  offset?: number;
  limit?: number;
  nextOffset?: number | null;
  entries?: TranscriptEntry[];
};

const FILTERS: { key: string; label: string; match: (s: SessionSummary) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'active', label: 'Active', match: s => s.active },
  { key: 'recent', label: 'Recent', match: s => Date.now() - s.updatedAt < 2 * 60 * 60 * 1000 },
  { key: 'groups', label: 'Groups', match: s => s.kind === 'group' },
  { key: 'crons', label: 'Crons', match: s => s.kind === 'cron' },
  { key: 'direct', label: 'Direct', match: s => s.kind === 'direct' },
];

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function pillClass(active: boolean) {
  return [
    'text-xs px-3 py-1 rounded-full border transition',
    active
      ? 'bg-white/10 border-white/20 text-white'
      : 'bg-transparent border-white/10 text-white/70 hover:text-white hover:border-white/20',
  ].join(' ');
}

export default function SessionsDashboard() {
  const [filter, setFilter] = useState('all');
  const [sessionsRes, setSessionsRes] = useState<SessionsResponse>({ ok: false });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSessionKey, setSelectedSessionKey] = useState<string | null>(null);

  const [transcriptRes, setTranscriptRes] = useState<TranscriptResponse>({ ok: false });
  const [transcriptOffset, setTranscriptOffset] = useState(0);

  // Poll sessions.
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch('/api/openclaw/sessions', { cache: 'no-store' });
        const json = (await res.json()) as SessionsResponse;
        if (!alive) return;
        setSessionsRes(json);

        // Auto-select first session if nothing selected.
        const first = json.sessions?.[0];
        if (!selectedSessionId && first?.sessionId) {
          setSelectedSessionId(first.sessionId);
          setSelectedSessionKey(first.sessionKey);
        }
      } catch (e: any) {
        if (!alive) return;
        setSessionsRes({ ok: false, error: e?.message ?? String(e) });
      }
    }

    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  const sessions = sessionsRes.sessions ?? [];
  const filtered = useMemo(() => {
    const f = FILTERS.find(x => x.key === filter) ?? FILTERS[0];
    return sessions.filter(f.match);
  }, [sessions, filter]);

  // Load transcript when selection changes.
  useEffect(() => {
    if (!selectedSessionId) return;
    const sid = selectedSessionId;
    let alive = true;

    async function loadTranscript() {
      try {
        const url = `/api/openclaw/transcript/${encodeURIComponent(sid)}?offset=${transcriptOffset}&limit=200`;
        const res = await fetch(url, { cache: 'no-store' });
        const json = (await res.json()) as TranscriptResponse;
        if (!alive) return;
        setTranscriptRes(json);
      } catch (e: any) {
        if (!alive) return;
        setTranscriptRes({ ok: false, error: e?.message ?? String(e) });
      }
    }

    loadTranscript();
    return () => {
      alive = false;
    };
  }, [selectedSessionId, transcriptOffset]);

  const stats = sessionsRes.stats;

  const sessionsError = !sessionsRes.ok ? (sessionsRes.error ?? 'Failed to load sessions') : null;
  const looksLikeMissingFiles = sessionsError ? /ENOENT|no such file|EACCES|permission/i.test(sessionsError) : false;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-semibold">Sessions</div>
          <div className="ml-auto flex items-center gap-3 text-xs text-white/70">
            <div className="rounded-md border border-white/10 px-2 py-1">
              total: <span className="text-white">{stats?.total ?? '—'}</span>
            </div>
            <div className="rounded-md border border-white/10 px-2 py-1">
              active: <span className="text-white">{stats?.active ?? '—'}</span>
            </div>
            <div className="rounded-md border border-white/10 px-2 py-1">
              crons: <span className="text-white">{stats?.crons ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {FILTERS.map(f => (
            <button key={f.key} className={pillClass(filter === f.key)} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
          <div className="ml-auto text-[11px] text-white/40">
            {sessionsRes.config?.sessionsFile ? <span>source: {sessionsRes.config.sessionsFile}</span> : null}
          </div>
        </div>

        {sessionsError ? (
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            <div className="font-semibold">Sessions API error</div>
            <div className="mt-1 font-mono text-[12px] text-red-200/90 break-words">{sessionsError}</div>

            {looksLikeMissingFiles ? (
              <div className="mt-2 text-[12px] text-red-100/80">
                This happens when you run the dashboard on a machine that does not have OpenClaw session files (common on Windows/Vercel).
                To see live sessions, run the dashboard on the OpenClaw host (Ampere server) and open it via SSH tunnel.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Session list */}
        <div className="col-span-5 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-3 py-2 text-xs font-semibold text-white/80">Session list</div>
          <div className="max-h-[calc(100vh-240px)] overflow-auto">
            {filtered.map(s => {
              const selected = s.sessionId === selectedSessionId;
              return (
                <button
                  key={s.sessionKey}
                  className={[
                    'w-full text-left px-3 py-2 border-b border-white/5 hover:bg-white/5',
                    selected ? 'bg-white/10' : '',
                  ].join(' ')}
                  onClick={() => {
                    setSelectedSessionId(s.sessionId);
                    setSelectedSessionKey(s.sessionKey);
                    setTranscriptOffset(0);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-white/70">{s.kind}</span>
                    <span className="truncate text-sm text-white/90">{s.sessionKey}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-white/50">
                    <span>{s.active ? 'active' : 'idle'}</span>
                    <span>•</span>
                    <span>{formatTime(s.updatedAt)}</span>
                  </div>
                </button>
              );
            })}
            {sessionsRes.ok && filtered.length === 0 ? (
              <div className="p-3 text-sm text-white/60">No sessions for this filter.</div>
            ) : null}
          </div>
        </div>

        {/* Transcript panel */}
        <div className="col-span-7 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2">
            <div className="text-xs font-semibold text-white/80">Transcript</div>
            <div className="truncate text-xs text-white/50">{selectedSessionKey ?? ''}</div>
            <div className="ml-auto flex items-center gap-2">
              <button className={pillClass(false)} onClick={() => setTranscriptOffset(o => Math.max(0, o - 200))} disabled={transcriptOffset === 0}>
                Prev
              </button>
              <button className={pillClass(false)} onClick={() => setTranscriptOffset(o => o + 200)} disabled={!transcriptRes.ok || !transcriptRes.nextOffset}>
                Next
              </button>
              <button className={pillClass(false)} onClick={() => setTranscriptOffset(0)}>
                Top
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-240px)] overflow-auto p-3">
            {!selectedSessionId ? <div className="text-sm text-white/60">Select a session</div> : null}

            {selectedSessionId && !transcriptRes.ok ? (
              <div className="text-sm text-red-300">{transcriptRes.error ?? 'Failed to load transcript'}</div>
            ) : null}

            {transcriptRes.ok && transcriptRes.entries ? (
              <div className="space-y-2">
                <div className="text-[11px] text-white/40">file: {transcriptRes.file} • offset: {transcriptRes.offset} • limit: {transcriptRes.limit}</div>

                {transcriptRes.entries.map(e => (
                  <div key={e.line} className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <div className="flex items-center gap-2 text-[11px] text-white/50">
                      <span className="text-white/70">#{e.line}</span>
                      {e.role ? <span>{e.role}</span> : null}
                      {e.type ? <span>• {e.type}</span> : null}
                      {e.ts ? <span className="ml-auto">{formatTime(Number(e.ts))}</span> : null}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-white/80">
                      {e.contentPreview ?? JSON.stringify(e.raw)}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
