'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function navClass(active: boolean) {
  return [
    'block rounded-md px-3 py-2 text-sm transition',
    active ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5',
  ].join(' ');
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-4 px-4 py-4">
        <aside className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-2">
          <div className="px-3 pb-2 pt-1 text-xs font-semibold text-white/70">Ops</div>
          <nav className="space-y-1">
            <Link href="/" className={navClass(pathname === '/')}>
              Sessions
            </Link>
            <Link href="/activity" className={navClass(pathname === '/activity')}>
              All Activity
            </Link>
            <Link href="/self-healing" className={navClass(pathname === '/self-healing')}>
              Self-Healing
            </Link>
            <Link href="/competitors" className={navClass(pathname === '/competitors')}>
              Competitors
            </Link>
          </nav>

          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="px-3 text-[11px] text-white/40">Local-only. No auth.</div>
          </div>
        </aside>

        <main className="col-span-10">{children}</main>
      </div>
    </div>
  );
}
