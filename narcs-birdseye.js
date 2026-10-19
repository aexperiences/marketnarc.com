/* THE NARCS — Birdseye (Anthony, Oct 19 2026: "all of the apps on the .com need to go birdseye. narcs would be a good
   place to start"). The Narc's six doors become rooms on a Birdseye floor plan, with the frosted dock, the More sheet,
   the at-a-glance page and the skins — the same shell every Accelerated Operating System runs (copied unchanged from
   aehub machines/birdseye/engine into birdseye/). The Narc engine underneath is untouched: a room is the door it always
   was (switchMode), its old tab bar, header and family bar are hidden, never deleted.
   Routes: #birdseye = the floor plan · #glance = at a glance · #bill #home #paw #tax #collections #benefits = a door.
   (The Narc already owns #home for the Home door, so the floor plan lives at #birdseye.) */
(function () {
  "use strict";
  var DOORS = [
    ["bill", "Bills", "billnarc-icon.svg", "🧾", "Your medical bill, decoded"],
    ["home", "Home", "homenarc-icon.svg", "🏠", "Your property assessment, checked"],
    ["paw", "Pet", "pawnarc-icon.svg", "🐾", "Your pet policy, read"],
    ["tax", "Tax", "taxnarc-icon.svg", "🧮", "The credits you may be missing"],
    ["collections", "Debt", "collectionsnarc-icon.svg", "⚖️", "Your rights with a debt collector"],
    ["benefits", "Benefits", "benefits.svg", "🩺", "Open enrollment, compared"]
  ];
  var ROOMS = DOORS.map(function (d) { return { k: d[0], label: d[1], wing: "doors", route: "#" + d[0], icon: "/narcs/birdseye/icons/" + d[2], glyph: d[3], blurb: d[4] }; });
  ROOMS.push({ k: "pricing", label: "Plans", wing: "yours", route: "/narcs/thenarc-pricing", icon: "/narcs/birdseye/icons/pricing.svg", glyph: "◈", blurb: "One subscription, all six doors" });
  ROOMS.push({ k: "privacy", label: "Privacy", wing: "yours", route: "/narcs/privacy", icon: "/narcs/birdseye/icons/privacy.svg", glyph: "🔒", blurb: "Everything stays on your device" });
  var KEYS = ROOMS.map(function (r) { return r.k; });
  function reads() { try { return JSON.parse(localStorage.getItem("narc.bs.reads") || "{}"); } catch (e) { return {}; } }
  function bump(k) { try { var r = reads(); r[k] = (r[k] || 0) + 1; r._last = { k: k, at: Date.now() }; localStorage.setItem("narc.bs.reads", JSON.stringify(r)); } catch (e) {} }
  var figures = {};
  DOORS.forEach(function (d) { figures[d[0]] = { source: "this device: doors opened here", fn: function () { var n = reads()[d[0]] || 0; return n ? [n, "time{s} opened on this device"] : ["", d[4]]; } }; });

  window.BIRDSEYE = {
    id: "the-narcs", routing: "hash", home: "thenarc-app", homeRoute: "#birdseye", glanceRoute: "#glance",
    brand: { name: "The Narcs", short: "Narcs", versionLine: "Birdseye 1.0", icon: "/narcs/favicon-192.png",
             aos: "/narcs/birdseye/marks/aos-consumer.png", aeMark: "/narcs/birdseye/marks/ae-mark.png",
             birdseyeIcon: "/narcs/birdseye/marks/birdseye.png", store: "https://www.aexperiences.com/" },
    houseNoun: "household", defaultSkin: "narc",
    /* The Narc's own look, first: its deep sea green and mint, with a light twin */
    skins: {
      narc: { name: "The Narc", note: "deep sea green and mint · loads first", twin: "narc-day", dark: 1, v: { paper: "#0B1512", card: "#12201B", ink: "#EAF5EE", ink2: "#C3D6CE", mut: "#9DB3AB", rule: "#2A3D36", rule2: "#1D2E28", char: "#070C0A", red: "#46D6A0", red2: "#34B888", gold: "#E6A93C", gold2: "#F0C46A" } },
      "narc-day": { name: "The Narc by Day", note: "the same mint on cream", twin: "narc", v: { paper: "#F6F3EC", card: "#FFFFFF", ink: "#0C1512", ink2: "#2E413A", mut: "#6A7C75", rule: "#E1DACB", rule2: "#EEE8DC", char: "#0C1512", red: "#1F8A63", red2: "#2AA676", gold: "#B07A1E", gold2: "#D49A32" } }
    },
    wings: [{ k: "doors", name: "The six doors" }, { k: "yours", name: "Yours" }],
    rooms: ROOMS,
    seats: { you: { label: "You", sees: "*", money: false, plan: KEYS.slice(0, 8), small: [], dock: ["bill", "tax"],
                    prime: { label: "Read a bill", href: "#bill", room: "bill" } } },
    defaultSeat: "you",
    figures: figures,
    center: function () { var r = reads(), n = DOORS.reduce(function (a, d) { return a + (r[d[0]] || 0); }, 0);
      return n ? { big: String(n), line: (n === 1 ? "read" : "reads") + " on this device · nothing sent anywhere", tone: "ok" } : { big: "6", line: "doors · everything stays on your device", tone: "ok" }; },
    needs: function () { return []; },
    bus: function () { var l = reads()._last; if (!l) return []; var d = DOORS.filter(function (x) { return x[0] === l.k; })[0]; return d ? [[new Date(l.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), "Opened the " + d[1] + " door"]] : []; },
    glance: function () { var r = reads(); return { lede: "The Narc reads what is costing you money, tells you plainly what is wrong, and writes the letter to fight it. Everything runs in your browser.",
      numbers: DOORS.filter(function (d) { return r[d[0]]; }).map(function (d) { return [r[d[0]], d[1] + " reads", d[0]]; }), sections: [] }; },
    legacyChrome: [".ntab-wrap", ".app > .head", ".app > .foot", ".brandmark", ".brandcap", "#aenav", "#aemenu", "#aescrim"]
  };

  /* ---------------- the glue ---------------- */
  var C = window.BIRDSEYE, BS = window.BirdseyeShell;
  if (!BS) return;
  var app = document.querySelector(".app");
  function hide() { BS.replaceLegacy(C.legacyChrome); }
  function current() { var h = (location.hash || "").replace(/^#\/?/, ""); return h === "glance" ? "glance" : KEYS.indexOf(h) >= 0 && DOORS.some(function (d) { return d[0] === h; }) ? h : "birdseye"; }
  var last = null, mounted = false;
  function mount() {
    var h = current(), mode = h === "birdseye" ? "home" : h === "glance" ? "glance" : "room";
    if (mode === "room" && window.switchMode && last !== h) { window.switchMode(h); bump(h); }
    last = mode === "room" ? h : null;
    if (mounted && BS.openSheet) BS.openSheet(false);
    BS.mount({ config: C, mode: mode, active: mode === "room" ? h : null, mountEl: app, footer: false });
    mounted = true; hide(); back(mode);
    if (mode !== "room") window.scrollTo(0, 0);
  }
  /* every room has a way back in the header (Anthony, Oct 18 2026); Birdseye itself has none */
  function back(mode) {
    if (!document.getElementById("hbStyle")) { var st = document.createElement("style"); st.id = "hbStyle";
      st.textContent = ".hb-back{display:inline-flex;align-items:center;flex:none;min-height:44px;padding:0 14px;border-radius:999px;border:1.5px solid var(--bs-line,#2A3D36);background:var(--bs-card,#12201B);color:var(--bs-red,#46D6A0);font:700 15px/1 var(--bs-sans,system-ui);text-decoration:none;white-space:nowrap}" +
        ".bs-in.has-back .bs-aos{display:none}@media (max-width:640px){.bs-in.has-back .bs-seat{display:none}}" +
        "html.bs-on .app{padding-top:8px}html.bs-on .app > .modechip{margin-top:6px}";
      document.head.appendChild(st); }
    var old = document.getElementById("hdrBack"); if (old) old.remove();
    var hin = document.querySelector("#bsTop .bs-in"); if (!hin) return;
    var room = mode !== "home"; hin.classList.toggle("has-back", room); if (!room) return;
    var a = document.createElement("a"); a.id = "hdrBack"; a.className = "hb-back"; a.href = "#birdseye"; a.textContent = "‹ Back"; a.setAttribute("aria-label", "Back to the floor plan");
    var sp = hin.querySelector(".bs-sp"); if (sp && sp.nextSibling) hin.insertBefore(a, sp.nextSibling); else hin.appendChild(a);
  }
  /* Start after The Narc's own boot (it runs on DOMContentLoaded, registered first, and writes #bill when no door is
     named). Birdseye is the front door now, so an address with no door opens the floor plan. */
  function start() {
    var first = (window.__bsStart || "").replace(/^#\/?/, "");
    if (!first) { try { history.replaceState(null, "", "#birdseye"); } catch (e) {} }
    window.addEventListener("hashchange", mount);
    mount();
    /* the family bar (family-nav.js) arrives late; keep it hidden once it does */
    var tries = 0; (function again() { hide(); if (++tries < 20) setTimeout(again, 400); })();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else setTimeout(start, 0);
})();
