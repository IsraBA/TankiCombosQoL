// features/combos/view/lobby/auto_navigator.js

// הלוגיקה לניווט אוטומטי לכרטיסיית הקומבואים בכניסה למוסך
(function () {
  "use strict";

  const DOM = window.TankiQoL.DOM;
  const NavigationHelpers = window.TankiQoL.NavigationHelpers;
  window.TankiQoL = window.TankiQoL || {};

  window.TankiQoL.AutoNavigator = {
    observer: null,
    observing: false,
    autoNavigateTriggered: false, // האם כבר ביצענו ניווט אוטומטי מאז ש-GARAGE_WRAPPER הופיע
    pendingOpen: false, // בקשה חד-פעמית, גם כשההגדרה כבויה

    // מי שלוקח את המשתמש מהכרטיסייה מבקש אותה בחזרה (עורך ה-HUD)
    openOnNextGarage() {
      this.pendingOpen = true;
    },

    // ברירת המחדל היא כן; רק כיבוי מפורש מבטל
    autoOpenWanted() {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get(["autoOpenCombosOnGarageEntry"], (r) => {
            resolve(!r || r.autoOpenCombosOnGarageEntry !== false);
          });
        } catch (e) {
          resolve(false);
        }
      });
    },

    // ניווט אוטומטי לכרטיסיית הקומבואים - בדיוק כמו בלחיצה על הכפתור בלובי
    async navigateToCombos() {
      const once = this.pendingOpen;
      if (!once && !(await this.autoOpenWanted())) {
        // המשתמש כיבה את האפשרות; ננסה שוב בכניסה הבאה
        this.autoNavigateTriggered = false;
        return;
      }

      // במסך של פריט התפריט כבר קיים; בלובי המוסך לוחצים על התותחים
      let menuContainer = document.querySelector(DOM.MENU_CONTAINER);
      if (!menuContainer) {
        // רק מה שעל המסך עכשיו: לחיצה שממתינה חוזרת אחרי שיצאנו
        const turretsBlock = document.querySelector(DOM.LOBBY_TURRETS_BLOCK);
        if (!turretsBlock) {
          this.autoNavigateTriggered = false;
          return;
        }
        turretsBlock.click();
        menuContainer = await NavigationHelpers.waitForElement(
          DOM.MENU_CONTAINER,
        );
      }

      if (!menuContainer) {
        console.error("[ComboManager] Menu container not found");
        this.autoNavigateTriggered = false;
        return;
      }

      // רק עכשיו הבקשה מומשה
      this.pendingOpen = false;
      await NavigationHelpers.navigateToCombosTab(menuContainer);
    },

    // בדיקה וטיפול בכניסה למוסך - נקרא מה-MutationObserver
    checkAndNavigate() {
      const garageWrapper = document.querySelector(DOM.GARAGE_WRAPPER);

      // אם GARAGE_WRAPPER קיים ולא ביצענו את הניווט עדיין
      if (garageWrapper && !this.autoNavigateTriggered) {
        // סימון שאנחנו בתהליך ניווט - למנוע ניווט כפול
        this.autoNavigateTriggered = true;

        // נווט לכרטיסיית הקומבואים (בדיוק כמו בלחיצה על הכפתור בלובי)
        this.navigateToCombos();
      }

      // אם GARAGE_WRAPPER נעלם (יצאנו מהמוסך), נאפס את הדגל
      if (!garageWrapper && this.autoNavigateTriggered) {
        this.autoNavigateTriggered = false;
      }
    },

    // התחלת ה-MutationObserver - נקרא מ-runInitLogic
    start() {
      // אם ה-observer כבר רץ, לא צריך להתחיל אותו שוב
      if (this.observing) return;

      // בדיקה ראשונית
      this.checkAndNavigate();

      // יצירת MutationObserver שצופה בשינויים ב-DOM
      this.observer = new MutationObserver(() => {
        this.checkAndNavigate();
      });

      // התחלת הצפייה ב-document.body עם כל השינויים
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      this.observing = true;
    },

    // עצירת ה-MutationObserver - נקרא כשיוצאים מהמסך הרלוונטי
    stop() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.observing = false;
      this.autoNavigateTriggered = false;
      // יצאנו לקרב; בקשה שלא מומשה כבר לא רלוונטית
      this.pendingOpen = false;
    },
  };
})();
