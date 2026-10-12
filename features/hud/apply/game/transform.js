// features/hud/apply/game/transform.js  [MAIN world]

// נקודת ההתערבות: המלבן שכל ספרייט מחשב לפני הציור, וה-alpha שלו
(function () {
  "use strict";

  const NS = (window.__HUD = window.__HUD || {});
  const I = (NS.internals = NS.internals || {});
  const N = I.N;
  const catalog = () => window.TankiQoL && window.TankiQoL.HudElements;

  let patched = false;
  let origToPixels = null;
  let origAlpha = null;
  let layoutDepth = 0;

  function patchedToPixels(screen, out) {
    origToPixels.call(this, screen, out);
    if (!I.screen) I.screen = screen;
    if (!I.RectCtor && out) I.RectCtor = out.constructor;
    if (layoutDepth > 0) { NS.debug.layoutCalls++; return; }
    // רץ על כל ספרייט בכל פריים: יוצאים מוקדם
    const layout = I.layout() || "default";
    if (!I.hasOverrides(layout)) return;
    try {
      const id = I.groupOf(this);
      if (!id) return;
      const Elements = catalog();
      const on = Elements && Elements.pusherOf(id, layout);
      if (on) {
        // נדחף גם כשרק הדוחף שונה
        const ov = I.overrideFor(id) || (I.overrideFor(on) ? Elements.normalize({}) : null);
        if (ov) { NS.debug.renderCalls++; I.pushed(out, ov, on, screen); }
        return;
      }
      const ov = I.overrideFor(id);
      if (!ov) return;
      const p = I.pivotOf(id, screen);
      if (!p) return;
      NS.debug.renderCalls++;
      const k = ov.scale;
      const dx = ov.dx * screen[N.w](), dy = ov.dy * screen[N.h]();
      out[N.setX](p.x + dx + (out[N.x]() - p.x) * k);
      out[N.setY](p.y + dy + (out[N.y]() - p.y) * k);
      out[N.setW](out[N.w]() * k);
      out[N.setH](out[N.h]() * k);
    } catch (e) {
      NS.debug.lastError = String(e);
    }
  }

  function patchedAlpha() {
    const a = origAlpha.call(this);
    if (!I.hasOverrides(I.layout() || "default")) return a;
    try {
      const id = I.groupOf(this);
      if (!id) return a;
      const ov = I.overrideFor(id);
      return ov ? a * ov.opacity : a;
    } catch (e) {
      return a;
    }
  }

  // s4o בתוך o4o הוא פריסה לוגית, לא ציור
  const wrappedLayoutProtos = new WeakSet();
  function wrapLayout(node) {
    const proto = I.ownerOf(node, N.layout);
    if (!proto || wrappedLayoutProtos.has(proto)) return;
    const base = I.ownerOf(I.container, N.toPixels);
    if (proto === base) return;
    wrappedLayoutProtos.add(proto);
    const orig = proto[N.layout];
    proto[N.layout] = function (view, screen) {
      layoutDepth++;
      try {
        return orig.call(this, view, screen);
      } finally {
        layoutDepth--;
        I.markLayoutChanged();
        I.scheduleMeasure(600);
      }
    };
  }

  function patchProtos() {
    if (patched) return;
    const drawProto = I.ownerOf(I.container, N.toPixels);
    const nodeProto = I.ownerOf(I.container, N.alpha);
    if (!drawProto || !nodeProto) throw new Error("display prototypes not found");
    origToPixels = drawProto[N.toPixels];
    origAlpha = nodeProto[N.alpha];
    drawProto[N.toPixels] = patchedToPixels;
    // על אובייקטי התצוגה בלבד, לא על סצנת התלת-ממד
    Object.defineProperty(drawProto, N.alpha, {
      value: patchedAlpha, writable: true, configurable: true,
    });
    patched = true;
  }

  I.on("root", () => {
    try {
      patchProtos();
    } catch (e) {
      NS.debug.lastError = String(e);
    }
  });
  I.on("nodeAdded", wrapLayout);
})();
