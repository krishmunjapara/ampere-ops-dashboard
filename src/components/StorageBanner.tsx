'use client';

import { useEffect, useState } from 'react';

type Status = {
  ok: boolean;
  storage: string;
  dbUrlPresent: boolean;
  fileStoreForced: boolean;
  vercel: boolean;
};

export default function StorageBanner() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch('/api/status', { cache: 'no-store' });
        const json = (await res.json()) as Status;
        if (!alive) return;
        setStatus(json);
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  if (!status?.ok) return null;

  const isFile = status.storage.startsWith('file');
  const warning = status.vercel && isFile;

  return (
    <div
      className={[
        'rounded-xl border p-3',
        warning ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/10 bg-white/5',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-semibold">Storage</div>
        <div className="text-xs text-white/70">
          mode: <span className="font-mono text-white/90">{status.storage}</span>
        </div>
      </div>

      {warning ? (
        <div className="mt-1 text-xs text-amber-100/80">
          This deployment is using file storage on Vercel. Vercel can restart/scale and you may lose history.
          Connect a Postgres database (Neon) to persist all runs.
        </div>
      ) : (
        <div className="mt-1 text-xs text-white/50">Persistent history enabled when storage=postgres.</div>
      )}
    </div>
  );
}
