import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getDatabaseUrl() {
  return (
    process.env.DASHBOARD_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    ''
  );
}

export async function GET() {
  const dbUrlPresent = Boolean(getDatabaseUrl());
  const fileStoreForced = process.env.DASHBOARD_USE_FILE_STORE === 'true';

  const storage = fileStoreForced ? 'file(forced)' : dbUrlPresent ? 'postgres' : 'file';

  return NextResponse.json({
    ok: true,
    storage,
    dbUrlPresent,
    fileStoreForced,
    vercel: Boolean(process.env.VERCEL),
  });
}
