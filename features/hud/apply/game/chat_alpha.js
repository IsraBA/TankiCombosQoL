// features/hud/apply/game/chat_alpha.js  [MAIN world]

// שקיפות הצ'אט: uniform בשתי תוכניות ה-shader שלו. הרציונל: CLAUDE.mds/hud.md
(function () {
  "use strict";

  const NS = (window.__HUD = window.__HUD || {});
  const I = (NS.internals = NS.internals || {});

  // רק ה-vertex shader של הצ'אט מצהיר על שניהם
  const MARKERS = ["u_firstLineIndex", "u_maxLines"];
  const ALPHA = "cme_hudAlpha", PREMUL = "cme_hudPremul";

  // uniform לפני main, והכפלת הפלט בסופה
  function inject(src) {
    const out = /\bout\s+vec4\s+(\w+)\s*;/.exec(src);
    const color = out ? out[1] : "gl_FragColor";
    const main = src.search(/void\s+main\s*\(/);
    const end = src.lastIndexOf("}");
    if (main < 0 || end < main) return null;
    return src.slice(0, main) +
      "uniform float " + ALPHA + ";\nuniform float " + PREMUL + ";\n" +
      src.slice(main, end) +
      color + " = vec4(" + color + ".rgb * mix(1.0, " + ALPHA + ", " + PREMUL + "), " + color + ".a * " + ALPHA + ");\n" +
      src.slice(end);
  }

  function hook(Ctx) {
    if (!Ctx || Ctx.prototype.__cmeHudAlpha) return;
    const P = Ctx.prototype;
    P.__cmeHudAlpha = true;
    const sources = new WeakMap();   // shader -> source
    const tracked = new WeakMap();   // program -> {alpha, premul}
    const current = new WeakMap();   // context -> program

    const shaderSource = P.shaderSource;
    P.shaderSource = function (shader, src) {
      sources.set(shader, src);
      return shaderSource.call(this, shader, src);
    };

    const linkProgram = P.linkProgram;
    P.linkProgram = function (program) {
      let chat = false;
      try {
        const shaders = this.getAttachedShaders(program) || [];
        const vertex = shaders.find((s) => this.getShaderParameter(s, this.SHADER_TYPE) === this.VERTEX_SHADER);
        const fragment = shaders.find((s) => this.getShaderParameter(s, this.SHADER_TYPE) === this.FRAGMENT_SHADER);
        const vsrc = vertex && sources.get(vertex), fsrc = fragment && sources.get(fragment);
        if (vsrc && fsrc && MARKERS.every((m) => vsrc.indexOf(m) !== -1) && fsrc.indexOf(ALPHA) === -1) {
          const next = inject(fsrc);
          if (next) {
            shaderSource.call(this, fragment, next);
            this.compileShader(fragment);
            chat = !!this.getShaderParameter(fragment, this.COMPILE_STATUS);
            // לא מתקמפל: חוזרים למקור, והצ'אט לא נמוג
            if (!chat) { shaderSource.call(this, fragment, fsrc); this.compileShader(fragment); }
          }
        }
      } catch (e) {
        NS.debug && (NS.debug.lastError = String(e));
      }
      const r = linkProgram.call(this, program);
      if (chat) {
        tracked.set(program, {
          alpha: this.getUniformLocation(program, ALPHA),
          premul: this.getUniformLocation(program, PREMUL),
        });
      }
      return r;
    };

    const useProgram = P.useProgram;
    P.useProgram = function (program) {
      current.set(this, program);
      return useProgram.call(this, program);
    };

    // לפני כל ציור: ברירת המחדל 0 הייתה מעלימה
    function before(gl) {
      const program = current.get(gl);
      const u = program && tracked.get(program);
      if (!u) return;
      const alpha = I.opacityOf ? I.opacityOf("chat") : 1;
      gl.uniform1f(u.alpha, alpha);
      gl.uniform1f(u.premul, gl.getParameter(gl.BLEND_SRC_RGB) === gl.ONE ? 1 : 0);
    }
    for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "drawRangeElements"]) {
      const orig = P[name];
      if (typeof orig !== "function") continue;
      P[name] = function () {
        before(this);
        return orig.apply(this, arguments);
      };
    }
  }

  hook(window.WebGL2RenderingContext);
  hook(window.WebGLRenderingContext);
})();
