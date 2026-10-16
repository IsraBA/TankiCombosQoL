// features/hud/main.js  [ISOLATED world]

// מחבר את העורך לדף: הכפתור בהגדרות, סגירה כשהמסך נעלם, ויעד להודעה על הגרסה.
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

  // ההודעה על הגרסה מובילה לעורך; הקומבו לא תלוי בנו
  const news = window.TankiQoL.WhatsNewModal;
  if (news) news.provide("hudEditor", () => window.TankiQoL.HudSettingsButton.goTo());

  setInterval(() => {
    const Q = window.TankiQoL;
    const DOM = Q.DOM;
    const button = Q.HudSettingsButton, editor = Q.HudEditor;
    if (!DOM || !button || !editor) return;

    const settingsOpen = !!document.querySelector(DOM.SETTINGS_SCREEN);
    if (settingsOpen) button.inject();

    // המשחק ניווט החוצה (Z, כפתור חזרה) בזמן שהעורך פתוח
    if (editor.isOpen() && !document.querySelector(DOM.NOT_IN_GAME_CONTAINER)) editor.close();
  }, CHECK_MS);
})();
