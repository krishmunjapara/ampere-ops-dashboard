# Ampere Ops Dashboard — Implementation Plan

## Prerequisites
- [ ] Confirm OpenClaw session paths on the Ampere machine
- [ ] Confirm whether OpenClaw runs as `root` (so file read permissions work)

## Phase 1 — Scaffold (local-first)
### Task 1: Create Next.js app + theme baseline
**Goal:** Running dashboard UI shell with dark theme + sidebar layout.
**Verify:** `npm run dev` renders home page.

### Task 2: Add SQLite + migrations
**Goal:** Persist cron runs + ideas + self-heal state.
**DB:** SQLite (file-based, zero setup, free). Later migration path to Postgres.
**Verify:** create table + insert/read on a test route.

## Phase 2 — OpenClaw real-time monitoring (read-only)
### Task 3: API route `GET /api/openclaw/sessions`
**Goal:** Read `sessions.json`, return normalized list + recent activity.
**Verify:** returns 200 with sessions on a live OpenClaw instance.

### Task 4: API route `GET /api/openclaw/transcript/:sessionId`
**Goal:** Read transcript JSONL, return parsed entries (paged).
**Verify:** returns entries for a known session id.

### Task 5: UI — Sessions page
**Goal:** Like reference repo: list + filters + click-to-open detail transcript.
**Verify:** selecting session shows transcript panel.

## Phase 3 — Cron run ingestion (structured data)
### Task 6: API route `POST /api/ingest/self-heal-run`
**Goal:** Store hourly digest + action (0/1 fix) with idempotency.
**Verify:** posting same idempotency key twice doesn’t duplicate.

### Task 7: API route `POST /api/ingest/competitor-run`
**Goal:** Store competitor list + 10 ideas output.
**Verify:** ideas show in UI.

### Task 8: UI — Self-healing page
**Goal:** Show hourly history, top signatures, link daily PR.

### Task 9: UI — Competitors/Ideas page
**Goal:** Run history, competitor list, 10 ideas per run.

## Phase 4 — “Manage to save time” features
### Task 10: Actions
- “Open daily PR” button (link)
- “Copy cron prompt” buttons
- “Mark signature ignored” (local state)

## Done definition
- Dashboard loads OpenClaw sessions live
- Dashboard shows stored cron runs (self-heal + competitor)
- Ingestion endpoints documented with example payloads
- Local-only server binds to localhost by default

## Open questions (need answers before Phase 2)
1) Exact OpenClaw paths:
   - sessions.json path
   - transcripts directory path
2) Which OpenClaw agent runtime: `main` only, or include other agent dirs?
