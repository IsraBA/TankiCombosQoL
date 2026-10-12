// features/hud/store.js  [ISOLATED world]

// מפתח ה-storage היחיד: hudLayout. הצורה: CLAUDE.mds/hud.md → Storage
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const KEY = "hudLayout";
  const listeners = [];
  let data = empty();
  let loaded = false;

  function empty() {
    return { v: 1, layouts: { default: { elements: {} }, centered: { elements: {} } }, measured: {} };
  }

  // מבנה תקין גם כשהאחסון חלקי או ישן
  function sanitize(raw) {
    const d = empty();
    if (!raw || typeof raw !== "object") return d;
    for (const layout of Object.keys(d.layouts)) {
      const src = raw.layouts && raw.layouts[layout];
      if (src && src.elements && typeof src.elements === "object") {
        d.layouts[layout].elements = Object.assign({}, src.elements);
      }
    }
    if (raw.measured && typeof raw.measured === "object") d.measured = Object.assign({}, raw.measured);
    return d;
  }

  function notify() {
    const bridge = window.TankiQoL.HudBridge;
    if (bridge) bridge.sendSettings({ layouts: data.layouts });
    for (const fn of listeners) {
      try {
        fn(data);
      } catch (e) { /* מאזין אחד לא מפיל את השאר */ }
    }
  }

  function persist() {
    try {
      chrome.storage.local.set({ [KEY]: data });
    } catch (e) { /* נשאר בזיכרון לסשן הזה */ }
  }

  function load() {
    try {
      chrome.storage.local.get([KEY], (r) => {
        data = sanitize(r && r[KEY]);
        loaded = true;
        notify();
      });
    } catch (e) {
      loaded = true;
      notify();
    }
  }

  // טאב אחר שינה — מיישרים בלי לכתוב חזרה
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[KEY]) return;
      data = sanitize(changes[KEY].newValue);
      notify();
    });
  } catch (e) { /* אין storage — עובדים בזיכרון */ }

  window.TankiQoL.HudStore = {
    KEY,

    isLoaded() {
      return loaded;
    },

    get() {
      return data;
    },

    elements(layout) {
      return (data.layouts[layout] || { elements: {} }).elements;
    },

    // מחליף את כל ההעדפות של פריסה אחת
    setElements(layout, elements) {
      if (!data.layouts[layout]) return;
      data.layouts[layout].elements = Object.assign({}, elements);
      persist();
      notify();
    },

    // מדידה אמיתית קודמת ל-seed; ה-seed הוא מה שנשלח עם התוסף
    measured(layout) {
      if (data.measured[layout]) return data.measured[layout];
      const seed = window.TankiQoL.HudSeed;
      return (seed && seed[layout]) || null;
    },

    // מיזוג לפי רכיב: מוסתר שומר על המלבן הקודם
    setMeasured(record) {
      if (!record || !record.layout || !data.layouts[record.layout]) return;
      if (!record.groups || !Object.keys(record.groups).length) return;
      const prev = data.measured[record.layout];
      const merged = Object.assign({}, record, {
        groups: Object.assign({}, prev && prev.groups, record.groups),
      });
      if (JSON.stringify(prev) === JSON.stringify(merged)) return;
      data.measured[record.layout] = merged;
      persist();
      notify();
    },

    subscribe(fn) {
      listeners.push(fn);
      if (loaded) fn(data);
      return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
  };

  // מדידות מהקרב נשמרות תמיד, גם בלי לפתוח את העורך
  const bridge = window.TankiQoL.HudBridge;
  if (bridge) bridge.onMeasure((rec) => window.TankiQoL.HudStore.setMeasured(rec));

  load();
})();
