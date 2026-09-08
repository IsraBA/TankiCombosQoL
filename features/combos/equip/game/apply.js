// features/combos/equip/game/apply.js  [MAIN world]

// החלת קומבו שלם: פותר כל חריץ מול המצב החי ומחזיר דוח לפי חריץ.

(function () {
  'use strict';

  const W = window;
  const NS = (W.__CMB = W.__CMB || {});
  const I = (NS.internals = NS.internals || {});

  // פיזור בקשות: החלה מיידית שולחת עשר פקודות במילישנייה אחת
  const DEFAULT_DELAY_MS = 80;
  const DELAY_JITTER_MS = 40;

  const now = () => ((W.performance && W.performance.now) ? W.performance.now() : Date.now());

  // המפתח הוא **baseItemId**: כל Mk היא פריט נפרד והמשתמש מחזיק את כולן,
  // אז קומבו שנשמר ב-Mk5 מצייד את ה-Mk הגבוהה שבבעלות בזמן ההחלה.
  I.resolveOwnedItem = function (entry, category, found) {
    if (!entry) return null;
    const IF = I.D.itemFields;
    const base = entry.baseItemId != null ? String(entry.baseItemId) : null;
    const wantId = entry.id != null ? String(entry.id) : null;
    if (!base && !wantId) return null;

    let best = null;
    for (const it of (found || I.collect(I.latestState)).items) {
      if (it[IF.owned] !== true) continue;
      if (category && I.enumName(it[IF.category]) !== category) continue;
      const hit = base ? I.baseItemIdOf(it) === base : I.idToString(it[IF.id]) === wantId;
      if (!hit) continue;
      if (!best || (I.mkLevel(it) || 0) > (I.mkLevel(best) || 0)) best = it;
    }
    return best;
  };

  // הסדר: פריטי בסיס -> דקורטיביים -> הגנות -> אוגמנטים (תלויים בפריט שלהם).
  //   protection === null      -> לא נוגעים בהגנות
  //   protection === [4 ערכים] -> מצב מלא (null בחריץ = הסרה)
  I.applyCombo = async function (desired, opts) {
    if (!I.latestState) return { ok: false, error: 'garage state not captured' };
    if (!desired || typeof desired !== 'object') return { ok: false, error: 'no combo given' };

    // אנחנו משגרים את הפעולה הנמוכה ובכך עוקפים את בדיקת ה-thunk.
    // בלי זה ההחלה "מצליחה" מקומית והשרת דוחה אותה בשקט.
    const cd = I.mountCooldown();
    if (cd.active) {
      NS.debug.cooldownBlocks++;
      return { ok: false, cooldown: true, msLeft: cd.msLeft, results: [] };
    }

    const o = opts || {};
    const baseDelay = typeof o.delayMs === 'number' ? o.delayMs : DEFAULT_DELAY_MS;
    const jitter = typeof o.delayMs === 'number' ? 0 : DELAY_JITTER_MS;
    const IF = I.D.itemFields;
    const results = [];
    const t0 = now();

    const pause = () => I.sleep(baseDelay + (jitter ? Math.floor(Math.random() * jitter) : 0));

    // פריט בסיס / דקורטיבי — הרכבה רגילה
    async function doItem(slot, category) {
      const entry = desired[slot];
      if (!entry) return;
      const raw = I.resolveOwnedItem(entry, category, I.collect(I.latestState));
      if (!raw) {
        results.push({ slot, name: entry.name || null, status: 'unavailable' });
        return;
      }
      if (raw[IF.mounted] === true) {
        results.push({ slot, name: raw[IF.name], status: 'unchanged' });
        return;
      }
      const r = I.mountViaAction(raw, true);
      results.push({
        slot, name: raw[IF.name],
        status: r.ok ? 'applied' : 'failed',
        error: r.ok ? undefined : r.error,
      });
      await pause();
    }

    // סקין — פעולה משלו, תמיד ביחס לפריט הבסיס
    async function doSkin(slot, ownerSlot, ownerCategory) {
      const entry = desired[slot];
      if (!entry || entry.id == null) return;
      const owner = I.resolveOwnedItem(desired[ownerSlot], ownerCategory, I.collect(I.latestState));
      if (!owner) return;   // בלי הפריט אין למה להחיל — לא שגיאה
      const r = I.applySkin(owner, entry.id);
      if (!r.ok) {
        // לא בבעלות אינו כשל אלא חוסר — בדיוק כמו באוגמנטים
        results.push({
          slot, name: entry.name || null,
          status: r.notOwned ? 'unavailable' : 'failed',
          error: r.notOwned ? undefined : r.error,
        });
        return;
      }
      results.push({ slot, name: entry.name || null, status: r.changed ? 'applied' : 'unchanged' });
      if (r.changed) await pause();
    }

    async function doAugment(slot, ownerSlot, ownerCategory) {
      const entry = desired[slot];
      if (!entry || entry.id == null) return;
      const owner = I.resolveOwnedItem(desired[ownerSlot], ownerCategory, I.collect(I.latestState));
      if (!owner) return;
      const r = I.applyAugment(owner, entry.id);
      if (!r.ok) {
        // לא בבעלות אינו כשל אלא חוסר — אין מסלול שיצליח, גם לא DOM
        results.push({
          slot, name: entry.name || null,
          status: r.notOwned ? 'unavailable' : 'failed',
          error: r.notOwned ? undefined : r.error,
        });
        return;
      }
      results.push({ slot, name: entry.name || null, status: r.changed ? 'applied' : 'unchanged' });
      if (r.changed) await pause();
    }

    try {
      await doItem('turret', 'WEAPON');
      await doItem('hull', 'ARMOR');
      await doItem('grenade', 'BAZOOKA');
      await doItem('drone', 'DRONE');

      await doItem('paint', 'PAINT');
      await doSkin('turretSkin', 'turret', 'WEAPON');
      await doSkin('hullSkin', 'hull', 'ARMOR');

      // הגנות: מצב מלא, עם ההשוואה הקבוצתית
      if (Array.isArray(desired.protection)) {
        const found = I.collect(I.latestState);
        const ids = [];
        for (let i = 0; i < 4; i++) {
          const raw = I.resolveOwnedItem(desired.protection[i], 'RESISTANCE_MODULE', found);
          if (!raw && desired.protection[i]) {
            results.push({
              slot: 'protection ' + i,
              name: desired.protection[i].name || null,
              status: 'unavailable',
            });
          }
          ids.push(raw ? I.idToString(raw[IF.id]) : null);
        }
        const r = I.applyProtections(ids);
        if (!r.ok && r.error) {
          results.push({ slot: 'protection', status: 'failed', error: r.error });
        } else {
          const touched = r.plan.unmounted.length + r.plan.mounted.length;
          results.push({
            slot: 'protection',
            status: touched ? 'applied' : 'unchanged',
            detail: r.plan,
            error: (r.errors && r.errors.length) ? r.errors.join('; ') : undefined,
          });
          if (touched) await pause();
        }
      }

      // אוגמנטים: הקטלוג נטען בעצלות, וההרכבה הנמוכה שלנו לא מבקשת אותו
      if (desired.turretAugment || desired.hullAugment) {
        for (const [slot, cat] of [['turret', 'WEAPON'], ['hull', 'ARMOR']]) {
          if (!desired[slot + 'Augment']) continue;
          const owner = I.resolveOwnedItem(desired[slot], cat, I.collect(I.latestState));
          if (owner) I.requestDeviceCatalog(owner);
        }
        await I.waitForMountedDeviceCatalogs(2000);
      }
      await doAugment('turretAugment', 'turret', 'WEAPON');
      await doAugment('hullAugment', 'hull', 'ARMOR');

      // בלי זה רואים על הטנק צבע אחר מזה שצויד
      I.selectMountedPaint();
    } catch (e) {
      NS.debug.lastError = String(e);
      return { ok: false, error: String(e), results };
    }

    const failed = results.filter((r) => r.status === 'failed');
    const unavailable = results.filter((r) => r.status === 'unavailable');
    return {
      ok: failed.length === 0,
      results,
      failed: failed.map((r) => r.slot),
      unavailable: unavailable.map((r) => r.slot),
      ms: Math.round(now() - t0),
    };
  };
})();
