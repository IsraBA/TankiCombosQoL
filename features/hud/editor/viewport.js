// features/hud/editor/viewport.js  [ISOLATED world]

// המסגרת של הבמה: המסך בקטן, והמעקב אחרי גודל החלון
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const div = (className) => {
    const el = document.createElement("div");
    el.className = className;
    return el;
  };

  window.TankiQoL.HudViewport = {
    // emptyText: כשאין מה לצייר; onResize: אחרי שהחלון השתנה
    create(emptyText, onResize) {
      const el = div("cme_hud-viewport");
      const stage = div("cme_hud-stage");
      const empty = div("cme_hud-empty");
      empty.textContent = emptyText;
      empty.hidden = true;
      el.appendChild(stage);
      el.appendChild(empty);
      let raf = 0, observer = null;

      // אותו יחס צלעות כמו המסך, בלי מתיחה
      function fit() {
        const availW = el.clientWidth, availH = el.clientHeight;
        const sw = window.innerWidth, sh = window.innerHeight;
        if (!(availW > 0 && availH > 0 && sw > 0 && sh > 0)) return;
        let w = availW, h = (availW * sh) / sw;
        if (h > availH) { h = availH; w = (availH * sw) / sh; }
        stage.style.width = Math.round(w) + "px";
        stage.style.height = Math.round(h) + "px";
      }

      function onWindow() {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => { raf = 0; onResize(); });
      }

      return {
        el, stage, empty, fit,
        watch() {
          window.addEventListener("resize", onWindow);
          // הפריסה הראשונה מגיעה אחרי ה-append
          if (typeof ResizeObserver === "function") {
            observer = new ResizeObserver(fit);
            observer.observe(el);
          }
        },
        unwatch() {
          window.removeEventListener("resize", onWindow);
          if (observer) { observer.disconnect(); observer = null; }
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
        },
      };
    },
  };
})();
