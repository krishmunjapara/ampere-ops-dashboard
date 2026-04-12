'use client';

import V4Shell from '@/components/v4/V4Shell';
import RunsList from '@/components/RunsList';

export default function V4Activity() {
  return (
    <V4Shell title="All Activity" subtitle="Every cron run output. Paginated. Search + status filter supported.">
      <RunsList type="" />
    </V4Shell>
  );
}
