// features/combos/dom/navigation_helpers.js

// פונקציות עזר משותפות לניווט לכרטיסיית הקומבואים
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  window.TankiQoL.NavigationHelpers = {
    // המתנה לאלמנט שיופיע ב-DOM עם MutationObserver
    waitForElement(selector, timeout = 10000) {
      return new Promise((resolve) => {
        // בדיקה ראשונית - אולי האלמנט כבר קיים
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        // אם לא קיים, נחכה עם MutationObserver
        const observer = new MutationObserver((mutations, obs) => {
          const foundElement = document.querySelector(selector);
          if (foundElement) {
            obs.disconnect();
            clearTimeout(timeoutId);
            resolve(foundElement);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        // timeout למקרה שהאלמנט לא יופיע
        const timeoutId = setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    },

    // המתנה לאלמנט ולחיצה עליו
    async waitForElementAndClick(selector, timeout = 10000) {
      const element = await this.waitForElement(selector, timeout);
      if (element) {
        element.click();
        return element;
      }
      return null;
    },

    // המתנה ש-MenuInjector יהיה מוכן עם הכרטיסייה
    waitForComboTab(timeout = 10000) {
      return new Promise((resolve) => {
        // בדיקה ראשונית
        const MenuInjector = window.TankiQoL?.MenuInjector;
        if (
          MenuInjector &&
          MenuInjector.comboTab &&
          MenuInjector.comboTabUnderline
        ) {
          resolve(true);
          return;
        }

        // אם לא מוכן, נחכה עם MutationObserver
        const observer = new MutationObserver((mutations, obs) => {
          const updatedMenuInjector = window.TankiQoL?.MenuInjector;
          if (
            updatedMenuInjector &&
            updatedMenuInjector.comboTab &&
            updatedMenuInjector.comboTabUnderline
          ) {
            obs.disconnect();
            clearTimeout(timeoutId);
            resolve(true);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        // timeout
        const timeoutId = setTimeout(() => {
          observer.disconnect();
          resolve(false);
        }, timeout);
      });
    },

    // המתנה ש-ViewRenderer יהיה מוכן עם האלמנט שלו
    waitForViewRenderer(timeout = 10000) {
      return new Promise((resolve) => {
        // בדיקה ראשונית - האם ViewRenderer קיים ויש לו viewElement
        const ViewRenderer = window.TankiQoL?.ViewRenderer;
        if (ViewRenderer && ViewRenderer.viewElement) {
          // בדיקה שהאלמנט קיים ב-DOM
          if (document.contains(ViewRenderer.viewElement)) {
            resolve(true);
            return;
          }
        }

        // אם לא מוכן, נחכה עם MutationObserver
        const observer = new MutationObserver((mutations, obs) => {
          const updatedViewRenderer = window.TankiQoL?.ViewRenderer;
          if (updatedViewRenderer && updatedViewRenderer.viewElement) {
            // בדיקה שהאלמנט קיים ב-DOM
            if (document.contains(updatedViewRenderer.viewElement)) {
              obs.disconnect();
              clearTimeout(timeoutId);
              resolve(true);
            }
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        // timeout
        const timeoutId = setTimeout(() => {
          observer.disconnect();
          resolve(false);
        }, timeout);
      });
    },

    // המתנה לשינויי DOM שיירגעו בקונטיינר מסוים (debounce)
    // חשוב: לקרוא לפונקציה *לפני* הפעולה שגורמת לשינוי (למשל click)
    // כך ה-observer מוכן לתפוס את המוטציה הראשונה
    waitForDOMChange(containerSelector, debounceMs = 70, timeout = 5000) {
      return new Promise((resolve) => {
        // אם ניתן selector אבל האלמנט לא נמצא, נעשה fallback ל-document.body
        // כדי שעדיין נתפוס שינויי DOM (במקום לסיים מיד בלי המתנה)
        const container = containerSelector
          ? document.querySelector(containerSelector) || document.body
          : document.body;

        let debounceTimer;

        const observer = new MutationObserver(() => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            observer.disconnect();
            clearTimeout(timeoutId);
            resolve();
          }, debounceMs);
        });

        observer.observe(container, {
          childList: true,
          subtree: true,
        });

        // timeout למקרה שלא מגיעות מוטציות כלל
        const timeoutId = setTimeout(() => {
          clearTimeout(debounceTimer);
          observer.disconnect();
          resolve();
        }, timeout);
      });
    },

    // פונקציה משותפת לניווט לכרטיסיית הקומבואים
    // מניחה שכבר יש menuContainer (כי זה נקרא אחרי שכבר לחצנו על תותחים)
    async navigateToCombosTab(menuContainer) {
      // כבר שם: שני ניווטים שנפגשו. מעבר נוסף דרך Paints מהבהב
      const DOM = window.TankiQoL.DOM;
      const open = window.TankiQoL?.MenuInjector?.comboTab;
      if (open && open.classList.contains(DOM.ACTIVE_TAB_CLASS)) return true;

      // המתנה ש-MenuInjector יהיה מוכן עם הכרטיסייה
      const comboTabReady = await this.waitForComboTab();
      if (!comboTabReady) {
        console.error("[ComboManager] Combo tab not ready");
        return false;
      }

      // וידוא ש-ViewRenderer מוכן - אם לא, נאתחל אותו
      const ViewRenderer = window.TankiQoL?.ViewRenderer;
      if (ViewRenderer) {
        // אם האלמנט עדיין לא קיים, נאתחל אותו
        if (!ViewRenderer.viewElement) {
          await ViewRenderer.init();
        }
      }

      // המתנה ש-ViewRenderer יהיה מוכן עם האלמנט שלו
      const viewRendererReady = await this.waitForViewRenderer();
      if (!viewRendererReady) {
        console.error("[ComboManager] ViewRenderer not ready");
        return false;
      }

      // המתנה ש-#combos-grid-container יהיה קיים (כדי לוודא שה-HTML נטען)
      const combosContainer = await this.waitForElement(
        "#combos-grid-container",
      );
      if (!combosContainer) {
        console.error("[ComboManager] Combos container not found");
        return false;
      }

      // ניווט לכרטיסיית הקומבואים
      const MenuInjector = window.TankiQoL?.MenuInjector;
      if (
        MenuInjector &&
        MenuInjector.comboTab &&
        MenuInjector.comboTabUnderline
      ) {
        // שימוש ב-safeActivateComboTab במקום activateComboTab ישירות
        // זה מבטיח שעוברים דרך Paints קודם, מה שנותן זמן לטנק להיטען
        await MenuInjector.safeActivateComboTab(
          MenuInjector.comboTab,
          menuContainer,
          MenuInjector.comboTabUnderline,
        );
        return true;
      }
      return false;
    },
  };
})();
