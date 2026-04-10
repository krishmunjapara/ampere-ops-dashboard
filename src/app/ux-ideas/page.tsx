import Shell from '@/components/Shell';
import RunsList from '@/components/RunsList';

export default function UXIdeasPage() {
  return (
    <Shell>
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm font-semibold">GA4 UX Ideas</div>
          <div className="mt-1 text-xs text-white/60">
            Ideas generated from GA4 user journeys and drop-offs.
          </div>
        </div>
        <RunsList type="ux_ideas" />
      </div>
    </Shell>
  );
}
