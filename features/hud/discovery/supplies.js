// features/hud/discovery/supplies.js  [ISOLATED world]

// שורות הסופלייס: אילו סלוטים, באיזה סדר, ואיפה. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});
  const { NUM, ID, esc, re, reg } = P;

  // הסלוטים לפי סדר הבנייה, ומה נראה בכל פריסה
  P.supplySlots = function (src) {
    // הרשימה הקבועה של המפה: [NUCLEAR, FIRST_AID, …]
    const list = reg("this\\.(", ID, ")=(", ID, ")\\(\\[((?:", ID, "\\(\\),){5,}", ID, "\\(\\))\\]\\),this\\.", ID, "=\\2\\(\\[");
    let order = null, m;
    while ((m = list.exec(src))) {
      const at = m.index;
      const got = m[3].split("(),").map((a) => P.enumAt(src, a.replace(/\(\)$/, ""), at));
      if (got.some((e) => !e || !e.of)) continue;
      const names = got.map((e) => e.name);
      if (!["NUCLEAR", "GRENADE", "FIRST_AID"].every((n) => names.includes(n))) continue;
      order = got.map((e) => ({ name: e.name, cat: e.of }));
      break;
    }
    if (!order) return null;

    // נראות אחרי הבנייה: d11r(X(),!t.<centered>) = נסתר בממורכזת
    const vis = re(
      "=new (", ID, ")\\(t\\.(", ID, "),", ID, ",t\\.", ID, "\\(\\)\\);[\\s\\S]{0,600}?",
      "((?:(", ID, ")\\.(", ID, ")\\(", ID, "\\(\\),!?t\\.", ID, "\\),){3,}\\4\\.\\5\\(", ID, "\\(\\),!?t\\.", ID, "\\))\\}"
    ).exec(src);
    if (!vis) return null;
    const notCentered = new Set();
    const call = reg("\\.", esc(vis[5]), "\\((", ID, ")\\(\\),(!?)t\\.(", ID, ")\\)");
    while ((m = call.exec(vis[3]))) {
      if (m[2] !== "!" || m[3] !== vis[2]) continue;
      const e = P.enumAt(src, m[1], vis.index);
      if (!e) return null;
      notCentered.add(e.name);
    }

    // הטבעת: x של הסלוט, פחות חצי מסך, ועוד קבוע
    const follow = re(
      "var (", ID, ")=t\\.", ID, "\\.", ID, "\\((", ID, ")\\(\\)\\),(", ID, ")=null==\\1\\?null:\\1\\.", ID, "\\(\\),",
      ID, "=\\(null==\\3\\?0:\\3\\)-\\.5\\*", ID, "\\.", ID, "\\(\\)\\+", NUM, ";"
    ).exec(src);
    if (!follow) return null;
    const ringOn = P.enumAt(src, follow[2], follow.index);
    if (!ringOn) return null;

    // דגל וכדור נכנסים רק בזמן שנושאים אותם
    const shown = order.filter((s) => s.cat !== "FLAG");
    return {
      left: shown.filter((s) => s.cat !== "COMMON").map((s) => s.name),
      right: shown.filter((s) => s.cat === "COMMON").map((s) => s.name),
      centered: shown.filter((s) => !notCentered.has(s.name)).map((s) => s.name),
      ringOn: ringOn.name,
      ringDx: Number(follow[4]),
    };
  };

  // שלוש קבוצות: שמאל (רימונים), ימין (סופלייס), ושורה ממורכזת
  P.supplyRows = function (src, kinds) {
    // שלוש מערכות הפרמטרים של הספק, בשורה אחת
    const triple = reg(
      "this\\.", ID, "=new (", ID, ")\\((", ID, ")," + NUM + "," + NUM + "\\),",
      "this\\.", ID, "=new \\1\\((", ID, ")," + NUM + "," + NUM + "\\),",
      "this\\.", ID, "=new \\1\\((", ID, ")," + NUM + "," + NUM + "\\)"
    );
    let params = null, m;
    while ((m = triple.exec(src))) {
      const ks = [kinds[m[2]], kinds[m[5]], kinds[m[8]]];
      if (ks.every(Boolean)) { params = { m, ks }; break; }
    }

    // הענף הרגיל של ה-o4o: רוחב, היצמדות לימין, תחתית
    const desk = re(
      "(", ID, ")=(", ID, ")\\(\\)\\.(", ID, ")\\*(", ID, ")\\+(", ID, ")\\(\\)\\*\\(\\4-1\\|0\\),",
      ID, "=(", ID, ")\\.", ID, "\\(\\)-\\(\\1\\+\\((", ID, ")\\(\\),(", ID, ")\\)\\),",
      ID, "=\\6\\.", ID, "\\(\\)-\\2\\(\\)\\.(", ID, ")/2\\+(", ID, ")\\(\\)"
    ).exec(src);
    const leftX = re("\\.", ID, "\\((", ID, ")\\(\\)\\+", ID, "\\(0,", ID, "\\)\\)").exec(src);
    const slots = P.supplySlots(src);
    if (!params || !desk || !leftX || !slots) return null;

    const fields = { w: desk[3], h: desk[9] };
    const slotW = P.sizeMember(src, desk[2], desk[3], desk.index, fields);
    const slotH = P.sizeMember(src, desk[2], desk[9], desk.index, fields);
    const gap = P.lazyValue(src, desk[5], desk.index);
    const rightMargin = P.initValue(src, desk[7], desk[8], desk.index);
    const bottom = P.lazyValue(src, desk[10], desk.index);
    const originX = P.lazyValue(src, leftX[1], leftX.index);
    if ([slotW, slotH, gap, rightMargin, bottom, originX].some((v) => typeof v !== "number")) return null;

    const left = slots.left.length, right = slots.right.length, total = slots.centered.length;
    if (left < 1 || right < 1) return null;

    const width = (n) => slotW * n + gap * (n - 1);
    // הממורכזת מרכזת על קו נמוך בחצי סלוט
    const yFlat = bottom;
    const yCentered = bottom + slotH / 2;
    // העוגן קובע את התפקיד: 0 שמאל, 1 ימין, .5 מרכז
    const pick = (ax) => {
      for (let j = 0; j < 3; j++) {
        if (Number(params.m[3 + 3 * j]) !== ax) continue;
        return { k: params.ks[j], a: [ax, Number(params.m[4 + 3 * j])] };
      }
      return null;
    };
    const pLeft = pick(0), pRight = pick(1), pCentered = pick(0.5);
    if (!pLeft || !pRight || !pCentered) return null;

    return {
      left: { k: pLeft.k, a: pLeft.a, w: width(left), h: slotH,
        x: { op: "left", off: originX }, y: { op: "bottom", off: yFlat } },
      right: { k: pRight.k, a: pRight.a, w: width(right), h: slotH,
        x: { op: "right", off: -rightMargin }, y: { op: "bottom", off: yFlat } },
      centered: { k: pCentered.k, a: pCentered.a, w: width(total), h: slotH,
        x: { op: "center", off: 0 }, y: { op: "bottom", off: yCentered } },
      counts: { left, right, total, slot: slotW, gap },
      slots,
    };
  };
})();
