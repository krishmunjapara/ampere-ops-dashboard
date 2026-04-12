'use client';

export default function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <div className="text-base font-semibold tracking-tight">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-white/60">{subtitle}</div> : null}
        </div>
        <div className="ml-auto">{right}</div>
      </div>
    </div>
  );
}
