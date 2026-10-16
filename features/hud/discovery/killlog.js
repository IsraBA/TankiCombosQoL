// features/hud/discovery/killlog.js  [ISOLATED world]

// יומן ההריגות: אזור בשברי מסך, מהקונפיגורציה של DESKTOP. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});
  const { NUM, ID, esc, re, reg } = P;
  const G = "(" + ID + ")";

  // שם ה-lateinit שורד מיזעור: הפונקציה שמחזירה את האזור
  const AREA = "getActionLogAreaInWindowCoordinates";

  // המחלקה, שדה האזור, והאסטרטגיה שהבנאי שלה בוחר
  function logNode(src, kinds) {
    const m = re("=new ", G, "\\(function\\(t\\)\\{var n=t\\.", G, ";if\\(null!=n\\)return n;", ID, "\\(\"", AREA, "\"\\)\\}").exec(src);
    if (!m) return null;
    const at = P.fnOffsets(src, m[1], m.index)[0];
    const k = at != null && re("var ", G, "=", ID, "\\(", ID, "\\(\\)\\)\\.", ID, "\\(", G, "\\);", ID, "\\(this,\\1,", NUM, ",", NUM, "\\)")
      .exec(src.slice(at, at + 3000));
    if (!k || !kinds[k[2]]) return null;
    return { at: m.index, field: m[2], k: kinds[k[2]], a: [Number(k[3]), Number(k[4])] };
  }

  // המתודה שכותבת את השדה, ובאיזה ארגומנט
  function setterOf(src, field) {
    const m = re(ID, "\\(", ID, "\\)\\.", G, "=function\\(([a-z](?:,[a-z])*)\\)\\{[^{}]*?this\\.", esc(field), "=([a-z])[,}]").exec(src);
    return m ? { name: m[1], arg: m[2].split(",").indexOf(m[3]) } : null;
  }

  // שמות מחלקה חוזרים בין מודולים: מחפשים רק במודול של האתר
  const inModule = (src, mod, rx) => {
    rx.lastIndex = mod.start;
    const m = rx.exec(src);
    return m && m.index < mod.end ? m : null;
  };

  // n.fz9(L([DESKTOP(),LOCAL()]),new F(t)) -> המחלקה שהמפעל F בונה
  function desktopConfig(src) {
    const reg1 = reg("\\.", ID, "\\(", ID, "\\(\\[", G, "\\(\\),", ID, "\\(\\)\\]\\),new ", G, "\\(t\\)\\)");
    let m;
    while ((m = reg1.exec(src))) {
      const e = P.enumAt(src, m[1], m.index);
      if (!e || e.name !== "DESKTOP") continue;
      const mod = P.moduleOf(src, m.index);
      const made = mod && inModule(src, mod,
        reg(ID, "\\(", esc(m[2]), "\\)\\.", ID, "=function\\(t\\)\\{[^]{0,2000}?return new ", G, "\\("));
      return made ? { cls: made[1], mod } : null;
    }
    return null;
  }

  // הקריאה לסטר מתוך מתודות הקונפיגורציה -> פונקציית האזור
  function areaFn(src, config, setter) {
    const defs = reg(ID, "\\(", esc(config.cls), "\\)\\.", ID, "=function\\(t\\)\\{");
    defs.lastIndex = config.mod.start;
    const next = reg(ID, "\\(", ID, "\\)\\.", ID, "=function\\(");
    let d;
    while ((d = defs.exec(src)) && d.index < config.mod.end) {
      // גוף המתודה בלבד: עד המתודה הבאה
      next.lastIndex = d.index + d[0].length;
      const e = next.exec(src);
      const body = src.slice(d.index, e ? e.index : d.index + 4000);
      const call = re("\\.", esc(setter.name), "\\(([^()]*)\\)").exec(body);
      const name = call && call[1].split(",")[setter.arg];
      if (name && /^[\w$]+$/.test(name)) return { name, at: d.index };
    }
    return null;
  }

  // function A(t){return X.m(t)} או X().m(t) -> {alias, method}
  function helperCall(src, fn, near) {
    const at = P.fnOffsets(src, fn, near)[0];
    const m = at != null && re("^function ", esc(fn), "\\(t\\)\\{return ", G, "(\\(\\))?\\.", G, "\\(t\\)\\}").exec(src.slice(at, at + 200));
    return m ? { at, alias: m[1], lazy: !!m[2], method: m[3] } : null;
  }

  // הכינוי -> המחלקה של המופע שמאחוריו, במודול שמייצא אותו
  function helperClass(src, call) {
    const ext = P.importOf(src, call.alias, call.at);
    if (!ext) return null;
    const ex = P.exportOf(src, ext.mod, ext.key,
      "(?:(" + ID + ")[,}]|function\\(\\)\\{return null==(" + ID + ")&&new (" + ID + "),\\2\\})");
    if (!ex) return null;
    if (ex[3]) return { mod: ext.mod, cls: ex[3] };
    const inst = re("[,;(]", esc(ex[1]), "=new ", G, "[,;)]").exec(src.slice(ext.mod.start, ext.mod.end));
    return inst ? { mod: ext.mod, cls: inst[1] } : null;
  }

  // גוף המתודה: ארבעה שברים של רוחב/גובה המסך, דרך בנאי l,t,r,b
  function fractions(src, helper, method, names) {
    const body = re(ID, "\\(", esc(helper.cls), "\\)\\.", esc(method), "=function\\(t\\)\\{([^{}]*)\\}")
      .exec(src.slice(helper.mod.start, helper.mod.end));
    if (!body) return null;
    const vars = {};
    for (const v of body[1].matchAll(reg("(", ID, ")=t\\.(", ID, ")\\(\\)"))) vars[v[1]] = v[2];
    const call = re("return ", ID, "\\.", G, "\\(", "((?:", NUM, "\\*(?:", ID, "|t\\.", ID, "\\(\\)),?){4})\\)$").exec(body[1]);
    if (!call) return null;
    const axis = (term) => {
      const acc = /^t\.([\w$]+)\(\)$/.exec(term);
      const name = acc ? acc[1] : vars[term];
      return name === names.w ? "w" : name === names.h ? "h" : null;
    };
    const args = call[2].split(",").map((a) => {
      const [num, term] = a.split("*");
      return { v: Number(num), axis: axis(term) };
    });
    if (args.map((a) => a.axis).join() !== "w,h,w,h") return null;
    // הבנאי חייב להיות left, top, right, bottom
    const ctor = re(ID, "\\(", ID, "\\)\\.", esc(call[1]), "=function\\(t,n,i,r\\)\\{var e=new ", ID, ";return e\\.", ID,
      "=t,e\\.", ID, "=n,e\\.", esc(names.setW), "\\(i-t\\),e\\.", esc(names.setH), "\\(r-n\\),e\\}").exec(src);
    if (!ctor) return null;
    return { l: args[0].v, t: args[1].v, r: args[2].v, b: args[3].v };
  }

  // הצמוד לימין: x = right - w, והגודל חלקי קנה המידה
  function layoutOk(src, names) {
    return re("\\.", esc(names.layout), "=function\\(t,n\\)\\{var i=this\\.", ID, "\\(n\\),r=[^;]*;",
      "this\\.", esc(names.setW), "\\(i\\.", ID, "/r\\),this\\.", esc(names.setH), "\\(i\\.", ID, "/r\\),",
      "this\\.", esc(names.setX), "\\(i\\.", ID, "\\(\\)-this\\.", esc(names.w), "\\(\\)\\),this\\.", esc(names.setY), "\\(i\\.", ID, "\\)").test(src);
  }

  // מתכון אחד לשתי הפריסות; wf/hf הם שבר מהמסך, חלקי קנה המידה
  P.killLog = function (src, kinds, names) {
    const node = logNode(src, kinds);
    const setter = node && setterOf(src, node.field);
    const config = setter && desktopConfig(src);
    const fn = config && areaFn(src, config, setter);
    const call = fn && helperCall(src, fn.name, fn.at);
    const helper = call && helperClass(src, call);
    const f = helper && fractions(src, helper, call.method, names);
    if (!f || !layoutOk(src, names)) return null;
    const round = (v) => Math.round(v * 1e9) / 1e9;   // 0.98-1 בלי שארית צפה
    const recipe = {
      k: node.k, a: node.a, wf: round(f.r - f.l), hf: round(f.b - f.t),
      x: { op: "right", off: 0, frac: round(f.r - 1) },
      y: { op: "top", off: 0, frac: f.t },
    };
    return { default: recipe, centered: Object.assign({}, recipe) };
  };
})();
