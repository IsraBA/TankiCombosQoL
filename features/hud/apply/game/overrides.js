// features/hud/apply/game/overrides.js  [MAIN world]

// ההעדפות שהגיעו מהגשר, ומרכז הסיבוב של כל רכיב. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  const NS = (window.__HUD = window.__HUD || {});
  const I = (NS.internals = NS.internals || {});
  const N = I.N;
  // נקרא בזמן שימוש: הקטלוג עשוי להיטען אחרינו
  const catalog = () => window.TankiQoL && window.TankiQoL.HudElements;

  I.settings = { layouts: {} };   // מה-storage, דרך הגשר
  I.pivots = {};                  // פריסה -> {id: {x,y}} בשברי מסך, מהעורך
  let counts = {};                // פריסה -> כמה רכיבים הוגדרו בה

  // יש העדפות בפריסה? נבדק בכל ספרייט, ולכן זול
  I.hasOverrides = (layout) => !!counts[layout];

  // ה-override של רכיב בפריסה הנוכחית, מנורמל; null = אין
  I.overrideFor = function (id) {
    const Elements = catalog();
    const layout = I.layout() || "default";
    const per = I.settings.layouts[layout];
    const raw = per && per.elements && per.elements[id];
    if (!raw || !Elements) return null;
    const ov = Elements.normalize(raw);
    if (Elements.isDefault(ov)) return null;
    // מה שלא נגרר בפריסה לא מקבל היסט
    if (!Elements.isMovable(id, layout)) { ov.dx = 0; ov.dy = 0; }
    return ov;
  };

  // מרכז הסיבוב בפיקסלים, במטמון קצר
  const pivotCache = new Map();
  I.pivotOf = function (id, screen) {
    const now = performance.now();
    const layout = I.layout() || "default";
    const Elements = catalog();
    // על הטנק: סביב נקודת הטנק החיה, בכל פריים
    if (Elements && !Elements.isMovable(id, layout)) {
      const p = I.tankPoint();
      return p ? { x: p.x, y: p.y, t: 0 } : null;
    }
    const c = pivotCache.get(id);
    if (c && now - c.t < 12) return c;
    const per = I.pivots[layout];
    const known = per && per[id];
    let p;
    if (known) {
      p = { x: known.x * screen[N.w](), y: known.y * screen[N.h](), t: now };
    } else {
      // בלי מתכון: התיבה החיה, אותה תיבה שהעורך משחזר
      const members = I.groupMembers(id);
      const box = I.groupBox(members);
      const like = I.strategyNode(members);
      if (!box || !like) return null;
      const px = I.toPixels(Elements ? Elements.visibleBox(id, box) : box, like, screen);
      p = { x: px.x + px.w / 2, y: px.y + px.h / 2, t: now };
    }
    pivotCache.set(id, p);
    return p;
  };

  I.applySettings = function (settings) {
    if (settings && typeof settings === "object" && settings.layouts) I.settings = settings;
    counts = {};
    for (const l of Object.keys(I.settings.layouts || {})) {
      const per = I.settings.layouts[l];
      counts[l] = Object.keys((per && per.elements) || {}).length;
    }
    pivotCache.clear();
  };

  I.applyPivots = function (pivots) {
    I.pivots = (pivots && typeof pivots === "object") ? pivots : {};
    pivotCache.clear();
  };

  // שקיפות לרכיב שלא עובר ב-o3k (הצ'אט)
  I.opacityOf = function (id) {
    if (!counts[I.layout() || "default"]) return 1;
    const ov = I.overrideFor(id);
    return ov ? ov.opacity : 1;
  };

  NS.overrides = () => I.settings;
  NS.pivots = () => I.pivots;
})();
