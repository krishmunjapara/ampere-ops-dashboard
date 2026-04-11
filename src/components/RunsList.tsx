'use client';

import { useEffect, useState } from 'react';
import RunCard from '@/components/RunCard';

type RunRow = {
  id: string;
  type: string;
  started_at: number;
  finished_at: number;
  status: string;
  summary_json: string;
  created_at: number;
};

export default function RunsList({ type }: { type: string }) {
  const [rows, setRows] = useState<RunRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const qsType = type ? `type=${encodeURIComponent(type)}&` : '';
        const res = await fetch(`/api/runs?${qsType}limit=50`, { cache: 'no-store' });
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
        Recent runs: <span className="text-white/70">{type || 'all'}</span>
      </div>
      <div className="p-3">
        {error ? <div className="text-sm text-red-300">{error}</div> : null}
        {!error && rows.length === 0 ? <div className="text-sm text-white/60">No runs ingested yet.</div> : null}

        <div className="space-y-2">
          {rows.map(r => (
            <RunCard key={r.id} run={r} />
          ))}
        </div>
      </div>
    </div>
  );
}
