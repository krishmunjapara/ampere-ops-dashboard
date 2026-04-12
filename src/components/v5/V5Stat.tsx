'use client';

export default function V5Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0A0B0C] p-5">
      <div className="text-[12px] text-white/45">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-white/92">{value}</div>
      {sub ? <div className="mt-2 text-[12px] text-white/35">{sub}</div> : null}
    </div>
  );
}
