'use client';

import { useEffect, useState } from 'react';
import V5Shell from '@/components/v5/V5Shell';
import V5Stat from '@/components/v5/V5Stat';
import V5Card from '@/components/v5/V5Card';
import V5Charts from '@/components/v5/V5Charts';

type SnapRun = {
  id: string;
  created_at: number;
  status: string;
  summary_json: string;
};

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default function GA4DashboardV5() {
  const [snap, setSnap] = useState<{ run: SnapRun; payload: any } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch('/api/runs?type=ga4_snapshot&limit=1', { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        if (!json.ok) {
          setErr(json.error ?? 'Failed');
          return;
        }
        const r: SnapRun | undefined = json.runs?.[0];
        if (!r) {
          setErr('No GA4 snapshot yet. Run the GA4 Snapshot cron once.');
          setSnap(null);
          return;
        }
        setErr(null);
        setSnap({ run: r, payload: safeJsonParse(r.summary_json) });
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

  const p = snap?.payload;
  const overview = p?.overview || {};
  const byPagePath = p?.byPagePath || [];
  const byEventName = p?.byEventName || [];

  return (
    <V5Shell
      title="GA4 Analytics"
      subtitle="Real GA4 snapshot data (charts + tables)."
      right={
        <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
          <div className="text-[11px] text-white/40">Latest snapshot</div>
          <div className="text-[12px] text-white/80">{snap?.run?.id ?? '—'}</div>
        </div>
      }
    >
      {err ? (
        <div className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          {err}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-12 gap-5">
        <div className="col-span-12 md:col-span-3">
          <V5Stat label="Active users" value={overview.activeUsers ?? '—'} sub={`Window: ${p?.window?.sinceMinutes ?? '—'} min`} />
        </div>
        <div className="col-span-12 md:col-span-3">
          <V5Stat label="Sessions" value={overview.sessions ?? '—'} sub={`Property: ${p?.propertyId ?? '—'}`} />
        </div>
        <div className="col-span-12 md:col-span-3">
          <V5Stat label="Page views" value={overview.screenPageViews ?? '—'} sub={p?.notes ?? ''} />
        </div>
        <div className="col-span-12 md:col-span-3">
          <V5Stat label="Events" value={overview.eventCount ?? '—'} sub={`status: ${snap?.run?.status ?? '—'}`} />
        </div>
      </div>

      <div className="mt-6">
        <V5Charts byPagePath={byPagePath} byEventName={byEventName} />
      </div>

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6">
          <V5Card title="Top pages (table)" subtitle="Top by views">
            <div className="space-y-2">
              {byPagePath.slice(0, 15).map((x: any, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <div className="min-w-0 flex-1 font-mono text-[12px] text-white/70 truncate">{x.pagePath}</div>
                  <div className="text-sm font-semibold text-white/85">{x.screenPageViews}</div>
                </div>
              ))}
            </div>
          </V5Card>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <V5Card title="Top events (table)" subtitle="Top by count">
            <div className="space-y-2">
              {byEventName.slice(0, 15).map((x: any, i: number) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <div className="min-w-0 flex-1 font-mono text-[12px] text-white/70 truncate">{x.eventName}</div>
                  <div className="text-sm font-semibold text-white/85">{x.eventCount}</div>
                </div>
              ))}
            </div>
          </V5Card>
        </div>
      </div>
    </V5Shell>
  );
}
