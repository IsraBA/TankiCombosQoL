// features/hud/editor/shapes.js  [ISOLATED world]

// השלדים של העורך, מצוירים ב-SVG-ים של המשחק. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const Q = window.TankiQoL;

  const asset = (name) => (Q.HudRecipes ? Q.HudRecipes.asset(name) : null);

  function el(cls, parent) {
    const d = document.createElement("div");
    d.className = cls;
    if (parent) parent.appendChild(d);
    return d;
  }

  // ציור מהמשחק כרקע; stretch: על כל התיבה
  function art(host, name, stretch) {
    const url = asset(name);
    if (!url) return false;
    host.style.backgroundImage = 'url("' + url + '")';
    host.style.backgroundSize = stretch ? "100% 100%" : "contain";
    host.classList.add("cme_hud-sk-art");
    return true;
  }

  // סלוט: הרקע של המשחק, ועליו האייקון
  function slot(host, icon) {
    host.classList.add("cme_hud-sk-slot");
    if (!art(host, "hudSupplyBackground")) host.classList.add("cme_hud-sk-slot--plain");
    if (!icon) return;
    const inner = el("cme_hud-sk-slot-icon", host);
    art(inner, icon);
  }

  // מצב פעיל: עיגול, ועליו האייקון
  function effect(host, icon) {
    host.classList.add("cme_hud-sk-effect");
    if (!icon) return;
    const inner = el("cme_hud-sk-effect-icon", host);
    art(inner, icon);
  }

  // רכיב HTML: צמתי העותק הנסתר, מוקטנים לבמה
  function dom(host, id) {
    const nodes = Q.HudDom ? Q.HudDom.clone(id) : [];
    if (!nodes.length) return null;
    return nodes.map((n) => {
      const wrap = el("cme_hud-dom cme_hud-sk-dom", host);
      wrap.style.left = pct(n.x);
      wrap.style.top = pct(n.y);
      wrap.style.width = n.w + "px";
      wrap.style.height = n.h + "px";
      wrap.appendChild(n.node);
      return wrap;
    });
  }

  // יומן הקרב: שורות אחידות, 16 בפסיעה של 26
  const LOG_ROWS = 7;
  function log(host) {
    const pitch = 1 / LOG_ROWS;
    for (let i = 0; i < LOG_ROWS; i++) {
      place(el("cme_hud-sk-part cme_hud-sk-logrow", host), { x: 0, y: i * pitch, w: 1, h: pitch * (16 / 26) });
    }
  }

  function place(box, p) {
    box.style.left = pct(p.x);
    box.style.top = pct(p.y);
    box.style.width = pct(p.w);
    box.style.height = pct(p.h);
  }

  // החלקים שהגילוי מסר, כל אחד בשברים של תיבת הרכיב
  function parts(host, list) {
    const out = [];
    for (const p of list) {
      const box = el("cme_hud-sk-part", host);
      place(box, p);
      if (p.kind === "slot") slot(box, p.icon);
      else if (p.kind === "effect") effect(box, p.icon);
      else if (p.kind === "ring") box.classList.add("cme_hud-sk-ring");
      else if (p.kind === "disc") art(box, "overdrive");
      else box.classList.add("cme_hud-sk-" + p.kind);
      out.push(box);
    }
    return out;
  }

  // בלי העיגול יוצא 22.000000000000004%
  function pct(v) {
    return +(v * 100).toFixed(4) + "%";
  }

  // רכיב בלי חלקים: הציור שלו על כל התיבה
  const ART = {
    radar: ["radar", false],
    chat: ["chat", true],
    ring: ["overdrive", false],
  };

  // בלי ציור מהמשחק: מסגרת בלבד, בלי צורה מומצאת
  function fallback(host, shape) {
    host.classList.add("cme_hud-sk-plain", "cme_hud-sk-plain--" + shape);
  }

  window.TankiQoL.HudShapes = {
    pct,

    // rect בשברי מסך; ctx.scale: הבמה חלקי החלון
    build(id, shape, rect, recipe, ctx) {
      const host = document.createElement("div");
      host.className = "cme_hud-shape";
      host.dataset.id = id;
      const skeleton = el("cme_hud-sk", host);

      const list = recipe && recipe.parts;
      if (shape === "dom") {
        const wraps = dom(skeleton, id);
        if (wraps) host._dom = { wraps, scale: (ctx && ctx.scale) || 1, w: rect.w };
        else fallback(skeleton, shape);
      } else if (list && list.length) {
        host._parts = parts(skeleton, list);
      } else if (shape === "log") {
        log(skeleton);
      } else {
        const a = ART[shape];
        if (!a || !art(skeleton, a[0], a[1])) fallback(skeleton, shape);
      }

      el("cme_hud-shape-frame", host);
      return host;
    },

    // רכיב שנדחף משנה גם את הסידור הפנימי
    placeParts(host, list) {
      if (!host._parts) return;
      list.forEach((p, i) => { if (host._parts[i]) place(host._parts[i], p); });
    },

    // מיקום וגודל באחוזים מהבמה, ושקיפות שנשארת נראית גם ב-0
    place(host, r, opacity) {
      host.style.left = pct(r.x);
      host.style.top = pct(r.y);
      host.style.width = pct(r.w);
      host.style.height = pct(r.h);
      const o = opacity == null ? 1 : opacity;
      host.style.setProperty("--cme-hud-alpha", String(0.2 + 0.8 * o));
      // נמדדו בפיקסלים מלאים: מקטינים לבמה וכופלים בהגדלה
      if (host._dom) {
        const k = host._dom.scale * (r.w / host._dom.w);
        for (const w of host._dom.wraps) w.style.transform = "scale(" + k + ")";
      }
    },
  };
})();
