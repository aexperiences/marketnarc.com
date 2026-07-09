/* narc-receipt.js — a shareable, screenshot-worthy verdict card any Narc can drop in.
   Renders to a square canvas (great for IG/X), with Save-image + native Share. Free, on-device.
   Use: NarcReceipt.card({ el, narc:'BillNarc', accent:'#4FCB8E', headline, big, sub, share });
*/
(function () {
  if (window.NarcReceipt) return;

  function wrap(x, text, X, Y, maxW, lh) {
    var words = (text || "").split(" "), line = "", yy = Y;
    for (var i = 0; i < words.length; i++) {
      var t = line + words[i] + " ";
      if (x.measureText(t).width > maxW && i > 0) { x.fillText(line.trim(), X, yy); line = words[i] + " "; yy += lh; }
      else line = t;
    }
    x.fillText(line.trim(), X, yy); return yy;
  }

  function draw(o) {
    var W = 1080, H = 1080;
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var x = c.getContext("2d");
    var accent = o.accent || "#4FCB8E", bg = o.bg || "#0A1730";
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    var g = x.createRadialGradient(W * 0.5, -40, 0, W * 0.5, -40, H * 0.9);
    g.addColorStop(0, accent + "2e"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = "rgba(255,255,255,.08)"; x.lineWidth = 2; x.strokeRect(40, 40, W - 80, H - 80);

    x.fillStyle = accent; x.font = "900 46px Georgia, 'Times New Roman', serif";
    x.fillText((o.narc || "Narc").toUpperCase(), 88, 150);
    x.fillStyle = "#8FB6DC"; x.font = "600 30px -apple-system, 'Segoe UI', sans-serif";
    x.fillText("N A R C ' D .", 88, 196);

    x.fillStyle = "#EAF3F0"; x.font = "700 58px -apple-system, 'Segoe UI', sans-serif";
    wrap(x, o.headline || "", 88, 360, W - 176, 70);

    x.fillStyle = accent; x.font = "900 132px Georgia, serif";
    x.fillText(o.big || "", 84, 720);

    x.fillStyle = "#8FB6DC"; x.font = "500 36px -apple-system, 'Segoe UI', sans-serif";
    wrap(x, o.sub || "", 88, 800, W - 176, 48);

    x.fillStyle = "#5c789e"; x.font = "600 30px -apple-system, 'Segoe UI', sans-serif";
    x.fillText("The Narcs · marketnarc.com · see-through-it tools", 88, H - 96);
    x.fillText("Educational — not financial, medical, or legal advice.", 88, H - 54);
    return c;
  }

  window.NarcReceipt = {
    card: function (o) {
      var host = o.el; if (!host) return;
      var cvs = draw(o);
      cvs.style.cssText = "width:100%;max-width:360px;border-radius:18px;display:block;margin:0 auto;box-shadow:0 14px 40px rgba(0,0,0,.4)";
      host.innerHTML = "";
      host.appendChild(cvs);
      var bar = document.createElement("div");
      bar.style.cssText = "display:flex;gap:9px;justify-content:center;margin-top:12px;flex-wrap:wrap";
      function mkbtn(label) { var b = document.createElement("button"); b.textContent = label; b.className = "lnk"; b.type = "button"; b.style.minHeight = "44px"; return b; }
      var save = mkbtn("📸 Save image");
      save.onclick = function () { cvs.toBlob(function (b) { var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = (o.narc || "narc").toLowerCase() + "-receipt.png"; a.click(); }, "image/png"); };
      bar.appendChild(save);
      if (navigator.share) {
        var sh = mkbtn("↗ Share");
        sh.onclick = function () {
          cvs.toBlob(function (b) {
            try {
              var file = new File([b], (o.narc || "narc").toLowerCase() + "-receipt.png", { type: "image/png" });
              if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], text: o.share || ("Narc'd it. " + (o.headline || "")) });
              else navigator.share({ text: (o.share || ("Narc'd it. " + (o.headline || ""))) + " — marketnarc.com" });
            } catch (e) {}
          }, "image/png");
        };
        bar.appendChild(sh);
      }
      host.appendChild(bar);
    }
  };
})();
