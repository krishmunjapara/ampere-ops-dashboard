'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/v5', label: 'Command Center' },
  { href: '/v5/activity', label: 'All Activity' },
  { href: '/v5/self-healing', label: 'Self-Healing' },
  { href: '/v5/ux-ideas', label: 'GA4 UX Ideas' },
  { href: '/v5/competitors', label: 'Competitors' },
  { href: '/v5/ga4', label: 'GA4 Analytics' },
  { href: '/v5/updates', label: 'Updates' },
  { href: '/v5/agent-work', label: 'Agent Work' },
  { href: '/v5/sessions', label: 'Sessions (host-only)' },
];

function navItem(active: boolean) {
  return [
    'flex items-center justify-between rounded-xl px-3 py-2 text-sm transition',
    active
      ? 'bg-white/8 text-white border border-white/10'
      : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent',
  ].join(' ');
}

export default function V5Shell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-[1760px] px-6 py-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-3 xl:col-span-2">
          <div className="rounded-3xl border border-white/10 bg-[#0A0B0C] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="px-3 py-3">
              <div className="text-xs font-semibold tracking-[0.2em] text-white/60">AMPERE OPS</div>
              <div className="mt-1 text-[11px] text-white/35">v5 matte black</div>
            </div>

            <nav className="space-y-1 px-1">
              {NAV.map(n => (
                <Link key={n.href} href={n.href} className={navItem(pathname === n.href)}>
                  <span className="truncate">{n.label}</span>
                  <span className="text-[11px] text-white/25">→</span>
                </Link>
              ))}
            </nav>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/40">
              Matte black UI: low glare, high contrast, clean spacing.
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-12 lg:col-span-9 xl:col-span-10">
          <div className="rounded-[28px] border border-white/10 bg-[#0A0B0C] p-6">
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0">
                <div className="text-xl font-semibold tracking-tight">{title}</div>
                {subtitle ? <div className="mt-1 text-sm text-white/55">{subtitle}</div> : null}
              </div>
              <div className="ml-auto">{right}</div>
            </div>
          </div>

          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
