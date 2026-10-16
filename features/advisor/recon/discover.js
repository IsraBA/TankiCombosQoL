// features/advisor/recon/discover.js  [ISOLATED world]

// גילוי ארבעת שדות המלכודת של בדיקת הקרב מתוך מקור הבאנדל.

(function () {
  'use strict';
  window.TankiQoL = window.TankiQoL || {};
  const AD = (window.TankiQoL.AdvisorDiscover = window.TankiQoL.AdvisorDiscover || {});

  // מפתח הפלט -> שם המחלקה ב-toString שקוטלין מייצרת
  const CLASSES = {
    battleUsers: 'BattleUsers',
    battleStatistics: 'BattleStatistics',
    localBattleUserState: 'LocalBattleUserState',
    user: 'User',
  };

  // שדה המלכודת = האחרון שהבנאי כותב; מאומת מול סדר ה-toString
  function trapField(src, name) {
    const re = new RegExp('[\\w$]+\\(([\\w$]+)\\)\\.toString=function\\(\\)\\{return"' +
      name + '\\((.*?)"\\}', 'g');
    let m, hit = null;
    while ((m = re.exec(src)) !== null) {
      if (hit) return null;   // יותר ממחלקה אחת -> עדיף להיכשל
      hit = m;
    }
    if (!hit) return null;

    const ts = [];
    const fre = /this\.([\w$]+_1)/g;
    let f;
    while ((f = fre.exec(hit[2])) !== null) ts.push(f[1]);
    if (ts.length < 2) return null;

    const cm = new RegExp('function ' + hit[1].replace(/\$/g, '\\$') +
      '\\([^)]*\\)\\{').exec(src);
    if (!cm) return null;

    // גוף הבנאי בסוגריים מאוזנים — קצר, כמה מאות תווים
    let i = src.indexOf('{', cm.index) + 1, depth = 1;
    const start = i;
    while (depth > 0 && i < src.length) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
    const seq = [];
    const are = /this\.([\w$]+_1)\s*=/g;
    while ((m = are.exec(src.slice(start, i - 1))) !== null) seq.push(m[1]);

    // לכידה על שדה שאינו אחרון תופסת אובייקט חלקי
    if (seq.length !== ts.length) return null;
    for (let k = 0; k < ts.length; k++) if (seq[k] !== ts[k]) return null;
    return ts[ts.length - 1];
  }

  // {battleUsers, battleStatistics, localBattleUserState, user} או null
  AD.discover = function (src) {
    const out = {};
    for (const key of Object.keys(CLASSES)) {
      const t = trapField(src, CLASSES[key]);
      if (!t) return null;   // בלי כל הארבעה לא מחמשים כלום
      out[key] = t;
    }
    return out;
  };
})();
