// features/hud/discovery/engine.js  [ISOLATED world]

// שמות המנוע ש-MAIN צריך, מקוד הבאנדל. הרציונל: CLAUDE.mds/hud.md → Identifying
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});
  const { ID, esc, re, reg } = P;
  const G = "(" + ID + ")";

  // בדיוק התאמה אחת, אחרת null
  P.unique = function (rx, src) {
    let m, hit = null, n = 0;
    rx.lastIndex = 0;
    while ((m = rx.exec(src))) { if (++n > 1) return null; hit = m; }
    return hit;
  };

  // השדות שהבנאי כותב ברמה העליונה, לפי הסדר
  P.ctorFields = function (src, cls, near) {
    const at = P.fnOffsets(src, cls, near)[0];
    if (at == null) return null;
    let i = src.indexOf("{", at) + 1, depth = 0;
    const out = [];
    for (; i < src.length && depth >= 0; i++) {
      const c = src[i];
      if (c === "{" || c === "(") depth++;
      else if (c === "}" || c === ")") depth--;
      else if (depth === 0 && src.startsWith("this.", i)) {
        const m = /^this\.([\w$]+)=/.exec(src.slice(i, i + 40));
        if (m) out.push(m[1]);
      }
    }
    return out;
  };
  const lastField = (src, cls, near) => {
    const f = P.ctorFields(src, cls, near);
    return f && f.length ? f[f.length - 1] : null;
  };

  // שירות ה-HUD: קנה המידה, והאסטרטגיה לכל סוג
  function service(src) {
    const m = P.unique(reg(G, "\\(", G, "\\)\\.", G, "=function\\(t\\)\\{if\\(this\\.", G, "!==t\\)\\{this\\.\\4=t;",
      "for\\(var n=this\\.", G, "\\.", ID, "\\(\\)\\.", ID, "\\(\\);n\\.", ID, "\\(\\);\\)n\\.", ID, "\\(\\)\\.", G, "=t\\}\\},",
      "\\1\\(\\2\\)\\.", G, "=function\\(\\)\\{return this\\.\\4\\},\\1\\(\\2\\)\\.", G, "=function\\(t\\)\\{var n,i=this\\.\\5,",
      "r=i\\.", ID, "\\(t\\);if\\(null==r\\)\\{var e=t\\.", G, "\\(\\)"), src);
    if (!m) return null;
    return {
      serviceTrap: lastField(src, m[2], m.index), serviceScale: m[4], scaleFactor: m[6],
      serviceMethods: [m[3], m[7], m[8]], factory: m[9],
    };
  }

  // ה-letterbox: כל ה-accessors של המלבן בגוף אחד
  function rect(src, f) {
    const m = P.unique(reg(ID, "\\(", ID, "\\)\\.", G, "=function\\(t,n,i\\)\\{var ", G, "=t\\.", G, "\\(\\),", G, "=t\\.", G, "\\(\\),",
      ID, "=\\2\\*\\(this\\.", f, "-1\\),", ID, "=\\4\\*\\(this\\.", f, "-1\\),",
      G, "=n\\.", G, "\\(\\)/\\2,", G, "=n\\.", G, "\\(\\)/\\4,", ID, "=\\6-n\\.", G, ",", ID, "=\\8-n\\.", G, ",",
      ID, "=\\2/\\4,[^;]*?16/9[^;]*?;i\\.", G, "\\([^;]*?\\),i\\.", G, "\\(n\\.\\9\\(\\)[^;]*?\\),",
      "i\\.", G, "\\(n\\.\\3\\(\\)\\*this\\.", f, "\\),i\\.", G, "\\(n\\.\\5\\(\\)\\*this\\.", f, "\\)\\}"), src);
    if (!m) return null;
    return {
      strategyApply: m[1], w: m[3], h: m[5], x: m[7], y: m[9], anchorX: m[10], anchorY: m[11],
      setX: m[12], setY: m[13], setW: m[14], setH: m[15],
    };
  }

  // צומת הסצנה: עץ, אב, נראות ושקיפות
  function scene(src) {
    const tr = P.unique(reg(G, "\\(", G, "\\)\\.", G, "=function\\(t\\)\\{t\\(this\\);var ", ID, "=this\\.", G,
      ",[^{}]{0,80}?do\\{[^{}]{0,80}?\\.\\3\\(t\\)\\}while"), src);
    if (!tr) return null;
    const cls = esc(tr[1]) + "\\(" + esc(tr[2]) + "\\)\\.";
    const add = P.unique(reg(cls, G, "=function\\(t\\)\\{var n=t\\.", G, ";(?:return )?null==n\\|\\|n\\.", G,
      "\\(t\\),this\\.", esc(tr[4]), "\\.", ID, "\\(t\\),t\\.\\2=this(?:,t)?\\}"), src);
    // הציור יורד רק לילדים נראים
    const vis = P.unique(reg(cls, G, "=function\\(t,n\\)\\{[^{}]{0,200}?do\\{[^{}]{0,120}?", G, "\\.", G,
      "\\(\\)&&\\2\\.\\1\\(t,n\\)\\}while"), src);
    // העתקה: קודם הנראות, אחריה השקיפות
    const copy = vis && P.unique(reg("this\\.", ID, "\\(t\\.", esc(vis[3]), "\\(\\)\\),this\\.", ID, "\\(t\\.", G, "\\(\\)\\)"), src);
    if (!add || !copy) return null;
    return { traverse: tr[3], parent: add[2], nodeAdd: add[1], nodeRemove: add[3], visible: vis[3], alpha: copy[1] };
  }

  // שורש ה-HUD: עוטף הוספה והסרה של הקונטיינר שלו
  function root(src, sc) {
    const m = P.unique(reg(G, "\\(", G, "\\)\\.", G, "=function\\(t\\)\\{this\\.", G, "\\.", esc(sc.nodeAdd), "\\(t\\)\\},",
      "\\1\\(\\2\\)\\.", G, "=function\\(t\\)\\{this\\.\\4\\.", esc(sc.nodeRemove), "\\(t\\)\\}"), src);
    if (!m) return null;
    return { rootTrap: lastField(src, m[2], m.index), rootAdd: m[3], rootRemove: m[5], rootContainer: m[4] };
  }

  // השם הנפוץ בקריאות מתוך רשימה
  function commonest(rx, src) {
    const tally = {};
    let m, best = null;
    rx.lastIndex = 0;
    while ((m = rx.exec(src))) tally[m[1]] = (tally[m[1]] || 0) + 1;
    for (const k of Object.keys(tally)) if (!best || tally[k] > tally[best]) best = k;
    return best;
  }

  // BattleSettings: סדר ה-toString זהה לסדר הבנאי
  function settingsTrap(src) {
    const m = P.unique(reg(ID, "\\(", G, "\\)\\.toString=function\\(\\)\\{return\"BattleSettings\\((.*?)\"\\}"), src);
    if (!m) return null;
    const ts = (m[2].match(/this\.[\w$]+_1/g) || []).map((f) => f.slice(5));
    const seq = P.ctorFields(src, m[1], m.index);
    if (!seq || seq.length < 2 || seq.join() !== ts.join()) return null;
    return ts[ts.length - 1];
  }

  // {שם: שם ממוזער} בצורה של I.N, או null
  P.engine = function (src) {
    const svc = service(src);
    const r = svc && rect(src, esc(svc.scaleFactor));
    const sc = scene(src);
    const hud = sc && root(src, sc);
    if (!r || !hud || !hud.rootTrap || !svc.serviceTrap) return null;
    const px = P.unique(reg("\\.", G, "=function\\(t,n\\)\\{[^{}]{0,80}?this\\.", G, "\\.", esc(r.strategyApply), "\\(t,this,n\\)"), src);
    const view = P.unique(reg("\"LayoutSizeHudMessage\\(view=\"\\+", ID, "\\(this\\.", G, "\\)"), src);
    const layout = view && commonest(reg("\\.", G, "\\(", ID, "\\.", esc(view[1]), ","), src);
    // מצב הקרב מוסיף את חלקיו דרך מתודה משלו
    const statusAdd = commonest(reg("\\.", G, "=function\\(t\\)\\{t\\.", esc(hud.rootAdd), "\\(this\\."), src);
    const trap = settingsTrap(src);
    if (!px || !layout || !statusAdd || !trap) return null;
    return Object.assign({}, svc, r, sc, hud, {
      toPixels: px[1], strategy: px[2], layout, statusAdd, settingsTrap: trap,
    });
  };
})();
