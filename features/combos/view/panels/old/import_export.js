// features/combos/view/panels/old/import_export.js

// LEGACY: הוחלף בגרסה על shared/components/dialog.js. לא נטען.

// ייבוא וייצוא קומבואים — לוגיקה ומודאלים
(function () {
  "use strict";
  window.TankiQoL = window.TankiQoL || {};

  const ImportExport = {
    modalElement: null,
    escapeHandler: null,

    // אתחול אלמנט המודאל
    init() {
      if (this.modalElement) return;
      const modalRoot = document.createElement("div");
      modalRoot.id = "cme_import-modal-root";
      modalRoot.style.display = "none";
      document.body.appendChild(modalRoot);
      this.modalElement = modalRoot;
    },

    // ייצוא — הורדת קובץ JSON של כל הקומבואים בשפה הנוכחית
    exportCombos() {
      const LM = window.TankiQoL.LanguageManager;
      const currentLang = LM ? LM.getCurrentLanguageCode() : "en";

      chrome.storage.local.get(["savedCombos"], (result) => {
        const combos = result.savedCombos || [];

        // סינון רק קומבואים בשפה הנוכחית
        const filtered = combos.filter(
          (c) => (c.language || "en") === currentLang,
        );

        if (filtered.length === 0) return;

        const data = JSON.stringify(filtered, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        // יצירת שם קובץ עם תאריך נוכחי
        const today = new Date().toISOString().split("T")[0];
        const filename = `tanki-combos-${today}.json`;

        // הורדת הקובץ
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    },

    // ייבוא — פתיחת file picker לבחירת קובץ JSON
    importCombos() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.style.display = "none";

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          this.processImportedFile(event.target.result);
        };
        reader.readAsText(file);
        document.body.removeChild(input);
      };

      document.body.appendChild(input);
      input.click();
    },

    // עיבוד הקובץ המיובא — ולידציה ושמירה
    processImportedFile(content) {
      const LM = window.TankiQoL.LanguageManager;

      // ולידציה — JSON חוקי
      let importedCombos;
      try {
        importedCombos = JSON.parse(content);
      } catch {
        this.showErrorModal(LM.getUIText("importInvalidFile"));
        return;
      }

      // ולידציה — מערך לא ריק
      if (!Array.isArray(importedCombos) || importedCombos.length === 0) {
        this.showErrorModal(LM.getUIText("importInvalidFile"));
        return;
      }

      // ולידציה — כל קומבו חייב לכלול data
      const allValid = importedCombos.every(
        (c) => c && c.data && typeof c.data === "object",
      );
      if (!allValid) {
        this.showErrorModal(LM.getUIText("importInvalidFile"));
        return;
      }

      // ולידציה — שפה תואמת לשפת המשחק הנוכחית
      const currentLang = LM ? LM.getCurrentLanguageCode() : "en";
      const allSameLanguage = importedCombos.every(
        (c) => (c.language || "en") === currentLang,
      );
      if (!allSameLanguage) {
        this.showErrorModal(LM.getUIText("importWrongLanguage"));
        return;
      }

      // בדיקה אם יש קומבואים קיימים בשפה הנוכחית
      chrome.storage.local.get(["savedCombos"], (result) => {
        const existingCombos = (result.savedCombos || []).filter(
          (c) => (c.language || "en") === currentLang,
        );

        if (existingCombos.length === 0) {
          // אין קומבואים קיימים — שמירה ישירה
          this.performImport(importedCombos, "replace");
        } else {
          // יש קומבואים קיימים — הצגת מודאל בחירה
          this.showImportChoiceModal(importedCombos);
        }
      });
    },

    // ביצוע הייבוא בפועל
    performImport(importedCombos, mode) {
      chrome.storage.local.get(["savedCombos"], (result) => {
        let combos = result.savedCombos || [];
        const LM = window.TankiQoL.LanguageManager;
        const currentLang = LM ? LM.getCurrentLanguageCode() : "en";

        if (mode === "replace") {
          // מחיקת קומבואים בשפה הנוכחית, שמירה על קומבואים בשפות אחרות
          combos = combos.filter((c) => (c.language || "en") !== currentLang);
        }

        // חישוב ה-order הגבוה ביותר מבין הקומבואים הקיימים
        const maxOrder =
          combos.length > 0
            ? Math.max(...combos.map((c) => c.order || 0)) + 1
            : 0;

        // הוספת הקומבואים המיובאים עם IDs חדשים
        importedCombos.forEach((combo, i) => {
          combo.id = Date.now() + i;
          combo.order = mode === "add" ? maxOrder + i : i;
        });

        combos = combos.concat(importedCombos);

        chrome.storage.local.set({ savedCombos: combos }, () => {
          // רענון התצוגה
          if (window.TankiQoL.ViewRenderer) {
            window.TankiQoL.ViewRenderer.loadAndRenderCombos();
          }
        });
      });
    },

    // מודאל בחירה — הוספה או החלפה
    showImportChoiceModal(importedCombos) {
      const LM = window.TankiQoL.LanguageManager;
      if (!this.modalElement) this.init();

      const modalHTML = `
        <div class="cme_ModalStyle-rootHover">
          <div class="cme_DialogContainerComponentStyle-container">
            <div class="cme_DialogContainerComponentStyle-header">
              <h1>${LM.getUIText("importTitle")}</h1>
              <div class="cme_DialogContainerComponentStyle-containerForImg">
                <div class="cme_DialogContainerComponentStyle-imgClose" data-action="close"></div>
              </div>
            </div>
            <div class="cme_DialogContainerComponentStyle-contentContainer">
              <div class="cme_DialogBuyGarageItemComponentStyle-container">
                <span>${LM.getUIText("importChooseAction")}</span>
              </div>
            </div>
            <div class="cme_DialogContainerComponentStyle-footerContainer">
              <div class="cme_Common-flexCenterAlignCenter cme_DialogContainerComponentStyle-keyButton" data-action="replace">
                <span>${LM.getUIText("importReplace")}</span>
              </div>
              <div class="cme_Common-flexCenterAlignCenter cme_DialogContainerComponentStyle-enterButton" data-action="add">
                <span>${LM.getUIText("importAdd")}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      this.modalElement.innerHTML = modalHTML;
      this.bindModalEvents(importedCombos);
      this.modalElement.style.display = "block";
    },

    // מודאל שגיאה
    showErrorModal(message) {
      const LM = window.TankiQoL.LanguageManager;
      if (!this.modalElement) this.init();

      const modalHTML = `
        <div class="cme_ModalStyle-rootHover">
          <div class="cme_DialogContainerComponentStyle-container">
            <div class="cme_DialogContainerComponentStyle-header">
              <h1>${LM.getUIText("importErrorTitle")}</h1>
              <div class="cme_DialogContainerComponentStyle-containerForImg">
                <div class="cme_DialogContainerComponentStyle-imgClose" data-action="close"></div>
              </div>
            </div>
            <div class="cme_DialogContainerComponentStyle-contentContainer">
              <div class="cme_DialogBuyGarageItemComponentStyle-container">
                <span>${message}</span>
              </div>
            </div>
            <div class="cme_DialogContainerComponentStyle-footerContainer">
              <div class="cme_Common-flexCenterAlignCenter cme_DialogContainerComponentStyle-enterButton" data-action="close">
                <span>OK</span>
              </div>
            </div>
          </div>
        </div>
      `;

      this.modalElement.innerHTML = modalHTML;
      this.bindModalEvents(null);
      this.modalElement.style.display = "block";
    },

    // חיבור אירועים למודאל
    bindModalEvents(importedCombos) {
      if (!this.modalElement) return;

      // כפתורי סגירה וביטול
      this.modalElement
        .querySelectorAll('[data-action="close"], [data-action="cancel"]')
        .forEach((btn) => {
          btn.onclick = () => this.hideModal();
        });

      // כפתור הוספה
      const addBtn = this.modalElement.querySelector('[data-action="add"]');
      if (addBtn && importedCombos) {
        addBtn.onclick = () => {
          this.performImport(importedCombos, "add");
          this.hideModal();
        };
      }

      // כפתור החלפה
      const replaceBtn = this.modalElement.querySelector(
        '[data-action="replace"]',
      );
      if (replaceBtn && importedCombos) {
        replaceBtn.onclick = () => {
          this.performImport(importedCombos, "replace");
          this.hideModal();
        };
      }

      // סגירה בלחיצה על הרקע
      const bg = this.modalElement.querySelector(".cme_ModalStyle-rootHover");
      if (bg) {
        bg.onclick = (e) => {
          if (e.target === bg) this.hideModal();
        };
      }

      // סגירה במקש Escape
      this.escapeHandler = (e) => {
        if (e.key === "Escape") this.hideModal();
      };
      document.addEventListener("keydown", this.escapeHandler);
    },

    // סגירת המודאל
    hideModal() {
      if (this.modalElement) {
        this.modalElement.style.display = "none";
        this.modalElement.innerHTML = "";
      }
      if (this.escapeHandler) {
        document.removeEventListener("keydown", this.escapeHandler);
        this.escapeHandler = null;
      }
    },
  };

  window.TankiQoL.ImportExportLegacy = ImportExport;
})();
