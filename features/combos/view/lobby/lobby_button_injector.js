// features/combos/view/lobby/lobby_button_injector.js

// הלוגיקה שמוסיפה כפתור בלובי של המוסך שלחיצה עליו מובילה ישירות לקומבואים
(function () {
  "use strict";

  const DOM = window.TankiQoL.DOM;
  const NavigationHelpers = window.TankiQoL.NavigationHelpers;
  window.TankiQoL = window.TankiQoL || {};

  window.TankiQoL.LobbyButtonInjector = {
    injected: false,
    lobbyButton: null,

    // בדיקה אם אנחנו בלובי של המוסך
    isOnLobbyScreen() {
      // בלובי יש את הדיב של התותחים
      return !!document.querySelector(DOM.LOBBY_TURRETS_BLOCK);
    },

    // הזרקת הכפתור בלובי
    inject() {
      // בדיקה אם אנחנו בלובי
      if (!this.isOnLobbyScreen()) {
        this.injected = false;
        return;
      }

      // מציאת הקונטיינר
      const container = document.querySelector(DOM.LOBBY_CONTAINER);
      if (!container) return;

      // בדיקה אם הכפתור כבר קיים
      const existingButton = container.querySelector(".cme_lobby-combo-button");
      if (existingButton) {
        this.injected = true;
        this.lobbyButton = existingButton;
        this.refreshBadge();
        return;
      }

      // מציאת כל התמונות עם הקלאס MountedItemsStyle-itemPreview (4 תמונות: drone, grenade, turret, hull)
      const allPreviews = container.querySelectorAll(
        `${DOM.LOBBY_ITEM_PREVIEW}`,
      );
      const imageData = [];

      // סדר התמונות: drone (0), grenade (1), turret (2), hull (3)
      // אנחנו רוצים רק: drone, turret, hull (מדלגים על grenade)
      const wantedIndices = [0, 2, 3]; // drone, turret, hull
      const itemTypes = ["drone", "turret", "hull"];

      wantedIndices.forEach((wantedIndex, typeIndex) => {
        const preview = allPreviews[wantedIndex];
        if (preview && preview.src) {
          imageData.push({
            src: preview.src,
            type: itemTypes[typeIndex],
          });
        }
      });

      // יצירת הכפתור
      const button = document.createElement("div");
      button.className = "cme_lobby-combo-button";

      // יצירת קונטיינר אופקי לכותרת ותמונות
      const horizontalContainer = document.createElement("div");
      horizontalContainer.className = "cme_lobby-combo-horizontal-container";

      // יצירת כותרת
      const titleContainer = document.createElement("div");
      titleContainer.className = "cme_MountedItemsStyle-tankPartNameContainer";

      const LanguageManager = window.TankiQoL?.LanguageManager;
      const title = document.createElement("h1");
      title.textContent = LanguageManager
        ? LanguageManager.getUIText("combosTab")
        : "COMBOS";
      titleContainer.appendChild(title);
      horizontalContainer.appendChild(titleContainer);

      // יצירת קונטיינר לתמונות
      const imagesContainer = document.createElement("div");
      imagesContainer.className = "cme_lobby-combo-images-container";

      // הוספת התמונות (תמיד 4) עם קלאסים לפי סוג
      imageData.forEach((imgData) => {
        const imgWrapper = document.createElement("div");
        imgWrapper.className = `cme_lobby-combo-image-wrapper cme_lobby-combo-image-wrapper-${imgData.type}`;

        const smallImg = document.createElement("img");
        smallImg.src = imgData.src;
        smallImg.className = `cme_lobby-combo-image cme_lobby-combo-image-${imgData.type}`;
        imgWrapper.appendChild(smallImg);
        imagesContainer.appendChild(imgWrapper);
      });

      horizontalContainer.appendChild(imagesContainer);
      button.appendChild(horizontalContainer);

      // טיפול בלחיצה
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await this.navigateToCombos();
      });

      // הוספת הכפתור בסוף הקונטיינר (הכי למטה)
      container.appendChild(button);

      this.lobbyButton = button;
      this.injected = true;
      this.refreshBadge();
    },

    // הבאדג' תלוי בדגל של "מה חדש"; נקרא גם כשהמודל נסגר.
    // פריט flex ולא absolute: ההורה של המשחק חותך חריגות.
    // בסוף שורת התמונות ולא בשורה החיצונית — שם space-between היה
    // גורר את התמונות למרכז.
    refreshBadge() {
      const button = this.lobbyButton;
      if (!button) return;
      const row = button.querySelector(".cme_lobby-combo-images-container");
      if (!row) return;
      const news = window.TankiQoL.WhatsNewModal;
      const want = !!(news && news.isUnseen());
      const existing = row.querySelector(".cme_new-badge");
      if (want && !existing) {
        const badge = document.createElement("div");
        badge.className = "cme_new-badge";
        row.appendChild(badge);
      } else if (!want && existing) {
        existing.remove();
      }
    },

    // ניווט לקומבואים דרך תותחים
    async navigateToCombos() {
      // הניווט הזה שלנו; בלי זה גם האוטומטי יוצא לדרך (ראה combos.md)
      const AutoNavigator = window.TankiQoL?.AutoNavigator;
      if (AutoNavigator) AutoNavigator.autoNavigateTriggered = true;

      // עכשיו נלחץ על התותחים כדי לפתוח את תפריט המוסך
      const turretsBlock = await NavigationHelpers.waitForElementAndClick(
        DOM.LOBBY_TURRETS_BLOCK,
      );
      if (!turretsBlock) {
        console.error("[ComboManager] Turrets block not found");
        if (AutoNavigator) AutoNavigator.autoNavigateTriggered = false;
        return;
      }

      // המתנה לטעינת תפריט המוסך - עם MutationObserver
      const menuContainer = await NavigationHelpers.waitForElement(
        DOM.MENU_CONTAINER,
      );
      if (!menuContainer) {
        console.error("[ComboManager] Menu container not found");
        if (AutoNavigator) AutoNavigator.autoNavigateTriggered = false;
        return;
      }

      // ניווט לכרטיסיית הקומבואים (הפונקציה המשותפת)
      await NavigationHelpers.navigateToCombosTab(menuContainer);
    },

    // בדיקה אם הכפתור עדיין קיים
    checkAlive() {
      if (!this.lobbyButton) {
        this.injected = false;
        return;
      }

      // בדיקה אם הכפתור עדיין ב-DOM
      if (!document.contains(this.lobbyButton)) {
        this.injected = false;
        this.lobbyButton = null;
      }
    },

    // הסרת הכפתור
    remove() {
      if (this.lobbyButton && this.lobbyButton.parentNode) {
        this.lobbyButton.parentNode.removeChild(this.lobbyButton);
      }
      this.lobbyButton = null;
      this.injected = false;
    },
  };
})();
