// features/hud/discovery/tank.js  [ISOLATED world]

// הפסים ושורת המצבים הפעילים: שני רכיבים, כל אחד ממוקם לבד
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});
  const { NUM, ID, esc, re, reg } = P;

  // נקודת הטנק בעורך: אין לה ליטרל, זו המצלמה
  P.TANK_Y = 0.7;
  // חמישה מצבים, כמו בשלד של המשחק; הכמות בקרב משתנה
  const EFFECTS = ["Repair", "Shield", "DoubleDamage", "Speed", "Mine"];
  // מרחק נוסף מהפסים בשלד בלבד
  const EFFECTS_GAP = 3;
  // הפס הנראה: 6 מתוך מסלול של 10 (centralIndicators.svg)
  const BAR = 0.6;

  // הרציונל והמספרים: CLAUDE.mds/hud.md → Coverage
  P.bars = function (src, kinds, call) {
    // כל ספק מוסר את פרמטרי הסקיילינג ואת הרוחב והגובה
    const fp = reg(esc(call), "\\((", ID, ")," + NUM + "," + NUM + "\\),(", ID, ")\\(\\),(", ID, ")\\(\\)\\)");
    const sizes = {};
    let m;
    while ((m = fp.exec(src))) {
      const k = kinds[m[1]];
      if (!k || sizes[k]) continue;
      sizes[k] = { a: [Number(m[2]), Number(m[3])], wAcc: m[4], hAcc: m[5], at: m.index };
    }

    // המרווח מהתחתית, מהממקם שמצמיד את הפס למטה
    const placer = re(
      "\\.equals\\(", ID, "\\(\\)\\)\\|\\|\\(", ID, "\\(t,n\\),", ID, "\\(t,n,(", ID, ")\\(\\)\\)\\)"
    ).exec(src);
    // שורת המצבים: מרווח, מעל, מתחת, גודל אייקון
    const ind = re(
      "=this,this\\.", ID, "=new ", ID, "\\(", ID, "\\(", ID, "\\),null\\),",
      "this\\.", ID, "=" + NUM + ",this\\.", ID, "=" + NUM + ",this\\.", ID, "=" + NUM + ",this\\.", ID, "=" + NUM + "\\}"
    ).exec(src);
    // פס החיים ברגילה: var n=bottom()-h()+1; _R(bar,view,n)
    const hpFlat = re(
      "var (", ID, ")=(", ID, ")\\(\\)-(", ID, ")\\(\\)\\+(\\d+);", ID, "\\((", ID, ")\\(this\\),t,\\1\\)"
    ).exec(src);
    // ובממורכזת: tA(bar,t,n-12) סביב נקודת הטנק
    const hpUp = re(
      "(", ID, ")\\(this\\)\\.", ID, "=t,\\1\\(this\\)\\.", ID, "=n,", ID, "\\(\\1\\(this\\),t,n-(\\d+)\\)"
    ).exec(src);
    // שורת המצבים ברגילה: view.h + bottom + above
    const flatRow = re(
      "\\.", ID, "\\(\\)\\+(", ID, ")\\(\\),", ID, "\\(", ID, "\\.", ID, ",", ID, "\\.", ID, "\\)\\.", ID, "\\(\\),(-?\\d+),"
    ).exec(src);

    if (!sizes.iy || !sizes.ny || !placer || !ind || !hpFlat || !hpUp || !flatRow) return null;
    if (hpFlat[2] !== placer[1] || hpFlat[3] !== sizes.iy.hAcc || flatRow[1] !== placer[1]) return null;

    const w = P.lazyValue(src, sizes.iy.wAcc, sizes.iy.at);
    const h = P.lazyValue(src, sizes.iy.hAcc, sizes.iy.at);
    const cw = P.lazyValue(src, sizes.ny.wAcc, sizes.ny.at);
    const ch = P.lazyValue(src, sizes.ny.hAcc, sizes.ny.at);
    const bottom = P.lazyValue(src, placer[1], placer.index);
    if ([w, h, cw, ch, bottom].some((v) => typeof v !== "number")) return null;

    const gap = Number(ind[1]), above = Number(ind[2]), below = Number(ind[3]), icon = Number(ind[4]);
    if (!(above < 0 && icon > 0) || Number(flatRow[2]) !== above) return null;
    const overlap = Number(hpFlat[4]), up = Number(hpUp[2]);
    const TANK_Y = P.TANK_Y;

    // שני הפסים: החיים מעל המצבר
    const flatH = 2 * h - overlap;
    const lane = (kind, y, barH, total) =>
      ({ kind, x: 0, y: (y + barH * (1 - BAR) / 2) / total, w: 1, h: barH * BAR / total });
    const barParts = (top, hpTop, barH, total) => [
      lane("bar-hp", hpTop - top, barH, total),
      lane("bar-energy", total - barH, barH, total),
    ];
    const cTop = -up - ch / 2, cBottom = ch / 2;   // יחסית לנקודת הטנק
    const bars = {
      default: { k: "iy", a: sizes.iy.a, w, h: flatH,
        x: { op: "center", off: 0 }, y: { op: "bottom", off: bottom },
        parts: barParts(0, 0, h, flatH) },
      // נקודת הטנק היא גם מרכז הסיבוב
      centered: { k: "iy", a: [0.5, TANK_Y], w: cw, h: cBottom - cTop,
        x: { op: "center", off: 0 }, y: { op: "top", off: cTop, frac: TANK_Y },
        pivot: [0.5, -cTop / (cBottom - cTop)],
        parts: barParts(cTop, -up - ch / 2, ch, cBottom - cTop) },
    };

    // שורת מצבים: תאים של icon בפסיעה של icon+gap
    const rowW = (n) => n * (icon + gap) - gap;
    const W = rowW(EFFECTS.length);
    const row = EFFECTS.map((ic, i) => ({
      kind: "effect", icon: ic, x: (i * (icon + gap)) / W, y: 0, w: icon / W, h: 1,
    }));
    const effects = {
      default: { k: "iy", a: sizes.iy.a, w: W, h: icon,
        x: { op: "center", off: 0 }, y: { op: "bottom", off: bottom + above + icon },
        parts: row },
      // השורה שמתחת לטנק, שבה אפקטי הסופלייס; הפסים דוחפים אותה
      centered: { k: "iy", a: [0.5, TANK_Y], w: W, h: icon,
        x: { op: "center", off: 0 }, y: { op: "top", off: below + EFFECTS_GAP, frac: TANK_Y },
        pivot: [0.5, -(below + EFFECTS_GAP) / icon], stack: { on: "bars" },
        parts: row.map((p) => Object.assign({}, p)) },
    };
    return { bars, effects };
  };
})();
