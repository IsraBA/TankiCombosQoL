// features/hud/dom/catalog.js  [ISOLATED world]

// רכיבי ה-HUD שב-HTML: אותם בוררים לקרב ולעותק. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const Q = window.TankiQoL;
  const H = () => Q.DOM.HUD;

  // העותק לובש cme_: תוספים אחרים (Tanki Tweaks) צופים בשמות המקוריים
  const liveClass = (name) => name;
  const ghostClass = (name) => "cme_" + name;

  const sel = (c, names) => names.map((n) => "." + c(n)).join(", ");
  const all = (root, s) => Array.prototype.slice.call(root.querySelectorAll(s));

  // c: liveClass או ghostClass; joins: זז יחד עם רכיב קנבס
  const ELEMENTS = [
    // שם, דרגה ו-XP: האב של אייקון הדרגה
    { id: "userInfo", find: (root, c) => {
      const r = root.querySelector(sel(c, [H().rankIcon, H().rankIconClickable]));
      return r && r.parentElement ? [r.parentElement] : [];
    } },
    // מסך מלא, השהיה וטבלת הניקוד — שלושה כפתורים בעמודה אחת
    { id: "buttons", find: (root, c) => all(root, sel(c, [H().fullScreenButton, H().pauseButton, H().tabButton])) },
    { id: "fps", find: (root, c) => all(root, sel(c, [H().fps])) },
    // שורת ההקלדה של הצ'אט, מתחת להודעות שעל הקנבס
    { id: "chatInput", joins: "chat", find: (root, c) => all(root, sel(c, [H().chatInput])) },
  ];

  Q.HudDomCatalog = {
    ELEMENTS,
    liveClass,
    ghostClass,
    // הקונטיינר של ה-HUD בקרב; null מחוץ לקרב
    live: () => document.querySelector("." + H().container),
  };
})();
