// features/hud/capture/game/names.js  [MAIN world]

// שמות המנוע ומיפוי הרכיבים — רק ממה ש-discovery/ שולח. הרציונל: CLAUDE.mds/hud.md
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
    names: null,               // "bundle" אחרי שהגילוי הגיע
    lastError: null,
  };

  // שדות ומתודות של המנוע, בלי ערך מראש: רק הגילוי ממלא אותם
  I.N = {
    rootTrap: null,          // השדה האחרון שבנאי שורש ה-HUD כותב
    rootAdd: null,           // hud.<rootAdd>(node) — הוספת רכיב עליון
    rootRemove: null,
    rootContainer: null,
    statusAdd: null,         // מצב הקרב מוסיף את חלקיו דרכה
    parent: null,
    traverse: null,          // node.<traverse>(fn) — כל תת-העץ, כולל הצומת
    visible: null,
    alpha: null,
    x: null, y: null, w: null, h: null,
    setX: null, setY: null, setW: null, setH: null,
    strategy: null,          // אסטרטגיית הסקיילינג של הצומת
    anchorX: null, anchorY: null,
    strategyApply: null,     // strategy.<strategyApply>(screen, node, out)
    scaleFactor: null,       // הפקטור הגלובלי שבתוך האסטרטגיה
    toPixels: null,          // node.<toPixels>(screen, out) — נקודת הציור
    layout: null,            // node.<layout>(view, screen) — הפריסה

    settingsTrap: null,      // BattleSettings: השדה האחרון (autoSupply)
    serviceTrap: null,       // battleHudService: השדה האחרון
    serviceScale: null,      // הפקטור הנוכחי של BATTLE_UI_SCALE
    serviceMethods: null,    // [set, get, strategyOf]
  };
  // השמות שהם רשימה, ואורכה
  const LISTS = { serviceMethods: 3 };

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

  // offset של הפריים שהוסיף את הצומת -> תפקיד
  I.offsets = {};

  // שם תקין: מחרוזת, או רשימת מחרוזות באורך הנכון
  const valid = (k, v) => (LISTS[k]
    ? Array.isArray(v) && v.length === LISTS[k] && v.every((x) => typeof x === "string" && x)
    : typeof v === "string" && v.length > 0);

  // {names, offsets} מהגילוי; שמות חלקיים לא נוגעים ב-N
  I.applyGame = function (game) {
    if (!game || typeof game !== "object") return;
    const names = game.names;
    if (names && Object.keys(I.N).every((k) => valid(k, names[k]))) {
      for (const k of Object.keys(I.N)) I.N[k] = names[k];
      NS.debug.names = "bundle";
    }
    if (game.offsets && typeof game.offsets === "object") I.offsets = Object.assign({}, game.offsets);
    I.emit("game");
  };
})();
