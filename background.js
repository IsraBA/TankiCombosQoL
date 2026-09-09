// background.js  [service worker]

// The only context allowed to read cross-origin responses.
// Why, and the full flow: CLAUDE.mds/translator.md

const TRANSLATE_TIMEOUT_MS = 8000;

// Never add a host: Chrome would disable it for everyone.
const GOOGLE_HOST = 'https://translate.googleapis.com';

// SW is ephemeral: this cache lasts one lifetime
const swCache = new Map();

async function fetchJson(url, init) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TRANSLATE_TIMEOUT_MS);
  try {
    // signal last: init must never drop the timeout
    const res = await fetch(url, { credentials: 'omit', ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Google says 'iw'/'zh-CN'; chat.js compares bare 'he'/'zh'.
const LEGACY_LANG = { iw: 'he', in: 'id', jw: 'jv', mo: 'ro' };

function normalizeLang(code) {
  if (!code) return null;
  const base = String(code).toLowerCase().split(/[-_]/)[0];
  if (!base || base === 'auto' || base === 'und') return null;
  return LEGACY_LANG[base] || base;
}

// Primary: Chrome's own client id. Plain text, reports source.
// Replaces client=gtx, which Google now answers with 429 (Sep 2026).
async function googleDictCall(text, targetLang) {
  const url = GOOGLE_HOST + '/translate_a/t' +
    '?client=dict-chrome-ex&sl=auto&tl=' + encodeURIComponent(targetLang) +
    '&q=' + encodeURIComponent(text);
  const d = await fetchJson(url);
  // Tolerate a flattened [text, lang] reply.
  const row = Array.isArray(d) && Array.isArray(d[0]) ? d[0] : d;
  const tr = row && row[0];
  if (typeof tr !== 'string' || !tr) throw new Error('empty translation');
  return { text: tr, lang: normalizeLang(row[1]) };
}

// Fallback: other endpoint, same id (the id holds quota).
// Segments in d[0][i][0], detected source in d[2].
async function googleSingleCall(text, targetLang) {
  const url = GOOGLE_HOST + '/translate_a/single' +
    '?client=dict-chrome-ex&sl=auto&tl=' + encodeURIComponent(targetLang) +
    '&dt=t&q=' + encodeURIComponent(text);
  const d = await fetchJson(url);
  const segs = (d && d[0]) || [];
  const tr = segs.map((s) => (s && s[0]) || '').join('');
  if (!tr) throw new Error('empty translation');
  return { text: tr, lang: normalizeLang(d && d[2]) };
}

// First success wins; each backend bounded by the timeout.
async function translate(text, targetLang) {
  const key = targetLang + '\n' + text;
  if (swCache.has(key)) return swCache.get(key);

  const attempts = [
    () => googleDictCall(text, targetLang),
    () => googleSingleCall(text, targetLang),
  ];

  let lastErr = null;
  for (const attempt of attempts) {
    try {
      const res = await attempt();
      swCache.set(key, res);
      if (swCache.size > 500) swCache.clear();  // crude bound; MAIN owns the real cache
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('all backends failed');
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'translate') return;
  const text = String(msg.text || '');
  const targetLang = String(msg.targetLang || 'en');
  if (!text) { sendResponse({ ok: false, error: 'empty text' }); return; }

  translate(text, targetLang)
    .then((res) => sendResponse({ ok: true, text: res.text, lang: res.lang }))
    .catch((e) => sendResponse({ ok: false, error: String(e && e.message || e) }));
  return true;  // keep the message channel open for the async sendResponse
});
