// רכיבי ה-HUD ב-HTML בקרב, ושקיפות הצ'אט ב-WebGL. שניהם על DOM ו-WebGL
// מזויפים: מה שנבדק הוא מה שנכתב לצמתים ול-shader, לא הציור.
// node build/harnesses/test_hud_dom.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}

// ---- DOM מזויף עם פריסה: offset לכל צומת, ובוררי מחלקות מופרדים בפסיק ----

function node(cls, box, parent) {
  const styles = {};
  const n = {
    _class: new Set(String(cls || "").split(/\s+/).filter(Boolean)),
    children: [],
    parentElement: parent || null,
    offsetParent: parent || null,
    offsetLeft: box ? box.x : 0, offsetTop: box ? box.y : 0,
    offsetWidth: box ? box.w : 0, offsetHeight: box ? box.h : 0,
    style: {
      setProperty(k, v) { styles[k] = String(v); },
      removeProperty(k) { delete styles[k]; },
      getPropertyValue(k) { return styles[k] || ""; },
    },
    _styles: styles,
    closest(sel) {
      for (let c = n; c; c = c.parentElement) if (sel.split(",").some((s) => c._class.has(s.trim().slice(1)))) return c;
      return null;
    },
    querySelectorAll(sel) {
      const want = sel.split(",").map((s) => s.trim().slice(1));
      const out = [];
      (function walk(e) { for (const c of e.children) { if (want.some((w) => c._class.has(w))) out.push(c); walk(c); } })(n);
      return out;
    },
    querySelector(sel) { return n.querySelectorAll(sel)[0] || null; },
  };
  if (parent) parent.children.push(n);
  return n;
}

// ה-HUD של הקרב, כמו שהמשחק בונה אותו: פרטי משתמש, שלושה כפתורים, FPS, שורת צ'אט
const doc = node("");
const hud = node("BattleHudComponentStyle-hudContainer", { x: 0, y: 0, w: 1600, h: 900 }, doc);
const cell = node("", { x: 0, y: 0, w: 400, h: 90 }, hud);
const uti = node("ksc-17", { x: 0, y: 0, w: 300, h: 96 }, cell);
node("UserInfoContainerStyle-rankIconContainer", { x: 0, y: 0, w: 95, h: 96 }, uti);
const col = node("", { x: 1480, y: 13, w: 107, h: 200 }, hud);
const full = node("BattleHudComponentStyle-fullScreenButton", { x: 0, y: 0, w: 107, h: 30 }, col);
const pause = node("BattleHudComponentStyle-pauseButton", { x: 0, y: 36, w: 107, h: 30 }, col);
const tab = node("BattleHudComponentStyle-tabButton", { x: 0, y: 72, w: 107, h: 30 }, col);
const fps = node("BattleHudFpsComponentStyle-container", { x: 0, y: 124, w: 107, h: 40 }, col);
const chatRoot = node("BattleChatComponentStyle-rootDesktop", { x: 16, y: 585, w: 640, h: 80 }, hud);

let settings = {};
const storeListeners = [];
const frames = [];
const ctx = {
  console: { log() {}, error() {} },
  innerWidth: 1600, innerHeight: 900,
  requestAnimationFrame(fn) { frames.push(fn); return frames.length; },
  setTimeout() { return 0; },
  setInterval() { return 0; },
  addEventListener() {},
  MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {}; },
  document: {
    querySelectorAll: (sel) => doc.querySelectorAll(sel),
    querySelector: (sel) => doc.querySelector(sel),
  },
};
vm.createContext(ctx);
vm.runInContext("globalThis.window = globalThis; window.TankiQoL = {};", ctx);
const Q = ctx.window.TankiQoL;
Q.HudStore = {
  isLoaded: () => true,
  elements: (l) => settings[l] || {},
  subscribe: (fn) => storeListeners.push(fn),
};
Q.HudBridge = { getState: () => ({ layout: "default" }), onState() {} };
// הצ'אט כולו (הקנבס ושורת ההקלדה) סביב מרכז אחד, מ-model/rects.js
Q.HudRects = {
  forLayout: () => ({ chat: { x: 0.01, y: 0.45, w: 0.4, h: 0.3 } }),
  pivotOf: (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 }),
};
for (const f of ["features/combos/lib/constants.js", "features/hud/model/elements.js", "features/hud/dom/catalog.js", "features/hud/dom/markup.js", "features/hud/dom/ghost.js", "features/hud/dom/apply.js"]) {
  vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });
}
const flush = () => { while (frames.length) frames.shift()(); };
const change = (next) => { settings = next; storeListeners.forEach((fn) => fn()); flush(); };
flush();

ok("with no preferences the game's nodes are left untouched",
  Object.keys(full._styles).length === 0 && Object.keys(uti._styles).length === 0);

change({ default: { userInfo: { dx: 0.1, dy: 0.05, scale: 1.5, opacity: 0.4 } } });
ok("the user info block moves by a fraction of the screen, as the canvas elements do",
  uti._styles.translate === "160px 45px");
ok("…grows by the chosen factor", uti._styles.scale === "1.5");
ok("…about its own centre", uti._styles["transform-origin"] === "150px 48px");
ok("…and fades", uti._styles.opacity === "0.4");
ok("…through translate/scale, which compose with the game's own transform instead of replacing it",
  !("transform" in uti._styles));

change({ default: { buttons: { dx: 0, dy: 0.1, scale: 2, opacity: 1 } } });
ok("the three buttons move as one element", [full, pause, tab].every((b) => b._styles.translate === "0px 90px"));
// מרכז העמודה: (1480+53.5, 13+51); כל כפתור מחשב את ה-origin יחסית לעצמו
ok("…growing about the centre of the whole column, not each its own",
  full._styles["transform-origin"] === "53.5px 51px" && tab._styles["transform-origin"] === "53.5px -21px");
ok("…while the FPS counter below them is a separate element", Object.keys(fps._styles).length === 0);
ok("…and the preference removed from the user info cleans its nodes",
  Object.keys(uti._styles).length === 0);

change({ default: { chat: { dx: 0.05, dy: 0, scale: 1.2, opacity: 0.5 } } });
// מרכז הצ'אט (0.21, 0.6) בפיקסלים הוא (336, 540); שורת ההקלדה ב-(16, 585)
ok("the chat's input line moves with the canvas chat",
  chatRoot._styles.translate === "80px 0px" && chatRoot._styles.scale === "1.2");
ok("…about the centre of the chat as a whole, the same pivot the canvas turns about",
  chatRoot._styles["transform-origin"] === (336 - 16) + "px " + (540 - 585) + "px");
ok("…and fades with it", chatRoot._styles.opacity === "0.5");

change({ centered: { userInfo: { dx: 0.3 } } });
ok("a preference of the other layout does not apply", Object.keys(uti._styles).length === 0);

// ---- העותק הנסתר לא מתחזה ל-HUD ----

// תוספים אחרים (Tanki Tweaks) צופים במסמך לפי המחלקות של המשחק ונצמדים
// ל-hudContainer הראשון שמופיע. העותק שלנו נושא אותן עם קידומת בלבד
const C = Q.HudDomCatalog;
ok("our copy carries the game's class names only behind the extension's cme_ prefix",
  C.ghostClass("BattleHudComponentStyle-hudContainer") === "cme_BattleHudComponentStyle-hudContainer" &&
  C.ghostClass("BattleHudComponentStyle-tabButton").endsWith("BattleHudComponentStyle-tabButton"));
const ghostRoot = node("");
const gcol = node("", { x: 0, y: 0, w: 10, h: 10 }, ghostRoot);
node(C.ghostClass("BattleHudComponentStyle-tabButton"), { x: 0, y: 0, w: 10, h: 10 }, gcol);
ok("…and the same catalogue finds its nodes there through the prefix",
  C.ELEMENTS.find((e) => e.id === "buttons").find(ghostRoot, C.ghostClass).length === 1);
ok("…while the live selectors never match the copy",
  C.ELEMENTS.find((e) => e.id === "buttons").find(ghostRoot, C.liveClass).length === 0);

// ---- שקיפות הצ'אט: uniform ב-shader של הצ'אט ----

function makeGl() {
  const calls = [];
  function Gl() {}
  Object.assign(Gl.prototype, {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, SHADER_TYPE: 3, COMPILE_STATUS: 4, BLEND_SRC_RGB: 5, ONE: 1,
    _shaders: new Map(),
    shaderSource(s, src) { s.src = src; },
    compileShader(s) { s.compiled = s.src; },
    getShaderParameter(s, p) { return p === 3 ? s.type : !/SYNTAX/.test(s.src); },
    getAttachedShaders(p) { return p.shaders; },
    linkProgram(p) { p.linked = p.shaders.map((s) => s.compiled); },
    getUniformLocation(p, name) { return { name }; },
    useProgram(p) { this._p = p; },
    getParameter() { return this._blend; },
    uniform1f(loc, v) { calls.push([loc.name, v]); },
    drawElements() {},
  });
  return { Gl, calls };
}
const { Gl, calls } = makeGl();
const main = { console: { log() {} }, WebGL2RenderingContext: Gl };
vm.createContext(main);
vm.runInContext("globalThis.window = globalThis;", main);
let opacity = 0.3;
main.window.__HUD = { internals: { opacityOf: (id) => (id === "chat" ? opacity : 1) }, debug: {} };
vm.runInContext(fs.readFileSync(path.join(EXT, "features/hud/apply/game/chat_alpha.js"), "utf8"), main);

const gl = new Gl();
gl._blend = 1;
const VERT = "#version 300 es\nuniform float u_firstLineIndex;\nuniform float u_maxLines;\nvoid main(){}";
const FRAG = "#version 300 es\nprecision mediump float;\nout vec4 outColor0;\nuniform sampler2D u_fontTexture;\nvoid main() {\n outColor0 = vec4(1.0);\n}";
const mk = (type, src) => { const s = { type }; gl.shaderSource(s, src); gl.compileShader(s); return s; };
const chatProgram = { shaders: [mk(1, VERT), mk(2, FRAG)] };
gl.linkProgram(chatProgram);
const linked = chatProgram.linked[1];
ok("the chat's fragment shader gets an opacity uniform", /uniform float cme_hudAlpha;/.test(linked));
ok("…multiplying its output as the last statement of main",
  /outColor0 = vec4\(outColor0\.rgb \* mix\(1\.0, cme_hudAlpha, cme_hudPremul\), outColor0\.a \* cme_hudAlpha\);\n\}$/.test(linked));
gl.useProgram(chatProgram);
gl.drawElements();
ok("…set to the chat's opacity right before each of its draws",
  calls.some((c) => c[0] === "cme_hudAlpha" && c[1] === 0.3));
ok("…with premultiplied colour recognised from the blend state (ONE)",
  calls.some((c) => c[0] === "cme_hudPremul" && c[1] === 1));

const other = { shaders: [mk(1, "#version 300 es\nvoid main(){}"), mk(2, FRAG)] };
gl.linkProgram(other);
ok("any other program is left exactly as the game wrote it", other.linked[1] === FRAG);
calls.length = 0;
gl.useProgram(other);
gl.drawElements();
ok("…and its draws are not touched", calls.length === 0);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
