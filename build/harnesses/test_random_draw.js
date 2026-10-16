// הגרלת הרנדומייזר (randomizer/game/draw.js) מול מצב-משחק מזויף:
// מי נכנס למאגר, מי מסונן, ומה נקרא מהמצב במקום להיות מוגרל.

const fs = require("fs");
const vm = require("vm");
const BASE =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL/features/combos/";

const FILES = [
  "discovery/game/names.js",
  "capture/game/kotlin.js",
  "capture/game/collect.js",
  "capture/game/capture.js",
  "equip/game/store.js",
  "equip/game/device_catalog.js",
  "randomizer/game/draw.js",
  "discovery/game/boot.js",   // חמוש את המלכודות; חייב להיטען אחרון
];

const ctx = vm.createContext({ console, setTimeout, Date, Math });
vm.runInContext(
  `globalThis.window = globalThis;
   window.addEventListener = function () {};
   window.postMessage = function () {};
   window.setTimeout = setTimeout;`,
  ctx,
);
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(BASE + f, "utf8"), ctx, {
    filename: f.split("/").pop(),
  });
}
// לתוסף אין שמות מראש: מה שהגילוי מוצא בבאנדל החדש ביותר
vm.runInContext("__CMB.internals.applyNames(" + JSON.stringify(require("./game_names").garage()) + ")", ctx);

// --- מצב מזויף שנבנה סביב הפילטרים ---
const setup = `
(function () {
  const S = __CMB.names();
  const SF = S.stateFields, IF = S.itemFields, MF = S.modificationFields;
  const DF = S.deviceFields;

  // mkIndex/mkCount 0-based כמו במשחק; lvl/lvlMax למיקרו-אפגרייד
  function item(id, name, cat, opts) {
    opts = opts || {};
    const o = {};
    o[IF.id] = id;
    o[IF.name] = name;
    o[IF.category] = cat;
    o[IF.mounted] = opts.mounted === true;
    o[IF.mountIndex] = opts.mountIndex == null ? -1 : opts.mountIndex;
    o[IF.owned] = opts.owned !== false;
    o[IF.preview] = 'img/' + id;
    if (opts.mkIndex != null) {
      const mod = {};
      mod[MF.baseItemId] = opts.base || id;
      mod[MF.modificationIndex] = opts.mkIndex;
      mod[MF.modificationCount] = opts.mkCount;
      o[IF.modification] = mod;
    }
    if (opts.lvl != null) {
      const up = {};
      up[S.upgradeFields.currentLevel] = opts.lvl;
      up[S.maxLevelMethod] = function () { return opts.lvlMax; };
      // המתודה של המשחק — היא זו שההגרלה קוראת בפועל
      up[S.isMaxedMethod] = function () { return opts.lvl === opts.lvlMax; };
      o[IF.upgradeableParams] = up;
    }
    if (opts.count != null) {
      // countable נשאר כבוי בכוונה: המשחק בודק count לבדו
      o[IF.count] = opts.count;
    }
    if (opts.skins) o[IF.availableSkins] = opts.skins;
    if (opts.mountedSkin) o[IF.mountedSkin] = opts.mountedSkin;
    return o;
  }

  const items = [
    // THUNDER: שלוש דרגות Mk, הגבוהה שבבעלות היא Mk3 מתוך 7 -> לא MAX
    item('t1', 'THUNDER', 'WEAPON', { base: 'tb', mkIndex: 0, mkCount: 7 }),
    item('t2', 'THUNDER', 'WEAPON', { base: 'tb', mkIndex: 1, mkCount: 7 }),
    item('t3', 'THUNDER', 'WEAPON', { base: 'tb', mkIndex: 2, mkCount: 7 }),
    // FIREBIRD: Mk7 מתוך 7 ומיקרו מלא -> MAX, וגם המורכב כרגע
    item('f7', 'FIREBIRD', 'WEAPON',
         { base: 'fb', mkIndex: 6, mkCount: 7, lvl: 20, lvlMax: 20, mounted: true,
           skins: ['k0', 'k1', 'k2', 'k3'], mountedSkin: 'k1' }),
    // RAILGUN: Mk מקסימלי אבל מיקרו לא מלא -> לא MAX
    item('r7', 'RAILGUN', 'WEAPON', { base: 'rb', mkIndex: 6, mkCount: 7, lvl: 5, lvlMax: 20 }),
    // VULCAN: מיקרו מלא אבל Mk3 מתוך 7 -> לא MAX. בלי בדיקת ה-Mk
    // המתודה של המשחק לבדה הייתה מכניסה אותו למאגר.
    item('v3', 'VULCAN', 'WEAPON', { base: 'vb', mkIndex: 2, mkCount: 7, lvl: 20, lvlMax: 20 }),
    // לא בבעלות -> לעולם לא במאגר
    item('s7', 'SHAFT', 'WEAPON', { base: 'sb', mkIndex: 6, mkCount: 7, owned: false }),

    item('h1', 'HORNET', 'ARMOR', { base: 'hb', mkIndex: 6, mkCount: 7, mounted: true,
                                    skins: ['k4'], mountedSkin: 'k4' }),

    // הרימון עצמו הוא BAZOOKA ו-count עליו הוא 0 תמיד; המלאי יושב
    // על פריט נפרד בקטגוריה GRENADE עם אותו שם. ל-EMPTY BOMB אין כזה.
    item('g1', 'STICKY', 'BAZOOKA', { count: 0 }),
    item('g2', 'TSAR', 'BAZOOKA', { count: 0 }),
    item('g3', 'EMPTY BOMB', 'BAZOOKA', { count: 0, mounted: true }),
    item('sup1', 'STICKY', 'GRENADE', { count: 12 }),
    item('sup2', 'TSAR', 'GRENADE', { count: 3 }),

    // דרונים
    item('d1', 'CRISIS', 'DRONE', { lvl: 20, lvlMax: 20, mounted: true }),
    item('d2', 'BRUTUS', 'DRONE', { lvl: 20, lvlMax: 20 }),

    item('p1', 'Red smoke', 'PAINT', { mounted: true }),
    item('p2', 'Blue haze', 'PAINT', {}),

    // סקינים של FIREBIRD. הרגיל נקרא "<name>" ואינו בבעלות — כך
    // בדיוק הוא נמדד חי, גם על תותח שכן בבעלות.
    item('k0', '<name>',          'SKIN', { owned: false }),
    item('k1', 'Firebird Demon',  'SKIN', {}),
    item('k2', 'Firebird Neon',   'SKIN', {}),
    item('k3', 'Firebird ForSale','SKIN', { owned: false }),
    // סקין של גוף שאין בבעלות -> HORNET יישאר על מה שעליו
    item('k4', '<name>',          'SKIN', { owned: false }),
    item('x1', 'OWL', 'RESISTANCE_MODULE', { mounted: true, mountIndex: 1 }),
  ];

  function device(id, name, base, rarity, opts) {
    opts = opts || {};
    const o = {};
    o[DF.id] = id;
    o[DF.baseItemId] = base;
    o[DF.installed] = opts.installed === true;
    o[DF.name] = name;
    o[DF.category] = 'DEVICE';
    o[DF.rarity] = rarity;
    o[DF.previewImage] = 'img/' + id;
    o[DF.infinityLifetimeItem] = opts.owned !== false;
    return o;
  }

  const devices = [
    device('a1', 'Pulsar',            'fb', 'LEGENDARY', { installed: true }),
    device('a2', 'Overdrive',         'fb', 'EXOTIC'),
    device('a3', 'Cheap one',         'fb', 'RARE'),
    device('a4', 'Standard settings', 'fb', 'LEGENDARY'),
    device('a5', 'Not bought',        'fb', 'LEGENDARY', { owned: false }),
    device('a6', 'Shield',            'hb', 'LEGENDARY'),
    // לכל משפחה שאפשר להגריל חייב להיות קטלוג, אחרת ההמתנה שורפת
    // את מלוא התקרה — בדיוק כמו במשחק לפריט שקטלוגו לא נטען
    device('a7', 'Thunderclap',       'tb', 'LEGENDARY'),
    device('a8', 'Railshield',        'rb', 'RARE'),
    device('a9', 'Vulcanite',         'vb', 'RARE'),
  ];

  const state = {};
  for (const f of Object.values(SF)) state[f] = null;
  state[SF.items] = items;
  state[SF.devices] = devices;
  delete state[S.trapField];
  state[S.trapField] = true;
  return true;
})()
`;
vm.runInContext(setup, ctx);

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

const ALL_ON = {
  turrets: true, hulls: true, grenades: true, drones: true,
  turretAugment: true, hullAugment: true,
};

// מגרילים הרבה פעמים כדי לראות את כל המאגר, לא דגימה אחת
async function poolOf(slot, settings, rounds) {
  const seen = new Set();
  for (let i = 0; i < (rounds || 60); i++) {
    const r = await vm.runInContext(
      "__CMB.internals.drawRandomCombo(" + JSON.stringify(settings) + ")",
      ctx,
    );
    const e = r.data[slot];
    seen.add(e ? e.name : null);
  }
  return [...seen].sort();
}

(async () => {
  check("state captured", vm.runInContext("!!__CMB.internals.latestState", ctx), true);

  // ---- Max equipment only ----
  check(
    "without maxOnly every owned turret family is in the pool",
    await poolOf("turret", { categories: ALL_ON, advanced: {} }, 80),
    ["FIREBIRD", "RAILGUN", "THUNDER", "VULCAN"],
  );
  // FIREBIRD בלבד: RAILGUN חסר LVL, VULCAN חסר Mk, THUNDER חסר שניהם
  check(
    "maxOnly keeps only Mk-max AND fully upgraded",
    await poolOf("turret", { categories: ALL_ON, advanced: { maxEquipmentOnly: true } }),
    ["FIREBIRD"],
  );

  // ---- בעלות ----
  check(
    "an unowned turret never appears",
    (await poolOf("turret", { categories: ALL_ON, advanced: {} })).includes("SHAFT"),
    false,
  );

  // ---- מלאי הרימונים ----
  // EMPTY BOMB אין לו פריט GRENADE, ולכן הוא מחוץ למאגר
  check(
    "a grenade with no supply item is not drawn",
    await poolOf("grenade", { categories: ALL_ON, advanced: {} }, 60),
    ["STICKY", "TSAR"],
  );
  check(
    "excluding the Tsar grenade leaves only the other one",
    await poolOf("grenade", {
      categories: ALL_ON, advanced: {}, exclude: { grenades: ["TSAR"] },
    }, 40),
    ["STICKY"],
  );

  // ---- החרגת Brutus ----
  check(
    "excluding Brutus leaves only the other drone",
    await poolOf("drone", {
      categories: ALL_ON, advanced: {}, exclude: { drones: ["BRUTUS"] },
    }),
    ["CRISIS"],
  );

  // ---- מאגר ריק ----
  // אין ממה להגריל -> נשאר המצויד כרגע, בלי שום סימן למשתמש
  check(
    "an empty pool falls back to the mounted item",
    await poolOf("drone", {
      categories: ALL_ON, advanced: {},
      exclude: { drones: ["CRISIS", "BRUTUS"] },
    }, 5),
    ["CRISIS"],
  );

  // אין ציוד ממוקסם בקטגוריה -> מוותרים על ההעדפה במקום לא לעשות כלום.
  // לרימונים כאן אין Mk כלל, אז נשתמש בגופים: h1 ממוקסם, h2 לא.
  check(
    "maxOnly with nothing maxed in the category ignores the preference",
    await poolOf("grenade", {
      categories: { grenades: true }, advanced: { maxEquipmentOnly: true },
      exclude: { grenades: ["STICKY"] },
    }, 40),
    ["TSAR"],
  );
  // הוויתור הוא על ה-MAX בלבד; מלאי והחרגות נשארים בתוקף
  check(
    "…and the fallback still respects stock",
    (await poolOf("grenade", {
      categories: { grenades: true }, advanced: { maxEquipmentOnly: true },
    }, 60)).includes("EMPTY BOMB"),
    false,
  );

  // המלאי נמדד על פריט ה-GRENADE, ולכן count על ה-BAZOOKA (שהוא 0
  // תמיד, גם לרימון מלא) אינו משפיע
  check(
    "count on the BAZOOKA item itself is ignored",
    await poolOf("grenade", { categories: { grenades: true }, advanced: {} }, 60),
    ["STICKY", "TSAR"],
  );

  // ---- צבעים ----
  check(
    "paints are not randomised unless asked",
    await poolOf("paint", { categories: { turrets: true }, advanced: {} }, 5),
    ["Red smoke"],
  );
  check(
    "paints join the draw when the switch is on",
    await poolOf("paint", { categories: { paints: true }, advanced: {} }, 40),
    ["Blue haze", "Red smoke"],
  );

  // ---- סקינים ----
  // התותח מקובע, אחרת המאגר משתנה לפי מה שהוגרל
  const SKIN_ONLY = { turrets: false, skins: true };
  check(
    "skins: only owned ones, and never the standard",
    await poolOf("turretSkin", { categories: SKIN_ONLY, advanced: {} }),
    ["Firebird Demon", "Firebird Neon"],
  );
  check(
    "the switch off keeps whatever skin is on the item",
    await poolOf("turretSkin", { categories: { turrets: false }, advanced: {} }, 5),
    ["Firebird Demon"],
  );
  // HORNET מחזיק רק את הרגיל -> אין ממה להגריל, לא נוגעים
  check(
    "an item with no owned skins keeps its standard one",
    await poolOf("hullSkin", { categories: { hulls: false, skins: true }, advanced: {} }, 5),
    ["<name>"],
  );
  const skinDraw = await vm.runInContext(
    "__CMB.internals.drawRandomCombo(" +
      JSON.stringify({ categories: { hulls: false, skins: true }, advanced: {} }) + ")",
    ctx,
  );
  check(
    "…and the standard is never sent to be applied",
    skinDraw.desired.hullSkin,
    undefined,
  );

  // ---- קטגוריה כבויה ----
  check(
    "a disabled category keeps whatever is mounted",
    await poolOf("turret", { categories: { turrets: false }, advanced: {} }, 5),
    ["FIREBIRD"],
  );

  // ---- אוגמנטים ----
  // התותח מקובע (הקטגוריה כבויה), אחרת המאגר משתנה לפי מה שהוגרל
  const AUG_ONLY = { turrets: false, turretAugment: true };
  check(
    "augments: owned, not Standard, any rarity",
    await poolOf("turretAugment", { categories: AUG_ONLY, advanced: {} }),
    ["Cheap one", "Overdrive", "Pulsar"],
  );
  check(
    "legendaryOnly keeps LEGENDARY and EXOTIC",
    await poolOf("turretAugment", {
      categories: AUG_ONLY, advanced: { legendaryOnly: true },
    }),
    ["Overdrive", "Pulsar"],
  );
  check(
    "the augment category off keeps the installed one",
    await poolOf("turretAugment", {
      categories: { turrets: false, turretAugment: false }, advanced: {},
    }, 5),
    ["Pulsar"],
  );

  // ---- מה שלא מוגרל נקרא מהמצב ----
  const one = await vm.runInContext(
    "__CMB.internals.drawRandomCombo(" + JSON.stringify({ categories: {}, advanced: {} }) + ")",
    ctx,
  );
  check("paint comes from the current state", one.data.paint.name, "Red smoke");
  check("protections keep their slot index", one.data.protection.map((p) => p && p.name),
    [null, "OWL", null, null]);
  check("the applied combo never touches protections", one.desired.protection, null);
  check("…and carries no paint either", one.desired.paint, undefined);
  // אותו מבנה שה-instant_saver כותב, אחרת הכרטיס לא יידע לרנדר
  check("the card entry matches the stored combo shape",
    Object.keys(one.data.turret).sort(),
    ["baseItemId", "id", "image", "lvl", "mk", "name"]);
  check("mk is 1-based, like the garage shows it", one.data.turret.mk, 7);
  check("an item with no Mk carries none", one.data.paint.mk, undefined);

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
