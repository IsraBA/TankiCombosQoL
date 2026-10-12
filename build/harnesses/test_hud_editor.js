// הבמה של עורך ה-HUD מעל DOM מזויף: בחירה, גרירה, אימות החפיפה והגבולות,
// הסליידרים, undo ואיפוס. הכלל שנבדק חזק מכולם: פעולה לא חוקית לא נשמרת.
// node build/harnesses/test_hud_editor.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { makeFakeDom } = require("./fake_dom");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const FILES = [
  "features/hud/model/elements.js",
  "features/hud/model/geometry.js",
  "features/hud/model/push.js",
  "features/hud/model/overlap.js",
  "features/hud/model/history.js",
  "features/hud/editor/shapes.js",
  "features/hud/editor/stage_rules.js",
  "features/hud/editor/stage.js",
  "features/hud/editor/drag.js",
];

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}
function near(label, got, want, eps) {
  const good = Math.abs(got - want) <= (eps == null ? 1e-6 : eps);
  console.log((good ? "OK  " : "FAIL") + "   " + label);
  if (!good) {
    console.log("       want " + want + "  got " + got);
    failures++;
  }
}

// שלושה רכיבים רחוקים זה מזה, ושניים צמודים כדי לבדוק חפיפה
const BASE = {
  radar: { x: 0.02, y: 0.05, w: 0.1, h: 0.15 },
  status: { x: 0.45, y: 0.01, w: 0.1, h: 0.05 },
  killLog: { x: 0.7, y: 0.2, w: 0.28, h: 0.3 },
  supplies: { x: 0.7, y: 0.88, w: 0.25, h: 0.08 },
  overdrive: { x: 0.05, y: 0.85, w: 0.08, h: 0.12 },
  grenades: { x: 0.2, y: 0.88, w: 0.2, h: 0.08 },
  bars: { x: 0.42, y: 0.9, w: 0.16, h: 0.05 },
  chat: { x: 0.01, y: 0.4, w: 0.25, h: 0.2 },
};

// assets: הכתובות שהגילוי היה מוסר; בלעדיהן העורך נופל לשלד פשוט
function makeEnv(assets) {
  const dom = makeFakeDom();
  const ctx = {
    console: { log() {}, error() {} },
    document: dom.document,
    setTimeout() { return 0; },        // ההבהוב האדום מתפוגג מעצמו; לא נבדק
    clearTimeout() {},
  };
  ctx.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext("globalThis.window = globalThis; window.TankiQoL = {};", ctx);
  if (assets) {
    ctx.window.TankiQoL.HudRecipes = { asset: (name) => assets[name] || null };
  }
  for (const f of FILES) {
    vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });
  }
  const Q = ctx.window.TankiQoL;

  const stageEl = dom.document.createElement("div");
  stageEl._rect = { left: 0, top: 0, width: 1000, height: 500 };
  dom.body.appendChild(stageEl);

  const log = { selections: [], changes: [] };
  const opts = {
    onSelection: (id, ov) => log.selections.push([id, ov]),
    onChange: (layout, elements) => log.changes.push([layout, JSON.parse(JSON.stringify(elements))]),
    onPointerDown() {},
  };
  const stage = Q.HudStage.create(stageEl, opts);
  opts.onPointerDown = Q.HudDrag.attach(stage, stageEl);

  // גרירה: לחיצה, תנועה, שחרור
  function drag(id, dxPx, dyPx) {
    const host = stageEl.querySelectorAll(".cme_hud-shape").find((h) => h.dataset.id === id);
    host.fire("mousedown", { button: 0, clientX: 100, clientY: 100 });
    dom.fire("mousemove", { clientX: 100 + dxPx, clientY: 100 + dyPx });
    dom.fire("mouseup", {});
    return host;
  }

  function shape(id) {
    return stageEl.querySelectorAll(".cme_hud-shape").find((h) => h.dataset.id === id);
  }

  return { Q, dom, stageEl, stage, log, drag, shape };
}

// ---- רינדור לפי פריסה ----

let env = makeEnv();
env.stage.load("default", BASE, {});
let ids = env.stageEl.querySelectorAll(".cme_hud-shape").map((h) => h.dataset.id).sort();
ok("the default layout draws every element it owns",
  ids.join() === "bars,chat,grenades,killLog,overdrive,radar,status,supplies");
ok("each shape is a skeleton plus a frame, never a bare box",
  env.stageEl.querySelectorAll(".cme_hud-sk").length === 8 &&
  env.stageEl.querySelectorAll(".cme_hud-shape-frame").length === 8);
// בלי גילוי אין כתובות ציור, ואז השלד הוא מסגרת בלבד — אבל לעולם לא
// צורה מומצאת שתיראה כמו רכיב אחר
ok("with no artwork discovered a shape falls back to a plain box",
  env.stageEl.querySelectorAll(".cme_hud-sk-plain").length === 7);
// יומן הקרב לא צריך ציור: שורות אחידות, כולן באותו רוחב
const rows = env.shape("killLog").querySelectorAll(".cme_hud-sk-logrow");
ok("the kill log is uniform rows of one width, not the mobile skeleton's tall top block",
  rows.length > 3 && rows.every((r) => r.style.width === "100%" && r.style.height === rows[0].style.height));

// עם גילוי: הציור הוא ה-SVG של המשחק, והחלקים מגיעים מהמתכון
env = makeEnv({
  radar: "https://cdn.example/static/images/radar.abc.svg",
  hudSupplyBackground: "https://cdn.example/static/images/hudSupplyBackground.def.svg",
  Repair: "https://cdn.example/static/images/Repair.123.svg",
});
env.stage.load("default", BASE, {}, {
  supplies: { parts: [
    { kind: "slot", x: 0, y: 0, w: 0.3, h: 1, icon: "Repair" },
    { kind: "slot", x: 0.35, y: 0, w: 0.3, h: 1, icon: null },
    { kind: "ring", x: 0.7, y: 0.2, w: 0.2, h: 0.6 },
  ] },
  status: { parts: [
    { kind: "plate", x: 0, y: 0, w: 0.3, h: 0.48 },
    { kind: "timer", x: 0.32, y: 0, w: 0.36, h: 0.48 },
    { kind: "plate", x: 0.7, y: 0, w: 0.3, h: 0.48 },
    { kind: "block", x: 0.32, y: 0.6, w: 0.36, h: 0.4 },
  ] },
});
// מצב הקרב הוא היחיד בלי SVG, ולכן הוא מצויר מהחלקים שהמתכון נותן
ok("the battle status is two score plates with the timer between them",
  env.shape("status").querySelectorAll(".cme_hud-sk-plate").length === 2 &&
  !!env.shape("status").querySelector(".cme_hud-sk-timer"));
ok("the radar is drawn with the game's own file",
  /radar\.abc\.svg/.test(env.shape("radar").querySelector(".cme_hud-sk").style.backgroundImage || ""));
const sparts = env.shape("supplies").querySelectorAll(".cme_hud-sk-part");
ok("a composed element draws one part per piece the recipe names", sparts.length === 3);
ok("…each placed by the fraction the recipe gives it",
  sparts[1].style.left === "35%" && sparts[1].style.width === "30%");
ok("…a slot carries the game's slot background",
  /hudSupplyBackground/.test(sparts[0].style.backgroundImage || ""));
ok("…and its supply icon on top",
  /Repair\.123\.svg/.test(sparts[0].querySelector(".cme_hud-sk-slot-icon").style.backgroundImage || ""));
ok("a slot with no known icon stays an empty slot",
  !sparts[1].querySelector(".cme_hud-sk-slot-icon"));

env = makeEnv();
env.stage.load("centered", BASE, {});
ids = env.stageEl.querySelectorAll(".cme_hud-shape").map((h) => h.dataset.id).sort();
ok("the centered layout has no separate grenade group", !ids.includes("grenades"));
ok("…and marks the tank-mounted bars as locked",
  env.shape("bars").classList.contains("cme_hud-shape--locked"));

// ---- מיקום על הבמה ----

env = makeEnv();
env.stage.load("default", BASE, {});
let host = env.shape("radar");
ok("a shape is placed as a percentage of the stage, so it survives a resize",
  host.style.left === "2%" && host.style.width === "10%");

// ---- בחירה ----

env.stage.select("radar");
ok("selecting marks the shape", env.shape("radar").classList.contains("cme_hud-shape--selected"));
ok("…and reports the element's current values to the panel",
  env.log.selections.at(-1)[0] === "radar" && env.log.selections.at(-1)[1].scale === 1);

// ---- גרירה ----

env = makeEnv();
env.stage.load("default", BASE, {});
env.drag("radar", 200, 50);
ok("a valid drag is saved", env.log.changes.length === 1);
near("…by exactly the distance dragged, as a fraction of the stage",
  env.log.changes.at(-1)[1].radar.dx, 200 / 1000);
near("…on both axes", env.log.changes.at(-1)[1].radar.dy, 50 / 500);
ok("…and the shape moved with it", env.shape("radar").style.left === 22 + "%");

// גרירה של פחות מ-5 פיקסלים היא לחיצה, לא הזזה
env = makeEnv();
env.stage.load("default", BASE, {});
env.drag("radar", 3, 2);
ok("a 3px twitch is a click, not a drag", env.log.changes.length === 0);

// ---- חפיפה מבטלת ----

env = makeEnv();
env.stage.load("default", BASE, {});
env.drag("radar", 470, 0);           // היישר אל תוך מצב הקרב
ok("a drag that lands on another element is refused", env.log.changes.length === 0);
ok("…and the shape springs back to where it was",
  env.shape("radar").style.left === "2%");
ok("…after flashing red", env.shape("radar").classList.contains("cme_hud-shape--invalid"));

// ---- חפיפה שהמשחק עצמו מתחיל בה ----

// ההילה של האוברדרייב נכנסת לשורת הרימונים כבר בפריסה של המשחק. אם
// חפיפה כזאת הייתה פוסלת, אף אחד משני הרכיפים לא היה זז לעולם.
const TOUCHING = Object.assign({}, BASE, {
  overdrive: { x: 0.05, y: 0.85, w: 0.12, h: 0.12 },
  grenades: { x: 0.14, y: 0.86, w: 0.2, h: 0.1 },
});
env = makeEnv();
env.stage.load("default", TOUCHING, {});
env.drag("overdrive", -12, 0);
ok("a pair the game already overlaps can still be pulled apart", env.log.changes.length === 1);

env = makeEnv();
env.stage.load("default", TOUCHING, {});
env.drag("overdrive", 80, 0);
ok("…but not deeper into its neighbour than the game had it",
  env.log.changes.length === 0);

env = makeEnv();
env.stage.load("default", TOUCHING, {});
env.stage.select("overdrive");
ok("…and growing it past that overlap is refused too",
  env.stage.commit("overdrive", { dx: 0, dy: 0, scale: 1.6, opacity: 1 }) === false);

// ---- גבולות המסך ----

env = makeEnv();
env.stage.load("default", BASE, {});
env.drag("radar", -400, 0);
ok("a drag past the left edge is stopped at the edge, not refused",
  env.log.changes.length === 1);
near("…exactly at the edge", env.log.changes.at(-1)[1].radar.dx, -BASE.radar.x);

// ---- רכיב נעול ----

env = makeEnv();
env.stage.load("centered", BASE, {});
env.drag("bars", 100, 0);
ok("the tank-mounted bars refuse to be dragged", env.log.changes.length === 0);

// ---- גודל ושקיפות ----

env = makeEnv();
env.stage.load("default", BASE, {});
ok("a size that would overlap a neighbour is refused",
  env.stage.commit("bars", { scale: 2, opacity: 1, dx: 0, dy: 0 }) === false);
ok("…while a size that still fits is accepted",
  env.stage.commit("radar", { scale: 1.5, opacity: 1, dx: 0, dy: 0 }) === true);
near("…and is stored", env.log.changes.at(-1)[1].radar.scale, 1.5);
ok("growing an element at the screen edge pushes it inside instead of refusing it",
  env.log.changes.at(-1)[1].radar.dx > 0);
ok("opacity never collides, so it is always accepted",
  env.stage.commit("status", { scale: 1, opacity: 0, dx: 0, dy: 0 }) === true);
ok("…and a fully transparent element is still visible on the stage",
  Number(env.shape("status").style.getPropertyValue("--cme-hud-alpha") || 1) > 0);

// ---- undo ----

env = makeEnv();
env.stage.load("default", BASE, {});
ok("nothing to undo on a fresh session", env.stage.canUndo() === false);
env.drag("radar", 100, 0);
env.drag("overdrive", 50, 0);
ok("…and something after two moves", env.stage.canUndo() === true);
env.stage.undo();
const afterUndo = env.log.changes.at(-1)[1];
ok("undo takes back the last move only",
  !afterUndo.overdrive && !!afterUndo.radar);
env.stage.undo();
ok("…and the one before it", Object.keys(env.log.changes.at(-1)[1]).length === 0);
ok("…until there is nothing left", env.stage.undo() === false);

// ---- איפוס ----

env = makeEnv();
env.stage.load("default", BASE, { radar: { dx: 0.1 }, killLog: { scale: 1.2 } });
ok("saved preferences are shown when the editor opens",
  env.shape("radar").style.left === "12%");
env.stage.reset();
ok("reset clears every element of this layout", Object.keys(env.log.changes.at(-1)[1]).length === 0);
ok("…and puts the shapes back where the game had them",
  env.shape("radar").style.left === "2%");
ok("…and is itself undoable", env.stage.canUndo() === true);
env.stage.undo();
ok("undo after a reset restores the preferences",
  Object.keys(env.log.changes.at(-1)[1]).sort().join() === "killLog,radar");

// ---- הצמדה לאמצע המסך ----

env = makeEnv();
env.stage.load("default", BASE, {});
// מרכז הרדאר ב-x=0.07; גרירה שמביאה אותו 5px מהאמצע נצמדת אליו
env.drag("radar", 430 - 5, 100);
near("a drag that ends near the vertical centre line snaps onto it",
  BASE.radar.x + env.log.changes.at(-1)[1].radar.dx + BASE.radar.w / 2, 0.5, 1e-9);
ok("…and the guide line is hidden again once the drag is over",
  !env.stageEl.querySelector(".cme_hud-guide--on"));
env = makeEnv();
env.stage.load("default", BASE, {});
env.drag("radar", 200, 0);
near("…while one that ends far from it stays where it was dropped",
  env.log.changes.at(-1)[1].radar.dx, 0.2, 1e-9);

// ---- המצבים הפעילים נדחפים על ידי הפסים ----

// הפסים ונקודת הטנק ב-0.7: שורה מעל (0.60–0.63) ושורה מתחת (0.71–0.74)
const TANK = Object.assign({}, BASE, {
  bars: { x: 0.45, y: 0.682, w: 0.1, h: 0.024, px: 0.5, py: 0.75 },
  effects: { x: 0.45, y: 0.646, w: 0.1, h: 0.092, px: 0.5, py: 0.587 },
});
const EFFECTS = { effects: { stack: { on: "bars" }, parts: [
  { kind: "effect", icon: null, x: 0, y: 0, w: 0.3, h: 0.326 },
  { kind: "effect", icon: null, x: 0.35, y: 0.674, w: 0.3, h: 0.326 },
] } };
env = makeEnv();
env.stage.load("centered", TANK, {}, EFFECTS);
const partTop = () => env.shape("effects").querySelectorAll(".cme_hud-sk-part").map((p) => p.style.top);
const before = partTop();
env.stage.select("bars");
ok("growing the bars in the centered layout is accepted",
  env.stage.commit("bars", { dx: 0, dy: 0, scale: 3, opacity: 1 }) === true);
const after = partTop();
ok("…and pushes the rows above and below them apart", before.join() !== after.join());
const eff = env.shape("effects");
const eTop = parseFloat(eff.style.top) / 100, eH = parseFloat(eff.style.height) / 100;
const bars = env.shape("bars");
const bTop = parseFloat(bars.style.top) / 100, bH = parseFloat(bars.style.height) / 100;
const rowBottom = eTop + eH * parseFloat(after[0]) / 100 + 0.092 * 0.326;
ok("…so that the upper row still ends above the grown bars", rowBottom <= bTop + 1e-9);
ok("…and the lower row still starts below them",
  eTop + eH * parseFloat(after[1]) / 100 >= bTop + bH - 1e-9);
ok("the pushed rows cannot be dragged either", (() => {
  const n = env.log.changes.length; env.drag("effects", 50, 0); return env.log.changes.length === n;
})());

// ---- החלפת פריסה מאפסת את ההיסטוריה ----

env.stage.load("centered", BASE, {});
ok("switching layout starts a new editing session", env.stage.canUndo() === false);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
