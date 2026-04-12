'use client';

import V4Shell from '@/components/v4/V4Shell';
import RunsList from '@/components/RunsList';

export default function V4Updates() {
  return (
    <V4Shell title="Updates" subtitle="X/Reddit/Blogs feed. Deduped across runs.">
      <RunsList type="updates_feed" />
    </V4Shell>
  );
}
