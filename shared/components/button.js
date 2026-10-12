// shared/components/button.js

// כפתור בסגנון כפתורי ההגדרות של המשחק. וריאנטים: primary / secondary / danger / white
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  window.TankiQoL.Button = {
    // options: { text, variant, id, className, iconHtml, title, onClick }
    create(options = {}) {
      const btn = document.createElement("div");
      btn.className = "cme_button cme_button--" + (options.variant || "primary");
      if (options.id) btn.id = options.id;
      if (options.className) btn.className += " " + options.className;
      if (options.title) btn.title = options.title;

      if (options.iconHtml) {
        const icon = document.createElement("span");
        icon.className = "cme_button-icon";
        icon.innerHTML = options.iconHtml;
        btn.appendChild(icon);
      }

      const text = document.createElement("span");
      text.className = "cme_button-text";
      text.textContent = options.text || "";
      if (!options.text) text.style.display = "none";
      btn.appendChild(text);

      if (options.onClick) {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (btn.classList.contains("cme_button--disabled")) return;
          options.onClick(e);
        });
      }

      // API לעדכון מבחוץ
      btn._setText = (t) => {
        text.textContent = t;
        text.style.display = t ? "" : "none";
      };
      btn._setDisabled = (d) => btn.classList.toggle("cme_button--disabled", !!d);

      return btn;
    },
  };
})();
