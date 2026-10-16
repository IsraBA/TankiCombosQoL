// צד ה-MAIN של המתרגם (main/chat.js כמו שהוא) מול HUD צ'אט מזויף:
// בלי שמות מראש אין מלכודת, השמות מהגילוי תופסים והודעה נרשמת, ושמות
// חדשים מחליפים קודמים — המלכודת הקודמת יורדת, כי היא שייכת למחלקה זרה.
// node build/harnesses/test_translator_chat.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const FILES = ["settings.js", "skiplist.js", "translate.js", "bidi.js", "chat.js"]
  .map((f) => "features/translator/main/" + f);

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}

const listeners = [];
const ctx = {
  console: { log() {}, error() {} },
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  Date,
};
ctx.addEventListener = (type, fn) => { if (type === "message") listeners.push(fn); };
ctx.postMessage = () => {};
vm.createContext(ctx);
vm.runInContext("globalThis.window = globalThis;", ctx);
const protoNames = () => vm.runInContext("Object.getOwnPropertyNames(Object.prototype).join()", ctx);
const before = protoNames();
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });
const send = (action, payload) =>
  listeners.forEach((fn) => fn({ source: ctx.window, data: { __ct: true, dir: "i2m", action, payload } }));
const run = (code) => vm.runInContext(code, ctx);

// ה-HUD המזויף נבנה לפי שמות נתונים: מתודות רינדור, פינוי, והשדה שהבנאי כותב
run(`
globalThis.makeHud = function (D) {
  function Hud() { this[D.count] = 0; this.drawn = []; this[D.offset] = {}; }
  for (const m of D.renderMethods) Hud.prototype[m] = function (arg) { this.drawn.push(arg); this[D.count]++; };
  Hud.prototype[D.evict] = function () { this[D.count]--; };
  return Hud;
};
globalThis.onProto = (p) => !!Object.getOwnPropertyDescriptor(Object.prototype, p);
`);

ok("no names before discovery — nothing is hardcoded", run("__CT_STATE().names") === null);
ok("…and no trap on Object.prototype", protoNames() === before);

const FIRST = { helper: "Hh", cls: "Cc", appendFn: "Aa", finalizeFn: "Ff", offset: "off1_1", ySub: "y_1", zSub: "z_1",
  count: "cnt1_1", ptr: "ptr1_1", evict: "ev1", renderMethods: ["r1", "r2", "r3", "r4"] };
send("hudConstants", FIRST);
ok("the discovered offset field is trapped", run("onProto('off1_1')"));
run("globalThis.HUD1 = new (makeHud(__CT_STATE().names))();");
ok("a HUD built on the discovered names is captured", run("__CT_HUD === HUD1"));
run(`HUD1.r1({ who: { name: 'x' }, text: 'gg' });`);
ok("…and a message through its render method is recorded", run("__CT_MSGS.length === 1 && __CT_MSGS[0].text === 'gg'"));
ok("…drawn by the game's own method", run("HUD1.drawn.length === 1"));

// מטמון ישן שהתחדש: שמות אחרים
const NEXT = Object.assign({}, FIRST, { offset: "zz9_1", count: "cnt9_1", evict: "ev9", renderMethods: ["s1", "s2", "s3", "s4"] });
send("hudConstants", NEXT);
ok("the new offset field is trapped", run("onProto('zz9_1')"));
ok("…and the previous one is off Object.prototype — it belongs to a stranger now", !run("onProto('off1_1')"));
run("globalThis.HUD2 = new (makeHud(__CT_STATE().names))();");
ok("a HUD built on the new names is captured", run("__CT_HUD === HUD2"));
send("hudConstants", NEXT);
ok("the same names arriving twice (the ready handshake) leave the trap in place", run("onProto('zz9_1')"));

// מלכודת זרה שהחליפה את שלנו לא נמחקת
run(`Object.defineProperty(Object.prototype, 'zz9_1', { configurable: true, get() {}, set: globalThis.__foreign = function () {} });`);
send("hudConstants", Object.assign({}, NEXT, { offset: "ww9_1" }));
ok("a foreign trap that took our field over is left in place",
  run("Object.getOwnPropertyDescriptor(Object.prototype, 'zz9_1').set === __foreign"));

ok("nothing threw along the way", run("__CT_DEBUG.lastError") === null);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
