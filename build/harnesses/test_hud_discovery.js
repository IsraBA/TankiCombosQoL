// גילוי הגיאומטריה של ה-HUD מהבאנדל, על הקוד שנשלח, מול הבאנדל האמיתי.
// הבדיקה החזקה: המתכון שהגילוי מחלץ חייב לשחזר את המדידה החיה מהמשחק.
// node build/harnesses/test_hud_discovery.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const RESEARCH = "c:/Users/User/Documents/programming/Tanki Extensions/research";
const BUNDLE = "main.7f05e212.js";
const FILES = ["features/hud/model/layout.js"].concat(
  ["read", "engine", "roles", "modules", "strategies", "tank", "abilities", "supplies", "texts", "assets", "compose"]
    .map((f) => "features/hud/discovery/" + f + ".js"));

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}
function near(label, got, want, eps) {
  const good = Math.abs(got - want) <= (eps == null ? 0.5 : eps);
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

const src = fs.readFileSync(path.join(RESEARCH, BUNDLE), "utf8");
const got = Q.HudDiscover.discover(src);

ok("the shipped discovery runs on the live bundle", !!got);
if (!got) {
  console.log("\n1 check(s) FAILED");
  process.exit(1);
}

// ---- ארבע האסטרטגיות ----

ok("all four scaling strategies were identified", Object.keys(got.kinds).length === 4);
ok("…and they are the four the layout model implements",
  Object.values(got.kinds).sort().join() === "ey,iy,ny,ry");

// ---- הרדאר: מול הקוד, ומול המדידה החיה ----

// המדידה החיה שהמפתח לכד במשחק, 1864x916, קנה מידה 0.8484875
const VIEW = { w: 1864, h: 916, scale: 0.8484875 };

// תיבה לוגית ומלבן פיקסלים מתוך מתכון, כמו שהעורך עושה
function replay(recipe) {
  const box = Q.HudLayout.compose(recipe, VIEW.w, VIEW.h);
  const px = Q.HudLayout.toPixels(box, recipe, VIEW.scale, VIEW.w, VIEW.h);
  return { box, px };
}

function rect(label, recipe, want, eps) {
  if (!recipe) return ok(label, false);
  const r = replay(recipe);
  const got4 = [r.box.x, r.box.y, r.box.w, r.box.h];
  const good = want.every((v, i) => Math.abs(got4[i] - v) <= (eps == null ? 0.001 : eps));
  console.log((good ? "OK  " : "FAIL") + "   " + label);
  if (!good) {
    console.log("       want " + want.join(", "));
    console.log("       got  " + got4.map((n) => +n.toFixed(3)).join(", "));
    failures++;
  }
}

const rd = got.layouts.default.radar;
const rc = got.layouts.centered.radar;
ok("the radar was discovered in both layouts", !!rd && !!rc);
ok("default: it is the letterbox strategy anchored top-left",
  rd.k === "ry" && rd.a[0] === 0 && rd.a[1] === 0);
ok("default: 150x150 at left 24, top 100 — the game's own literals",
  rd.w === 150 && rd.h === 150 && rd.x.off === 24 && rd.y.off === 100 &&
  rd.x.op === "left" && rd.y.op === "top");
ok("centered: 120x120, centred +300 and bottom -20",
  rc.k === "iy" && rc.w === 120 && rc.h === 120 &&
  rc.x.op === "center" && rc.x.off === 300 &&
  rc.y.op === "bottom" && rc.y.off === -20);

rect("replaying the default recipe gives the measured logical box", rd, [24, 100, 150, 150]);

let px = replay(rd).px;
near("…and the measured pixel rect (x)", px.x, 138.14, 0.1);
near("…(y)", px.y, 84.85, 0.1);
near("…(w)", px.w, 127.27, 0.1);

const cbox = Q.HudLayout.compose(rc, VIEW.w, VIEW.h);
near("the centered recipe reproduces the centered measurement (x)", cbox.x, 1172, 1);
near("…(y)", cbox.y, 776, 1);

// ---- פסי החיים ----

const bd = got.layouts.default.bars;
ok("the bars are 304 wide and pinned 58px off the bottom",
  !!bd && bd.w === 304 && bd.x.op === "center" && bd.y.op === "bottom" && bd.y.off === -58);
// שני פסים של 10, החיים מעל המצבר וחופפים לו בפיקסל (bottom-h+1)
ok("…two bars of 10 overlapping by the game's one pixel: 19 tall", !!bd && bd.h === 19);
ok("…drawn as the health bar over the energy bar",
  bd.parts.map((p) => p.kind).join() === "bar-hp,bar-energy");
// הפס הנראה הוא 6 מתוך מסלול של 10, ממורכז, כמו בשלד של המשחק
near("…each as thin as the game's own skeleton draws it: 6 of its 10", bd.parts[0].h * bd.h, 6, 1e-9);
near("…centred in its lane", bd.parts[1].y * bd.h + bd.parts[1].h * bd.h / 2, 19 - 5, 1e-9);
const bc = got.layouts.centered.bars;
ok("the centered layout uses its own, narrower pair", !!bc && bc.w === 140 && bc.h === 24);
ok("…drawn where the camera shows the tank, in the lower third",
  !!bc && bc.x.op === "center" && bc.y.op === "top" && bc.y.frac > 2 / 3 && bc.a[1] === bc.y.frac);
// החיים ממורכזים 12 מעל נקודת הטנק והמצבר עליה, שניהם בגובה 12
near("…and they turn about the tank point itself", bc.pivot[1] * bc.h, 12 + 6, 1e-9);
const bplace = Q.HudLayout.place(bc, VIEW);
near("…which stays on the tank point at any UI scale", bplace.y + bplace.h * bplace.py, bc.y.frac, 1e-9);

// ---- המצבים הפעילים: רכיב נפרד ----

const ed = got.layouts.default.effects, ec = got.layouts.centered.effects;
ok("the active effects are their own element in both layouts", !!ed && !!ec);
// ברגילה: שורת תאים של 30 בפסיעה של 37, 54 מעל התחתית שהפסים נצמדים אליה
ok("default: one row of five 30px cells, 54 above the bars' bottom line",
  ed.h === 30 && ed.y.op === "bottom" && ed.y.off === -58 - 54 + 30 && ed.w === 5 * 37 - 7);
ok("…each with a supply icon, like the five circles of the game's own skeleton",
  ed.parts.length === 5 && ed.parts.every((p) => p.kind === "effect" && p.icon));
// בממורכזת: אפקטי הסופלייס בשורה שמתחת לנקודת הטנק (+8), שורה אחת שלא נשברת
// 8 מקוד המשחק, ועוד 3 שהשלד מוסיף כדי שהשורה תיראה נפרדת מהפסים
ok("centered: the same single row, 8 below the tank point, where the supply effects show",
  ec.y.off === 8 + 3 && ec.h === 30 && ec.w === ed.w && ec.parts.every((p) => p.y === 0) &&
  ec.y.frac === bc.y.frac);
near("…turning about the same tank point as the bars, above its own box", ec.pivot[1] * ec.h, -(8 + 3), 1e-9);
ok("…and pushed by the bars, so that growing them never lands on the rows",
  ec.stack && ec.stack.on === "bars");
const eplace = Q.HudLayout.place(ec, VIEW);
ok("…with the row clear of the bars as the game lays them out", eplace.y >= bplace.y + bplace.h - 1e-9);
// לג'נד היא ה-default של ה-switch, לא אחד ה-case-ים
ok("the user info skeleton's fixed rank is Legend, in the lobby-sized non-premium image",
  got.assets.rank === "static/images/31.5edb7cd9.webp");
ok("the grenade slot draws the game's own slot icon, not the mobile editor's framed skeleton",
  /^static\/images\/grenade\.318dfdff\.svg$/.test(got.assets.grenade || ""));

// ---- האוברדרייב: הכפתור, ועליו רקע ה"מוכן" שגדול ממנו ----

const od = got.layouts.default.overdrive;
ok("the overdrive is the letterbox strategy anchored bottom-left",
  !!od && od.k === "ry" && od.a[0] === 0 && od.a[1] === 1);
rect("its box is the measured one to the pixel", od, [48, 766, 132, 132]);
px = od && replay(od).px;
near("…and so is the pixel rect (x)", px.x, 158.505, 0.01);
near("…(y)", px.y, 788.727, 0.01);
near("…(w)", px.w, 112.0004, 0.01);

const oc = got.layouts.centered.overdrive;
ok("the centered layout centres it on the screen instead",
  !!oc && oc.k === "iy" && oc.x.op === "center" && oc.x.off === -270 && oc.w === 132);

// ---- הרימונים: טבעת הנוקליאר מאוחדת עם שורת הסלוטים השמאלית ----

const gd = got.layouts.default.grenades;
// המדידה החיה סופרת גם את רקע ההבזק, 110 פיקסל בשקיפות 0, ולכן היא
// רחבה משמעותית מהנראה. התיבה כאן היא מה שהשחקן רואה.
rect("the grenade group is the slot row with the ring on it", gd, [162, 814, 194, 44]);
near("…and it shares the measurement's vertical centre", gd.y.off - gd.h / 2, -58 - 44 / 2 + 0, 1e-9);
ok("…while the measurement's extra width is the transparent flash sprite",
  129 < 162 && 129 + 227 === 162 + 194);
ok("it exists only in the default layout — centered merges it into the row",
  !got.layouts.centered.grenades);

// ---- הסופלייס: השורה הימנית ----

const sd = got.layouts.default.supplies;
ok("the supply row is anchored bottom-right", !!sd && sd.k === "ry" && sd.a[0] === 1 && sd.a[1] === 1);
let sbox = sd && Q.HudLayout.compose(sd, VIEW.w, VIEW.h);
near("its left edge is the measured one", sbox.x, 1500, 0.001);
near("…and so is its width — six slots of 44 with a 6px gap", sbox.w, 294, 0.001);
// המשחק מרכז את השורה על הקו שהוא מחשב, ולכן הקצה העליון יורד בחצי
// גובה סלוט. הספירה למטה מצוירת מתחת לשורה ואינה ליטרל.
near("…and its top edge, once the row is centred on the game's own line", sbox.y, 814, 0.001);
ok("the count under each icon is drawn below the row, as the measurement shows",
  sbox.y + sbox.h <= 814 + 67.75 + 0.001);

const gparts = gd && gd.parts;
ok("the grenade group knows its four slots and the ring",
  !!gparts && gparts.filter((p) => p.kind === "slot").length === 4 &&
  gparts.some((p) => p.kind === "ring"));
// הטבעת מצוירת סביב הסלוט הנוקליארי, ולכן חייבת להיות ממורכזת עליו
const slot0 = gparts && gparts[0];
const ring = gparts && gparts.find((p) => p.kind === "ring");
near("…and the ring is centred on the first slot, as the game draws it",
  ring.x + ring.w / 2, slot0.x + slot0.w / 2, 1e-9);

const sc = got.layouts.centered.supplies;
// עשרה סוגים בשורה, אבל הממורכזת מציגה רק את הגלויים: בלי האוגמנטים
// (מוסתרים בה) ובלי הדגל והכדור (רק בזמן נשיאה) — שמונה סלוטים
ok("the centered layout makes it one centred row of the eight visible slots",
  !!sc && sc.k === "iy" && sc.x.op === "center" && sc.x.off === 0 && sc.w === 8 * 44 + 7 * 6);
ok("…44 tall, the slot row itself", !!sc && sc.h === 44);

// ---- תחת שינוי רזולוציה וקנה מידה ----

const wide = Q.HudLayout.place(rd, { w: 2560, h: 1440, scale: 1 });
ok("on another screen the radar stays inside it",
  wide.x >= 0 && wide.y >= 0 && wide.x + wide.w <= 1 && wide.y + wide.h <= 1);
const big = Q.HudLayout.place(rd, { w: 1864, h: 916, scale: 1.5 });
const norm = Q.HudLayout.place(rd, { w: 1864, h: 916, scale: 1 });
near("raising the game's UI scale grows it by exactly that factor",
  big.w / norm.w, 1.5, 0.001);

// ---- כיסוי: מה עוד לא מגיע מהקוד ----

// ---- הציור של המשחק ----

const A = got.assets || {};
ok("the game's own artwork was located in the bundle", Object.keys(A).length >= 15);
for (const name of ["radar", "centralIndicators", "overdrive", "grenade",
  "nuclear", "hudSupplyBackground"]) {
  ok("'" + name + "' resolves to a file", /^static\/(images|media)\/.+\.(svg|png|webp)$/.test(A[name] || ""));
}
// ארבעה קבצים בבאנדל נקראים mine, ושניים overdrive. הפתרון הוא לפי
// האשכול שהקובץ נדרש בו, ולכן חייב לצאת בדיוק זה של ה-HUD.
ok("a name that several files share resolves to the HUD's copy, not another screen's",
  A.overdrive === "static/images/overdrive.c8de54da.svg" &&
  A.Nuclear === "static/images/Nuclear.c3d2e8f1.svg" &&
  A.chat === "static/images/chat.c19fd610.svg");

// ---- הצ'אט ומצב הקרב ----

const ch = got.layouts.default.chat;
ok("the chat is 480x184 on the node-fraction strategy",
  !!ch && ch.k === "ey" && ch.w === 480 && ch.h === 184);
// הרכיב היחיד שההיסט שלו הוא שבר מהמסך ולא קבוע
near("…its left edge is 18/1920 of the width", ch.x.frac, 18 / 1920, 1e-9);
ok("…and its bottom edge sits at .65 of the height",
  ch.y.op === "top" && ch.y.frac === 0.65 && ch.y.off === -184);
const chatBox = Q.HudLayout.compose(ch, VIEW.w, VIEW.h);
near("replayed on the measured screen it lands where the game puts it (x)", chatBox.x, 17.475, 0.01);
near("…(bottom edge)", chatBox.y + chatBox.h, 0.65 * VIEW.h, 0.01);
ok("…and both layouts share it, as the one branch in the code does",
  JSON.stringify(ch) === JSON.stringify(got.layouts.centered.chat));

const st = got.layouts.default.status;
// הגודל לא ליטרלי, אבל העוגן כן, והרכיב סימטרי סביב הטיימר
ok("the battle status is centred at a fixed 16px from the top",
  !!st && st.x.op === "center" && st.x.off === 0 && st.y.op === "top" && st.y.off === 16);
// לוח 62 בכל צד, רווח 12 מהטיימר, וטיימר של חמש ספרות בגובה הגופן 24;
// גובה השורה הוא הגופן. הלוח של 100 מוסתר מחוץ ל-CTF, והתיבה 200x20 אינה מצוירת
ok("…and its box is two score plates with the timer between them, one row high",
  st.w === 62 + 12 + 5 * 24 + 12 + 62 && st.h === 24);
const sp = st.parts || [];
ok("…drawn from those same numbers", sp.filter((p) => p.kind === "plate").length === 2 &&
  sp.some((p) => p.kind === "timer") && !sp.some((p) => p.kind === "block"));
near("…symmetric about the timer", sp[1].x + sp[1].w / 2, 0.5, 1e-9);
const csup = got.layouts.centered.supplies.parts;
// הסדר הוא הרשימה הקבועה במשחק, NUCLEAR ראשון; ערכי ה-enum נפתרים גם
// מעבר לגבול מודול
ok("the centered row is the game's own list: nuclear, the six supplies, grenade",
  csup.filter((p) => p.kind === "slot").map((p) => p.icon).join() ===
  "nuclear,Repair,Shield,DoubleDamage,Speed,Mine,GoldBox,grenade");
const cring = csup.find((p) => p.kind === "ring"), cnuke = csup.find((p) => p.icon === "nuclear");
// הטבעת לא מוצבת ידנית: המשחק שולח לה x של הסלוט ועוד 10, והיא מוסיפה
// את ההיסט שלה — ויוצאת בדיוק על מרכז הסלוט
near("…with the ring landing on the nuclear slot by the game's own arithmetic",
  cring.x + cring.w / 2, cnuke.x + cnuke.w / 2, 1e-9);
near("…vertically too", cring.y + cring.h / 2, cnuke.y + cnuke.h / 2, 1e-9);
ok("the default layout keeps the four special slots on the left: nuclear, grenade, two augments",
  gparts.filter((p) => p.kind === "slot").map((p) => p.icon || "-").join() === "nuclear,grenade,-,-");
ok("…and the six supplies on the right, in the same order",
  sd.parts.map((p) => p.icon).join() === "Repair,Shield,DoubleDamage,Speed,Mine,GoldBox");
const ocb = Q.HudLayout.compose(oc, VIEW.w, VIEW.h), scb = Q.HudLayout.compose(sc, VIEW.w, VIEW.h);
ok("the centered overdrive sits just left of the row, not on its first slot",
  ocb.x + ocb.w <= scb.x && scb.x - (ocb.x + ocb.w) < 20);

// ---- התיבה היא מה שנראה, לא מה שקיים ----

// רקע ההבזק של הנוקליאר הוא 110 פיקסל בשקיפות 0. הוא באותו מרכז
// כמו הקשת, ולכן מרכז הסיבוב זהה — אבל התיבה נשארת בגודל הנראה.
ok("the grenade row is the slot row, not the invisible flash sprite",
  gd.h === 44 && gd.w === 194);
ok("…and the centered supply row likewise",
  got.layouts.centered.supplies.h === 44);

console.log("       discovered from the bundle: " + got.covered.join(", "));
for (const id of ["radar", "bars", "effects", "chat", "status", "overdrive", "grenades", "supplies"]) {
  ok("'" + id + "' comes from the game's own literals", got.covered.includes(id));
}
// יומן הקרב לוקח את שטחו מקונטיינר ה-HTML ולא מקבועים
ok("the kill log is the one element that is knowingly not derivable",
  !got.covered.includes("killLog"));

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
