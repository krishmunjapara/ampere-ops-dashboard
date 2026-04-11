'use client';

import React, { useMemo, useState } from 'react';

type RunRow = {
  id: string;
  type: string;
  started_at: number;
  finished_at: number;
  status: string;
  summary_json: string;
  created_at: number;
};

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function badgeClass(type: string) {
  const base = 'text-[11px] rounded-md border px-2 py-0.5';
  if (type === 'self_heal') return base + ' border-red-500/30 bg-red-500/10 text-red-100';
  if (type === 'ux_ideas') return base + ' border-sky-500/30 bg-sky-500/10 text-sky-100';
  if (type === 'competitor_intel') return base + ' border-amber-500/30 bg-amber-500/10 text-amber-100';
  if (type === 'updates_feed') return base + ' border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
  return base + ' border-white/10 bg-white/5 text-white/70';
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function List({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 space-y-1">{children}</div>;
}

function Row({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-[12px] text-white/80">
      <div className="min-w-0 flex-1">{left}</div>
      {right ? <div className="shrink-0 text-white/50">{right}</div> : null}
    </div>
  );
}

function link(url: string) {
  return (
    <a className="text-white/80 underline underline-offset-2 hover:text-white" href={url} target="_blank" rel="noreferrer">
      {url}
    </a>
  );
}

export default function RunCard({ run }: { run: RunRow }) {
  const summary = useMemo(() => safeJsonParse(run.summary_json), [run.summary_json]);
  const [showRaw, setShowRaw] = useState(false);

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <span className={badgeClass(run.type)}>{run.type}</span>
      <span className="text-[11px] text-white/50">{formatTime(run.created_at)}</span>
      <span className="text-[11px] text-white/30">•</span>
      <span className="text-[11px] text-white/50">status: {run.status}</span>
      <span className="ml-auto font-mono text-[11px] text-white/40">{run.id}</span>
    </div>
  );

  function renderBody() {
    if (!summary || typeof summary !== 'object') {
      return <div className="mt-2 text-sm text-white/70">No structured payload.</div>;
    }

    // Self-heal
    if (run.type === 'self_heal') {
      const digest = (summary as any).digest;
      const action = (summary as any).action;
      const mode = digest?.mode ?? 'unknown';
      const since = digest?.sinceMinutes;
      const topNew = Array.isArray(digest?.topNew) ? digest.topNew : [];

      return (
        <div className="mt-2">
          <Row left={<span>Window</span>} right={<span>{since ? `${since} min` : '—'}</span>} />
          <Row left={<span>GA4 mode</span>} right={<span className="font-mono">{mode}</span>} />

          <div className="mt-3 text-xs font-semibold text-white/70">Top failures</div>
          <List>
            {topNew.slice(0, 5).map((x: any, i: number) => (
              <Row
                key={i}
                left={<span className="font-mono text-white/85">{x.signature}</span>}
                right={<span>{x.count}</span>}
              />
            ))}
            {topNew.length === 0 ? <div className="text-[12px] text-white/50">No failures in window.</div> : null}
          </List>

          <div className="mt-3 text-xs font-semibold text-white/70">Action</div>
          <div className="mt-1 text-[12px] text-white/70">
            {action?.pickedSignature ? (
              <div>
                Fixing: <span className="font-mono text-white/85">{action.pickedSignature}</span>
              </div>
            ) : (
              <div>No auto-fix action recorded.</div>
            )}
            {action?.prUrl ? <div>PR: {link(action.prUrl)}</div> : null}
            {action?.commitSha ? <div>Commit: <span className="font-mono">{action.commitSha}</span></div> : null}
          </div>
        </div>
      );
    }

    // UX ideas
    if (run.type === 'ux_ideas') {
      const ideas = Array.isArray((summary as any).ideas) ? (summary as any).ideas : [];
      const window = (summary as any).window;

      return (
        <div className="mt-2">
          <Row left={<span>Window</span>} right={<span>{window?.sinceMinutes ? `${window.sinceMinutes} min` : '—'}</span>} />
          <div className="mt-3 text-xs font-semibold text-white/70">Ideas (10)</div>
          <List>
            {ideas.slice(0, 10).map((it: any, i: number) => (
              <div key={i} className="rounded-md border border-white/10 bg-black/20 p-2">
                <div className="flex items-center gap-2">
                  <div className="text-[12px] font-semibold text-white/90">{i + 1}. {it.title}</div>
                  {it.category ? <div className="ml-auto text-[11px] text-white/50">{it.category}</div> : null}
                </div>
                <div className="mt-1 text-[12px] text-white/70">{it.description ?? it.sentences?.join(' ')}</div>
                {it.sources?.length ? (
                  <div className="mt-1 text-[11px] text-white/40">Sources: {it.sources.slice(0, 3).join(' · ')}</div>
                ) : null}
              </div>
            ))}
            {ideas.length === 0 ? <div className="text-[12px] text-white/50">No ideas ingested yet.</div> : null}
          </List>
        </div>
      );
    }

    // Updates feed
    if (run.type === 'updates_feed') {
      const updates = Array.isArray((summary as any).updates) ? (summary as any).updates : [];

      return (
        <div className="mt-2">
          <div className="mt-1 text-xs font-semibold text-white/70">Items</div>
          <List>
            {updates.slice(0, 10).map((u: any, i: number) => (
              <div key={i} className="rounded-md border border-white/10 bg-black/20 p-2">
                <div className="flex items-center gap-2">
                  <div className="text-[12px] font-semibold text-white/90">{u.title}</div>
                  {u.platform ? <div className="ml-auto text-[11px] text-white/50">{u.platform}</div> : null}
                </div>
                <div className="mt-1 text-[12px] text-white/70">{u.summary}</div>
                {u.url ? <div className="mt-1 text-[11px]">{link(u.url)}</div> : null}
              </div>
            ))}
            {updates.length === 0 ? <div className="text-[12px] text-white/50">No updates ingested yet.</div> : null}
          </List>
        </div>
      );
    }

    // Competitor intel
    if (run.type === 'competitor_intel') {
      const competitors = Array.isArray((summary as any).competitors) ? (summary as any).competitors : [];
      const ideas = Array.isArray((summary as any).ideas) ? (summary as any).ideas : [];

      return (
        <div className="mt-2">
          <div className="text-xs font-semibold text-white/70">Competitors</div>
          <List>
            {competitors.slice(0, 8).map((c: any, i: number) => (
              <Row
                key={i}
                left={
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-white/90">{c.name}</div>
                    {c.url ? <div className="text-[11px] text-white/40 truncate">{c.url}</div> : null}
                  </div>
                }
                right={c.url ? link(c.url) : undefined}
              />
            ))}
            {competitors.length === 0 ? <div className="text-[12px] text-white/50">No competitor list ingested yet.</div> : null}
          </List>

          <div className="mt-3 text-xs font-semibold text-white/70">Ideas (10)</div>
          <List>
            {ideas.slice(0, 10).map((it: any, i: number) => (
              <div key={i} className="rounded-md border border-white/10 bg-black/20 p-2">
                <div className="flex items-center gap-2">
                  <div className="text-[12px] font-semibold text-white/90">{i + 1}. {it.title}</div>
                  {it.category ? <div className="ml-auto text-[11px] text-white/50">{it.category}</div> : null}
                </div>
                <div className="mt-1 text-[12px] text-white/70">{it.description}</div>
                {it.sources?.length ? (
                  <div className="mt-1 text-[11px] text-white/40">Sources: {it.sources.slice(0, 3).join(' · ')}</div>
                ) : null}
              </div>
            ))}
            {ideas.length === 0 ? <div className="text-[12px] text-white/50">No ideas ingested yet.</div> : null}
          </List>
        </div>
      );
    }

    return (
      <div className="mt-2 text-[12px] text-white/70">
        Unknown run type. Enable raw JSON.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      {header}
      {renderBody()}

      <div className="mt-3 flex items-center gap-2">
        <button
          className="text-[11px] rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/70 hover:text-white hover:border-white/20"
          onClick={() => setShowRaw(v => !v)}
        >
          {showRaw ? 'Hide raw JSON' : 'Show raw JSON'}
        </button>
      </div>

      {showRaw ? (
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-black/30 p-2 text-[12px] text-white/80">
          {JSON.stringify(summary ?? run.summary_json, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
