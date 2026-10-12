// features/hud/model/push.js  [ISOLATED world]

// רכיב שנדחף בעורך; אותה נוסחה כמו apply/game/push.js
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  // parts בשברי r; מחזיר {rect, parts} אחרי הדחיפה
  function stacked(r, ov, parts, host, hostOv) {
    const k = ov && ov.scale != null ? ov.scale : 1;
    const kb = hostOv && hostOv.scale != null ? hostOv.scale : 1;
    const px = r.x + r.w * (r.px == null ? 0.5 : r.px);
    const py = r.y + r.h * (r.py == null ? 0.5 : r.py);
    const top = host.y - py, bottom = host.y + host.h - py;
    const moved = parts.map((p) => {
      const x = r.x + p.x * r.w, y = r.y + p.y * r.h, w = p.w * r.w, h = p.h * r.h;
      // מעל נקודת הסיבוב: הקצה העליון של הדוחף
      const edge = y + h / 2 < py ? top : bottom;
      return { x: px + k * (x - px), y: py + kb * edge + k * (y - (py + edge)), w: w * k, h: h * k };
    });
    const x0 = Math.min(...moved.map((m) => m.x)), y0 = Math.min(...moved.map((m) => m.y));
    const x1 = Math.max(...moved.map((m) => m.x + m.w)), y1 = Math.max(...moved.map((m) => m.y + m.h));
    const rect = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    return {
      rect,
      parts: moved.map((m, i) => Object.assign({}, parts[i], {
        x: (m.x - x0) / rect.w, y: (m.y - y0) / rect.h, w: m.w / rect.w, h: m.h / rect.h,
      })),
    };
  }

  window.TankiQoL.HudPush = { stacked };
})();
