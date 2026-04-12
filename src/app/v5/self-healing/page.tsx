'use client';

import V5Shell from '@/components/v5/V5Shell';
import V5RunsTable from '@/components/v5/V5RunsTable';

export default function V5SelfHealing() {
  return (
    <V5Shell title="Self-Healing" subtitle="GA4 failures, last-3h window. Table view with filters.">
      <V5RunsTable type="self_heal" />
    </V5Shell>
  );
}
