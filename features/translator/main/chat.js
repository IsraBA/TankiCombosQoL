// features/translator/main/chat.js  [MAIN world]

// THE CORE MODULE: takes over the canvas chat — capture, intercept, rebuild.
// The render model and the bugs this is shaped around: CLAUDE.mds/translator.md

(function () {
  const W = window;
  const NS = (W.__CT = W.__CT || {});

  // ---- config ---------------------------------------------------------
  const MAX_VISIBLE = 8;            // chat shows ~8 lines
  const REBUILD_DEBOUNCE_MS = 120;  // coalesce bursts of translations
  const TR_ARROW = '» ';
  const REPLAY_WINDOW_MS = 1500;    // resize-replay match-queue lifetime
  // Pending-translation loader: a braille spinner appended to the original text
  // while the translation is in flight; removed once it returns.
  const LOADER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const LOADER_INTERVAL_MS = 80;

  // אין שמות מראש: detect.js שולח אותם, ועד אז שום מלכודת
  let D = null;

  // ---- live settings snapshot ----------------------------------------
  let S = { enabled: true, showOriginal: false, targetLang: 'en', ready: false };

  // ---- runtime / debug surfaces (kept identical to the research userscript)
  W.__CT_HUD = null;
  W.__CT_MSGS = [];   // [{method, arg, textKey, text, translation, lang, state, willTranslate, userShowOriginal, time}]
  W.__CT_DEBUG = {
    names: D, discovered: false, settings: S,
    captured: 0, wrappedMethods: [], intercepts: 0,
    translations: 0, rebuilds: 0, replayAdopts: 0, skipped: 0, lastError: null,
  };

  function ownKeys(o) { try { return Object.keys(o); } catch (_) { return []; } }
  function get(o, k) { try { return o[k]; } catch (_) { return undefined; } }
  function hasLetter(text) { return !!text && /\p{L}/u.test(text); }

  // לקנבס של המשחק אין bidi, ולכן ממירים לסדר ויזואלי בכל תצוגה
  function toVisual(text) { return NS.bidi ? NS.bidi.toVisual(text) : text; }

  // Message text = the (longest) top-level own STRING on the render arg.
  function findTextKey(arg) {
    let bestK = null, bestLen = -1;
    for (const k of ownKeys(arg)) {
      const v = get(arg, k);
      if (typeof v === 'string' && v.length > bestLen) { bestK = k; bestLen = v.length; }
    }
    return bestK;
  }

  // ---- display text for a message ------------------------------------
  let loaderFrame = 0;
  function displayText(m) {
    if (!m.willTranslate) return toVisual(m.text);
    const showOrig = m.userShowOriginal != null ? m.userShowOriginal : S.showOriginal;
    if (showOrig || !S.enabled) return toVisual(m.text);   // original mode: clean
    if (m.state === 'done') {
      const tr = m.translation;
      const same = !tr || !tr.trim() ||
        tr.trim().toLowerCase() === (m.text || '').trim().toLowerCase();
      // Suppress when the detected source already equals the chosen target
      // (e.g. target=EN and the message was English) — nothing to translate.
      const srcIsTarget = m.lang && S.targetLang &&
        m.lang.toLowerCase() === S.targetLang.toLowerCase();
      if (same || srcIsTarget) return toVisual(m.text);
      // תרגום לשפת RTL: רק גוף התרגום מומר; התגית ([HE] ») נשארת משמאל
      return (m.lang ? '[' + m.lang.toUpperCase() + '] ' : '[文] ') + TR_ARROW + toVisual(tr);
    }
    return toVisual(m.text || '') + ' ' + LOADER_FRAMES[loaderFrame % LOADER_FRAMES.length]; // pending
  }

  // ---- translation dispatch ------------------------------------------
  function fireTranslate(m) {
    const lang = S.targetLang;
    NS.translate.request(m.text, lang).then((res) => {
      if (S.targetLang !== lang) return;   // target changed mid-flight; a newer request owns this msg
      m.translation = res.text; m.lang = res.lang; m.state = 'done';
      W.__CT_DEBUG.translations++;
      scheduleRebuild();
    }).catch((e) => {
      m.state = 'done';   // give up gracefully -> original stays shown
      W.__CT_DEBUG.lastError = 'translate: ' + e;
      scheduleRebuild();
    });
  }

  // force=true (language changed) re-requests even translated messages
  function refreshVisibleTranslations(force) {
    if (!S.enabled) return;
    for (const m of W.__CT_MSGS.slice(-MAX_VISIBLE)) {
      if (!hasLetter(m.text) || NS.skip.shouldSkip(m.text)) continue;
      if (!force && m.willTranslate) continue;
      m.willTranslate = true;
      m.translation = null; m.lang = null; m.state = 'pending';
      fireTranslate(m);
    }
    ensureLoaderAnim();
  }

  // ---- rebuild: clear + replay our model with current display text ----
  function rebuildNow() {
    const hud = W.__CT_HUD;
    if (!hud || !S.enabled) return;
    const proto = Object.getPrototypeOf(hud);
    try {
      // Evict every visible line, as the engine does when messages scroll off.
      // NEVER reset the ring pointer or offset — that was the duplicate-lines bug.
      const evict = proto[D.evict];
      for (let i = 0; i < 60 && hud[D.count] > 0; i++) evict.call(hud);
      for (const m of W.__CT_MSGS.slice(-MAX_VISIBLE)) {
        if (m.textKey) { try { m.arg[m.textKey] = displayText(m); } catch (e) {} }
        try { proto[m.method].call(hud, m.arg); } catch (e) { W.__CT_DEBUG.lastError = String(e); }
      }
      W.__CT_DEBUG.rebuilds++;
    } catch (e) { W.__CT_DEBUG.lastError = String(e); }
  }

  let rebuildTimer = null;
  function scheduleRebuild() {
    if (rebuildTimer) return;
    rebuildTimer = setTimeout(() => { rebuildTimer = null; rebuildNow(); }, REBUILD_DEBOUNCE_MS);
  }
  NS.rebuild = rebuildNow;

  // ---- animated loader -----------------------------------------------
  // Advances the spinner while any visible message is still pending
  let loaderTimer = null;
  function anyLoaderPending() {
    if (S.showOriginal || !S.enabled) return false;
    for (const m of W.__CT_MSGS.slice(-MAX_VISIBLE)) if (m.state === 'pending') return true;
    return false;
  }
  function ensureLoaderAnim() {
    if (loaderTimer || !anyLoaderPending()) return;
    loaderTimer = setInterval(() => {
      if (!anyLoaderPending()) { clearInterval(loaderTimer); loaderTimer = null; return; }
      loaderFrame = (loaderFrame + 1) % 1000000;
      rebuildNow();
    }, LOADER_INTERVAL_MS);
  }

  // ---- render-method interception ------------------------------------
  // Resize-replay dedup: records the engine is about to re-emit, oldest first.
  // Time-bounded so a stale queue can't swallow a genuine new message.
  let replayQ = [];
  let replayT = 0;

  function wrapRenderMethod(hud, name) {
    const orig = hud[name];
    if (typeof orig !== 'function' || hud['__ct_wrapped_' + name]) return;
    try {
      Object.defineProperty(hud, name, {
        configurable: true, writable: true, enumerable: false,
        value: function (arg) {
          try {
            const textKey = arg && typeof arg === 'object' ? findTextKey(arg) : null;
            const original = textKey ? get(arg, textKey) : null;

            // -- engine resize-replay dedup ----------------------------
            if (replayQ.length && Date.now() - replayT > REPLAY_WINDOW_MS) replayQ = [];
            if (this[D.count] === 0 && W.__CT_MSGS.length) {
              // canvas was just blanked (resize): what follows is the engine
              // replaying the visible tail, not new messages.
              replayQ = W.__CT_MSGS.slice(-MAX_VISIBLE);
              replayT = Date.now();
            }
            if (replayQ.length) {
              const idx = replayQ.findIndex((e) => e.method === name && e.text === original);
              if (idx >= 0) {
                const entry = replayQ[idx];
                replayQ.splice(0, idx + 1);
                entry.arg = arg;
                entry.textKey = textKey;
                W.__CT_DEBUG.replayAdopts++;
                // מציבים טקסט תצוגה כשהוא שונה מהמקור — תרגום/ספינר, וגם
                // תיקון RTL להודעות שאינן מתורגמות
                if (S.enabled && textKey) {
                  const d = displayText(entry);
                  if (d !== entry.text) { try { arg[textKey] = d; } catch (e) {} }
                }
                if (entry.state === 'pending') ensureLoaderAnim();
                return orig.apply(this, arguments);
              }
            }

            const m = {
              method: name, arg, textKey, text: original,
              translation: null, lang: null, state: 'plain', willTranslate: false,
              userShowOriginal: null, time: Date.now(),
            };
            if (S.enabled && hasLetter(original) && !NS.skip.shouldSkip(original)) {
              m.willTranslate = true; m.state = 'pending';
            } else if (S.enabled && hasLetter(original)) {
              W.__CT_DEBUG.skipped++;   // universal slang: shown verbatim, no API call
            }
            W.__CT_MSGS.push(m);
            if (W.__CT_MSGS.length > 200) W.__CT_MSGS.shift();
            W.__CT_DEBUG.intercepts++;

            // מציבים טקסט תצוגה כשהוא שונה מהמקור — ספינר להודעה שתתורגם,
            // וגם תיקון RTL שחל על כל הודעה (כולל סלנג ומצב "הצג מקור")
            if (S.enabled && textKey) {
              const d = displayText(m);
              if (d !== original) { try { arg[textKey] = d; } catch (e) {} }
            }
            if (m.willTranslate) { ensureLoaderAnim(); fireTranslate(m); }
          } catch (e) { W.__CT_DEBUG.lastError = String(e); }
          return orig.apply(this, arguments);
        },
      });
      Object.defineProperty(hud, '__ct_wrapped_' + name, {
        value: true, enumerable: false, configurable: true,
      });
      W.__CT_DEBUG.wrappedMethods.push(name);
    } catch (e) { W.__CT_DEBUG.lastError = String(e); }
  }

  // A captured object is the chat HUD if its prototype has all the render
  // methods + the evict method (per the current name-set D).
  function looksLikeHud(o) {
    if (!o || typeof o !== 'object') return false;
    for (const m of D.renderMethods) if (typeof get(o, m) !== 'function') return false;
    return typeof get(o, D.evict) === 'function';
  }

  function captureHud(hud) {
    W.__CT_HUD = hud;
    W.__CT_MSGS = [];
    replayQ = [];
    W.__CT_DEBUG.captured++;
    W.__CT_DEBUG.wrappedMethods = [];
    D.renderMethods.forEach((m) => wrapRenderMethod(hud, m));
  }

  // ---- Object.prototype trap to grab the HUD on construction ----------
  // Re-captures on every new HUD, because each battle builds a fresh one
  const armed = new Map();   // שדה -> ה-setter שלו
  function armTrap(prop) {
    if (!prop || armed.has(prop)) return;
    const set = function (v) {
      Object.defineProperty(this, prop, {
        value: v, writable: true, configurable: true, enumerable: true,
      });
      if (this !== W.__CT_HUD && looksLikeHud(this)) {
        try { captureHud(this); } catch (e) { W.__CT_DEBUG.lastError = String(e); }
      }
    };
    armed.set(prop, set);
    try {
      Object.defineProperty(W.Object.prototype, prop, {
        configurable: true, enumerable: false,
        get() { return undefined; },
        set,
      });
    } catch (e) { W.__CT_DEBUG.lastError = String(e); }
  }

  // יוצא מ-Object.prototype, אם המלכודת עדיין שלנו
  function disarm(prop) {
    const set = armed.get(prop);
    if (!set) return;
    armed.delete(prop);
    const d = Object.getOwnPropertyDescriptor(W.Object.prototype, prop);
    if (d && d.set === set) delete W.Object.prototype[prop];
  }

  // ---- discovered names from detect.js -------------------------------
  function applyNames(d) {
    const was = D && D.offset;
    D = d;
    W.__CT_DEBUG.names = d;
    W.__CT_DEBUG.discovered = true;
    armTrap(d.offset);   // המלכודת היחידה: שדה ה-offset שהתגלה
    // שם קודם (מטמון ישן) שייך בבילד הזה למחלקה זרה, אולי חמה
    if (was && was !== d.offset) disarm(was);
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const m = e.data;
    if (!m || !m.__ct || m.dir !== 'i2m' || m.action !== 'hudConstants') return;
    try { applyNames(m.payload); } catch (err) { W.__CT_DEBUG.lastError = String(err); }
  });

  // ---- settings reactions --------------------------------------------
  NS.settings.subscribe((s) => {
    const langChanged = (s.targetLang || 'en') !== S.targetLang;
    const enabledOn = !!s.enabled && !S.enabled;
    S = {
      enabled: !!s.enabled, showOriginal: !!s.showOriginal,
      targetLang: s.targetLang || 'en', ready: !!s.ready,
    };
    W.__CT_DEBUG.settings = S;
    W.__CT_SHOW_ORIGINAL = S.showOriginal;   // read-only mirror for research helpers
    W.__CT_ENABLED = S.enabled;
    if (!W.__CT_HUD) return;                  // nothing visible yet
    if (langChanged) refreshVisibleTranslations(true);
    else if (enabledOn) refreshVisibleTranslations(false);
    if (S.enabled && !S.showOriginal) ensureLoaderAnim();
    rebuildNow();
  });

  // ---- console / debug controls (parity with the research userscript) -
  W.__CT_TOGGLE = function () {
    NS.settings.set({ showOriginal: !S.showOriginal });
    return S.showOriginal ? 'translation' : 'original';  // value AFTER the pending flip
  };
  W.__CT_TOGGLE_MSG = function (i) {
    const m = W.__CT_MSGS[i];
    if (!m) return;
    const cur = m.userShowOriginal != null ? m.userShowOriginal : S.showOriginal;
    m.userShowOriginal = !cur;
    rebuildNow();
    return m.userShowOriginal ? 'original' : 'translation';
  };
  W.__CT_TOGGLE_LAST = function () {
    for (let i = W.__CT_MSGS.length - 1; i >= 0; i--) {
      if (W.__CT_MSGS[i].willTranslate) return W.__CT_TOGGLE_MSG(i);
    }
  };
  W.__CT_REBUILD = rebuildNow;
  W.__CT_STATE = function () {
    const s = {
      settings: S, names: D, debug: W.__CT_DEBUG,
      recorded: W.__CT_MSGS.length, captured: !!W.__CT_HUD,
    };
    return s;
  };
})();
