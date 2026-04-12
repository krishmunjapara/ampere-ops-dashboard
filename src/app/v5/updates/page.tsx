'use client';

import V5Shell from '@/components/v5/V5Shell';
import V5RunsTable from '@/components/v5/V5RunsTable';

export default function V5Updates() {
  return (
    <V5Shell title="Updates" subtitle="X/Reddit/Blogs feed (deduped).">
      <V5RunsTable type="updates_feed" />
    </V5Shell>
  );
}
