"""/api/history?tickers=A,B,C&window=3M&benchmark=IWM — the ONE graph's three lines (market / basket / Nate)."""
import json, os, sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _history import build_history

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        q = parse_qs(urlparse(self.path).query)
        raw = (q.get("tickers", [""])[0] or "")
        tickers = [t.strip().upper()[:6] for t in raw.split(",") if t.strip()][:15]
        window = (q.get("window", ["3M"])[0] or "3M").upper()
        if window not in ("1M", "3M", "1Y"):
            window = "3M"
        benchmark = (q.get("benchmark", ["IWM"])[0] or "IWM").strip().upper()[:6]
        if benchmark not in ("IWM", "SPY"):
            benchmark = "IWM"
        if tickers:
            data = build_history(tickers, window, benchmark)
        else:
            data = {"mode": "sample", "window": window, "benchmark": benchmark,
                    "labels": [], "market": [], "basket": [], "nate": [], "tickers": [], "dropped": [],
                    "note": "Add a stock to your basket to see the three lines."}
        body = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "public, max-age=60")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)
