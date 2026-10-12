// features/hud/editor/settings_button.js  [ISOLATED world]

// כפתור HUD EDITOR בשורת Input device של כרטיסיית Controls בהגדרות.
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const MARK = "cme_hud-editor-button";

  function t(key) {
    const LM = window.TankiQoL.LanguageManager;
    return LM ? LM.getUIText(key) : key;
  }

  // השורה עם הדרופדאון "Input device": rowBlock שמחזיק dropDownTitle
  function findRow() {
    const DOM = window.TankiQoL.DOM;
    if (!DOM) return null;
    for (const row of document.querySelectorAll(DOM.SETTINGS_ROW_BLOCK)) {
      if (row.querySelector(DOM.SETTINGS_DROPDOWN_TITLE)) return row;
    }
    return null;
  }

  window.TankiQoL.HudSettingsButton = {
    inject() {
      const row = findRow();
      if (!row) return false;
      if (row.querySelector("." + MARK)) return true;
      const Button = window.TankiQoL.Button;
      if (!Button) return false;

      const btn = Button.create({
        text: t("hudEditorButton"),
        variant: "primary",
        className: MARK,
        onClick() {
          const editor = window.TankiQoL.HudEditor;
          if (editor) editor.open();
        },
      });
      row.appendChild(btn);
      return true;
    },
  };
})();
