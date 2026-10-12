// features/hud/model/overlap.js  [ISOLATED world]

// כלל החפיפה של העורך: מותר מה שהמשחק עצמו מתחיל בו. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const Q = window.TankiQoL;

  // {id: rect} -> החפיפה שהמשחק עצמו כבר נותן
  function allowance(base) {
    const map = new Map();
    const ids = Object.keys(base);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const area = Q.HudGeometry.overlapArea(base[ids[i]], base[ids[j]]);
        if (area > 0) map.set(ids[i] + "|" + ids[j], area);
      }
    }
    return (a, b) => map.get(a + "|" + b) || map.get(b + "|" + a) || 0;
  }

  // r דורס רכיב מעבר למותר? skip: לא נבדקים
  function refused(id, r, others, allowed, skip) {
    for (const other of Object.keys(others)) {
      if (other === id || skip.includes(other)) continue;
      if (Q.HudGeometry.overlapArea(r, others[other]) > allowed(id, other) + 1e-9) return true;
    }
    return false;
  }

  Q.HudOverlap = { allowance, refused };
})();
