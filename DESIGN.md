# Ampere Ops Dashboard — Design

## Goal
A single local-first dashboard to observe and manage the whole “agent company”:
- Main agent + sub-agent sessions (live status + transcripts)
- Cron jobs (hourly self-healing + competitor intel 3×/day IST)
- Error feed (GA4-derived) + fix lifecycle (daily PR)
- Competitor discoveries + 10 ideas per run

Everything must show **real data** (not mock UI).

## Chosen architecture (hybrid)
### A) Direct-pull (real-time OpenClaw activity)
Read OpenClaw’s on-disk session data, like the reference repo you shared (`openclaw-power-dashboard`).
- Source: `sessions.json` + transcript JSONL files
- Exposed via API routes:
  - `GET /api/openclaw/sessions`
  - `GET /api/openclaw/transcript/:sessionId`

Why: this is the only way to show **true live agent/sub-agent conversations + tool output** without needing OpenClaw internals to push events.

### B) Ingestion + DB (cron/business data)
Store run summaries for:
- Self-healing hourly runs (digest + chosen signature + PR/commit links)
- Competitor intel runs (sources + competitors + ideas)

Why: OpenClaw’s session logs alone won’t give structured “competitor ideas list”, “self-heal state”, etc. We need normalized tables.

## Local-first deployment
- Runs on localhost initially.
- No auth for now (explicitly requested). Add later.

## Data sources
1) **OpenClaw runtime** (filesystem)
2) **GA4** (cron queries GA4 API; dashboard shows stored results + links)
3) **GitHub** (PR/commit links; optional future: read PR status)

## Configuration
Environment variables (local `.env.local`):
- `OPENCLAW_SESSIONS_FILE` (default guess): `/root/.openclaw/agents/main/sessions/sessions.json`
- `OPENCLAW_TRANSCRIPTS_DIR` (default guess): `/root/.openclaw/agents/main/sessions/`
- `DASHBOARD_DB_PATH` (SQLite file): `./data/dashboard.sqlite`

## UI layout (theme like reference)
- Dark dashboard
- Left sidebar filters
- Top stats bar
- Main list panel (sessions / runs)
- Right detail panel (selected item transcript / run details)

## Key objects
### 1) OpenClaw session (read-only)
- id, label, kind (direct/group/cron/subagent), last activity, recent entries

### 2) Cron run (stored)
- id, type (`self_heal` | `competitor_intel`)
- startedAt, finishedAt, status
- summary JSON + links

### 3) Self-heal signature (stored)
- signature key, counts, status (`new|pr_opened|fixed|ignored`), lastSeen

### 4) Competitor idea (stored)
- runId, title, description, category, confidence, source URLs

## Failure modes + guardrails
- Wrong OpenClaw paths → show a clear “configure paths” banner.
- Huge transcripts → paginate server-side.
- Duplicate ingestion → require idempotency key on ingest payload.
- Sensitive logs → no auth now, but clearly label “LOCAL ONLY” and block remote bind by default.
