// features/translator/isolated/detect.js  [ISOLATED world]

// Finds the chat-HUD minified names in the live bundle, per build.
// The anchors and the recovery procedure: CLAUDE.mds/translator.md

(function () {
  // גרסת הסכמה, חלק ממפתח המטמון — להעלות בכל שינוי בפלט
  const CACHE_VERSION = 1;

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // Ported verbatim from the research userscript's discover(). Returns the
  // HUD name-set or null. Field names match what chat.js expects.
  function discover(src) {
    const ID = '[\\w$]+';
    const esc = escapeRe;

    const app = src.match(/([\w$]+)\(this,": ",/);
    if (!app) return null;
    const appendFn = app[1];

    const cm = src.match(new RegExp('(' + ID + ')\\((' + ID + ')\\)\\.' + ID +
      '=function\\(t\\)\\{[^{}]*' + esc(appendFn) + '\\(this,": ",'));
    if (!cm) return null;
    const helper = cm[1], cls = cm[2];

    const fin = src.match(/t\.([\w$]+)\.([\w$]+)=0;var ([\w$]+)=t\.\1;\3\.([\w$]+)=\3\.\4\+23,t\.([\w$]+)=t\.\5\+1\|0,t\.([\w$]+)=t\.\6\+1\|0/);
    if (!fin) return null;
    const offset = fin[1], ySub = fin[2], zSub = fin[4], count = fin[5], ptr = fin[6];

    const tailIdx = src.indexOf(fin[0]);
    const back = src.slice(Math.max(0, tailIdx - 600), tailIdx);
    const decls = [...back.matchAll(new RegExp('function (' + ID + ')\\(t\\)\\{', 'g'))];
    const finalizeFn = decls.length ? decls[decls.length - 1][1] : null;
    if (!finalizeFn) return null;

    const em = src.match(new RegExp(esc(helper) + '\\(' + esc(cls) + '\\)\\.(' + ID +
      ')=function\\(\\)\\{if\\(this\\.(' + ID + ')<1\\)return'));
    if (!em || em[2] !== count) return null;  // sanity: evict count == finalize count
    const evict = em[1];

    const names = [...src.matchAll(new RegExp(esc(helper) + '\\(' + esc(cls) +
      '\\)\\.(' + ID + ')=function\\(t\\)\\{', 'g'))].map((x) => x[1]);
    const renderMethods = [];
    for (const nm of names) {
      const start = src.indexOf(helper + '(' + cls + ').' + nm + '=function(t){');
      const body = src.slice(start, start + 800);
      if (body.includes(appendFn + '(this,') && body.includes(finalizeFn + '(this)')) {
        renderMethods.push(nm);
      }
    }
    if (!renderMethods.length) return null;

    return { helper, cls, appendFn, finalizeFn, offset, ySub, zSub, count, ptr, evict, renderMethods };
  }

  // חשוף להרנס, כמו הגילויים של שאר הפיצ'רים
  window.TankiQoL = window.TankiQoL || {};
  window.TankiQoL.ChatDiscover = { discover };

  function send(action, payload) {
    window.postMessage({ __ct: true, dir: 'i2m', action, payload }, '*');
  }

  let lastConstants = null;  // kept so we can re-send on the MAIN 'ready' handshake

  // ה-HUD של הצ'אט נבנה רק בכניסה לקרב: לא דחוף
  window.TankiQoL.Bundle.register({
    name: 'hudConstants',
    version: CACHE_VERSION,
    priority: 3,
    discover,
    publish(constants) {
      lastConstants = constants;
      send('hudConstants', constants);
    },
  });

  // Re-send on MAIN ready (covers detect finishing before MAIN's listeners).
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const m = e.data;
    if (!m || !m.__ct || m.dir !== 'm2i') return;
    if (m.action === 'ready' && lastConstants) send('hudConstants', lastConstants);
  });
})();
