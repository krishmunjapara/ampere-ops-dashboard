'use client';

import V4Shell from '@/components/v4/V4Shell';
import AgentWorkFeed from '@/components/AgentWorkFeed';

export default function V4AgentWork() {
  return (
    <V4Shell title="Agent Work" subtitle="Ingested OpenClaw activity (subagents, tools). Paginated.">
      <AgentWorkFeed />
    </V4Shell>
  );
}
