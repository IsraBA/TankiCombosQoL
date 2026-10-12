// features/hud/discovery/strategies.js  [ISOLATED world]

// ארבע אסטרטגיות הסקיילינג, מתודת הפרמטרים, והרדאר שמלמד את סוגי הפריסה
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});
  const { NUM, ID, esc, re, reg } = P;

  // סינגלטון של אסטרטגיה -> iy/ry/ny/ey; names מ-engine.js
  P.strategyKinds = function (src, names) {
    const impl = {};   // key class -> strategy class
    const kindImpl = reg(ID, "\\((", ID, ")\\)\\.", esc(names.factory), "=function\\(\\)\\{return new (", ID, ")\\}");
    let m;
    while ((m = kindImpl.exec(src))) impl[m[1]] = m[2];

    // כל אסטרטגיה מזוהה בגוף מתודת ההחלה שלה, שהוא ייחודי
    const H = ID + "\\((" + ID + ")\\)\\." + esc(names.strategyApply) + "=function\\(t,n,i\\)\\{";
    const setX = "i\\." + esc(names.setX) + "\\(";
    const bodies = {
      iy: re(H, setX, "\\(1-this\\.", ID, "\\)\\*t\\."),
      ry: re(H, "var [\\s\\S]{0,200}?16/9"),
      ny: re(H, setX, "n\\.", ID, "\\(\\)\\+\\(this\\."),
      ey: re(H, setX, "n\\.", ID, "\\(\\)-n\\."),
    };
    const byStrategy = {};   // strategy class -> our name
    for (const name of Object.keys(bodies)) {
      const hit = bodies[name].exec(src);
      if (hit) byStrategy[hit[1]] = name;
    }

    const out = {};
    for (const keyClass of Object.keys(impl)) {
      const ours = byStrategy[impl[keyClass]];
      if (!ours) continue;
      // <var>=new <key>: indexOf, כי regex שמתחיל ב-ID סורק כל תו
      const needle = "=new " + keyClass;
      for (let i = src.indexOf(needle); i !== -1; i = src.indexOf(needle, i + 1)) {
        if (!/[,;)]/.test(src[i + needle.length])) continue;
        const v = /[\w$]+$/.exec(src.slice(Math.max(0, i - 40), i));
        if (v) { out[v[0]] = ours; break; }
      }
    }
    return Object.keys(out).length === 4 ? out : null;
  };

  // מתודת הפרמטרים: הנפוצה בין הקריאות שמקבלות סינגלטון אסטרטגיה
  P.paramsCall = function (src, kinds) {
    const vars = Object.keys(kinds).map(esc).join("|");
    const rx = reg("\\.(", ID, ")\\((?:", vars, "),", NUM, ",", NUM, "\\)");
    const tally = {};
    let m;
    while ((m = rx.exec(src))) tally[m[1]] = (tally[m[1]] || 0) + 1;
    let best = null;
    for (const k of Object.keys(tally)) if (!best || tally[k] > tally[best]) best = k;
    return best;
  };

  // ---- הרדאר ----

  // תבנית יחידה בבאנדל; ממנה גם שמות שתי הפריסות
  P.radar = function (src, kinds, call) {
    const rx = reg(
      esc(call), "\\((", ID, ")," + NUM + "," + NUM + "\\)[\\s\\S]{0,140}?",
      "new ", ID, "\\(new ", ID, "\\(", NUM, ",", NUM, "\\),new ", ID, "\\(", NUM, ",", NUM, "\\)\\),(", ID, ")\\(\\)"
    );
    const hits = [];
    let m;
    while ((m = rx.exec(src))) {
      hits.push({
        k: kinds[m[1]] || null,
        a: [Number(m[2]), Number(m[3])],
        x: Number(m[4]), y: Number(m[5]),
        w: Number(m[6]), h: Number(m[7]),
        type: m[8],
      });
    }
    if (hits.length !== 2 || hits.some((h) => !h.k) || hits[0].type === hits[1].type) return null;
    // הענף הראשון (ה-if) הוא הממורכז
    const [centered, dflt] = hits;
    return {
      hudTypes: { centered: centered.type, default: dflt.type },
      recipes: {
        centered: { k: centered.k, a: centered.a, w: centered.w, h: centered.h,
          x: { op: "center", off: centered.x }, y: { op: "bottom", off: centered.y } },
        default: { k: dflt.k, a: dflt.a, w: dflt.w, h: dflt.h,
          x: { op: "left", off: dflt.x }, y: { op: "top", off: dflt.y } },
      },
    };
  };
})();
