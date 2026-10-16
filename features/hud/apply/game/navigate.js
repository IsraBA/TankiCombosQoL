// features/hud/apply/game/navigate.js  [MAIN world]

// להגדרות בכרטיסיית Controls, בשתי הפעולות שהמשחק עצמו משגר. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  const NS = (window.__HUD = window.__HUD || {});
  const I = (NS.internals = NS.internals || {});

  // בקשה שהקדימה את הגילוי מחכה לו, אבל לא לנצח
  const PARK_MS = 10000;
  let names = null;
  let parked = null;

  // אותו מפתח חוזר בהרבה מודולים; תחילת המקור מכריעה
  function exported(e) {
    for (const table of I.kotlinTables) {
      const v = table[e.key];
      if (typeof v === "function" && Function.prototype.toString.call(v).startsWith(e.head)) return v;
    }
    return null;
  }

  function go() {
    const holder = exported(names.store), GoTo = exported(names.goTo), Screen = exported(names.screen);
    const Select = exported(names.select), valueOf = exported(names.category);
    if (!holder || !GoTo || !Screen || !Select || !valueOf) return { ok: false, error: "game code not found" };
    // שתיהן נבנות לפני ששולחים: חצי ניווט גרוע מכלום
    const select = new Select(valueOf(names.control)), goTo = new GoTo(new Screen());
    const store = holder()[names.store.getter]();
    // הקטגוריה קודם: מסך ההגדרות נפתח על מה שכבר נבחר
    store[names.store.dispatch](select);
    store[names.store.dispatch](goTo);
    return { ok: true };
  }

  I.openControls = function (reply) {
    if (!names) {
      if (parked) parked.reply({ ok: false, error: "superseded" });
      parked = { reply, until: Date.now() + PARK_MS };
      return;
    }
    let r;
    try {
      r = go();
    } catch (e) {
      r = { ok: false, error: String(e) };
      NS.debug.lastError = String(e);
    }
    reply(r);
  };

  I.applyNav = function (found) {
    names = found;
    const p = parked;
    parked = null;
    if (p && Date.now() < p.until) I.openControls(p.reply);
  };

  // מהקונסול: __HUD.openControls()
  NS.openControls = () => new Promise((resolve) => I.openControls(resolve));
})();
