// features/combos/view/panels/delete_combo_modal.js

// אישור מחיקת קומבו, על הדיאלוג המשותף (shared/components/dialog.js)
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  window.TankiQoL.DeleteComboModal = {
    dialog: null,

    // נשמר לתאימות: הדיאלוג נבנה בכל הצגה
    init() {},

    show(comboId, comboName, onConfirm) {
      const LM = window.TankiQoL.LanguageManager;
      const Dialog = window.TankiQoL.Dialog;
      if (!Dialog) return;
      this.hide();

      this.dialog = Dialog.open({
        id: "cme_modal-root",
        variant: "danger",
        title: LM.getUIText("deleteComboModalTitle").replace("{comboName}", comboName),
        body: LM.getUIText("deleteConfirm"),
        buttons: [
          { text: LM.getUIText("cancel"), variant: "secondary", action: "cancel" },
          {
            text: LM.getUIText("delete"),
            variant: "primary",
            action: "delete",
            onClick() {
              if (typeof onConfirm === "function") onConfirm(comboId);
            },
          },
        ],
        onClose: () => {
          this.dialog = null;
        },
      });
    },

    hide() {
      if (this.dialog) this.dialog.close();
      this.dialog = null;
    },
  };
})();
