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
| ISOLATED | all of combos (DOM + discovery + bridge), translator `isolated/` | `chrome.storage`, `chrome.runtime`; no access to page JS |
| MAIN | `features/combos/**/game/*`, `features/translator/main/*` | the page `window`; no `chrome.*` |
| Service worker | `background.js` | `fetch` with `host_permissions` |

The two worlds talk over `window.postMessage`, every message tagged (`__cmb` for
combos, `__ct` for the translator) with a direction (`i2m` / `m2i`) and a
`ready` handshake covering the race where one side broadcasts before the other's
listeners exist.

## Namespaces

Content scripts can't use ES modules, so modules share namespace objects on
`window`. Each world has its own `window`, so the same name can exist twice.

| Namespace | World(s) | Holds |
|---|---|---|
| `window.TankiQoL` | ISOLATED (combos + advisor) + MAIN (translator) | the shared components (`.Switch`, `.Select`, `.Drawer`, `.Icons`), and in ISOLATED every combos and advisor module (`.DOM`, `.ViewRenderer`, `.GarageBridge`, `.AdvisorPanel`, …) |
| `window.__CT` | MAIN | translator internals: `.settings`, `.translate`, `.skip`, `.bidi`, `.rebuild()` |
| `window.__CMB` | MAIN | garage hook: `.read()`, `.index()`, `.names()`, `.state()`, `.debug`, and `.internals` (shared by every `game/` file) |
| `window.__ADV` | MAIN | advisor battle probe: `.debug`, `.raw()`, and `.internals` (shared by its `game/` files) |
| `window.__HUD` | MAIN | HUD editor: `.debug`, `.state()`, `.nodes()`, `.groups()`, `.measure()`, `.overrides()`, and `.internals` |
| `__CT_*` | MAIN | translator console helpers — see `debugging.md` |

## manifest.json — 9 content-script blocks

JSON has no comments, so the reasoning lives here. **Do not merge these blocks.**

| # | Contents | `run_at` | World | Why separate |
|---|---|---|---|---|
| 0 | **all CSS** | `document_start` | n/a | CSS is not world-scoped, so one block serves both features. Early injection avoids a flash of unstyled injected UI. Array order = cascade order. |
| 1 | translator `isolated/` | `document_start` | ISOLATED | The only place with `chrome.*`. Must start early so bundle discovery finishes before the user enters a battle. |
| 2 | combos `discovery/` + `bridge/bridge.js` | `document_start` | ISOLATED | Same reason for the garage hook: discovery must finish before the garage opens. Also defines `TankiQoL.GarageBridge`, which block 5 uses. |
| 3 | every combos `game/` file | `document_start` | MAIN | Needs the page's own `window` for the `Object.prototype` traps. Must be `document_start` — the state is built later, but the trap has to be armed first. |
| 3a | advisor `recon/discover.js` + `recon/detect.js` | `document_start` | ISOLATED | The advisor's trap-field discovery — needs `chrome.storage` for its cache. Kept out of block 2 for the same removability reason as 3b. |
| 3b | advisor `recon/game/` + `bridge/game/` | `document_start` | MAIN | Same trap technique for the battle state. Kept out of block 3 — a different feature must stay separately removable. |
| 3c | HUD `model/elements.js` + `capture/game/` + `apply/game/` + `bridge/game/` | `document_start` | MAIN | Traps the HUD root and the battle settings, and shadows the two render methods — all of it must be armed before a battle builds its HUD. Within `apply/game/`, `overrides.js` and `push.js` come before `transform.js`, which calls them. Its own block for the same removability reason as 3a/3b. |
| 3d | HUD `model/layout.js` + `discovery/` | `document_start` | ISOLATED | Reads this build's names, add sites and geometry out of the bundle and posts the names to 3c — early, for the same reason as block 2: the BattleSettings trap has to be on the right field before the game builds its settings. Defines `TankiQoL.HudRecipes`, which block 5 reads. `layout.js` comes first: the geometry is composed with it. |
| 4 | translator `main/` | `document_start` | MAIN | Same, for the chat HUD. |
| 5 | `shared/` + combos (DOM side) + advisor (model + view) + HUD (model, dom, editor) | `document_idle` | ISOLATED (default) | Pure DOM work that only makes sense once the page exists. Its internal order is the dependency chain below. The advisor loads after combos because it calls `InstantLoader`; the HUD editor loads last because it uses the shared components and combos' selectors. |

`shared/components/switch.js` and `select.js` appear in **both** block 4 and
block 5, and `features/hud/model/elements.js` in both block 3c and block 5. Not
a mistake: JS worlds don't share a `window`, so each world needs its own copy.

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
   without `layout.js`, which block 3d already loaded); bridge, store; `dom/` — catalog, markup, ghost; then
   `model/rects.js`, which reads the ghost; `dom/apply.js`; `editor/` — shapes,
   `stage_rules.js` before `stage.js`, drag, topbar, viewport, `editor_screen.js`,
   settings button; `main.js`

Block 3d (the HUD discovery) is `layout.js`, then `read.js` — every other
`HudParse` file destructures its helpers at load — then the readers, then
`compose.js`, and `detect.js` last.

Block 3 (the MAIN-world files) ends with `discovery/game/boot.js`, which arms the
traps once every other file has defined its half of `__CMB.internals`.

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
| `local` | `hudLayout` | HUD editor | per-layout element preferences + the measured geometry (shape in `hud.md`) |
| `local` | `hudRecipes:v<N>:<bundle url>` | HUD editor | cached per-build geometry discovery |
| `local` | `hudConstants:<bundle url>` | translator | cached per-build discovery result |
| `sync` | `translator` | translator | `{ enabled, showOriginal, targetLang }` |

Combos data is larger and device-specific → `local`. Translator preferences are
tiny and worth syncing across devices → `sync`. Different areas *and* different
names, so no collision.

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
│   ├── detect.js              #   fetch the bundle, cache, send to MAIN
│   └── game/
│       ├── names.js           #   seed names + debug counters + applyNames
│       └── boot.js            #   arm the traps, announce ready (loads last)
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
│                              #   whats_new_modal (once per NEWS_VERSION)
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
├── icons.js                   # SVG paths more than one feature draws
└── components/                # drawer / switch / select / button / slider / dialog
    #   dialog.js is the game's modal chrome (danger = red, warning = yellow);
    #   every modal in the extension goes through it. button.js and slider.js
    #   are the game's own green button and settings slider.

features/advisor/              # recommended protections — see advisor.md
├── main.js                    # starts the panel while the garage is on screen
├── recon/                     # the battle state — capture only, no output
│   ├── discover.js            #   [ISOLATED] trap-field discovery from the bundle
│   ├── detect.js              #   [ISOLATED] fetch + cache + send fields to MAIN
│   └── game/                  #   [MAIN]
│       ├── report.js          #     parse the roster, rank turrets by kills
│       ├── inventory.js       #     the account's protection modules + percentages
│       └── probe.js           #     the four traps: SEED + discovered names
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
├── main.js                    # injects the editor button while Settings is open
├── store.js                   # the one storage key: hudLayout
├── model/                     # pure — catalogue, geometry, replay, push, overlap, undo
├── discovery/                 # names, add sites and geometry, read out of the bundle (TankiQoL.HudParse)
├── capture/game/              # [MAIN] the HUD root, the layout, the measurements
├── apply/game/                # [MAIN] overrides + push + the single render hook; chat alpha
├── dom/                       # the HTML elements: catalogue, hidden copy, live apply
├── bridge/                    # its own pipe, tagged __hud
└── editor/                    # the settings button, the screen, stage, shapes, drag

features/translator/
├── isolated/                  # [ISOLATED] the only chrome.* access
│   ├── bridge.js              #   storage sync + translate relay to the SW
│   └── detect.js              #   parses the bundle -> HUD names
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
