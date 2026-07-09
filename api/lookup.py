"""/api/lookup?ticker=SYM — company name + validity for one symbol. See _engine.py.
Live (Alpaca key present): real company name, 404 -> not a real ticker.
Sample/no key: best-effort name from a small bundled map, marked unverified."""
import json, os, sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _engine import asset_info

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        q = parse_qs(urlparse(self.path).query)
        ticker = (q.get("ticker", [""])[0] or "").strip().upper()[:6]
        body = json.dumps(asset_info(ticker)).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "public, max-age=300")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)
