// shared/bundle.js כמו שהוא: הורדה אחת לכל הגילויים, סדר עדיפות, מטמון לבילד
// שמתחדש ברקע כשגרסת התוסף משתנה, וניקוי מפתחות ישנים.
// node build/harnesses/test_bundle.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const URL = "https://tankionline.com/play/static/js/main.abc123.js";

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}

// עולם ISOLATED מזויף: storage אסינכרוני, fetch שנספר, סקריפט הבאנדל בדף
function world(stored, version) {
  const store = Object.assign({}, stored);
  const log = [];
  const ctx = {
    console: { log() {}, error: (...a) => log.push("error " + a.join(" ")) },
    setTimeout, clearTimeout,
    document: { scripts: [{ src: URL }], documentElement: {} },
    MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {}; },
    fetch: (url) => {
      log.push("fetch " + url);
      return Promise.resolve({ ok: true, text: () => Promise.resolve("BUNDLE SOURCE") });
    },
    chrome: {
      runtime: { getManifest: () => ({ version }) },
      storage: { local: {
        get(keys, cb) {
          setTimeout(() => {
            const out = {};
            for (const k of keys === null ? Object.keys(store) : keys) if (k in store) out[k] = store[k];
            cb(JSON.parse(JSON.stringify(out)));
          }, 1);
        },
        set(obj) { Object.assign(store, JSON.parse(JSON.stringify(obj))); },
        remove(keys) { for (const k of keys) delete store[k]; },
      } },
    },
  };
  vm.createContext(ctx);
  vm.runInContext("globalThis.window = globalThis;", ctx);
  const src = fs.readFileSync(path.join(EXT, "shared/bundle.js"), "utf8");
  vm.runInContext(src, ctx, { filename: "bundle.js" });
  vm.runInContext(src, ctx, { filename: "bundle.js (second block)" });
  // משימה בשם name: מה שה-discover מחזיר, ויומן של כל פרסום
  const job = (name, priority, result) => ({
    name, version: 1, priority,
    discover(text, url) {
      log.push("discover " + name);
      if (result instanceof Error) throw result;
      return result && Object.assign({ text, url }, result);
    },
    publish(data) { log.push("publish " + name + " " + JSON.stringify(data.v)); },
  });
  return { ctx, store, log, job, register: (j) => ctx.TankiQoL.Bundle.register(j) };
}
// עד שהיומן נרגע (שעון של חלונות מעגל setTimeout ל-~16ms)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function settle(w) {
  let n = -1;
  while (n !== w.log.length) { n = w.log.length; await sleep(150); }
}
const key = (name) => name + ":v1:" + URL;

(async () => {
  // ---- בלי מטמון: הורדה אחת, לפי העדיפות ----
  let w = world({}, "5.1");
  ok("loading the module from a second block is a no-op", w.ctx.TankiQoL.Bundle && w.ctx.TankiQoL.Bundle.register);
  w.register(w.job("late", 4, { v: "L" }));
  w.register(w.job("early", 0, { v: "E" }));
  w.register(w.job("broken", 2, new Error("boom")));
  w.register(w.job("middle", 3, { v: "M" }));
  await settle(w);
  ok("one download for every discovery", w.log.filter((l) => l.startsWith("fetch")).length === 1);
  ok("…of the bundle the page loads", w.log.includes("fetch " + URL));
  const order = w.log.filter((l) => l.startsWith("publish")).map((l) => l.split(" ")[1]);
  ok("published in priority order: what the game builds first goes first", order.join() === "early,middle,late");
  ok("each publish lands before the next discovery starts",
    w.log.indexOf("publish early \"E\"") < w.log.indexOf("discover middle"));
  ok("a discovery that throws is reported and does not stop the others",
    w.log.some((l) => l.startsWith("error") && l.includes("broken")) && order.includes("late"));
  ok("the discovery gets the source and the bundle URL", w.store[key("early")] &&
    w.store[key("early")].data.text === "BUNDLE SOURCE" && w.store[key("early")].data.url === URL);
  ok("…and is cached with the extension version", w.store[key("early")].ext === "5.1");

  // ---- מטמון של אותה גרסה: מיידי, בלי הורדה ----
  w = world({ [key("early")]: { ext: "5.1", data: { v: "cached" } } }, "5.1");
  w.register(w.job("early", 0, { v: "E" }));
  await settle(w);
  ok("a cache of this version is published as is", w.log.join() === 'publish early "cached"');
  ok("…without downloading the bundle", !w.log.some((l) => l.startsWith("fetch")));

  // ---- מטמון מגרסה קודמת: נשלח מיד, ומתחדש ברקע ----
  w = world({
    [key("changed")]: { ext: "5.0", data: { v: "old" } },
    [key("same")]: { ext: "5.0", data: { text: "BUNDLE SOURCE", url: URL, v: "S" } },
    ["changed:v0:" + URL]: { ext: "4.0", data: {} },
    ["changed:v1:https://old/main.zzz.js"]: { ext: "5.0", data: {} },
    ["other:v1:" + URL]: { ext: "5.0", data: {} },
  }, "5.1");
  w.register(w.job("changed", 1, { v: "new" }));
  w.register(w.job("same", 2, { v: "S" }));
  await settle(w);
  const pubs = w.log.filter((l) => l.startsWith("publish"));
  ok("an older version's cache is published at once, before any download",
    pubs[0] === 'publish changed "old"' && w.log.indexOf(pubs[0]) < w.log.findIndex((l) => l.startsWith("fetch")));
  ok("…then rediscovered, and published again because the result changed", pubs.includes('publish changed "new"'));
  ok("…but not again when the fresh result is the same", pubs.filter((l) => l.includes("same")).length === 1);
  ok("the cache now carries this version", w.store[key("changed")].ext === "5.1" && w.store[key("changed")].data.v === "new");
  ok("old schema versions and old builds of the same job are removed",
    !("changed:v0:" + URL in w.store) && !("changed:v1:https://old/main.zzz.js" in w.store));
  ok("…while another job's keys are left alone", ("other:v1:" + URL) in w.store);

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
})();
