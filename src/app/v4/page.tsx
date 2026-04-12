'use client';

import { useEffect, useState } from 'react';
import V4Shell from '@/components/v4/V4Shell';
import KpiCard from '@/components/v4/KpiCard';

type Metrics = {
  ok: boolean;
  now: number;
  window: { start: number; end: number };
  types: string[];
  latestByType: Record<string, any>;
  counts24hByType: Record<string, number>;
  selfHeal: { latestRun: any | null; topFailures: Array<{ signature: string; count: number }> };
};

export default function V4Home() {
  const [m, setM] = useState<Metrics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch('/api/metrics', { cache: 'no-store' });
        const json = (await res.json()) as Metrics;
        if (!alive) return;
        if (!json.ok) {
          setErr('Failed to load metrics');
          return;
        }
        setErr(null);
        setM(json);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? String(e));
      }
    }

    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const runs24h = m
    ? Object.values(m.counts24hByType || {}).reduce((a: number, b: any) => a + Number(b || 0), 0)
    : null;

  return (
    <V4Shell
      title="Command Center"
      subtitle="High-signal overview. v4 is a clean rebuild (not a patch)."
      right={
        <div className="text-right">
          <div className="text-[11px] text-white/50">Storage</div>
          <div className="text-[12px] text-white/80">Postgres (Neon)</div>
        </div>
      }
    >
      {err ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 md:col-span-3">
          <KpiCard label="Runs (last 24h)" value={runs24h ?? '—'} />
        </div>
        <div className="col-span-12 md:col-span-3">
          <KpiCard label="Cron types" value={m?.types?.length ?? '—'} sub={(m?.types ?? []).join(' · ') || '—'} />
        </div>
        <div className="col-span-12 md:col-span-3">
          <KpiCard label="Self-heal top failures" value={m?.selfHeal?.topFailures?.length ?? '—'} sub="From latest self_heal digest" />
        </div>
        <div className="col-span-12 md:col-span-3">
          <KpiCard
            label="Self-heal latest"
            value={m?.selfHeal?.latestRun?.status ?? '—'}
            sub={m?.selfHeal?.latestRun?.id ?? '—'}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Cron health</div>
          <div className="mt-1 text-xs text-white/50">Latest run per type + counts (24h).</div>
          <div className="mt-4 space-y-2">
            {(m?.types ?? []).map(t => (
              <div key={t} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="mt-0.5 text-[12px] text-white/50 truncate">
                    latest: {m?.latestByType?.[t]?.id ?? '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-white/50">24h runs</div>
                  <div className="text-sm font-semibold">{m?.counts24hByType?.[t] ?? 0}</div>
                </div>
              </div>
            ))}
            {m && (m.types?.length ?? 0) === 0 ? (
              <div className="text-sm text-white/50">No cron data yet.</div>
            ) : null}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">Self-heal: top failures</div>
          <div className="mt-1 text-xs text-white/50">High-impact failures (last digest).</div>
          <div className="mt-4 space-y-2">
            {(m?.selfHeal?.topFailures ?? []).slice(0, 7).map((f, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="text-[11px] rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-white/70">
                    #{i + 1}
                  </div>
                  <div className="ml-auto text-sm font-semibold">{f.count}</div>
                </div>
                <div className="mt-2 font-mono text-[12px] text-white/75 break-words">{f.signature}</div>
              </div>
            ))}
            {m && (m.selfHeal?.topFailures?.length ?? 0) === 0 ? (
              <div className="text-sm text-white/50">No failures in latest digest.</div>
            ) : null}
          </div>
        </div>
      </div>
    </V4Shell>
  );
}
