/* narc-persona.js — gives each Narc a distinct, honest voice.
   Injects a compact "signature" line up top (who I am, what I actually do — no overclaiming)
   and appends a characterful sign-off to each read. Persona is inferred from the URL, so the
   only per-app step is including this file. On-device only; nothing is sent anywhere. */
(function () {
  "use strict";
  if (window.__narcPersona) return; window.__narcPersona = true;

  var P = {
    bill: { emoji: "🧾", name: "BillNarc",
      tag: "I read medical bills line by line and flag what looks padded, duplicated, or worth challenging. I check the math and the codes — I don't guess your diagnosis.",
      signoff: "That's my read. I flag, you decide — and you can always demand an itemized bill." },
    home: { emoji: "🏠", name: "HomeNarc",
      tag: "I check whether your home is assessed too high against comps you pull yourself. I never see your address — just the numbers you type.",
      signoff: "Numbers don't lie, but the county's counting on you not to check. Now you have." },
    paw: { emoji: "🐾", name: "PawNarc",
      tag: "I read pet-insurance fine print for the gaps that bite at claim time. Warm heart, cold eye on the exclusions.",
      signoff: "Read the exclusions before the emergency, not after it. That's the whole game." },
    tax: { emoji: "🧮", name: "TaxNarc",
      tag: "Billions in credits go unclaimed every year. I point at the ones worth a second look. I don't file — I flag.",
      signoff: "Don't leave your own money sitting with the IRS. Go check each one by name." },
    collections: { emoji: "⚖️", name: "CollectionsNarc",
      tag: "I lay out your rights against debt collectors in plain English. In your corner — not theirs.",
      signoff: "Know your rights and they lose their leverage. Put everything in writing." },
    market: { emoji: "👁️", name: "MarketNarc",
      tag: "Nate reads the small-cap corner as a risk story, not a hot tip — where the danger is, how thin the data is, and when he honestly can't tell. Never a trade, never advice.",
      signoff: "That's the risk as I read it — not a call to act. The decision, and the downside, are yours. —Nate" }
  };

  function keyFromPath() {
    var p = (location.pathname || "").toLowerCase();
    if (p.indexOf("billnarc") >= 0) return "bill";
    if (p.indexOf("homenarc") >= 0) return "home";
    if (p.indexOf("pawnarc") >= 0) return "paw";
    if (p.indexOf("taxnarc") >= 0) return "tax";
    if (p.indexOf("collectionsnarc") >= 0) return "collections";
    if (p.indexOf("marketnarc") >= 0) return "market";
    return null;
  }

  var persona = P[window.NARC_PERSONA || keyFromPath()];
  if (!persona) return;

  function injectStyle() {
    if (document.getElementById("narcPersonaCss")) return;
    var css =
      ".narcsig{display:flex;gap:11px;align-items:flex-start;max-width:660px;margin:0 auto 18px;" +
      "background:rgba(255,255,255,.03);border:1px solid var(--line,rgba(255,255,255,.12));" +
      "border-radius:14px;padding:12px 14px}" +
      ".narcsig .av{flex:0 0 auto;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;" +
      "justify-content:center;font-size:18px;background:rgba(255,255,255,.05);border:1px solid var(--line,rgba(255,255,255,.12))}" +
      ".narcsig .tx{font-size:12.5px;line-height:1.5;color:var(--mut,#93A3B8)}" +
      ".narcsig .tx b{color:var(--accent,#E6A93C);font-weight:800}" +
      ".narcsignoff{margin:16px 0 2px;padding:12px 14px;border-radius:12px;border-left:3px solid var(--accent,#E6A93C);" +
      "background:rgba(255,255,255,.03);font-size:13.5px;line-height:1.5;font-style:italic;color:var(--ink,#EAF3F0)}" +
      ".narcsignoff b{font-style:normal;color:var(--accent,#E6A93C);font-weight:800}";
    var st = document.createElement("style"); st.id = "narcPersonaCss"; st.textContent = css;
    document.head.appendChild(st);
  }

  function mountSig() {
    injectStyle();
    if (document.querySelector(".narcsig")) return;
    var sig = document.createElement("div");
    sig.className = "narcsig";
    sig.innerHTML = '<div class="av">' + persona.emoji + '</div>' +
      '<div class="tx"><b>' + persona.name + '</b> — ' + persona.tag + '</div>';
    // Place it just before the first content card.
    var anchor = document.querySelector(".card") ||
      document.getElementById("report") ||
      (document.querySelector(".wrap") || document.querySelector(".app") || document.body);
    if (anchor && anchor.parentNode && anchor.className && anchor.className.indexOf("card") >= 0) {
      anchor.parentNode.insertBefore(sig, anchor);
    } else if (anchor) {
      anchor.insertBefore(sig, anchor.firstChild);
    }
  }

  // Append the sign-off after a report renders (apps with a decode()/#reportbody).
  function appendSignoff() {
    var rb = document.getElementById("reportbody");
    if (!rb || !rb.innerHTML.trim()) return;
    if (rb.querySelector(".narcsignoff")) return;
    var s = document.createElement("div");
    s.className = "narcsignoff";
    s.innerHTML = persona.signoff + ' <b>—' + persona.name + '</b>';
    rb.appendChild(s);
  }
  function wrapDecode() {
    var orig = window.decode;
    if (typeof orig !== "function" || orig.__personaWrapped) return;
    var w = function () { var r = orig.apply(this, arguments); try { appendSignoff(); } catch (e) {} return r; };
    w.__personaWrapped = true; window.decode = w;
  }

  function boot() { try { mountSig(); } catch (e) {} try { wrapDecode(); } catch (e) {} }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
