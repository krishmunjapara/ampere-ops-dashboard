'use client';

import V5Shell from '@/components/v5/V5Shell';
import V5RunsTable from '@/components/v5/V5RunsTable';

export default function V5Activity() {
  return (
    <V5Shell title="All Activity" subtitle="Every cron run output. Clean table + pagination.">
      <V5RunsTable />
    </V5Shell>
  );
}
