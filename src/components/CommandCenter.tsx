'use client';

import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';

type RunRow = {
  id: string;
  type: string;
  started_at: number;
  finished_at: number;
  status: string;
  summary_json: string;
  created_at: number;
};

type MetricsResponse = {
  ok: boolean;
  now: number;
  window: { start: number; end: number };
  types: string[];
  latestByType: Record<string, RunRow>;
  counts24hByType: Record<string, number>;
  selfHeal: {
    latestRunId: string | null;
    sinceMinutes: number | null;
    topFailures: Array<{
      signature: string;
      count: number;
      kind: string;
      where: string;
      detail: string;
    }>;
  };
  error?: string;
};

function formatTime(ts: number | null | undefined) {
  if (!ts) return '—';
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

function statusDot(status: string) {
  if (status === 'ok') return 'bg-emerald-400';
  if (status === 'error') return 'bg-red-400';
  return 'bg-white/40';
}

function KpiCard({
  title,
  value,
  hint,
  right,
}: {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-white/60">{title}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
          {hint ? <div className="mt-1 text-[11px] text-white/45">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/metrics', { cache: 'no-store' });
        const json = (await res.json()) as MetricsResponse;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) {
          setData({
            ok: false,
            now: Date.now(),
            window: { start: Date.now() - 24 * 60 * 60 * 1000, end: Date.now() },
            types: [],
            latestByType: {},
            counts24hByType: {},
            selfHeal: { latestRunId: null, sinceMinutes: null, topFailures: [] },
            error: e?.message ?? String(e),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const types = data?.types ?? [];
  const latestByType = data?.latestByType ?? {};
  const counts = data?.counts24hByType ?? {};

  const total24h = useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0),
    [counts],
  );

  const orderedTypes = useMemo(() => {
    const preferred = ['self_heal', 'ux_ideas', 'competitor_intel', 'updates_feed'];
    const rest = types.filter(t => !preferred.includes(t)).sort();
    return [...preferred.filter(t => types.includes(t)), ...rest];
  }, [types]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Command Center"
        subtitle="Ops KPIs, cron health, and self-healing signals (auto-refreshes every 30s)."
        right={
          <div className="text-right">
            <div className="text-[11px] text-white/50">Last updated</div>
            <div className="text-[12px] text-white/80">{formatTime(data?.now)}</div>
          </div>
        }
      />

      {data && !data.ok ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
          Failed to load metrics: {data.error ?? 'unknown error'}
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <KpiCard
            title="Runs (last 24h)"
            value={loading && !data ? '…' : total24h}
            hint={data ? `Window start: ${formatTime(data.window.start)}` : undefined}
          />
        </div>
        <div className="col-span-12 md:col-span-3">
          <KpiCard
            title="Cron types"
            value={loading && !data ? '…' : orderedTypes.length}
            hint={orderedTypes.length ? orderedTypes.slice(0, 4).join(' · ') : '—'}
          />
        </div>
        <div className="col-span-12 md:col-span-3">
          <KpiCard
            title="Self-heal top failures"
            value={loading && !data ? '…' : data?.selfHeal.topFailures.length ?? 0}
            hint={data?.selfHeal.sinceMinutes ? `From last digest window (${data.selfHeal.sinceMinutes} min)` : '—'}
          />
        </div>
        <div className="col-span-12 md:col-span-3">
          <KpiCard
            title="Self-heal latest run"
            value={formatTime(latestByType['self_heal']?.created_at)}
            hint={latestByType['self_heal'] ? `status: ${latestByType['self_heal']?.status}` : '—'}
            right={
              latestByType['self_heal'] ? (
                <div className={`mt-1 h-2 w-2 rounded-full ${statusDot(latestByType['self_heal']?.status)}`} />
              ) : null
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Cron health</div>
            <div className="mt-1 text-xs text-white/50">Latest run per type + count in the last 24h.</div>

            <div className="mt-3 space-y-2">
              {orderedTypes.map(type => {
                const run = latestByType[type];
                return (
                  <div
                    key={type}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={badgeClass(type)}>{type}</span>
                      <span className="text-[11px] text-white/50">last: {formatTime(run?.created_at)}</span>
                      {run?.status ? (
                        <span className="text-[11px] text-white/40">status: {run.status}</span>
                      ) : (
                        <span className="text-[11px] text-white/40">no runs yet</span>
                      )}
                      <span className="ml-auto text-[11px] text-white/60">24h: {counts[type] ?? 0}</span>
                    </div>
                    {run?.id ? (
                      <div className="mt-1 font-mono text-[11px] text-white/30 truncate">{run.id}</div>
                    ) : null}
                  </div>
                );
              })}

              {orderedTypes.length === 0 ? (
                <div className="text-sm text-white/50">No cron data ingested yet.</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Self-heal: top failures</div>
            <div className="mt-1 text-xs text-white/50">From the latest self_heal digest.</div>

            <div className="mt-3 space-y-2">
              {(data?.selfHeal.topFailures ?? []).slice(0, 8).map((f, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-white/70">
                      {f.kind}
                    </span>
                    <div className="ml-auto text-[11px] text-white/50">{f.count}</div>
                  </div>
                  <div className="mt-1 text-[12px] text-white/85">
                    <span className="text-white/50">Where:</span> <span className="font-mono">{f.where || '—'}</span>
                  </div>
                  {f.detail ? (
                    <div className="mt-1 text-[12px] text-white/70">
                      <span className="text-white/50">What:</span> {f.detail}
                    </div>
                  ) : null}
                  <div className="mt-1 font-mono text-[11px] text-white/30 break-words">{f.signature}</div>
                </div>
              ))}

              {(data?.selfHeal.topFailures?.length ?? 0) === 0 ? (
                <div className="text-sm text-white/50">No failures listed in the latest digest.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
