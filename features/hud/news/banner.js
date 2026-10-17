// features/hud/news/banner.js  [ISOLATED world]

// באנר "פיצ'ר חדש" מתחת לייבוא/ייצוא בכרטיסיית הקומבואים; X סוגר לתמיד.
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  // שורת הכפתורים של הקומבו; התלות היא מאיתנו אליו
  const ROW = "cme_import-export-row";
  const BANNER = "cme_hud-news-banner";

  function t(key) {
    const LM = window.TankiQoL.LanguageManager;
    return LM ? LM.getUIText(key) : key;
  }

  function el(className, text) {
    const node = document.createElement("div");
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // כל הבאנר מוביל לעורך, חוץ מה-X
  function build() {
    const Q = window.TankiQoL;
    const banner = el(BANNER);
    banner.addEventListener("click", (e) => {
      e.stopPropagation();
      Q.HudSettingsButton.goTo();
    });

    const text = el("cme_hud-news-banner-text");
    text.appendChild(el("cme_hud-news-banner-label", t("hudNewsBanner")));
    text.appendChild(el("cme_hud-news-banner-name", t("hudEditorButton")));

    // אותו X של הדיאלוגים
    const close = el("cme_dialog-close cme_hud-news-banner-close");
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      Q.HudNews.closeBanner();
      banner.remove();
    });

    banner.appendChild(el("cme_hud-news-banner-dot"));
    banner.appendChild(text);
    banner.appendChild(close);
    return banner;
  }

  window.TankiQoL.HudNewsBanner = {
    // נקרא בכל סבב; הכרטיסייה נבנית מחדש, ולכן גם הבאנר
    sync() {
      const Q = window.TankiQoL;
      if (!Q.DOM || !Q.HudNews) return;
      const row = document.querySelector("." + ROW);
      const host = row && row.parentNode;
      if (!host) return;
      const existing = host.querySelector("." + BANNER);
      const on = Q.HudNews.bannerPending();
      if (on && !existing) host.appendChild(build());
      else if (!on && existing) existing.remove();
    },
  };
})();
