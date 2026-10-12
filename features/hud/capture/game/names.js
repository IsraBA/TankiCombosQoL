// features/hud/capture/game/names.js  [MAIN world]

// שמות הבילד האחרון הידוע (8f7f4827), נדרסים ע"י discovery/. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  const NS = (window.__HUD = window.__HUD || {});
  const I = (NS.internals = NS.internals || {});

  NS.debug = NS.debug || {
    captures: 0,
    adds: 0,
    removes: 0,
    settingsCaptures: 0,
    serviceCaptures: 0,
    layoutCalls: 0,
    renderCalls: 0,
    measures: 0,
    names: "seed",             // "bundle" אחרי שהגילוי הגיע
    lastError: null,
  };

  // שדות ומתודות של המנוע; מתחלפים בכל בילד
  I.N = {
    rootTrap: "o11h_1",        // השדה האחרון שבנאי שורש ה-HUD כותב
    rootAdd: "z116",           // hud.z116(node) — הוספת רכיב עליון
    rootRemove: "a117",
    rootContainer: "n11h_1",
    statusAdd: "b1ge",         // מצב הקרב מוסיף את חלקיו דרכה
    parent: "o35_1",
    traverse: "k3l",           // node.k3l(fn) — כל תת-העץ, כולל הצומת
    visible: "k3k",
    alpha: "o3k",
    x: "c4d", y: "d4d", w: "h29", h: "g29",
    setX: "q4o", setY: "r4o", setW: "u29", setH: "v29",
    strategy: "m4m_1",         // אסטרטגיית הסקיילינג של הצומת
    anchorX: "k4m_1", anchorY: "l4m_1",
    strategyApply: "h4r",      // strategy.h4r(screen, node, out)
    scaleFactor: "h1es_1",     // הפקטור הגלובלי שבתוך האסטרטגיה
    toPixels: "s4o",           // node.s4o(screen, out) — נקודת הציור
    layout: "o4o",             // node.o4o(view, screen) — הפריסה

    settingsTrap: "wsi_1",     // BattleSettings: השדה האחרון (autoSupply)
    serviceTrap: "tz5_1",      // battleHudService: השדה האחרון
    serviceScale: "sz5_1",     // הפקטור הנוכחי של BATTLE_UI_SCALE
    serviceMethods: ["uz5", "vz5", "q119"],
  };

  // offset של הפריים שהוסיף את הצומת -> תפקיד
  I.SEED_OFFSETS = {
    // מצב הקרב: אתר לכל מצב משחק, וכולם נחוצים
    9097953: "status",
    9100587: "status",
    9103002: "status",
    9105508: "status",
    9107948: "status",
    9070209: "chat",
    7978361: "killLog",
    8001082: "radar",
    8038703: "overdrive",
    8034822: "nukeRing",       // טבעת הנוקליאר; הצד קובע לאיזו קבוצה
    8362873: "activeSupplies", // -> effects
    9154409: "hpBar",          // -> bars
    8365955: "energyBar",      // -> bars
    7232434: "supplyRow",      // nut; מתפצל לפי צד בפריסה הרגילה
  };

  // תפקיד -> מזהה רכיב (מה שלא כאן מתפצל לפי מיקום)
  I.ROLE_TO_ID = {
    status: "status",
    chat: "chat",
    killLog: "killLog",
    radar: "radar",
    overdrive: "overdrive",
    activeSupplies: "effects",
    hpBar: "bars",
    energyBar: "bars",
  };

  I.offsets = Object.assign({}, I.SEED_OFFSETS);

  // שם תקין: מחרוזת, או רשימת מחרוזות כמו ב-seed
  const sameShape = (seed, v) => (Array.isArray(seed)
    ? Array.isArray(v) && v.length === seed.length && v.every((x) => typeof x === "string")
    : typeof v === "string" && v.length > 0);

  // {names, offsets} מהגילוי; שמות חלקיים לא נוגעים ב-N
  I.applyGame = function (game) {
    if (!game || typeof game !== "object") return;
    const names = game.names;
    if (names && Object.keys(I.N).every((k) => sameShape(I.N[k], names[k]))) {
      for (const k of Object.keys(I.N)) I.N[k] = names[k];
      NS.debug.names = "bundle";
    }
    if (game.offsets && typeof game.offsets === "object") I.offsets = Object.assign({}, game.offsets);
    I.emit("game");
  };
})();
