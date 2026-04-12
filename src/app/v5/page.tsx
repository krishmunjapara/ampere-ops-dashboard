'use client';

import { useEffect, useState } from 'react';
import V5Shell from '@/components/v5/V5Shell';
import V5Stat from '@/components/v5/V5Stat';
import V5Card from '@/components/v5/V5Card';

type Metrics = {
  ok: boolean;
  types: string[];
  latestByType: Record<string, any>;
  counts24hByType: Record<string, number>;
  selfHeal: { latestRun: any | null; topFailures: Array<{ signature: string; count: number }> };
};

export default function V5Home() {
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
    <V5Shell
      title="Command Center"
      subtitle="Matte black, clean spacing, pro ops view."
      right={
        <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
          <div className="text-[11px] text-white/40">Storage</div>
          <div className="text-[12px] text-white/80">Postgres (Neon)</div>
        </div>
      }
    >
      {err ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 md:col-span-3">
          <V5Stat label="Runs (24h)" value={runs24h ?? '—'} sub="All cron types" />
        </div>
        <div className="col-span-12 md:col-span-3">
          <V5Stat label="Cron types" value={m?.types?.length ?? '—'} sub={(m?.types ?? []).join(' · ') || '—'} />
        </div>
        <div className="col-span-12 md:col-span-3">
          <V5Stat label="Self-heal status" value={m?.selfHeal?.latestRun?.status ?? '—'} sub={m?.selfHeal?.latestRun?.id ?? '—'} />
        </div>
        <div className="col-span-12 md:col-span-3">
          <V5Stat label="Top failures" value={m?.selfHeal?.topFailures?.length ?? '—'} sub="Latest digest" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7">
          <V5Card title="Cron health" subtitle="Latest run per type + count (24h)">
            <div className="space-y-2">
              {(m?.types ?? []).map(t => (
                <div key={t} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white/85">{t}</div>
                      <div className="mt-0.5 text-[12px] text-white/40 truncate">latest: {m?.latestByType?.[t]?.id ?? '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-white/35">24h</div>
                      <div className="text-sm font-semibold text-white/85">{m?.counts24hByType?.[t] ?? 0}</div>
                    </div>
                  </div>
                </div>
              ))}
              {m && (m.types?.length ?? 0) === 0 ? <div className="text-sm text-white/45">No data yet.</div> : null}
            </div>
          </V5Card>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <V5Card title="Self-heal: top failures" subtitle="Counts from latest digest">
            <div className="space-y-2">
              {(m?.selfHeal?.topFailures ?? []).slice(0, 8).map((f, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="text-[11px] rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-white/60">#{i + 1}</div>
                    <div className="ml-auto text-sm font-semibold text-white/85">{f.count}</div>
                  </div>
                  <div className="mt-2 font-mono text-[12px] text-white/60 break-words">{f.signature}</div>
                </div>
              ))}
              {m && (m.selfHeal?.topFailures?.length ?? 0) === 0 ? <div className="text-sm text-white/45">No failures.</div> : null}
            </div>
          </V5Card>
        </div>
      </div>
    </V5Shell>
  );
}
