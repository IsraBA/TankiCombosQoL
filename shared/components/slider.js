// shared/components/slider.js

// סליידר בסגנון InputRangeComponentStyle של המשחק: כותרת, ערך ירוק ומסילה צהובה.
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const FILL = "rgb(255, 188, 9)";
  const REST = "rgba(255, 255, 255, 0.1)";

  window.TankiQoL.Slider = {
    // options: { id, label, min, max, step, value, format, onInput, onChange }
    create(options = {}) {
      const min = options.min == null ? 0 : options.min;
      const max = options.max == null ? 100 : options.max;
      const step = options.step == null ? 1 : options.step;
      const format = options.format || ((v) => "(" + v + "%)");

      const block = document.createElement("div");
      block.className = "cme_slider";
      if (options.id) block.id = options.id;

      const title = document.createElement("p");
      title.className = "cme_slider-title";
      const labelSpan = document.createElement("span");
      labelSpan.className = "cme_slider-label";
      labelSpan.textContent = options.label || "";
      const valueSpan = document.createElement("span");
      valueSpan.className = "cme_slider-value";
      title.appendChild(labelSpan);
      title.appendChild(valueSpan);
      block.appendChild(title);

      const track = document.createElement("div");
      track.className = "cme_slider-track";
      const input = document.createElement("input");
      input.type = "range";
      input.className = "cme_slider-input";
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);
      input.value = String(options.value == null ? min : options.value);
      track.appendChild(input);
      block.appendChild(track);

      // המשחק צובע את המילוי כ-gradient על ה-input עצמו
      function paint() {
        const v = Number(input.value);
        const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
        input.style.background =
          "linear-gradient(to right, " + FILL + " 0%, " + FILL + " " + pct +
          "%, " + REST + " " + pct + "%, " + REST + " 100%)";
        valueSpan.textContent = format(v);
      }
      paint();

      input.addEventListener("input", () => {
        paint();
        if (options.onInput) options.onInput(Number(input.value));
      });
      // change = שחרור; זה הרגע לאמת ולשמור
      input.addEventListener("change", () => {
        if (options.onChange) options.onChange(Number(input.value));
      });

      block._setValue = (v) => {
        input.value = String(v);
        paint();
      };
      block._getValue = () => Number(input.value);
      block._setLabel = (t) => {
        labelSpan.textContent = t;
      };
      block._input = input;

      return block;
    },
  };
})();
