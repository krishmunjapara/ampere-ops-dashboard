import Shell from '@/components/Shell';
import RunsList from '@/components/RunsList';
import PageHeader from '@/components/PageHeader';

export default function UpdatesPage() {
  return (
    <Shell>
      <div className="space-y-4">
        <PageHeader title="Updates" subtitle="Latest launches and feature updates (X/Reddit/Blogs)." />
        <RunsList type="updates_feed" />
      </div>
    </Shell>
  );
}
