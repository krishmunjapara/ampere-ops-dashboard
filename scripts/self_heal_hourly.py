#!/usr/bin/env python3
"""Hourly self-healing ingest (GA4 -> Ops Dashboard).

- Queries GA4 for the last N minutes.
- Extracts error-ish events we care about.
- Sends a digest to the ops dashboard ingestion endpoint.

This intentionally does NOT auto-fix code yet. It just makes the data real + visible.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.request
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def post_json(url: str, payload: dict) -> None:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        body = resp.read().decode("utf-8")
        if resp.status >= 300:
            raise RuntimeError(f"POST {url} failed: {resp.status} {body}")


def ga4_query(property_id: str, since_minutes: int):
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, RunReportRequest
        from google.oauth2 import service_account
    except Exception as e:
        raise RuntimeError(
            "Missing GA4 deps. Install into venv: pip install google-analytics-data google-auth"
        ) from e

    sa_path = os.environ.get("GA4_SERVICE_ACCOUNT_JSON_PATH")
    if not sa_path:
        raise RuntimeError("Missing GA4_SERVICE_ACCOUNT_JSON_PATH")

    creds = service_account.Credentials.from_service_account_file(sa_path)
    client = BetaAnalyticsDataClient(credentials=creds)

    now_utc = utc_now()
    start_utc = now_utc - timedelta(minutes=since_minutes)

    tz_name = os.environ.get("GA4_TIMEZONE", "UTC")
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = timezone.utc
        tz_name = "UTC"

    # GA4 `dateHourMinute` is in the property timezone (unknown to us). We will derive the time window
    # from the maximum `dateHourMinute` returned by GA4 to avoid timezone mismatches.
    now = now_utc.astimezone(tz)
    start = start_utc.astimezone(tz)
    start_key = start.strftime("%Y%m%d%H%M")
    end_key = now.strftime("%Y%m%d%H%M")

    def run(dimensions: list[Dimension]):
        req = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=dimensions,
            metrics=[Metric(name="eventCount")],
            date_ranges=[
                DateRange(
                    start_date=(start.date() - timedelta(days=1)).isoformat(),
                    end_date=now.date().isoformat(),
                )
            ],
            dimension_filter={
                "filter": {
                    "field_name": "eventName",
                    "in_list_filter": {
                        "values": [
                            "frontend_error",
                            "frontend_unhandled_rejection",
                            "api_error",
                        ]
                    },
                }
            },
            limit=5000,
        )
        return client.run_report(req)

    # Try rich dimensions (requires GA4 custom definitions). If not configured, fall back.
    try:
        resp = run(
            [
                Dimension(name="eventName"),
                Dimension(name="customEvent:message"),
                Dimension(name="customEvent:filename"),
                Dimension(name="customEvent:lineno"),
                Dimension(name="customEvent:colno"),
                Dimension(name="customEvent:name"),
                Dimension(name="customEvent:endpoint"),
                Dimension(name="customEvent:status"),
                Dimension(name="pagePath"),
                Dimension(name="dateHourMinute"),
            ]
        )
        rich = True
    except Exception:
        resp = run([Dimension(name="eventName"), Dimension(name="pagePath"), Dimension(name="dateHourMinute")])
        rich = False

    parsed = []
    max_key = ""

    for row in resp.rows:
        dims = [dv.value for dv in row.dimension_values]
        event_count = int(row.metric_values[0].value or "0")
        date_hm = dims[-1] if dims else ""
        if date_hm and date_hm > max_key:
            max_key = date_hm
        parsed.append((dims, event_count, date_hm))

    # Derive time window from GA4's latest bucket.
    if max_key:
        try:
            end_dt = datetime.strptime(max_key, "%Y%m%d%H%M")
            start_dt = end_dt - timedelta(minutes=since_minutes)
            start_key = start_dt.strftime("%Y%m%d%H%M")
            end_key = max_key
        except Exception:
            # fall back to the earlier computed keys
            pass

    out = []
    for dims, event_count, date_hm in parsed:
        if date_hm and (date_hm < start_key or date_hm > end_key):
            continue

        if rich:
            out.append(
                {
                    "eventName": dims[0],
                    "message": dims[1],
                    "filename": dims[2],
                    "lineno": dims[3],
                    "colno": dims[4],
                    "name": dims[5],
                    "endpoint": dims[6],
                    "status": dims[7],
                    "pagePath": dims[8],
                    "dateHourMinute": date_hm,
                    "eventCount": event_count,
                }
            )
        else:
            out.append(
                {
                    "eventName": dims[0],
                    "pagePath": dims[1] if len(dims) > 1 else "",
                    "dateHourMinute": date_hm,
                    "eventCount": event_count,
                }
            )

    return out, ("rich" if rich else "fallback")


def signature_for(r: dict) -> str:
    kind = r.get("eventName") or "unknown"
    page = r.get("pagePath") or ""

    # Rich signatures (only available once GA4 custom definitions exist)
    if kind == "frontend_error" and (r.get("message") or r.get("filename")):
        parts = [
            r.get("message") or "",
            r.get("filename") or "",
            r.get("lineno") or "",
            r.get("colno") or "",
            page,
        ]
        return "frontend_error|" + "|".join(parts)

    if kind == "frontend_unhandled_rejection" and (r.get("message") or r.get("name")):
        parts = [r.get("name") or "", r.get("message") or "", page]
        return "frontend_unhandled_rejection|" + "|".join(parts)

    if kind == "api_error" and (r.get("endpoint") or r.get("status")):
        parts = [r.get("endpoint") or "", r.get("status") or "", page]
        return "api_error|" + "|".join(parts)

    # Fallback signature: eventName + pagePath (still useful for heatmap-like triage)
    return kind + ("|" + page if page else "")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--property", required=True)
    ap.add_argument("--since-minutes", type=int, default=60)
    ap.add_argument("--dashboard-url", default="http://127.0.0.1:3900")
    args = ap.parse_args()

    started_at = int(time.time() * 1000)
    rows, mode = ga4_query(args.property, args.since_minutes)

    counts = {}
    for r in rows:
        sig = signature_for(r)
        counts[sig] = counts.get(sig, 0) + int(r.get("eventCount") or 0)

    top = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    top_new = [{"signature": s, "count": c} for s, c in top[:5] if c > 0]

    idempotency = utc_now().strftime("self-heal-%Y%m%d-%H%M")
    finished_at = int(time.time() * 1000)

    payload = {
        "idempotencyKey": idempotency,
        "startedAt": started_at,
        "finishedAt": finished_at,
        "status": "ok",
        "digest": {"sinceMinutes": args.since_minutes, "mode": mode, "topNew": top_new, "topRecurring": []},
        "action": None,
        "signatures": [
            {"signature": x["signature"], "status": "new", "lastCount": x["count"]}
            for x in top_new
        ],
    }

    post_json(args.dashboard_url.rstrip("/") + "/api/ingest/self-heal-run", payload)

    print(json.dumps({"ok": True, "id": idempotency, "mode": mode, "top": top_new}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
