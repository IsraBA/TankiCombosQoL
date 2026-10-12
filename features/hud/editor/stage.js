// features/hud/editor/stage.js  [ISOLATED world]

// הבמה של העורך: הצורות, הבחירה, האימות והשמירה עם undo
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const Q = window.TankiQoL;

  Q.HudStage = {
    create(stageEl, opts) {
      const Elements = Q.HudElements, Shapes = Q.HudShapes;
      const history = Q.HudHistory.create();
      const shapes = new Map();       // id -> host
      let layout = "default";
      let base = {};                  // id -> מלבן ברירת המחדל (שברים)
      let recipes = {};               // id -> המתכון, ובו חלקי הרכיב
      let elements = {};              // id -> override
      let selected = null;
      let allowed = () => 0;

      const ov = (id) => Elements.normalize(elements[id]);
      const { shapeOf, dependents, fit, overlaps } =
        Q.HudStageRules.create(() => ({ layout, base, recipes, ov, allowed }));

      function place(id, cand, hostOv) {
        const host = shapes.get(id);
        if (!host) return;
        const s = shapeOf(id, cand, hostOv);
        Shapes.place(host, s.rect, cand.opacity);
        if (s.parts) Shapes.placeParts(host, s.parts);
      }

      function paint(id) {
        const host = shapes.get(id);
        if (!host) return;
        place(id, ov(id));
        host.classList.toggle("cme_hud-shape--selected", id === selected);
        host.classList.toggle("cme_hud-shape--locked", !Elements.isMovable(id, layout));
      }

      function render() {
        for (const host of shapes.values()) host.remove();
        shapes.clear();
        const ctx = { scale: opts.stageScale ? opts.stageScale() : 1 };
        for (const e of Elements.forLayout(layout)) {
          if (!base[e.id]) continue;
          const host = Shapes.build(e.id, e.shape, base[e.id], recipes[e.id], ctx);
          host.addEventListener("mousedown", (ev) => opts.onPointerDown(e.id, ev));
          stageEl.appendChild(host);
          shapes.set(e.id, host);
          paint(e.id);
        }
        if (selected && !shapes.has(selected)) selected = null;
        opts.onSelection(selected, selected ? ov(selected) : null);
      }

      function flashInvalid(id) {
        const host = shapes.get(id);
        if (!host) return;
        host.classList.add("cme_hud-shape--invalid");
        setTimeout(() => host.classList.remove("cme_hud-shape--invalid"), 400);
      }

      function setBase(nextBase, nextRecipes) {
        base = nextBase || {};
        recipes = nextRecipes || {};
        allowed = Q.HudOverlap.allowance(base);
      }

      return {
        // מצב חדש: פריסה, מלבני בסיס והעדפות שמורות
        load(nextLayout, nextBase, nextElements, nextRecipes) {
          layout = nextLayout;
          setBase(nextBase, nextRecipes);
          elements = JSON.parse(JSON.stringify(nextElements || {}));
          history.clear();
          selected = null;
          render();
        },

        // שינוי גודל חלון: הבחירה וה-undo נשארים
        rebase(nextBase, nextRecipes) {
          setBase(nextBase, nextRecipes);
          render();
        },

        select(id) {
          selected = id;
          for (const k of shapes.keys()) paint(k);
          opts.onSelection(selected, selected ? ov(selected) : null);
        },

        selected: () => selected,
        overrideOf: ov,
        isMovable: (id) => Elements.isMovable(id, layout),
        hasShapes: () => shapes.size > 0,
        canUndo: () => history.size() > 0,

        // tol בשברי מסך לכל ציר
        snap(id, candidate, tol) {
          return Q.HudGeometry.snapCenter(base[id], Elements.normalize(candidate), tol);
        },

        // תצוגה חיה; מסמן אדום כשלא חוקי
        preview(id, candidate) {
          const host = shapes.get(id);
          if (!host) return false;
          const c = fit(id, Elements.normalize(candidate));
          const ok = !overlaps(id, c);
          place(id, c);
          for (const d of dependents(id)) place(d, ov(d), c);
          host.classList.toggle("cme_hud-shape--invalid", !ok);
          return ok;
        },

        // שחרור: דורס -> חוזרים אחורה; אחרת נשמר עם undo
        commit(id, candidate) {
          const c = fit(id, Elements.normalize(candidate));
          const host = shapes.get(id);
          if (host) host.classList.remove("cme_hud-shape--invalid");
          const settle = () => { paint(id); for (const d of dependents(id)) paint(d); };
          if (overlaps(id, c)) {
            settle();
            flashInvalid(id);
            return false;
          }
          if (JSON.stringify(c) === JSON.stringify(ov(id))) {
            settle();
            return false;
          }
          history.push(elements);
          if (Elements.isDefault(c)) delete elements[id];
          else elements[id] = c;
          settle();
          opts.onChange(layout, elements);
          opts.onSelection(selected, selected ? ov(selected) : null);
          return true;
        },

        undo() {
          const prev = history.undo();
          if (!prev) return false;
          elements = prev;
          render();
          opts.onChange(layout, elements);
          return true;
        },

        reset() {
          history.push(elements);
          elements = {};
          render();
          opts.onChange(layout, elements);
        },
      };
    },
  };
})();
