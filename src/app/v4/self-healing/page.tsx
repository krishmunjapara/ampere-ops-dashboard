'use client';

import V4Shell from '@/components/v4/V4Shell';
import RunsList from '@/components/RunsList';

export default function V4SelfHealing() {
  return (
    <V4Shell title="Self-Healing" subtitle="Last-3h window. Shows Where/What when GA4 rich dimensions are available.">
      <RunsList type="self_heal" />
    </V4Shell>
  );
}
