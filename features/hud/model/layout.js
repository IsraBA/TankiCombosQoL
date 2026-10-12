// features/hud/model/layout.js  [ISOLATED world]

// המודל של המשחק: מתכון -> תיבה לוגית -> פיקסלים. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  // ציר אופקי: הקצה שאליו הרכיב נצמד, ועליו היסט
  const X_OPS = {
    left: (off, w, W) => off,
    right: (off, w, W) => W - w + off,
    center: (off, w, W) => (W - w) / 2 + off,
  };

  const Y_OPS = {
    top: (off, h, H) => off,
    bottom: (off, h, H) => H - h + off,
    center: (off, h, H) => (H - h) / 2 + off,
  };

  // frac: היסט שהוא שבר מהמסך (הצ'אט)
  const offsetOf = (axis, total) => axis.off + (axis.frac || 0) * total;

  // אסטרטגיות הסקיילינג; s = קנה המידה של הממשק
  const STRATEGIES = {
    // qxn — העוגן הוא שבר מהמסך
    iy(box, a, s, W, H) {
      return {
        x: (1 - s) * W * a[0] + s * box.x,
        y: (1 - s) * H * a[1] + s * box.y,
        w: s * box.w,
        h: s * box.h,
      };
    },

    // $xn — כמו iy, אבל עם letterbox של 16:9
    ry(box, a, s, W, H) {
      const u = W * (s - 1), v2 = H * (s - 1);
      const o = box.x / W, p = box.y / H;
      const l = H * Math.min(W / H, 16 / 9);
      const f = W - l;
      return {
        x: f / 2 + o * l + (f + u) * (o - a[0]),
        y: box.y + v2 * (p - a[1]),
        w: box.w * s,
        h: box.h * s,
      };
    },

    // jxn — העוגן הוא קואורדינטה מוחלטת
    ny(box, a, s) {
      return {
        x: box.x + (s - 1) * (box.x - a[0]),
        y: box.y + (s - 1) * (box.y - a[1]),
        w: box.w * s,
        h: box.h * s,
      };
    },

    // xxn — העוגן הוא שבר מהרכיב עצמו
    ey(box, a, s) {
      return {
        x: box.x - box.w * (s - 1) * a[0],
        y: box.y - box.h * (s - 1) * a[1],
        w: box.w * s,
        h: box.h * s,
      };
    },
  };

  // טווח ציר יחסית לעוגן: בלתי תלוי בגודל המסך
  function span(op, off, size) {
    if (op === "left" || op === "top") return [off, off + size];
    if (op === "right" || op === "bottom") return [off - size, off];
    return [off - size / 2, off + size / 2];   // center
  }

  function fromSpan(op, lo, hi) {
    const size = hi - lo;
    if (op === "left" || op === "top") return { off: lo, size };
    if (op === "right" || op === "bottom") return { off: hi, size };
    return { off: (lo + hi) / 2, size };
  }

  // אותו מרכז, גודל אחר
  function resize(recipe, w, h) {
    const sx = span(recipe.x.op, recipe.x.off, recipe.w);
    const sy = span(recipe.y.op, recipe.y.off, recipe.h);
    const cx = (sx[0] + sx[1]) / 2, cy = (sy[0] + sy[1]) / 2;
    const nx = fromSpan(recipe.x.op, cx - w / 2, cx + w / 2);
    const ny = fromSpan(recipe.y.op, cy - h / 2, cy + h / 2);
    return { k: recipe.k, a: recipe.a.slice(), w: nx.size, h: ny.size,
      x: { op: recipe.x.op, off: nx.off }, y: { op: recipe.y.op, off: ny.off } };
  }

  // איחוד: רק באותה אסטרטגיה, עוגנים וקצוות
  function union(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    if (a.k !== b.k || a.a[0] !== b.a[0] || a.a[1] !== b.a[1]) return null;
    if (a.x.op !== b.x.op || a.y.op !== b.y.op) return null;
    const ax = span(a.x.op, a.x.off, a.w), bx = span(b.x.op, b.x.off, b.w);
    const ay = span(a.y.op, a.y.off, a.h), by = span(b.y.op, b.y.off, b.h);
    const nx = fromSpan(a.x.op, Math.min(ax[0], bx[0]), Math.max(ax[1], bx[1]));
    const ny = fromSpan(a.y.op, Math.min(ay[0], by[0]), Math.max(ay[1], by[1]));
    return { k: a.k, a: a.a.slice(), w: nx.size, h: ny.size,
      x: { op: a.x.op, off: nx.off }, y: { op: a.y.op, off: ny.off } };
  }

  // מתכון + גודל התצוגה -> התיבה הלוגית שהמשחק היה נותן
  function compose(recipe, W, H) {
    const xf = X_OPS[recipe.x.op], yf = Y_OPS[recipe.y.op];
    if (!xf || !yf) return null;
    return {
      x: xf(offsetOf(recipe.x, W), recipe.w, W),
      y: yf(offsetOf(recipe.y, H), recipe.h, H),
      w: recipe.w,
      h: recipe.h,
    };
  }

  // התיבה הלוגית -> פיקסלים, דרך האסטרטגיה שהרכיב הוכרז בה
  function toPixels(box, recipe, s, W, H) {
    const f = STRATEGIES[recipe.k];
    if (!f) return null;
    return f(box, recipe.a, s, W, H);
  }

  // מתכון -> מלבן בשברי מסך; pivot: מרכז סיבוב אחר
  function place(recipe, view) {
    const W = view.w, H = view.h, s = view.scale == null ? 1 : view.scale;
    const box = compose(recipe, W, H);
    if (!box) return null;
    const px = toPixels(box, recipe, s, W, H);
    if (!px) return null;
    const out = { x: px.x / W, y: px.y / H, w: px.w / W, h: px.h / H };
    if (recipe.pivot) { out.px = recipe.pivot[0]; out.py = recipe.pivot[1]; }
    return out;
  }

  window.TankiQoL.HudLayout = {
    compose, toPixels, place, span, fromSpan, resize, union,
  };
})();
