// מריץ את גילוי ה-HUD של הצ'אט (translator/isolated/detect.js, כמו שהוא)
// מול כל הבאנדלים — לתוסף אין שמות מראש, ולכן הוא חייב לעבוד על כולם.
// node build/harnesses/test_translator_discover.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const DIR = "c:/Users/User/Documents/programming/Tanki Extensions/research";

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}

// detect.js מחכה לבאנדל בדף; כאן אין דף, ולכן הוא פשוט לא מוצא אותו
const ctx = {
  console: { log() {}, error() {} },
  document: { scripts: [], documentElement: {} },
  MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {}; },
  setTimeout: () => 0,
  clearTimeout: () => {},
  addEventListener: () => {},
  postMessage: () => {},
  chrome: {
    runtime: { getManifest: () => ({ version: "0" }) },
    storage: { local: { get: () => {}, set: () => {}, remove: () => {} } },
  },
};
vm.createContext(ctx);
vm.runInContext("globalThis.window = globalThis;", ctx);
for (const f of ["shared/bundle.js", "features/translator/isolated/detect.js"]) {
  vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });
}
const discover = ctx.TankiQoL && ctx.TankiQoL.ChatDiscover && ctx.TankiQoL.ChatDiscover.discover;
ok("detect.js exposes its discover()", typeof discover === "function");

const KEYS = ["helper", "cls", "appendFn", "finalizeFn", "offset", "ySub", "zSub", "count", "ptr", "evict"];
const bundles = fs.readdirSync(DIR).filter((f) => /^main\.[a-f0-9]+\.js$/.test(f))
  .sort((a, b) => fs.statSync(path.join(DIR, a)).mtimeMs - fs.statSync(path.join(DIR, b)).mtimeMs);

for (const b of bundles) {
  const r = discover(fs.readFileSync(path.join(DIR, b), "utf8"));
  const whole = !!r && KEYS.every((k) => typeof r[k] === "string" && r[k]) &&
    Array.isArray(r.renderMethods) && r.renderMethods.length === 4;
  ok(b + ": the whole name-set, with four render methods" + (r ? "  " + r.cls + " " + r.offset : ""), whole);
  if (!r) continue;
  // ה-trap הוא השדה שהבנאי כותב, והאימות דורש את כל המתודות
  ok("…the offset field is written as a new object in the class's own ctor",
    new RegExp("function " + r.cls.replace(/\$/g, "\\$") + "\\([^)]*\\)\\{[^]{0,3000}?this\\." + r.offset + "=new ").test(
      fs.readFileSync(path.join(DIR, b), "utf8")));
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
