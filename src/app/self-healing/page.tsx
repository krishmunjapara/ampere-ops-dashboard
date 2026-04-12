import Shell from '@/components/Shell';
import RunsList from '@/components/RunsList';
import PageHeader from '@/components/PageHeader';

export default function SelfHealingPage() {
  return (
    <Shell>
      <div className="space-y-4">
        <PageHeader
          title="Self-Healing"
          subtitle="Last-3h GA4 failure digest. Rich details appear automatically when GA4 exposes custom dimensions via Data API."
        />
        <RunsList type="self_heal" />
      </div>
    </Shell>
  );
}
