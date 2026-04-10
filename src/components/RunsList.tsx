'use client';

import { useEffect, useState } from 'react';

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

export default function RunsList({ type }: { type: string }) {
  const [rows, setRows] = useState<RunRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch(`/api/runs?type=${encodeURIComponent(type)}&limit=50`, { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (!json.ok) {
          setError(json.error ?? 'Failed');
          return;
        }
        setError(null);
        setRows(json.runs ?? []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? String(e));
      }
    }

    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [type]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="border-b border-white/10 px-3 py-2 text-xs font-semibold text-white/80">
        Recent runs: <span className="text-white/70">{type}</span>
      </div>
      <div className="p-3">
        {error ? <div className="text-sm text-red-300">{error}</div> : null}
        {!error && rows.length === 0 ? <div className="text-sm text-white/60">No runs ingested yet.</div> : null}

        <div className="space-y-2">
          {rows.map(r => {
            let summary: any = null;
            try {
              summary = JSON.parse(r.summary_json);
            } catch {
              summary = r.summary_json;
            }

            return (
              <div key={r.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                <div className="flex items-center gap-2 text-[11px] text-white/50">
                  <span className="text-white/70">{r.status}</span>
                  <span>•</span>
                  <span>{formatTime(r.created_at)}</span>
                  <span className="ml-auto font-mono">{r.id}</span>
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-black/30 p-2 text-[12px] text-white/80">
                  {JSON.stringify(summary, null, 2)}
                </pre>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
