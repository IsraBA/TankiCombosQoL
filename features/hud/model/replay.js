// features/hud/model/replay.js  [ISOLATED world]

// רשומת מדידה מקרב -> מלבנים במסך הנוכחי. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  // הסליידר של המשחק (0..100) -> פקטור; מ-BattleSettings.ksi
  function ksi(v) {
    const t = Math.min(100, Math.max(0, Number(v) || 0));
    return t < 50 ? 0.75 + (t / 50) * 0.25 : 1 + ((t - 50) / 50) * 0.5;
  }

  // הפקטור עכשיו: הסליידר וגופן השורש יכולים להשתנות
  function scaleNow(rec, now) {
    let s = rec.scale || 1;
    if (rec.uiSize != null && now.uiSize != null) s *= ksi(now.uiSize) / ksi(rec.uiSize);
    if (rec.rootFontPx && now.rootFontPx) s *= now.rootFontPx / rec.rootFontPx;
    return s;
  }

  // לאיזה שליש של המסך נצמד ציר: 0, .5 או 1
  function anchorFrac(pos, size, total) {
    const c = pos + size / 2;
    if (c < total / 3) return 0;
    if (c > (2 * total) / 3) return 1;
    return 0.5;
  }

  // מלבן לוגי -> פיקסלים, לפי סוג האסטרטגיה שנמדד
  function toPixels(kind, box, a, s, W, H) {
    if (kind === "identity") return { x: box.x, y: box.y, w: box.w, h: box.h };
    if (kind === "letterbox") {
      const u = W * (s - 1), s2 = H * (s - 1);
      const o = box.x / W, _ = box.y / H;
      const l = H * Math.min(W / H, 16 / 9), f = W - l, v = f / 2;
      return {
        x: v + o * l + (f + u) * (o - a[0]),
        y: box.y + s2 * (_ - a[1]),
        w: box.w * s, h: box.h * s,
      };
    }
    return {
      x: (1 - s) * W * a[0] + s * box.x,
      y: (1 - s) * H * a[1] + s * box.y,
      w: box.w * s, h: box.h * s,
    };
  }

  // היפוך: איזה עוגן היה נותן את המלבן שנמדד
  function invert(kind, lx, ly, px, py, s, W, H) {
    if (kind === "identity") return null;
    if (kind === "letterbox") {
      const u = W * (s - 1), s2 = H * (s - 1);
      const o = lx / W, _ = ly / H;
      const l = H * Math.min(W / H, 16 / 9), f = W - l, v = f / 2;
      if (f + u === 0 || s2 === 0) return null;
      return [(v + o * l + (f + u) * o - px) / (f + u), _ - (py - ly) / s2];
    }
    const dw = (1 - s) * W, dh = (1 - s) * H;
    if (!dw || !dh) return null;
    return [(px - s * lx) / dw, (py - s * ly) / dh];
  }

  // הגששת של measure.js טועה לפעמים; פותרים מהמספרים
  function solved(g, Wr, Hr, s) {
    const fallback = { k: g.k, a: (g.a || [0, 0]).slice() };
    if (!g.px || s === 1) return fallback;
    for (const k of [g.k, "linear", "letterbox"]) {
      const a = invert(k, g.l[0], g.l[1], g.px[0], g.px[1], s, Wr, Hr);
      if (a && a.every((v) => isFinite(v) && v >= -0.05 && v <= 1.05)) return { k, a };
    }
    return fallback;
  }

  // רשומת מדידה -> מלבנים כשברים של המסך הנוכחי
  function fit(rec, now) {
    const out = {};
    if (!rec || !rec.groups || !rec.screen) return out;
    const Wr = rec.screen.w, Hr = rec.screen.h;
    const W = now.screen ? now.screen.w : Wr, H = now.screen ? now.screen.h : Hr;
    const s = scaleNow(rec, now);
    for (const id of Object.keys(rec.groups)) {
      const g = rec.groups[id];
      const [lx, ly, lw, lh] = g.l;
      // ההיסט מהעוגן קבוע; העוגן עוקב אחרי המסך
      const ax = anchorFrac(lx, lw, Wr), ay = anchorFrac(ly, lh, Hr);
      const box = { x: ax * W + (lx - ax * Wr), y: ay * H + (ly - ay * Hr), w: lw, h: lh };
      const how = solved(g, Wr, Hr, rec.scale || 1);
      const px = toPixels(how.k, box, how.a, s, W, H);
      out[id] = { x: px.x / W, y: px.y / H, w: px.w / W, h: px.h / H };
    }
    return out;
  }

  window.TankiQoL.HudReplay = { ksi, scaleNow, anchorFrac, toPixels, invert, solved, fit };
})();
