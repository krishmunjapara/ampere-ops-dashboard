import Shell from '@/components/Shell';
import RunsList from '@/components/RunsList';
import PageHeader from '@/components/PageHeader';

export default function CompetitorsPage() {
  return (
    <Shell>
      <div className="space-y-4">
        <PageHeader title="Competitors" subtitle="Competitor list + 10 ideas per run (public sources)." />
        <RunsList type="competitor_intel" />
      </div>
    </Shell>
  );
}
