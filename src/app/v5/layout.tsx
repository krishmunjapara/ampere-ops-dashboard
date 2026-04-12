import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ampere Ops Dashboard (v5)',
  description: 'Matte black redesign',
};

export default function V5Layout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#050607] text-white">{children}</div>;
}
