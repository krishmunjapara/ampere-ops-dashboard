import Shell from '@/components/Shell';
import RunsList from '@/components/RunsList';

export default function CompetitorsPage() {
  return (
    <Shell>
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm font-semibold">Competitors</div>
          <div className="mt-1 text-xs text-white/60">
            Ingest runs via <span className="font-mono">POST /api/ingest/competitor-run</span>
          </div>
        </div>
        <RunsList type="competitor_intel" />
      </div>
    </Shell>
  );
}
