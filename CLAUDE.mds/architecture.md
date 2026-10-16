# Architecture

## Three execution contexts, and why

Chrome content scripts run in an **ISOLATED** JS world by default. That is fine
for DOM work, but two things need more:

- Hooking the game's own objects (`Object.prototype` traps, dispatching the
  game's Redux actions) only works in the page's **MAIN** world, which has no
  `chrome.*`.
- In MV3 a content-script `fetch` is still subject to the page's CORS policy, so
  the translation call can't live in a content script at all — it goes to the
  **service worker**, the only context allowed to read cross-origin responses for
  hosts in `host_permissions`.

| Context | Who runs there | Has |
|---|---|---|
| ISOLATED | every UI, every bundle discovery and every bridge's ISOLATED side: combos, advisor (`recon/` discovery, model, view), HUD (`discovery/`, model, `dom/`, editor), translator `isolated/` | `chrome.storage`, `chrome.runtime`; no access to page JS |
| MAIN | every `game/` folder (combos, advisor, HUD), `features/translator/main/*` | the page `window`; no `chrome.*` |
| Service worker | `background.js` | `fetch` with `host_permissions` |

The two worlds talk over `window.postMessage`, every message tagged (`__cmb` for
combos, `__adv` for the advisor, `__hud` for the HUD editor, `__ct` for the
translator) with a direction (`i2m` / `m2i`) and a
`ready` handshake covering the race where one side broadcasts before the other's
listeners exist.

## Namespaces

Content scripts can't use ES modules, so modules share namespace objects on
`window`. Each world has its own `window`, so the same name can exist twice.

| Namespace | World(s) | Holds |
|---|---|---|
| `window.TankiQoL` | ISOLATED (combos + advisor + HUD) + MAIN (translator, and the HUD's `HudElements`) | the shared components (`.Switch`, `.Select`, `.Drawer`, `.Button`, `.Slider`, `.Dialog`, `.Icons`), in ISOLATED the bundle pipeline every discovery runs on (`.Bundle`), and every combos, advisor and HUD module (`.DOM`, `.ViewRenderer`, `.GarageBridge`, `.AdvisorPanel`, `.HudEditor`, `.HudRecipes`, `.HudParse`, …) |
| `window.__CT` | MAIN | translator internals: `.settings`, `.translate`, `.skip`, `.bidi`, `.rebuild()` |
| `window.__CMB` | MAIN | garage hook: `.read()`, `.index()`, `.names()`, `.state()`, `.debug`, and `.internals` (shared by every `game/` file) |
| `window.__ADV` | MAIN | advisor battle probe: `.debug`, `.raw()`, and `.internals` (shared by its `game/` files) |
| `window.__HUD` | MAIN | HUD editor: `.debug`, `.state()`, `.nodes()`, `.groups()`, `.measure()`, `.overrides()`, and `.internals` |
| `__CT_*` | MAIN | translator console helpers — see `debugging.md` |

## manifest.json — 10 content-script blocks

JSON has no comments, so the reasoning lives here. **Do not merge these blocks.**

| # | Contents | `run_at` | World | Why separate |
|---|---|---|---|---|
| 0 | **all CSS** | `document_start` | n/a | CSS is not world-scoped, so one block serves every feature. Early injection avoids a flash of unstyled injected UI. Array order = cascade order. |
| 1 | `shared/bundle.js` + translator `isolated/` | `document_start` | ISOLATED | The translator's only access to `chrome.*`. Must start early so its discovery is registered before the bundle URL appears. |
| 2 | `shared/bundle.js` + combos `discovery/` + `bridge/bridge.js` | `document_start` | ISOLATED | Same reason for the garage hook: the names must reach MAIN before the lobby loads the garage. Also defines `TankiQoL.GarageBridge`, which block 5 uses. |
| 3 | every combos `game/` file | `document_start` | MAIN | Needs the page's own `window` for the `Object.prototype` traps. Must be `document_start`: its listeners have to exist when the names arrive, and the traps are armed the moment they do — before the game builds what they catch. |
| 3a | `shared/bundle.js` + advisor `recon/discover.js` + `recon/detect.js` | `document_start` | ISOLATED | The advisor's trap-field discovery — needs `chrome.storage` for its cache. Kept out of block 2 for the same removability reason as 3b. |
| 3b | advisor `recon/game/` + `bridge/game/` | `document_start` | MAIN | Same trap technique for the battle state. Kept out of block 3 — a different feature must stay separately removable. |
| 3c | HUD `model/elements.js` + `capture/game/` + `apply/game/` + `bridge/game/` | `document_start` | MAIN | Traps the HUD root and the battle settings, and shadows the two render methods — all of it must be armed before a battle builds its HUD. `capture/game/modules.js` must also run before the bundle does: it collects the Kotlin modules' export tables as they are created (the navigation to Settings → Controls takes its functions from them). Within `apply/game/`, `overrides.js` and `push.js` come before `transform.js`, which calls them. Its own block for the same removability reason as 3a/3b. |
| 3d | `shared/bundle.js` + HUD `model/layout.js` + `discovery/` | `document_start` | ISOLATED | Reads this build's names, add sites, geometry and the way to Settings → Controls out of the bundle and posts the names to 3c — early, for the same reason as block 2: the BattleSettings trap has to be on the right field before the game builds its settings. Defines `TankiQoL.HudRecipes`, which block 5 reads. `layout.js` comes first: the geometry is composed with it. |
| 4 | translator `main/` | `document_start` | MAIN | Same, for the chat HUD. |
| 5 | `shared/` + combos (DOM side) + advisor (model + view) + HUD (model, dom, editor) | `document_idle` | ISOLATED (default) | Pure DOM work that only makes sense once the page exists. Its internal order is the dependency chain below. The advisor loads after combos because it calls `InstantLoader`; the HUD editor loads last because it uses the shared components and combos' selectors. |

`shared/components/switch.js` and `select.js` appear in **both** block 4 and
block 5, and `features/hud/model/elements.js` in both block 3c and block 5. Not
a mistake: JS worlds don't share a `window`, so each world needs its own copy.

`shared/bundle.js` is the other way round: it heads all four discovery blocks
(1, 2, 3a, 3d), which share **one** ISOLATED world. Listing it in each keeps every
block removable on its own; the first copy defines `TankiQoL.Bundle` and the
others return at once. Every `detect.js` registers its discovery with it.

Blocks 2 and 5 are both combos and both ISOLATED but must stay separate: block 2
is the bridge to the game's internals and has to be armed at `document_start`,
block 5 can't run until the page exists.

## Load order

Scripts load in the exact order listed. **A file that isn't in the manifest never
loads.** Within block 5 the order is:

1. `shared/icons.js` + `shared/components/` — no dependencies
2. `features/combos/lib/` (constants, utils, language, cleaner) — no dependencies
3. `migration/`, `dom/`, `save/`, `equip/`, `randomizer/` — depend on lib
4. `features/combos/view/` — base file first, then its mixins (`view/card/*`
   after `combo_card_renderer.js`, `view/*.js` after `view_renderer.js`)
5. `features/combos/main.js` — orchestrates combos
6. `features/advisor/` — bridge, model, view, `main.js`; because it
   equips through combos' `InstantLoader`
7. `features/hud/` — last, because the editor uses the shared components and
   combos' `DOM` selectors. Inside it: `model/` (without `rects.js`, and
   without `layout.js`, which block 3d already loaded); bridge, store; `dom/` —
   catalog, markup, ghost; then `model/rects.js`, which reads the ghost; `dom/apply.js`; `editor/` — shapes,
   `stage_rules.js` before `stage.js`, drag, topbar, viewport, `editor_screen.js`,
   settings button; `main.js`

Every discovery block starts with `shared/bundle.js`, which its `detect.js`
registers with. Block 3d (the HUD discovery) is then `layout.js`, then `read.js`
— every other `HudParse` file destructures its helpers at load — then the
readers (`killlog.js` and `navigation.js` among them), then `compose.js`, and
`detect.js` last.

Block 3 (the MAIN-world files) ends with `discovery/game/boot.js`, which tells
ISOLATED that every listener is up. No trap is armed until the names arrive.
In block 3c, `capture/game/modules.js` follows `names.js` and `trap.js` (it
reports errors through `NS.debug`), and `apply/game/navigate.js` comes before
`bridge/game/bridge_main.js`, which calls it.

## Storage layout

**One storage key per feature.** `chrome.storage` is a single flat namespace, so
a feature must not scatter loose generic keys into it.

| Area | Key | Owner | Contents |
|---|---|---|---|
| `local` | `savedCombos` | combos | the combo array (shape in `combos.md`) |
| `local` | `equipProtectionsOnLoad` | combos | bool — include protections when equipping |
| `local` | `autoOpenCombosOnGarageEntry` | combos | bool |
| `local` | `randomizerSettings` | combos | randomizer options object |
| `local` | `whatsNewSeenVersion` | combos | the news version the user acknowledged |
| `local` | `garageConstants:v<N>:<bundle url>` | combos | cached per-build discovery result |
| `local` | `advisorFields:v<N>:<bundle url>` | advisor | cached per-build trap fields |
| `local` | `hudLayout` | HUD editor | per-layout element preferences + the measured geometry (shape in `hud.md`) |
| `local` | `hudGame:v<N>:<bundle url>` | HUD editor | cached per-build names + add sites (what MAIN gets) |
| `local` | `hudRecipes:v<N>:<bundle url>` | HUD editor | cached per-build geometry discovery |
| `local` | `hudNavigation:v<N>:<bundle url>` | HUD editor | cached per-build way to Settings → Controls (export-table keys + source heads) |
| `local` | `hudConstants:v<N>:<bundle url>` | translator | cached per-build discovery result |
| `sync` | `translator` | translator | `{ enabled, showOriginal, targetLang }` |

Every discovery cache entry is `{ext, data}`: the result, and the extension
version that produced it. `shared/bundle.js` owns all of them (see "Names come
only from the bundle" below). Each one keeps only the current build's key —
older builds and older `v<N>` are removed when it runs.

Combos data is larger and device-specific → `local`. Translator preferences are
tiny and worth syncing across devices → `sync`. Different areas *and* different
names, so no collision.

## Names come only from the bundle

**There is no minified name anywhere in the extension.** No seed, no "latest
known build" fallback: every trap field, class and method name MAIN uses comes
from discovery reading the live bundle. Until a feature's names arrive its MAIN
side arms nothing and answers every request "not yet" (combos then falls back to
the DOM path). `build/harnesses/test_no_names.js` fails if a `xx_1`-shaped
literal or a `SEED` constant ever creeps back into the shipped code.

That makes **how fast** the names arrive the whole game, so the four
discoveries run on one pipeline, `shared/bundle.js`:

- **One download.** The bundle is fetched once, however many discoveries need it.
- **Priority = when the game builds the object.** The HUD's names go first
  (`BattleSettings` is built while the game boots), then combos (the garage
  proxy, built once when the lobby loads the garage), the advisor (the `User`, at
  login), the translator (the chat HUD, per battle), and the HUD's geometry and
  its navigation to Settings → Controls last (only the editor and the news
  popup's button need them). Each result is posted before the next discovery
  starts, so MAIN has it ~0.5 s after the download instead of after all ~2 s.
- **Cache per build, refreshed per release.** A cache entry made by this
  version of the extension is used as is — on every load but the first of a
  build, the names reach MAIN within milliseconds, long before the game has run.
  An entry made by an *older* version is posted at once too, then rediscovered in
  the background and posted again only if it changed: an update that fixes an
  anchor reaches every user, without making the first load after the update
  wait for a cold discovery. (It happened that a fix did not reach users: the
  HUD's tank roles on `6a85fbcf` were cached broken by the release before.)

The cost is the very first load of a **new** build: the names arrive about half
a second after the bundle is downloaded, and an object the game built before
that is missed until it is built again — the HUD's `BattleSettings` until a
battle setting changes, the garage proxy until the next reload. A reload fixes
it, and from then on the cache answers first.

**One trap is armed before any names, on a compiler name.** Every Kotlin module
of the bundle ends with `t.$_$=t.$_$||{}` on its webpack `exports`: `$_$` is the
Kotlin/JS compiler's cross-module export table, the same in every build and in
every Kotlin program, not a game name. `features/hud/capture/game/modules.js`
puts a setter for it on `Object.prototype` at `document_start` and keeps each
table as the module creates it. That is how MAIN reaches functions no live
object holds (the classes behind the game's navigation — `hud.md`); discovery
says which table entry is which. Each module writes `$_$` once and owns it from
then on, so the trap costs nothing after startup.

**Replaced names come off `Object.prototype`.** When newer names replace older
ones (an old-version cache refreshed in the background), each feature removes the
traps it no longer uses — only if the descriptor there is still its own, and
never a field the new names still use (a name can move to another role between
builds; that field is re-armed for the new role). On another build a stale name
belongs to some other class, possibly a hot one: on `6a85fbcf` an old advisor
name landed on the root Redux state, rebuilt on every action. The four harnesses
that load the MAIN hooks check it (`test_read_path.js`, `test_advisor_probe.js`,
`test_hud_capture.js`, `test_translator_chat.js`).

## Source tree

**The folders follow the flow, not the JS world.** One rule keeps the worlds
straight: **anything under a `game/` folder runs in MAIN**, everything else in
ISOLATED.

```
features/combos/
├── main.js                    # MutationObserver orchestrator, always last
├── styles.css
├── lib/                       # no dependencies of their own
│   ├── constants.js           #   every game DOM selector, in one place
│   ├── utils.js
│   ├── language_manager.js    #   11 languages, auto-detected from the UI
│   └── combo_cleaner.js       #   removes stale/empty combos
│
├── discovery/                 # stage 0 — find this build's minified names
│   ├── parse.js               #   toString -> {semantic: minified} maps
│   ├── state.js               #   state/item classes, trap field, read extras
│   ├── send.js                #   the garage proxy, mount + select actions
│   ├── actions.js             #   resistance / device / skin write actions
│   ├── index.js               #   discover() = compose the above
│   ├── detect.js              #   register with shared/bundle.js, send the names to MAIN
│   └── game/
│       ├── names.js           #   the names discovery sent (none before) + debug counters
│       └── boot.js            #   announce ready (loads last)
│
├── bridge/                    # the pipe between the worlds
│   ├── bridge.js              #   TankiQoL.GarageBridge — request/reply
│   └── game/bridge_main.js    #   the MAIN side
│
├── capture/game/              # stage 1 — hold the game's live state
│   ├── capture.js             #   the Object.prototype traps
│   ├── collect.js             #   structural scan of the state graph
│   └── kotlin.js              #   enum / Long / image / Mk / upgrade readers
│
├── save/                      # stage 2 — "save combo"
│   ├── instant_saver.js       #   THE save path
│   ├── game/read.js           #   readCombo / readIndex
│   └── old/combo_saver.js     #   LEGACY (DOM) — kept, wired to nothing
│
├── view/                      # stage 3 — the combos UI
│   ├── menu_injector.js       #   injects the COMBOS tab
│   ├── view_renderer.js       #   the view object: init, show/hide
│   ├── template · events · scroll · drag        #   its mixins
│   ├── combo_list · combo_actions · delete_animation
│   ├── tank_preview · hide_guard                #   keep the game's 3D view alive
│   ├── cooldown_guard.js/.css #   block equipping while the game is cooling down
│   ├── card/                  #   combo_card_renderer + rows, events, title_edit,
│   │                          #   combo_drag_handler, combo_card.css
│   ├── lobby/                 #   button, C shortcut, auto-open, lobby_button.css
│   └── panels/                #   delete modal, randomizer settings, import/export,
│       │                      #   whats_new_modal (once per NEWS_VERSION) — all on Dialog
│       └── old/               #   LEGACY: the hand-built modals, wired to nothing
│
├── equip/                     # stage 4 — clicking a combo
│   ├── instant_loader.js      #   decides WHAT to apply
│   ├── combo_identity.js      #   already equipped? same combo twice?
│   ├── game/
│   │   ├── apply.js           #     decides HOW — the whole-combo orchestrator
│   │   ├── store.js           #     find the store, build actions, resolve ctors
│   │   ├── mount.js           #     mount an item + select it (3D model)
│   │   ├── protections.js     #     the 4 resistance slots, set-based diff
│   │   ├── devices.js         #     augments: install / remove, ownership
│   │   ├── device_catalog.js  #     lazy catalogs: request + wait
│   │   ├── skins.js           #     apply a turret/hull skin
│   │   └── cooldown.js        #     the game's equip cooldown (deadline, not duration)
│   └── old/                   #   LEGACY (DOM) — per-slot fallback
│       ├── combo_loader.js
│       └── equippers/         #     base_item, augment, protection
│
├── migration/                 # stage 5 — backfill ids on old combos
│   ├── combo_migrator.js      #   runs on every combo-list load
│   └── migrator_match.js      #   name → item, Mk families
│
├── randomizer/                # randomizer.js = the sequence; random_from_saved
│   ├── random_full.js         #   native full random
│   ├── game/draw.js           #   [MAIN] the draw itself — every filter needs state
│   └── old/                   #   LEGACY (DOM): random_full + item_list_scanner
│
└── dom/                       # the DOM toolbox the old paths and random_full use
    ├── scanners/              #   base_item, augment, protection — READ only
    ├── tab_navigator.js       #   navigates between garage tabs
    └── navigation_helpers.js  #   MutationObserver-based waiting

shared/
├── bundle.js                  # [ISOLATED] the live bundle for every discovery: fetch, cache, order
├── icons.js                   # SVG paths more than one feature draws
└── components/                # drawer / switch / select / button / slider / dialog
    #   dialog.js is the game's modal chrome (danger = red, warning = yellow);
    #   every modal in the extension goes through it. button.js and slider.js
    #   are the game's own green button and settings slider.

features/advisor/              # recommended protections — see advisor.md
├── main.js                    # starts the panel while the garage is on screen
├── recon/                     # the battle state — capture only, no output
│   ├── discover.js            #   [ISOLATED] trap-field discovery from the bundle
│   ├── detect.js              #   [ISOLATED] register with shared/bundle.js, send fields to MAIN
│   └── game/                  #   [MAIN]
│       ├── report.js          #     parse the roster, rank turrets by kills
│       ├── inventory.js       #     the account's protection modules + percentages
│       └── probe.js           #     the four traps, on the discovered names
├── bridge/                    # its own pipe, tagged __adv
│   ├── bridge.js              #   TankiQoL.AdvisorBridge
│   └── game/bridge_main.js    #   [MAIN] answers {turrets, modules, flags}
├── model/                     # pure — no chrome, no DOM, no game objects
│   ├── resistance_map.js      #   turret baseItemId -> resistance enum, 30% bar
│   └── recommend.js           #   ranking + inventory -> {ordered, equip}
└── view/
    ├── panel_render.js        #   builds the DOM, harvests the game's icons
    ├── protection_panel.js    #   injection, runtime placement, equipping
    └── protection_panel.css

features/hud/                  # the battle HUD editor — see hud.md
├── main.js                    # injects the editor button while Settings is open; the news button's destination
├── store.js                   # the one storage key: hudLayout
├── model/                     # pure — catalogue, geometry, replay, push, overlap, undo
├── discovery/                 # names, add sites, geometry and the way to Settings → Controls (TankiQoL.HudParse)
├── capture/game/              # [MAIN] the HUD root, the layout, the measurements, the Kotlin export tables
├── apply/game/                # [MAIN] overrides + push + the single render hook; chat alpha; navigation
├── dom/                       # the HTML elements: catalogue, hidden copy, live apply
├── bridge/                    # its own pipe, tagged __hud
└── editor/                    # the settings button (and the way there), the screen, stage, shapes, drag

features/translator/
├── isolated/                  # [ISOLATED] the only chrome.* access
│   ├── bridge.js              #   storage sync + translate relay to the SW
│   └── detect.js              #   the chat HUD's names, via shared/bundle.js
├── main/                      # [MAIN]
│   ├── settings.js            #   __CT.settings (subscribe/get/set)
│   ├── skiplist.js            #   __CT.skip — no-translate slang
│   ├── translate.js           #   __CT.translate — request, cache, timeout
│   ├── bidi.js                #   __CT.bidi — RTL logical→visual
│   ├── chat.js                #   THE CORE: capture, intercept, rebuild
│   ├── gamesettings.js/.css   #   controls inside the game's Settings screen
│   └── toggle.js              #   in-battle toggle button + Alt+T
└── assets/flags/*.svg         # web_accessible_resources
```
