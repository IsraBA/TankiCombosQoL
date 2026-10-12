// shared/components/dialog.js

// דיאלוג בסגנון DialogContainerComponentStyle של המשחק. כל דרך סגירה עוברת ב-close().
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  // options: { id, variant: 'danger'|'warning', title, titleIconHtml,
  //            body (string|Node), bodyAlign: 'center'|'left',
  //            buttons: [{ text, variant, keepOpen, onClick }], onClose }
  function open(options = {}) {
    const Button = window.TankiQoL.Button;
    let closed = false;

    const root = document.createElement("div");
    root.className = "cme_dialog-root";
    if (options.id) root.id = options.id;

    const backdrop = document.createElement("div");
    backdrop.className = "cme_dialog-backdrop";
    root.appendChild(backdrop);

    const box = document.createElement("div");
    box.className = "cme_dialog cme_dialog--" + (options.variant || "danger");
    backdrop.appendChild(box);

    // ---- כותרת ----
    const header = document.createElement("div");
    header.className = "cme_dialog-header";
    const h1 = document.createElement("h1");
    if (options.titleIconHtml) h1.innerHTML = options.titleIconHtml;
    h1.appendChild(document.createTextNode(options.title || ""));
    header.appendChild(h1);
    const closeBtn = document.createElement("div");
    closeBtn.className = "cme_dialog-close";
    closeBtn.dataset.action = "close";
    header.appendChild(closeBtn);
    box.appendChild(header);

    // ---- תוכן ----
    const content = document.createElement("div");
    content.className = "cme_dialog-content";
    const body = document.createElement("div");
    body.className = "cme_dialog-body";
    if (options.bodyAlign === "left") body.classList.add("cme_dialog-body--left");
    if (options.body && typeof options.body === "object") {
      body.appendChild(options.body);
    } else {
      const span = document.createElement("span");
      // \n בטקסט = שורה חדשה
      String(options.body || "").split("\n").forEach((line, i) => {
        if (i) span.appendChild(document.createElement("br"));
        span.appendChild(document.createTextNode(line));
      });
      body.appendChild(span);
    }
    content.appendChild(body);
    box.appendChild(content);

    // ---- כפתורים ----
    const footer = document.createElement("div");
    footer.className = "cme_dialog-footer";
    (options.buttons || []).forEach((b) => {
      const btn = Button.create({
        text: b.text,
        variant: b.variant || "primary",
        className: "cme_dialog-button",
        onClick() {
          if (b.onClick) b.onClick(handle);
          if (!b.keepOpen) close();
        },
      });
      if (b.action) btn.dataset.action = b.action;
      footer.appendChild(btn);
    });
    box.appendChild(footer);

    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKey);
      root.remove();
      if (options.onClose) options.onClose();
    }

    function onKey(e) {
      if (e.key === "Escape") close();
    }

    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    document.addEventListener("keydown", onKey);

    document.body.appendChild(root);

    const handle = { root, box, close, isOpen: () => !closed };
    return handle;
  }

  window.TankiQoL.Dialog = { open };
})();
