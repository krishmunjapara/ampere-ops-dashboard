'use client';

import { useEffect, useState } from 'react';
import RunCard from '@/components/RunCard';
import Pager from '@/components/Pager';

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
  const [before, setBefore] = useState<number | null>(null);
  const [stack, setStack] = useState<number[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(pageBefore: number | null) {
    setLoading(true);
    try {
      const qsType = type ? `type=${encodeURIComponent(type)}&` : '';
      const qsBefore = pageBefore ? `before=${pageBefore}&` : '';
      const res = await fetch(`/api/runs?${qsType}${qsBefore}limit=25`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? 'Failed');
        return;
      }
      setError(null);
      setRows(json.runs ?? []);
      setNextBefore(json.page?.nextBefore ?? null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  // Reset pagination when type changes
  useEffect(() => {
    setBefore(null);
    setStack([]);
    setNextBefore(null);
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-2">
        <div className="text-xs font-semibold text-white/80">
          Runs: <span className="text-white/70">{type || 'all'}</span>
        </div>
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
        {!error && rows.length === 0 ? <div className="text-sm text-white/60">No runs found.</div> : null}

        <div className="space-y-2">
          {rows.map(r => (
            <RunCard key={r.id} run={r} />
          ))}
        </div>

        <div className="mt-3">
          <Pager
            canPrev={stack.length > 0}
            canNext={Boolean(nextBefore) && rows.length > 0}
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
              // push current cursor so Prev works
              setStack(s => [...s, before ?? 0]);
              setBefore(nextBefore);
              load(nextBefore);
            }}
            right={<div className="text-[11px] text-white/40">Page size: 25</div>}
          />
        </div>
      </div>
    </div>
  );
}
