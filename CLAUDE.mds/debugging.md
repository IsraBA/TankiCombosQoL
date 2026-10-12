# Debugging

Nothing is printed at runtime, so there is no log stream to watch — everything
below is pulled on demand. The game hooks live in the page world, so use the
**game tab's** console (not the extension's DevTools) for all of it.

## Console surface

The extension logs **nothing** at runtime except `console.error` on a genuine
unexpected failure. What is left is data you can pull on demand from the game
tab's console — no printing, they return objects and the console renders them.

```js
// combos — the garage hook (MAIN world)
__CMB.read(); // the current loadout as read from game state
__CMB.index(); // the flat garage index (what the migrator consumes)
__CMB.state(); // the captured raw game state object (for poking around)
__CMB.names(); // the minified name-set in use for this build
__CMB.debug; // counters: captures, reads, dispatch counts, lastError, …
__CMB.internals.mountCooldown(); // {known, active, msLeft} — the equip cooldown

// combos — DOM side (ISOLATED)
chrome.storage.local.get(["savedCombos"], (r) => console.log(r.savedCombos));

// combos — replay the "what's new" modal. Works from the plain page console:
// the flag lives in chrome.storage (ISOLATED), so MAIN just relays the request.
__CMB.resetWhatsNew();          // then reopen the COMBOS tab
// The ISOLATED-side method exists too, but reaching it means switching the
// console's Context dropdown to the extension, which resets on every reload:
TankiQoL.WhatsNewModal.reset();

// advisor — battle probe (MAIN world). Prints nothing; pull on demand.
__ADV.debug; // {rosterCaptures, battleCaptures, localCaptures, userCaptures, skipped, lastError}
__ADV.raw(); // {battle, roster, local, selfId, turrets[], users[]} — state + ranking

// HUD editor (MAIN world)
__HUD.state();     // {layout, uiSize, scale, inBattle, rootFontPx, dpr}
__HUD.nodes();     // every top-level element: ctor, the adder's offset, the role it mapped to
__HUD.groups();    // element id -> the nodes it gathers
__HUD.measure();   // the geometry record the editor replays (also pushed automatically)
__HUD.seed();      // the same record as a line to paste into features/hud/model/seed.js
__HUD.overrides(); // the preferences currently applied, as they arrived from storage
__HUD.debug;       // {captures, adds, removes, settingsCaptures, serviceCaptures,
//  layoutCalls, renderCalls, measures, names: "seed"|"bundle", lastError}
__HUD.internals.N; // the minified names in use (seed, or this build's)

// HUD editor — ISOLATED side
TankiQoL.HudStore.get();          // the whole stored object
TankiQoL.HudEditor.open();        // opens it without the Settings button
TankiQoL.HudRecipes.get();        // the geometry read out of the bundle, per layout
TankiQoL.HudRecipes.get().covered;                // which elements it managed to read
TankiQoL.HudRecipes.get().game;                   // {names, offsets} sent to MAIN for this build
TankiQoL.HudRecipes.forLayout("default").radar;   // one element's recipe
TankiQoL.HudRects.forLayout("default");           // the rects the editor draws
TankiQoL.HudRects.pivots();                       // …and what MAIN turns about
TankiQoL.HudDom.rects();                          // the HTML elements, measured on the hidden copy
TankiQoL.HudDomCatalog.ELEMENTS.map((e) => [e.id, e.find(TankiQoL.HudDomCatalog.live() || document, TankiQoL.HudDomCatalog.liveClass).length]);
                                                  // in battle: how many live nodes each one found

// translator (MAIN world)
__CT_STATE(); // settings + discovered names + debug counters + capture status
__CT_DEBUG; // {discovered, captured, intercepts, translations, rebuilds,
//  replayAdopts, skipped, lastError, names, ...}
__CT_MSGS; // recorded messages (text, translation, lang, state, ...)
__CT_HUD; // the captured HUD instance (null until you enter a battle)
__CT_TOGGLE(); // flip all original<->translation
__CT_TOGGLE_LAST(); // flip the last translated message
__CT_SKIP_WORDS.add("foo"); // extend the no-translate slang set live
__CT_NOTR("some text"); // would this text be skipped?
```

The POC-era write probes (`__CMB_TRY_NATIVE`, `__CMB_PROTECTIONS`,
`__CMB_AUGMENTS`, `__CMB_TRY_SKIN`, …) were removed once the equip path shipped.
If you ever need to isolate a single failing slot again, call the internals
directly — they are all on `__CMB.internals` (e.g.
`__CMB.internals.applyProtections(['id1', null, null, null])`).

Note: `chrome.*` only exists in the ISOLATED world. In the page console (where
`__CMB` lives) `chrome.storage` is undefined — read storage from the extension's
own console context instead.

## Symptom → cause

| Symptom                                                                   | Likely cause                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `__CMB.state() === null` after opening the garage                         | the trap never validated: either discovery failed (`__CMB.debug.discovered === false`) or the game restructured its garage state                                                                 |
| a mounted item is missing from `__CMB.read().combo`                       | its category isn't in `CATEGORY_TO_SLOT` (`discovery/game/names.js`) — it will be sitting in `read().other` with its category name                                                               |
| a skin never applies and the current one stays                            | the ownership check read a shop duplicate of the same item. Compare `__CMB.internals.collect(__CMB.internals.latestState).byId.get('<skinId>')` against every copy in `.items` — the owned one must win                                                       |
| a slot equips as `unavailable` although the user owns it                  | the item didn't resolve — check `baseItemId` on the stored combo (run the migrator) and `owned` in `__CMB.index()`                                                                               |
| an augment reports `unavailable` right after a refresh                    | its catalog hadn't loaded; `equip/game/device_catalog.js` should have requested it — check `debug.catalogRequests`                                                                               |
| equipping does nothing at all, no error                                   | an action was probably built with `Object.create` somewhere, or a ctor lookup returned a shell — every action must come from `new proto.constructor(...)`                                        |
| clicking a combo does nothing and the cards look dim                      | the equip cooldown is running — `__CMB.internals.mountCooldown()` reports `active`. Correct behaviour: the server would reject the change                                          |
| a combo equips but the old loadout is back after a refresh                | the cooldown was active and we dispatched anyway — check `__CMB.names().stateFields.delayMountTimeMs` survived discovery, and that `__CMB.debug.cooldownBlocks` moves              |
| the combo count looks short / an owned item "missing"                     | the graph scan may have truncated: check `__CMB.debug.depthCut` and `.truncated`                                                                                                                 |
| the paints tab (or any tab's content) shows through under the combos view | the game rendered it after `show()` did its one-off hiding — the guard (`view/hide_guard.js`) is off: check `ViewRenderer.hideGuardObserver`, and that the file is in `manifest.json`            |
| the 3D tank is blank / won't drag while the combos view is open           | a preview host ended up `display:none` — look for an inline `display:none` on `PREVIEW_HOSTS` **without** `data-cme-preview-hidden`, which means something outside `keepTankPreviewAlive` hid it |
| the advisor block never appears in the protection tab                     | check `__ADV.raw()`: `battle` not loaded (no battle), the equip cooldown is active, or no module passes the 30% bar. `__ADV.debug` counters at 0 mean the traps never fired — a new build rotated the field names AND discovery failed: `discovered === false` means `recon/detect.js` never delivered (fetch failed, or `discover()` returned null — run `test_advisor_discover.js` on the new bundle) |
| advisor slots show item boxes instead of the small turret icons           | the icon harvest from the game's list found nothing (virtualised list?) and the fallback images are in use — cosmetic, `panel_render.js` `harvestIcons`                                          |
| the HUD editor's screen is empty ("enter a battle once")                  | nothing was ever measured for this layout: `__HUD.debug.measures === 0`. Either no battle was entered with the extension on, or the offsets are stale (below)                                    |
| the HUD editor shows some elements but not others                         | those elements were hidden every time a measurement ran. `__HUD.measure()` in battle shows what is currently measurable; records merge per element, so entering a battle where they show fixes it |
| another extension's battle-HUD tweaks stop working (e.g. Tanki Tweaks' Tab table turns half-transparent) | something of ours put a game class name of the battle HUD on the page — they watch the document for them. The hidden copy must use `HudDomCatalog.ghostClass` names only (`cme_` + the game's name) |
| nothing moves in battle although the editor saved it                      | `__HUD.nodes()` — if `role` is `null` everywhere, the add-site table is wrong for this build. `__HUD.debug.names === "seed"` on a new build means discovery never delivered: check `TankiQoL.HudRecipes.get()` (null = `engine.js` failed), and run `test_hud_builds.js` with the new bundle in `research/` — it names the anchor that broke |
| an element jitters or drifts every frame                                   | a layout pass is being transformed: `__HUD.debug.layoutCalls` should climb while `renderCalls` climbs too. A new element type whose `o4o` was not wrapped will do this                            |
| `__CT_DEBUG.discovered === false` after a few seconds                     | `detect.js` couldn't parse the bundle — see the recovery procedure in `translator.md`                                                                                                            |
| `__CT_HUD === null` after entering a battle                               | the trap never validated: the offset field name is wrong                                                                                                                                         |
| translations missing but `intercepts` climbing                            | check `__CT_DEBUG.lastError` — likely the service-worker fetch failed                                                                                                                            |

## Offline harnesses

There is no test framework here. What exists is **`build/harnesses/`** — plain
`node <file>` scripts, no dependencies, that run the _shipped_ code offline
against the bundles in `../../../research/`. They live under `build/`, so they
never reach the store zip. ~600 checks across 24 files (plus `fake_dom.js`, a
shared minimal DOM the UI harnesses build real elements in):

- **`verify_shipped.js`** — loads `discovery/*.js` as shipped, runs
  `discover()` against every bundle in `research/`, and diffs the result for the
  current build against the seed in `discovery/game/names.js`. A stale seed or a
  broken regex fails loudly instead of silently degrading in-game. **Run it after
  any change to discovery, and bump `CACHE_VERSION` when the output shape
  changes.**
- **`test_write_path.js`** — loads every MAIN-world `game/` file into a `vm` sandbox
  with a fake store and state, then asserts which actions each write dispatches:
  the protection set-diff, augment ownership rejection, skins. The write logic is
  tested without touching the game.
- **`test_read_path.js`** — the same sandbox, the other direction: `readCombo`
  and `readIndex` over a fake state, and the bridge end to end — the `ready`
  handshake, a request in and the matching reply out.
- **`test_migrator.js`**, **`test_instant_loader.js`**, **`test_instant_saver.js`**,
  **`test_card_render.js`**, **`test_protection_equal.js`**,
  **`test_equip_entry.js`**, **`test_random_draw.js`**,
  **`test_combo_identity.js`** — same idea for the ISOLATED-side modules, the
  randomiser's draw filters and the equipped-combo marker (Mk
  families, imported combos, the fallback split, the card HTML for both data
  generations, what clicking a card does end to end, and the Enter-shortcut
  guard that once saved ghost combos from battle chat).
- **`test_advisor_discover.js`** — the advisor's trap-field discovery
  (`recon/discover.js` as shipped) against every bundle in `research/`, plus a
  diff of the current build against the `SEED` in `recon/game/probe.js`. The
  advisor's twin of `verify_shipped.js` — run it (and refresh the SEED) when a
  new bundle lands.
- **`test_advisor_probe.js`** — `probe.js` in a sandbox: the SEED captures
  immediately, discovered names arm on arrival, a stranger class on a trapped
  field is ignored, malformed names are refused, and a field owned by a foreign
  trap is left alone. Its real target is the **crossed-name** case — discovery
  handing a field the SEED already armed for a *different* class. The names come
  from one generator (`hpw_1` was `BattleUsers` in c4428a58, `lpw_1` is
  `BattleStatistics` today), so the crossing is plausible, and skipping an
  already-armed field would kill that capture with no error anywhere.
- **`test_advisor_recommend.js`** — the advisor's pure model on invented
  battles: Armadillo's slot, the 30% bar, ownership, unknown turrets, the
  already-equipped set comparison, and that ranking order is authoritative.
- **`test_whats_new.js`** — the update modal's gate: shown once per news
  version, every way of closing it counts as acknowledged, an older stored
  version means "show again", and `reset()` really clears the key. Both failure
  modes here are silent — popping up every single time, or never again.
- **`test_view_layer.js`** — the odd one out: it reads `styles.css`,
  `template.js` and `tank_preview.js` as **text**, because what it guards is a
  stacking/hit-testing contract, not logic. The view must stay
  `pointer-events: none` and outrank the game's drag box, the preview host must
  not be given a `z-index`, and every interactive element must sit inside a
  region that takes pointer events back (see the tank-preview section of
  `combos.md`). It cannot tell you whether the layer actually behaves — only a
  browser can.

- **`test_hud_builds.js`** — the whole HUD discovery on **every** bundle in
  `research/`: every name MAIN needs, one add site per element (five for the
  status), the full geometry, identical across builds; `7f05e212` and
  `f1de53fa` against the offsets measured live, and the latest bundle against
  the seed in `capture/game/names.js`. ~17 s. Drop a new bundle in `research/`
  and run it before anything else.
- **`test_hud_discovery.js`** — the geometry parser against the **real bundle**
  in `research/`: the four scaling strategies are identified, and the recipes for
  the radar, bars, overdrive, grenades and supplies come out of the game's own
  literals and **reproduce the developer's live measurement** — logical box and
  pixel rect, to a hundredth of a pixel, in both layouts. It is the check that
  ties the static read to what the game actually draws; if a new build moves the
  numbers, this is what says so.
- **`test_hud_model.js`**, **`test_hud_capture.js`**, **`test_hud_editor.js`** —
  the HUD editor in three layers. The model one is pure geometry: the same
  preference replayed on another resolution and another UI scale. The capture
  one builds a **fake engine** in a `vm` sandbox — scene nodes, a scaling
  strategy, a HUD root whose ctor writes the trapped field last — and proves
  the whole MAIN side on it: the traps fire, two elements added by the same
  one-line function share an offset while different adders differ, the supply
  row splits by screen side, the transform moves/scales/fades only the element
  it was given, a draw inside a layout pass is left alone, and the bridge
  answers — and that a new build's names (`hudGame`) re-arm the traps on the
  new fields, while a partial set is ignored. The editor one drives the stage over the fake DOM: drag, the 5 px
  click threshold, overlap refusal, edge clamping, locked elements, undo and
  reset.
- **`test_hud_dom.js`** — the HTML elements and the chat's opacity, on a fake
  DOM and a fake WebGL. The preferences land on the live nodes as
  translate/scale/opacity about the right origin (the chat input about the
  chat's pivot); the hidden copy carries the game's class names only behind
  `cme_`, and the live selectors never match it; the chat's shaders get the
  opacity uniform and no other program is touched.
- **`test_components.js`** — the shared button, slider and dialog, plus the two
  modals that now run on them. Guards that every way of closing a dialog fires
  `onClose` exactly once and removes its Escape listener.
- **`test_namespaces.js`** — structural, not behavioural: no two modules may
  claim the same `window.TankiQoL` name, and no name may be read that nothing
  defines. A collision is otherwise silent — the later file wins and the earlier
  module quietly ceases to exist.

They hold **absolute paths** to this repo and to `research/`, so they run from
anywhere but break if either moves. When you split or move a source file, update
the file list at the top of the harness that loads it.
