// features/hud/news/dots.js  [ISOLATED world]

// שרשרת נקודות צהובות אל העורך: הגדרות בלובי, CONTROLS, כפתור HUD EDITOR.
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const DOT = "cme_hud-news-dot";

  // כל מארח והמחלקה שממקמת בו את הנקודה
  function hosts(DOM) {
    const option = document.querySelector(DOM.LOBBY_SETTINGS_ITEM);
    const tab = document.querySelectorAll(DOM.SETTINGS_MENU_ITEM)[DOM.SETTINGS_CONTROLS_INDEX];
    const button = window.TankiQoL.HudSettingsButton;
    return [
      { el: option && option.parentNode, kind: "cme_hud-news-lobby" },
      { el: tab, kind: "cme_hud-news-tab" },
      { el: button && document.querySelector("." + button.MARK), kind: "cme_hud-news-corner" },
    ];
  }

  function place(host, on) {
    if (!host.el) return;
    const existing = host.el.querySelector("." + DOT);
    if (on && !existing) {
      const dot = document.createElement("div");
      dot.className = DOT + " " + host.kind;
      host.el.appendChild(dot);
    } else if (!on && existing) {
      existing.remove();
    }
  }

  window.TankiQoL.HudNewsDots = {
    // נקרא בכל סבב; מוסיף או מסיר לפי המצב
    sync() {
      const Q = window.TankiQoL;
      if (!Q.DOM || !Q.HudNews) return;
      const on = Q.HudNews.pending();
      for (const host of hosts(Q.DOM)) place(host, on);
    },
  };
})();
