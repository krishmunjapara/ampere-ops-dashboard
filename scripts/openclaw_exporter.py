#!/usr/bin/env python3
"""Export OpenClaw sessions + new transcript events to the Ops Dashboard.

This is the missing piece for "see sub-agents spawned" on the deployed dashboard.
Vercel can't read /root/.openclaw/*, so we run this on the Ampere/OpenClaw host.

It tails *.jsonl transcripts incrementally using byte offsets stored in a local state file.

Usage:
  python3 scripts/openclaw_exporter.py \
    --dashboard https://ampere-ops-dashboard.vercel.app \
    --sessions-json /root/.openclaw/agents/main/sessions/sessions.json \
    --transcripts-dir /root/.openclaw/agents/main/sessions
"""

from __future__ import annotations

import argparse
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen


STATE_PATH_DEFAULT = "/root/.openclaw/workspace/ampere-ops-dashboard/data/openclaw_exporter_state.json"


def now_ms() -> int:
    return int(time.time() * 1000)


def read_json(path: Path, fallback: Any):
    try:
        return json.loads(path.read_text("utf-8"))
    except Exception:
        return fallback


def write_json(path: Path, obj: Any):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, indent=2), "utf-8")
    tmp.replace(path)


def post_json(url: str, payload: dict):
    data = json.dumps(payload).encode("utf-8")
    req = Request(url, data=data, headers={"content-type": "application/json"}, method="POST")
    with urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8")
        if resp.status >= 300:
            raise RuntimeError(f"POST failed {resp.status}: {body}")
        return body


def preview_from_entry(entry: dict) -> str:
    for k in ("content", "text", "message", "delta"):
        v = entry.get(k)
        if isinstance(v, str) and v.strip():
            return v[:180] + ("…" if len(v) > 180 else "")
    # tool call-ish
    tool = entry.get("tool") or {}
    if isinstance(tool, dict):
        name = tool.get("name")
        if name:
            return f"tool: {name}"
    return json.dumps(entry)[:180]


def find_transcript_file(transcripts_dir: Path, session_id: str) -> Optional[Path]:
    direct = transcripts_dir / f"{session_id}.jsonl"
    if direct.exists():
        return direct

    # fallback: pick newest .jsonl starting with session_id
    cand = sorted(transcripts_dir.glob(session_id + "*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)
    return cand[0] if cand else None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dashboard", required=True, help="Base URL")
    ap.add_argument("--sessions-json", required=True)
    ap.add_argument("--transcripts-dir", required=True)
    ap.add_argument("--state", default=STATE_PATH_DEFAULT)
    ap.add_argument("--max-events", type=int, default=2000)
    args = ap.parse_args()

    dashboard = args.dashboard.rstrip("/")
    ingest_url = dashboard + "/api/ingest/openclaw-activity"

    sessions_json = Path(args.sessions_json)
    transcripts_dir = Path(args.transcripts_dir)
    state_path = Path(args.state)

    state = read_json(state_path, {"offsets": {}})
    offsets: Dict[str, int] = state.get("offsets", {})

    sessions_obj = read_json(sessions_json, {})

    # sessions snapshot
    sessions_payload = []
    session_id_to_key: Dict[str, str] = {}

    for session_key, raw in sessions_obj.items():
        session_id = str(raw.get("sessionId") or "")
        if not session_id:
            continue
        session_id_to_key[session_id] = session_key

        origin = raw.get("origin") or {}
        sessions_payload.append(
            {
                "session_key": session_key,
                "session_id": session_id,
                "updated_at": int(raw.get("updatedAt") or 0),
                "kind": None,
                "provider": origin.get("provider"),
                "surface": origin.get("surface"),
                "chat_type": origin.get("chatType"),
                "last_channel": raw.get("lastChannel"),
            }
        )

    # tail transcripts
    events_payload: List[dict] = []

    for session_id, session_key in session_id_to_key.items():
        file = find_transcript_file(transcripts_dir, session_id)
        if not file:
            continue

        key = str(file)
        last_off = int(offsets.get(key, 0))

        try:
            with file.open("rb") as f:
                f.seek(last_off)
                blob = f.read()
                new_off = f.tell()
        except Exception:
            continue

        if not blob:
            offsets[key] = last_off
            continue

        lines = blob.splitlines()
        # If we started mid-line, drop first partial.
        if last_off > 0 and lines:
            # We can't perfectly detect partial, but safest: drop first line.
            lines = lines[1:]

        for ln in lines:
            if not ln.strip():
                continue
            try:
                entry = json.loads(ln.decode("utf-8"))
            except Exception:
                continue

            line_no = int(entry.get("line") or entry.get("lineNo") or 0)
            # If no line number in entry, synthesize using file offset count (not stable). We'll store 0.

            tool_name = None
            tool = entry.get("tool")
            if isinstance(tool, dict):
                tool_name = tool.get("name")

            ev = {
                "event_id": f"{session_id}:{line_no}:{hash(ln)}" if line_no else f"{session_id}:{hash(ln)}",
                "session_key": session_key,
                "session_id": session_id,
                "line": line_no,
                "timestamp": entry.get("ts") or entry.get("createdAt") or entry.get("time"),
                "type": entry.get("type"),
                "role": entry.get("role"),
                "tool_name": tool_name,
                "content_preview": preview_from_entry(entry),
                "raw_json": json.dumps(entry)[:8000],
                "created_at": now_ms(),
            }
            events_payload.append(ev)
            if len(events_payload) >= args.max_events:
                break

        offsets[key] = new_off
        if len(events_payload) >= args.max_events:
            break

    # POST in smaller chunks to avoid Vercel/body-size limits (HTTP 413).
    base_key = f"openclaw-{int(time.time())}"

    # 1) Sessions snapshot (send once)
    post_json(
        ingest_url,
        {
            "idempotencyKey": base_key + ":sessions",
            "payload": {"sessions": sessions_payload, "events": []},
        },
    )

    # 2) Events (chunked)
    sent_events = 0
    chunk_size = 200
    for i in range(0, len(events_payload), chunk_size):
        chunk = events_payload[i : i + chunk_size]
        post_json(
            ingest_url,
            {
                "idempotencyKey": f"{base_key}:events:{i}",
                "payload": {"sessions": [], "events": chunk},
            },
        )
        sent_events += len(chunk)

    write_json(state_path, {"offsets": offsets})

    print(json.dumps({"ok": True, "sessions": len(sessions_payload), "events": sent_events}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
