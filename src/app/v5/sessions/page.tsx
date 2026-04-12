'use client';

import V5Shell from '@/components/v5/V5Shell';
import SessionsDashboard from '@/components/SessionsDashboard';

export default function V5Sessions() {
  return (
    <V5Shell title="Sessions" subtitle="Works only on the OpenClaw host (Ampere server).">
      <SessionsDashboard />
    </V5Shell>
  );
}
