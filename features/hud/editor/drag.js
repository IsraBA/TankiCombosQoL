// features/hud/editor/drag.js  [ISOLATED world]

// גרירת צורה על הבמה: 5px מפרידים בין קליק לגרירה; שחרור מאמת ושומר.
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const THRESHOLD = 5;
  // מרחק ההצמדה לאמצע המסך, בפיקסלים של הבמה
  const SNAP_PX = 8;

  window.TankiQoL.HudDrag = {
    // stage: HudStage; stageEl: הבמה; מחזיר את מטפל ה-mousedown
    attach(stage, stageEl) {
      let drag = null;

      // קווי אמצע המסך; נראים רק בזמן הצמדה
      const guides = {};
      for (const axis of ["v", "h"]) {
        guides[axis] = document.createElement("div");
        guides[axis].className = "cme_hud-guide cme_hud-guide--" + axis;
        stageEl.appendChild(guides[axis]);
      }
      function showGuides(x, y) {
        guides.v.classList.toggle("cme_hud-guide--on", !!x);
        guides.h.classList.toggle("cme_hud-guide--on", !!y);
      }

      function onMove(e) {
        if (!drag) return;
        const mx = e.clientX - drag.startX, my = e.clientY - drag.startY;
        if (!drag.moving) {
          if (Math.abs(mx) < THRESHOLD && Math.abs(my) < THRESHOLD) return;
          drag.moving = true;
          drag.host.classList.add("cme_hud-shape--dragging");
        }
        // הגבולות והחפיפה בבמה; כאן ההיסט וההצמדה
        const box = stageEl.getBoundingClientRect();
        const raw = Object.assign({}, drag.start, {
          dx: drag.start.dx + mx / box.width,
          dy: drag.start.dy + my / box.height,
        });
        const snapped = stage.snap(drag.id, raw, { x: SNAP_PX / box.width, y: SNAP_PX / box.height });
        showGuides(snapped.x, snapped.y);
        drag.candidate = snapped.ov;
        stage.preview(drag.id, snapped.ov);
      }

      function onUp() {
        if (!drag) return;
        const d = drag;
        drag = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        showGuides(false, false);
        d.host.classList.remove("cme_hud-shape--dragging");
        if (d.moving && d.candidate) stage.commit(d.id, d.candidate);
        else stage.preview(d.id, d.start);
      }

      return function onPointerDown(id, e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        stage.select(id);
        if (!stage.isMovable(id)) return;
        drag = {
          id,
          host: e.currentTarget,
          startX: e.clientX,
          startY: e.clientY,
          start: stage.overrideOf(id),
          candidate: null,
          moving: false,
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      };
    },
  };
})();
