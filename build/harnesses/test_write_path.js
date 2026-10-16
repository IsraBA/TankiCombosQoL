// מריץ את garage_state.js **המשוגר** בתוך sandbox עם מצב-משחק מזויף, ומאמת
// את לוגיקת ההחלה של ההגנות: איזה פעולות משוגרות, באיזה סדר, ובעיקר —
// שחריץ שכבר מחזיק את הפריט הנכון לא נוגעים בו בכלל (אופטימיזציית ה-diff).
//
// למה sandbox ולא בדיקת לוגיקה משוכפלת: כך נבדק הקוד האמיתי, כולל סריקת
// הגרף, ה-trap שתופס את ה-state, ואיתור הבנאים לפי שם.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const BASE =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL/features/combos/";
// כל קבצי עולם MAIN, בסדר הטעינה של ה-manifest
const FILES = [
  "discovery/game/names.js",
  "capture/game/kotlin.js",
  "capture/game/collect.js",
  "capture/game/capture.js",
  "equip/game/store.js",
  "equip/game/mount.js",
  "equip/game/protections.js",
  "equip/game/devices.js",
  "equip/game/device_catalog.js",
  "equip/game/skins.js",
  "equip/game/cooldown.js",
  "randomizer/game/draw.js",
  "save/game/read.js",
  "equip/game/apply.js",
  "bridge/game/bridge_main.js",
  "discovery/game/boot.js",
];

const ctx = vm.createContext({ console, setTimeout, Date });
vm.runInContext(
  `
  globalThis.window = globalThis;
  window.addEventListener = function () {};
  window.postMessage = function () {};
`,
  ctx,
);
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(BASE + f, "utf8"), ctx, {
    filename: f.split("/").pop(),
  });
}
// לתוסף אין שמות מראש: מה שהגילוי מוצא בבאנדל החדש ביותר
vm.runInContext("__CMB.internals.applyNames(" + JSON.stringify(require("./game_names").garage()) + ")", ctx);

// --- בונים מצב-משחק מזויף בתוך ה-sandbox (חייב להיווצר שם, כדי שה-trap יירה) ---
const setup = `
(function () {
  const S = __CMB.names();          // השמות מהגילוי
  const SF = S.stateFields, IF = S.itemFields;

  const dispatched = [];
  globalThis.__dispatched = dispatched;

  // הבנאים המזויפים של הפעולות, בשמות המחלקה שהגילוי מצא
  const RA = S.resistApplyFields, RU = S.resistUnmountFields;
  const DI = S.deviceInsertFields, DR = S.deviceRemoveFields;
  const SK = S.skinMountFields;
  const mk = new Function('RA', 'RU', 'DI', 'DR', 'SK',
    'const ' + S.resistApplyClass + ' = function (t, n, i) { this[RA.resistance]=t; this[RA.index]=n; this[RA.needServerMount]=i; };' +
    'const ' + S.resistUnmountClass + ' = function (t, n) { this[RU.resistance]=t; this[RU.needServerUnmount]=n; };' +
    'const ' + S.deviceInsertClass + ' = function (t, n) { this[DI.device]=t; this[DI.item]=n; };' +
    'const ' + S.deviceRemoveClass + ' = function (t, n) { this[DR.device]=t; this[DR.item]=n; };' +
    'const ' + S.skinMountClass + ' = function (t, n) { this[SK.skin]=t; this[SK.item]=n; };' +
    'return { apply: ' + S.resistApplyClass + ', unmount: ' + S.resistUnmountClass +
    ', insert: ' + S.deviceInsertClass + ', remove: ' + S.deviceRemoveClass +
    ', skin: ' + S.skinMountClass + ' };')(RA, RU, DI, DR, SK);

  // חנות מזויפת: uap רושמת את הפעולה
  const store = {
    uap(action) { dispatched.push(action); },
    // כאן findCtorByName ימצא את הבנאים
    actions: { a: mk.apply, u: mk.unmount, i: mk.insert, r: mk.remove, s: mk.skin },
  };
  function Controller() { this.hvr_1 = store; }
  Controller.prototype.doA = function () { this.hvr_1.uap(new Object()); };
  Controller.prototype.doB = function () { this.hvr_1.uap(new Object()); };
  const controller = new Controller();

  // proxy מזויף: הפרוטוטייפ חייב לשאת את כל 4 מתודות השליחה
  function Proxy_() {}
  for (const m of S.proxyMethods) Proxy_.prototype[m] = function () {};
  const proxy = new Proxy_();
  proxy[S.proxyCcField] = controller;
  proxy[S.proxyTrapField] = 1;              // <-- מפעיל את המלכודת

  // פריטים: 5 הגנות, שלוש מהן מורכבות בחריצים 0,1,2
  let seq = 0;
  function item(name, cat, mounted, idx) {
    const o = {};
    o[IF.id] = 'id' + (++seq);
    o[IF.name] = name;
    o[IF.category] = cat;
    o[IF.mounted] = mounted;
    o[IF.mountIndex] = idx;
    o[IF.owned] = true;
    return o;
  }
  const items = [
    item('RAILGUN_RES', 'RESISTANCE_MODULE', true,  0),   // id1
    item('ISIS_RES',    'RESISTANCE_MODULE', true,  1),   // id2
    item('THUNDER_RES', 'RESISTANCE_MODULE', true,  2),   // id3
    item('SMOKY_RES',   'RESISTANCE_MODULE', false, -1),  // id4
    item('FREEZE_RES',  'RESISTANCE_MODULE', false, -1),  // id5
    item('Firebird',    'WEAPON',            true,  0),   // id6
    item('Hornet',      'ARMOR',             true,  0),   // id7
    item('Gold skin',   'SKIN',              false, -1),  // id8
    item('Neon skin',   'SKIN',              false, -1),  // id9
    item('Shop skin',   'SKIN',              false, -1),  // id10 — למכירה
  ];
  items[9][IF.owned] = false;
  // התותח כבר נושא את הסקין הראשון
  items[5][IF.mountedSkin] = 'id8';

  // אוגמנטים. השיוך לפריט הוא לפי baseItemId — ולפריט לא משודרג זהו
  // המזהה שלו עצמו, שזה בדיוק המצב כאן.
  // state.devices הוא **הקטלוג המלא** של כל פריט — קנויים ולא-קנויים יחד
  // (כמו במשחק). הבעלות היא השדה infinityLifetimeItem, לא המיקום.
  // מזהים מפורשים, לא מהמונה המשותף — כדי שהוספת פריט לא תזיז אותם
  const DF = S.deviceFields;
  function device(id, name, baseItemId, installed, owned) {
    const o = {};
    o[DF.id] = id;
    o[DF.baseItemId] = baseItemId;
    o[DF.installed] = installed;
    o[DF.name] = name;
    o[DF.category] = 'DEVICE';
    o[DF.infinityLifetimeItem] = owned !== false;
    return o;
  }
  const devices = [
    device('dev1', 'Pulsar',    'id6', true),           // מותקן על התותח
    device('dev2', 'Overdrive', 'id6', false),          // קנוי, זמין לתותח
    device('dev3', 'Shield',    'id7', false),          // קנוי, זמין לגוף
    // בקטלוג אך לא קנוי — בדיוק המקרה שצויד בטעות: ההסרה בוצעה, ההתקנה
    // נדחתה בשרת, והמשתמש נשאר בלי אוגמנט עד ריענון.
    device('dev9', 'ForSale',   'id6', false, false),
  ];

  // ה-state: חייב לשאת את כל שדות ה-state המוכרים, והשדה האחרון נכתב אחרון
  // המוסך מחזיק את אותו פריט פעמיים: העותק שבבעלות, ועותק "למכירה"
  // עם owned=false. נמדד חי — 113 מזהי סקין כפולים. הכפילויות יושבות
  // בענף שנסרק *אחרי* items, ולכן דריסה תמימה נותנת את הלא-קנוי.
  const marketDupes = [];
  for (const src of [items[7], items[8]]) {     // Gold skin, Neon skin
    const copy = {};
    for (const k of Object.keys(src)) copy[k] = src[k];
    copy[IF.owned] = false;
    marketDupes.push(copy);
  }

  const state = {};
  const order = Object.values(SF);
  for (const f of order) state[f] = null;
  state[SF.items] = items;
  state[SF.itemsOnDepot] = marketDupes;
  state[SF.devices] = devices;
  delete state[S.trapField];
  state[S.trapField] = true;        // <-- מפעיל את המלכודת של ה-state

  return { ids: items.map((i) => i[IF.id]), devices: devices.map((d) => d[DF.id]) };
})()
`;

const info = vm.runInContext(setup, ctx);
console.log("fake state built, item ids:", info.ids.join(", "));

const state = vm.runInContext(
  "({ captured: !!__CMB.internals.latestState, proxyCaptured: !!__CMB.internals.garageProxy, store: __CMB.internals.findStore() ? __CMB.debug.storeFound : null })",
  ctx,
);
console.log(
  "captured:",
  state.captured,
  " proxy:",
  state.proxyCaptured,
  " store:",
  state.store,
);

let failures = 0;
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) {
    console.log("        got : " + JSON.stringify(got));
    console.log("        want: " + JSON.stringify(want));
    failures++;
  }
}

function run(desired) {
  vm.runInContext("__dispatched.length = 0", ctx);
  const r = vm.runInContext(
    "__CMB.internals.applyProtections(" + JSON.stringify(desired) + ")",
    ctx,
  );
  const seen = vm.runInContext(
    `
    __dispatched.map(function (a) {
      const S = __CMB.names(), RA = S.resistApplyFields, RU = S.resistUnmountFields, IF = S.itemFields;
      if (a[RA.index] !== undefined && a[RA.needServerMount] !== undefined)
        return 'mount ' + a[RA.resistance][IF.name] + '@' + a[RA.index] + ':' + a[RA.needServerMount];
      return 'unmount ' + a[RU.resistance][IF.name] + ':' + a[RU.needServerUnmount];
    })`,
    ctx,
  );
  return { r, seen };
}

console.log(
  "\ncurrent slots:",
  JSON.stringify(
    vm.runInContext(
      "__CMB.internals.currentProtectionSlots().map(function (it) { const F = __CMB.names().itemFields; return it ? it[F.name] : null; })",
      ctx,
    ),
  ),
);

// 1. אותו מצב בדיוק -> אף פעולה, 3 חריצים ללא נגיעה
let out = run(["id1", "id2", "id3", null]);
check("identical state dispatches nothing", out.seen, []);
check("  … and reports 3 untouched slots", out.r.plan.untouched, 3);

// 1b. **אותן הגנות בסדר הפוך** -> גם כן אף פעולה. החריצים מתחלפים ביניהם
//     ואין להם משמעות במשחק, ולכן שינוי סדר בלבד אינו שינוי כלל. גרסה
//     מוקדמת השוותה חריץ מול חריץ והפכה את זה ל-8 פעולות מיותרות.
out = run(["id3", "id2", "id1", null]);
check("same set, reordered, dispatches nothing", out.seen, []);
check("  … and all 3 count as untouched", out.r.plan.untouched, 3);

// 1c. אותה קבוצה, סדר אחר, וגם החריץ הריק זז
out = run([null, "id3", "id1", "id2"]);
check("same set with the empty slot moved dispatches nothing", out.seen, []);

// 2. החלפה בהגנה אחת -> הסרה אחת + הרכבה אחת, והשאר ללא נגיעה
out = run(["id1", "id4", "id3", null]);
check("one module swapped", out.seen, [
  "unmount ISIS_RES:true",
  "mount SMOKY_RES@1:true",
]);
check("  … 2 slots untouched", out.r.plan.untouched, 2);

// 2b. אותה החלפה, אבל ההגנה החדשה רשומה בקומבו בחריץ 0 — שתפוס ע"י הגנה
//     שנשארת. לכן היא הולכת לחריץ שהתפנה, ולא מזיזה כלום אחר.
out = run(["id4", "id1", "id3", null]);
check("a swap keeps the untouched modules in place", out.seen, [
  "unmount ISIS_RES:true",
  "mount SMOKY_RES@1:true",
]);
check("  … and still reports 2 untouched", out.r.plan.untouched, 2);

// 3. מילוי חריץ ריק -> הרכבה בלבד
out = run(["id1", "id2", "id3", "id5"]);
check("filling an empty slot only mounts", out.seen, [
  "mount FREEZE_RES@3:true",
]);

// 4. ריקון חריץ -> הסרה בלבד
out = run(["id1", "id2", null, null]);
check("clearing a slot only unmounts", out.seen, ["unmount THUNDER_RES:true"]);

// 5. הכל ריק -> שלוש הסרות, בלי הרכבות
out = run([null, null, null, null]);
check("clearing everything", out.seen, [
  "unmount RAILGUN_RES:true",
  "unmount ISIS_RES:true",
  "unmount THUNDER_RES:true",
]);

// 6. סדר: כל ההסרות לפני כל ההרכבות
out = run(["id4", "id5", null, null]);
check("removals come before mounts", out.seen, [
  "unmount RAILGUN_RES:true",
  "unmount ISIS_RES:true",
  "unmount THUNDER_RES:true",
  "mount SMOKY_RES@0:true",
  "mount FREEZE_RES@1:true",
]);

// 7. מזהה שלא קיים -> שגיאה, ובלי שיגור ולו פעולה אחת
out = run(["id1", "id2", "id3", "nope"]);
check("unknown id fails cleanly", out.r.ok, false);
check("  … and dispatches nothing", out.seen, []);

// 8. פריט שאינו הגנה -> נדחה
out = run(["id6", null, null, null]);
check("a non-resistance item is rejected", out.r.ok, false);
check("  … and dispatches nothing", out.seen, []);

// 9. קלט לא תקין
out = run("not an array");
check("non-array input is rejected", out.r.ok, false);

// ================== אוגמנטים ==================

function runAug(itemId, augId) {
  vm.runInContext("__dispatched.length = 0", ctx);
  const r = vm.runInContext(
    "__CMB.internals.applyAugment(__rawItem(" +
      JSON.stringify(itemId) +
      "), " +
      (augId === null ? "null" : JSON.stringify(augId)) +
      ")",
    ctx,
  );
  const seen = vm.runInContext(
    `
    __dispatched.map(function (a) {
      const S = __CMB.names(), DI = S.deviceInsertFields, DR = S.deviceRemoveFields;
      const DF = S.deviceFields, IF = S.itemFields;
      if (a[DI.device] !== undefined && a.constructor.name === S.deviceInsertClass)
        return 'insert ' + a[DI.device][DF.name] + ' -> ' + a[DI.item][IF.name];
      return 'remove ' + a[DR.device][DF.name] + ' <- ' + a[DR.item][IF.name];
    })`,
    ctx,
  );
  return { r, seen };
}
// עוזר קטן בתוך ה-sandbox: פריט גולמי לפי מזהה
vm.runInContext(
  `
  globalThis.__rawItem = function (id) {
    const S = __CMB.names(), IF = S.itemFields;
    function walk(o, seen) {
      if (!o || typeof o !== 'object' || seen.has(o)) return null;
      seen.add(o);
      if (IF.id in o && IF.mounted in o && String(o[IF.id]) === String(id)) return o;
      for (const k of Object.keys(o)) { const r = walk(o[k], seen); if (r) return r; }
      return null;
    }
    return walk(__CMB.state(), new Set());
  };`,
  ctx,
);

console.log("");
let a = runAug("id6", "dev2");
check("swapping an augment removes the old one first", a.seen, [
  "remove Pulsar <- Firebird",
  "insert Overdrive -> Firebird",
]);

a = runAug("id6", "dev1");
check("the augment already installed dispatches nothing", a.seen, []);
check("  … and reports changed=false", a.r.changed, false);

a = runAug("id6", null);
check("clearing an augment only removes", a.seen, [
  "remove Pulsar <- Firebird",
]);

a = runAug("id7", "dev3");
check("installing on an item with none only inserts", a.seen, [
  "insert Shield -> Hornet",
]);

a = runAug("id7", null);
check("clearing when there is nothing dispatches nothing", a.seen, []);

a = runAug("id6", "dev3");
check("an augment from another item is rejected", a.r.ok, false);
check("  … and dispatches nothing", a.seen, []);

a = runAug("id6", "nope");
check("an unknown augment id fails cleanly", a.r.ok, false);
check("  … and dispatches nothing", a.seen, []);

// **הבאג שנתפס חי**: אוגמנט שנמצא בקטלוג של הפריט אבל אינו קנוי
// (infinityLifetimeItem=false — כלומר NOT_OWNED, לפי ה-enum של המשחק).
// קודם הוא צויד "בהצלחה" מקומית: ההסרה של הקיים בוצעה, ההתקנה נדחתה
// בשרת, והמשתמש נשאר בלי אוגמנט. חייבים לדחות **לפני** שנוגעים במשהו.
a = runAug("id6", "dev9");
check("an unowned augment is rejected", a.r.ok, false);
check("  … reported as not-owned, not as a failure", a.r.notOwned, true);
check("  … and nothing is dispatched, so the old one stays", a.seen, []);

// ================== סקינים ==================

function runSkin(itemId, skinId) {
  vm.runInContext("__dispatched.length = 0", ctx);
  const r = vm.runInContext(
    "__CMB.internals.applySkin(__rawItem(" +
      JSON.stringify(itemId) +
      "), " +
      (skinId === null ? "null" : JSON.stringify(skinId)) +
      ")",
    ctx,
  );
  const seen = vm.runInContext(
    `
    __dispatched.map(function (a) {
      const S = __CMB.names(), SK = S.skinMountFields, IF = S.itemFields;
      if (a.constructor.name !== S.skinMountClass) return 'other:' + a.constructor.name;
      return 'skin ' + a[SK.skin][IF.name] + ' -> ' + a[SK.item][IF.name];
    })`,
    ctx,
  );
  return { r, seen };
}

console.log("");
let s = runSkin("id6", "id9");
check("changing a skin dispatches one action", s.seen, [
  "skin Neon skin -> Firebird",
]);

s = runSkin("id6", "id10");
check("an unowned skin is rejected", s.r.ok, false);
check("  … reported as not-owned, not as a failure", s.r.notOwned, true);
check("  … and nothing is dispatched, so the old skin stays", s.seen, []);
s = runSkin("id6", "id8");
check("the skin already applied dispatches nothing", s.seen, []);
check("  … and reports changed=false", s.r.changed, false);

s = runSkin("id6", null);
check("a combo with no skin dispatches nothing", s.seen, []);

s = runSkin("id6", "id1");
check("a non-skin item is rejected", s.r.ok, false);
check("  … and dispatches nothing", s.seen, []);

s = runSkin("id6", "nope");
check("an unknown skin id fails cleanly", s.r.ok, false);

s = runSkin("id7", "id9");
check("a hull with no skin yet still applies", s.seen, [
  "skin Neon skin -> Hornet",
]);

// ---- ה-cooldown של החלפת ציוד ----
// המשחק שומר חותמת סיום מוחלטת; 0 או חותמת שפגה = מותר להחליף.
console.log("");

function setCooldown(expr) {
  vm.runInContext(
    "(function(){ const I = __CMB.internals;" +
      " I.latestState[I.D.stateFields.delayMountTimeMs] = " + expr + "; })()",
    ctx,
  );
  return vm.runInContext("__CMB.internals.mountCooldown()", ctx);
}

let cd = vm.runInContext("__CMB.internals.mountCooldown()", ctx);
check("no value in state: cooldown unknown, not active", [cd.known, cd.active], [false, false]);

cd = setCooldown("0");
check("zero means no restriction", [cd.known, cd.active], [true, false]);

cd = setCooldown("Date.now() - 60000");
check("a deadline that already passed is not active", cd.active, false);

cd = setCooldown("Date.now() + 90000");
check("a future deadline is active", cd.active, true);
check("  … and reports the time left", cd.msLeft > 88000 && cd.msLeft <= 90000, true);

// Long מגיע כאובייקט, לא כמספר — בדיוק כמו מזהי הפריטים
cd = setCooldown("({ toString: function () { return String(Date.now() + 45000); } })");
check("a Kotlin Long deadline is read through toString", cd.active, true);

cd = setCooldown("({ toString: function () { return 'not a number'; } })");
check("garbage in the field does not claim a cooldown", [cd.known, cd.active], [false, false]);

// applyCombo אסינכרונית (יש השהיה בין פריט לפריט), ולכן הסיום ממתין לה
(async () => {
  // הבדיקה שמונעת את הבאג: לא משגרים כלום בזמן המתנה
  setCooldown("Date.now() + 120000");
  vm.runInContext("__dispatched.length = 0", ctx);
  const blocked = await vm.runInContext(
    "__CMB.internals.applyCombo({ protection: [null, null, null, null] })",
    ctx,
  );
  check(
    "applyCombo refuses while the game is cooling down",
    [blocked.ok, blocked.cooldown],
    [false, true],
  );
  check("  … and dispatches absolutely nothing", vm.runInContext("__dispatched.length", ctx), 0);
  check("  … and counts the block", vm.runInContext("__CMB.debug.cooldownBlocks", ctx), 1);

  setCooldown("0");
  vm.runInContext("__dispatched.length = 0", ctx);
  await vm.runInContext(
    "__CMB.internals.applyCombo({ protection: ['id1', 'id2', null, null] })",
    ctx,
  );
  check(
    "once it expires the write path runs again",
    vm.runInContext("__dispatched.length", ctx) > 0,
    true,
  );

  // ---- קומבו שלם עם סקין: המסלול שהמשתמש באמת מפעיל ----
  vm.runInContext("__dispatched.length = 0", ctx);
  const skinCombo = await vm.runInContext(
    `__CMB.internals.applyCombo({
       turret:     { id: 'id6', baseItemId: 'id6', name: 'Firebird' },
       turretSkin: { id: 'id9', name: 'Neon skin' },
       protection: null
     })`,
    ctx,
  );
  check(
    "a combo whose turret is already mounted still applies its skin",
    skinCombo.results,
    [
      { slot: "turret", name: "Firebird", status: "unchanged" },
      { slot: "turretSkin", name: "Neon skin", status: "applied" },
    ],
  );

  // ---- עותקים כפולים של אותו פריט ----
  // byId חייב להחזיר את העותק שבבעלות. אחרת בדיקת הבעלות קוראת את
  // עותק השוק ופוסלת סקין שהמשתמש כן מחזיק — הבאג שדווח.
  check(
    "the duplicate really is in the fake state",
    vm.runInContext(
      `(function () {
         const I = __CMB.internals, IF = I.D.itemFields;
         return I.collect(I.latestState).items
           .filter(function (i) { return I.idToString(i[IF.id]) === 'id9'; })
           .map(function (i) { return i[IF.owned]; });
       })()`,
      ctx,
    ),
    [true, false],
  );
  check(
    "byId prefers the owned copy over the market one",
    vm.runInContext(
      `(function () {
         const I = __CMB.internals, IF = I.D.itemFields;
         return I.collect(I.latestState).byId.get('id9')[IF.owned];
       })()`,
      ctx,
    ),
    true,
  );

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
