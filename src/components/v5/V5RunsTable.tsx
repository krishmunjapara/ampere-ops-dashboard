'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function chip(type: string) {
  const base = 'text-[11px] rounded-md border px-2 py-0.5 font-mono';
  if (type === 'self_heal') return base + ' border-red-500/25 bg-red-500/10 text-red-100/90';
  if (type === 'ux_ideas') return base + ' border-sky-500/25 bg-sky-500/10 text-sky-100/90';
  if (type === 'competitor_intel') return base + ' border-amber-500/25 bg-amber-500/10 text-amber-100/90';
  if (type === 'updates_feed') return base + ' border-emerald-500/25 bg-emerald-500/10 text-emerald-100/90';
  return base + ' border-white/10 bg-white/5 text-white/70';
}

function statusChip(status: string) {
  const base = 'text-[11px] rounded-md border px-2 py-0.5';
  if (status === 'ok') return base + ' border-emerald-500/25 bg-emerald-500/10 text-emerald-100/90';
  return base + ' border-red-500/25 bg-red-500/10 text-red-100/90';
}

function preview(summaryJson: string) {
  try {
    const obj = JSON.parse(summaryJson);
    const s = JSON.stringify(obj);
    return s.length > 140 ? s.slice(0, 140) + '…' : s;
  } catch {
    return summaryJson.length > 140 ? summaryJson.slice(0, 140) + '…' : summaryJson;
  }
}

export default function V5RunsTable({ type }: { type?: string }) {
  const [rows, setRows] = useState<RunRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [before, setBefore] = useState<number | null>(null);
  const [stack, setStack] = useState<number[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  async function load(cursor: number | null) {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set('limit', '25');
      if (type) p.set('type', type);
      if (cursor) p.set('before', String(cursor));
      if (q.trim()) p.set('q', q.trim());
      if (status) p.set('status', status);

      const res = await fetch(`/api/runs?${p.toString()}`, { cache: 'no-store' });
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

  useEffect(() => {
    setBefore(null);
    setStack([]);
    setNextBefore(null);
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0A0B0C] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm font-semibold text-white/85">Runs</div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search payload…"
            className="h-9 w-[220px] rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white/85 placeholder:text-white/30 outline-none focus:border-white/25"
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="h-9 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white/80 outline-none focus:border-white/25"
          >
            <option value="">All status</option>
            <option value="ok">ok</option>
            <option value="error">error</option>
          </select>
          <button
            onClick={() => {
              setBefore(null);
              setStack([]);
              load(null);
            }}
            disabled={loading}
            className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/75 hover:text-white hover:border-white/25 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-200">{error}</div> : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-12 gap-3 bg-black/50 px-4 py-3 text-[11px] font-semibold text-white/45">
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Created</div>
          <div className="col-span-4">Preview</div>
          <div className="col-span-1 text-right">Open</div>
        </div>

        {rows.map(r => (
          <div key={r.id} className="grid grid-cols-12 gap-3 border-t border-white/10 px-4 py-3">
            <div className="col-span-2">
              <span className={chip(r.type)}>{r.type}</span>
            </div>
            <div className="col-span-2">
              <span className={statusChip(r.status)}>{r.status}</span>
            </div>
            <div className="col-span-3 text-[12px] text-white/55">{fmt(r.created_at)}</div>
            <div className="col-span-4 text-[12px] text-white/55 truncate">{preview(r.summary_json)}</div>
            <div className="col-span-1 text-right">
              <Link className="text-[12px] text-white/70 hover:text-white underline underline-offset-4" href={`/runs/${r.id}`}>
                View
              </Link>
            </div>
          </div>
        ))}

        {rows.length === 0 && !error ? (
          <div className="px-4 py-6 text-sm text-white/45">No runs found.</div>
        ) : null}
      </div>

      <div className="mt-4">
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
            setStack(s => [...s, before ?? 0]);
            setBefore(nextBefore);
            load(nextBefore);
          }}
          right={<div className="text-[11px] text-white/35">Page size: 25</div>}
        />
      </div>
    </div>
  );
}
