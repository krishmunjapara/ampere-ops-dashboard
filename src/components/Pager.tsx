'use client';

export default function Pager({
  canPrev,
  canNext,
  onPrev,
  onNext,
  right,
}: {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  right?: React.ReactNode;
}) {
  const btn = (disabled: boolean) =>
    [
      'text-[11px] rounded-md border px-2 py-1',
      disabled
        ? 'border-white/5 bg-white/5 text-white/30'
        : 'border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20',
    ].join(' ');

  return (
    <div className="flex items-center gap-2">
      <button className={btn(!canPrev)} onClick={onPrev} disabled={!canPrev}>
        Prev
      </button>
      <button className={btn(!canNext)} onClick={onNext} disabled={!canNext}>
        Next
      </button>
      <div className="ml-auto">{right}</div>
    </div>
  );
}
