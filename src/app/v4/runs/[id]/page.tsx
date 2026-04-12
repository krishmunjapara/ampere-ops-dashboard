import V4Shell from '@/components/v4/V4Shell';

async function getRun(id: string) {
  const res = await fetch(`/api/runs/${id}`, { cache: 'no-store' });
  return res.json();
}

export default async function V4RunDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRun(id);

  return (
    <V4Shell title="Run Details" subtitle={id}>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <pre className="whitespace-pre-wrap break-words text-[12px] text-white/80">{JSON.stringify(data, null, 2)}</pre>
      </div>
    </V4Shell>
  );
}
