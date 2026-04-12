import { NextResponse } from 'next/server';
import { listCronRuns } from '@/lib/storage';

export const runtime = 'nodejs';

type RunRow = {
  id: string;
  type: string;
  started_at: number;
  finished_at: number;
  status: string;
  summary_json: string;
  created_at: number;
};

function safeJsonParse<T = any>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function parseSelfHealSignature(sig: string) {
  const parts = (sig ?? '').split('|');
  const kind = parts[0] || 'unknown';

  if (parts.length === 2) {
    return { kind, where: parts[1] ?? '', detail: '' };
  }

  if (kind === 'api_error') {
    const endpoint = parts[1] || '';
    const status = parts[2] || '';
    const where = parts[3] || '';
    return { kind, where, detail: `${endpoint}${status ? ` (status ${status})` : ''}` };
  }

  if (kind === 'frontend_unhandled_rejection') {
    const name = parts[1] || '';
    const message = parts[2] || '';
    const where = parts[3] || '';
    const d = [name, message].filter(Boolean).join(': ');
    return { kind, where, detail: d };
  }

  if (kind === 'frontend_error') {
    const message = parts[1] || '';
    const filename = parts[2] || '';
    const line = parts[3] || '';
    const col = parts[4] || '';
    const where = parts[5] || '';
    const loc = [filename, line && col ? `${line}:${col}` : line].filter(Boolean).join(' @ ');
    return { kind, where, detail: [message, loc].filter(Boolean).join(' — ') };
  }

  return {
    kind,
    where: parts[parts.length - 1] || '',
    detail: parts.slice(1, -1).join(' | '),
  };
}

export async function GET() {
  try {
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;
    const start = now - windowMs;

    // Heuristic: enough for typical dashboards; avoids huge payloads.
    const runs = (await listCronRuns({ limit: 5000 })) as RunRow[];

    const latestByType: Record<string, RunRow> = {};
    const counts24hByType: Record<string, number> = {};

    for (const r of runs) {
      if (!latestByType[r.type]) latestByType[r.type] = r;
      if ((r.created_at ?? 0) >= start) {
        counts24hByType[r.type] = (counts24hByType[r.type] ?? 0) + 1;
      }
    }

    const types = Object.keys({ ...latestByType, ...counts24hByType }).sort();

    // Latest self-heal digest → top failures
    const latestSelfHeal = latestByType['self_heal'] ?? null;
    const selfHealDigest = latestSelfHeal ? safeJsonParse<any>(latestSelfHeal.summary_json)?.digest : null;
    const topNew = Array.isArray(selfHealDigest?.topNew) ? selfHealDigest.topNew : [];
    const topRecurring = Array.isArray(selfHealDigest?.topRecurring) ? selfHealDigest.topRecurring : [];

    const mergedMap = new Map<string, { signature: string; count: number }>();
    for (const item of [...topNew, ...topRecurring]) {
      const signature = String(item?.signature ?? '');
      const count = Number(item?.count ?? 0);
      if (!signature) continue;
      const prev = mergedMap.get(signature);
      mergedMap.set(signature, { signature, count: Math.max(prev?.count ?? 0, count) });
    }

    const selfHealTopFailures = Array.from(mergedMap.values())
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 10)
      .map(x => ({
        signature: x.signature,
        count: x.count,
        ...parseSelfHealSignature(x.signature),
      }));

    return NextResponse.json({
      ok: true,
      now,
      window: { start, end: now },
      types,
      latestByType,
      counts24hByType,
      selfHeal: {
        latestRunId: latestSelfHeal?.id ?? null,
        sinceMinutes: Number(selfHealDigest?.sinceMinutes ?? 0) || null,
        topFailures: selfHealTopFailures,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
