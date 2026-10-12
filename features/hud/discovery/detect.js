// features/hud/discovery/detect.js  [ISOLATED world]

// מריץ את הגילוי על הבאנדל החי ושומר במטמון לפי כתובתו, כמו שאר הגילויים.
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const BUNDLE_URL_RE = /\/main\.[A-Za-z0-9]+\.js(?:[?#]|$)/;

  // **להעלות בכל שינוי בפלט של discover()**, עם V ב-compose.js
  const CACHE_VERSION = 12;
  const CACHE_PREFIX = "hudRecipes:v" + CACHE_VERSION + ":";

  const listeners = [];
  let recipes = null;

  function findBundleUrl() {
    for (const s of document.scripts) {
      if (s.src && BUNDLE_URL_RE.test(s.src)) return s.src;
    }
    return null;
  }

  function waitForBundleUrl(timeoutMs) {
    return new Promise((resolve, reject) => {
      const initial = findBundleUrl();
      if (initial) return resolve(initial);
      const observer = new MutationObserver(() => {
        const url = findBundleUrl();
        if (url) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(url);
        }
      });
      observer.observe(document.documentElement || document, { childList: true, subtree: true });
      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error("bundle URL not found"));
      }, timeoutMs);
    });
  }

  function cleanupStaleCaches() {
    try {
      chrome.storage.local.get(null, (all) => {
        const stale = Object.keys(all).filter(
          (k) => k.startsWith("hudRecipes:") && !k.startsWith(CACHE_PREFIX)
        );
        if (stale.length) chrome.storage.local.remove(stale);
      });
    } catch (e) { /* ניקוי הוא best-effort */ }
  }

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

  // השמות ומיפוי הרכיבים ל-MAIN; נשלחים שוב כשהוא מכריז ready
  function sendGame() {
    if (recipes && recipes.game) {
      window.postMessage({ __hud: true, dir: "i2m", action: "hudGame", payload: recipes.game }, "*");
    }
  }
  window.addEventListener("message", (e) => {
    const m = e.source === window && e.data;
    if (m && m.__hud && m.dir === "m2i" && m.action === "ready") sendGame();
  });

  function publish(found) {
    recipes = found;
    sendGame();
    for (const fn of listeners) {
      try {
        fn(found);
      } catch (e) { /* מאזין אחד לא מפיל את השאר */ }
    }
  }

  (async function run() {
    cleanupStaleCaches();

    let url;
    try {
      url = await waitForBundleUrl(30000);
    } catch (e) {
      return;
    }
    const key = CACHE_PREFIX + url;

    const cached = await new Promise((resolve) => {
      try {
        chrome.storage.local.get([key], (got) => resolve(got[key] || null));
      } catch (e) {
        resolve(null);
      }
    });
    if (cached) return publish(cached);

    try {
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const found = absolute(window.TankiQoL.HudDiscover.discover(await res.text()), url);
      if (!found) return;
      try {
        chrome.storage.local.set({ [key]: found });
      } catch (e) { /* נשאר בזיכרון לסשן הזה */ }
      publish(found);
    } catch (e) {
      console.error("[hud] detect: fetch/parse failed:", e);
    }
  })();

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
