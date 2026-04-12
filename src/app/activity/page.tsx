import Shell from '@/components/Shell';
import RunsList from '@/components/RunsList';
import StorageBanner from '@/components/StorageBanner';
import PageHeader from '@/components/PageHeader';

export default function ActivityPage() {
  return (
    <Shell>
      <div className="space-y-4">
        <PageHeader title="All Activity" subtitle="Everything your cron jobs and agents produced (paginated)." />

        <StorageBanner />

        <RunsList type="" />
      </div>
    </Shell>
  );
}
