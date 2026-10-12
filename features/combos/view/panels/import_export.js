// features/combos/view/panels/import_export.js

// ייבוא וייצוא קומבואים; הדיאלוגים על הדיאלוג המשותף
(function () {
  "use strict";
  window.TankiQoL = window.TankiQoL || {};

  function currentLang() {
    const LM = window.TankiQoL.LanguageManager;
    return LM ? LM.getCurrentLanguageCode() : "en";
  }

  const ImportExport = {
    dialog: null,

    // נשמר לתאימות: הדיאלוג נבנה בכל הצגה
    init() {},

    // ייצוא — הורדת קובץ JSON של כל הקומבואים בשפה הנוכחית
    exportCombos() {
      const lang = currentLang();
      chrome.storage.local.get(["savedCombos"], (result) => {
        const filtered = (result.savedCombos || []).filter(
          (c) => (c.language || "en") === lang,
        );
        if (filtered.length === 0) return;

        const blob = new Blob([JSON.stringify(filtered, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const today = new Date().toISOString().split("T")[0];

        const a = document.createElement("a");
        a.href = url;
        a.download = `tanki-combos-${today}.json`;
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
        reader.onload = (event) => this.processImportedFile(event.target.result);
        reader.readAsText(file);
        document.body.removeChild(input);
      };

      document.body.appendChild(input);
      input.click();
    },

    // עיבוד הקובץ המיובא — ולידציה ושמירה
    processImportedFile(content) {
      const LM = window.TankiQoL.LanguageManager;
      let imported;
      try {
        imported = JSON.parse(content);
      } catch {
        this.showErrorModal(LM.getUIText("importInvalidFile"));
        return;
      }

      const valid =
        Array.isArray(imported) &&
        imported.length > 0 &&
        imported.every((c) => c && c.data && typeof c.data === "object");
      if (!valid) {
        this.showErrorModal(LM.getUIText("importInvalidFile"));
        return;
      }

      const lang = currentLang();
      if (!imported.every((c) => (c.language || "en") === lang)) {
        this.showErrorModal(LM.getUIText("importWrongLanguage"));
        return;
      }

      // יש קומבואים קיימים בשפה הזאת -> השחקן בוחר: הוספה או החלפה
      chrome.storage.local.get(["savedCombos"], (result) => {
        const existing = (result.savedCombos || []).filter(
          (c) => (c.language || "en") === lang,
        );
        if (existing.length === 0) this.performImport(imported, "replace");
        else this.showImportChoiceModal(imported);
      });
    },

    // ביצוע הייבוא בפועל
    performImport(imported, mode) {
      const lang = currentLang();
      chrome.storage.local.get(["savedCombos"], (result) => {
        let combos = result.savedCombos || [];
        if (mode === "replace") {
          combos = combos.filter((c) => (c.language || "en") !== lang);
        }
        const maxOrder =
          combos.length > 0 ? Math.max(...combos.map((c) => c.order || 0)) + 1 : 0;

        imported.forEach((combo, i) => {
          combo.id = Date.now() + i;
          combo.order = mode === "add" ? maxOrder + i : i;
        });

        chrome.storage.local.set({ savedCombos: combos.concat(imported) }, () => {
          if (window.TankiQoL.ViewRenderer) {
            window.TankiQoL.ViewRenderer.loadAndRenderCombos();
          }
        });
      });
    },

    // מודאל בחירה — הוספה או החלפה
    showImportChoiceModal(imported) {
      const LM = window.TankiQoL.LanguageManager;
      this.openDialog({
        title: LM.getUIText("importTitle"),
        body: LM.getUIText("importChooseAction"),
        buttons: [
          {
            text: LM.getUIText("importReplace"),
            variant: "secondary",
            action: "replace",
            onClick: () => this.performImport(imported, "replace"),
          },
          {
            text: LM.getUIText("importAdd"),
            variant: "primary",
            action: "add",
            onClick: () => this.performImport(imported, "add"),
          },
        ],
      });
    },

    // מודאל שגיאה
    showErrorModal(message) {
      const LM = window.TankiQoL.LanguageManager;
      this.openDialog({
        title: LM.getUIText("importErrorTitle"),
        body: message,
        buttons: [{ text: "OK", variant: "primary", action: "close" }],
      });
    },

    openDialog(spec) {
      const Dialog = window.TankiQoL.Dialog;
      if (!Dialog) return;
      this.hideModal();
      this.dialog = Dialog.open(
        Object.assign({ id: "cme_import-modal-root", variant: "danger" }, spec, {
          onClose: () => {
            this.dialog = null;
          },
        }),
      );
    },

    // סגירת המודאל
    hideModal() {
      if (this.dialog) this.dialog.close();
      this.dialog = null;
    },
  };

  window.TankiQoL.ImportExport = ImportExport;
})();
