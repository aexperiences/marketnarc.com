"""
/api/resolve — scores matured calls. Runs on a schedule (Vercel cron). For each Open call past its
horizon, fetches the current price and marks Hit / Miss / Abstained by the pre-stated rule. Guarded.
"""
import json, os, datetime
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from _engine import live_price, has_alpaca, sample_snapshot
from _store import get_calls, set_calls, has_store, score

def _authed(self):
    secret = os.environ.get("CRON_SECRET")
    if not secret:
        return True
    if self.headers.get("Authorization", "") == "Bearer " + secret:
        return True
    return parse_qs(urlparse(self.path).query).get("key", [""])[0] == secret

def _price(tk):
    if has_alpaca():
        return live_price(tk)
    return sample_snapshot(tk)["price"]

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if not _authed(self):
            return self._json(401, {"error": "unauthorized"})
        if not has_store():
            return self._json(200, {"ok": False, "note": "No KV store configured."})
        calls = get_calls() or []
        today = datetime.date.today()
        resolved = 0
        for c in calls:
            if c.get("out") != "Open":
                continue
            try:
                d = datetime.date.fromisoformat(c["iso"])
            except Exception:
                continue
            if (today - d).days < c.get("horizon", 44):
                continue
            try:
                p = round(_price(c["tk"]), 2)
            except Exception:
                continue                       # leave open; never fabricate an outcome
            c["now"] = p
            c["out"] = score(c["call"], c["at"], p)
            resolved += 1
        if resolved:
            set_calls(calls)
        return self._json(200, {"ok": True, "resolved": resolved, "total": len(calls)})

    def _json(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code); self.send_header("Content-Type", "application/json")
        self.end_headers(); self.wfile.write(b)
