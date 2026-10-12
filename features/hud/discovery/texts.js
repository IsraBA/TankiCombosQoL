// features/hud/discovery/texts.js  [ISOLATED world]

// הצ'אט ומצב הקרב: רכיבים שהגודל שלהם נקבע גם מטקסט
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});
  const { NUM, ID, esc, re, reg } = P;

  // ---- הצ'אט ----

  // ההיסט הוא שבר מהמסך; שתי הפריסות באותו ענף
  P.chat = function (src, kinds) {
    const m = re(
      "case 0:case 1:this\\.", ID, "\\((\\d+)\\),this\\.", ID, "\\((\\d+)\\),this\\.", ID,
      "\\(", NUM, "/", NUM, "\\*", ID, "\\.", ID, "\\(\\)\\),", ID, "\\(this,", NUM, "\\*", ID, "\\.", ID, "\\(\\)\\)"
    ).exec(src);
    if (!m) return null;
    const k = re(
      "case 0:case 1:var ", ID, "=", ID, "\\(", ID, "\\(\\)\\)\\.", ID, "\\((", ID, ")\\);", ID, "\\(this,", ID, "," + NUM + "," + NUM + "\\)"
    ).exec(src);
    if (!k || !kinds[k[1]]) return null;

    const w = Number(m[1]), h = Number(m[2]);
    const recipe = {
      k: kinds[k[1]], a: [Number(k[2]), Number(k[3])], w, h,
      x: { op: "left", off: 0, frac: Number(m[3]) / Number(m[4]) },
      // הקצה התחתון על .65 מהגובה
      y: { op: "top", off: -h, frac: Number(m[5]) },
    };
    return { default: recipe, centered: Object.assign({}, recipe) };
  };

  // ---- מצב הקרב ----

  // לוח, טיימר, לוח; רוחב הטיימר הוא טקסט. הרציונל: CLAUDE.mds/hud.md
  P.status = function (src, kinds, call) {
    // ספק לכל מצב משחק; כולם חייבים להסכים על העוגן
    const provider = reg(
      "var ", ID, ",(", ID, ")=", ID, "\\(", ID, "\\(\\)\\)\\.", esc(call), "\\((", ID, ")," + NUM + "," + NUM +
      "\\);if\\(this\\.", ID, "=new ", ID, "\\(\\1,"
    );
    let a = null, kind = null, m;
    while ((m = provider.exec(src))) {
      const k = kinds[m[2]];
      const pair = [Number(m[3]), Number(m[4])];
      if (!k) return null;
      if (!a) { a = pair; kind = k; continue; }
      if (kind !== k || a[0] !== pair[0] || a[1] !== pair[1]) return null;
    }
    if (!a) return null;

    // גובה הגופן ו-y הקבוע, משני ווידג'טי הטיימר
    const widget = re(
      "new ", ID, "\\([\\s\\S]{0,60}?,(\\d+),(\\d+),(\\d+),(", ID, ")\\(\\)\\.(", ID, "),\\.0499\\d*\\):",
      "new ", ID, "\\([\\s\\S]{0,60}?,\\1,\\2,\\3,\\4\\(\\)\\.\\5,\\.0499"
    ).exec(src);
    // שני לוחות הניקוד, שתי תמונות לכל צד
    const plates = re(
      "=this,this\\.", ID, "=\\d+,this\\.", ID, "=\\d+,this\\.", ID, "=\\d+,this\\.", ID, "=\\d+,",
      "this\\.", ID, "=\\d+,this\\.", ID, "=\\d+,this\\.", ID, "=\\d+,",
      "this\\.", ID, "=new (", ID, ")\\((\\d+),(\\d+)\\),this\\.", ID, "=new \\1\\((\\d+),(\\d+)\\),"
    ).exec(src);
    // המרווחים בין הלוחות לטיימר
    const gaps = re(
      "\\?\\((", ID, ")\\(this\\.(", ID, "),t,-(\\d+)\\),this\\.", ID, "\\.", ID,
      "\\(this\\.\\2\\.", ID, "\\(\\)\\+this\\.\\2\\.", ID, "\\(\\)-\\d+\\),\\1\\(this\\.", ID, ",this\\.\\2,-(\\d+)\\)\\)"
    ).exec(src);
    if (!widget) return null;

    const font = Number(widget[1]), top = Number(widget[2]);
    const plate = plates ? Number(plates[4]) : 0;
    const outer = gaps ? Number(gaps[3]) : 0;
    const timer = 5 * font;   // "00:00", חמש ספרות בגובה הגופן
    const w = timer + 2 * (outer + plate);

    const recipe = {
      k: kind, a, w, h: font,
      x: { op: "center", off: 0 },
      y: { op: "top", off: top },
    };
    if (plate) {
      recipe.parts = [
        { kind: "plate", x: 0, y: 0, w: plate / w, h: 1 },
        { kind: "timer", x: (plate + outer) / w, y: 0, w: timer / w, h: 1 },
        { kind: "plate", x: (plate + outer + timer + outer) / w, y: 0, w: plate / w, h: 1 },
      ];
    }
    return { default: recipe, centered: Object.assign({}, recipe) };
  };
})();
