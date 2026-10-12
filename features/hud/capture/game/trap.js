// features/hud/capture/game/trap.js  [MAIN world]

// מלכודת Object.prototype גנרית; שדה תפוס ע"י מלכודת זרה נשאר שלה.
(function () {
  "use strict";

  const W = window;
  const NS = (W.__HUD = W.__HUD || {});
  const I = (NS.internals = NS.internals || {});

  const armed = new Map();   // prop -> [{check, onCapture}]

  I.armTrap = function (prop, check, onCapture) {
    if (!prop) return;
    const mine = armed.get(prop);
    if (mine) {
      mine.push({ check, onCapture });
      return;
    }
    // שדה של מלכודת אחרת (הקומבואים, היועץ) — לא דורסים
    if (Object.getOwnPropertyDescriptor(W.Object.prototype, prop)) {
      NS.debug.lastError = "trap field already taken: " + prop;
      return;
    }
    const list = [{ check, onCapture }];
    armed.set(prop, list);
    try {
      Object.defineProperty(W.Object.prototype, prop, {
        configurable: true,
        enumerable: false,
        get() {
          return undefined;
        },
        set(v) {
          // שומרים כ-own property, כדי שהאובייקט יפסיק לעבור דרכנו
          Object.defineProperty(this, prop, {
            value: v, writable: true, configurable: true, enumerable: true,
          });
          for (const e of list) {
            try {
              if (e.check(this)) e.onCapture(this);
            } catch (err) {
              NS.debug.lastError = String(err);
            }
          }
        },
      });
    } catch (e) {
      NS.debug.lastError = String(e);
    }
  };

  // מאזינים פנימיים: 'root', 'settings', 'service', 'layout', 'measure'
  const listeners = {};
  I.on = function (event, fn) {
    (listeners[event] = listeners[event] || []).push(fn);
  };
  I.emit = function (event, payload) {
    for (const fn of listeners[event] || []) {
      try {
        fn(payload);
      } catch (e) {
        NS.debug.lastError = String(e);
      }
    }
  };

  // הפרוטוטייפ שמחזיק מתודה בשם נתון, מעלה בשרשרת
  I.ownerOf = function (obj, method) {
    let p = Object.getPrototypeOf(obj);
    while (p && !Object.prototype.hasOwnProperty.call(p, method)) {
      p = Object.getPrototypeOf(p);
    }
    return p;
  };
})();
