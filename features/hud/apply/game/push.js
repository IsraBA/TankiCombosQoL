// features/hud/apply/game/push.js  [MAIN world]

// רכיב שנדחף על ידי רכיב אחר: המצבים הפעילים סביב הפסים שעל הטנק
(function () {
  "use strict";

  const NS = (window.__HUD = window.__HUD || {});
  const I = (NS.internals = NS.internals || {});
  const N = I.N;

  // קצוות התיבה החיה של הדוחף, יחסית לנקודת הטנק
  let edges = { t: -Infinity, on: null, e: null };
  function pusherEdges(on, screen, P) {
    const now = performance.now();
    if (edges.on === on && now - edges.t < 4) return edges.e;
    const members = I.groupMembers(on);
    const box = I.groupBox(members), like = I.strategyNode(members);
    let e = null;
    if (box && like) {
      const px = I.toPixels(box, like, screen);
      e = { top: px.y - P.y, bottom: px.y + px.h - P.y };
    }
    edges = { t: now, on, e };
    return e;
  }

  // אותה נוסחה כמו HudPush.stacked בעורך. הרציונל: CLAUDE.mds/hud.md
  I.pushed = function (out, ov, on, screen) {
    const P = I.tankPoint();
    const e = P && pusherEdges(on, screen, P);
    if (!e) return;
    const host = I.overrideFor(on);
    const k = ov.scale, kb = host ? host.scale : 1;
    const x = out[N.x](), y = out[N.y](), w = out[N.w](), h = out[N.h]();
    // מעל נקודת הטנק: הקצה העליון; מתחתיה: התחתון
    const edge = y + h / 2 < P.y ? e.top : e.bottom;
    out[N.setX](P.x + k * (x - P.x));
    out[N.setY](P.y + kb * edge + k * (y - (P.y + edge)));
    out[N.setW](w * k);
    out[N.setH](h * k);
  };
})();
