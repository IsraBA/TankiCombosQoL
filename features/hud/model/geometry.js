// features/hud/model/geometry.js  [ISOLATED world]

// הטרנספורמציה של העורך, הצמדה, חפיפה וגבולות — בשברי מסך
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  // היסט וגודל סביב המרכז, או סביב r.px/r.py
  function transform(r, ov) {
    const k = ov && ov.scale != null ? ov.scale : 1;
    const dx = (ov && ov.dx) || 0, dy = (ov && ov.dy) || 0;
    const fx = r.px == null ? 0.5 : r.px, fy = r.py == null ? 0.5 : r.py;
    const cx = r.x + r.w * fx, cy = r.y + r.h * fy;
    return { x: cx + dx - r.w * k * fx, y: cy + dy - r.h * k * fy, w: r.w * k, h: r.h * k };
  }

  // מרכז קרוב לאמצע המסך (tol לכל ציר) נצמד אליו
  function snapCenter(r, ov, tol) {
    const t = transform(r, ov);
    const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
    const out = Object.assign({}, ov);
    const x = Math.abs(cx - 0.5) < tol.x, y = Math.abs(cy - 0.5) < tol.y;
    if (x) out.dx = (ov.dx || 0) + 0.5 - cx;
    if (y) out.dy = (ov.dy || 0) + 0.5 - cy;
    return { ov: out, x, y };
  }

  function intersects(a, b, pad) {
    const p = pad || 0;
    return a.x < b.x + b.w + p && a.x + a.w + p > b.x && a.y < b.y + b.h + p && a.y + a.h + p > b.y;
  }

  // שטח, לא כן/לא: המשחק עצמו מתחיל בחפיפות
  function overlapArea(a, b) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  }

  function inside(r, eps) {
    const e = eps || 0;
    return r.x >= -e && r.y >= -e && r.x + r.w <= 1 + e && r.y + r.h <= 1 + e;
  }

  // dx/dy כך שהמלבן יישאר בתוך המסך
  function clampOffset(r, ov) {
    const t = transform(r, Object.assign({}, ov, { dx: 0, dy: 0 }));
    const dx = Math.min(1 - (t.x + t.w), Math.max(-t.x, ov.dx || 0));
    const dy = Math.min(1 - (t.y + t.h), Math.max(-t.y, ov.dy || 0));
    return Object.assign({}, ov, { dx, dy });
  }

  window.TankiQoL.HudGeometry = { transform, snapCenter, intersects, overlapArea, inside, clampOffset };
})();
