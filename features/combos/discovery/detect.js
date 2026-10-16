// features/combos/discovery/detect.js  [ISOLATED world]

// הגילוי על הבאנדל החי (דרך shared/bundle.js), ושליחת השמות לעולם MAIN.

(function () {
  'use strict';

  // גרסת הסכמה של תוצאת הגילוי, חלק ממפתח המטמון — להעלות בכל שינוי בפלט
  const CACHE_VERSION = 12;

  function send(action, payload) {
    window.postMessage({ __cmb: true, dir: 'i2m', action, payload }, '*');
  }

  let lastConstants = null;   // נשמר כדי לשלוח מחדש ב-handshake של 'ready'

  // ה-proxy נבנה פעם אחת בטעינת המוסך: מוקדם בתור
  window.TankiQoL.Bundle.register({
    name: 'garageConstants',
    version: CACHE_VERSION,
    priority: 1,
    discover: (src) => window.TankiQoL.GarageDiscover.discover(src),
    publish(constants) {
      lastConstants = constants;
      send('garageConstants', constants);
    },
  });

  // שליחה מחדש כש-MAIN מכריז מוכנות (הגילוי עלול להסתיים לפניו)
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const m = e.data;
    if (!m || !m.__cmb || m.dir !== 'm2i') return;
    if (m.action === 'ready' && lastConstants) send('garageConstants', lastConstants);
  });
})();
