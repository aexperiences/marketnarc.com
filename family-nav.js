/* ESPO family-nav — one shared, self-contained sticky nav for every app.
   Slick fixed top bar: family logo -> family home, current app label, and a
   "Switch app" menu of siblings. When the paywall is ON and the visitor doesn't
   own an app, that app greys out with a lock and routes to pricing.
   During preview PAYWALL=false, so everything is unlocked and freely reachable.
   Deploy the SAME file to both espogenius.com and marketnarc.com. */
(function(){
  "use strict";
  if (window.__espoNavLoaded) return; window.__espoNavLoaded = true;

  /* ---- flip this to true the day the suite goes on sale ---- */
  var PAYWALL = false;

  var TRIAD = '<svg viewBox="0 0 1024 1024" aria-hidden="true"><rect width="1024" height="1024" rx="232" fill="#1B1148"/><circle cx="512" cy="330" r="148" fill="none" stroke="#FF9E6B" stroke-width="16" opacity=".55"/><g stroke="#36306B" stroke-width="26" stroke-linecap="round"><path d="M330 672H694"/><path d="M330 672 512 330"/><path d="M694 672 512 330"/></g><circle cx="330" cy="672" r="88" fill="#5FE3C0"/><circle cx="694" cy="672" r="88" fill="#5FE3C0"/><circle cx="512" cy="330" r="108" fill="#FF9E6B"/></svg>';
  var GLASS = '<svg viewBox="0 0 1024 1024" aria-hidden="true"><rect width="1024" height="1024" rx="232" fill="#0E2B2A"/><circle cx="445" cy="430" r="235" fill="none" stroke="#E6A93C" stroke-width="64"/><polyline points="362,525 362,335 528,525 528,335" fill="none" stroke="#E6A93C" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/><line x1="612" y1="597" x2="775" y2="760" stroke="#E6A93C" stroke-width="82" stroke-linecap="round"/></svg>';

  var FAMILIES = {
    genius: {
      hostRe: /espogenius\.com/i, home: "/", brand: "ESPO", accentWord: "Genius",
      accent: "#FF9E6B", bg: "#160D3A", line: "#3A2F74", ink: "#EEEAFB", dim: "#B3A5EC",
      logo: TRIAD, ownedKey: "espo_owned_genius",
      apps: [
        { k:"iep",      name:"IEP Genius",              url:"/espo-iep-genius-app" },
        { k:"care",     name:"Care Genius",             url:"/espo-care-genius-app" },
        { k:"benefits", name:"Benefits Genius",         url:"/espo-benefits-genius-app" },
        { k:"wills",    name:"Wills & Probate Genius",  url:"/espo-wills-genius-app" }
      ]
    },
    narc: {
      hostRe: /marketnarc\.com/i, home: "/", brand: "Market", accentWord: "Narc",
      accent: "#E6A93C", bg: "#08100F", line: "#214F4C", ink: "#EAF3F0", dim: "#8FC4BB",
      logo: GLASS, ownedKey: "espo_owned_narc",
      apps: [
        { k:"market",      name:"MarketNarc",      url:"/live" },
        { k:"bill",        name:"BillNarc",        url:"/billnarc-app" },
        { k:"tax",         name:"TaxNarc",         url:"/taxnarc-app" },
        { k:"collections", name:"CollectionsNarc", url:"/collectionsnarc-app" },
        { k:"home",        name:"HomeNarc",        url:"/homenarc-app" },
        { k:"paw",         name:"PawNarc",         url:"/pawnarc-app" }
      ]
    }
  };

  var path = location.pathname.replace(/\/+$/, "") || "/";
  function findByPath(fam){
    return fam.apps.filter(function(a){ return path.indexOf(a.url.replace(/\/+$/,"")) === 0 && a.url !== "/"; })
                   .sort(function(a,b){ return b.url.length - a.url.length; })[0] || null;
  }
  // pick family: host first, else whichever family's app matches the path, else genius on marketnarc sub-screens
  var fam = null, current = null;
  Object.keys(FAMILIES).forEach(function(key){ if(FAMILIES[key].hostRe.test(location.hostname)) fam = FAMILIES[key]; });
  if (fam) { current = findByPath(fam); }
  if (!fam) { Object.keys(FAMILIES).forEach(function(key){ var c = findByPath(FAMILIES[key]); if(c){ fam = FAMILIES[key]; current = c; } }); }
  if (!fam) fam = FAMILIES.genius;
  // treat /sandbox and /track as the MarketNarc app for highlighting
  if (fam === FAMILIES.narc && !current && (/\/(sandbox|track|marketnarc|demo)$/.test(path))) current = fam.apps[0];

  /* ---- entitlement ---- */
  function owned(){
    if (!PAYWALL) return "all";
    try {
      var raw = localStorage.getItem(fam.ownedKey);
      if (!raw) return [];
      if (raw === "suite" || raw === "all") return "all";
      return JSON.parse(raw);
    } catch(e){ return []; }
  }
  function isOwned(k){ var o = owned(); return o === "all" || (o && o.indexOf(k) >= 0); }
  // public hook for when Stripe is wired: ESPONav.setOwned('suite') or ['iep','care']
  window.ESPONav = {
    setOwned: function(v){ try{ localStorage.setItem(fam.ownedKey, (v==="all"||v==="suite")?"suite":JSON.stringify(v)); render(); }catch(e){} },
    clear: function(){ try{ localStorage.removeItem(fam.ownedKey); render(); }catch(e){} }
  };

  /* ---- styles ---- */
  var css = ''
   + '#espnav{position:fixed;top:0;left:0;right:0;z-index:9000;height:50px;display:flex;align-items:center;gap:12px;'
   +   'padding:0 14px;background:' + hexA(fam.bg,.82) + ';backdrop-filter:blur(11px);-webkit-backdrop-filter:blur(11px);'
   +   'border-bottom:1px solid ' + fam.line + ';font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif}'
   + '#espnav a{text-decoration:none}'
   + '#espnav .brand{display:flex;align-items:center;gap:9px;color:' + fam.ink + '}'
   + '#espnav .brand svg{width:26px;height:26px;border-radius:7px;display:block}'
   + '#espnav .brand b{font-family:Lato,Inter,sans-serif;font-weight:900;font-size:16px;letter-spacing:.2px}'
   + '#espnav .brand b i{font-style:normal;color:' + fam.accent + '}'
   + '#espnav .brand .hm{color:' + fam.dim + ';font-size:11px;font-weight:700;margin-left:2px;opacity:.9}'
   + '#espnav .spacer{flex:1}'
   + '#espnav .cur{color:' + fam.dim + ';font-size:12.5px;font-weight:600;max-width:40vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
   + '#espnav .sw{display:flex;align-items:center;gap:7px;background:' + hexA(fam.accent,.14) + ';border:1px solid ' + fam.accent + ';'
   +   'color:' + fam.accent + ';font-family:Lato,Inter,sans-serif;font-weight:900;font-size:12.5px;border-radius:999px;padding:8px 14px;cursor:pointer}'
   + '#espnav .sw:hover{background:' + hexA(fam.accent,.22) + '}'
   + '#espnav .sw svg{width:11px;height:11px;transition:transform .2s}'
   + '#espnav.open .sw svg{transform:rotate(180deg)}'
   + '#espmenu{position:fixed;top:56px;right:12px;z-index:9001;width:min(300px,calc(100vw - 24px));'
   +   'background:' + fam.bg + ';border:1px solid ' + fam.line + ';border-radius:16px;padding:8px;'
   +   'box-shadow:0 18px 50px rgba(0,0,0,.5);opacity:0;transform:translateY(-8px);pointer-events:none;transition:.18s}'
   + '#espmenu.show{opacity:1;transform:translateY(0);pointer-events:auto}'
   + '#espmenu .mh{display:flex;align-items:center;gap:8px;color:' + fam.dim + ';font-size:11px;font-weight:800;'
   +   'text-transform:uppercase;letter-spacing:.08em;padding:8px 10px 6px}'
   + '#espmenu a.home{display:flex;align-items:center;gap:9px;color:' + fam.ink + ';font-weight:800;font-size:14px;'
   +   'padding:11px 12px;border-radius:11px;border:1px solid ' + fam.line + ';margin-bottom:6px}'
   + '#espmenu a.home:hover{border-color:' + fam.accent + '}'
   + '#espmenu a.item{display:flex;align-items:center;gap:10px;color:' + fam.ink + ';font-size:14px;font-weight:600;'
   +   'padding:11px 12px;border-radius:11px}'
   + '#espmenu a.item:hover{background:' + hexA(fam.accent,.12) + '}'
   + '#espmenu a.item .dot{width:9px;height:9px;border-radius:50%;background:' + fam.accent + ';flex:0 0 auto}'
   + '#espmenu a.item.on{background:' + hexA(fam.accent,.16) + '}'
   + '#espmenu a.item.on .tag{margin-left:auto;color:' + fam.accent + ';font-size:10.5px;font-weight:800}'
   + '#espmenu a.item.locked{opacity:.5;filter:grayscale(.7)}'
   + '#espmenu a.item.locked .dot{background:' + fam.dim + '}'
   + '#espmenu a.item.locked .lk{margin-left:auto;font-size:12px;color:' + fam.dim + '}'
   + '#espmenu a.item.locked:hover{background:' + hexA(fam.dim,.10) + '}'
   + '#espscrim{position:fixed;inset:0;z-index:8999;background:transparent;display:none}'
   + '#espscrim.show{display:block}'
   + 'body{padding-top:58px!important}'
   + '@media print{#espnav,#espmenu,#espscrim{display:none!important}body{padding-top:0!important}}';

  function hexA(hex,a){ hex=hex.replace('#',''); if(hex.length===3)hex=hex.replace(/(.)/g,'$1$1');
    var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16);
    return 'rgba('+r+','+g+','+b+','+a+')'; }

  var CH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

  function buildMenu(){
    var h = '<div class="mh">Switch app</div>';
    h += '<a class="home" href="' + fam.home + '">&#8962;&nbsp; ' + fam.brand + ' ' + fam.accentWord + ' &mdash; family home</a>';
    fam.apps.forEach(function(a){
      var here = current && current.k === a.k;
      var unlocked = isOwned(a.k);
      if (here) {
        h += '<a class="item on" href="' + a.url + '"><span class="dot"></span>' + a.name + '<span class="tag">YOU&rsquo;RE HERE</span></a>';
      } else if (unlocked) {
        h += '<a class="item" href="' + a.url + '"><span class="dot"></span>' + a.name + '</a>';
      } else {
        h += '<a class="item locked" href="' + fam.home + '#pricing" title="Unlock with the suite"><span class="dot"></span>' + a.name + '<span class="lk">&#128274; unlock</span></a>';
      }
    });
    return h;
  }

  var navEl, menuEl, scrimEl, open=false;
  function render(){ if(menuEl) menuEl.innerHTML = buildMenu(); }
  function toggle(v){
    open = (v===undefined) ? !open : v;
    navEl.classList.toggle('open', open);
    menuEl.classList.toggle('show', open);
    scrimEl.classList.toggle('show', open);
    navEl.querySelector('.sw').setAttribute('aria-expanded', open);
  }

  function mount(){
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    navEl = document.createElement('header'); navEl.id = 'espnav';
    navEl.innerHTML =
      '<a class="brand" href="' + fam.home + '" title="Back to ' + fam.brand + ' ' + fam.accentWord + '">' + fam.logo
      + '<b>' + fam.brand + '<i>' + fam.accentWord + '</i></b><span class="hm">&#8962; home</span></a>'
      + '<span class="spacer"></span>'
      + (current ? '<span class="cur">' + current.name + '</span>' : '')
      + '<button class="sw" aria-haspopup="true" aria-expanded="false">Switch app ' + CH + '</button>';
    menuEl = document.createElement('nav'); menuEl.id = 'espmenu'; menuEl.innerHTML = buildMenu();
    scrimEl = document.createElement('div'); scrimEl.id = 'espscrim';
    document.body.appendChild(navEl); document.body.appendChild(menuEl); document.body.appendChild(scrimEl);
    navEl.querySelector('.sw').addEventListener('click', function(e){ e.stopPropagation(); toggle(); });
    scrimEl.addEventListener('click', function(){ toggle(false); });
    menuEl.addEventListener('click', function(e){ if(e.target.closest('a')) toggle(false); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') toggle(false); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
