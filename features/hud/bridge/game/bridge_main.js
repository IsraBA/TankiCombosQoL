// features/hud/bridge/game/bridge_main.js  [MAIN world]

// צד MAIN של גשר ה-HUD: הגדרות פנימה, מצב ומדידות החוצה. הפרוטוקול: CLAUDE.mds/hud.md
(function () {
  "use strict";

  const NS = (window.__HUD = window.__HUD || {});
  const I = (NS.internals = NS.internals || {});

  function post(action, payload) {
    window.postMessage({ __hud: true, dir: "m2i", action, payload }, "*");
  }

  // עוזר קונסול: הדגל ב-chrome.storage, ולכן רק שולחים ל-ISOLATED
  NS.resetNews = function (force) {
    post("hudNewsReset", { force: !!force });
    return "asked the extension to clear the HUD news" + (force ? " (shown even if your HUD is edited)" : "");
  };

  let lastState = "";
  function pushState() {
    let s;
    try {
      s = I.state();
    } catch (e) {
      return;
    }
    const key = JSON.stringify(s);
    if (key === lastState) return;
    lastState = key;
    post("hudState", s);
  }

  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const m = e.data;
    if (!m || !m.__hud || m.dir !== "i2m") return;

    if (m.action === "hudSettings") {
      try {
        I.applySettings(m.payload);
      } catch (err) {
        NS.debug.lastError = String(err);
      }
      return;
    }

    if (m.action === "hudGame") {
      try {
        I.applyGame(m.payload);
      } catch (err) {
        NS.debug.lastError = String(err);
      }
      return;
    }

    if (m.action === "hudPivots") {
      try {
        I.applyPivots((m.payload || {}).pivots);
      } catch (err) {
        NS.debug.lastError = String(err);
      }
      return;
    }

    if (m.action === "hudNav") {
      try {
        I.applyNav(m.payload);
      } catch (err) {
        NS.debug.lastError = String(err);
      }
      return;
    }

    if (m.action === "hudControlsRequest") {
      const id = (m.payload || {}).id;
      I.openControls((r) => post("hudControlsResult", Object.assign({ id }, r)));
      return;
    }

    if (m.action === "hudStateRequest") {
      lastState = "";
      pushState();
      return;
    }

    if (m.action === "hudMeasureRequest") {
      const id = (m.payload || {}).id;
      let rec = null;
      try {
        rec = NS.measure();
      } catch (err) {
        NS.debug.lastError = String(err);
      }
      post("hudMeasureResult", { id, ok: !!rec, record: rec });
    }
  });

  I.on("settings", pushState);
  I.on("service", pushState);
  I.on("root", pushState);
  I.on("measure", (rec) => post("hudMeasure", rec));

  // הפקטור מתעדכן בלי אירוע; סקר עצל מספיק
  setInterval(pushState, 1000);

  post("ready", {});
})();
