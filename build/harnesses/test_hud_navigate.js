// הניווט להגדרות > Controls בצד MAIN (capture/game/modules.js + apply/game/navigate.js
// + הגשר, כמו שהם) מול מודולי קוטלין מזויפים: טבלאות ה-$_$ נאספות כשהן נוצרות,
// הפונקציות מזוהות לפי מפתח + תחילת המקור, ושתי הפעולות משוגרות בסדר של המשחק.
// node build/harnesses/test_hud_navigate.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const FILES = ["capture/game/names.js", "capture/game/trap.js", "capture/game/modules.js",
  "apply/game/navigate.js", "bridge/game/bridge_main.js"].map((f) => "features/hud/" + f);

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}

const listeners = [];
const posted = [];
let now = 1000;
const ctx = {
  console: { log() {}, error() {} },
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  Date: { now: () => now },
  Promise,
};
ctx.addEventListener = (type, fn) => { if (type === "message") listeners.push(fn); };
ctx.postMessage = (data) => posted.push(data);
vm.createContext(ctx);
vm.runInContext("globalThis.window = globalThis;", ctx);
const run = (code) => vm.runInContext(code, ctx);
const protoHas = (p) => run("!!Object.getOwnPropertyDescriptor(Object.prototype, " + JSON.stringify(p) + ")");

ok("no export-table trap before the files load", !protoHas("$_$"));
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });
const send = (action, payload) =>
  listeners.forEach((fn) => fn({ source: ctx.window, data: { __hud: true, dir: "i2m", action, payload } }));
const replies = () => posted.filter((m) => m.action === "hudControlsResult").map((m) => m.payload);

// ---- איסוף הטבלאות ----

ok("the $_$ trap is armed as soon as the file loads, with no names", protoHas("$_$"));
ok("…and reads as nothing on an ordinary object", run("({}).$_$ === undefined"));

// כמו שהמודולים של הבאנדל נבנים: t.$_$=t.$_$||{}, ואז t.$_$.<key>=...
run(`
globalThis.dispatched = [];
// מודול זר עם אותם מפתחות, ראשון בתור: ממנו אסור לבנות דבר
globalThis.stranger = {};
(function (t) {
  t.$_$=t.$_$||{},t.$_$.f1c=function QK(t){},t.$_$.m1e=function _X(){},t.$_$.e1k=function Fut(t){},
  t.$_$.u=function E2t(){throw new Error("stranger store")};
})(stranger);
globalThis.lobby = {};
(function (t) {
  var cd = void 0;
  function BX() {}
  function QK(t,n){n=n===cd||n,this.grm_1=t,this.hrm_1=n}
  function _X(){BX.call(this),this.ns8_1="Lobby.Settings"}
  function Fut(t){this.cu8_1=t}
  function Z2(n, o) { this.name = n; this.ordinal = o; }
  var ACCOUNT = new Z2("ACCOUNT", 0), CONTROL = new Z2("CONTROL", 4);
  globalThis.CONTROL = CONTROL; globalThis.Settings = _X;
  t.$_$=t.$_$||{},t.$_$.f1c=QK,t.$_$.m1e=_X,t.$_$.e1k=Fut,
  t.$_$.f1k=function(t){switch(t){case"ACCOUNT":return ACCOUNT;case"CONTROL":return CONTROL;default:throw new Error("No enum constant "+t)}};
})(lobby);
globalThis.ui = {};
(function (t) {
  var af = null;
  function C2t(){af=this}
  C2t.prototype.kar = function () { return { qaq(a) { dispatched.push(a); } }; };
  function E2t(){return null==af&&new C2t,af}
  t.$_$=t.$_$||{},t.$_$.u=E2t;
})(ui);
`);
ok("each module's table is recorded", run("__HUD.internals.kotlinTables.length") === 3);
ok("…stays the module's own, enumerable property", run("Object.keys(lobby).includes('$_$') && lobby.$_$.f1c.name === 'QK'"));
ok("…and later writes go straight to it", run("lobby.$_$.extra = 1, lobby.$_$.extra === 1"));

// ---- מה שהגילוי שולח ----

const NAV = {
  store: { key: "u", head: "function E2t(){return null==af&&new C2t,af}", getter: "kar", dispatch: "qaq" },
  goTo: { key: "f1c", head: "function QK(t,n){n=n===cd||n,this.grm_1=t,this.hrm_1=n}" },
  screen: { key: "m1e", head: "function _X(){BX.call(this),this.ns8_1=\"Lobby.Settings\"}" },
  select: { key: "e1k", head: "function Fut(t){this.cu8_1=t}" },
  category: { key: "f1k", head: "function(t){switch(t){case\"ACCOUNT\"" },
  control: "CONTROL",
};

// ---- בקשה לפני הגילוי מחכה לו ----

send("hudControlsRequest", { id: 1 });
ok("a request before discovery waits (no reply, nothing dispatched)", replies().length === 0 && run("dispatched.length") === 0);
send("hudNav", NAV);
ok("…and runs when the names arrive", replies().length === 1 && replies()[0].id === 1 && replies()[0].ok === true);
ok("…two actions, in the game's order", run("dispatched.length") === 2);
ok("…first the CONTROL category", run("dispatched[0].cu8_1 === CONTROL"));
ok("…then GoTo the settings screen, built by the game's own class", run("dispatched[1].grm_1 instanceof Settings"));
ok("…with history on, as the game's own call leaves it", run("dispatched[1].hrm_1 === true"));
ok("…never from the module that only shares the keys",
  run("dispatched[0] instanceof lobby.$_$.e1k && dispatched[1] instanceof lobby.$_$.f1c") &&
  run("__HUD.debug.lastError") === null);

// ---- בקשה רגילה, דרך הקונסול ----

run("dispatched.length = 0");
run("globalThis.consoleReply = null; __HUD.openControls().then((r) => { consoleReply = r; });");
setTimeout(() => {
  ok("__HUD.openControls() goes the same way", run("consoleReply && consoleReply.ok === true && dispatched.length === 2"));

  // ---- כשמשהו חסר: לא משגרים חצי ----

  run("dispatched.length = 0");
  posted.length = 0;
  send("hudNav", Object.assign({}, NAV, { goTo: { key: "f1c", head: "function QK(t,n,i)" } }));
  send("hudControlsRequest", { id: 2 });
  ok("a function that is not there fails the request", replies()[0] && replies()[0].ok === false &&
    replies()[0].error === "game code not found");
  ok("…and nothing is dispatched", run("dispatched.length") === 0);

  posted.length = 0;
  send("hudNav", Object.assign({}, NAV, { control: "NOPE" }));
  send("hudControlsRequest", { id: 3 });
  ok("an unknown category fails before anything is dispatched", replies()[0] && replies()[0].ok === false &&
    run("dispatched.length") === 0);

  // ---- בקשה שחיכתה יותר מדי לא רצה מאוחר ----

  run("__HUD.internals.applyNav(null)");
  posted.length = 0;
  send("hudControlsRequest", { id: 4 });
  send("hudControlsRequest", { id: 5 });
  ok("a second early request supersedes the first", replies().length === 1 && replies()[0].id === 4 &&
    replies()[0].error === "superseded");
  now += 11000;
  send("hudNav", NAV);
  ok("…and one that waited past 10s is dropped, not run late", replies().length === 1 && run("dispatched.length") === 0);

  isolatedSide().then(() => {
    console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
    process.exit(failures ? 1 : 0);
  });
}, 0);

// ---- צד ה-ISOLATED: bridge.js + settings_button.js, מול MAIN מדומה ----

function isolatedSide() {
  const { makeFakeDom } = require("./fake_dom");
  const dom = makeFakeDom();
  const winListeners = [];
  const out = [];
  const iso = { console: { log() {}, warn() {}, error() {} }, document: dom.document, setTimeout, clearTimeout, Promise };
  iso.addEventListener = (type, fn) => { if (type === "message") winListeners.push(fn); };
  vm.createContext(iso);
  vm.runInContext("globalThis.window = globalThis;", iso);
  iso.postMessage = (data) => out.push(data);
  for (const f of ["shared/components/button.js", "features/combos/lib/constants.js",
    "features/hud/bridge/bridge.js", "features/hud/editor/settings_button.js"]) {
    vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), iso, { filename: f });
  }
  const Q = iso.window.TankiQoL;
  let opened = 0;
  Q.HudEditor = { open() { opened++; } };
  Q.LanguageManager = { getUIText: (k) => k };

  // MAIN מדומה: עונה לבקשה, והמשחק בונה את כרטיסיית Controls קצת אחר כך
  let answer = { ok: true };
  function main() {
    const req = out.filter((m) => m.action === "hudControlsRequest").pop();
    if (!req) return;
    const data = { __hud: true, dir: "m2i", action: "hudControlsResult", payload: Object.assign({ id: req.payload.id }, answer) };
    winListeners.forEach((fn) => fn({ source: iso.window, data }));
    if (!answer.ok) return;
    setTimeout(() => {
      const row = dom.document.createElement("div");
      row.className = "SettingsComponentStyle-rowBlock";
      const title = dom.document.createElement("h3");
      title.className = "SettingsComponentStyle-dropDownTitle";
      row.appendChild(title);
      dom.body.appendChild(row);
    }, 250);
  }

  return (async () => {
    let going = Q.HudSettingsButton.goTo();
    main();
    ok("the news button asks MAIN for the game's navigation", out.some((m) => m.action === "hudControlsRequest"));
    let done = await going;
    ok("…waits for the Controls tab the game builds, and opens the editor once", done === true && opened === 1);
    ok("…with our HUD EDITOR button already in the tab's row, as if the user had clicked it",
      !!dom.document.querySelector(".cme_hud-editor-button"));

    answer = { ok: false, error: "game code not found" };
    going = Q.HudSettingsButton.goTo();
    main();
    done = await going;
    ok("when MAIN cannot navigate, nothing opens", done === false && opened === 1);
  })();
}
