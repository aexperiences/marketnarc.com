"""
Track-record store + scoring. Storage is a KV (Upstash Redis REST or Vercel KV — same API).
Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL + KV_REST_API_TOKEN)
to persist. With no store configured, callers fall back to SAMPLE_CALLS (clearly labeled).
"""
import os, json, urllib.request

KEY = "marketnarc:track:calls"
HORIZON_DAYS = 44          # ~30 trading days
THRESHOLD = 0.04           # ±4% decides a call

WATCHLIST = ["RVLN", "CPRM", "VOLT", "ATLS", "MRDN", "GRND", "SABL", "CIRR"]

def _url():   return os.environ.get("UPSTASH_REDIS_REST_URL") or os.environ.get("KV_REST_API_URL")
def _token(): return os.environ.get("UPSTASH_REDIS_REST_TOKEN") or os.environ.get("KV_REST_API_TOKEN")
def has_store(): return bool(_url() and _token())

def _cmd(*args):
    req = urllib.request.Request(_url(), data=json.dumps(list(args)).encode(),
        headers={"Authorization": "Bearer " + _token(), "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.loads(r.read().decode()).get("result")

def get_calls():
    """Returns the stored list, or None when no store is configured (sample mode)."""
    if not has_store(): return None
    raw = _cmd("GET", KEY)
    return json.loads(raw) if raw else []

def set_calls(calls):
    _cmd("SET", KEY, json.dumps(calls))

# ---------- scoring (pure, testable) ----------
def score(verdict, at, price_now):
    if price_now is None: return "Open"
    if verdict == "WATCH": return "Abstained"
    ch = (price_now - at) / at
    if verdict == "BUY":  return "Hit" if ch >= THRESHOLD else "Miss"
    if verdict == "SELL": return "Hit" if ch <= -THRESHOLD else "Miss"
    if verdict == "HOLD": return "Hit" if abs(ch) < THRESHOLD else "Miss"
    return "Open"

def _tier(conf): return "high" if conf >= 80 else ("mid" if conf >= 60 else "low")

def summarize(calls):
    tiers = {"high": [0, 0], "mid": [0, 0], "low": [0, 0]}   # [hits, decisive]
    dec_hits = dec = watch = open_ct = 0
    conf_sum = 0
    for c in calls:
        conf_sum += c.get("conf", 0)
        out = c.get("out", "Open")
        if out == "Open": open_ct += 1; continue
        if out == "Abstained" or c.get("call") == "WATCH": watch += 1; continue
        t = _tier(c.get("conf", 0)); tiers[t][1] += 1; dec += 1
        if out == "Hit": tiers[t][0] += 1; dec_hits += 1
    def rate(pair): return round(pair[0] / pair[1] * 100) if pair[1] else None
    return {
        "calls_made": len(calls),
        "resolved": dec, "open": open_ct, "sat_out": watch,
        "hit_rate": rate([dec_hits, dec]),
        "avg_confidence": round(conf_sum / len(calls)) if calls else 0,
        "tiers": {
            "high": {"rate": rate(tiers["high"]), "hits": tiers["high"][0], "n": tiers["high"][1]},
            "mid":  {"rate": rate(tiers["mid"]),  "hits": tiers["mid"][0],  "n": tiers["mid"][1]},
            "low":  {"hits": tiers["low"][0], "n": tiers["low"][1]},
        },
    }

# ---------- sample data (used only when no store is configured) ----------
SAMPLE_CALLS = [
 {"id":"s1","tk":"RVLN","nm":"Riverline Bank","date":"Jun 3","call":"BUY","conf":92,"at":12.40,"now":14.10,"out":"Hit"},
 {"id":"s2","tk":"CPRM","nm":"Copperfield Mining","date":"Jun 5","call":"BUY","conf":88,"at":54.20,"now":61.80,"out":"Hit"},
 {"id":"s3","tk":"VOLT","nm":"Voltaire Energy","date":"Jun 6","call":"SELL","conf":84,"at":18.90,"now":15.20,"out":"Hit"},
 {"id":"s4","tk":"ATLS","nm":"Atlas Freight","date":"Jun 9","call":"BUY","conf":90,"at":44.30,"now":49.10,"out":"Hit"},
 {"id":"s5","tk":"NHRV","nm":"Northern Harvest","date":"Jun 10","call":"BUY","conf":83,"at":31.00,"now":29.40,"out":"Miss"},
 {"id":"s6","tk":"SABL","nm":"SableWorks","date":"Jun 12","call":"SELL","conf":69,"at":27.40,"now":26.90,"out":"Hit"},
 {"id":"s7","tk":"MRDN","nm":"Meridian Pay","date":"Jun 13","call":"HOLD","conf":62,"at":9.10,"now":9.35,"out":"Hit"},
 {"id":"s8","tk":"CIRR","nm":"Cirrus Software","date":"Jun 16","call":"HOLD","conf":62,"at":77.00,"now":88.50,"out":"Miss"},
 {"id":"s9","tk":"GRND","nm":"Grandview REIT","date":"Jun 17","call":"BUY","conf":66,"at":22.10,"now":21.60,"out":"Miss"},
 {"id":"s10","tk":"PNNY","nm":"a penny-stock example","date":"Jun 19","call":"WATCH","conf":41,"at":2.80,"now":2.10,"out":"Abstained"},
 {"id":"s11","tk":"BRWM","nm":"Brightwater Marine","date":"Jun 24","call":"BUY","conf":81,"at":15.75,"now":None,"out":"Open"},
 {"id":"s12","tk":"KELP","nm":"Kelp Nutrition","date":"Jun 25","call":"WATCH","conf":38,"at":6.20,"now":None,"out":"Open"},
]
