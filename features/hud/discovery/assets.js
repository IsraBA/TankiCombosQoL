// features/hud/discovery/assets.js  [ISOLATED world]

// ה-SVG-ים של המשחק שהעורך מצייר בהם. הרציונל: CLAUDE.mds/hud.md → The editor
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});
  const { ID, esc, re, reg } = P;

  const ASSET_MODULE_RE = /([\de]+):\(t,n,i\)=>\{"use strict";t\.exports=i\.p\+"(static\/(?:images|media)\/([\w@%.-]+))"\}/g;

  // שם בסיס חוזר בכמה קבצים; נפתר בתוך האשכול שלו
  const CLUSTERS = [
    { anchor: "centralIndicators", want: ["radar", "overdrive", "grenade", "chat", "supplyRepair", "supplyWheel", "supplyGold"] },
    { anchor: "Shield", want: ["Repair", "DoubleDamage", "Speed", "Mine", "GoldBox", "Nuclear"] },
  ];
  // שמות בלי כפילות; השורה השנייה לרכיבי ה-HTML
  const UNIQUE = ["hudSupplyBackground", "supplyKeyLabelBackground", "nuclear",
    "fullScreenSmall", "icPause", "icTabStatistic", "experience"];
  // מרקם בשם: new C("whiteGrenadeSupply",20,<מודול הנכס>)
  const TEXTURES = { grenade: "whiteGrenadeSupply" };
  // דרגת השלד של פרטי המשתמש: לג'נד, לא השחקן
  const RANK = 31;

  function baseName(file) {
    const parts = file.split(".");
    return parts.length > 2 ? parts.slice(0, -2).join(".") : parts[0];
  }

  // הפרמטר של מודול -> נתיב הנכס שהוא מייבא
  function paramAsset(src, byId, at, param) {
    const mod = param && P.moduleOf(src, at);
    const id = mod && mod.ids[mod.names.indexOf(param)];
    return (id && byId.get(id)) || null;
  }

  function textureAsset(src, byId, name) {
    const m = re("new ", ID, "\\(\"", name, "\",\\d+,(", ID, ")\\)").exec(src);
    return m ? paramAsset(src, byId, m.index, m[1]) : null;
  }

  // switch(rank) של הענף הגדול בלי פרימיום; לג'נד היא ה-default
  function rankAsset(src, byId, rank) {
    const pick = re(
      "switch\\(", ID, "\\(\\),i\\.", ID, "\\)\\{case 0:r=n\\?(", ID, ")\\.", ID, "\\(t\\):\\1\\.", ID, "\\(t\\);break;",
      "case 1:r=n\\?\\1\\.", ID, "\\(t\\):\\1\\.", ID, "\\(t\\);break;case 2:r=n\\?\\1\\.", ID, "\\(t\\):\\1\\.(", ID, ")\\(t\\)"
    ).exec(src);
    if (!pick) return null;
    const body = re("\\.", esc(pick[2]), "=function\\(t\\)\\{switch\\(t\\)\\{([^}]*)\\}\\}").exec(src);
    if (!body) return null;
    const cases = {};
    const c = reg("case (\\d+):return (", ID, ");");
    let m;
    while ((m = c.exec(body[1]))) cases[m[1]] = m[2];
    const last = re("default:return (", ID, ")$").exec(body[1]);
    if (last) cases[Object.keys(cases).length + 1] = last[1];
    const path = paramAsset(src, byId, body.index, cases[rank]);
    return path && baseName(path.split("/").pop()) === String(rank) ? path : null;
  }

  // {base: "static/images/base.hash.ext"} — רק מה שהעורך מצייר
  P.assets = function (src) {
    const byId = new Map();      // module id -> path
    const byBase = new Map();    // base -> [{id, path}]
    let m;
    ASSET_MODULE_RE.lastIndex = 0;
    while ((m = ASSET_MODULE_RE.exec(src))) {
      byId.set(String(Number(m[1])), m[2]);
      const base = baseName(m[3]);
      if (!byBase.has(base)) byBase.set(base, []);
      byBase.get(base).push({ id: m[1], path: m[2] });
    }
    if (!byBase.size) return null;

    const out = {};
    for (const base of UNIQUE) {
      const hit = byBase.get(base);
      if (hit && hit.length === 1) out[base] = hit[0].path;
    }

    const uses = (id) => {
      const found = [];
      const needle = "(" + id + ")";
      let i = -1;
      while ((i = src.indexOf(needle, i + 1)) !== -1) found.push(i);
      return found;
    };
    const nearest = (id, to) =>
      uses(id).reduce((best, at) => (Math.abs(at - to) < Math.abs(best - to) ? at : best), Infinity);

    for (const cluster of CLUSTERS) {
      const anchor = byBase.get(cluster.anchor);
      if (!anchor || anchor.length !== 1) continue;
      const at = uses(anchor[0].id)[0];
      if (at == null) continue;
      out[cluster.anchor] = anchor[0].path;
      // הנכון הוא הנדרש הכי קרוב לעוגן
      for (const base of cluster.want) {
        const cands = byBase.get(base);
        if (!cands || !cands.length) continue;
        let pick = null, bestD = Infinity;
        for (const cand of cands) {
          const d = Math.abs(nearest(cand.id, at) - at);
          if (d < bestD) { bestD = d; pick = cand; }
        }
        if (pick && bestD < 6000) out[base] = pick.path;
      }
    }
    for (const key of Object.keys(TEXTURES)) {
      const path = textureAsset(src, byId, TEXTURES[key]);
      if (path) out[key] = path;
    }
    const rank = rankAsset(src, byId, RANK);
    if (rank) out.rank = rank;
    return Object.keys(out).length ? out : null;
  };
})();
