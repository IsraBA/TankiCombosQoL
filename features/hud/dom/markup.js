// features/hud/dom/markup.js  [ISOLATED world]

// העץ של BattleHud עם תוכן קבוע, על מחלקות עם קידומת. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const Q = window.TankiQoL;

  const asset = (name) => (Q.HudRecipes ? Q.HudRecipes.asset(name) : null);
  // מפתחות TankiQoL.DOM.HUD -> השמות בעותק שלנו
  const g = (...keys) => keys.map((k) => Q.HudDomCatalog.ghostClass(Q.DOM.HUD[k])).join(" ");

  // שלד, לא השחקן: ערכים קבועים
  const XP = { value: "2 440 000", max: "4 000 000", fill: 0.61 };

  function el(tag, cls, parent) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (parent) parent.appendChild(d);
    return d;
  }
  const div = (cls, parent) => el("div", cls, parent);

  function img(cls, name, parent) {
    const i = el("img", cls, parent);
    i.alt = "";
    const url = asset(name);
    if (url) i.src = url;
    return i;
  }

  // פרטי המשתמש (Uti): דרגה, כינוי, פס XP
  function userInfo() {
    const root = div("cme_hud-userinfo");
    img(g("rankImage"), "rank", div(g("rankIcon", "rightBorder"), root));

    const col = div(g("progress"), root);
    el("span", g("name", "textShadow"), div("", col)).textContent = "Tanker";
    div("cme_hud-xpbar-fill", div("cme_hud-xpbar", col)).style.width = XP.fill * 100 + "%";
    const xp = div(g("xpRow"), col);
    const icon = div(g("xpIcon"), xp);
    const xpUrl = asset("experience");
    if (xpUrl) icon.style.backgroundImage = 'url("' + xpUrl + '")';
    const value = div(g("xpValue"), xp);
    value.textContent = XP.value;
    el("span", "cme_hud-xpmax", value).textContent = " / " + XP.max;
    return root;
  }

  // התווית רק כשההגדרה showButtonLabels דולקת
  function button(parent, kind, key, image, labels) {
    const b = div(g(kind), parent);
    if (labels) el("span", "", b).textContent = "[" + key + "]";
    img("", image, b);
  }

  function fps(parent) {
    const box = div(g("fps"), parent);
    for (const [label, value] of [["FPS", "60"], ["Ping", "50"]]) {
      const row = div(g("fpsRow"), box);
      el("span", g("fpsLabel"), row).textContent = label + ": ";
      el("span", g("fpsValue"), row).textContent = value;
    }
  }

  // תאי grid בשם, ובתוכם הרכיבים
  function build(labels) {
    const root = div("cme_hud-dom cme_hud-ghost");
    const hud = div(g("container"), root);

    const user = div("", hud);
    user.style.cssText = "grid-area:UserInfo;justify-self:start";
    div(g("userPanel"), user).appendChild(userInfo());

    const cell = div(g("buttonsContainer"), hud);
    cell.style.cssText = "grid-area:Buttons;justify-self:end";
    const column = div("", div(g("buttonsRow"), cell));
    button(column, "fullScreenButton", "F11", "fullScreenSmall", labels);
    button(column, "pauseButton", "Esc", "icPause", labels);
    button(column, "tabButton", "Tab", "icTabStatistic", labels);
    const wrap = div("", column);
    wrap.style.cssText = "display:flex;flex-direction:column";
    fps(wrap);

    div(g("chatInput"), hud);
    return root;
  }

  Q.HudDomMarkup = { build };
})();
