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
    modalElement: null,
    escapeHandler: null,

    // הבאדג' בלובי תלוי באותו דגל; בזמן טעינה לא מהבהבים
    isUnseen() {
      return seen === false;
    },

    // נקרא בכל פתיחה של הכרטיסייה; מציג לכל היותר פעם אחת
    maybeShow() {
      if (showing || seen !== false) return;
      this.show();
    },

    show() {
      const LM = window.TankiQoL.LanguageManager;
      const t = (k) => (LM ? LM.getUIText(k) : k);

      if (!this.modalElement) {
        const root = document.createElement("div");
        root.id = "cme_whats-new-root";
        root.style.display = "none";
        document.body.appendChild(root);
        this.modalElement = root;
      }

      // אותו span של מודל המחיקה — כל הטיפוגרפיה מגיעה ממנו
      const items = LINES.map((k) => "• " + t(k)).join("<br>");

      this.modalElement.innerHTML = `
                <div class="cme_ModalStyle-rootHover">
                    <div class="cme_DialogContainerComponentStyle-container">
                        <div class="cme_DialogContainerComponentStyle-header">
                            <h1>${window.TankiQoL.Icons.party("cme_whats-new-party")}${t("whatsNewTitle")}</h1>
                            <div class="cme_DialogContainerComponentStyle-containerForImg">
                                <div class="cme_DialogContainerComponentStyle-imgClose" data-action="close"></div>
                            </div>
                        </div>

                        <div class="cme_DialogContainerComponentStyle-contentContainer">
                            <div class="cme_DialogBuyGarageItemComponentStyle-container">
                                <span>${items}</span>
                            </div>
                        </div>

                        <div class="cme_DialogContainerComponentStyle-footerContainer">
                            <div class="cme_Common-flexCenterAlignCenter cme_DialogContainerComponentStyle-enterButton" data-action="close">
                                <span>${t("whatsNewGotIt")}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

      this.bindEvents();
      this.modalElement.style.display = "block";
      showing = true;
    },

    // כל דרך סגירה היא אישור שנצפה — X, הכפתור, הרקע או Escape
    hide() {
      if (this.modalElement) {
        this.modalElement.style.display = "none";
        this.modalElement.innerHTML = "";
      }
      if (this.escapeHandler) {
        document.removeEventListener("keydown", this.escapeHandler);
        this.escapeHandler = null;
      }
      showing = false;
      this.markSeen();
    },

    markSeen() {
      seen = true;
      try {
        chrome.storage.local.set({ [KEY]: NEWS_VERSION });
      } catch (e) { /* נשאר מסומן לסשן הזה */ }
      const injector = window.TankiQoL.LobbyButtonInjector;
      if (injector && injector.refreshBadge) injector.refreshBadge();
    },

    bindEvents() {
      if (!this.modalElement) return;

      for (const el of this.modalElement.querySelectorAll(
        '[data-action="close"]',
      )) {
        el.onclick = () => this.hide();
      }

      const background = this.modalElement.querySelector(
        ".cme_ModalStyle-rootHover",
      );
      if (background) {
        background.onclick = (e) => {
          if (e.target === background) this.hide();
        };
      }

      this.escapeHandler = (e) => {
        if (e.key === "Escape") this.hide();
      };
      document.addEventListener("keydown", this.escapeHandler);
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
