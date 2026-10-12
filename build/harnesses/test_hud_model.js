// המודל הטהור של עורך ה-HUD: קטלוג הרכיבים, הגיאומטריה וה-undo.
// מה שנשמר הוא שברים של המסך, ולכן אותה העדפה חייבת לצאת נכון בכל
// רזולוציה ובכל ערך של קנה המידה הכללי של המשחק.
// node build/harnesses/test_hud_model.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const FILES = [
  "features/hud/model/elements.js",
  "features/hud/model/geometry.js",
  "features/hud/model/replay.js",
  "features/hud/model/history.js",
  "features/hud/model/layout.js",
  "features/hud/model/seed.js",
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

const ctx = { console: { log() {} } };
vm.createContext(ctx);
vm.runInContext("globalThis.window = globalThis;", ctx);
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });
}
const Q = ctx.window.TankiQoL;
const E = Q.HudElements, G = Q.HudGeometry, R = Q.HudReplay;

// ---- קטלוג הרכיבים ----

ok("every element declares both layouts' movability", E.LIST.every((e) =>
  e.layouts.every((l) => typeof e.movable[l] === "boolean")));
ok("grenades exist only in the default layout",
  E.byId("grenades").layouts.join() === "default");
ok("the bars cannot be dragged in the centered layout (they ride the tank)",
  E.isMovable("bars", "default") === true && E.isMovable("bars", "centered") === false);
ok("the centered layout offers one supplies row, the default two groups",
  E.forLayout("centered").length + 1 === E.forLayout("default").length);

// יומן הקרב מיישר שורות לימין בתוך אזור ה-HTML שלו; השמאל ריק תמיד
const log = E.visibleBox("killLog", { x: 100, y: 20, w: 600, h: 300 });
ok("the kill log's visible box is the right part of the area the game gives it",
  log.x + log.w === 700 && log.w === 360 && log.y === 20 && log.h === 300);
ok("…while any other element's box is left as it is",
  E.visibleBox("radar", { x: 1, y: 2, w: 3, h: 4 }).w === 3);

// ---- נרמול: חסרים, חריגות, וזיהוי ברירת מחדל ----

const n = E.normalize({ scale: 5, opacity: -1 });
ok("normalize clamps scale to the 50-300% range", n.scale === E.SCALE.max && E.SCALE.max === 3);
ok("…while 300% itself is kept", E.normalize({ scale: 3 }).scale === 3);
ok("…and opacity to 0-100%", n.opacity === 0);
ok("…and fills the missing offsets with zero", n.dx === 0 && n.dy === 0);
ok("an empty override is the default", E.isDefault(E.normalize(undefined)) === true);
ok("…and a moved one is not", E.isDefault({ dx: 0.01 }) === false);

// ---- קנה המידה של המשחק ----

near("ui scale 0 is the game's 0.75", R.ksi(0), 0.75);
near("ui scale 50 is 1", R.ksi(50), 1);
near("ui scale 100 is 1.5", R.ksi(100), 1.5);
near("a record taken at 50 shown at 100 doubles nothing but scales by 1.5",
  R.scaleNow({ scale: 1, uiSize: 50 }, { uiSize: 100 }), 1.5);
near("…and a bigger root font scales with it",
  R.scaleNow({ scale: 1, uiSize: 50, rootFontPx: 16 }, { uiSize: 50, rootFontPx: 20 }), 1.25);

// ---- שחזור המלבנים למסך אחר ----

const REC = {
  layout: "default",
  screen: { w: 1000, h: 500 },
  scale: 1,
  uiSize: 50,
  rootFontPx: 16,
  groups: {
    // שמאל־עליון, מרכז־עליון, ימין־תחתון
    radar: { l: [20, 20, 100, 100], a: [0, 0], k: "linear", px: [20, 20, 100, 100] },
    status: { l: [450, 10, 100, 30], a: [0.5, 0], k: "linear", px: [450, 10, 100, 30] },
    supplies: { l: [800, 440, 180, 40], a: [1, 1], k: "linear", px: [800, 440, 180, 40] },
  },
};

let fit = R.fit(REC, { screen: { w: 1000, h: 500 }, uiSize: 50, rootFontPx: 16 });
near("same screen: the radar lands where it was measured", fit.radar.x * 1000, 20);
near("…at the same size", fit.radar.w * 1000, 100);

fit = R.fit(REC, { screen: { w: 2000, h: 500 }, uiSize: 50, rootFontPx: 16 });
near("a wider screen leaves a left-anchored element alone", fit.radar.x * 2000, 20);
near("…keeps a right-anchored one the same distance from the right edge",
  2000 - (fit.supplies.x + fit.supplies.w) * 2000, 1000 - (800 + 180));
near("…and keeps a centred one centred",
  fit.status.x * 2000 + (fit.status.w * 2000) / 2, 1000);
near("…without changing any size", fit.supplies.w * 2000, 180);

fit = R.fit(REC, { screen: { w: 1000, h: 500 }, uiSize: 100, rootFontPx: 16 });
near("raising the game's UI scale grows the element", fit.radar.w * 1000, 150);
near("…away from its own anchor", fit.radar.x * 1000, 30);

ok("every fitted rect is expressed as a fraction of the screen",
  Object.values(fit).every((r) => r.x >= 0 && r.x <= 1 && r.w > 0 && r.w <= 1));

// ---- הטרנספורמציה של העורך ----

const base = { x: 0.1, y: 0.1, w: 0.2, h: 0.1 };
let t = G.transform(base, { dx: 0.05, dy: 0, scale: 1, opacity: 1 });
near("an offset moves the rect by exactly that fraction", t.x, 0.15);
t = G.transform(base, { dx: 0, dy: 0, scale: 2, opacity: 1 });
near("scaling grows it about its centre — same centre", t.x + t.w / 2, base.x + base.w / 2);
near("…with the size doubled", t.w, 0.4);
// הפסים שעל הטנק מסתובבים סביב נקודת הטנק, שנמצאת ב-3/4 מגובה התיבה
t = G.transform(Object.assign({ px: 0.5, py: 0.75 }, base), { dx: 0, dy: 0, scale: 2, opacity: 1 });
near("a rect that carries its own pivot grows about that point instead", t.y + t.h * 0.75, 0.1 + 0.1 * 0.75);
near("…and still about its centre horizontally", t.x + t.w / 2, base.x + base.w / 2);

// ---- חפיפה וגבולות ----

ok("two separated rects do not overlap",
  G.intersects({ x: 0, y: 0, w: 0.1, h: 0.1 }, { x: 0.2, y: 0, w: 0.1, h: 0.1 }) === false);
ok("…and two touching ones do once a gap is required",
  G.intersects({ x: 0, y: 0, w: 0.1, h: 0.1 }, { x: 0.1, y: 0, w: 0.1, h: 0.1 }, 0.01) === true);
ok("a rect past the right edge is outside",
  G.inside({ x: 0.9, y: 0, w: 0.2, h: 0.1 }) === false);
ok("…and one exactly on the edge is inside",
  G.inside({ x: 0.8, y: 0, w: 0.2, h: 0.1 }) === true);

const clamped = G.clampOffset(base, { dx: 5, dy: -5, scale: 1, opacity: 1 });
near("dragging far right stops at the edge", clamped.dx, 1 - (base.x + base.w));
near("…and far up stops at the top", clamped.dy, -base.y);

// ---- ה-seed: הגיאומטריה שנשלחת עם התוסף ----

const SEED = Q.HudSeed;
ok("a seed slot exists for both layouts",
  SEED && "default" in SEED && "centered" in SEED);
for (const layout of ["default", "centered"]) {
  const rec = SEED[layout];
  if (rec === null) {
    console.log("OK     " + layout + ": not recorded yet — the editor asks for one battle");
    continue;
  }
  ok(layout + ": the seed says which layout it is", rec.layout === layout);
  ok(layout + ": …and the screen it was taken on", rec.screen && rec.screen.w > 0 && rec.screen.h > 0);
  ok(layout + ": …and the game's UI scale at the time", typeof rec.uiSize === "number");
  // הגיאומטריה מגיעה משני מקורות: הגילוי מקוד המשחק, וה-seed להשלמה.
  // אלה מגיעים מהגילוי בלבד ולכן אינם חייבים להופיע במדידה; רכיבי
  // ה-HTML נמדדים מהעותק הנסתר ולא מהקנבס כלל.
  const KNOWN_UNCOVERED = ["status", "chat", "effects"];
  const ids = Object.keys(rec.groups || {}).sort();
  const want = E.forLayout(layout).filter((e) => !e.dom).map((e) => e.id).sort();
  const missing = want.filter((id) => !ids.includes(id) && !KNOWN_UNCOVERED.includes(id));
  if (missing.length) console.log("       missing from the seed: " + missing.join(", "));
  ok(layout + ": …and every element this layout owns, bar the known gaps", missing.length === 0);
  ok(layout + ": every entry carries box, anchors and strategy",
    ids.every((id) => {
      const g = rec.groups[id];
      return Array.isArray(g.l) && g.l.length === 4 && Array.isArray(g.a) && typeof g.k === "string";
    }));
  // המבחן האמיתי: על המסך שנמדד בו, השחזור חייב להחזיר בדיוק את מה
  // שנמדד. הסיווג שנרשם לא תמיד נכון, ולכן העוגן נפתר מהמספרים.
  const same = R.fit(rec, { screen: rec.screen, uiSize: rec.uiSize, rootFontPx: rec.rootFontPx });
  const off = Object.keys(rec.groups).filter((id) => {
    const want = rec.groups[id].px, at = same[id];
    return Math.abs(at.x * rec.screen.w - want[0]) > 0.01 ||
      Math.abs(at.y * rec.screen.h - want[1]) > 0.01;
  });
  if (off.length) console.log("       not reproduced: " + off.join(", "));
  ok(layout + ": …onto the very screen it was taken on, to the pixel", off.length === 0);

  const fitted = R.fit(rec, { screen: { w: 2560, h: 1440 }, uiSize: rec.uiSize, rootFontPx: rec.rootFontPx });
  ok(layout + ": it replays onto a different screen inside the bounds",
    Object.values(fitted).every((r) => r.x > -0.01 && r.y > -0.01 && r.x + r.w < 1.01 && r.y + r.h < 1.01));
}

// ---- אלגברת המתכונים: הגדלה סביב המרכז ואיחוד ----

const LY = Q.HudLayout;
const W = 1000, H = 500;
const cells = (r) => {
  const b = LY.compose(r, W, H);
  return [b.x, b.y, b.x + b.w, b.y + b.h];
};

for (const xop of ["left", "right", "center"]) {
  for (const yop of ["top", "bottom", "center"]) {
    const r = { k: "iy", a: [0, 0], w: 40, h: 20, x: { op: xop, off: 30 }, y: { op: yop, off: 10 } };
    const before = cells(r), after = cells(LY.resize(r, 80, 40));
    const label = xop + "/" + yop;
    near(label + ": resizing keeps the centre still (x)",
      (after[0] + after[2]) / 2, (before[0] + before[2]) / 2);
    near("…(y)", (after[1] + after[3]) / 2, (before[1] + before[3]) / 2);
    near("…and grows to the size asked for", after[2] - after[0], 80);
  }
}

const a = { k: "ry", a: [0, 1], w: 24, h: 24, x: { op: "left", off: 100 }, y: { op: "bottom", off: -50 } };
const b = { k: "ry", a: [0, 1], w: 60, h: 10, x: { op: "left", off: 150 }, y: { op: "bottom", off: -10 } };
const u = LY.union(a, b);
const ua = cells(a), ub = cells(b), uu = cells(u);
ok("the union of two boxes spans both",
  uu[0] === Math.min(ua[0], ub[0]) && uu[1] === Math.min(ua[1], ub[1]) &&
  uu[2] === Math.max(ua[2], ub[2]) && uu[3] === Math.max(ua[3], ub[3]));

const wide = LY.compose(u, W * 2, H);
ok("…and the union holds on a different screen too",
  wide.x === Math.min(LY.compose(a, W * 2, H).x, LY.compose(b, W * 2, H).x) && wide.w === u.w);

ok("boxes with different strategies refuse to merge",
  LY.union(a, Object.assign({}, b, { k: "iy" })) === null);
ok("…and so do boxes anchored to different edges",
  LY.union(a, Object.assign({}, b, { x: { op: "right", off: 0 } })) === null);
ok("a union with nothing is the box itself", LY.union(a, null) === a && LY.union(null, b) === b);

// ---- undo ----

const h = Q.HudHistory.create();
ok("a fresh history has nothing to undo", h.undo() === null);
const snap = { radar: { dx: 0.1 } };
h.push(snap);
snap.radar.dx = 0.9;   // הדחיפה חייבת להיות עותק
const back = h.undo();
ok("undo returns the state as it was pushed, not a live reference", back.radar.dx === 0.1);
ok("…and the stack empties", h.size() === 0);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
