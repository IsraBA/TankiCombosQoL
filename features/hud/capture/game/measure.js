// features/hud/capture/game/measure.js  [MAIN world]

// מודד את המלבן שהמשחק נותן לכל רכיב, לוגי ובפיקסלים. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  const NS = (window.__HUD = window.__HUD || {});
  const I = (NS.internals = NS.internals || {});
  const N = I.N;

  I.screen = null;        // מלבן המסך שהמנוע מעביר לציור
  I.RectCtor = null;      // בנאי המלבן (HudRectInfo), נלמד מהציור הראשון

  // תיבה לוגית של כל הצאצאים הגלויים של קבוצת צמתים
  I.groupBox = function (members) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const m of members) {
      m[N.traverse]((c) => {
        if (typeof c[N.x] !== "function") return;
        if (c !== m && !c[N.visible]()) return;
        const x = c[N.x](), y = c[N.y](), w = c[N.w](), h = c[N.h]();
        if (!isFinite(x) || !isFinite(y)) return;
        // קונטיינר בלי גודל: 1x1 בראשית, לא מצויר
        if (w <= 1 || h <= 1) return;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h);
      });
    }
    if (!isFinite(x0)) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };

  // הצומת הראשון בקבוצה שמחזיק אסטרטגיה; דרכו עוברים לפיקסלים
  I.strategyNode = function (members) {
    for (const m of members) {
      if (m[N.strategy]) return m;
      let found = null;
      m[N.traverse]((c) => { if (!found && c[N.strategy]) found = c; });
      if (found) return found;
    }
    return null;
  };

  // אובייקט דמה עם ממשק צומת, כדי להעביר תיבה דרך האסטרטגיה
  I.fakeNode = function (box, like) {
    return {
      [N.x]: () => box.x, [N.y]: () => box.y, [N.w]: () => box.w, [N.h]: () => box.h,
      [N.anchorX]: like[N.anchorX] || 0, [N.anchorY]: like[N.anchorY] || 0,
    };
  };

  I.toPixels = function (box, like, screen) {
    const out = new I.RectCtor(0, 0, 1, 1);
    like[N.strategy][N.strategyApply](screen, I.fakeNode(box, like), out);
    return { x: out[N.x](), y: out[N.y](), w: out[N.w](), h: out[N.h]() };
  };

  // סוג האסטרטגיה, לפי התנהגות: identity / linear / letterbox
  function strategyKind(like, screen) {
    const s = like[N.strategy][N.scaleFactor];
    if (typeof s !== "number") return "identity";
    const W = screen[N.w](), H = screen[N.h]();
    const probe = { x: 100, y: 100, w: 50, h: 50 };
    const px = I.toPixels(probe, like, screen);
    if (Math.abs(px.w - 50) < 0.01 && Math.abs(px.x - 100) < 0.01) return "identity";
    const ax = like[N.anchorX] || 0, ay = like[N.anchorY] || 0;
    const lin = { x: (1 - s) * W * ax + s * 100, y: (1 - s) * H * ay + s * 100 };
    if (Math.abs(px.x - lin.x) < 0.5 && Math.abs(px.y - lin.y) < 0.5) return "linear";
    return "letterbox";
  }

  I.measureGroups = function () {
    const screen = I.screen;
    if (!screen || !I.RectCtor) return null;
    const layout = I.layout() || "default";
    const rec = {
      layout,
      screen: { w: screen[N.w](), h: screen[N.h]() },
      scale: I.uiScale(),
      uiSize: I.uiSize(),
      rootFontPx: parseFloat(getComputedStyle(document.documentElement).fontSize) || null,
      dpr: window.devicePixelRatio || 1,
      inner: { w: window.innerWidth, h: window.innerHeight },
      groups: {},
    };
    for (const id of Object.keys(I.groups)) {
      const members = I.groupMembers(id);
      const box = I.groupBox(members);
      const like = I.strategyNode(members);
      if (!box || !like) continue;
      const px = I.toPixels(box, like, screen);
      rec.groups[id] = {
        l: [box.x, box.y, box.w, box.h],
        a: [like[N.anchorX] || 0, like[N.anchorY] || 0],
        k: strategyKind(like, screen),
        px: [px.x, px.y, px.w, px.h],
      };
    }
    NS.debug.measures++;
    return rec;
  };

  // מדידה מושהית: אחרי לכידה, ואחרי כל פריסה מחדש
  let timer = null;
  I.scheduleMeasure = function (delay) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        if (!I.inBattle()) return;
        I.refreshGroups();
        const rec = I.measureGroups();
        if (rec && Object.keys(rec.groups).length) I.emit("measure", rec);
      } catch (e) {
        NS.debug.lastError = String(e);
      }
    }, delay == null ? 1500 : delay);
  };

  I.on("root", () => I.scheduleMeasure(2500));
  I.on("nodeAdded", () => I.scheduleMeasure(2500));

  NS.measure = function () {
    I.refreshGroups();
    return I.measureGroups();
  };

  // עוזר לרענון ה-seed: מדידה הנוכחית כשורה מוכנה להדבקה ב-model/seed.js
  NS.seed = function () {
    const rec = NS.measure();
    if (!rec) return "no HUD on screen — run this inside a battle";
    return rec.layout + ": " + JSON.stringify(rec) + ",";
  };
})();
