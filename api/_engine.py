"""
MarketNarc engine (shared) — Alpaca snapshot -> Rex (technicals) + Pat (fundamentals, limited)
-> Nate -> honest call. Deterministic. Sample mode when Alpaca keys absent. Never places trades.
"""
import os, json, statistics, urllib.request, hashlib

DATA_BASE = "https://data.alpaca.markets/v2/stocks"
CONF_CEILING = 78
WATCH_FLOOR  = 45

def has_alpaca():
    return bool(os.environ.get("ALPACA_KEY_ID") and os.environ.get("ALPACA_SECRET_KEY"))

def _get(url):
    req = urllib.request.Request(url, headers={
        "APCA-API-KEY-ID": os.environ.get("ALPACA_KEY_ID", ""),
        "APCA-API-SECRET-KEY": os.environ.get("ALPACA_SECRET_KEY", ""),
    })
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.loads(r.read().decode())

def live_price(ticker):
    try:
        return _get(f"{DATA_BASE}/{ticker}/trades/latest?feed=iex")["trade"]["p"]
    except Exception:
        bars = _get(f"{DATA_BASE}/{ticker}/bars?timeframe=1Day&limit=1&feed=iex")["bars"]
        return bars[-1]["c"]

def live_snapshot(ticker):
    bars = _get(f"{DATA_BASE}/{ticker}/bars?timeframe=1Day&limit=60&feed=iex&adjustment=raw")
    closes = [b["c"] for b in bars.get("bars", [])]
    if len(closes) < 25:
        raise ValueError("not enough history")
    try:
        price = _get(f"{DATA_BASE}/{ticker}/trades/latest?feed=iex")["trade"]["p"]
    except Exception:
        price = closes[-1]
    return {"ticker": ticker.upper(), "price": price, "closes": closes, "mode": "live"}

def sample_snapshot(ticker):
    seed = int(hashlib.sha256(ticker.upper().encode()).hexdigest(), 16); rng = seed
    def nxt():
        nonlocal rng
        rng = (rng * 6364136223846793005 + 1442695040888963407) % (2**64)
        return rng / 2**64
    drift = (nxt() - 0.5) * 0.006; vol = 0.008 + nxt() * 0.03; p = 8 + nxt() * 80
    closes = []
    for _ in range(60):
        p = max(0.5, p * (1 + drift + (nxt() - 0.5) * 2 * vol)); closes.append(round(p, 2))
    price = round(closes[-1] * (1 + (nxt() - 0.5) * 2 * vol), 2)
    return {"ticker": ticker.upper(), "price": price, "closes": closes, "mode": "sample"}

def _sma(vals, n):
    s = vals[-n:] if len(vals) >= n else vals; return sum(s) / len(s)
def _clamp(x, lo=-1.0, hi=1.0): return max(lo, min(hi, x))

def rex_technicals(snap):
    closes, price = snap["closes"], snap["price"]
    sma20, sma50 = _sma(closes, 20), _sma(closes, 50)
    mom20 = price / closes[-20] - 1 if len(closes) >= 20 else 0.0
    rets = [closes[i] / closes[i - 1] - 1 for i in range(1, len(closes))]
    vol_d = statistics.pstdev(rets[-20:]) if len(rets) >= 20 else statistics.pstdev(rets)
    trend = _clamp((price - sma50) / sma50 / 0.12); mom = _clamp(mom20 / 0.10)
    lean = _clamp(0.5 * trend + 0.4 * mom + 0.1 * (1 if price > sma20 else -1))
    return {"lens": "rex", "lean": lean, "sma20": sma20, "sma50": sma50, "mom20": mom20, "vol_d": vol_d}

def pat_fundamentals(snap):
    closes, price = snap["closes"], snap["price"]
    drawdown = price / max(closes) - 1
    lean = _clamp(_clamp(drawdown / -0.30) * -1 * 0.5)
    return {"lens": "pat", "lean": lean, "data_limited": True, "drawdown": drawdown}

def nate(snap, rex, pat):
    combined = _clamp(0.7 * rex["lean"] + 0.3 * pat["lean"])
    disagree = (rex["lean"] > 0) != (pat["lean"] > 0) and abs(pat["lean"]) > 0.15
    high_vol = rex["vol_d"] > 0.035
    conf = int(round(min(CONF_CEILING, 30 + abs(combined) * 70)))
    if disagree: conf -= 12
    if high_vol: conf -= 10
    conf = max(20, conf)
    not_sure = conf < WATCH_FLOOR
    verdict = "WATCH" if not_sure else ("BUY" if combined > 0.15 else ("SELL" if combined < -0.15 else "HOLD"))
    mo = rex["mom20"] * 100
    bull = ("Trading above its 20- and 50-day averages" if snap["price"] > rex["sma50"] else "Holding key support so far")
    bull += f", {'up' if mo>=0 else 'down'} {abs(mo):.1f}% over the last month."
    bear = ("Volatility is high, so the move is stretched and can snap back." if high_vol
            else "Momentum is mild — not much conviction either way.")
    if pat.get("data_limited"): bear += " And I'm working off price action only — no deep fundamentals on this feed."
    why = {"BUY":"The trend and momentum both point up, and they agree.",
           "SELL":"The trend and momentum both point down.",
           "HOLD":"It's drifting — no edge worth acting on right now.",
           "WATCH":"The signals conflict or the data's too thin to call. I'd rather wait."}[verdict]
    return {"ticker": snap["ticker"], "price": round(snap["price"], 2), "verdict": verdict,
            "confidence": conf, "not_sure": not_sure, "why": why, "bull": bull, "bear": bear,
            "risk": f"~{rex['vol_d']*100:.1f}% average daily swing.",
            "signals": {"trend_vs_50d": round((snap['price']-rex['sma50'])/rex['sma50']*100,1),
                        "momentum_1m": round(mo,1), "daily_vol_pct": round(rex['vol_d']*100,1)},
            "mode": snap["mode"], "disclaimer": "Educational, not financial advice. You decide.",
            "data_note": "Data via Alpaca (IEX). Fundamentals limited on this feed." if snap["mode"]=="live"
                         else "Sample data — illustrative preview, not live or a recommendation."}

def make_call(ticker):
    try:
        snap = live_snapshot(ticker) if has_alpaca() else sample_snapshot(ticker)
    except Exception:
        snap = sample_snapshot(ticker)
        out = nate(snap, rex_technicals(snap), pat_fundamentals(snap))
        out["mode"] = "sample"; out["data_note"] = "Live data unavailable — showing a sample read, not a recommendation."
        return out
    return nate(snap, rex_technicals(snap), pat_fundamentals(snap))
