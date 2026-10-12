// גילוי ה-HUD על כל באנדל שיש ב-research/: השמות של MAIN, מיפוי הרכיבים
// והגיאומטריה. שני בילדים נבדקים גם מול מה שנמדד חי במשחק.
// node build/harnesses/test_hud_builds.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const RESEARCH = "c:/Users/User/Documents/programming/Tanki Extensions/research";
const FILES = ["features/hud/model/layout.js"].concat(
  ["read", "engine", "roles", "modules", "strategies", "tank", "abilities", "supplies", "texts", "assets", "compose"]
    .map((f) => "features/hud/discovery/" + f + ".js"));

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}

const ctx = { console: { log() {} } };
vm.createContext(ctx);
vm.runInContext("globalThis.window = globalThis;", ctx);
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });
}
const discover = ctx.window.TankiQoL.HudDiscover.discover;

// ה-seed של MAIN: אילו שמות צריך, ומה הם בבילד האחרון
const main = { window: {} };
vm.createContext(main);
vm.runInContext("var window = globalThis;" +
  fs.readFileSync(path.join(EXT, "features/hud/capture/game/names.js"), "utf8"), main);
const SEED = main.__HUD.internals;

// כל רכיב חייב אתר הוספה; מצב הקרב — אחד לכל מצב משחק
const ROLES = { status: 5, chat: 1, killLog: 1, radar: 1, overdrive: 1, nukeRing: 1,
  activeSupplies: 1, hpBar: 1, energyBar: 1, supplyRow: 1 };
const ELEMENTS = ["radar", "bars", "effects", "chat", "status", "overdrive", "grenades", "supplies"];

// נמדד חי: 7f05e212 מהקרב של המפתח, f1de53fa מה-POC (research/CLAUDE.md)
const LIVE = {
  "main.7f05e212.js": { 9097271: "status", 9099905: "status", 9102320: "status", 9104826: "status",
    9107266: "status", 9069527: "chat", 7977679: "killLog", 8000400: "radar", 8038021: "overdrive",
    8034140: "nukeRing", 8362191: "activeSupplies", 9153727: "hpBar", 8365273: "energyBar", 7231752: "supplyRow" },
  "main.f1de53fa.js": { 7977434: "killLog", 9069282: "chat", 8000155: "radar", 8037776: "overdrive",
    8033895: "nukeRing", 8361946: "activeSupplies", 9153482: "hpBar", 7231540: "supplyRow",
    8365028: "energyBar", 9102075: "status" },
};

const bundles = fs.readdirSync(RESEARCH).filter((f) => /^main\.\w+\.js$/.test(f))
  .sort((a, b) => fs.statSync(path.join(RESEARCH, a)).mtimeMs - fs.statSync(path.join(RESEARCH, b)).mtimeMs);
ok("there are bundles to test against", bundles.length >= 2);
const latest = bundles[bundles.length - 1];
let reference = null;

for (const b of bundles) {
  console.log("\n-- " + b);
  const got = discover(fs.readFileSync(path.join(RESEARCH, b), "utf8"));
  ok("discovery runs", !!got && !!got.game);
  if (!got || !got.game) continue;
  const { names, offsets } = got.game;

  const missing = Object.keys(SEED.N).filter((k) => names[k] == null);
  ok("every name MAIN needs was found" + (missing.length ? " — missing " + missing.join(",") : ""), !missing.length);
  ok("…and nothing MAIN would not take", Object.keys(names).every((k) => k in SEED.N));

  const tally = {};
  for (const role of Object.values(offsets)) tally[role] = (tally[role] || 0) + 1;
  const wrong = Object.keys(ROLES).filter((r) => tally[r] !== ROLES[r]);
  ok("every element has its add sites" + (wrong.length ? " — off: " + wrong.map((r) => r + "=" + (tally[r] || 0)).join(",") : ""),
    !wrong.length && Object.keys(tally).length === Object.keys(ROLES).length);

  const live = LIVE[b];
  if (live) {
    ok("…at exactly the offsets measured live",
      Object.keys(live).every((at) => offsets[at] === live[at]));
  }

  ok("every canvas element's geometry came out of the bundle",
    ELEMENTS.every((id) => (got.covered || []).includes(id)));
  const layouts = JSON.stringify(got.layouts);
  if (!reference) reference = layouts;
  ok("…the same geometry as the oldest bundle (the HUD has not moved)", layouts === reference);

  if (b === latest) {
    ok("the seed in names.js is this build's names",
      Object.keys(SEED.N).every((k) => JSON.stringify(SEED.N[k]) === JSON.stringify(names[k])));
    ok("…and its offsets", JSON.stringify(Object.keys(SEED.SEED_OFFSETS).sort()) === JSON.stringify(Object.keys(offsets).sort()) &&
      Object.keys(offsets).every((at) => SEED.SEED_OFFSETS[at] === offsets[at]));
  }
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
