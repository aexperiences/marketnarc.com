"""
/api/publish — logs Nate's official calls on the watchlist. Meant to run on a schedule (Vercel cron).
Appends a new call when a ticker has no open call, or when Nate's verdict changed. Guarded by CRON_SECRET.
Only logs the curated watchlist — NOT every ad-hoc lookup — so the record stays Nate's real calls.
"""
import json, os, sys, datetime
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _engine import make_call
from _store import get_calls, set_calls, has_store, WATCHLIST, HORIZON_DAYS

def _authed(self):
    secret = os.environ.get("CRON_SECRET")
    if not secret:
        return True
    if self.headers.get("Authorization", "") == "Bearer " + secret:   # Vercel cron sends this
        return True
    return parse_qs(urlparse(self.path).query).get("key", [""])[0] == secret

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if not _authed(self):
            return self._json(401, {"error": "unauthorized"})
        if not has_store():
            return self._json(200, {"ok": False,
                "note": "No KV store configured. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN "
                        "(or KV_REST_API_*) to start logging Nate's calls."})
        calls = get_calls() or []
        open_by_tk = {c["tk"]: c for c in calls if c.get("out") == "Open"}
        today = datetime.date.today()
        added, mode = 0, "sample"
        for tk in WATCHLIST:
            r = make_call(tk); mode = r["mode"]
            prev = open_by_tk.get(tk)
            if prev and prev.get("call") == r["verdict"]:
                continue                      # same open stance — nothing new to log
            calls.append({
                "id": f"{tk}-{today.isoformat()}", "tk": tk, "nm": tk,
                "iso": today.isoformat(), "date": today.strftime("%b %d").replace(" 0", " "),
                "call": r["verdict"], "conf": r["confidence"], "at": r["price"],
                "now": None, "out": "Open", "horizon": HORIZON_DAYS,
            })
            added += 1
        set_calls(calls)
        return self._json(200, {"ok": True, "added": added, "total": len(calls), "mode": mode})

    def _json(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code); self.send_header("Content-Type", "application/json")
        self.end_headers(); self.wfile.write(b)
