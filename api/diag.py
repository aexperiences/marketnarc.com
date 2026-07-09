"""/api/diag — TEMPORARY: diagnose the Alpaca connection. Never returns the secret (only key-id prefix + lengths + Alpaca's own error)."""
import os, json, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler

DATA_BASE = "https://data.alpaca.markets/v2/stocks"

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        kid = os.environ.get("ALPACA_KEY_ID", "")
        sec = os.environ.get("ALPACA_SECRET_KEY", "")
        out = {
            "key_id_present": bool(kid), "key_id_len": len(kid),
            "key_id_prefix": kid.strip()[:3], "key_id_has_whitespace": kid != kid.strip(),
            "secret_present": bool(sec), "secret_len": len(sec), "secret_has_whitespace": sec != sec.strip(),
        }
        try:
            req = urllib.request.Request(
                f"{DATA_BASE}/AAPL/trades/latest?feed=iex",
                headers={"APCA-API-KEY-ID": kid.strip(), "APCA-API-SECRET-KEY": sec.strip()})
            with urllib.request.urlopen(req, timeout=8) as r:
                out["live_status"] = r.status
                out["live_body"] = r.read().decode()[:300]
        except urllib.error.HTTPError as e:
            out["live_status"] = e.code
            try: out["live_body"] = e.read().decode()[:300]
            except Exception: out["live_body"] = "(no body)"
        except Exception as e:
            out["live_status"] = "EXCEPTION"
            out["live_error"] = str(e)[:300]
        # test the exact BARS call live_snapshot makes
        try:
            req2 = urllib.request.Request(
                f"{DATA_BASE}/AAPL/bars?timeframe=1Day&limit=60&feed=iex&adjustment=raw",
                headers={"APCA-API-KEY-ID": kid.strip(), "APCA-API-SECRET-KEY": sec.strip()})
            with urllib.request.urlopen(req2, timeout=8) as r:
                data = json.loads(r.read().decode())
                out["bars_status"] = r.status
                out["bars_count"] = len(data.get("bars") or [])
        except urllib.error.HTTPError as e:
            out["bars_status"] = e.code
            try: out["bars_body"] = e.read().decode()[:300]
            except Exception: out["bars_body"] = "(no body)"
        except Exception as e:
            out["bars_status"] = "EXCEPTION"
            out["bars_error"] = str(e)[:300]
        body = json.dumps(out).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)
