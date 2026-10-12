// features/hud/editor/topbar.js  [ISOLATED world]

// הסרגל העליון של העורך: חזרה, undo, איפוס, סליידרים וכותרת
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const Q = window.TankiQoL;

  function div(cls, parent) {
    const d = document.createElement("div");
    d.className = cls;
    if (parent) parent.appendChild(d);
    return d;
  }

  // on: {back, undo, reset, slide(field, v, final)}; מחזיר את הפקדים
  function build(t, on) {
    const bar = div("cme_hud-topbar");

    // כפתור החזרה של המשחק עצמו: המחלקות שלו, האייקון שלו
    const back = div(Q.DOM.BACK_BUTTON_CLASS + " cme_hud-back", bar);
    back.innerHTML = '<div class="' + Q.DOM.BACK_ARROW_CLASS + '"></div><h3>Z</h3>';
    back.title = t("hudEditorBack");
    back.addEventListener("click", on.back);

    const tools = div("cme_hud-tools", bar);
    const undo = Q.Button.create({
      variant: "secondary", className: "cme_button--square", iconHtml: Q.Icons.undo(),
      title: t("hudEditorUndo"), onClick: on.undo,
    });
    const reset = Q.Button.create({
      variant: "danger", className: "cme_button--square cme_hud-reset", iconHtml: Q.Icons.close(),
      title: t("hudEditorReset"), onClick: on.reset,
    });
    tools.appendChild(undo);
    tools.appendChild(reset);

    const controls = div("cme_hud-controls", tools);
    controls.hidden = true;
    const E = Q.HudElements;
    const slider = (key, range, field) => Q.Slider.create({
      label: t(key), min: range.min * 100, max: range.max * 100, value: 100,
      onInput: (v) => on.slide(field, v / 100, false),
      onChange: (v) => on.slide(field, v / 100, true),
    });
    const size = slider("hudEditorSize", E.SCALE, "scale");
    const opacity = slider("hudEditorOpacity", E.OPACITY, "opacity");
    controls.appendChild(size);
    controls.appendChild(opacity);

    div("cme_hud-title", bar).textContent = t("hudEditorTitle");
    return { bar, undo, controls, size, opacity };
  }

  Q.HudTopbar = { build };
})();
