// features/combos/lib/constants.js

// כל הסלקטורים של ה-DOM של המשחק, במקום אחד.
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  window.TankiQoL.DOM = {
    NOT_IN_GAME_CONTAINER: ".-container",
    APP_ROOT: "#app-root",

    // --- מסך ההגדרות (עורך ה-HUD) ---
    SETTINGS_SCREEN: ".SettingsComponentStyle-blockContentOptions",
    SETTINGS_ROW_BLOCK: ".SettingsComponentStyle-rowBlock",
    SETTINGS_DROPDOWN_TITLE: ".SettingsComponentStyle-dropDownTitle",
    // שמות מחלקה לכפתור החזרה של עורך ה-HUD
    BACK_BUTTON_CLASS: "BreadcrumbsComponentStyle-backButton",
    BACK_ARROW_CLASS: "IconStyle-iconBackArrow",

    // --- ה-HUD של הקרב ב-HTML (שמות מחלקה; העותק לובש cme_) ---
    HUD: {
      container: "BattleHudComponentStyle-hudContainer",
      buttonsContainer: "BattleHudComponentStyle-buttonsContainer",
      buttonsRow: "-flexEndAlignStart",
      fullScreenButton: "BattleHudComponentStyle-fullScreenButton",
      pauseButton: "BattleHudComponentStyle-pauseButton",
      tabButton: "BattleHudComponentStyle-tabButton",
      fps: "BattleHudFpsComponentStyle-container",
      fpsRow: "BattleHudFpsComponentStyle-row",
      fpsLabel: "BattleHudFpsComponentStyle-label",
      fpsValue: "BattleHudFpsComponentStyle-value",
      chatInput: "BattleChatComponentStyle-rootDesktop",
      userPanel: "UserInfoContainerStyle-blockLeftPanel",
      rankIcon: "UserInfoContainerStyle-rankIconContainer",
      rankIconClickable: "UserInfoContainerStyle-rankIconContainerClickable",
      rightBorder: "UserInfoContainerStyle-containerRightBorder",
      rankImage: "UserInfoContainerStyle-titleRankIcon",
      progress: "UserInfoContainerStyle-containerProgressMainScreen",
      name: "UserInfoContainerStyle-userNameRank",
      textShadow: "UserInfoContainerStyle-textDecoration",
      xpRow: "UserInfoContainerStyle-containerParameterProgress",
      xpIcon: "UserInfoContainerStyle-xpIcon",
      xpValue: "UserInfoContainerStyle-progressValue",
    },

    // --- ניווט ראשי ---
    GARAGE_MENU_CONTAINER: ".GarageMenuComponentStyle-garageMenuContainer",
    MENU_CONTAINER:
      ".GarageMenuComponentStyle-garageMenuContainer .MenuComponentStyle-battleTitleCommunity > div",

    TAB_ITEM_CLASS: "MenuComponentStyle-mainMenuItem",
    ACTIVE_TAB_CLASS: "-activeMenu",
    ACTIVE_UNDERLINE_CLASS: "-menuItemActive",

    // כפתורי ניווט Q ו-E
    QE_BUTTONS_CONTAINER: ".MenuComponentStyle-blockButtonsQECommunity",
    QE_BUTTON_CLASS: "-buttonQE",

    // --- הסתרה ---
    GARAGE_WRAPPER: ".GarageCommonStyle-garageContainer",
    TANK_PREVIEW_CANVAS: "#tankPreviewCanvas",
    // מארחי תצוגת הטנק (אחד לכל סוג טאב).
    // **אסור display:none** — ראה view/tank_preview.js.
    PREVIEW_HOSTS: `
            .GarageCommonStyle-positionContent,
            .PaintsCollectionComponentStyle-containerPaints
        `,

    // התצוגה עצמה, בתוך המארח
    TANK_PREVIEW: "#tankPreviewContainer, .GarageComponentStyle-tankPreview",

    // מוסתר בזמן שהכרטיסייה פתוחה — רק מה שמחוץ למארחי התצוגה
    ELEMENTS_TO_HIDE: `
            .GarageSuppliesPreviewComponentStyle-view,
            .GarageCommonStyle-positionContentAlteration,
            .TanksPartComponentStyle-amountItems,
            .GarageGrenadePreviewComponentStyle-view
        `,

    // --- זיהוי פריטים (תותח/גוף וכו') ---
    // הטקסט שמכיל את שם הפריט (למשל Hammer Mk5-0)
    ITEM_NAME_TEXT: ".ItemDescriptionComponentStyle-nameItem span",

    // הכפתור שמראה שפריט מצויד (Equipped) במסך ראשי
    ITEM_IS_EQUIPPED_BTN: ".-buttonEstablished",

    // תמונה של פריט ברשימה
    ITEM_LIST_IMAGE: ".GarageItemComponentStyle-mainImg",

    // קונטיינר של פריט ברשימה
    ITEM_LIST_CONTAINER: ".garage-item",

    // קונטיינר תמונה ברשימה (להגנה)
    ITEM_PREVIEW_CONTAINER: ".GarageItemComponentStyle-itemPreview",

    // תיאור פריט ברשימה (לשם הפריט)
    ITEM_DESCRIPTION_DEVICE: ".GarageItemComponentStyle-descriptionDevice",

    // --- כפתורי פעולה ---
    // כפתור Equip/Upgrade (הכפתור הראשי עם Enter hotkey)
    EQUIP_BUTTON: ".SquarePriceButtonComponentStyle-commonBlockButton",

    // --- זיהוי אוגמנטים (Sub Items) ---
    // הכפתור שפותח את חלון האוגמנטים (נמצא במסך התותח)
    OPEN_AUGMENTS_BTN: ".DeviceButtonComponentStyle-deviceIcon",

    // כפתור חזרה (Back Arrow) - כדי לצאת ממסך האוגמנטים או ממסך הכרטיסיות ללובי
    BACK_BUTTON: ".BreadcrumbsComponentStyle-backButton",

    // כפתור סגירה של המוסך
    EXIT_GARAGE_BUTTON: ".BreadcrumbsComponentStyle-exitGameButton",

    // זיהוי שפה - הטקסט בראש המוסך
    GARAGE_ROOT_TITLE: ".BreadcrumbsComponentStyle-rootTitle span",

    // בתוך גריד האוגמנטים:
    AUGMENT_CELL: ".SkinsAndAlterationsStyle-SkinsVerticalComponent > div", // התא שעוטף כל אוגמנט (ילד ישיר של רשימת האוגמנטים)
    AUGMENT_NAME: ".SkinCellStyle-nameDevices", // שם האוגמנט
    AUGMENT_EQUIPPED_ICON: ".SkinCellStyle-mountIcon", // האייקון שמופיע רק על מה שמצויד
    AUGMENT_IMAGE: "img", // תמונה של אוגמנט (בתוך התא)
    AUGMENT_DISCOUNT_CELL: ".SkinCellStyle-discountCell", // תא המחיר - אם ריק, האוגמנט נרכש

    // זיהוי מסך augments/skins/Shot color (להסתרת טאב קומבואים):
    AUGMENTS_SKINS_INDICATOR: ".-flexSpaceBetweenAlignStartColumn", // התפריט הצדדי שמאפיין את מסך augments/skins/Shot color

    // זיהוי מסך משימות (Missions) (להסתרת טאב קומבואים):
    MISSIONS_INDICATOR: ".QuestsComponentStyle-content", // הקונטיינר שמאפיין את מסך המשימות

    // זיהוי מסך קלאן (Clan) (להסתרת טאב קומבואים):
    CLAN_INDICATOR:
      ".ClanCommonStyle-center, .ClanCommonStyle-content, .ClanInfoComponentStyle-containerParametersClan, .FriendListComponentStyle-containerMembers", // הקונטיינר שמאפיין את מסך הקלאן (כולל טאב Members)

    // זיהוי מסך חברים (Friends) (להסתרת טאב קומבואים):
    FRIENDS_INDICATOR: ".FriendListComponentStyle-containerFriends", // הקונטיינר שמאפיין את מסך החברים

    // זיהוי מסך יצירת באטל (Battle creation) (להסתרת טאב קומבואים):
    BATTLE_CREATION_INDICATOR: ".BattleCreateComponentStyle-mainContainer", // הקונטיינר שמאפיין את מסך יצירת באטל

    // --- זיהוי הגנה (Protection) ---
    PROTECTION_MOUNTED_RESIST:
      ".GarageProtectionsComponentStyle-mountedResist, .GarageProtectionsComponentStyle-mountedResistActive", // הגנה מצוידת (4 כאלה - כולל active)
    PROTECTION_RESISTANCE_ICON:
      ".CellResistanceComponentStyle-resistanceIconContainer img", // אייקון תותח בהגנה מצוידת
    PROTECTION_LIST_RESISTANCE_ICON:
      ".GarageItemComponentStyle-itemResistanceIcon", // אייקון תותח ברשימה

    // --- זיהוי צבעים (Paints) ---
    PAINT_NAME: ".PaintsCollectionComponentStyle-headlinePaint h1", // שם הצבע (White)

    // --- כפתור בלובי ---
    LOBBY_TURRETS_BLOCK: ".-commonBlockForTurretsWeapon", // הדיב של התותחים בלובי
    LOBBY_CONTAINER: ".MountedItemsStyle-containerBlockGarage", // הקונטיינר של כל הבלוקים
    LOBBY_ITEM_PREVIEW: ".MountedItemsStyle-itemPreview", // תמונות הפריטים בלובי

    // --- מסך הלובי הראשי ---
    MAIN_SCREEN_CONTAINER: ".MainScreenComponentStyle-containerPanel", // הקונטיינר של המסך הראשי
    GARAGE_BUTTON:
      ".PrimaryMenuItemComponentStyle-menuItemContainer .PrimaryMenuItemComponentStyle-itemLiGarage", // כפתור המוסך במסך הראשי
    MENU_ITEM_CONTAINER: ".PrimaryMenuItemComponentStyle-menuItemContainer", // קונטיינר של פריט בתפריט הראשי

    // --- רנדומייזר: זיהוי רמת נדירות אוגמנטים ---
    AUGMENT_CATEGORY_LEGENDARY:
      "SkinCellComponentStyle-gradientCategoryDevices-LEGENDARY",

    // --- יועץ ההגנות ---
    PROTECTION_COLUMN:
      ".GarageProtectionsComponentStyle-blockParametersProtection", // העמודה שהפאנל מוזרק אליה
    PROTECTION_EQUIP_BLOCK:
      ".GarageProtectionsComponentStyle-containerEquipmentCannon", // בלוק ההגנות המורכבות של המשחק
    // שמות מחלקה (לא סלקטורים) שחריצי ההמלצה והכפתור לובשים
    PROTECTION_SLOT_CLASSES:
      "GarageProtectionsComponentStyle-equipmentResistance GarageProtectionsComponentStyle-mountedResist",
    PROTECTION_UNEQUIP_ROW_CLASS: "GarageProtectionsComponentStyle-unequip",
  };
})();
