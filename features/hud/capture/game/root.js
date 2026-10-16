// features/hud/capture/game/root.js  [MAIN world]

// לוכד את שורש ה-HUD ורושם לכל רכיב עליון את ה-offset של מי שהוסיף אותו.
(function () {
  "use strict";

  const NS = (window.__HUD = window.__HUD || {});
  const I = (NS.internals = NS.internals || {});
  const N = I.N;

  I.root = null;
  I.container = null;
  I.topNodes = [];                 // [{node, offset, role}]
  I.rootGen = 0;                   // עולה בכל שינוי ברשימת הרכיבים

  function looksLikeRoot(o) {
    if (!o || typeof o !== "object") return false;
    const c = o[N.rootContainer];
    return typeof o[N.rootAdd] === "function" && typeof o[N.rootRemove] === "function" &&
      !!c && typeof c[N.traverse] === "function";
  }

  // הבאנדל הוא שורה אחת, ולכן העמודה בפריים היא offset בקובץ
  function callerOffset() {
    const lines = String(new Error().stack || "").split("\n").slice(1);
    const frames = [];
    for (const line of lines) {
      const m = /^\s*at\s+(?:new\s+)?(?:([^\s(]+)\s+\()?[^)]*?:1:(\d+)\)?\s*$/.exec(line);
      if (!m) continue;
      const name = m[1] || "";
      if (/hudAdd|__HUD/.test(name)) continue;
      frames.push({ name, col: Number(m[2]) });
      if (frames.length >= 8) break;
    }
    // מצב הקרב נוסף דרך שרשרת statusAdd; מדלגים עליה
    const skip = "." + N.statusAdd;
    const first = frames.find((f) => !f.name.endsWith(skip)) || frames[0];
    return first ? first.col : null;
  }

  function track(node, offset) {
    const role = offset != null ? I.offsets[offset] || null : null;
    I.topNodes.push({ node, offset, role });
    I.rootGen++;
    NS.debug.adds++;
  }

  function untrack(node) {
    const i = I.topNodes.findIndex((e) => e.node === node);
    if (i >= 0) I.topNodes.splice(i, 1);
    I.rootGen++;
    NS.debug.removes++;
  }

  function onRoot(o) {
    I.root = o;
    I.container = o[N.rootContainer];
    I.topNodes = [];
    I.rootGen++;
    NS.debug.captures++;

    const add = o[N.rootAdd], remove = o[N.rootRemove];
    o[N.rootAdd] = function hudAdd(node) {
      try {
        track(node, callerOffset());
        I.emit("nodeAdded", node);
      } catch (e) {
        NS.debug.lastError = String(e);
      }
      return add.call(this, node);
    };
    o[N.rootRemove] = function hudRemove(node) {
      try {
        untrack(node);
      } catch (e) {
        NS.debug.lastError = String(e);
      }
      return remove.call(this, node);
    };
    I.emit("root", o);
  }

  // שמות מהגילוי: מלכודת על השדה, ותפקידים מחדש למה שכבר נוסף
  let armedTrap = null;
  I.on("game", () => {
    if (N.rootTrap && armedTrap !== N.rootTrap) {
      // שם קודם (מטמון ישן) שייך בבילד הזה למחלקה זרה
      if (armedTrap) I.disarmTrap(armedTrap, looksLikeRoot);
      armedTrap = N.rootTrap;
      I.armTrap(N.rootTrap, looksLikeRoot, onRoot);
    }
    for (const e of I.topNodes) e.role = e.offset != null ? I.offsets[e.offset] || null : null;
    I.rootGen++;
  });

  // הקונטיינר נשאר חי אחרי הקרב; הרכיבים מוסרים ממנו
  I.inBattle = function () {
    return !!I.container && I.topNodes.length > 0;
  };

  NS.nodes = function () {
    return I.topNodes.map((e, i) => ({
      i, ctor: e.node.constructor && e.node.constructor.name, offset: e.offset, role: e.role,
    }));
  };
})();
