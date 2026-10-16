// מריץ את קבצי garage/ המשוגרים בתוך sandbox ומאמת את מסלול הקריאה:
// readCombo, readIndex, וההודעות שנכנסות דרך הגשר.

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

const posted = [];
const listeners = [];
const ctx = vm.createContext({ console, setTimeout, Date });
vm.runInContext(
  `
  globalThis.window = globalThis;
  globalThis.__posted = [];
  globalThis.__listeners = [];
  window.addEventListener = function (t, fn) { if (t === 'message') __listeners.push(fn); };
  window.postMessage = function (m) { __posted.push(m); };
`,
  ctx,
);
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(BASE + f, "utf8"), ctx, {
    filename: f.split("/").pop(),
  });
}

// ---- לפני הגילוי: אין שמות, אין מלכודות, ותשובה מיידית ----
const NAMES = require("./game_names").garage();
const trapsBefore = vm.runInContext(
  "Object.getOwnPropertyNames(Object.prototype).filter((k) => /_1$/.test(k))", ctx);
vm.runInContext(`
  __listeners.forEach((fn) => fn({
    source: window,
    data: { __cmb: true, dir: 'i2m', action: 'readCombo', payload: { id: 5 } },
  }));
`, ctx);
const earlyReply = vm.runInContext("__posted.find((m) => m.action === 'comboResult')", ctx);
const namesBefore = vm.runInContext("__CMB.names()", ctx);

// השמות מגיעים כמו מ-detect.js
vm.runInContext(`
  __listeners.forEach((fn) => fn({
    source: window,
    data: { __cmb: true, dir: 'i2m', action: 'garageConstants', payload: ${JSON.stringify(NAMES)} },
  }));
`, ctx);

// מצב משחק מזויף, נבנה בתוך ה-sandbox כדי שה-trap יירה
vm.runInContext(
  `
(function () {
  const S = __CMB.names();
  const SF = S.stateFields, IF = S.itemFields, DF = S.deviceFields;
  const MF = S.modificationFields, UF = S.upgradeFields;

  let seq = 0;
  function item(name, cat, mounted, idx, extra) {
    const o = {};
    o[IF.id] = 'id' + (++seq);
    o[IF.name] = name;
    o[IF.category] = cat;
    o[IF.mounted] = mounted;
    o[IF.mountIndex] = idx;
    o[IF.owned] = true;
    o[IF.preview] = { [S.urlMethod]: () => 'https://cdn/' + name + '.webp' };
    Object.assign(o, extra || {});
    return o;
  }
  const mod = {}; mod[MF.baseItemId] = 'base6'; mod[MF.modificationIndex] = 4;
  const up = {}; up[UF.currentLevel] = 12; up[S.maxLevelMethod] = () => 45;

  const turret = item('Firebird', 'WEAPON', true, 0);
  turret[IF.modification] = mod;
  turret[IF.mountedSkin] = 'id8';
  const hull = item('Hornet', 'ARMOR', true, 0);
  const items = [
    turret, hull,
    item('Crisis', 'DRONE', true, 0),
    item('Bomb', 'BAZOOKA', true, 0),
    item('Red', 'PAINT', true, 0),
    item('Spider', 'RESISTANCE_MODULE', true, 1, (() => { const e = {}; e[IF.upgradeableParams] = up; return e; })()),
    item('Owl', 'RESISTANCE_MODULE', true, 0),
    item('Gold skin', 'SKIN', false, -1),
    item('Shop turret', 'WEAPON', false, -1),
  ];
  items[7][IF.id] = 'id8';           // הסקין שהתותח נושא
  items[8][IF.owned] = false;        // פריט מהחנות

  function device(id, name, base, installed, owned) {
    const o = {};
    o[DF.id] = id; o[DF.baseItemId] = base; o[DF.installed] = installed;
    o[DF.name] = name; o[DF.category] = 'DEVICE';
    o[DF.infinityLifetimeItem] = owned !== false;
    o[DF.previewImage] = { [S.urlMethod]: () => 'https://cdn/' + name + '.webp' };
    return o;
  }
  const devices = [
    device('dev1', 'Pulsar', 'base6', true),      // מותקן על התותח
    device('dev2', 'Overdrive', 'base6', false),
    device('dev3', 'Shield', 'id2', true),        // מותקן על הגוף
    device('dev9', 'ForSale', 'base6', false, false),
  ];

  const state = {};
  for (const f of Object.values(SF)) state[f] = null;
  state[SF.items] = items;
  state[SF.devices] = { list: devices };
  delete state[S.trapField];
  state[S.trapField] = 1;            // <-- מפעיל את המלכודת
  globalThis.__state = state;
})();
`,
  ctx,
);

let pass = 0,
  fail = 0;
function check(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS " + name);
  } else {
    fail++;
    console.log("FAIL " + name);
  }
}

check("no names before discovery — nothing is hardcoded", namesBefore === null);
check("…and no trap on Object.prototype", trapsBefore.length === 0);
check("a request before discovery is answered at once, as a failure",
  !!earlyReply && earlyReply.payload.id === 5 && earlyReply.payload.ok === false);

const read = vm.runInContext("__CMB.read()", ctx);
check("state captured, read ok", read.ok === true);
check(
  "turret resolved",
  read.combo.turret && read.combo.turret.name === "Firebird",
);
check("turret Mk is 1-based", read.combo.turret.mk === 5);
check(
  "turret baseItemId from modification",
  read.combo.turret.baseItemId === "base6",
);
check(
  "turret image URL was called",
  read.combo.turret.image === "https://cdn/Firebird.webp",
);
check(
  "turret skin resolved by id",
  read.combo.turretSkin && read.combo.turretSkin.name === "Gold skin",
);
check("hull resolved", read.combo.hull && read.combo.hull.name === "Hornet");
check(
  "grenade category BAZOOKA -> grenade",
  read.combo.grenade && read.combo.grenade.name === "Bomb",
);
check("drone resolved", read.combo.drone && read.combo.drone.name === "Crisis");
check("paint resolved", read.combo.paint && read.combo.paint.name === "Red");
check(
  "protections sorted by mountIndex",
  read.combo.protection.map((p) => p.name).join(",") === "Owl,Spider",
);
check("protection lvl read", read.combo.protection[1].lvl === 12);
check("protection lvlMax from method", read.combo.protection[1].lvlMax === 45);
check(
  "turret augment joined by baseItemId",
  read.combo.turretAugment && read.combo.turretAugment.name === "Pulsar",
);
check(
  "hull augment joined by item id",
  read.combo.hullAugment && read.combo.hullAugment.name === "Shield",
);
check(
  "unmounted-item augments listed separately",
  Array.isArray(read.augmentsOnUnmounted),
);

const index = vm.runInContext("__CMB.index()", ctx);
check("index ok", index.ok === true);
check("index carries every item, owned or not", index.items.length === 9);
check(
  "index marks the shop item as not owned",
  index.items.find((i) => i.name === "Shop turret").owned === false,
);
check(
  "index devices carry ownership",
  index.devices.find((d) => d.name === "ForSale").owned === false,
);
check("index devices come from the canonical list", index.devices.length === 4);

// הגשר: בקשת readCombo צריכה לחזור כ-comboResult עם אותו מזהה
vm.runInContext(
  `
  __listeners.forEach((fn) => fn({
    source: window,
    data: { __cmb: true, dir: 'i2m', action: 'readIndex', payload: { id: 77 } },
  }));
`,
  ctx,
);
const replies = vm.runInContext("__posted", ctx);
const indexReply = replies.find((m) => m.action === "indexResult");
check(
  "bridge replied to readIndex",
  !!indexReply && indexReply.payload.id === 77,
);
check(
  "bridge reply carries the data",
  !!indexReply && indexReply.payload.items.length === 9,
);
check(
  "boot announced ready",
  replies.some((m) => m.action === "ready"),
);

// ---- שמות חדשים (מטמון ישן שהתחדש) מחליפים את הקודמים ----
// ההצלבה: שדה ה-state החדש הוא שם ה-proxy הקודם
vm.runInContext(
  `
  globalThis.__firstN = JSON.parse(JSON.stringify(__CMB.names()));
  const next = JSON.parse(JSON.stringify(__firstN));
  next.trapField = __firstN.proxyTrapField;
  next.proxyTrapField = 'zz9_1';
  __listeners.forEach((fn) => fn({
    source: window,
    data: { __cmb: true, dir: 'i2m', action: 'garageConstants', payload: next },
  }));
`,
  ctx,
);
check(
  "a trap the new names dropped is off Object.prototype",
  vm.runInContext("!Object.getOwnPropertyDescriptor(Object.prototype, __firstN.trapField)", ctx),
);
check(
  "…and the new names are armed",
  vm.runInContext("!!Object.getOwnPropertyDescriptor(Object.prototype, 'zz9_1')", ctx),
);
const capturesBefore = vm.runInContext("__CMB.debug.captures", ctx);
vm.runInContext(
  `
  const st = {};
  for (const f of Object.values(__CMB.names().stateFields)) st[f] = null;
  st[__firstN.proxyTrapField] = 1;   // שם ה-proxy הקודם, עכשיו שדה ה-state
  globalThis.__state2 = st;
`,
  ctx,
);
check(
  "a state on a field armed before for another role is still captured",
  vm.runInContext("__CMB.debug.captures", ctx) === capturesBefore + 1 &&
    vm.runInContext("__CMB.state() === __state2", ctx),
);

console.log("");
console.log(fail ? `${fail} FAILED, ${pass} passed` : "all checks passed");
process.exit(fail ? 1 : 0);
