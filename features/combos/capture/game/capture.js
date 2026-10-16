// features/combos/capture/game/capture.js  [MAIN world]

// מלכודות Object.prototype שתופסות את מצב המוסך ואת תבניות הפעולות.

(function () {
  'use strict';

  const W = window;
  const NS = (W.__CMB = W.__CMB || {});
  const I = (NS.internals = NS.internals || {});

  // בדיקה מבנית היא מה שמונע מהמלכודת לתפוס אובייקט זר עם אותו שם שדה
  function looksLikeState(o) {
    if (!o || typeof o !== 'object') return false;
    const list = I.stateFieldList;
    if (!list.length) return false;
    for (let i = 0; i < list.length; i++) {
      if (!(list[i] in o)) return false;
    }
    return true;
  }

  function looksLikeProxy(o) {
    if (!o || typeof o !== 'object' || !I.D.proxyMountMethod) return false;
    const proto = Object.getPrototypeOf(o);
    if (!proto) return false;
    for (const m of (I.D.proxyMethods || [I.D.proxyMountMethod])) {
      if (typeof proto[m] !== 'function') return false;
    }
    return true;
  }

  // מלכודת גנרית: שדה -> [{check, onCapture}]; שני תפקידים יכולים לחלוק שם
  const armed = new Map();
  function armTrap(prop, check, onCapture) {
    if (!prop) return;
    const mine = armed.get(prop);
    if (mine) {
      if (!mine.some((e) => e.check === check)) mine.push({ check, onCapture });
      return;
    }
    const list = [{ check, onCapture }];
    armed.set(prop, list);
    list.set = function (v) {
      // שומרים כ-own property, כדי שהאובייקט יפסיק לעבור דרכנו
      Object.defineProperty(this, prop, {
        value: v, writable: true, configurable: true, enumerable: true,
      });
      for (const e of list) {
        try {
          if (e.check(this)) e.onCapture(this);
        } catch (err) { NS.debug.lastError = String(err); }
      }
    };
    try {
      Object.defineProperty(W.Object.prototype, prop, {
        configurable: true, enumerable: false,
        get() { return undefined; },
        set: list.set,
      });
    } catch (e) { NS.debug.lastError = String(e); }
  }

  // שדה שהתרוקן יוצא מ-Object.prototype, אם המלכודת עדיין שלנו
  function disarm(prop, check) {
    const list = armed.get(prop);
    if (!list) return;
    const i = list.findIndex((e) => e.check === check);
    if (i >= 0) list.splice(i, 1);
    if (list.length) return;
    armed.delete(prop);
    const d = Object.getOwnPropertyDescriptor(W.Object.prototype, prop);
    if (d && d.set === list.set) delete W.Object.prototype[prop];
  }

  // ה-state נבנה מחדש בכל פעולה; תמיד מחזיקים את האחרון
  function onState(o) {
    I.latestState = o;
    NS.debug.captures++;
  }
  // דרכו מגיעים לקונטרולר, ומשם ל-store
  function onProxy(o) {
    I.garageProxy = o;
    NS.debug.proxyCaptured = true;
  }
  // נלכדת בפעם הראשונה שהמשחק מרכיב פריט בעצמו
  function onMountAction(o) {
    if (I.mountActionProto) return;
    I.mountActionProto = Object.getPrototypeOf(o);
    NS.debug.mountActionCaptured = true;
    NS.debug.mountActionSource = 'trapped-on-real-mount';
  }
  // נלכדת כשהמשתמש לוחץ על פריט כלשהו במוסך
  function onSelectAction(o) {
    if (I.selectActionProto) return;
    I.selectActionProto = Object.getPrototypeOf(o);
    NS.debug.selectActionCaptured = true;
  }

  I.armAll = function () {
    if (!I.D) return;
    const want = [
      [I.D.trapField, looksLikeState, onState],
      [I.D.proxyTrapField, looksLikeProxy, onProxy],
      [I.D.actionNeedServerField, I.looksLikeMountAction, onMountAction],
      [I.D.selectItemIdField, I.looksLikeSelectAction, onSelectAction],
    ];
    // שם ממטמון ישן שהוחלף שייך כאן למחלקה זרה, אולי חמה
    for (const [prop, list] of Array.from(armed)) {
      for (const e of list.slice()) {
        if (!want.some(([p, c]) => p === prop && c === e.check)) disarm(prop, e.check);
      }
    }
    for (const [prop, check, fn] of want) armTrap(prop, check, fn);
  };
})();
