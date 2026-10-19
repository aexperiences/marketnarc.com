/* =============================================================================
   AE APP-SHELL SCROLL — the bottom dock stays put on a phone.  Accelerated Experiences LLC · Oct 11 2026.

   Anthony: "why in birdseye on the phone does the bottom nav move up and down when scrolling... it gets in
   the way on all of them."  On an iPhone the page scrolls the WINDOW.
   Installed on the home screen (standalone, viewport-fit=cover) iOS rubber-bands and momentum-scrolls the whole
   layout viewport, and in Safari it collapses and expands its toolbar; a position:fixed dock rides that bounce.

   The fix, on phones and tablets (max-width 1000px; a desktop is never touched): the window never scrolls.
   Every page element moves into ONE scroller (#aeScroll, inset 0 over the viewport, overflow-y auto;
   absolute, not fixed, so it makes no stacking context and a legacy modal inside it still paints over the dock) and the
   fixed chrome (dock, More sheet, scrim, toasts, modals, helper drawer) stays outside it as fixed siblings.
   The document never scrolls (html and body are locked, body is position:fixed), so any bounce happens inside
   the scroller and the dock holds still.

   Drop-in: <script src="ae-app-scroll.js"></script> anywhere (the Birdseye shell loads it itself).
   Optional, before it loads: window.AE_APP_SCROLL = { max: 1000, keep: [".my-fixed-thing"], pad: "120px" }.
   While it is on, window.scrollTo / scroll / scrollBy and window.scrollY / pageYOffset / scrollX / pageXOffset
   read and drive the scroller, and the scroller's scroll events are relayed to document/window, so legacy
   "back to top", "keep my place on redraw" and scroll listeners keep working. A focused field near the bottom
   is scrolled into view inside the scroller. Elements appended to <body> later are sorted in or out the same
   way. Nothing here sends, stores (beyond this tab's scroll place) or deletes anything.
   API: AEAppScroll.on (bool), .el (the scroller or null), .refresh(), .top(), .to(y)
   ============================================================================= */
(function () {
  "use strict";
  if (window.AEAppScroll) return;
  var cfg = window.AE_APP_SCROLL || {};
  var MAX = cfg.max || 1000;
  var mq = window.matchMedia ? window.matchMedia("(max-width:" + MAX + "px)") : null;
  var KEEP = [".bs-tail", "[data-ae-fixed]"].concat(cfg.keep || []).join(",");
  var SKIP = /^(SCRIPT|STYLE|LINK|META|TEMPLATE|NOSCRIPT|BASE|TITLE)$/;
  var A = window.AEAppScroll = { on: false, el: null };
  var sc = null, obs = null, root = document.documentElement;

  /* one stylesheet, injected once */
  var st = document.createElement("style"); st.id = "aeAppScrollCSS";
  st.textContent =
    "html.ae-as,html.ae-as body{height:100%;overflow:hidden;overscroll-behavior:none}" +
    "html.ae-as body{position:fixed;top:0;right:0;bottom:0;left:0;width:100%;margin:0}" +
    "#aeScroll{position:absolute;top:0;right:0;bottom:0;left:0;margin:0;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;" +
    "box-sizing:border-box;padding-bottom:max(var(--ae-as-body-pb,0px)," + (cfg.pad ? cfg.pad : "calc(96px + env(safe-area-inset-bottom,0px))") + ")}" +
    "@media print{html.ae-as,html.ae-as body{height:auto;overflow:visible;position:static}#aeScroll{position:static;overflow:visible;padding-bottom:0}}";
  (document.head || root).appendChild(st);

  /* ---------------- window shims (only while on) ---------------- */
  var nTo = window.scrollTo, nBy = window.scrollBy, nScroll = window.scroll;
  function args(a, b) { return a && typeof a === "object" ? a : { left: +a || 0, top: +b || 0 }; }
  window.scrollTo = function (a, b) { if (A.on && sc) return sc.scrollTo(args(a, b)); return nTo.apply(window, arguments); };
  window.scroll = function (a, b) { if (A.on && sc) return sc.scrollTo(args(a, b)); return (nScroll || nTo).apply(window, arguments); };
  window.scrollBy = function (a, b) { if (A.on && sc) return sc.scrollBy(args(a, b)); return nBy.apply(window, arguments); };
  function shim(name, prop) {
    var d = Object.getOwnPropertyDescriptor(window, name) || Object.getOwnPropertyDescriptor(Window.prototype, name);
    if (!d || !d.get) return;
    try {
      Object.defineProperty(window, name, { configurable: true, enumerable: true,
        get: function () { return A.on && sc ? sc[prop] : d.get.call(window); }, set: function () {} });
    } catch (e) {}
  }
  shim("scrollY", "scrollTop"); shim("pageYOffset", "scrollTop"); shim("scrollX", "scrollLeft"); shim("pageXOffset", "scrollLeft");
  function nativeY() { var s = document.scrollingElement || root; return s ? s.scrollTop : 0; }

  /* ---------------- what stays outside ---------------- */
  function fixed(el) { try { return getComputedStyle(el).position === "fixed"; } catch (e) { return false; } }
  function keepOut(n) {
    if (n === sc) return true;
    if (n.nodeType !== 1) return false;
    if (SKIP.test(n.nodeName)) return true;
    if (n.matches && n.matches(KEEP)) return true;
    if (fixed(n)) return true;
    /* a plain wrapper whose every child is fixed chrome (the Birdseye .bs-tail pattern) */
    var kids = n.children; if (!kids.length) return false;
    for (var i = 0; i < kids.length; i++) { if (!SKIP.test(kids[i].nodeName) && !fixed(kids[i])) return false; }
    return true;
  }
  /* the scroller heals itself: a page that rewrites document.body.innerHTML (Steak n Eggs, the showroom engines)
     drops it, and an adapter that wraps body's children (Barry's hub) can tuck it inside a wrapper */
  function heal(body) {
    if (sc.parentNode === body) return;
    if (sc.isConnected) { var f = document.createDocumentFragment(); while (sc.firstChild) f.appendChild(sc.firstChild); sc.parentNode.replaceChild(f, sc); }
    else while (sc.firstChild) sc.removeChild(sc.firstChild);   /* the page wiped body on purpose: its old content goes too */
    body.insertBefore(sc, body.firstChild);
  }
  function sweep() {
    if (!sc || !document.body) return;
    heal(document.body);
    var body = document.body, before = document.createDocumentFragment(), after = document.createDocumentFragment(), past = false;
    Array.prototype.slice.call(body.childNodes).forEach(function (n) {
      if (n === sc) { past = true; return; }
      if (keepOut(n)) return;
      (past ? after : before).appendChild(n);
    });
    if (before.childNodes.length) sc.insertBefore(before, sc.firstChild);
    if (after.childNodes.length) sc.appendChild(after);
    /* a top-level element that turned fixed after its stylesheet arrived goes back out beside the dock */
    Array.prototype.slice.call(sc.children).forEach(function (n) { if (!SKIP.test(n.nodeName) && (fixed(n) || (n.matches && n.matches(KEEP)))) body.appendChild(n); });
  }
  A.refresh = sweep;

  /* ---------------- on / off ---------------- */
  var LAYOUT = ["display", "flexDirection", "flexWrap", "alignItems", "justifyContent", "gap", "gridTemplateColumns", "gridTemplateRows", "paddingTop", "paddingLeft", "paddingRight"];
  function start() {
    if (A.on || !document.body) return;
    var body = document.body, y = nativeY(), bs = getComputedStyle(body);
    sc = document.createElement("div"); sc.id = "aeScroll"; sc.setAttribute("data-ae-scroll", "");
    LAYOUT.forEach(function (p) { var v = bs[p]; if (p === "display") { if (v === "flex" || v === "grid") sc.style.display = v; } else if (v && v !== "normal" && v !== "none" && v !== "0px") sc.style[p] = v; });
    sc.style.setProperty("--ae-as-body-pb", bs.paddingBottom || "0px");
    var sp = getComputedStyle(root).scrollPaddingTop; if (sp && sp !== "auto") sc.style.scrollPaddingTop = sp;
    body.insertBefore(sc, body.firstChild);
    root.classList.add("ae-as");
    A.on = true; A.el = sc;
    sweep();
    sc.scrollTop = y;
    sc.addEventListener("scroll", relay, { passive: true });
    obs = new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length) { sweep(); return; } });
    obs.observe(body, { childList: true });
    restore();
  }
  function stop() {
    if (!A.on) return;
    var y = sc.scrollTop, body = document.body;
    obs && obs.disconnect(); obs = null;
    while (sc.firstChild) body.insertBefore(sc.firstChild, sc);
    sc.removeEventListener("scroll", relay); sc.remove();
    root.classList.remove("ae-as"); A.on = false; A.el = null; sc = null;
    nTo.call(window, 0, y);
  }
  var relaying = false;
  function relay() {
    if (relaying) return; relaying = true;
    try { document.dispatchEvent(new Event("scroll", { bubbles: true })); } catch (e) {}
    relaying = false;
  }
  A.top = function () { return A.on && sc ? sc.scrollTop : nativeY(); };
  A.to = function (y) { window.scrollTo(0, y); };

  /* ---------------- the keyboard: a focused field comes into view inside the scroller ---------------- */
  function field(t) { return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.nodeName)); }
  function reveal(t) {
    if (!A.on || !sc || !t || !sc.contains(t)) return;
    var vv = window.visualViewport, h = vv ? vv.height + (vv.offsetTop || 0) : window.innerHeight, r = t.getBoundingClientRect();
    if (r.top < 64 || r.bottom > h - 24) { try { t.scrollIntoView({ block: "center", inline: "nearest" }); } catch (e) { t.scrollIntoView(); } }
  }
  document.addEventListener("focusin", function (e) { if (field(e.target)) { reveal(e.target); setTimeout(function () { reveal(e.target); }, 350); } });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", function () { var a = document.activeElement; if (field(a)) setTimeout(function () { reveal(a); }, 60); else settle(); });
  /* iOS nudges the locked document to make room for the keyboard; once the keyboard is gone, put it back to 0 */
  function settle() { if (A.on && nativeY() !== 0 && !field(document.activeElement)) nTo.call(window, 0, 0); }
  document.addEventListener("focusout", function () { setTimeout(settle, 120); });
  window.addEventListener("scroll", function (e) { if (A.on && e.target === document && !relaying && !field(document.activeElement)) settle(); }, true);
  window.addEventListener("load", function () { if (A.on) sweep(); });

  /* ---------------- keep this tab's place across a reload / back ---------------- */
  var KEY = "aeas:" + location.pathname + location.search;
  function restore() {
    var nav = (performance.getEntriesByType && performance.getEntriesByType("navigation")[0]) || {};
    if (location.hash && location.hash.length > 1 && !/^#[!\/]/.test(location.hash)) {
      var t = null; try { t = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) {}
      if (t) { requestAnimationFrame(function () { t.scrollIntoView(); }); return; }
    }
    if (nav.type === "reload" || nav.type === "back_forward") {
      var v = null; try { v = sessionStorage.getItem(KEY); } catch (e) {}
      if (v) requestAnimationFrame(function () { if (sc) sc.scrollTop = +v || 0; });
    }
  }
  window.addEventListener("pagehide", function () { if (A.on && sc) try { sessionStorage.setItem(KEY, String(sc.scrollTop)); } catch (e) {} });

  function sync() { if (mq && mq.matches) start(); else stop(); }
  if (mq) { if (mq.addEventListener) mq.addEventListener("change", sync); else if (mq.addListener) mq.addListener(sync); }
  if (document.body) sync(); else document.addEventListener("DOMContentLoaded", sync);
})();
