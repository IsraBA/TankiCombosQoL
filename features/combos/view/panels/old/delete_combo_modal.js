// features/combos/view/panels/old/delete_combo_modal.js

// LEGACY: הוחלף בגרסה על shared/components/dialog.js. לא נטען.

// קובץ זה אחראי ליצור ולנהל את המודל למחיקת קומבו
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  window.TankiQoL.DeleteComboModalLegacy = {
    modalElement: null,
    currentComboId: null,
    currentComboName: null,
    onConfirmCallback: null,
    escapeHandler: null,

    // יצירת המודל (רק פעם אחת)
    init() {
      if (this.modalElement) return;

      // יצירת root למודל
      const modalRoot = document.createElement("div");
      modalRoot.id = "cme_modal-root";
      modalRoot.style.display = "none";
      document.body.appendChild(modalRoot);
      this.modalElement = modalRoot;
    },

    // פתיחת המודל עם פרטי הקומבו
    show(comboId, comboName, onConfirm) {
      const LM = window.TankiQoL.LanguageManager;

      // שמירת הנתונים
      this.currentComboId = comboId;
      this.currentComboName = comboName;
      this.onConfirmCallback = onConfirm;

      // יצירת המודל אם עדיין לא קיים
      if (!this.modalElement) {
        this.init();
      }

      // יצירת תוכן המודל
      const modalHTML = `
                <div class="cme_ModalStyle-rootHover">
                    <div class="cme_DialogContainerComponentStyle-container">
                        <!-- Header (title) -->
                        <div class="cme_DialogContainerComponentStyle-header">
                            <h1>${LM.getUIText("deleteComboModalTitle").replace("{comboName}", comboName)}</h1>
                            <div class="cme_DialogContainerComponentStyle-containerForImg">
                                <div class="cme_DialogContainerComponentStyle-imgClose" data-action="close"></div>
                            </div>
                        </div>
                        
                        <!-- Content (content) -->
                        <div class="cme_DialogContainerComponentStyle-contentContainer">
                            <div class="cme_DialogBuyGarageItemComponentStyle-container">
                                <span>${LM.getUIText("deleteConfirm")}</span>
                            </div>
                        </div>
                        
                        <!-- Footer (buttons) -->
                        <div class="cme_DialogContainerComponentStyle-footerContainer">
                            <div class="cme_Common-flexCenterAlignCenter cme_DialogContainerComponentStyle-keyButton" data-action="cancel">
                                <span>${LM.getUIText("cancel")}</span>
                            </div>
                            <div class="cme_Common-flexCenterAlignCenter cme_DialogContainerComponentStyle-enterButton" data-action="delete">
                                <span>${LM.getUIText("delete")}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

      this.modalElement.innerHTML = modalHTML;

      // חיבור אירועים
      this.bindEvents();

      // הצגת המודל
      this.modalElement.style.display = "block";
    },

    // סגירת המודל
    hide() {
      if (this.modalElement) {
        this.modalElement.style.display = "none";
        this.modalElement.innerHTML = "";
      }

      // הסרת event listener של Escape
      if (this.escapeHandler) {
        document.removeEventListener("keydown", this.escapeHandler);
        this.escapeHandler = null;
      }

      // איפוס הנתונים
      this.currentComboId = null;
      this.currentComboName = null;
      this.onConfirmCallback = null;
    },

    // חיבור אירועים לכפתורים
    bindEvents() {
      if (!this.modalElement) return;

      // כפתור סגירה (X)
      const closeBtn = this.modalElement.querySelector('[data-action="close"]');
      if (closeBtn) {
        closeBtn.onclick = () => {
          this.hide();
        };
      }

      // כפתור ביטול
      const cancelBtn = this.modalElement.querySelector(
        '[data-action="cancel"]',
      );
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          this.hide();
        };
      }

      // כפתור מחיקה
      const deleteBtn = this.modalElement.querySelector(
        '[data-action="delete"]',
      );
      if (deleteBtn) {
        deleteBtn.onclick = () => {
          // קריאה ל-callback אם קיים
          if (
            this.onConfirmCallback &&
            typeof this.onConfirmCallback === "function"
          ) {
            this.onConfirmCallback(this.currentComboId);
          }

          this.hide();
        };
      }

      // סגירה בלחיצה על הרקע
      const modalBackground = this.modalElement.querySelector(
        ".cme_ModalStyle-rootHover",
      );
      if (modalBackground) {
        modalBackground.onclick = (e) => {
          // סגירה רק אם לחצו על הרקע ולא על התיבה עצמה
          if (e.target === modalBackground) {
            this.hide();
          }
        };
      }

      // סגירה במקש Escape
      this.escapeHandler = (e) => {
        if (e.key === "Escape") {
          this.hide();
        }
      };
      document.addEventListener("keydown", this.escapeHandler);
    },
  };
})();
