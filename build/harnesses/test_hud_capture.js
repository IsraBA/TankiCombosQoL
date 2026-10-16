// צד ה-MAIN של פיצ'ר ה-HUD, בארגז חול עם מנוע מזויף: המלכודות, זיהוי
// הרכיבים לפי ה-offset של מי שהוסיף אותם, הפיצול של שורת הסופלייס לפי צד,
// והטרנספורמציה עצמה — היסט, גודל ושקיפות על הרכיב הנכון בלבד.
// node build/harnesses/test_hud_capture.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const FILES = [
  "features/hud/model/elements.js",
  "features/hud/capture/game/names.js",
  "features/hud/capture/game/trap.js",
  "features/hud/capture/game/settings.js",
  "features/hud/capture/game/root.js",
  "features/hud/capture/game/groups.js",
  "features/hud/capture/game/measure.js",
  "features/hud/apply/game/overrides.js",
  "features/hud/apply/game/push.js",
  "features/hud/apply/game/transform.js",
  "features/hud/bridge/game/bridge_main.js",
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

// ---- מנוע מזויף בצורת המנוע האמיתי ----
// SceneNode מחזיק את ה-alpha ואת המעבר על העץ; DisplayNode מוסיף מלבן
// ואת toPixels — בדיוק ההפרדה ש-transform.js נשען עליה כשהוא מצל את alpha.
// @שם@ = השם מה-seed: רענון ה-seed לא שובר את המנוע המזויף.
// שמות שהמנוע לא חושף (__kids, __addKid) לא יתנגשו בשם ממוזער.
const ENGINE = `
function SceneNode(){ this.@parent@=null; this.__kids=[]; this._v=true; this._a=1; }
SceneNode.prototype.@traverse@=function(fn){ fn(this); for(var i=0;i<this.__kids.length;i++) this.__kids[i].@traverse@(fn); };
SceneNode.prototype.@visible@=function(){ return this._v; };
SceneNode.prototype.@alpha@=function(){ return this._a; };
SceneNode.prototype.__addKid=function(c){ c.@parent@=this; this.__kids.push(c); return c; };
function Rect(x,y,w,h){ this._x=x; this._y=y; this._w=w; this._h=h; }
Rect.prototype.@x@=function(){return this._x}; Rect.prototype.@y@=function(){return this._y};
Rect.prototype.@w@=function(){return this._w}; Rect.prototype.@h@=function(){return this._h};
Rect.prototype.@setX@=function(v){this._x=v}; Rect.prototype.@setY@=function(v){this._y=v};
Rect.prototype.@setW@=function(v){this._w=v}; Rect.prototype.@setH@=function(v){this._h=v};
function Strategy(s){ this.@scaleFactor@=s; }
Strategy.prototype.@strategyApply@=function(screen,node,out){
  var s=this.@scaleFactor@;
  out.@setX@((1-s)*screen.@w@()*(node.@anchorX@||0)+s*node.@x@());
  out.@setY@((1-s)*screen.@h@()*(node.@anchorY@||0)+s*node.@y@());
  out.@setW@(s*node.@w@()); out.@setH@(s*node.@h@());
};
function DisplayNode(x,y,w,h){ SceneNode.call(this); this._x=x; this._y=y; this._w=w; this._h=h;
  this.@strategy@=globalThis.STRATEGY; this.@anchorX@=0; this.@anchorY@=0; }
DisplayNode.prototype=Object.create(SceneNode.prototype);
DisplayNode.prototype.@x@=function(){return this._x}; DisplayNode.prototype.@y@=function(){return this._y};
DisplayNode.prototype.@w@=function(){return this._w}; DisplayNode.prototype.@h@=function(){return this._h};
DisplayNode.prototype.@setX@=function(v){this._x=v}; DisplayNode.prototype.@setY@=function(v){this._y=v};
DisplayNode.prototype.@setW@=function(v){this._w=v}; DisplayNode.prototype.@setH@=function(v){this._h=v};
DisplayNode.prototype.@toPixels@=function(screen,out){ this.@strategy@.@strategyApply@(screen,this,out); };
DisplayNode.prototype.@layout@=function(view,screen){};
function SupplyRow(x,y,w,h){ DisplayNode.call(this,x,y,w,h); }
SupplyRow.prototype=Object.create(DisplayNode.prototype);
SupplyRow.prototype.@layout@=function(view,screen){ for(var i=0;i<this.__kids.length;i++) this.__kids[i].@toPixels@(screen,globalThis.SCRATCH); };
function HudRoot(){ this.@rootContainer@=new DisplayNode(0,0,1,1); this.@rootAdd@=function(n){ this.@rootContainer@.__addKid(n); };
  this.@rootRemove@=function(n){ var a=this.@rootContainer@.__kids; var i=a.indexOf(n); if(i>=0) a.splice(i,1); };
  this.@rootTrap@=1; }
globalThis.SceneNode=SceneNode; globalThis.DisplayNode=DisplayNode; globalThis.SupplyRow=SupplyRow;
globalThis.Rect=Rect; globalThis.Strategy=Strategy; globalThis.HudRoot=HudRoot;
function BattleSettings(centered,size){ this.centered_1=centered; this.size_1=size; this.@settingsTrap@=true; }
BattleSettings.prototype.toString=function(){ return "BattleSettings(showAimHelperDot="+this.x+", isCenteredLayout="+this.centered_1+", battleUISize="+this.size_1+", autoSupply="+this.@settingsTrap@+")"; };
function HudService(s){ this.@serviceScale@=s; this.@serviceTrap@=1; }
HudService.prototype.@serviceMethods.0@=function(v){this.@serviceScale@=v}; HudService.prototype.@serviceMethods.1@=function(){return this.@serviceScale@};
HudService.prototype.@serviceMethods.2@=function(){ return globalThis.STRATEGY; };
globalThis.BattleSettings=BattleSettings; globalThis.HudService=HudService;
`;

// שורה אחת בדיוק: כל פונקציה מקבלת עמודה משלה, כמו פונקציות בבאנדל
const ADDERS =
  "globalThis.ADD={status:function(h,n){h.@rootAdd@(n)},killLog:function(h,n){h.@rootAdd@(n)},radar:function(h,n){h.@rootAdd@(n)},overdrive:function(h,n){h.@rootAdd@(n)},supplyRow:function(h,n){h.@rootAdd@(n)},hp:function(h,n){h.@rootAdd@(n)},fx:function(h,n){h.@rootAdd@(n)}};";

// לתוסף אין שמות מראש: מה שהגילוי מוצא בבאנדל החדש ביותר
const GAME = require("./game_names").hud();
const N = GAME.names;
function fill(src) {
  return src.replace(/@([\w.]+)@/g, (_, key) => {
    const v = key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), N);
    if (typeof v !== "string") throw new Error("no discovered name " + key);
    return v;
  });
}

function makeCtx() {
  const timeouts = [];
  const posted = [];
  const msg = [];
  let now = 0;

  // בלי built-ins מהמארח: המלכודת יושבת על Object.prototype של ההקשר עצמו
  const ctx = {
    console: { log() {}, error() {} },
    performance: { now: () => now },
    setTimeout(fn, ms) { timeouts.push({ fn, ms }); return timeouts.length; },
    clearTimeout(id) { if (id) timeouts[id - 1] = null; },
    setInterval() { return 0; },
    getComputedStyle: () => ({ fontSize: "16px" }),
    devicePixelRatio: 1,
    innerWidth: 1920,
    innerHeight: 950,
  };
  ctx.document = { documentElement: {} };
  ctx.postMessage = (data) => {
    posted.push(data);
    for (const fn of msg) fn({ source: ctx.window, data });
  };
  ctx.addEventListener = (type, fn) => { if (type === "message") msg.push(fn); };

  vm.createContext(ctx);
  vm.runInContext("globalThis.window = globalThis; window.TankiQoL = window.TankiQoL || {};", ctx);
  const protoNames = () => vm.runInContext("Object.getOwnPropertyNames(Object.prototype).join()", ctx);
  const protoBefore = protoNames();
  for (const f of FILES) {
    vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });
  }
  // לפני הגילוי: כלום לא ידוע וכלום לא חמוש
  const I0 = ctx.window.__HUD.internals;
  const early = {
    names: Object.keys(I0.N).every((k) => I0.N[k] === null) && ctx.window.__HUD.debug.names === null,
    traps: protoNames() === protoBefore,
  };
  // השמות מגיעים דרך הגשר, כמו מ-detect.js
  ctx.postMessage({ __hud: true, dir: "i2m", action: "hudGame", payload: { names: N } });
  vm.runInContext(fill(ENGINE), ctx, { filename: "engine.js" });
  vm.runInContext(fill(ADDERS), ctx, { filename: "adders.js" });

  return {
    ctx,
    early,
    posted,
    NS: ctx.window.__HUD,
    I: ctx.window.__HUD.internals,
    tick(t) { now += t == null ? 100 : t; },
    flush() {
      const due = timeouts.filter(Boolean);
      timeouts.length = 0;
      for (const t of due) t.fn();
    },
    send(action, payload) {
      ctx.postMessage({ __hud: true, dir: "i2m", action, payload });
    },
  };
}

// ---- בנייה: מלכודת השורש, ההגדרות והשירות ----

const env = makeCtx();
const { ctx, I, NS } = env;
const G = ctx;   // ה-global של ההקשר הוא ארגז החול עצמו

vm.runInContext("globalThis.STRATEGY = new Strategy(1); globalThis.SCRATCH = new Rect(0,0,1,1);", ctx);
vm.runInContext("globalThis.SCREEN = new Rect(0,0,1920,950);", ctx);

ok("no names before discovery — nothing is hardcoded", env.early.names);
ok("…and no trap on Object.prototype until they arrive", env.early.traps);
ok("the discovered names were taken whole", NS.debug.names === "bundle" && I.N.rootTrap === N.rootTrap);
ok("nothing is captured before the game builds anything", I.root === null);

vm.runInContext("globalThis.SETTINGS = new BattleSettings(false, 50);", ctx);
ok("the BattleSettings trap fired", NS.debug.settingsCaptures === 1);
ok("…and its field names were read out of its own toString",
  I.settingsFields.isCenteredLayout === "centered_1" && I.settingsFields.battleUISize === "size_1");
ok("…so the layout is known outside battle", I.layout() === "default");
ok("…along with the game's UI-scale slider", I.uiSize() === 50);

vm.runInContext("globalThis.SETTINGS2 = new BattleSettings(true, 70);", ctx);
ok("switching the layout in game is seen immediately", I.layout() === "centered");
vm.runInContext("globalThis.SETTINGS3 = new BattleSettings(false, 50);", ctx);

vm.runInContext("globalThis.SERVICE = new HudService(1.25);", ctx);
ok("the hud service is captured too", I.uiScale() === 1.25);

vm.runInContext("globalThis.HUD = new HudRoot();", ctx);
ok("the HUD root trap fired on the last field its ctor writes", NS.debug.captures === 1);
ok("…and the children container came with it", I.container === G.HUD[N.rootContainer]);

// ---- הוספת רכיבים: כל מוסיף מזוהה ב-offset משלו ----

vm.runInContext(`
globalThis.RADAR = new DisplayNode(24,100,150,150);
globalThis.LOG = new DisplayNode(1210,183,614,324);
globalThis.OVER = new DisplayNode(48,766,132,132);
globalThis.HP = new DisplayNode(780,839,304,10);
globalThis.ROW = new SupplyRow(0,0,1868,926);
globalThis.SLOT_L = new DisplayNode(162,814,44,44);
globalThis.SLOT_R = new DisplayNode(1697,814,44,44);
ROW.__addKid(SLOT_L); ROW.__addKid(SLOT_R);
globalThis.S1 = new DisplayNode(823,19,62,24);
globalThis.S2 = new DisplayNode(978,19,62,24);
ADD.radar(HUD, RADAR); ADD.killLog(HUD, LOG); ADD.overdrive(HUD, OVER);
ADD.hp(HUD, HP); ADD.supplyRow(HUD, ROW);
ADD.status(HUD, S1); ADD.status(HUD, S2);
`, ctx, { filename: "scene.js" });

const nodes = NS.nodes();
ok("every added element was recorded", nodes.length === 7);
ok("…each with an offset from the frame that added it",
  nodes.every((n) => typeof n.offset === "number" && n.offset > 0));
const statusOffsets = nodes.slice(5).map((n) => n.offset);
ok("two leaves added by the same function share one offset — that is the grouping key",
  statusOffsets[0] === statusOffsets[1]);
ok("…while different adders differ",
  new Set(nodes.slice(0, 5).map((n) => n.offset)).size === 5);

// הטבלה שהגילוי יפיק לכל בילד; כאן נלמדת מהמנוע המזויף
I.applyGame({ offsets: {
  [nodes[0].offset]: "radar",
  [nodes[1].offset]: "killLog",
  [nodes[2].offset]: "overdrive",
  [nodes[3].offset]: "hpBar",
  [nodes[4].offset]: "supplyRow",
  [statusOffsets[0]]: "status",
} });
ok("elements added before the table arrived get their role from it",
  NS.nodes()[0].role === "radar" && NS.nodes()[5].role === "status");

// ---- ציור: קיבוץ, ופיצול השורה לפי צד ----

function draw(node) {
  const out = new G.Rect(0, 0, 1, 1);
  node[N.toPixels](G.SCREEN, out);
  return { x: out[N.x](), y: out[N.y](), w: out[N.w](), h: out[N.h]() };
}

draw(G.RADAR);
ok("the first draw handed us the screen rect and the rect constructor",
  I.screen === G.SCREEN && I.RectCtor === G.Rect);

const groups = NS.groups();
ok("the status leaves became one element", groups.status && groups.status.length === 2);
ok("the kill log is its own element", groups.killLog && groups.killLog.length === 1);
ok("the supply row split by side: the left slot is the grenade group",
  groups.grenades && groups.grenades.length === 1);
ok("…and the right slot is the supplies group",
  groups.supplies && groups.supplies.length === 1);
ok("a node inside the row resolves to its side's element",
  I.groupOf(G.SLOT_L) === "grenades" && I.groupOf(G.SLOT_R) === "supplies");
ok("the bars element gathers the hp bar", groups.bars && groups.bars.length === 1);

// ---- ההעדפות: היסט, גודל ושקיפות ----

const before = draw(G.RADAR);
near("with no preferences the draw is untouched (x)", before.x, 24);
near("…and the size is the game's", before.w, 150);

I.applySettings({ layouts: { default: { elements: { radar: { dx: 0.1, dy: 0, scale: 2, opacity: 0.5 } } } } });
env.tick();
const moved = draw(G.RADAR);
near("an offset of 0.1 screen widths moves the radar by exactly that", moved.x - 24 - (150 / 2), 0.1 * 1920 - 150);
near("…scaling doubles its size", moved.w, 300);
near("…about its own centre, so the centre only moved by the offset",
  moved.x + moved.w / 2, before.x + before.w / 2 + 0.1 * 1920);
near("opacity multiplies the node's own alpha", G.RADAR[N.alpha](), 0.5);
near("…and leaves an untouched element alone", G.LOG[N.alpha](), 1);

const other = draw(G.LOG);
near("an element with no preference is drawn exactly as the game drew it", other.x, 1210);

// ---- מה שלא נגרר בפריסה הזאת לא זז ----

I.applySettings({ layouts: { default: { elements: { bars: { dx: 0.3, dy: 0, scale: 1.5, opacity: 1 } } } } });
env.tick();
let bars = draw(G.HP);
near("in the default layout the bars are static, so the offset applies",
  bars.x + bars.w / 2 - (780 + 304 / 2), 0.3 * 1920);

vm.runInContext("globalThis.SETTINGS4 = new BattleSettings(true, 50);", ctx);
I.markLayoutChanged();
I.applySettings({ layouts: { centered: { elements: { bars: { dx: 0.3, dy: 0, scale: 1.5, opacity: 0.4 } } } } });
env.tick();
// בממורכזת המשחק מציב בכל פריים את העוגן של כל פס על נקודת הטנק,
// וחלק נוסף של הקבוצה — כאן פס שני — יושב מתחת לראשון
vm.runInContext(fill("HP.@anchorX@ = 932; HP.@anchorY@ = 870; globalThis.EN = new DisplayNode(780, 855, 304, 8); HP.__addKid(EN);"), ctx);
bars = draw(G.HP);
near("in the centered layout they ride the tank, so the offset is refused: it grows about the tank point",
  bars.x, 932 + (780 - 932) * 1.5);
near("…vertically too", bars.y, 870 + (839 - 870) * 1.5);
near("…but the size still applies", bars.w, 304 * 1.5);
near("…and so does the opacity", G.HP[N.alpha](), 0.4);
// כולם סביב אותה נקודה: הרווחים גדלים באותו יחס כמו הפסים
let en = draw(G.EN);
near("the gap to the next part grows by the same factor as the parts",
  en.y - (bars.y + bars.h), (855 - (839 + 10)) * 1.5);

// הטנק נוסע: הפסים והעוגן זזים איתו, וההגדלה נשארת סביב הנקודה החיה —
// נקודה קבועה על המסך הייתה הופכת כל צעד של הטנק להזזה
vm.runInContext(fill("HP._x = 1200; HP._y = 300; EN._x = 1200; EN._y = 316; HP.@anchorX@ = 1352; HP.@anchorY@ = 331;"), ctx);
env.tick();
bars = draw(G.HP);
en = draw(G.EN);
near("after the tank moved, the bar keeps its place relative to the tank",
  bars.x, 1352 + (1200 - 1352) * 1.5);
near("…at the new height too", bars.y, 331 + (300 - 331) * 1.5);
near("…and the gap is still the scaled one", en.y - (bars.y + bars.h), (316 - 310) * 1.5);
// המצבים הפעילים הם רכיב משלהם, ובממורכזת הפסים דוחפים אותם: שורה מעל
// נקודת הטנק נצמדת לקצה העליון של הפסים ושורה מתחתיה לתחתון. הפסים כאן
// ב-300..324 ונקודת הטנק ב-331, כלומר שתי השורות נמדדות מקצה אחר
vm.runInContext(`
globalThis.FX = new DisplayNode(0,0,1,1);
globalThis.FX_UP = new DisplayNode(1337,262,30,30); globalThis.FX_DOWN = new DisplayNode(1337,339,30,30);
FX.__addKid(FX_UP); FX.__addKid(FX_DOWN); ADD.fx(HUD, FX);
`, ctx, { filename: "effects.js" });
const fxEntry = I.topNodes.find((e) => e.node === G.FX);
I.applyGame({ offsets: Object.assign({}, I.offsets, { [fxEntry.offset]: "activeSupplies" }) });
I.markLayoutChanged();
I.applySettings({ layouts: { centered: { elements: { bars: { scale: 1.5 } } } } });
env.tick();
ok("the active effects are their own element, apart from the bars", I.groupOf(G.FX_UP) === "effects");
let up = draw(G.FX_UP), down = draw(G.FX_DOWN);
bars = draw(G.HP);
// הפסים גדלים פי 1.5 סביב נקודת הטנק: הקצה העליון 331-31*1.5
near("growing the bars pushes the row above them up by exactly the bars' growth",
  up.y, 331 + 1.5 * (300 - 331) + (262 - 300));
near("…keeping the game's own gap between them", bars.y - (up.y + up.h), 300 - (262 + 30));
near("…and the row below them follows the bars' bottom edge", down.y, 331 + 1.5 * (324 - 331) + (339 - 324));
near("…while the effects themselves keep their size", up.w, 30);
I.applySettings({ layouts: { centered: { elements: { bars: { scale: 1.5 }, effects: { scale: 2, opacity: 1 } } } } });
env.tick();
up = draw(G.FX_UP);
near("growing the effects as well grows the row away from the bars, never onto them",
  bars.y - (up.y + up.h), 2 * (300 - (262 + 30)));
near("…at their own scale", up.w, 60);
vm.runInContext(fill("HUD.@rootRemove@(FX);"), ctx);
I.markLayoutChanged();
vm.runInContext("HP._x = 780; HP._y = 848; HP.__kids.length = 0;", ctx);

// ---- פריסה מחדש של המשחק אינה ציור ----

vm.runInContext("globalThis.SETTINGS5 = new BattleSettings(false, 50);", ctx);
I.markLayoutChanged();
I.applySettings({ layouts: { default: { elements: { supplies: { dx: 0.25, dy: 0, scale: 1, opacity: 1 } } } } });
env.tick();
const insideLayout = (() => {
  G.ROW[N.layout](G.SCREEN, G.SCREEN);     // הרכיב פורס את ילדיו
  return { x: G.SCRATCH[N.x]() };
})();
near("a draw inside a layout pass stays the game's own number", insideLayout.x, 1697);
const drawn = draw(G.SLOT_R);
near("…while the same node drawn normally is moved", drawn.x - 1697, 0.25 * 1920);
ok("the layout pass was counted, not transformed", NS.debug.layoutCalls > 0);

// ---- מדידה ----

env.flush();
const rec = NS.measure();
ok("a measurement covers every element on screen",
  rec && Object.keys(rec.groups).sort().join() === "bars,grenades,killLog,overdrive,radar,status,supplies");
ok("…and records the screen it was taken on", rec.screen.w === 1920 && rec.screen.h === 950);
ok("…with the layout it belongs to", rec.layout === "default");
ok("…the game's UI scale, for replaying it elsewhere", rec.uiSize === 50 && rec.scale === 1.25);
const r = rec.groups.radar;
ok("each element carries its logical box, anchors and strategy kind",
  r.l[0] === 24 && r.l[2] === 150 && Array.isArray(r.a) && typeof r.k === "string");
ok("the status element's box spans both of its leaves",
  rec.groups.status.l[0] === 823 && rec.groups.status.l[2] === 978 + 62 - 823);

// קונטיינר בלי גודל הוא 1x1 בראשית הצירים (ברירת המחדל של המנוע). הוא
// לא מצויר, ואם ייכנס לתיבה — היא תתחיל ב-(0,0) ומרכז הסיבוב יזוז לפינה.
// זה בדיוק מה שהעיף את הפסים בפריסה הממורכזת בכל הגדלה.
vm.runInContext(`
globalThis.EMPTY_BOX = new DisplayNode(0,0,1,1); __HUD.internals.groupMembers("radar")[0].__addKid(EMPTY_BOX);
`, ctx, { filename: "empty.js" });
I.markLayoutChanged();
env.flush();
const recEmpty = NS.measure();
ok("an unsized 1x1 container at the origin does not widen the group box",
  recEmpty.groups.radar.l[0] === 24 && recEmpty.groups.radar.l[1] === 100);

// ילד מוסתר (טולטיפ, חריץ ריק) לא מנפח את התיבה של הרכיב
vm.runInContext(`
globalThis.TIP = new DisplayNode(1475,200,88,239); TIP._v = false; SLOT_R.__addKid(TIP);
`, ctx, { filename: "tip.js" });
I.markLayoutChanged();
const rec2 = NS.measure();
ok("a hidden child is left out of its element's box",
  rec2.groups.supplies.l[1] === 814 && rec2.groups.supplies.l[3] === 44);

// ---- הגשר ----

env.posted.length = 0;
env.send("hudSettings", { layouts: { default: { elements: { radar: { scale: 1.75 } } } } });
ok("settings sent from ISOLATED reach the apply path",
  I.settings.layouts.default.elements.radar.scale === 1.75);

env.send("hudMeasureRequest", { id: 7 });
const reply = env.posted.find((m) => m.action === "hudMeasureResult");
ok("a measure request is answered with the same id", reply && reply.payload.id === 7);
ok("…and carries the record", reply.payload.ok === true && !!reply.payload.record.groups.radar);

env.posted.length = 0;
env.send("hudStateRequest");
const state = env.posted.find((m) => m.action === "hudState");
ok("a state request answers with the layout and scale",
  state && state.payload.layout === "default" && state.payload.scale === 1.25);
ok("…and says a battle is on", state.payload.inBattle === true);

// ---- הסרה ----

vm.runInContext(fill("HUD.@rootRemove@(RADAR);"), ctx);
ok("removing an element forgets it", NS.nodes().length === 6);
ok("…and its nodes stop belonging to any element", I.groupOf(G.RADAR) === null);

// ---- מטמון ישן שהתחדש: שמות אחרים מהגילוי ----

const renamed = Object.assign({}, I.N, { rootTrap: "zz9_1", settingsTrap: "yy9_1" });
const partial = Object.assign({}, renamed);
delete partial.alpha;
I.applyGame({ names: partial });
ok("a partial set of names is ignored — the current ones stay whole",
  I.N.rootTrap === N.rootTrap && I.N.alpha === N.alpha);

env.send("hudGame", { names: renamed });
ok("a complete set from the bridge replaces them", I.N.rootTrap === "zz9_1" && NS.debug.names === "bundle");
vm.runInContext(fill(`
function HudRoot2(){ this.@rootContainer@=new DisplayNode(0,0,1,1); this.@rootAdd@=function(n){ this.@rootContainer@.__addKid(n); };
  this.@rootRemove@=function(n){}; this.zz9_1=1; }
function BattleSettings2(){ this.centered_1=true; this.size_1=50; this.yy9_1=true; }
BattleSettings2.prototype.toString=BattleSettings.prototype.toString;
globalThis.HUD2 = new HudRoot2(); globalThis.SETTINGS4 = new BattleSettings2();
`), ctx, { filename: "newbuild.js" });
ok("…and the root trap is armed on the new field", I.root === G.HUD2);
ok("…as is the settings trap", I.battleSettings === G.SETTINGS4 && I.layout() === "centered");
// השמות הקודמים שייכים עכשיו למחלקות זרות: המלכודות שלהם יורדות
const onProto = (prop) => vm.runInContext("!!Object.getOwnPropertyDescriptor(Object.prototype, " + JSON.stringify(prop) + ")", ctx);
ok("…and the previous root and settings traps are off Object.prototype",
  !onProto(N.rootTrap) && !onProto(N.settingsTrap));
ok("…while the service trap, whose name did not change, stays", onProto(N.serviceTrap));

ok("nothing threw along the way", NS.debug.lastError === null);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
