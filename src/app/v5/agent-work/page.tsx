'use client';

import V5Shell from '@/components/v5/V5Shell';
import AgentWorkFeed from '@/components/AgentWorkFeed';

export default function V5AgentWork() {
  return (
    <V5Shell title="Agent Work" subtitle="Ingested OpenClaw activity. Paginated feed.">
      <AgentWorkFeed />
    </V5Shell>
  );
}
