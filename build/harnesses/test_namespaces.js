// כל מודול תובע שם משלו על window.TankiQoL. שני קבצים שתובעים את אותו
// שם — המאוחר דורס את המוקדם בשקט, והמוקדם מפסיק לעבוד. זה קרה:
// equip/combo_identity.js נקרא בהתחלה ComboMatch ומחק את
// migration/migrator_match.js, וההשלמה של המזהים מתה בלי סימן.

const fs = require("fs");
const path = require("path");
const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}

// shared/ נסרק גם הוא: הוא מגדיר שמות שהפיצ'רים קוראים
const SCAN = [path.join(EXT, "features"), path.join(EXT, "shared")];
const ALL = SCAN.reduce((acc, dir) => walk(dir, acc), []);

// תביעה בלעדית: השמה של אובייקט חדש. Object.assign הוא mixin,
// ו-`X = X || {}` הוא מרחב משותף מכוון (discovery) — שניהם מותרים.
const claims = new Map();   // בלעדי -> קבצים
const shared = new Set();   // נתבע בצורה השיתופית

for (const file of ALL) {
  const src = fs.readFileSync(file, "utf8");
  const rel = file.replace(EXT + path.sep, "").split(path.sep).join("/");

  // גם דרך כינוי: const NS = (window.TankiQoL = ...) ואז NS.X =
  // כינוי של תת-מרחב (window.TankiQoL.GarageDiscover, גם עם ?.) אינו כינוי שלו
  const holders = new Set(["window.TankiQoL"]);
  const aliasRe =
    /(?:const|let|var)\s+(\w+)\s*=\s*\(?\s*window\.TankiQoL(?![.?])/g;
  for (const a of src.matchAll(aliasRe)) holders.add(a[1]);

  for (const h of holders) {
    const esc = h.replace(/\./g, "\\.");
    const re = new RegExp(esc + "\\.(\\w+)\\s*=\\s*([\\w.$]+|\\{)", "g");
    for (const m of src.matchAll(re)) {
      const [, name, rhs] = m;
      if (rhs === h + "." + name) { shared.add(name); continue; }
      if (!claims.has(name)) claims.set(name, []);
      if (!claims.get(name).includes(rel)) claims.get(name).push(rel);
    }
  }
}

ok("some namespaces were found at all", claims.size > 10);
ok("the aliased form is seen too (NS.Select in shared/)", claims.has("Select"));

const clashes = [...claims.entries()].filter(([, files]) => files.length > 1);
for (const [name, files] of clashes) {
  console.log("     " + name + " <- " + files.join(", "));
}
ok(
  "no two modules claim the same TankiQoL namespace",
  clashes.length === 0,
);

// כל שם שנקרא חייב להיות נתבע איפשהו — שם שהשתנה בצד אחד בלבד
// נראה בדיוק כמו מודול שלא נטען.
const used = new Set();
for (const file of ALL) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/window\.TankiQoL\.(\w+)/g)) used.add(m[1]);
}
const orphans = [...used].filter((n) => !claims.has(n) && !shared.has(n));
if (orphans.length) console.log("     orphans: " + orphans.join(", "));
ok("every namespace read is a namespace someone defines", orphans.length === 0);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
