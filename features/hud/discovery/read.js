// features/hud/discovery/read.js  [ISOLATED world]

// קריאת קבועים מהבאנדל: ביטויים רגולריים, ושלוש צורות של קבוע
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});

  P.NUM = "(-?[\\d.]+)";
  // שמות ממוזערים עשויים להכיל $
  P.ID = "[\\w$]+";

  P.esc = (s) => String(s).replace(/\$/g, "\\$");
  P.re = (...parts) => new RegExp(parts.join(""));
  P.reg = (...parts) => new RegExp(parts.join(""), "g");
  P.L = () => window.TankiQoL.HudLayout;

  const { NUM, ID, esc, re } = P;

  // שם ממוזער חוזר בכמה מודולים; ההגדרה הנכונה היא הקרובה לעוגן
  P.fnOffsets = function (src, name, near) {
    const needle = "function " + name + "(";
    const out = [];
    let i = -1;
    while ((i = src.indexOf(needle, i + 1)) !== -1) out.push(i);
    return out.sort((a, b) => Math.abs(a - near) - Math.abs(b - near));
  };

  // <VAR>=new <Size>(a,b) או <VAR>=<num>, בפונקציית האתחול
  P.initValue = function (src, initFn, varName, near) {
    for (const at of P.fnOffsets(src, initFn, near).slice(0, 4)) {
      const body = src.slice(at, at + 4000);
      let m = re("[,(]", esc(varName), "=new (", ID, ")\\(", NUM, ",", NUM, "\\)").exec(body);
      if (m) return { cls: m[1], a: Number(m[2]), b: Number(m[3]) };
      m = re("[,(]", esc(varName), "=", NUM, "[,)]").exec(body);
      if (m) return Number(m[1]);
    }
    return null;
  };

  // function NAME(){return INIT(),VAR} — קבוע עצל בקוטלין
  P.lazyValue = function (src, accessor, near) {
    for (const at of P.fnOffsets(src, accessor, near).slice(0, 4)) {
      const m = re("^function ", esc(accessor), "\\(\\)\\{return (", ID, ")\\(\\),(", ID, ")\\}")
        .exec(src.slice(at, at + 200));
      if (m) return P.initValue(src, m[1], m[2], at);
    }
    return null;
  };

  // function NAME(){return null==V&&new C,V}, ואז this.<field>=<num>
  P.companionNum = function (src, accessor, field, near) {
    for (const at of P.fnOffsets(src, accessor, near).slice(0, 4)) {
      const m = re("^function ", esc(accessor), "\\(\\)\\{return null==(", ID, ")&&new (", ID, "),\\1\\}")
        .exec(src.slice(at, at + 200));
      if (!m) continue;
      for (const cAt of P.fnOffsets(src, m[2], at).slice(0, 4)) {
        const f = re("this\\.", esc(field), "=", NUM, "[,;})]").exec(src.slice(cAt, cAt + 3000));
        if (f) return Number(f[1]);
      }
    }
    return null;
  };

  // רוחב או גובה של מחלקת הגודל של המשחק
  P.sizeMember = function (src, accessor, field, near, fields) {
    const v = P.lazyValue(src, accessor, near);
    if (v == null) return null;
    if (typeof v === "number") return v;
    return field === fields.h ? v.b : v.a;
  };
})();
