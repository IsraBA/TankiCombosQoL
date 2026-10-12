// features/hud/model/rects.js  [ISOLATED world]

// המלבן של כל רכיב במסך הנוכחי, לעורך ול-MAIN. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const Q = window.TankiQoL;

  // גופן השורש חלקי 16, כפול עקומת הסליידר
  function uiScale(uiSize) {
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return (font / 16) * Q.HudReplay.ksi(uiSize == null ? 50 : uiSize);
  }

  // מה שהגילוי מכסה מחושב מקוד המשחק; השאר משוחזר מהמדידה
  function forLayout(layout) {
    const s = (Q.HudBridge && Q.HudBridge.getState()) || {};
    const rec = Q.HudStore ? Q.HudStore.measured(layout) : null;

    let out = {};
    if (rec) {
      const ratio = rec.inner && rec.inner.w ? rec.screen.w / rec.inner.w : 1;
      out = Q.HudReplay.fit(rec, {
        screen: { w: window.innerWidth * ratio, h: window.innerHeight * ratio },
        uiSize: s.uiSize != null ? s.uiSize : rec.uiSize,
        rootFontPx: parseFloat(getComputedStyle(document.documentElement).fontSize) || rec.rootFontPx,
      });
    }

    const view = {
      w: window.innerWidth,
      h: window.innerHeight,
      scale: s.scale != null ? s.scale : uiScale(s.uiSize),
    };
    const recipes = Q.HudRecipes ? Q.HudRecipes.forLayout(layout) : {};
    for (const id of Object.keys(recipes)) {
      const r = Q.HudLayout.place(recipes[id], view);
      if (r) out[id] = r;
    }
    withDom(out);
    for (const id of Object.keys(out)) out[id] = Q.HudElements.visibleBox(id, out[id]);
    return out;
  }

  // רכיבי ה-HTML מהעותק הנסתר; חלק של רכיב קנבס לא
  function withDom(out) {
    if (!Q.HudDom || !Q.HudDomCatalog) return;
    const dom = Q.HudDom.rects();
    for (const e of Q.HudDomCatalog.ELEMENTS) {
      if (!e.joins && dom[e.id]) out[e.id] = dom[e.id];
    }
  }

  // מרכז הסיבוב של מלבן, בשברי מסך
  function pivotOf(r) {
    const fx = r.px == null ? 0.5 : r.px, fy = r.py == null ? 0.5 : r.py;
    return { x: r.x + r.w * fx, y: r.y + r.h * fy };
  }

  // מרכזי הסיבוב אל MAIN, רק לרכיבים עם מתכון
  function pivots() {
    const out = {};
    for (const layout of Q.HudElements.LAYOUTS) {
      const recipes = Q.HudRecipes ? Q.HudRecipes.forLayout(layout) : {};
      const rects = forLayout(layout);
      const per = {};
      for (const id of Object.keys(rects)) {
        if (recipes[id]) per[id] = pivotOf(rects[id]);
      }
      out[layout] = per;
    }
    return out;
  }

  Q.HudRects = { uiScale, forLayout, pivots, pivotOf };
})();
