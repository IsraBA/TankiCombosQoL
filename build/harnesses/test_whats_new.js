// מודל "מה חדש": מוצג פעם אחת לכל גרסת חדשות, וכל דרך סגירה מסמנת
// שנצפה. רץ על הדיאלוג המשותף (shared/components/dialog.js) מעל DOM מזויף.
// node build/harnesses/test_whats_new.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { makeFakeDom } = require("./fake_dom");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const FILES = [
  "shared/icons.js",
  "shared/components/button.js",
  "shared/components/dialog.js",
  "features/combos/view/panels/whats_new_modal.js",
];

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}
function eq(label, got, want) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  console.log((good ? "OK  " : "FAIL") + "   " + label);
  if (!good) {
    console.log("       want " + JSON.stringify(want));
    console.log("       got  " + JSON.stringify(got));
    failures++;
  }
}

// ---- סביבה מזויפת: DOM מינימלי ו-storage בזיכרון ----

function makeEnv(stored) {
  const store = Object.assign({}, stored);
  const dom = makeFakeDom();

  const ctx = {
    console: { log() {}, error() {} },
    Promise,
    chrome: {
      storage: {
        local: {
          get(keys, cb) {
            const out = {};
            for (const k of keys) if (k in store) out[k] = store[k];
            cb(out);
          },
          set(obj, cb) { Object.assign(store, obj); if (cb) cb(); },
          remove(keys, cb) {
            for (const k of keys) delete store[k];
            if (cb) cb();
          },
        },
      },
    },
    document: dom.document,
  };
  // המודול מאזין ל-window עבור הממסר מ-MAIN
  const winListeners = [];
  ctx.addEventListener = (type, fn) => {
    if (type === "message") winListeners.push(fn);
  };

  vm.createContext(ctx);
  vm.runInContext(
    "globalThis.window = globalThis; window.TankiQoL = { LanguageManager: { getUIText: (k) => 'T:' + k } };",
    ctx,
  );
  for (const f of FILES) {
    vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });
  }

  // מחקה את מה ש-__CMB.resetWhatsNew() מפרסם מהעולם MAIN
  function relay(action) {
    const data = { __cmb: true, dir: "m2i", action };
    for (const fn of winListeners) fn({ source: ctx.window, data });
  }

  const dialogRoot = () => dom.document.getElementById("cme_whats-new-root");

  return { ctx, store, dom, relay, dialogRoot, M: ctx.window.TankiQoL.WhatsNewModal };
}

// ---- טעינה נקייה: טרם נצפה ----

let env = makeEnv({});
const V = env.M._internals.NEWS_VERSION;
const KEY = env.M._internals.KEY;
ok("the shipped module loaded", typeof env.M.maybeShow === "function");
ok("a fresh profile has not seen it", env.M.isUnseen() === true);

env.M.maybeShow();
ok("…so it opens (a dialog root is in the body)", !!env.dialogRoot());
ok("…and the badge is still wanted while it is open", env.M.isUnseen() === true);
ok("…the dialog wears the shared chrome", !!env.dialogRoot().querySelector(".cme_dialog"));

env.M.hide();
ok("closing marks it seen", env.M.isUnseen() === false);
eq("…and the version is what got stored", env.store[KEY], V);
ok("…the dialog left the DOM", env.dialogRoot() === null);
ok("…and the Escape listener was removed", env.dom.docListeners.length === 0);

// שנייה, שלישית — לא נפתח שוב באותה גרסה
env.M.maybeShow();
ok("it does not open a second time", env.dialogRoot() === null);

// ---- כל דרך סגירה נחשבת: הכפתור, ה-X, הרקע, Escape ----

env = makeEnv({});
env.M.show();
env.dialogRoot().querySelector('[data-action="close"]').click();
ok("the button closes and marks seen", env.dialogRoot() === null && env.M.isUnseen() === false);

env = makeEnv({});
env.M.show();
env.dialogRoot().querySelector(".cme_dialog-close").click();
ok("the X closes and marks seen", env.dialogRoot() === null && env.M.isUnseen() === false);

env = makeEnv({});
env.M.show();
env.dom.keydown("Escape");
ok("Escape closes and marks seen", env.dialogRoot() === null && env.M.isUnseen() === false);

env = makeEnv({});
env.M.show();
const backdrop = env.dialogRoot().querySelector(".cme_dialog-backdrop");
(backdrop.listeners.click || []).forEach((fn) => fn({ target: backdrop }));
ok("the backdrop closes and marks seen", env.dialogRoot() === null && env.M.isUnseen() === false);

// ---- פרופיל שכבר ראה את הגרסה הזאת ----

env = makeEnv({ [KEY]: V });
ok("a profile that already saw this version: no badge", env.M.isUnseen() === false);
env.M.maybeShow();
ok("…and nothing opens", env.dialogRoot() === null);

// ---- גרסת חדשות קודמת = עדכון חדש, מציגים שוב ----

env = makeEnv({ [KEY]: "3.1" });
ok("an older seen-version counts as unseen", env.M.isUnseen() === true);
env.M.maybeShow();
ok("…so the next update shows again", !!env.dialogRoot());

// ---- עוזר הקונסול ----

env = makeEnv({ [KEY]: V });
ok("before reset: seen", env.M.isUnseen() === false);
(async () => {
  const msg = await env.M.reset();
  ok("reset clears the flag", env.M.isUnseen() === true);
  ok("…removes the key rather than blanking it", !(KEY in env.store));
  ok("…and reports back to the console", typeof msg === "string" && msg.length > 0);

  env.M.maybeShow();
  ok("…so it opens again", !!env.dialogRoot());

  // ---- הבאדג' בלובי מתרענן כשהמודל נסגר ----

  let refreshed = 0;
  env.ctx.window.TankiQoL.LobbyButtonInjector = {
    refreshBadge() { refreshed++; },
  };
  env.M.hide();
  ok("closing tells the lobby button to drop its badge", refreshed === 1);

  // ---- הממסר מהעולם MAIN: __CMB.resetWhatsNew() ----

  env = makeEnv({ [KEY]: V });
  ok("before the relay: seen", env.M.isUnseen() === false);
  env.relay("resetWhatsNew");
  await new Promise((r) => setTimeout(r, 0));
  ok("a resetWhatsNew message from MAIN clears the flag", env.M.isUnseen() === true);

  env = makeEnv({ [KEY]: V });
  env.relay("someOtherAction");
  await new Promise((r) => setTimeout(r, 0));
  ok("…and an unrelated m2i message is ignored", env.M.isUnseen() === false);

  // ---- כל שורה בתצוגה עוברת דרך מנהל השפות ----

  env = makeEnv({});
  env.M.show();
  const text = env.dialogRoot().textContent;
  const keys = ["whatsNewTitle", "whatsNewGotIt"].concat(env.M._internals.LINES);
  ok(
    "every string is a translated key, none hardcoded",
    keys.every((k) => text.includes("T:" + k)),
  );
  const h1 = env.dialogRoot().querySelector("h1");
  ok(
    "the title leads with the confetti icon",
    h1.innerHTML.includes("cme_whats-new-party") && h1.textContent.includes("T:whatsNewTitle"),
  );
  ok(
    "the list is left-aligned, the one deliberate departure",
    !!env.dialogRoot().querySelector(".cme_dialog-body--left"),
  );

  console.log(
    failures ? "\n" + failures + " check(s) FAILED" : "\nall checks passed",
  );
  process.exit(failures ? 1 : 0);
})();
