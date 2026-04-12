import { NextResponse } from 'next/server';
import { getCronRunById } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const run = await getCronRunById(id);
    if (!run) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, run });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
