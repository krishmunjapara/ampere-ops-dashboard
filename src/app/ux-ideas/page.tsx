import Shell from '@/components/Shell';
import RunsList from '@/components/RunsList';
import PageHeader from '@/components/PageHeader';

export default function UXIdeasPage() {
  return (
    <Shell>
      <div className="space-y-4">
        <PageHeader title="GA4 UX Ideas" subtitle="10 ideas per run based on drop-offs and journeys." />
        <RunsList type="ux_ideas" />
      </div>
    </Shell>
  );
}
