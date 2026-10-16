// shared/bundle.js  [ISOLATED world]

// הבאנדל החי לכל הגילויים: הורדה אחת, מטמון לבילד, סדר עדיפות. הרציונל: CLAUDE.mds/architecture.md
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  // רשום בכל בלוק גילוי, כדי שכל אחד יעמוד בפני עצמו; הראשון מנצח
  if (window.TankiQoL.Bundle) return;

  const URL_RE = /\/main\.[A-Za-z0-9]+\.js(?:[?#]|$)/;
  const EXT = chrome.runtime.getManifest().version;

  const jobs = [];   // {name, version, priority, discover(src, url), publish(data)}
  let url = null;
  let source = null;
  let running = false;

  function findUrl() {
    for (const s of document.scripts) {
      if (s.src && URL_RE.test(s.src)) return s.src;
    }
    return null;
  }

  function waitForUrl(timeoutMs) {
    return new Promise((resolve, reject) => {
      const initial = findUrl();
      if (initial) return resolve(initial);
      const observer = new MutationObserver(() => {
        const found = findUrl();
        if (found) {
          observer.disconnect();
          clearTimeout(timer);
          resolve(found);
        }
      });
      observer.observe(document.documentElement || document, { childList: true, subtree: true });
      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error("bundle URL not found"));
      }, timeoutMs);
    });
  }

  // הורדה אחת, גם כשכמה גילויים צריכים אותה
  function text() {
    if (!source) {
      source = fetch(url, { credentials: "omit" }).then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      });
    }
    return source;
  }

  const keyOf = (job) => job.name + ":v" + job.version + ":" + url;

  function read(key) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([key], (got) => resolve(got[key] || null));
      } catch (e) {
        resolve(null);
      }
    });
  }

  function write(key, value) {
    try {
      chrome.storage.local.set({ [key]: value });
    } catch (e) { /* נשאר בזיכרון לסשן הזה */ }
  }

  // רק המפתח של הבילד הנוכחי נשאר; בילדים וגרסאות קודמים זבל
  function cleanup(batch) {
    const names = new Set(batch.map((job) => job.name));
    const keep = new Set(batch.map(keyOf));
    try {
      chrome.storage.local.get(null, (all) => {
        const stale = Object.keys(all).filter((k) => names.has(k.split(":")[0]) && !keep.has(k));
        if (stale.length) chrome.storage.local.remove(stale);
      });
    } catch (e) { /* ניקוי הוא best-effort */ }
  }

  function publish(job, data) {
    try {
      job.publish(data);
    } catch (e) { /* מאזין אחד לא מפיל את השאר */ }
  }

  // ההודעה הקודמת ל-MAIN נמסרת לפני הגילוי הבא
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  // גילוי מהבאנדל; מתפרסם רק אם שונה ממה שכבר נשלח
  async function refresh(job, hit) {
    await tick();
    const data = job.discover(await text(), url);
    if (!data) {
      if (hit) write(keyOf(job), { ext: EXT, data: hit.data });
      return;
    }
    write(keyOf(job), { ext: EXT, data });
    if (!hit || JSON.stringify(hit.data) !== JSON.stringify(data)) publish(job, data);
  }

  // מטמון מגרסה אחרת של התוסף נשלח מיד, ומתחדש ברקע
  async function pump() {
    if (running || !url) return;
    running = true;
    while (jobs.length) {
      const batch = jobs.splice(0).sort((a, b) => a.priority - b.priority);
      const hits = await Promise.all(batch.map((job) => read(keyOf(job))));
      cleanup(batch);
      const todo = [];
      batch.forEach((job, i) => {
        const hit = hits[i] && hits[i].data ? hits[i] : null;
        if (hit) publish(job, hit.data);
        if (!hit || hit.ext !== EXT) todo.push([job, hit]);
      });
      for (const [job, hit] of todo) {
        try {
          await refresh(job, hit);
        } catch (e) {
          console.error("[bundle] " + job.name + " discovery failed:", e);
        }
      }
    }
    running = false;
  }

  window.TankiQoL.Bundle = {
    // priority: נמוך = קודם; מה שהמשחק בונה מוקדם הולך ראשון
    register(job) {
      jobs.push(job);
      pump();
    },
  };

  waitForUrl(30000).then((found) => {
    url = found;
    pump();
  }, () => { /* הבאנדל לא נמצא בזמן */ });
})();
