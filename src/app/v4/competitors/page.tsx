'use client';

import V4Shell from '@/components/v4/V4Shell';
import RunsList from '@/components/RunsList';

export default function V4Competitors() {
  return (
    <V4Shell title="Competitors" subtitle="Competitor list + 10 ideas. Deduped across runs.">
      <RunsList type="competitor_intel" />
    </V4Shell>
  );
}
