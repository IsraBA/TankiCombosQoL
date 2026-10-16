// אין בתוסף שמות ממוזערים קבועים: כל שם של המשחק מגיע מהגילוי בזמן ריצה.
// סורק את הקוד המשוגר אחרי מחרוזת בצורת שדה של קוטלין (xx_1) ואחרי seed.
// node build/harnesses/test_no_names.js

const fs = require("fs");
const path = require("path");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

// הערה בסוף שורה: // שלפניו מספר זוגי של מרכאות
function stripComment(line) {
  for (let i = line.indexOf("//"); i !== -1; i = line.indexOf("//", i + 2)) {
    const before = line.slice(0, i);
    const quotes = (before.match(/(?<!\\)['"`]/g) || []).length;
    if (quotes % 2 === 0 && !/[:\\]$/.test(before)) return before;
  }
  return line;
}

const FIELD = /(['"`])([A-Za-z$_][\w$]{0,5}_1)\1/g;   // 'aq1_1', "o11h_1"
// SEED / SEED_OFFSETS; לא HudSeed — זו מדידת גיאומטריה, לא שמות
const SEED = /\bSEED(?:_[A-Z]+)?\b/;

const files = walk(path.join(EXT, "features"), []).concat(walk(path.join(EXT, "shared"), []));
ok("there is code to scan", files.length > 50);

const hits = [];
for (const file of files) {
  const rel = path.relative(EXT, file).split(path.sep).join("/");
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = stripComment(raw);
    for (const m of line.matchAll(FIELD)) hits.push(rel + ":" + (i + 1) + "  " + m[2]);
    if (SEED.test(line)) hits.push(rel + ":" + (i + 1) + "  " + line.trim().slice(0, 60));
  });
}
ok("no minified game name and no seed anywhere in the shipped code" +
  (hits.length ? "\n         " + hits.join("\n         ") : ""), hits.length === 0);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
