// features/hud/discovery/detect.js  [ISOLATED world]

// הגילוי על הבאנדל החי (דרך shared/bundle.js): השמות ל-MAIN ראשונים, הגיאומטריה אחריהם.
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  // **להעלות בכל שינוי בפלט של discover()**, עם V ב-compose.js
  const CACHE_VERSION = 15;
  // ושל navigation() בנפרד
  const NAV_VERSION = 1;

  const listeners = [];
  let recipes = null;
  let first = null;   // {names, game}: מה שהגיאומטריה בונה עליו
  let nav = null;

  // נתיב יחסי -> מלא: מה שלפני static/, כמו publicPath
  function absolute(found, bundleUrl) {
    const cut = bundleUrl.indexOf("/static/");
    if (cut < 0 || !found || !found.assets) return found;
    const root = bundleUrl.slice(0, cut + 1);
    const out = {};
    for (const name of Object.keys(found.assets)) out[name] = root + found.assets[name];
    found.assets = out;
    return found;
  }

  const post = (action, payload) => window.postMessage({ __hud: true, dir: "i2m", action, payload }, "*");

  // מה ש-MAIN צריך; נשלח שוב כשהוא מכריז ready
  function sendGame() {
    if (first && first.game) post("hudGame", first.game);
  }
  function sendNav() {
    if (nav) post("hudNav", nav);
  }
  window.addEventListener("message", (e) => {
    const m = e.source === window && e.data;
    if (!m || !m.__hud || m.dir !== "m2i" || m.action !== "ready") return;
    sendGame();
    sendNav();
  });

  // BattleSettings נבנה כבר בעליית המשחק: ראשון בתור
  window.TankiQoL.Bundle.register({
    name: "hudGame",
    version: CACHE_VERSION,
    priority: 0,
    discover: (src) => window.TankiQoL.HudDiscover.discoverGame(src),
    publish(found) {
      first = found;
      sendGame();
    },
  });

  // הגיאומטריה נדרשת רק לעורך: אחרונה
  window.TankiQoL.Bundle.register({
    name: "hudRecipes",
    version: CACHE_VERSION,
    priority: 4,
    discover: (src, url) => absolute(window.TankiQoL.HudDiscover.discover(src, first), url),
    publish(found) {
      recipes = found;
      for (const fn of listeners) {
        try {
          fn(found);
        } catch (e) { /* מאזין אחד לא מפיל את השאר */ }
      }
    },
  });

  // הניווט להגדרות נדרש רק בלחיצה: אחרון בתור
  window.TankiQoL.Bundle.register({
    name: "hudNavigation",
    version: NAV_VERSION,
    priority: 5,
    discover: (src) => window.TankiQoL.HudParse.navigation(src),
    publish(found) {
      nav = found;
      sendNav();
    },
  });

  window.TankiQoL.HudRecipes = {
    get() {
      return recipes;
    },

    // המתכונים של פריסה אחת; {} כשהגילוי עוד לא חזר
    forLayout(layout) {
      return (recipes && recipes.layouts && recipes.layouts[layout]) || {};
    },

    // כתובת מלאה של נכס מהמשחק, או null
    asset(name) {
      return (recipes && recipes.assets && recipes.assets[name]) || null;
    },

    onReady(fn) {
      listeners.push(fn);
      if (recipes) fn(recipes);
    },
  };
})();
