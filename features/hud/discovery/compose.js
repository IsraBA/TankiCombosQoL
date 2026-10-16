// features/hud/discovery/compose.js  [ISOLATED world]

// discover(src): כל החילוצים, מורכבים למתכון לכל רכיב בכל פריסה
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const P = (window.TankiQoL.HudParse = window.TankiQoL.HudParse || {});

  // גרסת הפלט; עולה יחד עם CACHE_VERSION ב-detect.js
  const V = 15;

  // enum של סלוט -> אייקון; אוגמנט = סלוט ריק
  const SLOT_ICON = {
    NUCLEAR: "nuclear", GRENADE: "grenade",
    FIRST_AID: "Repair", DOUBLE_ARMOR: "Shield", DOUBLE_DAMAGE: "DoubleDamage",
    NITRO: "Speed", MINE: "Mine", GOLD_BOX: "GoldBox",
  };

  // תיבת בן בשברי האב; שתיהן באותו עוגן ובאותו קצה
  function fraction(box, child) {
    const L = P.L();
    const bx = L.span(box.x.op, box.x.off, box.w), by = L.span(box.y.op, box.y.off, box.h);
    const cx = L.span(child.x.op, child.x.off, child.w), cy = L.span(child.y.op, child.y.off, child.h);
    return {
      x: (cx[0] - bx[0]) / box.w, y: (cy[0] - by[0]) / box.h,
      w: child.w / box.w, h: child.h / box.h,
    };
  }

  // שורת סלוטים, משמאל לימין
  function slotParts(box, row, n, slot, gap, icons) {
    const L = P.L();
    const bx = L.span(box.x.op, box.x.off, box.w), by = L.span(box.y.op, box.y.off, box.h);
    const rx = L.span(row.x.op, row.x.off, row.w), ry = L.span(row.y.op, row.y.off, row.h);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        kind: "slot",
        x: (rx[0] + i * (slot + gap) - bx[0]) / box.w,
        y: (ry[0] - by[0]) / box.h,
        w: slot / box.w,
        h: row.h / box.h,
        icon: SLOT_ICON[icons[i]] || null,
      });
    }
    return out;
  }

  // {id:{default,centered}} -> {default:{id:recipe}, centered:{…}}
  function split(parts) {
    const layouts = { default: {}, centered: {} };
    for (const id of Object.keys(parts)) {
      const p = parts[id];
      if (!p) continue;
      if (p.default) layouts.default[id] = p.default;
      if (p.centered) layouts.centered[id] = p.centered;
    }
    return layouts;
  }

  // הרימונים ברגילה, והשורה האחת בממורכזת; הטבעת בשתיהן
  function supplies(parts, nuke, rows) {
    const L = P.L();
    const { left, right, total, slot, gap } = rows.counts;
    // הקשת הנראית, לא רקע ההבזק השקוף
    const ring = nuke && nuke.ring;

    const gBox = ring ? L.union(ring.default, rows.left) : rows.left;
    if (gBox) {
      gBox.parts = slotParts(gBox, rows.left, left, slot, gap, rows.slots.left);
      if (ring) gBox.parts.push(Object.assign({ kind: "ring" }, fraction(gBox, ring.default)));
      parts.grenades = { default: gBox, centered: null };
    }

    // בממורכזת הטבעת עוקבת אחרי הסלוט שלה
    let ringC = ring && ring.centered;
    const on = rows.slots.centered.indexOf(rows.slots.ringOn);
    if (ringC && on >= 0) {
      const slotLeft = -rows.centered.w / 2 + on * (slot + gap);
      ringC = Object.assign({}, ringC, { x: { op: "center", off: slotLeft + rows.slots.ringDx + nuke.shift } });
    }

    const cBox = ringC ? L.union(rows.centered, ringC) : rows.centered;
    const rBox = rows.right;
    rBox.parts = slotParts(rBox, rows.right, right, slot, gap, rows.slots.right);
    if (cBox) {
      cBox.parts = slotParts(cBox, rows.centered, total, slot, gap, rows.slots.centered);
      if (ringC) cBox.parts.push(Object.assign({ kind: "ring" }, fraction(cBox, ringC)));
    }
    parts.supplies = { default: rBox, centered: cBox };
  }

  // ל-MAIN: השמות ומיפוי אתרי ההוספה; נשלח לפני שאר הגילוי
  function discoverGame(src) {
    const names = P.engine(src);
    if (!names) return null;
    const { factory, nodeAdd, nodeRemove, ...engine } = names;
    return { names, game: { names: engine, offsets: P.offsets(src, names) } };
  }

  // {v, game, kinds, covered, layouts, assets} — או null; first = discoverGame
  function discover(src, first) {
    const pre = first || discoverGame(src);
    if (!pre) return null;
    const { names, game } = pre;
    const kinds = P.strategyKinds(src, names);
    if (!kinds) return { v: V, game };
    const call = P.paramsCall(src, kinds);
    if (!call) return null;

    const rad = P.radar(src, kinds, call);
    const tank = P.bars(src, kinds, call);
    const parts = {
      radar: rad && rad.recipes,
      bars: tank && tank.bars,
      effects: tank && tank.effects,
      chat: P.chat(src, kinds),
      killLog: P.killLog(src, kinds, names),
      status: P.status(src, kinds, call),
    };
    const covered = () => Object.keys(parts).filter((id) => parts[id]);

    // בלי model/layout.js — רק מה שקריא ישירות
    if (!P.L()) return { v: V, game, kinds, covered: covered(), layouts: split(parts) };

    if (rad) parts.overdrive = P.overdrive(src, kinds, call, rad.hudTypes);
    const rows = P.supplyRows(src, kinds);
    if (rows) supplies(parts, P.nuclear(src, kinds, call), rows);

    // הכפתור יושב במרכז תיבת ההילה
    if (parts.overdrive && parts.overdrive.button) {
      for (const layout of ["default", "centered"]) {
        const box = parts.overdrive[layout];
        box.parts = [Object.assign({ kind: "disc" }, fraction(box, parts.overdrive.button[layout]))];
      }
      delete parts.overdrive.button;
    }

    return { v: V, game, kinds, covered: covered(), layouts: split(parts), assets: P.assets(src) || {} };
  }

  window.TankiQoL.HudDiscover = { discover, discoverGame };
})();
