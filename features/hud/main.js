// features/hud/main.js  [ISOLATED world]

// מחבר את העורך לדף: הכפתור בהגדרות, סגירה, יעד להודעה, וההפניות אליו.
(function () {
  "use strict";

  const CHECK_MS = 300;

  // מרכזי הסיבוב אל ה-MAIN, בכל שינוי שמזיז מלבן
  (function pushPivots() {
    const Q = window.TankiQoL;
    if (!Q.HudRects || !Q.HudBridge || !Q.HudStore) return setTimeout(pushPivots, 200);

    let timer = 0;
    function send() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          Q.HudBridge.sendPivots(Q.HudRects.pivots());
        } catch (e) { /* ניסיון הבא ייגע בזה שוב */ }
      }, 150);
    }

    if (Q.HudRecipes) Q.HudRecipes.onReady(send);
    Q.HudStore.subscribe(send);
    Q.HudBridge.onState(send);
    window.addEventListener("resize", send);
    send();
  })();

  // ההודעה מובילה לעורך; הבאדג' שלה הולך עם הבאנר (X מכבה את שניהם)
  const news = window.TankiQoL.WhatsNewModal;
  if (news) {
    news.provide("hudEditor", () => window.TankiQoL.HudSettingsButton.goTo(),
      () => !!window.TankiQoL.HudNews && window.TankiQoL.HudNews.bannerPending());
  }

  setInterval(() => {
    const Q = window.TankiQoL;
    const DOM = Q.DOM;
    const button = Q.HudSettingsButton, editor = Q.HudEditor;
    if (!DOM || !button || !editor) return;

    const settingsOpen = !!document.querySelector(DOM.SETTINGS_SCREEN);
    if (settingsOpen) button.inject();

    // המשחק ניווט החוצה (Z, כפתור חזרה) בזמן שהעורך פתוח
    if (editor.isOpen() && !document.querySelector(DOM.NOT_IN_GAME_CONTAINER)) editor.close();

    // ההפניות אל העורך נעלמות אחרי הכניסה הראשונה
    if (Q.HudNews) {
      if (editor.isOpen()) Q.HudNews.markVisited();
      Q.HudNewsDots.sync();
      Q.HudNewsBanner.sync();
      // הבאדג' על כפתור COMBOS בלובי תלוי גם במצב שלנו
      if (Q.LobbyButtonInjector) Q.LobbyButtonInjector.refreshBadge();
    }
  }, CHECK_MS);
})();
