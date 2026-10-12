// features/hud/capture/game/groups.js  [MAIN world]

// מקבץ צמתים לרכיבים: לפי תפקיד, ושורת הסופלייס לפי צד. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  const NS = (window.__HUD = window.__HUD || {});
  const I = (NS.internals = NS.internals || {});
  const N = I.N;

  I.groups = {};                   // id -> [nodes]
  let memberGroup = new WeakMap(); // צומת-חבר -> id
  let roleNodes = {};              // תפקיד -> הצומת העליון הראשון שלו
  let builtRoot = -1, builtLayout = -1;
  let layoutGen = 0;

  const rect = (n) => ({ x: n[N.x](), y: n[N.y](), w: n[N.w](), h: n[N.h]() });

  // ילדי הקונטיינר: הצמתים שהאב שלהם הוא הצומת הזה
  function directChildren(node) {
    const out = [];
    node[N.traverse]((c) => {
      if (c !== node && c[N.parent] === node) out.push(c);
    });
    return out;
  }

  // מרכז לוגי של צומת, לפי תיבת הצאצאים הגלויים
  function centerX(node) {
    let x0 = Infinity, x1 = -Infinity;
    node[N.traverse]((c) => {
      if (typeof c[N.x] !== "function") return;
      if (c !== node && !c[N.visible]()) return;
      const r = rect(c);
      if (!isFinite(r.x)) return;
      x0 = Math.min(x0, r.x);
      x1 = Math.max(x1, r.x + r.w);
    });
    return isFinite(x0) ? (x0 + x1) / 2 : rect(node).x;
  }

  function add(groups, map, id, node) {
    (groups[id] = groups[id] || []).push(node);
    map.set(node, id);
  }

  // בפריסה הרגילה: שמאל = רימונים/נוקליאר/אוגמנטים, ימין = סופלייס
  function sideId(node, layout, halfW) {
    if (layout === "centered") return "supplies";
    return centerX(node) < halfW ? "grenades" : "supplies";
  }

  I.refreshGroups = function () {
    // הפיצול לצדדים דורש את רוחב המסך
    const screen = I.screen;
    if (!screen) return;
    const groups = {};
    const map = new WeakMap();
    const layout = I.layout() || "default";
    const halfW = screen[N.w]() / 2;
    const byRole = {};

    for (const e of I.topNodes) {
      if (!e.role) continue;
      if (!byRole[e.role]) byRole[e.role] = e.node;
      const id = I.ROLE_TO_ID[e.role];
      if (id) {
        add(groups, map, id, e.node);
      } else if (e.role === "nukeRing") {
        add(groups, map, sideId(e.node, layout, halfW), e.node);
      } else if (e.role === "supplyRow") {
        for (const child of directChildren(e.node)) {
          add(groups, map, sideId(child, layout, halfW), child);
        }
      }
    }
    I.groups = groups;
    roleNodes = byRole;
    memberGroup = map;
    builtRoot = I.rootGen;
    builtLayout = layoutGen;
    nodeCache = new WeakMap();
    I.emit("groups", groups);
  };

  // פריסה חדשה (שינוי גודל, החלפת פריסה) משנה צדדים
  I.markLayoutChanged = function () {
    layoutGen++;
  };

  function stale() {
    return builtRoot !== I.rootGen || builtLayout !== layoutGen;
  }

  let nodeCache = new WeakMap();

  // הרכיב שצומת בכל עומק שייך אליו; null = לא שלנו
  I.groupOf = function (node) {
    if (stale()) I.refreshGroups();
    const hit = nodeCache.get(node);
    if (hit !== undefined) return hit;
    let id = null;
    let c = node;
    while (c) {
      const g = memberGroup.get(c);
      if (g) { id = g; break; }
      const p = c[N.parent];
      if (!p || p === I.container) break;
      c = p;
    }
    nodeCache.set(node, id);
    return id;
  };

  // נקודת הטנק: העוגן שכל פס מקבל בכל פריים (l12h)
  I.tankPoint = function () {
    if (stale()) I.refreshGroups();
    for (const role of ["hpBar", "energyBar"]) {
      const node = roleNodes[role];
      const like = node && I.strategyNode([node]);
      if (!like) continue;
      const x = like[N.anchorX], y = like[N.anchorY];
      if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    }
    return null;
  };

  I.groupMembers = function (id) {
    if (stale()) I.refreshGroups();
    return I.groups[id] || [];
  };

  NS.groups = function () {
    if (stale()) I.refreshGroups();
    const out = {};
    for (const id of Object.keys(I.groups)) {
      out[id] = I.groups[id].map((n) => n.constructor && n.constructor.name);
    }
    return out;
  };
})();
