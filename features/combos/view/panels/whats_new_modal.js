// features/combos/view/panels/whats_new_modal.js

// מודל "מה חדש", פעם אחת לכל גרסת חדשות. הרציונל: CLAUDE.mds/combos.md

(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const KEY = "whatsNewSeenVersion";

  // להקפיץ שוב אחרי עדכון = לשנות את הערך הזה ואת רשימת השורות.
  // מכוון שזה נשאר 4.0 בזמן ש-manifest כבר 4.1: 4.1 הוא תיקון שקט של שרת
  // התרגום, בלי שינוי בממשק, ואין סיבה להקפיץ שוב חלונית למי שכבר סגר אותה.
  const NEWS_VERSION = "4.0";
  const LINES = ["whatsNewCombo", "whatsNewRecommend", "whatsNewPolish"];

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

      // כל דרך סגירה היא אישור שנצפה — X, הכפתור, הרקע או Escape
      this.dialog = Dialog.open({
        id: "cme_whats-new-root",
        variant: "danger",
        title: t("whatsNewTitle"),
        titleIconHtml: window.TankiQoL.Icons.party("cme_whats-new-party"),
        body: LINES.map((k) => "• " + t(k)).join("\n"),
        bodyAlign: "left",
        buttons: [{ text: t("whatsNewGotIt"), variant: "primary", action: "close" }],
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

    _internals: { KEY, NEWS_VERSION, LINES },
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
