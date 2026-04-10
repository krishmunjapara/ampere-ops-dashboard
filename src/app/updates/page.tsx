import Shell from '@/components/Shell';
import RunsList from '@/components/RunsList';

export default function UpdatesPage() {
  return (
    <Shell>
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm font-semibold">X / Reddit Updates</div>
          <div className="mt-1 text-xs text-white/60">
            Latest launches and feature updates in the Ampere/OpenClaw ecosystem.
          </div>
        </div>
        <RunsList type="updates_feed" />
      </div>
    </Shell>
  );
}
