// שמות המשחק להרנסים: הגילוי המשוגר על הבאנדל החדש ביותר ב-research/.
// לתוסף אין שמות מראש, ולכן גם ההרנסים מקבלים אותם רק מהגילוי.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const RESEARCH = "c:/Users/User/Documents/programming/Tanki Extensions/research";

function newestBundle() {
  return fs.readdirSync(RESEARCH)
    .filter((f) => /^main\.[a-f0-9]+\.js$/.test(f))
    .sort((a, b) => fs.statSync(path.join(RESEARCH, a)).mtimeMs - fs.statSync(path.join(RESEARCH, b)).mtimeMs)
    .pop();
}

// קבצי הגילוי כמו שהם, בהקשר משלהם
function load(files) {
  const ctx = vm.createContext({ console: { log() {} } });
  vm.runInContext("globalThis.window = globalThis;", ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });
  return ctx.window.TankiQoL;
}

function run(label, discover) {
  const got = discover(fs.readFileSync(path.join(RESEARCH, newestBundle()), "utf8"));
  if (!got) throw new Error(label + " discovery failed on " + newestBundle());
  return JSON.parse(JSON.stringify(got));
}

// מה ש-combos/discovery/detect.js שולח ל-MAIN
exports.garage = () => run("garage", load(
  ["parse", "state", "send", "actions", "index"].map((f) => "features/combos/discovery/" + f + ".js"),
).GarageDiscover.discover);

// מה ש-hud/discovery/detect.js שולח ל-MAIN: {names, offsets}
exports.hud = () => run("hud", (src) => {
  const T = load(["features/hud/model/layout.js"].concat(
    ["read", "engine", "roles", "modules", "strategies", "tank", "abilities", "supplies", "texts", "killlog", "assets", "compose"]
      .map((f) => "features/hud/discovery/" + f + ".js")));
  const first = T.HudDiscover.discoverGame(src);
  return first && first.game;
});

exports.newestBundle = newestBundle;
