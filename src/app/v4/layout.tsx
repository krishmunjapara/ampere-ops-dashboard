import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ampere Ops Dashboard (v4)',
  description: 'Redesigned ops command center UI',
};

export default function V4Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070A0F] text-white">
      {children}
    </div>
  );
}
