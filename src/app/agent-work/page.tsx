import Shell from '@/components/Shell';
import AgentWorkFeed from '@/components/AgentWorkFeed';

export default function AgentWorkPage() {
  return (
    <Shell>
      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-sm font-semibold">Agent Work</div>
          <div className="mt-1 text-xs text-white/60">
            Live-ish feed of agent/sub-agent activity ingested from OpenClaw runtime.
          </div>
        </div>
        <AgentWorkFeed />
      </div>
    </Shell>
  );
}
