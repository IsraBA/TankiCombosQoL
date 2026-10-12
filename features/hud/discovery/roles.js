// features/hud/discovery/roles.js  [ISOLATED world]

// offset של כל אתר הוספה לשורש -> הרכיב שהוא מוסיף. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});
  const { ID, esc, re } = P;
  const G = "(" + ID + ")";

  // כל H(C).M=function( בסדר הופעה
  function methods(src) {
    const out = [];
    const rx = /[\w$]+\(([\w$]+)\)\.([\w$]+)=function\(/g;
    let m;
    while ((m = rx.exec(src))) out.push({ at: m.index, cls: m[1], name: m[2] });
    return out;
  }

  // המתודה שהאתר יושב בה
  function ownerOf(defs, at) {
    let lo = 0, hi = defs.length - 1, best = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (defs[mid].at < at) { best = defs[mid]; lo = mid + 1; } else hi = mid - 1;
    }
    return best;
  }

  // function F(t){var n=t.X;if(null!=n)return n;vj("name")}
  function lateName(src, fn, at) {
    const def = P.fnOffsets(src, fn, at)[0];
    if (def == null) return null;
    const m = re("^function ", esc(fn), "\\(t\\)\\{var n=t\\.", ID, ";if\\(null!=n\\)return n;", ID, "\\(\"(\\w+)\"\\)\\}")
      .exec(src.slice(def, def + 200));
    return m ? m[1] : null;
  }

  // הקולון בפריים הוא שם המתודה: אינדקס + 1
  function sites(src, name) {
    const out = [];
    const needle = "." + name + "(";
    let i = -1;
    while ((i = src.indexOf(needle, i + 1)) !== -1) out.push(i + 1);
    return out;
  }

  // lateinit -> שדה DI -> המחלקה שהוזרקה בו
  function injected(src, late) {
    const f = re("var n=t\\.", G, ";if\\(null!=n\\)return n;", ID, "\\(\"", late, "\"\\)").exec(src);
    const di = f && re("this\\.", esc(f[1]), "=this\\.", ID, "\\(\\)\\.", ID, "\\(", ID, "\\(", G, "\\)\\)").exec(src);
    return di ? di[1] : null;
  }

  // שם המחלקה שה-toString שלה נפתח בשם הזה
  function dataClass(src, name) {
    const i = src.indexOf("\"" + name + "(");
    const m = i > 0 && /[\w$]+\(([\w$]+)\)\.toString=function\(\)\{return$/.exec(src.slice(i - 80, i));
    return m ? m[1] : null;
  }

  // {offset: role}; תפקיד בלי אתר פשוט חסר
  P.offsets = function (src, names) {
    const defs = methods(src);
    const adds = sites(src, names.rootAdd).map((at) => {
      const a = /^([\w$]+)\((?:this|[a-z])\)\)/.exec(src.slice(at + names.rootAdd.length + 1, at + names.rootAdd.length + 40));
      return { at, arg: a ? lateName(src, a[1], at) : null, own: ownerOf(defs, at) };
    });
    const body = (x) => (x.own ? src.slice(x.own.at, x.at) : "");
    const nuke = dataClass(src, "NuclearRechargeHudParams");
    const tank = {
      hpBar: injected(src, "healthHudComponent"),
      energyBar: injected(src, "weaponStatusHudComponent"),
      activeSupplies: injected(src, "localStatusEffectHudComponent"),
    };

    const RULES = {
      killLog: (x) => x.arg === "logHudElement",
      radar: (x) => x.arg === "radarVisual",
      chat: (x) => x.arg === "battleChatHudElement",
      overdrive: (x) => /"shortcut"\)/.test(body(x)) && /"point"\)/.test(body(x)),
      nukeRing: (x) => !!nuke && body(x).includes("new " + nuke + "("),
      // נבנית בפונקציה רגילה: ה-throw שממש לפניה
      supplyRow: (x) => {
        const i = src.lastIndexOf("\"Invalid supply type \"", x.at);
        return i >= 0 && x.at - i < 1000;
      },
    };
    for (const role of Object.keys(tank)) RULES[role] = (x) => !!tank[role] && !!x.own && x.own.cls === tank[role];

    const out = {};
    for (const x of adds) {
      for (const role of Object.keys(RULES)) if (RULES[role](x)) out[x.at + 1] = role;
    }
    // חלקי מצב הקרב נוספים דרך statusAdd; הפריים הוא המתווך
    for (const at of sites(src, names.statusAdd)) {
      const own = ownerOf(defs, at);
      if (own && own.name !== names.statusAdd) out[at + 1] = "status";
    }
    return out;
  };
})();
