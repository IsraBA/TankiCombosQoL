// features/hud/discovery/modules.js  [ISOLATED world]

// מודולי webpack וערכי enum, גם מעבר לגבול מודול. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});
  const { ID, esc, re, reg } = P;

  // <id>:(t,n,i)=>{!function(פרמטרים){…}(t.exports,i(<id>),…)}
  const MODULE_HEAD = ":(t,n,i)=>{!function(";

  P.moduleOf = function (src, at) {
    const head = src.lastIndexOf(MODULE_HEAD, at);
    if (head < 0) return null;
    const id = /[,{]([\de]+)$/.exec(src.slice(Math.max(0, head - 12), head));
    const params = /^([^)]*)\)\{/.exec(src.slice(head + MODULE_HEAD.length, head + MODULE_HEAD.length + 20000));
    const end = src.indexOf("}(t.exports", at);
    // גם המזהים ממוזערים: 12000 נכתב 12e3
    const args = end >= 0 && /^\}\(t\.exports((?:,i\([\de]+\))*)\)/.exec(src.slice(end, end + 40000));
    if (!id || !params || !args) return null;
    const names = params[1].split(",");
    const ids = ["exports"].concat(args[1].split(",").slice(1).map((a) => String(Number(a.slice(2, -1)))));
    if (names.length !== ids.length) return null;
    return { id: String(Number(id[1])), start: head, end, names, ids };
  };

  // המפתח במפת המודולים כתוב כמו שהממזער כתב אותו
  function idSpellings(id) {
    const out = [id];
    const m = /^(\d*?[1-9])(0+)$/.exec(id);
    if (m) out.push(m[1] + "e" + m[2].length);
    return out;
  }

  function moduleById(src, id) {
    for (const key of idSpellings(id)) {
      for (const lead of [",", "{"]) {
        const at = src.indexOf(lead + key + MODULE_HEAD);
        if (at >= 0) return P.moduleOf(src, at + lead.length + key.length + MODULE_HEAD.length);
      }
    }
    return null;
  }

  // שם ממוזער חוזר בין מודולים, לא בתוכם
  function defsIn(src, mod, name) {
    const needle = "function " + name + "(";
    const out = [];
    let i = src.indexOf(needle, mod.start);
    while (i !== -1 && i < mod.end) { out.push(i); i = src.indexOf(needle, i + 1); }
    return out;
  }

  // var=new C("NAME",n[,קטגוריה]); הקטגוריה היא בעצמה ערך enum
  function entryIn(src, mod, initFn, varName, depth) {
    for (const at of defsIn(src, mod, initFn)) {
      const m = re(
        "[,(]", esc(varName), "=new ", ID, "\\(\"(\\w+)\",\\d+(?:,(?:\\((", ID, ")\\(\\),(", ID, ")\\)|(", ID, ")\\(\\)))?\\)"
      ).exec(src.slice(at, at + 3000));
      if (!m) continue;
      let of = null;
      if (m[2]) of = entryIn(src, mod, m[2], m[3], depth + 1);
      else if (m[4]) of = accessorIn(src, mod, m[4], depth + 1);
      return { name: m[1], of: of ? of.name : null };
    }
    return null;
  }

  // function F(){return init(),var}
  function accessorIn(src, mod, fn, depth) {
    if (depth > 4) return null;
    for (const at of defsIn(src, mod, fn)) {
      const m = re("^function ", esc(fn), "\\(\\)\\{return (", ID, ")\\(\\),(", ID, ")\\}").exec(src.slice(at, at + 200));
      if (m) return entryIn(src, mod, m[1], m[2], depth);
    }
    return null;
  }

  // accessor ב-at -> {name, of}; מקומי או דרך $_$
  P.enumAt = function (src, name, at) {
    const mod = P.moduleOf(src, at);
    if (!mod) return null;
    const imp = reg("[,;]", esc(name), "=(", ID, ")\\.\\$_\\$\\.(", ID, ")[,;]");
    imp.lastIndex = mod.start;
    const m = imp.exec(src);
    if (!m || m.index > at) return accessorIn(src, mod, name, 0);

    const target = moduleById(src, mod.ids[mod.names.indexOf(m[1])]);
    if (!target) return null;
    const table = src.indexOf("t.$_$=t.$_$||{}", target.start);
    if (table < 0 || table > target.end) return null;
    const ex = re("t\\.\\$_\\$\\.", esc(m[2]), "=(?:(", ID, ")[,}]|function\\(\\)\\{return (", ID, ")\\(\\),(", ID, ")\\})")
      .exec(src.slice(table, target.end));
    if (!ex) return null;
    return ex[1] ? accessorIn(src, target, ex[1], 0) : entryIn(src, target, ex[2], ex[3], 0);
  };
})();
