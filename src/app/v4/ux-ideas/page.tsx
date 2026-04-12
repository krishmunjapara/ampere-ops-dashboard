'use client';

import V4Shell from '@/components/v4/V4Shell';
import RunsList from '@/components/RunsList';

export default function V4UXIdeas() {
  return (
    <V4Shell title="GA4 UX Ideas" subtitle="10 ideas per run. Deduped across runs.">
      <RunsList type="ux_ideas" />
    </V4Shell>
  );
}
