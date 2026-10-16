// מריץ את גילוי שדות הקרב של ה-advisor מול כל הבאנדלים,
// ומוודא שכל ארבעת השדות נמצאים — לתוסף אין שמות מראש.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const DIR = "c:/Users/User/Documents/programming/Tanki Extensions/research";

// discover() המשוגר, כמו שהוא
const ctx = vm.createContext({ console });
vm.runInContext("globalThis.window = globalThis;", ctx);
vm.runInContext(
  fs.readFileSync(path.join(EXT, "features/advisor/recon/discover.js"), "utf8"),
  ctx,
  { filename: "discover.js" },
);
const discover = vm.runInContext("window.TankiQoL.AdvisorDiscover.discover", ctx);

const KEYS = ["battleUsers", "battleStatistics", "localBattleUserState", "user"];

let pass = 0,
  fail = 0;
for (const b of fs
  .readdirSync(DIR)
  .filter((f) => /^main\.[a-f0-9]+\.js$/.test(f))) {
  const src = fs.readFileSync(path.join(DIR, b), "utf8");
  const t0 = Date.now();
  const r = discover(src);
  const ms = Date.now() - t0;

  if (!r) {
    console.log(`FAIL ${b}: discover() returned null`);
    fail++;
    continue;
  }
  const missing = KEYS.filter((k) => !r[k]);
  const ok = missing.length === 0;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${b} (${ms}ms) ` +
      KEYS.map((k) => `${k}=${r[k]}`).join(" "),
  );
  if (missing.length) console.log("       missing:", missing.join(", "));
  ok ? pass++ : fail++;
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
