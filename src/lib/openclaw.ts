import fs from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import readline from 'node:readline';

export type OpenClawChatType = 'direct' | 'channel' | 'unknown';
export type OpenClawSessionKind = 'direct' | 'group' | 'cron' | 'unknown';

export interface OpenClawSessionSummary {
  sessionKey: string;
  sessionId: string;
  updatedAt: number;
  origin?: {
    provider?: string;
    surface?: string;
    chatType?: string;
  };
  lastChannel?: string;
  abortedLastRun?: boolean;
  systemSent?: boolean;
  kind: OpenClawSessionKind;
  chatType: OpenClawChatType;
  active: boolean;
}

export interface TranscriptEntry {
  line: number;
  raw: unknown;
  // Common fields (best-effort)
  role?: string;
  type?: string;
  contentPreview?: string;
  ts?: number;
}

export interface TranscriptPage {
  sessionId: string;
  file: string;
  offset: number;
  limit: number;
  entries: TranscriptEntry[];
  nextOffset: number | null;
  totalLines?: number;
}

function getEnvPath(name: string, fallback: string) {
  return process.env[name] && process.env[name]!.trim() ? process.env[name]!.trim() : fallback;
}

export function getOpenClawPaths() {
  const sessionsFile = getEnvPath(
    'OPENCLAW_SESSIONS_FILE',
    '/root/.openclaw/agents/main/sessions/sessions.json',
  );
  const transcriptsDir = getEnvPath(
    'OPENCLAW_TRANSCRIPTS_DIR',
    '/root/.openclaw/agents/main/sessions',
  );
  return { sessionsFile, transcriptsDir };
}

function classifySessionKind(raw: any): { kind: OpenClawSessionKind; chatType: OpenClawChatType } {
  const chatType = (raw?.origin?.chatType as string | undefined) ?? 'unknown';
  const ct: OpenClawChatType = chatType === 'direct' || chatType === 'channel' ? chatType : 'unknown';

  // Cron sessions often include the cron skill in the snapshot.
  const hasCronSkill = Array.isArray(raw?.skillsSnapshot?.skills)
    ? raw.skillsSnapshot.skills.some((s: any) => s?.name === 'cron')
    : false;

  if (hasCronSkill) return { kind: 'cron', chatType: ct };
  if (ct === 'channel') return { kind: 'group', chatType: ct };
  if (ct === 'direct') return { kind: 'direct', chatType: ct };
  return { kind: 'unknown', chatType: ct };
}

export async function loadSessions(): Promise<OpenClawSessionSummary[]> {
  const { sessionsFile } = getOpenClawPaths();
  const rawText = await fs.readFile(sessionsFile, 'utf8');
  const obj = JSON.parse(rawText) as Record<string, any>;
  const now = Date.now();
  const ACTIVE_WINDOW_MS = 2 * 60 * 60 * 1000;

  const out: OpenClawSessionSummary[] = Object.entries(obj).map(([sessionKey, raw]) => {
    const updatedAt = Number(raw?.updatedAt ?? 0);
    const { kind, chatType } = classifySessionKind(raw);
    return {
      sessionKey,
      sessionId: String(raw?.sessionId ?? ''),
      updatedAt,
      origin: raw?.origin,
      lastChannel: raw?.lastChannel,
      abortedLastRun: Boolean(raw?.abortedLastRun),
      systemSent: Boolean(raw?.systemSent),
      kind,
      chatType,
      active: updatedAt > 0 ? now - updatedAt < ACTIVE_WINDOW_MS : false,
    };
  });

  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

async function findTranscriptFile(transcriptsDir: string, sessionId: string): Promise<string> {
  const direct = path.join(transcriptsDir, `${sessionId}.jsonl`);
  try {
    await fs.access(direct);
    return direct;
  } catch {
    // fallthrough
  }

  // Fallback: choose latest mtime among files starting with sessionId.
  const files = await fs.readdir(transcriptsDir);
  const candidates = files
    .filter(f => f.startsWith(sessionId) && f.endsWith('.jsonl'))
    .map(f => path.join(transcriptsDir, f));

  if (!candidates.length) {
    throw new Error(`Transcript not found for sessionId=${sessionId}`);
  }

  const withStat = await Promise.all(
    candidates.map(async file => ({ file, stat: await fs.stat(file) })),
  );
  withStat.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  return withStat[0]!.file;
}

function previewFromRaw(raw: any): string | undefined {
  const s =
    raw?.content ??
    raw?.text ??
    raw?.message ??
    raw?.delta ??
    raw?.tool?.name ??
    raw?.error?.message;
  if (!s) return undefined;
  const str = typeof s === 'string' ? s : JSON.stringify(s);
  return str.length > 180 ? str.slice(0, 180) + '…' : str;
}

export async function loadTranscriptPage(params: {
  sessionId: string;
  offset?: number;
  limit?: number;
}): Promise<TranscriptPage> {
  const { transcriptsDir } = getOpenClawPaths();
  const sessionId = params.sessionId;
  const offset = Math.max(0, Number(params.offset ?? 0));
  const limit = Math.min(500, Math.max(1, Number(params.limit ?? 200)));

  const file = await findTranscriptFile(transcriptsDir, sessionId);

  const entries: TranscriptEntry[] = [];
  let lineNo = 0;
  let taken = 0;

  const stream = createReadStream(file, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    lineNo += 1;
    if (lineNo <= offset) continue;
    if (taken >= limit) continue;

    let raw: any = line;
    try {
      raw = JSON.parse(line);
    } catch {
      // keep raw string
    }

    entries.push({
      line: lineNo,
      raw,
      role: raw?.role,
      type: raw?.type,
      ts: raw?.ts ?? raw?.createdAt ?? raw?.time,
      contentPreview: previewFromRaw(raw),
    });
    taken += 1;
  }

  // If we filled the page, we *might* have more. Without a full scan, we expose nextOffset when page filled.
  const nextOffset = entries.length === limit ? offset + limit : null;

  return {
    sessionId,
    file,
    offset,
    limit,
    entries,
    nextOffset,
  };
}
