// features/hud/discovery/navigation.js  [ISOLATED world]

// איך המשחק עצמו פותח את ההגדרות בקטגוריה: שתי פעולות. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});
  const { ID, esc, re, reg } = P;
  const G = "(" + ID + ")";
  const lit = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // מחרוזות ששורדות מיזעור: ה-enum, המסך, וה-toString של פעולת המעבר
  const CATEGORY = "tanks.client.lobby.redux.settings.SettingsCategory.";
  const SCREEN = "Lobby.Settings";
  const GO_TO = "GoTo(screen=";
  // הכרטיסייה שכפתור העורך יושב בה
  const CONTROLS = "CONTROL";

  // תחילת המקור, עד סוף הפונקציה; לפיה MAIN מזהה אותה
  function head(src, at) {
    let depth = 0;
    for (let i = src.indexOf("{", at); i !== -1 && i < at + 4000; i++) {
      const c = src[i];
      if (c === '"' || c === "'") {
        for (i++; i < src.length && src[i] !== c; i++) if (src[i] === "\\") i++;
      } else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) return src.slice(at, Math.min(i + 1, at + 120));
    }
    return null;
  }

  // שם מקומי -> המפתח שלו בטבלת ה-$_$ של המודול
  function keyOf(src, mod, local) {
    const table = src.indexOf("t.$_$=t.$_$||{}", mod.start);
    if (table < 0 || table > mod.end) return null;
    const m = re("t\\.\\$_\\$\\.", G, "=", esc(local), "[,}]").exec(src.slice(table, mod.end));
    return m ? m[1] : null;
  }

  function defIn(src, mod, local) {
    const at = src.indexOf("function " + local + "(", mod.start);
    return at >= 0 && at < mod.end ? at : -1;
  }

  // שם באתר (מקומי או מיובא) -> {mod, key, local}
  function resolve(src, name, at) {
    const imp = P.importOf(src, name, at);
    if (imp) {
      const ex = P.exportOf(src, imp.mod, imp.key, G + "[,}]");
      return ex ? { mod: imp.mod, key: imp.key, local: ex[1] } : null;
    }
    const mod = P.moduleOf(src, at);
    const key = mod && keyOf(src, mod, name);
    return key ? { mod, key, local: name } : null;
  }

  // ייצוא שמוגדר כ-function <local>(…){…}
  function exportOf(src, r) {
    const at = r ? defIn(src, r.mod, r.local) : -1;
    const h = at >= 0 ? head(src, at) : null;
    return h ? { key: r.key, head: h } : null;
  }

  const same = (a, b) => !!a && !!b && a.mod.id === b.mod.id && a.key === b.key;

  // SettingsCategory.valueOf, שמיוצאת כפונקציה אנונימית
  function category(src) {
    const m = re("t\\.\\$_\\$\\.", G, "=(function\\(t\\)\\{switch\\(t\\)\\{)((?:case\"\\w+\":[^}]*?)+)default:[^}]*?\"No enum constant ",
      lit(CATEGORY), "\"").exec(src);
    if (!m) return null;
    const names = (m[3].match(/case"\w+"/g) || []).map((c) => c.slice(5, -1));
    const h = head(src, m.index + m[0].indexOf(m[2]));
    return h && names.includes(CONTROLS) ? { key: m[1], head: h } : null;
  }

  // class X { m() = "Lobby.Settings" }, בלי ארגומנטים
  function screen(src) {
    const m = re("function ", G, "\\(\\)\\{", ID, "\\.call\\(this\\),this\\.", ID, "=\"", lit(SCREEN), "\"\\}").exec(src);
    if (!m) return null;
    const mod = P.moduleOf(src, m.index);
    const key = mod && keyOf(src, mod, m[1]);
    return key ? { mod, key, local: m[1] } : null;
  }

  function goTo(src) {
    const m = re(ID, "\\(", G, "\\)\\.toString=function\\(\\)\\{return\"", lit(GO_TO), "\"").exec(src);
    if (!m) return null;
    const mod = P.moduleOf(src, m.index);
    const key = mod && keyOf(src, mod, m[1]);
    return key ? { mod, key, local: m[1] } : null;
  }

  // ...qaq(new A(<קטגוריה>)),...qaq(new GoTo(new Settings)): A מחזיקה שדה אחד, והרדיוסר מעתיק אותו
  function selectBefore(src, at, dispatch) {
    const back = src.slice(at - 400, at);
    const rx = reg("\\.", esc(dispatch), "\\(new ", G, "\\(");
    let m, last = null;
    while ((m = rx.exec(back))) last = m;
    const r = last && resolve(src, last[1], at);
    const d = r ? defIn(src, r.mod, r.local) : -1;
    const f = d >= 0 && re("^function ", esc(r.local), "\\(t\\)\\{this\\.", G, "=t\\}").exec(src.slice(d, d + 100));
    if (!f) return null;
    const reducer = re("instanceof ", esc(r.local), "\\?", ID, "\\.", ID, "\\(t\\.", esc(f[1]), "\\)");
    const body = src.slice(r.mod.start, r.mod.end);
    return reducer.test(body) ? r : null;
  }

  P.navigation = function (src) {
    const cat = category(src), scr = screen(src), go = goTo(src);
    if (!cat || !scr || !go) return null;

    let store = null, select = null;
    const rx = reg("\\.", G, "\\(new ", G, "\\(new ", G, "\\)\\)");
    let m;
    while ((m = rx.exec(src)) && !(store && select)) {
      if (!same(resolve(src, m[3], m.index), scr) || !same(resolve(src, m[2], m.index), go)) continue;
      const dispatch = m[1];
      // <holder>().<getter>().<dispatch>(...): ה-store של המשחק
      const s = !store && re("(?:^|[^\\w$.])", G, "\\(\\)\\.", G, "\\(\\)$").exec(src.slice(m.index - 80, m.index));
      const holder = s && exportOf(src, resolve(src, s[1], m.index));
      if (holder) store = Object.assign(holder, { getter: s[2], dispatch });
      if (!select) select = exportOf(src, selectBefore(src, m.index, dispatch));
    }
    const out = { store, select, category: cat, goTo: exportOf(src, go), screen: exportOf(src, scr) };
    if (Object.keys(out).some((k) => !out[k])) return null;
    out.control = CONTROLS;
    return out;
  };
})();
