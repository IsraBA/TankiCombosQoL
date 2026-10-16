// features/combos/view/panels/whats_new_modal.js

// מודל "מה חדש", פעם אחת לכל גרסת חדשות. הרציונל: CLAUDE.mds/combos.md

(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const KEY = "whatsNewSeenVersion";

  // להקפיץ שוב אחרי עדכון: לשנות את הערך ואת השורות
  const NEWS_VERSION = "5.0";
  const LINES = ["whatsNewHud", "whatsNewFixes"];
  // היעד של "קח אותי לשם" מגיע מפיצ'ר אחר; אין תלות בו
  const GO = { to: "hudEditor", text: "whatsNewTakeMe" };
  const destinations = {};

  // null = טרם נקרא. הכפתור בלובי נבנה מחדש תדיר, ולכן נשמר בזיכרון.
  let seen = null;
  let showing = false;

  function load() {
    try {
      chrome.storage.local.get([KEY], (r) => {
        seen = (r && r[KEY]) === NEWS_VERSION;
      });
    } catch (e) {
      seen = true;
    }
  }
  load();

  window.TankiQoL.WhatsNewModal = {
    dialog: null,

    // הבאדג' בלובי תלוי באותו דגל; בזמן טעינה לא מהבהבים
    isUnseen() {
      return seen === false;
    },

    isOpen() {
      return showing;
    },

    // run() נקרא אחרי שהמודל נסגר; בלי יעד אין כפתור
    provide(to, run) {
      destinations[to] = run;
    },

    // נקרא בכל פתיחה של הכרטיסייה; מציג לכל היותר פעם אחת
    maybeShow() {
      if (showing || seen !== false) return;
      this.show();
    },

    show() {
      const LM = window.TankiQoL.LanguageManager;
      const Dialog = window.TankiQoL.Dialog;
      const t = (k) => (LM ? LM.getUIText(k) : k);
      if (!Dialog || showing) return;

      const run = GO && destinations[GO.to];
      const gotIt = { text: t("whatsNewGotIt"), variant: run ? "secondary" : "primary", action: "close" };
      const buttons = run ? [gotIt, { text: t(GO.text), variant: "primary", action: "go", onClick: () => setTimeout(run) }] : [gotIt];

      // כל דרך סגירה היא אישור שנצפה — X, הכפתורים, הרקע או Escape
      this.dialog = Dialog.open({
        id: "cme_whats-new-root",
        variant: "danger",
        title: t("whatsNewTitle").replace("{version}", NEWS_VERSION),
        body: LINES.map((k) => "• " + t(k)).join("\n"),
        bodyAlign: "left",
        buttons,
        onClose: () => {
          this.dialog = null;
          showing = false;
          this.markSeen();
        },
      });
      showing = true;
    },

    hide() {
      if (this.dialog) this.dialog.close();
    },

    markSeen() {
      seen = true;
      try {
        chrome.storage.local.set({ [KEY]: NEWS_VERSION });
      } catch (e) { /* נשאר מסומן לסשן הזה */ }
      const injector = window.TankiQoL.LobbyButtonInjector;
      if (injector && injector.refreshBadge) injector.refreshBadge();
    },

    // עוזר קונסול: מנקה את הדגל כדי להציג שוב בלי התקנה מחדש
    reset() {
      return new Promise((resolve) => {
        chrome.storage.local.remove([KEY], () => {
          seen = false;
          const injector = window.TankiQoL.LobbyButtonInjector;
          if (injector && injector.refreshBadge) injector.refreshBadge();
          resolve("what's-new flag cleared — reopen the COMBOS tab");
        });
      });
    },

    _internals: { KEY, NEWS_VERSION, LINES, GO },
  };

  // מאפשר __CMB.resetWhatsNew() מהקונסול של הדף, בלי להחליף הקשר
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const m = e.data;
    if (!m || !m.__cmb || m.dir !== "m2i") return;
    if (m.action !== "resetWhatsNew") return;
    window.TankiQoL.WhatsNewModal.reset();
  });
})();
