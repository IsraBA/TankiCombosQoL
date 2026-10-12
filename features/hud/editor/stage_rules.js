// features/hud/editor/stage_rules.js  [ISOLATED world]

// חוקי הבמה: איפה רכיב יושב תחת override, ומה מותר לו
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const Q = window.TankiQoL;

  Q.HudStageRules = {
    // s(): המצב הנוכחי — {layout, base, recipes, ov, allowed}
    create(s) {
      const Elements = Q.HudElements, G = Q.HudGeometry;
      const partsOf = (id) => (s().recipes[id] && s().recipes[id].parts) || null;

      // מי דוחף את הרכיב, כשיש לו חלקים לדחוף
      function pusher(id) {
        const on = Elements.pusherOf(id, s().layout);
        const parts = partsOf(id);
        return on && s().base[on] && parts && parts.length ? on : null;
      }

      // המלבן (והחלקים) תחת override; hostOv: הדוחף באמצע תצוגה
      function shapeOf(id, cand, hostOv) {
        const base = s().base, on = pusher(id);
        if (!on) return { rect: G.transform(base[id], cand) };
        return Q.HudPush.stacked(base[id], cand, partsOf(id), base[on], hostOv || s().ov(on));
      }

      const dependents = (id) => Object.keys(s().base).filter((d) => pusher(d) === id);

      // קצה המסך דוחף פנימה; רכיב נעול נשאר במקומו
      function fit(id, candidate) {
        if (!Elements.isMovable(id, s().layout)) {
          return Object.assign({}, candidate, { dx: 0, dy: 0 });
        }
        return G.clampOffset(s().base[id], candidate);
      }

      // הדחיפה, לא הבדיקה, מונעת חפיפה בין דוחף לנדחף
      function overlaps(id, candidate) {
        const others = {};
        for (const other of Object.keys(s().base)) others[other] = shapeOf(other, s().ov(other)).rect;
        const skip = dependents(id).concat(pusher(id) || []);
        return Q.HudOverlap.refused(id, shapeOf(id, candidate).rect, others, s().allowed, skip);
      }

      return { shapeOf, dependents, fit, overlaps };
    },
  };
})();
