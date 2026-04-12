'use client';

import V5Shell from '@/components/v5/V5Shell';
import V5RunsTable from '@/components/v5/V5RunsTable';

export default function V5Competitors() {
  return (
    <V5Shell title="Competitors" subtitle="Competitor list + ideas (deduped).">
      <V5RunsTable type="competitor_intel" />
    </V5Shell>
  );
}
