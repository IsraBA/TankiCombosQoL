// מריץ את probe.js המשוגר ב-sandbox ומאמת את חימוש המלכודות:
// בלי שמות מראש לא נחמש כלום, השמות שהגילוי שולח תופסים, וגם כשהגילוי
// מחזיר שם שכבר חומש עבור מחלקה אחרת — הצלבה שהייתה מוחקת את הלכידה
// בשקט, כי מלכודת קיימת פשוט דולגה.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const BASE =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL/features/advisor/recon/";

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}

// עולם MAIN מזויף: אין DOM, רק הודעות
const ctx = vm.createContext({ console });
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
for (const f of ["game/report.js", "game/probe.js"]) {
  vm.runInContext(fs.readFileSync(BASE + f, "utf8"), ctx, {
    filename: f.split("/").pop(),
  });
}

// אובייקט קרב מזויף: הפרוטוטייפ נושא toString בצורת קוטלין,
// שהוא כל מה ש-looksLike ו-fieldMap קוראים
vm.runInContext(
  `
  globalThis.__fake = function (className) {
    const proto = {};
    proto.toString = new Function(
      'return "' + className + '(uids="+this.uu_1+", tankInfo="+this.tt_1+")"'
    );
    return Object.create(proto);
  };
  globalThis.__write = function (o, field) { o[field] = 'x'; };
  globalThis.__send = function (payload) {
    __listeners.forEach((fn) => fn({
      source: window,
      data: { __adv: true, dir: 'i2m', action: 'advisorFields', payload },
    }));
  };
  globalThis.__onProto = (p) => !!Object.getOwnPropertyDescriptor(Object.prototype, p);
`,
  ctx,
);
const run = (code) => vm.runInContext(code, ctx);

// --- לפני הגילוי: אין שמות מראש ---
ok("nothing is armed before discovery — no hardcoded names", run("__ADV.internals.armed.size") === 0);
ok("probe announced ready, so detect.js can send", run("__posted.some((m) => m.action === 'ready')"));

// --- הגילוי מגיע ---
run(`__send({ battleUsers: 'bu1_1', battleStatistics: 'bs1_1', localBattleUserState: 'lb1_1', user: 'us1_1' });`);
ok("the discovered names were accepted", run("__ADV.debug.discovered") === true);
ok("…and all four fields are armed", run("__ADV.internals.armed.size") === 4);

run(`__write(__fake('BattleUsers'), 'bu1_1');`);
ok("a BattleUsers on its discovered field is captured", run("__ADV.debug.rosterCaptures") === 1);
ok("…and the roster object was kept", run("!!__ADV.internals.roster"));
ok("…with no error along the way", run("__ADV.debug.lastError") === null);

run(`__write(__fake('GarageItem'), 'bu1_1');`);
ok("a stranger class on the same field is ignored", run("__ADV.debug.rosterCaptures") === 1);

// --- מלכודת זרה שהחליפה את שלנו אחרי החימוש לא תימחק בהחלפה ---
run(`
  globalThis.__foreignSet = function (v) {};
  Object.defineProperty(Object.prototype, 'us1_1', {
    configurable: true, enumerable: false, get() { return undefined; }, set: __foreignSet,
  });
`);

// --- שמות חדשים מצליבים: BattleUsers מקבל את השדה של BattleStatistics ---
run(`__send({ battleUsers: 'bs1_1', battleStatistics: 'zz9_1', localBattleUserState: 'yy9_1', user: 'xx9_1' });`);
ok("the crossed field now listens for BattleUsers, and only for it",
  run("__ADV.internals.armed.get('bs1_1').map((e) => e.marker).join()") === '"BattleUsers(');
ok("a field the new names dropped is off Object.prototype — on a new build it is a stranger's",
  run("!__ADV.internals.armed.has('bu1_1') && !__onProto('bu1_1')"));
ok("…but a foreign trap that took one of ours over is left in place",
  run("Object.getOwnPropertyDescriptor(Object.prototype, 'us1_1').set === __foreignSet"));

run(`__write(__fake('BattleUsers'), 'bs1_1');`);
ok("a BattleUsers on the crossed field IS captured (the silent-loss bug)", run("__ADV.debug.rosterCaptures") === 2);
run(`__write(__fake('BattleStatistics'), 'bs1_1');`);
ok("…while the old BattleStatistics on it is retired", run("__ADV.debug.battleCaptures") === 0);
run(`__write(__fake('BattleStatistics'), 'zz9_1');`);
ok("…and BattleStatistics is captured on the field discovery named", run("__ADV.debug.battleCaptures") === 1);
run(`__write(__fake('LocalBattleUserState'), 'yy9_1');`);
ok("a newly discovered field arms and captures", run("__ADV.debug.localCaptures") === 1);

// --- אותם שמות פעמיים (ה-ready handshake) לא משנים כלום ---
const sizeBefore = run("__ADV.internals.armed.size");
run(`__send({ battleUsers: 'bs1_1', battleStatistics: 'zz9_1', localBattleUserState: 'yy9_1', user: 'xx9_1' });`);
ok("the same names twice leave the traps as they were",
  run("__ADV.internals.armed.size") === sizeBefore && run("__onProto('zz9_1')"));

// --- קלט אשפה לא מחמש כלום ---
run(`__send({ battleUsers: 'not a field', user: 42 });`);
ok("malformed discovered names are refused", run("__ADV.internals.armed.size") === sizeBefore);

// --- שדה תפוס בידי מלכודת זרה לא נדרס ---
run(`
  Object.defineProperty(Object.prototype, 'foreign_1', {
    configurable: true, enumerable: false,
    get() { return undefined; }, set(v) { globalThis.__foreignSaw = v; },
  });
  __send({ battleUsers: 'foreign_1', battleStatistics: 'zz9_1', localBattleUserState: 'yy9_1', user: 'xx9_1' });
`);
ok("a field owned by a foreign trap is left alone",
  run("__ADV.debug.skipped") === 1 && !run("__ADV.internals.armed.has('foreign_1')"));

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
