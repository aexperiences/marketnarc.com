"""
MarketNarc history engine — the ONE graph: three rebased-to-100 lines over a window.
  1) MARKET  = a benchmark (default IWM = Russell 2000 small-caps; SPY optional)
  2) BASKET  = equal-weight buy-and-hold of the user's watchlist
  3) NATE    = follow Nate's deterministic BUY/SELL/HOLD/WATCH signal on that same basket
Deterministic. Live via Alpaca IEX when keys are set, else a labeled sample preview.
Never trades, never advises — this is a tracking/education view. See _engine.py.
"""
import hashlib
from datetime import date, timedelta
from _engine import has_alpaca, _get, DATA_BASE, rex_technicals, pat_fundamentals, nate

WINDOWS = {"1M": 21, "3M": 63, "1Y": 252}
WARMUP = 55  # bars before the window so Nate's SMA50 signal is valid from day one


def _live_closes(ticker, n):
    # Alpaca needs a real start date (no start -> today only -> empty). Ask wide, keep the most recent n.
    start = (date.today() - timedelta(days=int(n * 1.6) + 15)).isoformat()
    bars = _get(f"{DATA_BASE}/{ticker}/bars?timeframe=1Day&limit=10000&feed=iex&adjustment=raw&start={start}").get("bars", [])
    return [b["c"] for b in bars][-n:]


def _sample_closes(ticker, n):
    """Deterministic per-ticker synthetic price path — penny/mid-weighted range. For preview only."""
    rng = int(hashlib.sha256(ticker.upper().encode()).hexdigest(), 16)
    def nxt():
        nonlocal rng
        rng = (rng * 6364136223846793005 + 1442695040888963407) % (2 ** 64)
        return rng / 2 ** 64
    drift = (nxt() - 0.5) * 0.006
    vol = 0.012 + nxt() * 0.045            # pennies/mids swing harder than the S&P
    p = 0.6 + nxt() * 40                    # start somewhere in penny..mid land
    out = []
    for _ in range(n):
        p = max(0.15, p * (1 + drift + (nxt() - 0.5) * 2 * vol))
        out.append(round(p, 4))
    return out


def _closes(ticker, n):
    if has_alpaca():
        try:
            c = _live_closes(ticker, n)
            if len(c) >= 20:
                return c, "live"
        except Exception:
            pass
    return _sample_closes(ticker, n), "sample"


def _verdict(closes_upto):
    snap = {"ticker": "X", "price": closes_upto[-1], "closes": closes_upto, "mode": "live"}
    try:
        return nate(snap, rex_technicals(snap), pat_fundamentals(snap))["verdict"]
    except Exception:
        return "WATCH"


def _labels(n):
    """n business-day date labels ending today (approx; good enough for the axis in both modes)."""
    days, d = [], date.today()
    while len(days) < n:
        if d.weekday() < 5:
            days.append(d.isoformat())
        d -= timedelta(days=1)
    return list(reversed(days))


def build_history(tickers, window="3M", benchmark="IWM"):
    n_win = WINDOWS.get(window, 63)
    n_total = n_win + WARMUP
    mode = "sample"

    bench, bm = _closes(benchmark, n_total)
    if bm == "live":
        mode = "live"

    kept = []                              # [(ticker, closes)]
    dropped = []                           # tickers with no usable data (often OTC pennies)
    for t in tickers[:15]:
        c, m = _closes(t, n_total)
        if m == "live":
            mode = "live"
        if len(c) >= n_win + 5:
            kept.append((t, c))
        else:
            dropped.append(t)

    if not kept or len(bench) < n_win + 5:
        return {"mode": mode, "window": window, "benchmark": benchmark,
                "labels": [], "market": [], "basket": [], "nate": [],
                "tickers": [], "dropped": dropped,
                "note": "Not enough price history for these — common for true OTC pennies (not on the IEX feed)."}

    win = min(n_win, len(bench) - 1, min(len(c) for _, c in kept) - 1)

    # 1) MARKET
    market = _rebase(bench[-win:])

    # 2) BASKET — equal-weight buy & hold
    basket = []
    for i in range(win):
        ratios = [(c[-win:][i] / (c[-win:][0] or 1)) for _, c in kept]
        basket.append(round(100 * sum(ratios) / len(ratios), 2))

    # 3) NATE — follow his signal per ticker (in on BUY/HOLD, cash on SELL/WATCH), equal-weight
    paths = []
    for _, c in kept:
        cwin = c[-win:]
        start = len(c) - win
        val, path = 1.0, [1.0]
        for i in range(1, win):
            v = _verdict(c[:start + i])                 # signal as of the prior close
            ret = cwin[i] / (cwin[i - 1] or cwin[i]) - 1
            if v in ("BUY", "HOLD"):
                val *= (1 + ret)                        # holding
            path.append(val)                            # else flat (in cash)
        paths.append(path)
    nate_series = [round(100 * sum(p[i] for p in paths) / len(paths), 2) for i in range(win)]

    return {"mode": mode, "window": window, "benchmark": benchmark,
            "labels": _labels(win), "market": market, "basket": basket, "nate": nate_series,
            "tickers": [t for t, _ in kept], "dropped": dropped,
            "note": "Sample preview — add your Alpaca keys to switch on the live feed." if mode == "sample" else ""}


def _rebase(series):
    base = series[0] or 1
    return [round(100 * v / base, 2) for v in series]
