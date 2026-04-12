import Shell from '@/components/Shell';
import PageHeader from '@/components/PageHeader';
import RunCard from '@/components/RunCard';
import { getCronRunById } from '@/lib/storage';

export const runtime = 'nodejs';

export default async function RunDetailsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const run = await getCronRunById(id);

  return (
    <Shell>
      <div className="space-y-4">
        <PageHeader title="Run Details" subtitle={id} />

        {!run ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">Not found.</div>
        ) : (
          <RunCard run={run} />
        )}
      </div>
    </Shell>
  );
}
