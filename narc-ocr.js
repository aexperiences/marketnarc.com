/* narc-ocr.js — shared on-device photo reader for every Narc.
   Free + private: runs Tesseract.js (WASM) fully in the browser. Your document is read on your
   phone; only the reader library is fetched from a CDN — the photo/image bytes never leave the device.
   Works on iOS Safari, Android Chrome, and desktop (unlike the old TextDetector, which iOS lacks).

   Use:  NarcOCR.scan(onText, onStatus)   // opens camera/file picker, returns extracted text
         onText(text)     -> called with the recognized text
         onStatus(html)   -> called with progress/status HTML ('' clears it)
*/
(function () {
  if (window.NarcOCR) return;
  var CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  var loading = null;

  function loadLib() {
    if (window.Tesseract) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = CDN; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { loading = null; rej(new Error("reader failed to load")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function pickImage() {
    return new Promise(function (res) {
      var inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      inp.setAttribute("capture", "environment"); // hint the rear camera on phones
      inp.onchange = function () { res(inp.files && inp.files[0] ? inp.files[0] : null); };
      inp.click();
    });
  }

  // Downscale huge phone photos so OCR is fast + reliable (long edge ~1600px).
  function prep(file) {
    return new Promise(function (res) {
      try {
        var img = new Image();
        img.onload = function () {
          var max = 1600, w = img.naturalWidth, h = img.naturalHeight, sc = Math.min(1, max / Math.max(w, h));
          if (sc >= 1) { res(file); return; }
          var c = document.createElement("canvas");
          c.width = Math.round(w * sc); c.height = Math.round(h * sc);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (b) { res(b || file); }, "image/jpeg", 0.9);
        };
        img.onerror = function () { res(file); };
        img.src = URL.createObjectURL(file);
      } catch (e) { res(file); }
    });
  }

  window.NarcOCR = {
    supported: true,
    scan: function (onText, onStatus) {
      var st = function (m) { if (onStatus) onStatus(m); };
      pickImage().then(function (file) {
        if (!file) return;
        st("Reading your photo <b>on your device</b>… (first read loads the free reader once)");
        loadLib().then(function () {
          return prep(file);
        }).then(function (img) {
          return Tesseract.recognize(img, "eng", {
            logger: function (m) {
              if (m && m.status === "recognizing text") st("Reading… " + Math.round((m.progress || 0) * 100) + "%");
            }
          });
        }).then(function (r) {
          var text = (r && r.data && r.data.text) || "";
          st("");
          if (onText) onText(text);
        }).catch(function () {
          st("Couldn’t read that one — try a clearer, straight-on photo in good light, or just type it in.");
        });
      });
    }
  };
})();
