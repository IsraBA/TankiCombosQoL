// features/hud/news/state.js  [ISOLATED world]

// מתי מפנים אל העורך: עד הכניסה הראשונה, ולא למי שכבר שינה. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const KEY = "hudNews";

  // null = טרם נקרא; בזמן טעינה לא מציגים, כדי שלא יהבהב
  let flags = null;
  // עוזר בדיקה בלבד: מתעלם מעריכה קיימת עד ריענון
  let ignoreLayout = false;

  function sanitize(raw) {
    return { visited: !!(raw && raw.visited), bannerClosed: !!(raw && raw.bannerClosed) };
  }

  function persist() {
    try {
      chrome.storage.local.set({ [KEY]: flags });
    } catch (e) { /* נשאר בזיכרון לסשן הזה */ }
  }

  try {
    chrome.storage.local.get([KEY], (r) => {
      flags = sanitize(r && r[KEY]);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[KEY]) flags = sanitize(changes[KEY].newValue);
    });
  } catch (e) {
    flags = sanitize({ visited: true });
  }

  // משהו כבר לא בברירת מחדל: רשומה שווה לברירת המחדל נמחקת
  function customized() {
    const layouts = window.TankiQoL.HudStore.get().layouts;
    return Object.keys(layouts).some((l) => Object.keys(layouts[l].elements).length > 0);
  }

  window.TankiQoL.HudNews = {
    // הנקודות הצהובות
    pending() {
      const store = window.TankiQoL.HudStore;
      if (!flags || !store || !store.isLoaded() || flags.visited) return false;
      return ignoreLayout || !customized();
    },

    // הבאנר בכרטיסיית הקומבואים נסגר גם בנפרד
    bannerPending() {
      return this.pending() && !flags.bannerClosed;
    },

    markVisited() {
      if (!flags || flags.visited) return;
      flags.visited = true;
      ignoreLayout = false;
      persist();
    },

    closeBanner() {
      if (!flags || flags.bannerClosed) return;
      flags.bannerClosed = true;
      persist();
    },

    // עוזר קונסול; true מציג גם כשה-HUD כבר ערוך
    reset(force) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([KEY], () => {
          flags = sanitize(null);
          ignoreLayout = !!force;
          const note = !ignoreLayout && customized() ? " (hidden: your HUD is edited — pass true to show anyway)" : "";
          resolve("HUD news cleared" + note);
        });
      });
    },

    _internals: { KEY },
  };

  // מאפשר __HUD.resetNews() מהקונסול של הדף
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const m = e.data;
    if (!m || !m.__hud || m.dir !== "m2i" || m.action !== "hudNewsReset") return;
    window.TankiQoL.HudNews.reset((m.payload || {}).force);
  });
})();
