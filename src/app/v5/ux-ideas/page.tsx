'use client';

import V5Shell from '@/components/v5/V5Shell';
import V5RunsTable from '@/components/v5/V5RunsTable';

export default function V5UXIdeas() {
  return (
    <V5Shell title="GA4 UX Ideas" subtitle="10 ideas per run (deduped).">
      <V5RunsTable type="ux_ideas" />
    </V5Shell>
  );
}
