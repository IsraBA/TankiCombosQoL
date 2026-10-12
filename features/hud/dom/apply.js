// features/hud/dom/apply.js  [ISOLATED world]

// ההעדפות על רכיבי ה-HTML בקרב, דרך translate/scale/opacity. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  const Q = window.TankiQoL;
  const PROPS = ["translate", "scale", "transform-origin", "opacity"];

  let styled = new Set();   // הצמתים שנגענו בהם, כדי לנקות כשההעדפה נמחקת
  let raf = 0, watched = null, observer = null;

  const layout = () => {
    const s = Q.HudBridge ? Q.HudBridge.getState() : null;
    return (s && s.layout) || "default";
  };

  // בלי העיגול יוצא 320.00000000000006px
  const px = (v) => +v.toFixed(3) + "px";

  function clear(node) {
    for (const p of PROPS) node.style.removeProperty(p);
  }

  // המשחק מחליף צמתים; מחילים מחדש
  function watch(hud) {
    if (hud === watched) return;
    if (observer) observer.disconnect();
    watched = hud;
    if (!hud) return;
    observer = new MutationObserver(schedule);
    observer.observe(hud, { childList: true, subtree: true });
  }

  // override מנורמל לרכיב בפריסה, או null
  function overrideOf(id, l) {
    const E = Q.HudElements;
    const raw = (Q.HudStore.elements(l) || {})[id];
    if (!raw) return null;
    const ov = E.normalize(raw);
    if (E.isDefault(ov)) return null;
    if (!E.isMovable(id, l)) { ov.dx = 0; ov.dy = 0; }
    return ov;
  }

  function apply() {
    raf = 0;
    const C = Q.HudDomCatalog, D = Q.HudDom;
    const hud = C.live();
    watch(hud);
    const next = new Set();
    if (hud && Q.HudStore.isLoaded()) {
      const l = layout();
      const W = window.innerWidth, H = window.innerHeight;
      for (const e of C.ELEMENTS) {
        const id = e.joins || e.id;
        const ov = overrideOf(id, l);
        if (!ov) continue;
        const nodes = e.find(hud, C.liveClass);
        if (!nodes.length) continue;
        const boxes = nodes.map(D.layoutBox);
        // חלק של רכיב קנבס: סביב המרכז של הרכיב כולו
        let pivot;
        if (e.joins) {
          const r = Q.HudRects.forLayout(l)[e.joins];
          if (!r) continue;
          const p = Q.HudRects.pivotOf(r);
          pivot = { x: p.x * W, y: p.y * H };
        } else {
          const u = D.union(boxes);
          pivot = { x: u.x + u.w / 2, y: u.y + u.h / 2 };
        }
        nodes.forEach((n, i) => {
          n.style.setProperty("transform-origin", px(pivot.x - boxes[i].x) + " " + px(pivot.y - boxes[i].y));
          n.style.setProperty("translate", px(ov.dx * W) + " " + px(ov.dy * H));
          n.style.setProperty("scale", String(ov.scale));
          n.style.setProperty("opacity", String(ov.opacity));
          next.add(n);
        });
      }
    }
    for (const n of styled) if (!next.has(n)) clear(n);
    styled = next;
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(apply);
  }

  (function start() {
    if (!Q.HudStore || !Q.HudBridge || !Q.HudDomCatalog || !Q.HudDom || !Q.HudRects) return setTimeout(start, 200);
    Q.HudStore.subscribe(schedule);
    Q.HudBridge.onState(schedule);
    if (Q.HudRecipes) Q.HudRecipes.onReady(schedule);
    window.addEventListener("resize", schedule);
    // ה-HUD נבנה בכניסה לקרב ונעלם ביציאה; בדיקה זולה מספיקה
    setInterval(() => { if (Q.HudDomCatalog.live() !== watched) schedule(); }, 1000);
    schedule();
  })();
})();
