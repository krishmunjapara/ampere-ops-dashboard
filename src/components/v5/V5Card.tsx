'use client';

export default function V5Card({
  title,
  subtitle,
  children,
  right,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0A0B0C] p-5">
      {title ? (
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white/85">{title}</div>
            {subtitle ? <div className="mt-1 text-[12px] text-white/45">{subtitle}</div> : null}
          </div>
          <div className="ml-auto">{right}</div>
        </div>
      ) : null}
      <div className={title ? 'mt-4' : ''}>{children}</div>
    </div>
  );
}
