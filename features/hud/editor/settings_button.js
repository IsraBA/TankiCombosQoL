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
    MARK,

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

    // מבחוץ (ההודעה על הגרסה): ההגדרות בניווט של המשחק, ואז העורך
    async goTo() {
      const Q = window.TankiQoL;
      const r = await Q.HudBridge.openControls();
      if (!r.ok) {
        console.warn("[TankiQoL] could not open Settings > Controls: " + r.error);
        return false;
      }
      // יצאנו מכרטיסיית הקומבואים; כפתור החזרה של המשחק יחזיר אליה
      if (Q.AutoNavigator) Q.AutoNavigator.openOnNextGarage();
      // הכרטיסייה נבנית אחרי הניווט; הכפתור שלנו בשורה שלה הוא הסימן
      const until = Date.now() + 5000;
      while (!this.inject()) {
        if (Date.now() > until) return false;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      Q.HudEditor.open();
      return true;
    },
  };
})();
