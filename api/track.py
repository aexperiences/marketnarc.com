"""/api/track — the record: {mode, summary, calls}. Sample data until a store is configured + calls logged."""
import json, os, sys
from http.server import BaseHTTPRequestHandler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _store import get_calls, summarize, SAMPLE_CALLS

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        calls = get_calls()
        if not calls:                      # no store, or none logged yet
            mode, calls = "sample", SAMPLE_CALLS
        else:
            mode = "live"
        body = json.dumps({"mode": mode, "summary": summarize(calls), "calls": calls}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "public, max-age=120")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)
