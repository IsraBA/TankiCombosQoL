// הניווט לכרטיסיית הקומבואים (auto_navigator + lobby_button_injector + העזר
// המשותף, כמו שהם) מעל DOM מזויף: מאיפה מגיעים, מה נלחץ, ומה **לא** נלחץ —
// לחיצה שממתינה לאלמנט שאינו על המסך חזרה אחרי שהמשתמש יצא, ואכלה לו לחיצת
// "חזרה" שלמה. גם הבקשה החד-פעמית לפתוח את הכרטיסייה בחזרה מעורך ה-HUD.
// node build/harnesses/test_combos_nav.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const FILES = [
  "features/combos/lib/constants.js",
  "features/combos/dom/navigation_helpers.js",
  "features/combos/view/lobby/auto_navigator.js",
  "features/combos/view/lobby/lobby_button_injector.js",
];

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}

// ---- סביבה: מפת selector -> אלמנט, ו-observers שמתעוררים כשהיא משתנה ----

function makeEnv(stored, realHelper) {
  const present = new Map();
  const observers = [];
  const clicks = [];
  const navigated = [];

  const el = (name) => ({ name, click: () => clicks.push(name) });
  function set(selector, name) {
    present.set(selector, el(name));
    observers.forEach((o) => o.fire());
  }
  function drop(selector) {
    present.delete(selector);
    observers.forEach((o) => o.fire());
  }

  const ctx = {
    console: { log() {}, error() {}, warn() {} },
    setTimeout,
    clearTimeout,
    Promise,
    document: {
      body: { name: "body" },
      querySelector: (sel) => present.get(sel) || null,
    },
    chrome: {
      storage: {
        local: {
          get(keys, cb) {
            const out = {};
            for (const k of keys) if (k in stored) out[k] = stored[k];
            cb(out);
          },
        },
      },
    },
  };
  ctx.MutationObserver = class {
    constructor(fn) {
      this.fn = fn;
      this.live = false;
    }
    observe() {
      this.live = true;
      observers.push(this);
    }
    disconnect() {
      this.live = false;
    }
    fire() {
      if (this.live) this.fn([], this);
    }
  };
  vm.createContext(ctx);
  vm.runInContext("globalThis.window = globalThis;", ctx);
  for (const f of FILES) {
    vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });
  }
  const Q = ctx.window.TankiQoL;
  // הכרטיסייה עצמה נבנית בדפדפן; כאן רק מי מבקש אותה ומתי
  if (!realHelper) {
    Q.NavigationHelpers.navigateToCombosTab = async (menuContainer) => {
      navigated.push(menuContainer ? menuContainer.name : null);
      return true;
    };
  }
  return { ctx, Q, present, set, drop, clicks, navigated, DOM: Q.DOM };
}

const settle = () => new Promise((r) => setTimeout(r, 20));

(async () => {
  // ---- מסך של פריט: התפריט כבר קיים, אין מה ללחוץ ----

  let env = makeEnv({});
  env.set(env.DOM.GARAGE_WRAPPER, "garage");
  env.set(env.DOM.MENU_CONTAINER, "menu");
  env.Q.AutoNavigator.start();
  await settle();
  ok("in an item screen the tab is opened with no click at all",
    env.navigated.length === 1 && env.clicks.length === 0);

  // ---- לובי המוסך: התותחים על המסך, אז לוחצים ----

  env = makeEnv({});
  env.set(env.DOM.GARAGE_WRAPPER, "garage");
  env.set(env.DOM.LOBBY_TURRETS_BLOCK, "turrets");
  env.Q.AutoNavigator.start();
  await settle();
  ok("in the garage lobby the turrets block is clicked", env.clicks.join() === "turrets");
  ok("…and the tab waits for the menu the click builds", env.navigated.length === 0);
  env.set(env.DOM.MENU_CONTAINER, "menu");
  await settle();
  ok("…then opens on it", env.navigated.join() === "menu");

  // ---- הרגרסיה: אלמנט שאינו על המסך לא נלחץ, גם כשהוא מופיע אחר כך ----

  env = makeEnv({});
  env.set(env.DOM.GARAGE_WRAPPER, "garage");   // באמצע מעבר: אין תפריט ואין תותחים
  env.Q.AutoNavigator.start();
  await settle();
  ok("mid-transition nothing is clicked and nothing opens",
    env.clicks.length === 0 && env.navigated.length === 0);
  ok("…and the flag is released, so the next mutation retries",
    env.Q.AutoNavigator.autoNavigateTriggered === false);
  // המשתמש לחץ "חזרה": המוסך נעלם והלובי חזר עם בלוק התותחים
  env.drop(env.DOM.GARAGE_WRAPPER);
  env.set(env.DOM.LOBBY_TURRETS_BLOCK, "turrets");
  await settle();
  ok("leaving the garage never clicks the lobby's turrets block behind the user's back",
    env.clicks.length === 0 && env.navigated.length === 0);

  // ---- ההגדרה כבויה ----

  env = makeEnv({ autoOpenCombosOnGarageEntry: false });
  env.set(env.DOM.GARAGE_WRAPPER, "garage");
  env.set(env.DOM.MENU_CONTAINER, "menu");
  env.Q.AutoNavigator.start();
  await settle();
  ok("with auto-open off, entering the garage opens nothing", env.navigated.length === 0);

  // ---- הבקשה החד-פעמית (חזרה מעורך ה-HUD) ----

  env.Q.AutoNavigator.openOnNextGarage();
  env.drop(env.DOM.GARAGE_WRAPPER);
  await settle();
  env.set(env.DOM.GARAGE_WRAPPER, "garage");
  await settle();
  ok("a one-shot request opens the tab even with auto-open off", env.navigated.join() === "menu");
  env.drop(env.DOM.GARAGE_WRAPPER);
  await settle();
  env.set(env.DOM.GARAGE_WRAPPER, "garage");
  await settle();
  ok("…exactly once", env.navigated.join() === "menu");

  // בקשה שלא מומשה כי המסך לא היה מוכן נשארת לניסיון הבא
  env = makeEnv({ autoOpenCombosOnGarageEntry: false });
  env.Q.AutoNavigator.openOnNextGarage();
  env.set(env.DOM.GARAGE_WRAPPER, "garage");
  env.Q.AutoNavigator.start();
  await settle();
  ok("a request that found no menu yet is not spent", env.Q.AutoNavigator.pendingOpen === true);
  env.set(env.DOM.MENU_CONTAINER, "menu");
  await settle();
  ok("…and runs when the menu arrives", env.navigated.join() === "menu");
  // יציאה לקרב מבטלת בקשה פתוחה
  env.Q.AutoNavigator.openOnNextGarage();
  env.Q.AutoNavigator.stop();
  ok("leaving for a battle drops an unspent request", env.Q.AutoNavigator.pendingOpen === false);

  // ---- כפתור הלובי: הניווט שלו, לא של האוטומטי ----

  env = makeEnv({});
  env.set(env.DOM.LOBBY_TURRETS_BLOCK, "turrets");
  const going = env.Q.LobbyButtonInjector.navigateToCombos();
  ok("the lobby button claims the navigation before it clicks",
    env.Q.AutoNavigator.autoNavigateTriggered === true);
  env.set(env.DOM.GARAGE_WRAPPER, "garage");
  env.Q.AutoNavigator.start();
  env.set(env.DOM.MENU_CONTAINER, "menu");
  await going;
  await settle();
  ok("…so the garage appearing does not start a second one", env.navigated.join() === "menu");
  ok("…and the turrets block was clicked once", env.clicks.join() === "turrets");

  // ---- הכרטיסייה כבר פתוחה: שני ניווטים שנפגשו ----

  env = makeEnv({}, true);
  env.Q.MenuInjector = {
    comboTab: { classList: { contains: (c) => c === env.DOM.ACTIVE_TAB_CLASS } },
  };
  const t0 = Date.now();
  const again = await env.Q.NavigationHelpers.navigateToCombosTab({ name: "menu" });
  ok("a navigation onto an already open tab returns at once, with no second trip through Paints",
    again === true && Date.now() - t0 < 500);

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
