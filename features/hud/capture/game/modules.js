// features/hud/capture/game/modules.js  [MAIN world]

// טבלאות הייצוא ($_$) של מודולי קוטלין, כשהבאנדל עולה. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  const W = window;
  const NS = (W.__HUD = W.__HUD || {});
  const I = (NS.internals = NS.internals || {});

  // שם של המהדר, לא של המשחק: נדרך לפני הבאנדל
  const KEY = "$_$";
  I.kotlinTables = [];

  try {
    Object.defineProperty(W.Object.prototype, KEY, {
      configurable: true,
      enumerable: false,
      get() {
        return undefined;
      },
      // t.$_$=t.$_$||{} — פעם אחת לכל מודול, ואז own property
      set(v) {
        Object.defineProperty(this, KEY, { value: v, writable: true, configurable: true, enumerable: true });
        if (v && typeof v === "object") I.kotlinTables.push(v);
      },
    });
  } catch (e) {
    NS.debug.lastError = String(e);
  }
})();
