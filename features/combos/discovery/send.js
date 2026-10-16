// features/combos/discovery/send.js  [ISOLATED world]

// גילוי ה-proxy של המוסך ופעולות ההרכבה והבחירה.
// העוגן: ה-hash של פקודת mountItem, שנגזר משמה ולכן קבוע בין בילדים.

(function () {
  'use strict';
  window.TankiQoL = window.TankiQoL || {};
  const GD = (window.TankiQoL.GarageDiscover = window.TankiQoL.GarageDiscover || {});

  GD.discoverSend = function (src, stateFields, itemFields) {
    const escapeRe = GD.escapeRe;
    const out = {};

    // ה-ctor של ה-proxy הוא זה שמכיל את ה-hash של mountItem
    const hm = /new [\w$]+\(595500642,\s*251373796\)/.exec(src);
    if (!hm) return null;
    const ctorStart = src.lastIndexOf('function ', hm.index);
    const ctorHead = /^function ([\w$]+)\(\)\{/.exec(src.slice(ctorStart, hm.index + 10));
    if (!ctorHead) return null;
    const proxyClass = ctorHead[1];

    const ctorBody = src.slice(ctorStart, src.indexOf('}', hm.index));
    const fields = [...ctorBody.matchAll(/this\.([\w$]+_1)=/g)].map((m) => m[1]);
    if (!fields.length) return null;
    out.proxyTrapField = fields[fields.length - 1];   // אחרון => מאוכלס במלואו

    const hashField = /this\.([\w$]+_1)=new [\w$]+\(595500642,\s*251373796\)/.exec(ctorBody);
    if (!hashField) return null;

    // מתודת השליחה = זו שבונה פקודה עם ה-hash של mountItem
    const sm = new RegExp(
      '[\\w$]+\\(' + escapeRe(proxyClass) + '\\)\\.([\\w$]+)=function\\(t\\)\\{' +
      'this\\.([\\w$]+_1)\\.[\\w$]+\\(this\\.([\\w$]+_1),t\\);' +
      'var n=new [\\w$]+\\([^,]*,this\\.' + escapeRe(hashField[1]) + ',this\\.\\3\\)').exec(src);
    if (!sm) return null;
    out.proxyMountMethod = sm[1];
    // השם חוזר במודולים אחרים: רק מתודות ששולחות hash מה-ctor
    const hashFields = [...ctorBody.matchAll(/this\.([\w$]+_1)=new [\w$]+\(-?\d+,\s*-?\d+\)/g)]
      .map((m) => 'this.' + m[1] + ',');
    out.proxyMethods = [...src.matchAll(new RegExp(
      '[\\w$]+\\(' + escapeRe(proxyClass) + '\\)\\.([\\w$]+)=function\\([^)]*\\)\\{', 'g'))]
      .filter((m) => {
        const body = src.slice(m.index, src.indexOf('}', m.index + m[0].length));
        return hashFields.some((f) => body.includes(f));
      })
      .map((m) => m[1]);

    // השדה שמקשר את ה-proxy לקונטרולר של המוסך (שמחזיק את ה-store)
    const back = new RegExp('=[\\w$]+\\([\\w$]+\\(' + escapeRe(proxyClass) + '\\)\\),' +
      escapeRe(proxyClass) + '\\.call\\([\\w$]+\\),[\\w$]+\\.([\\w$]+_1)=[\\w$]+,').exec(src);
    if (back) out.proxyCcField = back[1];

    // פעולת ההרכבה הפנימית — העוגן הוא ה-handler שמזוהה דרך מתודת השליחה
    const h = new RegExp(
      'function\\((\\w+)\\)\\{if\\(\\1\\.([\\w$]+_1)\\)\\{var (\\w+)=[\\w$]+\\(' +
      '[\\w$]+\\(\\)\\.[\\w$]+\\(\\)\\.[\\w$]+\\(\\)\\.[\\w$]+\\(\\1\\.([\\w$]+_1)\\.[\\w$]+_1\\)\\);' +
      '[\\w$]+\\.[\\w$]+\\(\\)\\.' + escapeRe(out.proxyMountMethod) + '\\(\\3\\)').exec(src);
    if (h) {
      out.actionNeedServerField = h[2];
      out.actionItemField = h[4];
      // אימות צולב: קיים ctor עם בדיוק שני השדות האלה ובסדר הזה
      const ctor = new RegExp('function ([\\w$]+)\\(t,n\\)\\{this\\.' + escapeRe(out.actionItemField) +
        '=t,this\\.' + escapeRe(out.actionNeedServerField) + '=n\\}').exec(src);
      if (ctor) out.mountActionClass = ctor[1];
      else { delete out.actionNeedServerField; delete out.actionItemField; }
    }

    // פעולת הבחירה — היא שמעדכנת את מודל התלת-ממד, לא ההרכבה.
    // עוגן: thunk עם שדה יחיד שגופו מאתר את הפריט ובודק קטגוריה.
    if (itemFields.category && stateFields.items) {
      const head = new RegExp(
        'function ([\\w$]+)\\(t\\)\\{var n;[\\w$]+\\.call\\(this,\\(n=t,function\\(t\\)\\{var i;' +
        'if\\(null!=n\\)\\{var r=t\\.[\\w$]+_1\\.[\\w$]+_1\\.' + escapeRe(stateFields.items) +
        '\\.[\\w$]+\\(n\\);\\(\\(i=r\\.' + escapeRe(itemFields.category) + '\\)\\.equals\\(').exec(src);
      if (head) {
        const tail = /\)\),this\.([\w$]+_1)=t\}/.exec(src.slice(head.index, head.index + 1200));
        if (tail) {
          out.selectActionClass = head[1];
          out.selectItemIdField = tail[1];
        }
      }
    }

    return out;
  };
})();
