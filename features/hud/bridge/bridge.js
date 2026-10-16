// features/hud/bridge/bridge.js  [ISOLATED world]

// גשר ה-HUD: הגדרות אל MAIN, מצב ומדידות ממנו. כל הודעה מתויגת __hud.
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const stateListeners = [];
  const measureListeners = [];
  const pending = new Map();
  let nextId = 1;
  let lastSettings = null, lastRecipes = null;
  let state = { layout: null, showButtonLabels: null, uiSize: null, scale: null, inBattle: false, rootFontPx: null, dpr: 1 };

  function send(action, payload) {
    window.postMessage({ __hud: true, dir: "i2m", action, payload: payload || {} }, "*");
  }

  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const m = e.data;
    if (!m || !m.__hud || m.dir !== "m2i") return;

    // MAIN עלה אחרינו: שולחים שוב את מה שיש
    if (m.action === "ready") {
      if (lastRecipes) send("hudPivots", lastRecipes);
      if (lastSettings) send("hudSettings", lastSettings);
      send("hudStateRequest");
      return;
    }
    if (m.action === "hudState") {
      state = Object.assign({}, state, m.payload || {});
      for (const fn of stateListeners) fn(state);
      return;
    }
    if (m.action === "hudMeasure") {
      for (const fn of measureListeners) fn(m.payload);
      return;
    }
    if (m.action === "hudMeasureResult" || m.action === "hudControlsResult") {
      const p = m.payload || {};
      const entry = pending.get(p.id);
      if (!entry) return;
      pending.delete(p.id);
      clearTimeout(entry.timer);
      entry.resolve(p);
    }
  });

  // בקשה ל-MAIN שתשובתה חוזרת עם אותו id
  function request(action, timeoutMs) {
    return new Promise((resolve) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        resolve({ ok: false, error: "timeout" });
      }, timeoutMs);
      pending.set(id, { resolve, timer });
      send(action, { id });
    });
  }

  window.TankiQoL.HudBridge = {
    // {layouts} — נשלח בכל שינוי, ונשלח שוב ב-ready
    sendSettings(settings) {
      lastSettings = settings;
      send("hudSettings", settings);
    },

    // מרכזי הסיבוב, זהים לעורך. הרציונל: CLAUDE.mds/hud.md
    sendPivots(pivots) {
      lastRecipes = { pivots };
      send("hudPivots", lastRecipes);
    },

    getState() {
      return state;
    },

    onState(fn) {
      stateListeners.push(fn);
      fn(state);
      return () => {
        const i = stateListeners.indexOf(fn);
        if (i >= 0) stateListeners.splice(i, 1);
      };
    },

    onMeasure(fn) {
      measureListeners.push(fn);
    },

    // מדידה מיידית, לעורך שנפתח בזמן קרב
    measureNow() {
      return request("hudMeasureRequest", 3000);
    },

    // Settings > Controls בדרך של המשחק; עד 10 שניות לגילוי
    openControls() {
      return request("hudControlsRequest", 11000);
    },
  };

  send("hudStateRequest");
})();
