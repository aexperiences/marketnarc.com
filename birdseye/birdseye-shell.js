/* =============================================================================
   THE BIRDSEYE SHELL — one drop-in, framework-free home screen for every
   Accelerated Operating System. Accelerated Experiences LLC · Oct 11 2026.

   Generalized from Steak n Eggs OS (os.js dock / sheet / glide / grab, birdseye.js
   floor plan + at-a-glance, rooms-standard.js skins) and AE Remote Work OS (the
   original Birdseye, the helper tab on the right edge). Depends on nothing else.

   Driven entirely by one config object, window.BIRDSEYE (see MACHINE.md for the schema):
     brand{name, short, icon, aos, aeMark, version, versionLine, line, store},   versionLine (Oct 16 2026, Anthony): the version on its own line UNDER the name, e.g. "Birdseye Founder 1.0" id, engine, routing,
     home, glanceRoute, houseName, houseNoun, wings[], rooms[], seats{}, defaultSeat,
     figures{}, center(), glance(), needs(), bus(), helper{}, skins, defaultSkin, today()

   Mount:   BirdseyeShell.mount({config, mode:'home'|'room'|'glance', mountEl, active})
   Legacy:  BirdseyeShell.adopt({config, active, content})   — wraps a showroom engine's mount()
            BirdseyeShell.replaceLegacy([selectors])          — hides a legacy topbar/sidebar/mobile bar
   Nothing here sends, spends, publishes or deletes. A figure comes from the system's own
   data or the cell shows its blurb — never an invented number.
   ============================================================================= */
/* THE BIRDSEYE ICON (Anthony, Oct 16 2026): the middle square and the dock's Birdseye button wear the Phoenix — his crimson-and-gold bird — in every system; brand.birdseyeIcon overrides. */
(function () {
  "use strict";
  var BS = window.BirdseyeShell = { version: "1.0" };
  /* THE APP-SHELL SCROLL (Oct 11 2026): on phones and tablets the document never scrolls — the page lives in one
     scroller and the dock, sheet, drawer, toasts and modals stay outside it, so an installed home-screen app's
     bounce can never drag the dock. One shared file beside this one: ae-app-scroll.js. */
  (function () {
    if (window.AEAppScroll || document.getElementById("aeAppScrollJs")) return;
    var me = document.currentScript, src = me && me.src ? me.src.replace(/[^\/]*(\?.*)?$/, "") + "ae-app-scroll.js" : "birdseye/ae-app-scroll.js";
    var s = document.createElement("script"); s.id = "aeAppScrollJs"; s.src = src; (document.head || document.documentElement).appendChild(s);
  })();
  var C = null, E = null, built = false, mode = "home", active = null, mountEl = null;
  var els = {};

  /* ---------------- tiny helpers ---------------- */
  /* American spelling in everything the shell draws (house rule) — legacy seed text is British in places */
  var US = [[/\blicenc(e|es|ed|ing)\b/g, "licens$1"], [/\bLicenc(e|es|ed|ing)\b/g, "Licens$1"], [/sterilis/g, "steriliz"], [/Sterilis/g, "Steriliz"], [/\benrolment/g, "enrollment"], [/\bEnrolment/g, "Enrollment"],
    [/colour/g, "color"], [/Colour/g, "Color"], [/organis/g, "organiz"], [/recognis/g, "recogniz"], [/authoris/g, "authoriz"], [/Authoris/g, "Authoriz"], [/customis/g, "customiz"], [/\bcentre/g, "center"], [/\bprogramme/g, "program"], [/labelled/g, "labeled"], [/cancelled/g, "canceled"], [/fulfil\b/g, "fulfill"], [/instalment/g, "installment"],
    [/\bCentre/g, "Center"], [/\bProgramme/g, "Program"], [/Organis/g, "Organiz"], [/Recognis/g, "Recogniz"], [/Customis/g, "Customiz"], [/Cancelled/g, "Canceled"], [/cancelling/g, "canceling"], [/Instalment/g, "Installment"],
    [/\bcatalogue/g, "catalog"], [/\bCatalogue/g, "Catalog"], [/behaviour/g, "behavior"], [/Behaviour/g, "Behavior"], [/\bfavour/g, "favor"], [/\bFavour/g, "Favor"], [/\bhonour/g, "honor"], [/\bHonour/g, "Honor"],
    [/\blabour/g, "labor"], [/\bLabour/g, "Labor"], [/judgement/g, "judgment"], [/Judgement/g, "Judgment"], [/\benrol\b/g, "enroll"], [/\benrols\b/g, "enrolls"], [/\bfulfilment/g, "fulfillment"], [/\bFulfilment/g, "Fulfillment"], [/\bfulfils\b/g, "fulfills"],
    [/\bpractis(e|es|ed|ing)\b/g, "practic$1"], [/\banalys(e|ed|ing)\b/g, "analyz$1"], [/travelled/g, "traveled"], [/modelling/g, "modeling"], [/\bdefence/g, "defense"], [/aluminium/g, "aluminum"], [/\bcheque/g, "check"], [/sterilis/gi, function (m) { return m[0] === "S" ? "Steriliz" : "steriliz"; }]];
  function us(s) { s = String(s); for (var i = 0; i < US.length; i++) s = s.replace(US[i][0], US[i][1]); return s.replace(/Custom Color\b/g, "Custom Colour"); }  /* a company's own name keeps its spelling (WHCC) */
  /* attributes (href, src, data-k) keep their exact bytes — americanizing "licences.html" breaks the link */
  function attr(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function esc(s) { return us(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function fnOr(v) { return typeof v === "function" ? v : function () { return v; }; }
  function n(x, one, many) { return x + " " + (x === 1 ? one : (many || one + "s")); }
  BS.n = n;
  BS.money = function (v) { v = Number(v) || 0; return "$" + Math.round(v).toLocaleString("en-US"); };
  BS.pct = function (v, dp) { return (Number(v) || 0).toFixed(dp || 0) + "%"; };
  function isoLocal(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  var H = { n: n, money: BS.money, pct: BS.pct, esc: esc, iso: isoLocal,
    /* the system's own "today" — showrooms pin a demo date (E.TODAY); a live house uses the wall clock */
    day: function (E) { return E && E.TODAY instanceof Date ? isoLocal(E.TODAY) : isoLocal(new Date()); },
    /* a KPI out of an engine's kpis() list ({k|label, value|v}) */
    k: function (list, key) { var x = (list || []).filter(function (o) { return o && (o.k === key || o.label === key); })[0]; return x ? (x.value !== undefined ? x.value : x.v) : undefined; },
    cnt: function (a, f) { return (a || []).filter(f || Boolean).length; },
    sum: function (a, f) { return (a || []).reduce(function (s, x) { return s + (Number(f ? f(x) : x) || 0); }, 0); },
    days: function (E, iso) { var t = new Date(H.day(E) + "T12:00:00"), d = new Date(String(iso).slice(0, 10) + "T12:00:00"); return Math.round((d - t) / 86400000); },
    date: function (iso) { if (!iso) return ""; var d = new Date(String(iso).slice(0, 10) + "T12:00:00"); return isNaN(d) ? String(iso) : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); },
    p: function (c, t) { return c + " " + plur(t, c); },
    hm: function (s) { var p = String(s || "").split(":"); if (p.length < 2) return String(s || ""); var h = +p[0], ap = h >= 12 ? "pm" : "am"; return (h % 12 || 12) + ":" + p[1] + ap; } };
  BS.H = H;
  function bad(v) { return v === undefined || v === null || (typeof v === "number" && !isFinite(v)) || /\b(undefined|NaN|Infinity|Invalid Date|null)\b/.test(String(v)); }
  function data() { try { return E && E.db ? E.db() : null; } catch (e) { return null; } }
  function call(f, a, b) { try { return typeof f === "function" ? f(E, data(), H, a, b) : f; } catch (e) { if (window.console) console.warn("[birdseye]", e); return undefined; } }

  /* ---------------- config ---------------- */
  function room(k) { return (C.rooms || []).filter(function (r) { return r.k === k; })[0] || null; }
  BS.room = function (k) { return room(k); };
  function seatKey() { var s = ls("birdseye:" + C.id + ":seat"); return s && C.seats[s] ? s : (C.defaultSeat && C.seats[C.defaultSeat] ? C.defaultSeat : Object.keys(C.seats)[0]); }
  function seat() { return C.seats[seatKey()] || {}; }
  BS.seat = function () { return seatKey(); };
  BS.setSeat = function (k) { if (!C.seats[k]) return; ls("birdseye:" + C.id + ":seat", k); paintAll(); toast("Now viewing as " + C.seats[k].label + "."); };
  function canOpen(k) { if (k === "__home" || k === "__glance") return true; var s = seat().sees; if (!s || s === "*") return true; return s.indexOf(k) >= 0; }
  BS.canOpen = canOpen;
  function seesMoney() { return seat().money !== false; }
  /* PRIVILEGE: money only reaches seats that hold money. A line carrying a dollar figure never reaches a
     seat with money:false — even if a profile's needs/glance/bus/helper forgot to mark it. */
  var MONEY = /\$\s?\d|\d\s?USD\b/;
  function moneyOK(s) { return seesMoney() || !MONEY.test(String(s == null ? "" : s)); }
  BS.moneyOK = moneyOK;
  /* the legacy dashboard under the plan is the owner's full picture: only an all-rooms seat or a money seat gets it */
  function legacyOK() { var s = seat(); return s.money === true || ((!s.sees || s.sees === "*") && s.money !== false); }
  BS.legacyOK = legacyOK;
  function hrefOf(k) {
    if (k === "__home") return C.routing === "hash" ? (C.homeRoute || "#/desk") : C.home;
    if (k === "__glance") return C.routing === "hash" ? (C.glanceRoute || "#/eye") : C.home + "#glance";
    var r = room(k); if (!r) return "#";
    return C.routing === "hash" ? (r.route || "#/" + r.k) : (r.href || "#");
  }
  BS.href = hrefOf;
  /* THE HOUSE NAME: the business's own name, on every room. The owner's own setting wins; then the name in the
     system's data; then "Your <noun>" — never an invented business name. Tap it in the header to set it. */
  function houseName() { var o = ls("birdseye:" + C.id + ":house"); if (o && o.trim()) return o.trim(); var v = call(C.houseName); return (v && String(v).trim()) || ("Your " + (C.houseNoun || "business")); }
  BS.renameHouse = function () {
    modal("<h3>The " + esc(C.houseNoun || "business") + "'s name</h3><p class=\"bs-mut\">It shows at the top of every room, on Birdseye and on the tab.</p><form id=\"bsHN\"><input class=\"bs-input\" id=\"bsHNi\" maxlength=\"60\" aria-label=\"Name\" value=\"" + esc(houseName()) + "\"><div class=\"bs-row\"><button class=\"bs-btn bs-a\" type=\"submit\">Save the name</button></div></form>", function (box) {
      var i = box.querySelector("#bsHNi"); setTimeout(function () { i.focus(); i.select(); }, 60);
      box.querySelector("#bsHN").onsubmit = function (e) { e.preventDefault(); var v = i.value.trim(); if (!v) return; ls("birdseye:" + C.id + ":house", v); closeModal(); paintAll(); toast("Every room now says " + v + "."); };
    });
  };
  BS.houseName = houseName;
  function label(r) { return String(r.label || r.k).replace(/^The /, ""); }
  function icon(k, cls) {
    var src = k === "__home" || k === "__glance" ? C.brand.icon : (room(k) || {}).icon;
    if (src) return '<img class="' + (cls || "bs-ric") + '" src="' + attr(src) + '" alt="" loading="lazy">';
    var g = (room(k) || {}).glyph || "◇";
    return '<span class="' + (cls || "bs-ric") + ' bs-glyph" aria-hidden="true">' + esc(g) + "</span>";
  }
  BS.icon = icon;
  function seatRooms(list, count) {
    var out = (list || []).filter(function (k) { return room(k) && canOpen(k); });
    return out.slice(0, count);
  }
  function planRooms() {
    var s = seat(), big = seatRooms(s.plan, 8), used = big.slice();
    (C.rooms || []).forEach(function (r) { if (big.length < 8 && canOpen(r.k) && used.indexOf(r.k) < 0 && !r.hidden) { big.push(r.k); used.push(r.k); } });
    var small = seatRooms(s.small, 4).filter(function (k) { return used.indexOf(k) < 0; });
    (C.rooms || []).forEach(function (r) { if (small.length < 4 && canOpen(r.k) && used.indexOf(r.k) < 0 && small.indexOf(r.k) < 0 && !r.hidden) small.push(r.k); });
    return { big: big, small: small };
  }

  /* ---------------- one live figure per room ---------------- */
  function blurbLine(r) { var b = (r && r.blurb || "").split(/\.\s|;\s|\s—\s/)[0].replace(/\.$/, ""); return b.length > 40 ? b.slice(0, 38).replace(/\s\S*$/, "") + "…" : b; }
  /* grammar markers in a line: "lead{s} to call" and "{child|children}" follow the figure's own count */
  function plur(line, v) { var one = Number(String(v).replace(/[^0-9.-]/g, "")) === 1 && /^\s*1\b/.test(String(v)); return String(line || "").replace(/\{s\}/g, one ? "" : "s").replace(/\{([^|{}]*)\|([^{}]*)\}/g, function (m, a, b) { return one ? a : b; }); }
  BS.plur = plur;
  function figure(k) {
    var r = room(k), f = C.figures && C.figures[k];
    if (f && (!f.money || seesMoney())) {
      var v = call(f.fn || f);
      if (v && v.length && !bad(v[0]) && !bad(v[1]) && moneyOK(v[0]) && moneyOK(v[1])) {
        var val = typeof v[0] === "number" ? v[0].toLocaleString("en-US") : String(v[0]);
        return [val, plur(v[1], v[0])];
      }
    }
    return ["", blurbLine(r) || (r ? r.label : "")];
  }
  BS.figure = figure;

  /* ---------------- skins: seventeen, light and dark, each with a twin ---------------- */
  function L(paper, card, ink, ink2, mut, rule, rule2, char, red, red2, gold, gold2) { return { paper: paper, card: card, ink: ink, ink2: ink2, mut: mut, rule: rule, rule2: rule2, char: char, red: red, red2: red2, gold: gold, gold2: gold2 }; }
  var SKINS = {
    studio:     { name: "The Studio", note: "cream, red and gold · the AE scheme", twin: "studio-night", v: L("#f8f3ea", "#fffdf8", "#1e1813", "#54493f", "#8a7d70", "#e8dccb", "#f1e8da", "#1e1813", "#a8312a", "#87241f", "#c9a24a", "#e2b45c") },
    amber:      { name: "Charcoal & Amber", note: "charcoal, amber and yolk", twin: "amber-night", v: L("#f6f1e8", "#fffdf8", "#1f1b17", "#5a5148", "#8a7f72", "#e6dccb", "#efe7d8", "#2b2724", "#c9761a", "#a65f12", "#f4a820", "#ffb347") },
    cherry:     { name: "Cherry & Chrome", note: "cherry red and chrome", twin: "cherry-night", v: L("#f7f3f0", "#fffdfb", "#1d2a36", "#4a5663", "#8a919a", "#e3dcd6", "#efe9e4", "#1d2a36", "#c8102e", "#9e0c24", "#e8b04a", "#ff6b6b") },
    wine:       { name: "Wine & Cream", note: "wine and cream", twin: "wine-night", v: L("#f6efe6", "#fffaf3", "#2a1f22", "#5a4648", "#8f7c7a", "#e7d8cc", "#f0e6db", "#2a1f22", "#7a2e3a", "#5c1f2a", "#c9a24a", "#d4a373") },
    sage:       { name: "Sage & Butter", note: "sage and butter", twin: "sage-night", v: L("#f2f4ec", "#fcfdf8", "#23302a", "#4b5a50", "#84907f", "#dde3d2", "#e9eddf", "#23302a", "#4f7a52", "#3a5d3c", "#c9a24a", "#9cc29c") },
    harbor:     { name: "Harbor", note: "navy and brass", twin: "harbor-night", v: L("#f1f3f6", "#fbfcfe", "#16212e", "#46536a", "#7f8a9c", "#dbe1ea", "#e8ecf2", "#16212e", "#2f5d8a", "#22466a", "#c9a24a", "#7fb2e0") },
    peach:      { name: "Peach & Mint", note: "peach and mint", twin: "peach-night", v: L("#fff5ee", "#fffcf9", "#3a2a24", "#6b5249", "#a08a80", "#f3dfd2", "#f8ebe2", "#3a2a24", "#c25f45", "#a34a33", "#e0b060", "#81b29a") },
    brick:      { name: "Brick & Mustard", note: "brick and mustard", twin: "brick-night", v: L("#f4ede4", "#fdf9f3", "#2b1d16", "#5d4637", "#8f7766", "#e4d5c4", "#eee3d6", "#2b1d16", "#a23e2a", "#7f2d1e", "#d9a521", "#e98a5b") },
    "studio-night":  { name: "The Studio at Night", note: "red and gold on ink", twin: "studio", dark: 1, v: L("#15110e", "#201a16", "#f5ede2", "#cdbfae", "#968877", "#3a2f27", "#2b231d", "#0d0a08", "#e0574d", "#ec7a70", "#d9b45a", "#e8c77a") },
    "amber-night":   { name: "Charcoal at Night", note: "charcoal and amber, dark", twin: "amber", dark: 1, v: L("#141210", "#1f1c19", "#f3ece0", "#c7bba9", "#8f8576", "#34302b", "#2a2622", "#0d0b0a", "#e8952a", "#f0a94a", "#f4a820", "#ffb347") },
    "cherry-night":  { name: "Cherry After Hours", note: "cherry neon on chrome black", twin: "cherry", dark: 1, v: L("#0f1419", "#182029", "#eef2f6", "#b5c0cc", "#7d8996", "#2a3441", "#212a35", "#090d11", "#ff3355", "#ff5a75", "#ffc857", "#ff6b6b") },
    "wine-night":    { name: "Wine by Candlelight", note: "deep wine and gold", twin: "wine", dark: 1, v: L("#170f11", "#22171a", "#f5e9e3", "#cdb6ae", "#957d78", "#3a2a2e", "#2e2125", "#0e0809", "#c4566a", "#d97487", "#d9b45a", "#e0b48a") },
    "sage-night":    { name: "Sage at Dusk", note: "moss and lantern", twin: "sage", dark: 1, v: L("#0f1511", "#18211b", "#eaf1e6", "#b8c7b3", "#7f907c", "#2a372e", "#212b24", "#090e0b", "#7fb383", "#9cc89f", "#e8c45a", "#a8d0a8") },
    "harbor-night":  { name: "Harbor at Midnight", note: "ink navy and brass", twin: "harbor", dark: 1, v: L("#0b1119", "#131c28", "#e9eef5", "#b2bfd0", "#7a889c", "#243142", "#1b2635", "#070b11", "#5b9bd8", "#7fb2e6", "#d4ae55", "#7fb2e0") },
    "peach-night":   { name: "Late Peach", note: "coral on cocoa", twin: "peach", dark: 1, v: L("#17110f", "#221a17", "#f7ebe4", "#d2bdb2", "#9a8579", "#3a2d28", "#2d231f", "#0e0a09", "#f08a6e", "#f6a58f", "#f2cc8f", "#81b29a") },
    "brick-night":   { name: "Brick Embers", note: "ember red and smoke", twin: "brick", dark: 1, v: L("#14100d", "#1f1814", "#f3e8dd", "#ccb8a6", "#937f6e", "#382c24", "#2b221c", "#0b0806", "#e0563b", "#ec7459", "#e3b23c", "#f08a5d") },
    midnight:        { name: "Midnight", note: "true black, easiest on the eyes", twin: "studio", dark: 1, v: L("#000000", "#0e0e0e", "#f2f2f2", "#bdbdbd", "#838383", "#262626", "#1b1b1b", "#000000", "#e0574d", "#ec7a70", "#d9b45a", "#e8c77a") }
  };
  BS.SKINS = SKINS;
  /* the legacy chassis variables a skin also repaints, so a room's own body follows the skin */
  var LEGACY = { paper: ["--paper", "--bg"], card: ["--card"], ink: ["--ink"], ink2: ["--ink-2", "--ink2"], mut: ["--mut"], rule: ["--line", "--rule"], rule2: ["--line-2", "--rule2", "--sunk"] };
  function skinKey() { var all = Object.assign({}, SKINS, C.skins || {}); var k = ls("birdseye:" + C.id + ":skin"); return k && all[k] ? k : (C.defaultSkin && all[C.defaultSkin] ? C.defaultSkin : "studio"); }
  function applySkin() {
    var all = Object.assign({}, SKINS, C.skins || {}), sk = all[skinKey()], root = document.documentElement;
    Object.keys(sk.v).forEach(function (p) {
      root.style.setProperty("--bs-" + p, sk.v[p]);
      if (C.skinLegacy !== false) (LEGACY[p] || []).forEach(function (lv) { root.style.setProperty(lv, sk.v[p]); });
    });
    root.setAttribute("data-bs-theme", sk.dark ? "dark" : "light");
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", sk.v.paper);
    var t = document.getElementById("bsTwin"); if (t) { t.title = "Now: " + sk.name + " — tap for " + all[sk.twin].name; t.setAttribute("aria-label", sk.dark ? "Switch to the light twin" : "Switch to the dark twin"); }
  }
  BS.applySkin = applySkin;
  BS.setSkin = function (k) { ls("birdseye:" + C.id + ":skin", k); applySkin(); };

  /* ---------------- toast + modal ---------------- */
  var toastT;
  function toast(msg) { if (!els.toast) return; els.toast.textContent = msg; els.toast.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { els.toast.classList.remove("on"); }, 2400); }
  BS.toast = toast;
  function modal(html, wire) {
    els.modal.innerHTML = '<div class="bs-box" role="dialog" aria-modal="true">' + html + '<div class="bs-row"><button type="button" class="bs-btn" data-x>Close</button></div></div>';
    els.modal.classList.add("on"); els.modal.querySelectorAll("[data-x]").forEach(function (b) { b.onclick = closeModal; });
    if (wire) wire(els.modal.querySelector(".bs-box"));
  }
  function closeModal() { els.modal.classList.remove("on"); els.modal.innerHTML = ""; }

  /* ---------------- the chrome: header, dock, sheet, helper tab, footer ---------------- */
  var GRID = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="5" height="5" rx="1.4"/><rect x="9.5" y="3" width="5" height="5" rx="1.4" class="b"/><rect x="16" y="3" width="5" height="5" rx="1.4"/><rect x="3" y="9.5" width="5" height="5" rx="1.4" class="b"/><rect x="9.5" y="9.5" width="5" height="5" rx="1.4"/><rect x="16" y="9.5" width="5" height="5" rx="1.4" class="b"/><rect x="3" y="16" width="5" height="5" rx="1.4"/><rect x="9.5" y="16" width="5" height="5" rx="1.4" class="b"/><rect x="16" y="16" width="5" height="5" rx="1.4"/></svg>';
  var MORE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>';
  function build() {
    if (built) return; built = true;
    document.documentElement.classList.add("bs-on");
    var b = C.brand;
    var top = document.createElement("div"); top.className = "bs-top"; top.id = "bsTop"; top.setAttribute("role", "banner");
    top.innerHTML = '<div class="bs-in">' +
      '<a class="bs-aos" href="' + attr(hrefOf("__home")) + '" aria-label="Birdseye — home"><img src="' + attr(b.aos) + '" alt="Accelerated Operating Systems"></a>' +
      '<div class="bs-brand"><a href="' + attr(hrefOf("__home")) + '" aria-label="Birdseye"><img class="bs-osicon" src="' + attr(b.icon) + '" alt=""></a><span class="bs-names' + (b.versionLine ? ' bs-has-ver' : '') + '"><a class="bs-sys" href="' + attr(hrefOf("__home")) + '">' + esc(b.name) + '</a>' + (b.versionLine ? '<span class="bs-ver">' + esc(b.versionLine) + '</span>' : '') + '<button type="button" class="bs-house" id="bsHouse" aria-label="The business name — tap to change it"></button></span></div>' +
      '<span class="bs-sp"></span>' +
      '<label class="bs-seat"><span class="bs-lbl">Viewing as</span><select id="bsSeat" aria-label="Viewing as"></select></label>' +
      (C.helper ? '<button type="button" class="bs-ask" id="bsAsk" aria-controls="bsDrawer" aria-label="Ask ' + esc(C.helper.name) + ' — your helper" title="Ask ' + esc(C.helper.name) + '">Ask</button>' : "") +
      '<button type="button" class="bs-iconbtn" id="bsTwin" aria-label="Switch to the dark twin">◐</button>' +
      "</div>";
    document.body.insertBefore(top, document.body.firstChild);
    var tail = document.createElement("div"); tail.className = "bs-tail";
    tail.innerHTML = '<nav class="bs-dock" id="bsDock" aria-label="Rooms"></nav>' +
      '<div class="bs-scrim" id="bsScrim"></div><div class="bs-sheet" id="bsSheet" role="dialog" aria-label="Every room" aria-hidden="true"></div>' +
      (C.helper ? '<button type="button" class="bs-tab" id="bsTab" aria-controls="bsDrawer" aria-label="' + esc(C.helper.name) + ' — your helper"><span>' + esc(C.helper.name) + '</span></button>' +
        '<aside class="bs-drawer" id="bsDrawer" aria-label="' + esc(C.helper.name) + '"></aside>' : "") +
      '<div class="bs-toast" id="bsToast" role="status"></div><div class="bs-modal" id="bsModal"></div>';
    document.body.appendChild(tail);
    els = { top: top, dock: tail.querySelector("#bsDock"), sheet: tail.querySelector("#bsSheet"), scrim: tail.querySelector("#bsScrim"),
      tab: tail.querySelector("#bsTab"), drawer: tail.querySelector("#bsDrawer"), toast: tail.querySelector("#bsToast"), modal: tail.querySelector("#bsModal") };
    els.modal.addEventListener("click", function (e) { if (e.target === els.modal) closeModal(); });
    els.scrim.onclick = function () { openSheet(false); openDrawer(false); };
    var sel = top.querySelector("#bsSeat");
    sel.innerHTML = Object.keys(C.seats).map(function (k) { return '<option value="' + attr(k) + '">' + esc(C.seats[k].label) + "</option>"; }).join("");
    sel.onchange = function () { BS.setSeat(sel.value); };
    top.querySelector("#bsHouse").onclick = function () { BS.renameHouse(); };
    top.querySelector("#bsTwin").onclick = function () { var all = Object.assign({}, SKINS, C.skins || {}), k = all[skinKey()].twin; BS.setSkin(k); toast(all[k].name); };
    if (els.tab) { els.tab.onclick = function () { openDrawer(!els.drawer.classList.contains("on")); }; paintDrawer(); }
    /* on a phone or a narrow laptop the helper lives in the header (#bsAsk), so the edge tab never sits on the plan */
    var ask = top.querySelector("#bsAsk"); if (ask && els.drawer) ask.onclick = function () { openDrawer(!els.drawer.classList.contains("on")); };
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { openSheet(false); openDrawer(false); closeModal(); }
      if ((e.key === "k" || e.key === "K") && !/input|textarea|select/i.test((e.target || {}).tagName || "")) openSheet(!els.sheet.classList.contains("up"));
    });
    window.addEventListener("resize", function () { var t = els.dock.querySelector(".on:not(.bs-prime)"); placeGlide(t); });
    if (C.routing !== "hash") window.addEventListener("hashchange", function () { if (isHomePage()) { mode = location.hash === "#glance" ? "glance" : "home"; render(); paintDock(); window.scrollTo(0, 0); } });
  }
  function isHomePage() { var f = (location.pathname.split("/").pop() || "index.html"); return f === C.home || (f === "" && C.home === "index.html"); }

  function paintHeader() {
    var hn = document.getElementById("bsHouse"); if (hn) hn.textContent = houseName() + (C.brand.version && !C.brand.versionLine ? " · " + C.brand.version : "");
    var sel = document.getElementById("bsSeat"); if (sel) sel.value = seatKey();
  }

  /* dock: home · seat room · raised Birdseye (the system's own logo) · seat room · More */
  function dockRooms() {
    var two = seatRooms(seat().dock, 2);
    planRooms().big.forEach(function (k) { if (two.length < 2 && two.indexOf(k) < 0) two.push(k); });
    return two.slice(0, 2);
  }
  function dlink(k) {
    var isHome = k === "__home", r = isHome ? null : room(k);
    var short = isHome ? "Home" : (r.short || label(r).split(/[\s·&]/)[0]);
    var on = (isHome && mode === "home") || (!isHome && active === k);
    return '<a href="' + attr(hrefOf(k)) + '" data-k="' + attr(k) + '"' + (on ? ' class="on" aria-current="page"' : "") + ">" +
      (isHome ? GRID : icon(k, "bs-dic")) + "<span>" + esc(short) + "</span></a>";
  }
  function paintDock() {
    var two = dockRooms(), d = els.dock;
    d.innerHTML = '<span class="bs-glide" aria-hidden="true"></span>' + dlink("__home") + (two[0] ? dlink(two[0]) : "<span></span>") +
      '<a href="' + attr(hrefOf("__glance")) + '" data-k="__glance" id="bsPrime" class="bs-prime' + (mode === "glance" ? " on" : "") + '" aria-label="Birdseye — everything at a glance"><img class="bs-pl" src="' + attr(C.brand.birdseyeIcon || "/icons/rooms/birdseye.png") + '" alt="' + esc(C.brand.short || C.brand.name) + '"><span>Birdseye</span></a>' +
      (two[1] ? dlink(two[1]) : "<span></span>") + '<button type="button" id="bsMore" data-k="__more" aria-haspopup="dialog" aria-controls="bsSheet">' + MORE + "<span>More</span></button>";
    d.querySelector("#bsMore").onclick = function () { openSheet(!els.sheet.classList.contains("up")); };
    var inDock = mode === "home" || ["__glance"].concat(two).indexOf(active) >= 0 || mode === "glance";
    var tgt = mode === "home" ? d.querySelector('[data-k="__home"]') : mode === "glance" ? null : d.querySelector('[data-k="' + active + '"]');
    if (!tgt && mode === "room") { tgt = d.querySelector('[data-k="__more"]'); if (tgt) tgt.classList.add("on"); }
    placeGlide(tgt);
    paintSheet();
  }
  function placeGlide(el) {
    var g = els.dock && els.dock.querySelector(".bs-glide"); if (!g) return;
    if (!el) { g.style.opacity = "0"; return; }
    requestAnimationFrame(function () { g.style.opacity = ""; g.style.width = el.offsetWidth + "px"; g.style.transform = "translateX(" + el.offsetLeft + "px)"; els.dock.classList.add("ready"); });
  }

  /* More: rooms grouped by wing, collapsible, one open at a time, drag the grip down to close */
  var openWing = null;
  function paintSheet() {
    var cw = (room(active) || {}).wing;
    openWing = cw || openWing || null;
    var total = 0;
    var secs = (C.wings || []).map(function (w) {
      var rs = (C.rooms || []).filter(function (r) { return r.wing === w.k && canOpen(r.k) && !r.hidden; });
      if (!rs.length) return "";
      total += rs.length;
      var op = openWing === w.k;
      return '<div class="bs-wing' + (op ? " open" : "") + '" data-w="' + attr(w.k) + '"><button type="button" class="bs-wh" aria-expanded="' + op + '">' +
        icon(rs[0].k, "bs-whi") + '<span class="bs-wt">' + esc(w.name) + "</span><b>" + rs.length + '</b><i class="bs-chev" aria-hidden="true"></i></button>' +
        '<div class="bs-wb"><div class="bs-wbi"><div class="bs-rooms">' + rs.map(function (r) {
          return '<a href="' + attr(hrefOf(r.k)) + '"' + (active === r.k ? ' class="cur"' : "") + ">" + icon(r.k) + "<span>" + esc(label(r)) + "</span></a>";
        }).join("") + "</div></div></div></div>";
    }).join("");
    var s = els.sheet;
    s.innerHTML = '<div class="bs-grab" id="bsGrab"><span class="bs-grip"></span><h3>' + esc(houseName()) + " · " + esc(seat().label || "") + " · " + n(total, "room") + "</h3></div>" +
      '<div class="bs-mscroll">' + secs + '<div class="bs-mfoot"><a href="' + attr(hrefOf("__glance")) + '">Birdseye</a><a href="' + attr(hrefOf("__home")) + '">Home</a><button type="button" id="bsSkins">Skins</button>' +
      (C.brand.store ? '<a href="' + attr(C.brand.store) + '">The store ↗</a>' : "") + "</div></div>";
    s.querySelectorAll(".bs-wh").forEach(function (b) {
      b.onclick = function () {
        var box = b.parentNode, was = box.classList.contains("open");
        s.querySelectorAll(".bs-wing.open").forEach(function (x) { if (x !== box) { x.classList.remove("open"); x.querySelector(".bs-wh").setAttribute("aria-expanded", "false"); } });
        box.classList.toggle("open", !was); b.setAttribute("aria-expanded", !was ? "true" : "false");
        openWing = !was ? box.getAttribute("data-w") : null;
        if (!was) setTimeout(function () { if (box.scrollIntoView) box.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, 300);
      };
    });
    s.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { openSheet(false); }); });
    s.querySelector("#bsSkins").onclick = function () { openSheet(false); skinPicker(); };
    wireGrab();
  }
  function openSheet(on) {
    var s = els.sheet; s.classList.toggle("up", on); els.scrim.classList.toggle("on", on || els.drawer && els.drawer.classList.contains("on"));
    els.dock.classList.toggle("hide", on); s.setAttribute("aria-hidden", on ? "false" : "true"); s.style.transform = "";
  }
  BS.openSheet = openSheet;
  function wireGrab() {
    var grab = document.getElementById("bsGrab"), y0 = null, dy = 0, s = els.sheet;
    grab.addEventListener("touchstart", function (e) { y0 = e.touches[0].clientY; dy = 0; s.classList.add("drag"); }, { passive: true });
    grab.addEventListener("touchmove", function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); s.style.transform = "translateY(" + dy + "px)"; }, { passive: true });
    grab.addEventListener("touchend", function () { s.classList.remove("drag"); if (dy > 90) openSheet(false); else s.style.transform = ""; y0 = null; });
    var my0 = null;
    grab.addEventListener("pointerdown", function (e) { if (e.pointerType === "touch") return; my0 = e.clientY; dy = 0; s.classList.add("drag"); grab.setPointerCapture && grab.setPointerCapture(e.pointerId); });
    grab.addEventListener("pointermove", function (e) { if (my0 == null) return; dy = Math.max(0, e.clientY - my0); s.style.transform = "translateY(" + dy + "px)"; });
    grab.addEventListener("pointerup", function () { if (my0 == null) return; s.classList.remove("drag"); if (dy > 90 || dy < 4) openSheet(false); else s.style.transform = ""; my0 = null; });
  }
  function skinPicker() {
    var all = Object.assign({}, SKINS, C.skins || {}), cur = skinKey();
    function sw(k) { var s = all[k], v = s.v; return '<button type="button" class="bs-skin' + (k === cur ? " on" : "") + '" data-s="' + attr(k) + '" style="background:' + v.paper + ";color:" + v.ink + '"><span class="bs-skp"><i style="background:' + v.card + '"></i><i style="background:' + v.char + '"></i><i style="background:' + v.red + '"></i><i style="background:' + v.gold + '"></i></span><b>' + esc(s.name) + "</b><small>" + esc(s.note) + "</small></button>"; }
    var keys = Object.keys(all), light = keys.filter(function (k) { return !all[k].dark; }), dark = keys.filter(function (k) { return all[k].dark; });
    modal("<h3>Skins</h3><p class=\"bs-mut\">" + keys.length + " skins. The ◐ button at the top flips any skin to its twin.</p><h4>Light</h4><div class=\"bs-skins\">" + light.map(sw).join("") + "</div><h4>Dark</h4><div class=\"bs-skins\">" + dark.map(sw).join("") + "</div>", function (box) {
      box.querySelectorAll("[data-s]").forEach(function (b) { b.onclick = function () { BS.setSkin(b.getAttribute("data-s")); toast(all[b.getAttribute("data-s")].name + " — on."); closeModal(); }; });
    });
  }

  /* the helper — a hidden tab on the right edge; everything still works by hand */
  function paintDrawer() {
    var h = C.helper;
    els.drawer.innerHTML = '<div class="bs-dh"><img src="' + attr(C.brand.icon) + '" alt=""><div><b>' + esc(h.name) + "</b><span>" + esc(h.role || "Ask in plain words. Nothing happens without your tap.") + '</span></div><button type="button" class="bs-iconbtn" id="bsDX" aria-label="Close the helper">✕</button></div>' +
      '<div class="bs-dlog" id="bsDLog"><p class="bs-mut">' + esc(h.hello || ("Ask " + h.name + " anything about " + houseName() + ".")) + "</p></div>" +
      '<form class="bs-dform" id="bsDForm"><input id="bsDQ" type="text" placeholder="Ask ' + esc(h.name) + '…" aria-label="Ask ' + esc(h.name) + '"><button type="submit" class="bs-btn bs-a">Ask</button></form>';
    els.drawer.querySelector("#bsDX").onclick = function () { openDrawer(false); };
    els.drawer.querySelector("#bsDForm").onsubmit = function (e) {
      e.preventDefault(); var q = els.drawer.querySelector("#bsDQ").value.trim(); if (!q) return;
      var log = els.drawer.querySelector("#bsDLog"), ans = call(h.ask, q), html = "";
      if (Array.isArray(ans) && ans.length) html = ans.map(function (a) { return "<div class=\"bs-ans\"><b>" + esc(a.t || a.title || "") + "</b><p>" + esc(a.b || a.c || a.text || "") + "</p></div>"; }).join("");
      else if (ans && typeof ans === "object" && (ans.stance || ans.text)) html = "<div class=\"bs-ans\"><p>" + esc(ans.stance || ans.text) + "</p></div>";
      else if (typeof ans === "string" && ans) html = "<div class=\"bs-ans\"><p>" + esc(ans) + "</p></div>";
      else html = '<div class="bs-ans"><p>Nothing in the manual answers that yet. Try different words.</p></div>';
      if (!seesMoney()) html = html.replace(/\$\s?[\d,.]+[kKmM]?/g, "(a money seat sees this)");
      log.innerHTML = '<div class="bs-q">' + esc(q) + "</div>" + html + log.innerHTML; els.drawer.querySelector("#bsDQ").value = "";
    };
  }
  function openDrawer(on) {
    if (!els.drawer) return; els.drawer.classList.toggle("on", on); els.scrim.classList.toggle("on", on); els.dock.classList.toggle("hide", on);
    if (on) setTimeout(function () { var i = document.getElementById("bsDQ"); if (i) i.focus(); }, 300);
  }

  function footer() {
    return '<div class="bs-foot" role="contentinfo"><a class="bs-co" href="https://aexperiences.studio/"><img src="' + attr(C.brand.aeMark) + '" alt="" width="40" height="40"><span>accelerated experiences</span></a></div>';
  }

  /* ---------------- the floor plan (home) ---------------- */
  function todayDate() { var d = call(C.today); return d instanceof Date && !isNaN(d) ? d : new Date(); }
  function cell(k, i) {
    var r = room(k), f = figure(k);
    return '<a class="bs-cell" href="' + attr(hrefOf(k)) + '" data-k="' + attr(k) + '"><span class="bs-no">' + (i + 1) + "</span>" + icon(k, "bs-ci") +
      "<b>" + esc(label(r)) + "</b><i>" + (f[0] !== "" ? "<em>" + esc(f[0]) + "</em> " : "") + esc(f[1]) + "</i></a>";
  }
  function planHTML() {
    var pr = planRooms(), s = seat();
    var cen = call(C.center, seat()) || {};
    if (!moneyOK(cen.big) || !moneyOK(cen.line)) cen = { big: "—", line: "" };
    var center = '<a class="bs-cell bs-cc" href="' + attr(hrefOf("__glance")) + '" data-k="__glance"><img class="bs-lock" src="' + attr(C.brand.birdseyeIcon || "/icons/rooms/birdseye.png") + '" alt=""><b>Birdseye</b>' +
      '<span class="bs-big' + (cen.tone ? " " + esc(cen.tone) : "") + '">' + esc(bad(cen.big) ? "—" : (cen.big == null ? "" : cen.big)) + "</span><i>" + esc(bad(cen.line) ? "" : (cen.line || "")) + "</i></a>";
    var cells = pr.big.map(cell); cells.splice(4, 0, center);
    var prime = s.prime ? '<a class="bs-act" id="bsAct" href="' + attr(s.prime.href || (s.prime.room ? hrefOf(s.prime.room) : "#")) + '">' + (s.prime.room ? icon(s.prime.room, "bs-ai") : "") + "<span>" + esc(s.prime.label) + "</span><em>›</em></a>" : "";
    var html = '<div class="bs-home" id="bsHome"><div class="bs-eyetop"><div class="bs-kick">' + esc(houseName()) + " · " + esc(s.label || "") + '</div><div class="bs-dl">' +
      todayDate().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + "</div></div>" + prime +
      '<div class="bs-plan" id="bsPlan">' + cells.join("") + "</div>";
    if (pr.small.length) html += '<div class="bs-small" id="bsSmall">' + pr.small.map(function (k) {
      var r = room(k), f = figure(k);
      return '<a class="bs-cell bs-sm" href="' + attr(hrefOf(k)) + '" data-k="' + attr(k) + '">' + icon(k, "bs-ci") + "<span><b>" + esc(label(r)) + "</b><i>" + esc((f[0] !== "" ? f[0] + " " : "") + f[1]) + "</i></span></a>";
    }).join("") + "</div>";
    var al = (call(C.needs, seat()) || []).filter(function (a) { return a && !bad(a[1]) && moneyOK(a[1]) && (!a[2] || canOpen(a[2])); });
    html += '<section class="bs-card bs-needs"><h3>Needs you <span class="bs-pill ' + (al.length ? "warn" : "ok") + '">' + (al.length ? n(al.length, "item") : "clear") + "</span></h3>" +
      (al.length ? al.slice(0, 6).map(needRow).join("") : '<p class="bs-mut">Nothing on your screen needs you.</p>') + "</section>";
    /* the legacy dashboard: a closed toggle for a money / all-rooms seat; nothing at all for anyone else */
    if (legacyOK()) html += '<button type="button" class="bs-legt" id="bsLegT" aria-expanded="false"><span>' + esc(C.legacyBelow || "The full Command Center") + '</span><i class="bs-chev" aria-hidden="true"></i></button>';
    return html + "</div>";
  }
  function needRow(x) { var can = x[2] && canOpen(x[2]); return "<" + (can ? 'a href="' + attr(hrefOf(x[2])) + '"' : "div") + ' class="bs-need"><span class="bs-pill ' + esc(x[0] || "warn") + '">' + (x[0] === "bad" ? "Now" : "Soon") + "</span><span>" + esc(x[1]) + "</span>" + (can ? "<b>›</b>" : "") + "</" + (can ? "a" : "div") + ">"; }

  /* ---------------- the raised Birdseye: at a glance ---------------- */
  function sec(t, body, right) { return '<section class="bs-gl"><h2>' + esc(t) + (right ? "<span>" + esc(right) + "</span>" : "") + "</h2>" + body + "</section>"; }
  function glanceHTML() {
    var s = seat(), g = call(C.glance, s) || {};
    var html = '<div class="bs-page" id="bsGlance"><div class="bs-ghead"><div class="bs-kick">' + esc(houseName()) + ' · Birdseye</div><h1>Everything at a glance</h1>' +
      '<p class="bs-dl">' + esc(todayDate().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase() + " · " + String(s.label || "").toUpperCase()) + "</p>" +
      (g.lede && !bad(g.lede) && moneyOK(g.lede) ? '<p class="bs-lede">' + esc(g.lede) + "</p>" : "") + "</div>";
    var nums = (g.numbers || []).filter(function (x) { return x && !bad(x[0]) && (!x[3] || seesMoney()) && moneyOK(x[0]) && moneyOK(x[1]); }).slice(0, 4);
    if (nums.length) html += '<div class="bs-gnums">' + nums.map(function (x) { var can = x[2] && canOpen(x[2]); return "<" + (can ? 'a href="' + attr(hrefOf(x[2])) + '"' : "div") + "><b>" + esc(typeof x[0] === "number" ? x[0].toLocaleString("en-US") : x[0]) + "</b><span>" + esc(x[1]) + "</span></" + (can ? "a" : "div") + ">"; }).join("") + "</div>";
    (g.sections || []).forEach(function (sc) {
      var rows = (sc.rows || []).filter(function (r) { return r && !bad(r[2]) && (!r[3] || seesMoney()) && moneyOK(r[1]) && moneyOK(r[2]); });  /* shown to every seat; linked only where the seat can open the room */
      if (!rows.length && !sc.empty) return;
      html += sec(sc.title, rows.length ? rows.map(function (r) { var can = r[0] && canOpen(r[0]); return "<" + (can ? 'a href="' + attr(hrefOf(r[0])) + '"' : "div") + ' class="bs-go">' + (r[0] ? icon(r[0], "bs-gri") : "") + "<b>" + esc(r[1]) + "</b><span>" + esc(r[2]) + "</span>" + (can ? "<em>›</em>" : "") + "</" + (can ? "a" : "div") + ">"; }).join("") : '<p class="bs-mut">' + esc(sc.empty) + "</p>", bad(sc.right) ? "" : sc.right);
    });
    var al = (call(C.needs, seat()) || []).filter(function (a) { return a && !bad(a[1]) && moneyOK(a[1]) && (!a[2] || canOpen(a[2])); });
    html += sec("What needs you", al.length ? al.slice(0, 10).map(needRow).join("") : '<p class="bs-mut">Nothing needs you right now.</p>', al.length ? n(al.length, "item") : "clear");
    var mine = (C.rooms || []).filter(function (r) { return canOpen(r.k) && !r.hidden; });
    html += sec("Every room", mine.map(function (r) { var f = figure(r.k); return '<a class="bs-rr" href="' + attr(hrefOf(r.k)) + '">' + icon(r.k) + "<b>" + esc(label(r)) + "</b><span>" + esc(f[1]) + '</span><em class="v">' + esc(f[0]) + "</em></a>"; }).join(""), n(mine.length, "room"));
    var bus = (call(C.bus) || []).filter(function (b) { return b && !bad(b[1]) && moneyOK(b[1]); }).slice(0, 25);
    html += sec("The bus — what happened", bus.length ? bus.map(function (b) { return '<div class="bs-bus"><time>' + esc(bad(b[0]) ? "" : b[0]) + "</time><span>" + esc(b[1]) + "</span></div>"; }).join("") : '<p class="bs-mut">Quiet so far.</p>');
    return html + "</div>";
  }

  /* ---------------- the room kicker: the house name on every room ---------------- */
  function kickHTML() {
    var r = room(active), w = r && (C.wings || []).filter(function (x) { return x.k === r.wing; })[0];
    var note = r && !canOpen(r.k) ? '<div class="bs-card bs-notseat">This room is not on the ' + esc(seat().label) + ' seat, so it stays closed. Switch “Viewing as” at the top to see it as the person who works it.</div>' : "";
    return '<div class="bs-roomkick" id="bsKick"><span class="bs-hk">' + esc(houseName()) + "</span>" + (w ? " · " + esc(w.name) : "") + (r ? " · " + esc(r.label) : "") + "</div>" + note;
  }

  /* ---------------- render ---------------- */
  function render() {
    if (!mountEl) return;
    var old = mountEl.querySelectorAll(":scope > .bs-view"); old.forEach(function (x) { x.remove(); });
    mountEl.classList.toggle("bs-glancing", mode === "glance");
    /* privilege gate on the legacy page underneath: closed toggle (money seats, home), shut (anyone else on home,
       or a room outside the seat's rooms reached by a typed address) */
    var gate = mode === "home" ? (legacyOK() ? "toggle" : "shut") : (mode === "room" && active && !canOpen(active)) ? "shut" : "";
    mountEl.classList.toggle("bs-lg", !!gate); mountEl.classList.toggle("bs-lno", gate === "shut"); mountEl.classList.remove("bs-lopen");
    var v = document.createElement("div"); v.className = "bs-view bs-view-" + mode;
    v.innerHTML = mode === "home" ? planHTML() : mode === "glance" ? glanceHTML() : kickHTML();
    mountEl.insertBefore(v, mountEl.firstChild);
    var lt = v.querySelector("#bsLegT");
    if (lt) lt.onclick = function () { var on = !mountEl.classList.contains("bs-lopen"); mountEl.classList.toggle("bs-lopen", on); lt.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) setTimeout(function () { if (lt.scrollIntoView) lt.scrollIntoView({ block: "start", behavior: "smooth" }); }, 60); };
    var title = mode === "home" ? "Birdseye" : mode === "glance" ? "At a glance" : ((room(active) || {}).label || "");
    document.title = title + " · " + houseName() + " · " + C.brand.name;
  }
  function paintAll() { paintHeader(); paintDock(); render(); if (els.drawer && C.helper) paintDrawer(); }
  BS.refresh = paintAll;

  /* ---------------- public: mount ---------------- */
  BS.mount = function (o) {
    o = o || {}; C = o.config || window.BIRDSEYE; if (!C) throw new Error("BirdseyeShell: no config");
    C.id = C.id || (C.brand && C.brand.short || "os").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    C.routing = C.routing || "multipage"; C.home = C.home || "index.html"; C.seats = C.seats || { all: { label: "Everyone", sees: "*" } };
    C.brand.aeMark = C.brand.aeMark || "birdseye/marks/ae-mark.png"; C.brand.aos = C.brand.aos || "birdseye/marks/aos-business.png";
    E = C.engine ? (typeof C.engine === "string" ? window[C.engine] : C.engine) : null;
    mode = o.mode || "home"; active = o.active || null;
    mountEl = o.mountEl || document.getElementById("bsMount") || document.body;
    build(); applySkin();
    if (!mountEl.parentNode.querySelector(":scope > .bs-foot") && o.footer !== false) {
      var f = document.createElement("div"); f.innerHTML = footer(); (o.footerHost || mountEl.parentNode).appendChild(f.firstChild);
    }
    paintAll();
    return BS;
  };

  /* ---------------- public: legacy adoption ---------------- */
  BS.replaceLegacy = function (sels) {
    document.documentElement.classList.add("bs-on");
    (sels || []).forEach(function (s) { document.querySelectorAll(s).forEach(function (x) { x.classList.add("bs-legacy-off"); x.setAttribute("aria-hidden", "true"); }); });
  };
  BS.roomForHref = function (href) {
    href = String(href || "").split("#")[0].split("?")[0].split("/").pop();
    var r = (C.rooms || []).filter(function (x) { return x.href && x.href.split("/").pop() === href; })[0];
    return r ? r.k : null;
  };
  /* AMERICAN SPELLING on every visible string a legacy page draws (house rule): text nodes only — never an href,
     a value, a data key, an <option> with no value attribute (its text is its value) or anything typed into a field */
  var SKIPTAG = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|INPUT|NOSCRIPT|TEMPLATE)$/;
  function skipEl(e) { return SKIPTAG.test(e.nodeName) || e.isContentEditable || (e.nodeName === "OPTION" && !e.hasAttribute("value")); }
  function americanize(root) {
    if (!root) return;
    if (root.nodeType === 3) { var p0 = root.parentNode; if (p0 && p0.nodeType === 1 && !skipEl(p0)) { var t0 = root.nodeValue, u0 = us(t0); if (u0 !== t0) root.nodeValue = u0; } return; }
    if (root.nodeType !== 1 || skipEl(root)) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (nd) { for (var e = nd.parentNode; e && e !== root.parentNode; e = e.parentNode) { if (e.nodeType === 1 && skipEl(e)) return NodeFilter.FILTER_REJECT; } return NodeFilter.FILTER_ACCEPT; } }), nd, t, u;
    while ((nd = w.nextNode())) { t = nd.nodeValue; if (!/[a-z]/i.test(t)) continue; u = us(t); if (u !== t) nd.nodeValue = u; }
  }
  BS.americanize = americanize;
  var spellObs = null;
  function watchSpelling() {
    if (spellObs || C.americanize === false || !window.MutationObserver) return;
    americanize(document.body); if (document.title) document.title = us(document.title);
    spellObs = new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.type === "characterData") americanize(m.target); else for (var i = 0; i < m.addedNodes.length; i++) americanize(m.addedNodes[i]); }); });
    spellObs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  BS.adopt = function (o) {
    o = o || {}; C = o.config || window.BIRDSEYE; if (!C) return;
    var file = o.active || (location.pathname.split("/").pop() || "index.html");
    var home = file === C.home;
    BS.replaceLegacy(C.legacyChrome || [".sidebar", ".topbar", ".mobilebar", ".nav-backdrop", ".ae-credit", ".hamburger", ".manualbtn", ".man-fab", ".as-fab", "#aeCooFab", ".skinpill"]);
    BS.mount({ config: C, mode: home ? (location.hash === "#glance" ? "glance" : "home") : "room", active: home ? null : BS.roomForHref(file), mountEl: o.content, footerHost: o.content && o.content.parentNode });
    watchSpelling();
  };
})();
