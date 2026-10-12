// features/hud/capture/game/settings.js  [MAIN world]

// לוכד את BattleSettings (הפריסה, קנה המידה) ואת שירות ה-HUD (הפקטור החי).
(function () {
  "use strict";

  const NS = (window.__HUD = window.__HUD || {});
  const I = (NS.internals = NS.internals || {});
  const N = I.N;

  I.battleSettings = null;
  I.settingsFields = null;   // שם סמנטי -> שדה minified, מה-toString
  I.hudService = null;

  const SETTINGS_MARKER = '"BattleSettings(';

  // "BattleSettings(isCenteredLayout="+this.ssi_1+", ..." -> {isCenteredLayout: "ssi_1"}
  function fieldMap(o) {
    const src = String(Object.getPrototypeOf(o).toString);
    const map = {};
    const re = /(\w+)=(?:"\+|"\s*\+\s*)this\.(\w+)/g;
    let m;
    while ((m = re.exec(src))) map[m[1]] = m[2];
    return map;
  }

  function looksLikeSettings(o) {
    if (!o || typeof o !== "object") return false;
    try {
      return String(Object.getPrototypeOf(o).toString).indexOf(SETTINGS_MARKER) !== -1;
    } catch (e) {
      return false;
    }
  }

  function looksLikeService(o) {
    if (!o || typeof o !== "object") return false;
    const proto = Object.getPrototypeOf(o);
    if (!proto) return false;
    return N.serviceMethods.every((m) => typeof proto[m] === "function");
  }

  function onSettings(o) {
    I.battleSettings = o;
    if (!I.settingsFields) I.settingsFields = fieldMap(o);
    NS.debug.settingsCaptures++;
    I.emit("settings", o);
  }

  function onService(o) {
    I.hudService = o;
    NS.debug.serviceCaptures++;
    I.emit("service", o);
  }

  // כל שם נחמש פעם אחת; שם חדש מהגילוי נחמש בנוסף
  const armed = new Set();
  function arm() {
    for (const [prop, check, fn] of [[N.settingsTrap, looksLikeSettings, onSettings], [N.serviceTrap, looksLikeService, onService]]) {
      if (armed.has(prop)) continue;
      armed.add(prop);
      I.armTrap(prop, check, fn);
    }
  }
  arm();
  I.on("game", arm);

  // 'centered' | 'default' | null כשעוד לא נלכד
  I.layout = function () {
    const s = I.battleSettings, f = I.settingsFields;
    if (!s || !f || !f.isCenteredLayout) return null;
    return s[f.isCenteredLayout] ? "centered" : "default";
  };

  // 0..100, הסליידר של BATTLE_UI_SCALE
  I.uiSize = function () {
    const s = I.battleSettings, f = I.settingsFields;
    if (!s || !f || !f.battleUISize) return null;
    const v = s[f.battleUISize];
    return typeof v === "number" ? v : null;
  };

  // הפקטור שהשירות מחזיק; null לפני קרב
  I.uiScale = function () {
    const svc = I.hudService;
    if (!svc) return null;
    const v = svc[N.serviceScale];
    return typeof v === "number" ? v : null;
  };

  // תוויות המקשים ([F11] וכו'); null לפני הלכידה
  I.showButtonLabels = function () {
    const s = I.battleSettings, f = I.settingsFields;
    if (!s || !f || !f.showButtonLabels) return null;
    return !!s[f.showButtonLabels];
  };

  I.state = function () {
    return {
      layout: I.layout(),
      showButtonLabels: I.showButtonLabels(),
      uiSize: I.uiSize(),
      scale: I.uiScale(),
      inBattle: !!I.container,
      rootFontPx: parseFloat(getComputedStyle(document.documentElement).fontSize) || null,
      dpr: window.devicePixelRatio || 1,
    };
  };

  NS.state = I.state;
})();
