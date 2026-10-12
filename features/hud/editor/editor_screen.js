// features/hud/editor/editor_screen.js  [ISOLATED world]

// מסך העורך: מחליף את מסך ההגדרות; סרגל עליון ובמה
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const Q = window.TankiQoL;

  const ROOT_ID = "cme_hud-editor";
  let root = null, view = null, stage = null, top = null;
  let hidden = null;          // ה--container שהוסתר, כדי להחזיר
  let layout = null;
  let unsubState = null, unsubStore = null;
  let sliderStart = null;     // ה-override לפני תחילת תנועת סליידר
  let watchingRecipes = false;

  const t = (k) => (Q.LanguageManager ? Q.LanguageManager.getUIText(k) : k);

  function currentLayout() {
    const s = Q.HudBridge ? Q.HudBridge.getState() : null;
    return (s && s.layout) || layout || "default";
  }

  // אותם מלבנים שה-MAIN מסובב סביבם
  function baseRects(forLayout) {
    const out = Q.HudRects.forLayout(forLayout);
    return Object.keys(out).length ? out : null;
  }

  const recipesFor = (forLayout) => (Q.HudRecipes ? Q.HudRecipes.forLayout(forLayout) : {});

  const refreshUndo = () => top.undo._setDisabled(!stage.canUndo());

  function reload() {
    layout = currentLayout();
    view.fit();
    stage.load(layout, baseRects(layout) || {}, Q.HudStore.elements(layout), recipesFor(layout));
    view.empty.hidden = stage.hasShapes();
    refreshUndo();
  }

  // המלבנים משתנים עם החלון; הבחירה וה-undo נשמרים
  function rebase() {
    if (!Q.HudEditor.isOpen()) return;
    view.fit();
    stage.rebase(baseRects(layout) || {}, recipesFor(layout));
    view.empty.hidden = stage.hasShapes();
  }

  function onSelection(id, ov) {
    top.controls.hidden = !id;
    if (!id) return;
    top.size._setValue(Math.round(ov.scale * 100));
    top.opacity._setValue(Math.round(ov.opacity * 100));
  }

  function onChange(forLayout, elements) {
    Q.HudStore.setElements(forLayout, elements);
    refreshUndo();
  }

  // סליידר: תצוגה חיה תוך כדי, אימות ושמירה בשחרור
  function slide(field, v, final) {
    const id = stage.selected();
    if (!id) return;
    if (!final) {
      if (!sliderStart) sliderStart = stage.overrideOf(id);
      stage.preview(id, Object.assign({}, stage.overrideOf(id), { [field]: v }));
      return;
    }
    const before = sliderStart || stage.overrideOf(id);
    sliderStart = null;
    if (!stage.commit(id, Object.assign({}, before, { [field]: v }))) onSelection(id, stage.overrideOf(id));
  }

  function confirmReset() {
    Q.Dialog.open({
      id: "cme_hud-reset-dialog",
      variant: "warning",
      title: t("hudEditorResetTitle"),
      body: t("hudEditorResetBody"),
      buttons: [
        { text: t("cancel"), variant: "secondary" },
        { text: t("ok"), variant: "danger", onClick: () => { stage.reset(); top.undo._setDisabled(false); } },
      ],
    });
  }

  function build() {
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.className = "cme_hud-editor";
    top = Q.HudTopbar.build(t, {
      back: () => Q.HudEditor.close(),
      undo: () => { stage.undo(); refreshUndo(); },
      reset: confirmReset,
      slide,
    });
    view = Q.HudViewport.create(t("hudEditorNoData"), rebase);
    root.appendChild(top.bar);
    root.appendChild(view.el);

    // stageScale: רכיבי HTML מצוירים בגודל מלא ומוקטנים בו
    const stageEl = view.stage;
    const opts = {
      onSelection, onChange, onPointerDown() {},
      stageScale: () => (window.innerWidth ? stageEl.clientWidth / window.innerWidth : 1),
    };
    stage = Q.HudStage.create(stageEl, opts);
    opts.onPointerDown = Q.HudDrag.attach(stage, stageEl);
    stageEl.addEventListener("mousedown", (e) => { if (e.target === stageEl) stage.select(null); });
  }

  // חזרה ב-Z כמו במשחק, וגם ב-Esc; Ctrl+Z הוא undo
  function onKey(e) {
    const z = e.code === "KeyZ";
    if (z && (e.ctrlKey || e.metaKey)) { stage.undo(); refreshUndo(); }
    else if (e.key === "Escape" || (z && !e.altKey && !e.shiftKey)) { e.stopPropagation(); Q.HudEditor.close(); }
  }

  Q.HudEditor = {
    isOpen: () => !!root && !!root.parentNode,

    open() {
      if (this.isOpen()) return;
      const app = document.querySelector(Q.DOM.APP_ROOT);
      const container = document.querySelector(Q.DOM.NOT_IN_GAME_CONTAINER);
      if (!app || !container) return;
      if (!root) build();
      hidden = container;
      hidden.style.display = "none";
      app.appendChild(root);
      reload();
      document.addEventListener("keydown", onKey, true);
      view.watch();
      unsubState = Q.HudBridge.onState((s) => { if (s.layout && s.layout !== layout) reload(); });
      // גילוי מאוחר מעדכן מלבנים בלי למחוק עריכה
      if (Q.HudRecipes && !watchingRecipes) {
        watchingRecipes = true;
        Q.HudRecipes.onReady(rebase);
      }
      unsubStore = Q.HudStore.subscribe((d) => { if (!d.measured[layout] || stage.hasShapes()) return; reload(); });
    },

    close() {
      if (!this.isOpen()) return;
      document.removeEventListener("keydown", onKey, true);
      view.unwatch();
      if (unsubState) unsubState();
      if (unsubStore) unsubStore();
      unsubState = unsubStore = null;
      root.remove();
      if (hidden) hidden.style.display = "";
      hidden = null;
    },
  };
})();
