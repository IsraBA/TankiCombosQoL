// features/advisor/recon/detect.js  [ISOLATED world]

// גילוי שדות הקרב על הבאנדל החי (דרך shared/bundle.js), ושליחתם לעולם MAIN.

(function () {
  'use strict';

  // גרסת הסכמה, חלק ממפתח המטמון. להעלות בכל שינוי בפלט של discover()
  const CACHE_VERSION = 2;

  function send(fields) {
    window.postMessage({ __adv: true, dir: 'i2m', action: 'advisorFields', payload: fields }, '*');
  }

  let lastFields = null;   // נשמר כדי לשלוח מחדש ב-handshake של 'ready'

  // ה-User נבנה בכניסה למשחק; מצב הקרב נבנה מחדש כל הזמן
  window.TankiQoL.Bundle.register({
    name: 'advisorFields',
    version: CACHE_VERSION,
    priority: 2,
    discover: (src) => window.TankiQoL.AdvisorDiscover.discover(src),
    publish(fields) {
      lastFields = fields;
      send(fields);
    },
  });

  // שליחה מחדש כש-MAIN מכריז מוכנות (הגילוי עלול להסתיים לפניו)
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const m = e.data;
    if (!m || !m.__adv || m.dir !== 'm2i') return;
    if (m.action === 'ready' && lastFields) send(lastFields);
  });
})();
