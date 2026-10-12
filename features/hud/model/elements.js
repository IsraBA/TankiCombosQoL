// features/hud/model/elements.js  [both worlds]

// קטלוג רכיבי ה-HUD: מזהה יציב, צורת השלד, ומה מותר בכל פריסה. טהור.
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const LAYOUTS = ["default", "centered"];

  // movable, pushedBy, dom, inset: CLAUDE.mds/hud.md → The element catalogue
  const LIST = [
    { id: "status", shape: "status", layouts: LAYOUTS, movable: { default: true, centered: true } },
    { id: "killLog", shape: "log", layouts: LAYOUTS, movable: { default: true, centered: true },
      inset: { left: 0.4 } },
    { id: "chat", shape: "chat", layouts: LAYOUTS, movable: { default: true, centered: true } },
    { id: "radar", shape: "radar", layouts: LAYOUTS, movable: { default: true, centered: true } },
    { id: "supplies", shape: "slots", layouts: LAYOUTS, movable: { default: true, centered: true } },
    { id: "grenades", shape: "slots", layouts: ["default"], movable: { default: true, centered: false } },
    { id: "overdrive", shape: "ring", layouts: LAYOUTS, movable: { default: true, centered: true } },
    { id: "bars", shape: "bars", layouts: LAYOUTS, movable: { default: true, centered: false } },
    { id: "effects", shape: "effects", layouts: LAYOUTS, movable: { default: true, centered: false },
      pushedBy: { centered: "bars" } },
    { id: "userInfo", shape: "dom", dom: true, layouts: LAYOUTS, movable: { default: true, centered: true } },
    { id: "buttons", shape: "dom", dom: true, layouts: LAYOUTS, movable: { default: true, centered: true } },
    { id: "fps", shape: "dom", dom: true, layouts: LAYOUTS, movable: { default: true, centered: true } },
  ];

  const SCALE = { min: 0.5, max: 3 };
  const OPACITY = { min: 0, max: 1 };

  function byId(id) {
    return LIST.find((e) => e.id === id) || null;
  }

  function forLayout(layout) {
    return LIST.filter((e) => e.layouts.includes(layout));
  }

  function isMovable(id, layout) {
    const e = byId(id);
    return !!(e && e.movable[layout]);
  }

  // מי דוחף את הרכיב בפריסה; null = אף אחד
  function pusherOf(id, layout) {
    const e = byId(id);
    return (e && e.pushedBy && e.pushedBy[layout]) || null;
  }

  // התיבה הנראית מתוך השטח; משותף לעורך ול-MAIN
  function visibleBox(id, box) {
    const e = byId(id);
    const left = (e && e.inset && e.inset.left) || 0;
    if (!left || !box) return box;
    return Object.assign({}, box, { x: box.x + box.w * left, w: box.w * (1 - left) });
  }

  // override מנורמל: חסרים = ברירת מחדל, חוץ מהתחום = נחתך
  function normalize(ov) {
    const o = ov || {};
    const clamp = (v, r) => Math.min(r.max, Math.max(r.min, v));
    return {
      dx: Number.isFinite(o.dx) ? o.dx : 0,
      dy: Number.isFinite(o.dy) ? o.dy : 0,
      scale: Number.isFinite(o.scale) ? clamp(o.scale, SCALE) : 1,
      opacity: Number.isFinite(o.opacity) ? clamp(o.opacity, OPACITY) : 1,
    };
  }

  function isDefault(ov) {
    const o = normalize(ov);
    return o.dx === 0 && o.dy === 0 && o.scale === 1 && o.opacity === 1;
  }

  window.TankiQoL.HudElements = {
    LAYOUTS,
    LIST,
    SCALE,
    OPACITY,
    byId,
    forLayout,
    isMovable,
    pusherOf,
    visibleBox,
    normalize,
    isDefault,
  };
})();
