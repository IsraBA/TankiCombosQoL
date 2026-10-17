// ההפניות אל עורך ה-HUD: נקודות בלובי, ב-CONTROLS ועל הכפתור, ובאנר בקומבואים.
// מוצגות עד הכניסה הראשונה לעורך, ולא למי שה-HUD שלו כבר ערוך.
// node build/harnesses/test_hud_news.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { makeFakeDom } = require("./fake_dom");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const FILES = [
  "features/combos/lib/constants.js",
  "shared/components/button.js",
  "features/hud/store.js",
  "features/hud/editor/settings_button.js",
  "features/hud/news/state.js",
  "features/hud/news/dots.js",
  "features/hud/news/banner.js",
  "features/hud/main.js",
];

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}

const EDITED = { v: 1, layouts: { default: { elements: { radar: { dx: 0.1, dy: 0, scale: 1, opacity: 1 } } }, centered: { elements: {} } }, measured: {} };

// ---- סביבה מזויפת: DOM של הלובי, ההגדרות והקומבואים, ו-storage בזיכרון ----

function makeEnv(stored) {
  const store = JSON.parse(JSON.stringify(stored || {}));
  const dom = makeFakeDom();
  const doc = dom.document;
  const div = (cls, parent) => {
    const el = doc.createElement("div");
    el.className = cls;
    (parent || dom.body).appendChild(el);
    return el;
  };

  // הלובי: הקונטיינר של פריט ההגדרות ובתוכו האייקון
  const lobbyItem = div("PrimaryMenuItemComponentStyle-itemCommonLi PrimaryMenuItemComponentStyle-menuItemContainer");
  div("PrimaryMenuItemComponentStyle-itemLiOption", lobbyItem);
  // ההגדרות: GAME BATTLE GRAPHICS SOUND CONTROLS ACCOUNT SECURITY SUPPORT
  const tabs = [];
  for (let i = 0; i < 8; i++) tabs.push(div("SettingsMenuComponentStyle-menuItemOptions"));
  const hudButton = div("cme_button cme_hud-editor-button");
  // כרטיסיית הקומבואים: שורת ייבוא/ייצוא בעמודה
  const column = div("cme_TanksPartComponentStyle-tankPartUpgrades");
  div("cme_import-export-row", column);

  const winListeners = [];
  // הלולאות של main.js לא רצות כאן; הבדיקה קוראת ל-sync בעצמה
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    Promise,
    setTimeout: () => 0,
    setInterval: () => 0,
    document: doc,
    addEventListener(type, fn) { if (type === "message") winListeners.push(fn); },
    chrome: {
      storage: {
        local: {
          get(keys, cb) {
            const out = {};
            for (const k of keys) if (k in store) out[k] = JSON.parse(JSON.stringify(store[k]));
            cb(out);
          },
          set(obj, cb) { Object.assign(store, JSON.parse(JSON.stringify(obj))); if (cb) cb(); },
          remove(keys, cb) { for (const k of keys) delete store[k]; if (cb) cb(); },
        },
        onChanged: { addListener() {} },
      },
    },
  };
  vm.createContext(ctx);
  // WhatsNewModal מזויף: שומר מה ש-main.js מספק לו
  vm.runInContext("globalThis.window = globalThis; window.TankiQoL = { LanguageManager: { getUIText: (k) => 'T:' + k }," +
    " WhatsNewModal: { provided: {}, provide(to, run, pending) { this.provided[to] = { run, pending }; } } };", ctx);
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });

  const Q = ctx.window.TankiQoL;
  const sync = () => { Q.HudNewsDots.sync(); Q.HudNewsBanner.sync(); };
  const dots = () => ({
    lobby: !!lobbyItem.querySelector(".cme_hud-news-dot"),
    controls: !!tabs[4].querySelector(".cme_hud-news-dot"),
    others: tabs.filter((t, i) => i !== 4 && t.querySelector(".cme_hud-news-dot")).length,
    button: !!hudButton.querySelector(".cme_hud-news-dot"),
  });
  const banner = () => column.querySelector(".cme_hud-news-banner");
  // מחקה את מה ש-__HUD.resetNews() מפרסם מהעולם MAIN
  const relay = (payload) => {
    const data = { __hud: true, dir: "m2i", action: "hudNewsReset", payload };
    for (const fn of winListeners) fn({ source: ctx.window, data });
  };

  return { Q, store, sync, dots, banner, lobbyItem, tabs, hudButton, column, relay };
}

const all = (d) => d.lobby && d.controls && d.button && d.others === 0;
const none = (d) => !d.lobby && !d.controls && !d.button && d.others === 0;

(async () => {
  // ---- התקנה נקייה: הכול מופיע ----
  let env = makeEnv({});
  env.sync();
  ok("fresh install: a dot on the lobby Settings item, CONTROLS and the HUD EDITOR button", all(env.dots()));
  // המשחק מזריק את הכללים של מחלקה רק כשהוא משתמש בה — לכן רק cme_
  const dotClasses = [env.lobbyItem, env.tabs[4], env.hudButton]
    .map((h) => h.querySelector(".cme_hud-news-dot").className.split(" "));
  ok("…each dot carries only our own classes (the game's rules may not be injected)",
    dotClasses.every((c) => c.every((x) => x.startsWith("cme_"))));
  ok("…and each host gets its own kind",
    dotClasses.map((c) => c[1]).join() === "cme_hud-news-lobby,cme_hud-news-tab,cme_hud-news-corner");
  const css = fs.readFileSync(path.join(EXT, "features/hud/news/news.css"), "utf8");
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
  ok("news.css draws every dot itself: no game class in it", !/ComponentStyle|MarkerStyle/.test(rules));
  ok("…the button's and the banner's dots share the lobby's Ellipse look",
    /\.cme_hud-news-lobby,\s*\.cme_hud-news-corner,\s*\.cme_hud-news-banner-dot\s*\{[^}]*rgba\(255, 238, 0, 0\.25\)/.test(rules));
  // המשחק צובע לבן כל div בפריט התפריט ב-hover
  ok("…and the lobby halo survives the game's hover rule",
    /\.cme_hud-news-lobby\s*\{[^}]*background-color:[^;]*!important/.test(rules));
  ok("…and the banner sits under the import/export row", !!env.banner() && env.column.children[1] === env.banner());
  env.sync();
  ok("syncing again adds nothing twice",
    env.lobbyItem.querySelectorAll(".cme_hud-news-dot").length === 1 && env.column.querySelectorAll(".cme_hud-news-banner").length === 1);

  // ---- X: רק הבאנר נסגר, ולתמיד ----
  env.banner().querySelector(".cme_hud-news-banner-close").click();
  env.sync();
  ok("X closes the banner and the dots stay", !env.banner() && all(env.dots()));
  ok("…and it is remembered", env.store.hudNews && env.store.hudNews.bannerClosed === true);
  let again = makeEnv(env.store);
  again.sync();
  ok("…across a reload", !again.banner() && all(again.dots()));

  // ---- כל הבאנר מוביל לעורך, וה-X לא ----
  env = makeEnv({});
  let went = 0;
  env.Q.HudSettingsButton.goTo = () => { went++; };
  env.sync();
  env.banner().click();
  ok("clicking the banner goes to the editor", went === 1);
  ok("…and it has no separate button", env.banner().children.length === 3);
  env.banner().querySelector(".cme_hud-news-banner-close").click();
  ok("…but its X does not", went === 1 && !env.banner());

  // ---- הבאדג' על כפתור COMBOS בלובי: הולך עם הבאנר ----
  env = makeEnv({});
  const badge = () => env.Q.WhatsNewModal.provided.hudEditor.pending();
  ok("main.js gives the news popup the editor as its destination, with a 'waiting' check",
    typeof env.Q.WhatsNewModal.provided.hudEditor.pending === "function");
  ok("fresh: the COMBOS lobby badge is held", badge() === true);
  env.sync();
  env.banner().querySelector(".cme_hud-news-banner-close").click();
  env.sync();
  ok("the banner's X lets the COMBOS badge go…", badge() === false);
  ok("…while the dots along Settings stay until the editor", all(env.dots()));
  env = makeEnv({});
  env.Q.HudNews.markVisited();
  ok("entering the editor (banner never closed) lets it go too", badge() === false);
  env = makeEnv({ hudLayout: EDITED });
  ok("an edited HUD never holds it", env.Q.WhatsNewModal.provided.hudEditor.pending() === false);

  // ---- כניסה לעורך: הכול נעלם, ולתמיד ----
  env.Q.HudNews.markVisited();
  env.sync();
  ok("after the editor was opened once, every dot and the banner are gone", none(env.dots()) && !env.banner());
  again = makeEnv(env.store);
  again.sync();
  ok("…across a reload", none(again.dots()) && !again.banner());

  // ---- HUD כבר ערוך: לא מפנים ----
  env = makeEnv({ hudLayout: EDITED });
  env.sync();
  ok("an edited HUD (any element off its default) shows neither dots nor banner", none(env.dots()) && !env.banner());
  env = makeEnv({});
  env.sync();
  env.Q.HudStore.setElements("centered", { radar: { dx: 0, dy: 0.1, scale: 1, opacity: 1 } });
  env.sync();
  ok("editing in the other layout removes what was already shown", none(env.dots()) && !env.banner());
  env.Q.HudStore.setElements("centered", {});
  env.sync();
  ok("…and a full reset brings them back while the editor was never opened", all(env.dots()) && !!env.banner());

  // ---- לפני שהאחסון נטען: לא מהבהב ----
  env = makeEnv({});
  const realGet = env.Q.HudStore.isLoaded;
  env.Q.HudStore.isLoaded = () => false;
  env.sync();
  ok("nothing is shown before the layout has loaded", none(env.dots()) && !env.banner());
  env.Q.HudStore.isLoaded = realGet;

  // ---- עוזר הקונסול ----
  env = makeEnv({ hudNews: { visited: true, bannerClosed: true } });
  env.sync();
  ok("seen: nothing shown", none(env.dots()) && !env.banner());
  env.relay({});
  await new Promise((r) => setTimeout(r, 0));
  env.sync();
  ok("__HUD.resetNews() from MAIN clears both flags", all(env.dots()) && !!env.banner() && !env.store.hudNews);

  env = makeEnv({ hudNews: { visited: true }, hudLayout: EDITED });
  env.relay({});
  await new Promise((r) => setTimeout(r, 0));
  env.sync();
  ok("…but an edited HUD still hides them", none(env.dots()));
  const msg = await env.Q.HudNews.reset(false);
  ok("…and the ISOLATED reset says why", /edited/.test(msg));
  env.relay({ force: true });
  await new Promise((r) => setTimeout(r, 0));
  env.sync();
  ok("resetNews(true) shows them even on an edited HUD", all(env.dots()) && !!env.banner());
  env.Q.HudNews.markVisited();
  env.sync();
  ok("…until the editor is opened", none(env.dots()) && !env.banner());

  // ---- המחרוזות קיימות בכל 11 השפות ----
  const lm = { console: { log() {} } };
  vm.createContext(lm);
  vm.runInContext("globalThis.window = globalThis;" +
    fs.readFileSync(path.join(EXT, "features/combos/lib/language_manager.js"), "utf8"), lm);
  const LM = lm.window.TankiQoL.LanguageManager;
  const CODES = ["en", "ru", "es", "pl", "pt", "de", "fr", "ja", "tr", "cs", "hi"];
  const gaps = [];
  for (const c of CODES) {
    const lang = LM.getLanguageByCode(c);
    for (const k of ["hudNewsBanner", "hudEditorButton"]) if (lang.code !== c || !lang.ui[k]) gaps.push(c + ":" + k);
  }
  ok("the banner's strings exist in all 11 languages" + (gaps.length ? " — missing " + gaps.join(",") : ""), !gaps.length);

  // ---- הקבצים רשומים במניפסט ----
  const manifest = fs.readFileSync(path.join(EXT, "manifest.json"), "utf8");
  ok("news files are in the manifest, before hud/main.js",
    ["state", "dots", "banner"].every((f) => manifest.indexOf("features/hud/news/" + f + ".js") > 0 &&
      manifest.indexOf("features/hud/news/" + f + ".js") < manifest.indexOf("features/hud/main.js")) &&
    manifest.includes("features/hud/news/news.css"));

  console.log(failures ? "\n" + failures + " check(s) FAILED" : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
