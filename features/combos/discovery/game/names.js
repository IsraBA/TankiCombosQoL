// features/combos/discovery/game/names.js  [MAIN world]

// שמות ממוזערים של הבילד (רק מה שהתגלה), מוני דיבוג ומיפוי קטגוריות.

(function () {
  'use strict';

  const NS = (window.__CMB = window.__CMB || {});
  // מרחב פנימי משותף לכל קבצי game/ (המצב החי, העוזרים והפרוטוטייפים)
  const I = (NS.internals = NS.internals || {});

  // אין שמות מראש: הכול מגיע מ-discovery/detect.js, ועד אז הכול כבוי
  I.D = null;              // מפת השמות הפעילה
  I.latestState = null;    // מופע ה-state האחרון שנתפס

  // רשימת שדות ה-state, מחושבת מראש — ה-setter של ה-trap הוא נתיב חם
  I.stateFieldList = [];

  // מיפוי קטגוריות המשחק לחריצי הקומבו
  I.CATEGORY_TO_SLOT = {
    WEAPON: 'turret',
    ARMOR: 'hull',
    DRONE: 'drone',
    BAZOOKA: 'grenade',
    RESISTANCE_MODULE: 'protection',
    PAINT: 'paint',
    INVENTORY: 'supply',
    SKIN: 'skin',
    SKINS_SHOT: 'shotSkin',
    KIT: 'kit',
  };

  NS.debug = {
    discovered: false,
    proxyCaptured: false,
    mountActionCaptured: false,
    mountActionSource: null,
    selectActionCaptured: false,
    selectsSent: 0,
    storeFound: null,
    resistApplyResolved: false,
    resistUnmountResolved: false,
    resistMountsSent: 0,
    resistUnmountsSent: 0,
    deviceInsertResolved: false,
    deviceRemoveResolved: false,
    devicesInstalled: 0,
    devicesRemoved: 0,
    catalogRequests: 0,
    skinMountResolved: false,
    skinsApplied: 0,
    cooldownBlocks: 0,
    captures: 0,
    reads: 0,
    lastReadMs: 0,
    lastNodes: 0,
    truncated: false,
    lastError: null,
  };

  // החלפת מפת השמות במה שהתגלה לבילד הרץ, והתקנת המלכודות מחדש
  I.applyNames = function (d) {
    I.D = d;
    I.stateFieldList = Object.values(d.stateFields);
    NS.debug.discovered = true;
    I.armAll();
  };

  NS.names = function () { return I.D; };
  NS.state = function () { return I.latestState; };
})();
