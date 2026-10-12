// shared/icons.js

// אייקונים שיותר מפיצ'ר אחד מצייר. מכוילים לאייקוני המשחק.

(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  // שני תת-מסלולים שנוגעים בנקודה אחת, עם חלל משולש ביניהם —
  // בדיוק כמו הנגיסה בזרוע של אייקון ה-X של המשחק.
  const CHECK_PATH =
    "M3 11.96L8.46 17.41L11.5 20.45L9.05 24L0 14.96Z" +
    "M8.46 17.41L13.61 17.41L24 2.41L20.51 0Z";

  // party-horn מ-SVG Repo, כפי שהוא; רק הצבע הוחלף ב-currentColor
  const PARTY_PATH =
    "M5.5713 14.5L9.46583 18.4141M18.9996 3.60975C17.4044 3.59505 16.6658 4.33233 " +
    "16.4236 5.07743C16.2103 5.73354 16.4052 7.07735 15.896 8.0727C15.4091 9.02443 " +
    "14.1204 9.5617 12.6571 9.60697M20 7.6104L20.01 7.61049M19 15.96L19.01 " +
    "15.9601M7.00001 3.94926L7.01001 3.94936M19 11.1094C17.5 11.1094 16.5 11.6094 " +
    "15.5949 12.5447M10.2377 7.18796C11 6.10991 11.5 5.10991 11.0082 3.52734M3.53577 " +
    "20.4645L7.0713 9.85791L14.1424 16.929L3.53577 20.4645Z";

  // מצוירים ולא נטענים: קבצי ה-SVG של המשחק נושאים hash שמתחלף בכל בילד
  function stroked(paths, className, extra) {
    return (
      '<svg class="' + (className || "") + '" viewBox="0 0 24 24" fill="none"' +
      ' stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
      ' stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' +
      paths.map((d) => '<path d="' + d + '"' + (extra || "") + "/>").join("") +
      "</svg>"
    );
  }

  window.TankiQoL.Icons = {
    CHECK_PATH,

    // חץ ביטול פעולה
    undo(className) {
      return stroked(["M4 9H14A5 5 0 0 1 14 19H9", "M8 5L4 9L8 13"], className);
    },

    // איקס, כמו כפתור האיפוס בעורך של המובייל
    close(className) {
      return stroked(["M6 6L18 18", "M18 6L6 18"], className);
    },

    // קווי מתאר ולא מלא, ו-currentColor כדי לרשת את צבע הכותרת
    party(className) {
      return (
        '<svg class="' + (className || "") + '" viewBox="0 0 24 24"' +
        ' fill="none" stroke="currentColor" stroke-width="2"' +
        ' stroke-linecap="round" stroke-linejoin="round"' +
        ' xmlns="http://www.w3.org/2000/svg"><path d="' + PARTY_PATH +
        '"/></svg>'
      );
    },

    // הקורא מביא את המחלקות; המידות והצורה זהות בכל מקום
    check(className) {
      return (
        '<svg class="' + (className || "") + '" width="24" height="24"' +
        ' viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path fill-rule="evenodd" clip-rule="evenodd" d="' + CHECK_PATH +
        '" fill="white"></path></svg>'
      );
    },
  };
})();
