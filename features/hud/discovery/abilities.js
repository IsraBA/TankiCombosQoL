// features/hud/discovery/abilities.js  [ISOLATED world]

// האוברדרייב וטבעת הנוקליאר: כפתור, ורקע גדול ממנו שקובע את התיבה
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});
  const { NUM, ID, esc, re } = P;

  // ---- האוברדרייב ----

  // הספק בוחר אסטרטגיה לפי פריסה; שני fP נותנים מיקום וגודל
  P.overdrive = function (src, kinds, call, hudTypes) {
    const sw = re(
      "switch\\(", ID, "\\.", ID, "\\)\\{case 0:(", ID, ")=", ID, "\\.", esc(call),
      "\\((", ID, ")," + NUM + "," + NUM + "\\);break;case 1:\\1=", ID, "\\.", esc(call),
      "\\((", ID, ")," + NUM + "," + NUM + "\\);break;case 2:"
    ).exec(src);
    const fp = re(
      "new (", ID, ")\\((", ID, ")\\(\\),new (", ID, ")\\(", NUM, ",", NUM, "\\),new (", ID, ")\\(", NUM, ",", NUM, "\\)\\):",
      "new \\1\\((", ID, ")\\(\\),new \\3\\(", NUM, ",", NUM, "\\),new \\6\\(", NUM, ",", NUM, "\\)\\)"
    ).exec(src);
    if (!sw || !fp) return null;

    const byLayout = {
      default: { k: kinds[sw[2]], a: [Number(sw[3]), Number(sw[4])] },
      centered: { k: kinds[sw[5]], a: [Number(sw[6]), Number(sw[7])] },
    };
    if (!byLayout.default.k || !byLayout.centered.k) return null;

    // כל ענף נושא את סוג ה-HUD שלו, שהרדאר לימד
    const boxes = {};
    boxes[fp[2]] = { x: Number(fp[4]), y: Number(fp[5]), w: Number(fp[7]), h: Number(fp[8]) };
    boxes[fp[9]] = { x: Number(fp[10]), y: Number(fp[11]), w: Number(fp[12]), h: Number(fp[13]) };

    // רקע ה"מוכן" גדול מהכפתור, והוא התיבה הנראית
    const ki = re(
      "(", ID, ")\\(this\\.", ID, ",(", ID, ")\\.(", ID, ")\\*(", ID, ")\\(\\)\\.(", ID, "),",
      "\\2\\.(", ID, ")\\*\\4\\(\\)\\.\\5\\),\\1\\(this\\.", ID, ",\\2\\.\\3\\*\\4\\(\\)\\.(", ID, "),",
      "\\2\\.\\6\\*\\4\\(\\)\\.\\7\\)"
    ).exec(src);
    let grow = 1;
    if (ki) {
      for (const field of [ki[5], ki[7]]) {
        const f = P.companionNum(src, ki[4], field, ki.index);
        if (f != null) grow = Math.max(grow, f);
      }
    }

    const out = { button: {} };
    for (const layout of ["default", "centered"]) {
      const box = boxes[hudTypes[layout]];
      if (!box) return null;
      const base = {
        k: byLayout[layout].k, a: byLayout[layout].a, w: box.w, h: box.h,
        x: { op: layout === "centered" ? "center" : "left", off: box.x },
        y: { op: "bottom", off: box.y },
      };
      out.button[layout] = base;
      out[layout] = P.L().resize(base, box.w * grow, box.h * grow);
    }
    return out;
  };

  // ---- טבעת הנוקליאר ----

  // מוחזרת לבד: שייכת לרימונים ברגילה, לסופלייס בממורכזת
  P.nuclear = function (src, kinds, call) {
    const made = re(
      "new (", ID, ")\\((", ID, "),\\2\\?(", ID, ")\\(\\)\\.", esc(call), "\\((", ID, ")," + NUM + "," + NUM + "\\):",
      "\\3\\(\\)\\.", esc(call), "\\((", ID, ")," + NUM + "," + NUM + "\\),[\\s\\S]{0,40}?new (", ID, ")\\(",
      NUM, ",", NUM, ",", NUM, ",", NUM, ","
    ).exec(src);
    const off = re(
      "this\\.(", ID, ")=", NUM, ",this\\.(", ID, ")=(", ID, ")\\(\\)\\.(", ID, ")/2,",
      "this\\.(", ID, ")=this\\.\\3\\+(\\d+);var ", ID, "=this\\.\\6\\+(\\d+)"
    ).exec(src);
    const flash = re(
      ID, "\\((", ID, "),", NUM, "\\*(", ID, ")\\(\\)\\.(", ID, "),", NUM, "\\*\\3\\(\\)\\.(", ID, ")\\)"
    ).exec(src);
    const o4o = re(
      "(", ID, ")\\(this,(", ID, ")," + NUM + "-this\\.(", ID, ")\\);var (", ID, ")=this\\.", ID, "\\+this\\.\\4;"
    ).exec(src);
    if (!made || !off || !flash || !o4o) return null;

    const centeredKind = kinds[made[4]], defaultKind = kinds[made[7]];
    if (!centeredKind || !defaultKind) return null;

    const fields = { w: flash[4], h: flash[6] };
    const half = P.sizeMember(src, off[4], off[5], off.index, fields);
    const ring = P.sizeMember(src, flash[3], flash[4], flash.index, fields);
    if (half == null || ring == null) return null;

    const o = half / 2;                     // ההיסט שהמשחק מזיז בו את הטבעת
    const glow = Number(flash[2]) * ring;   // רקע ההבזק
    const arc = 2 * (o + Number(off[7]) + Number(off[8]));   // קוטר הקשת החיצוני
    const w = Number(made[11]), h = Number(made[12]);
    const offsetLeftX = Number(made[13]), marginBottom = Number(made[14]);
    const centerBase = Number(off[2]), centeredBottom = Number(o4o[3]);

    const base = {
      default: {
        k: defaultKind, a: [Number(made[8]), Number(made[9])], w, h,
        x: { op: "left", off: offsetLeftX - o },
        y: { op: "bottom", off: marginBottom + o },
      },
      centered: {
        k: centeredKind, a: [Number(made[5]), Number(made[6])], w, h,
        x: { op: "center", off: centerBase + o },
        y: { op: "bottom", off: centeredBottom - o },
      },
    };
    const L = P.L();
    return {
      default: L.resize(base.default, glow, glow),
      centered: L.resize(base.centered, glow, glow),
      shift: o,
      ring: { default: L.resize(base.default, arc, arc), centered: L.resize(base.centered, arc, arc) },
    };
  };
})();
