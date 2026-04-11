import Shell from '@/components/Shell';
import RunsList from '@/components/RunsList';
import StorageBanner from '@/components/StorageBanner';

export default function ActivityPage() {
  return (
    <Shell>
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm font-semibold">All Activity</div>
          <div className="mt-1 text-xs text-white/60">Combined view of all ingested cron runs.</div>
        </div>

        <StorageBanner />

        <RunsList type="" />
      </div>
    </Shell>
  );
}
