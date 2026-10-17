# Feature: Battle HUD editor

Move, resize and fade every element of the battle HUD, edited on a placeholder
screen opened from the game's own Settings. Two independent sets of preferences,
one per game layout.

Minified names in this file (`o4o`, `z116`, `nut`…) are labels from the build a
thing was researched on, kept so the research notes can be followed. The code
never contains them: it reads every name out of the live bundle (`I.N`).

```
features/hud/
├── model/                    pure — no chrome, no DOM, no game objects
│   ├── elements.js           #   the catalogue: id, skeleton shape, per-layout movability
│   ├── geometry.js           #   the editor's transform, snapping, overlap area, clamping
│   ├── replay.js             #   HudReplay: a battle measurement onto this screen
│   ├── push.js               #   HudPush.stacked: a pushed element's rows, in the editor
│   ├── overlap.js            #   HudOverlap: the overlap rule, against the game's own
│   ├── layout.js             #   the game's own model: recipe -> box -> pixels
│   ├── rects.js              #   [ISOLATED] every element's box for this screen, and its pivot
│   ├── seed.js               #   fallback measurement for what discovery misses
│   └── history.js            #   the undo stack of one editing session
├── discovery/                [ISOLATED, document_start] everything build-specific, read out of the bundle
│   ├── read.js               #   the constant readers: lazy value, companion, Size literal
│   ├── engine.js             #   every minified name MAIN uses (I.N)
│   ├── roles.js              #   add-site offset -> element, per build
│   ├── modules.js            #   webpack modules and enum values across them
│   ├── strategies.js         #   the four scaling strategies; the radar
│   ├── tank.js               #   the bars and the active-effect rows
│   ├── abilities.js          #   overdrive and the nuclear ring
│   ├── supplies.js           #   which slots, in what order, and where
│   ├── texts.js              #   chat and battle status
│   ├── killlog.js            #   the kill feed: its window area, through the DESKTOP config
│   ├── navigation.js         #   the game's own way to Settings → Controls (export-table entries)
│   ├── assets.js             #   the SVG URLs and the rank image
│   ├── compose.js            #   discover(src) -> names, offsets, a recipe per element per layout
│   └── detect.js             #   three jobs on shared/bundle.js: names + offsets to MAIN first, then geometry, navigation
├── capture/game/             [MAIN] hold the game's live HUD
│   ├── names.js              #   the names MAIN needs (no values until discovery) + role → element; applyGame()
│   ├── trap.js               #   the Object.prototype trap + a tiny event bus
│   ├── modules.js            #   every Kotlin module's $_$ export table, as the bundle runs
│   ├── settings.js           #   BattleSettings + the hud service: layout & UI scale
│   ├── root.js               #   the HUD root; records who added each element
│   ├── groups.js             #   nodes → elements, including the supply-row split
│   └── measure.js            #   what rect the game gives each element, logical + pixels
├── apply/game/               [MAIN]
│   ├── overrides.js          #   the preferences and pivots from the bridge; each element's pivot
│   ├── push.js               #   I.pushed: the effects rows off the bars' live box
│   ├── transform.js          #   the single render hook: offset, scale, opacity
│   ├── chat_alpha.js         #   the chat's opacity, as a uniform in its own shaders
│   └── navigate.js           #   I.openControls: the game's two actions to Settings → Controls
├── dom/                      [ISOLATED] the HUD elements the game draws in HTML
│   ├── catalog.js            #   what each one is: the selectors, shared by battle and ghost
│   ├── markup.js             #   HudDomMarkup: the copy's tree, on cme_-prefixed classes
│   ├── ghost.js              #   the hidden copy, measured and cloned
│   ├── replica.css           #   the game's own rules for it, scoped to our copy
│   ├── replica_user.css      #   the same for the user info (the lobby's rules)
│   └── apply.js              #   the preferences on the live nodes, in battle
├── bridge/                   the pipe, tagged __hud
│   ├── bridge.js             #   [ISOLATED] TankiQoL.HudBridge
│   └── game/bridge_main.js   #   [MAIN] state out, settings + pivots in, measure / navigate on demand
├── store.js                  [ISOLATED] the one storage key, hudLayout
├── editor/
│   ├── settings_button.js    #   the HUD EDITOR button in Settings → Controls; goTo() gets there first
│   ├── editor_screen.js      #   the screen: lifecycle, keys, sliders -> stage
│   ├── topbar.js             #   HudTopbar: back, undo, reset, sliders, title
│   ├── viewport.js           #   HudViewport: the stage at the window's aspect, resize watch
│   ├── stage.js              #   the shapes, selection, commit, undo
│   ├── stage_rules.js        #   HudStageRules: where a shape lands, and what is refused
│   ├── drag.js               #   click vs drag, live preview, snapping
│   ├── shapes.js             #   the skeletons, drawn with the game's own SVGs
│   ├── editor.css            #   the screen, the header bar, the viewport
│   ├── frame.css             #   a shape's frame: selected, invalid, locked; the guides
│   └── skeletons.css         #   the skeletons' own parts
├── news/                     [ISOLATED] pointers to the editor until it is first opened
│   ├── state.js              #   HudNews: the hudNews flags + "the HUD is already edited"
│   ├── dots.js               #   HudNewsDots: lobby Settings → CONTROLS → HUD EDITOR
│   ├── banner.js             #   HudNewsBanner: under combos' import/export row, with an X
│   └── news.css              #   the dots' drawing and the banner
└── main.js                   injects the button, keeps MAIN's pivots current, provides the news destination, syncs news/
```

## The two kinds of HUD element

- **DOM**: the nickname/rank/XP block, the top-right buttons, FPS/Ping, and the
  chat input line. React, under `BattleHudComponentStyle-hudContainer`. See
  "The HTML elements" below — to the player they are elements like any other.
- **Canvas**: everything else. WebGL display objects in the `"Hud"` render
  layer.

## How the game lays the canvas out, and where we intervene

Every canvas element is a display object with a **`o4o(view, screen)`** layout
method that is a `switch` on the layout type (`DESKTOP` / `DESKTOP_CENTERED` /
`MOBILE`), aligning the element to an edge or the centre. It is driven by a
`LayoutSizeHudMessage` the game dispatches whenever the screen size or the UI
scale changes.

**Every draw**, meanwhile, goes through **one** method on the display-object
base class: it turns the node's *logical* rect into a *pixel* rect through a
scaling strategy, and then the renderer reads the node's own alpha. Sprites,
text and batched UI all go through it, every frame.

So the whole feature is two shadowed methods on that base prototype
(`apply/game/transform.js`):

| what | how |
|---|---|
| position | translate the **output pixel rect** by `dx × screen width`, `dy × screen height` |
| size | scale the output rect about the element's **pivot** — its box centre, or the tank point for the bars in the centered layout |
| opacity | multiply the node's alpha |

Consequences worth knowing:

- **The game's own layout code is never touched.** It keeps computing what it
  always computed; we transform the result on the way to the GPU. A game update
  that moves an element moves it with our offset still applied on top.
- **Elements created mid-battle inherit it for free** — kill-log rows, chat
  lines, supply slots.
- **The alpha shadow sits on the display-object prototype, not the scene-node
  base.** The 3D scene shares the scene node; shadowing there would fade the
  world. `origAlpha` is still read from the base, so the original value is the
  one multiplied.
- **A draw call made during a layout pass is not a draw.** Some elements call
  the pixel-rect method inside their own `o4o` and feed the result to their
  children as logical coordinates. Transforming there would compound every
  frame. `transform.js` wraps each element's `o4o` and suppresses itself while
  inside one (`debug.layoutCalls` counts those).

## Identifying an element across builds

Minified class names rotate every build, and the leaves are generic (`yg`,
`c$`), so an element cannot be keyed on its class. Two facts do the work:

- **The HUD root is captured** by the usual trap — the last field its
  constructor writes — validated structurally (it must have the add/remove
  methods and a children container).
- **Who added it identifies it.** `root.js` wraps the root's add method and
  reads the **column** of the calling frame out of `new Error().stack`. The
  game bundle is a single line, so the column *is* the byte offset of the call
  site in that build. Every element's mediator adds from its own site, so the
  offset is a stable per-build id; the twelve leaves of the battle status are
  all added by one function and therefore share one offset, which is exactly
  what groups them.

The frame picker skips the game's status-add chain (`N.statusAdd`; the status
leaves are added through it) and anything of ours, and requires a `:1:` line
number — only the one-line bundle qualifies, never our own multi-line files.
The column is the position of the **method name** in `x.<rootAdd>(`, plus one.

**One role can have several call sites.** The battle status is rebuilt per game
mode and each mode's mediator adds it from its own `myw`, so it has five
offsets; with only one of them in the table the element simply did not respond
in four modes out of five, which looks exactly like a broken feature rather
than a missing row. When an element stops reacting, check `__HUD.nodes()` for
an offset that mapped to `role: null` before assuming the transform is at
fault.

### Every build-specific thing is discovered

Two things change with every build: the **minified names** MAIN uses (`I.N`:
trap fields, the rect accessors, the render and layout methods…) and the
**offsets** of the add sites. `names.js` carries neither — `I.N` lists the
names MAIN needs with no value, and `I.offsets` is empty — so nothing is trapped
and no node gets a role until discovery answers. `discovery/` reads both out of
the live bundle, and `detect.js` runs it as **jobs** on `shared/bundle.js`:
`discoverGame()` (names + offsets, ~0.55 s on a cold cache, cached as
`hudGame:v<N>:<url>`) first of all four features, then the geometry
(`hudRecipes:v<N>:<url>`, reusing the names), and last the way to
Settings → Controls (`hudNavigation:v<N>:<url>`, its own `NAV_VERSION` — see
"Getting there from the news popup"). It posts the names to MAIN as
`hudGame`, again on MAIN's `ready`. `I.applyGame()` takes a names set only when
it is **complete** — a partial one would mix two builds — and emits `game`:
`root.js` and `settings.js` arm traps on the new fields (and drop the ones they
replace), and every node already added gets its role again from the new table.

Why the names go first: the game builds `BattleSettings` while it boots (from
local settings), so that trap has to be armed early. With a warm cache it always
is; on the very first load of a new build the names arrive about half a second
after the bundle download, which can miss it — the layout then reads as unknown
until a battle setting changes or the page is reloaded.

**Names (`engine.js`)** — each one from a structure, never from a name:

| anchor | yields |
|---|---|
| the HUD service: `set(v){if(this.S!==v){this.S=v;for(…)n.v().F=v}}`, then `get`, then `strategyOf(k){…k.FACTORY()…}` | `serviceScale`, `serviceMethods`, `scaleFactor`, `serviceTrap` (its ctor's last field), the strategy factory |
| the letterbox strategy's body (`16/9`), which touches every rect accessor | `strategyApply`, `x y w h`, the four setters, `anchorX/Y` |
| the only call site of `strategyApply`: `f(t,n){…this.S.apply(t,this,n)}` | `toPixels`, `strategy` |
| the scene node: a self-recursive `f(t){t(this);…}`, `add(t){var n=t.P;…,t.P=this}`, the render recursion `c.V()&&c.draw(t,n)`, the copy `this.a(t.V()),this.b(t.A())` | `traverse`, `parent`, `visible`, `alpha` |
| the HUD root: two adjacent wrappers `f(t){this.C.<nodeAdd>(t)}`, `g(t){this.C.<nodeRemove>(t)}` | `rootAdd`, `rootRemove`, `rootContainer`, `rootTrap` (last ctor field) |
| `"LayoutSizeHudMessage(view="+…this.V` — the commonest method called with `x.V` first | `layout` |
| the commonest `f(t){t.<rootAdd>(this.…` | `statusAdd` |
| `BattleSettings(` — toString order equals ctor order (the advisor's check) | `settingsTrap` |

**Offsets (`roles.js`)** — every `.<rootAdd>(` site, classified by
source-level names that minification keeps (lateinit property names and data
class names are strings):

| element | rule |
|---|---|
| kill log, radar, chat | the added node comes from a lateinit accessor named `logHudElement` / `radarVisual` / `battleChatHudElement` |
| bars, energy bar, active effects | the tank-HUD controller — the method that registers `callableName="provideDefaultTitlePosition"` — injects three components as `this.F=this.x().y(_$(C))`, always in this order: health, weapon status (the energy bar), local status effects. Every add site in a method of `C` |
| overdrive | the method reads the lateinits `"point"` and `"shortcut"` before adding |
| nuclear ring | the method builds `new <NuclearRechargeHudParams>(` |
| supply row | built in a plain function, right after its `"Invalid supply type "` throw |
| battle status | every `.<statusAdd>(` call outside a `statusAdd` method — one per game mode |

**Lateinit names are the weakest of these anchors.** Until `8f7f4827` the
three tank components were lateinit, so their property names sat in the bundle
as strings (`vj("healthHudComponent")`), and that was the rule. `6a85fbcf`
(Oct 2026) made them nullable (`var i=this.F;null==i||i.m(…)`), the strings
vanished, and the bars and effects lost their roles without a single error.
The injection order in the controller survived the change and holds on all 12
builds. The kill log, radar, chat and overdrive rules still hang on lateinit
names, and so does the kill log's geometry (`getActionLogAreaInWindowCoordinates`,
`killlog.js`); if one of them goes the same way, look for a `callableName`, an
enum name or a data-class string in the same method before reaching for code
shape.

**Verified** by `build/harnesses/test_hud_builds.js` on every bundle in
`research/` (12 builds, Apr–Oct 2026): all names found, one add site per element
and five for the status, and the same geometry in all of them. Two builds are
also checked against live measurements — `7f05e212` (the developer's battle)
and `f1de53fa` (the POC log) — to the offset. When a new build breaks it,
the harness names what is missing; add the bundle to `research/` and run it.

A different identification is possible — a node carries its strategy, anchors
and size at runtime, and recipes carry exactly those — but it cannot tell the
health bar from the energy bar or group the status leaves, which the offsets do.

### The supply row is one node holding two groups

`nut` is a single top-level node whose children are the supply slots, the
nuclear slot, the grenade slot and two augment slots. In the centered layout
they are one row; in the default layout the game splits them left and right —
its own `o4o` iterates a map of slot-type → view and sends four categories
(nuclear, grenade, the two augments) to the left edge and the rest to the
right.

`groups.js` reproduces the split **by screen side**, not by category: the
category lives on the map key rather than the node, and the side is what the
user actually sees. (The editor's slot list does come from the categories —
see "Which slots, and in what order" below.) The nuclear recharge ring
(`uot`) is a separate top-level node that sits over the nuclear slot, and is assigned by the same side test, so
it always travels with the group it visually belongs to.

## The element catalogue

`model/elements.js` is the single list. `movable` is per layout:

| id | default layout | centered layout |
|---|---|---|
| `status` | battle score + timer | same |
| `killLog` | the kill feed | same |
| `radar` | top left | bottom, right of centre |
| `supplies` | the supply slots (right) | the whole bottom row |
| `grenades` | augments + grenade + nuclear (left) | — merged into `supplies` |
| `overdrive` | bottom left | bottom, left of the row |
| `bars` | health + energy, bottom centre | **on the tank — scale and opacity only** |
| `effects` | the active-effect icons, one row above the bars | **on the tank, two rows, pushed by the bars** |
| `chat` | the canvas messages; the HTML input line under them moves with it | same |
| `userInfo` | HTML: rank, nickname, XP (top left) | same |
| `buttons` | HTML: full screen, pause, score table (top right) | same |
| `fps` | HTML: FPS and ping, under the buttons | same |

Besides `movable`, an entry may carry `pushedBy` (see *Pushing* below),
`dom: true` (drawn in HTML — see "The HTML elements") and `inset` (a part of
its area the game never draws; the kill log's, see "Coverage, honestly").

The crystals (`uOn`) and the weapon aim arc are deliberately out of scope.

**Pushing.** In the centered layout the effects are two rows around the tank
point — one 54 above it and one 8 below; the supply effects show in the one
below (`aNt` picks the map by the effect's `bis_1`) — and neither can be
dragged. They do scale on their own, and a row must never land on the bars:
`pushedBy: {centered: "bars"}` in the catalogue makes every part above the tank
point hang off the bars' top edge and every part below it off their bottom edge.
The edge moves with the bars' scale; the gap and the icons move with the
effects' own. One formula, twice: `HudPush.stacked` (`model/push.js`) in the
editor, which also repaints the rows live while the bars' slider moves, and
`I.pushed` (`apply/game/push.js`) in MAIN, which reads the bars' live box every
frame. Overlap is not checked between a pusher and what it pushes — the push is
what prevents it.

**Snapping.** A drag whose centre comes within 8 stage pixels of the screen's
vertical or horizontal centre line lands exactly on it, with a guide line shown
while it is held there (`HudGeometry.snapCenter`, `drag.js`).

**Chat opacity** works now, by a different route from everything else: the
chat is drawn by two shader programs of its own (text and rank icons) whose
colour comes from the texture and the vertices, never from `o3k()`.
`chat_alpha.js` hooks WebGL: at `linkProgram` it recognises the chat's two
programs by their vertex shader (only they declare `u_firstLineIndex` and
`u_maxLines` — no minified names involved), recompiles their fragment shader
with one `uniform float cme_hudAlpha` multiplied into the output, and before
each of their draws sets it to the chat's opacity. Whether the colour is
premultiplied is read from the blend state at that moment. If the injected
shader fails to compile, the original is restored and the chat simply does not
fade.

## The HTML elements (`dom/`)

The battle HUD's React tree (`BattleHud.tan`, decoded from 7f05e212):

```
div.BattleHudComponentStyle-hudContainer      grid: "UserInfo Buttons" 10% / "BattleLog TanksLog" 40%
│                                               / "Chat ." 40% / ". Fund" 10%, columns 50% 50%
├── div  grid-area:UserInfo; justify-self:start
│   └── div.UserInfoContainerStyle-blockLeftPanel
│       └── Uti — the same rank/nickname/XP component as the lobby header
├── div  grid-area:BattleLog  (not where the canvas kill feed is placed — see "Coverage, honestly")
├── div.BattleChatComponentStyle-rootDesktop  (top 65%, left 1em, 40em×5em — the input line)
└── div.BattleHudComponentStyle-buttonsContainer  grid-area:Buttons; justify-self:end
    └── div.-flexEndAlignStart
        └── div
            ├── div.…-fullScreenButton  <span>[F11]</span><img fullScreenSmall>
            ├── div.…-pauseButton       <span>[Esc]</span><img icPause>
            ├── div.…-tabButton         <span>[Tab]</span><img icTabStatistic>
            └── div (flex column) → div.BattleHudFpsComponentStyle-container → two rows
```

The key labels are shown only while `BattleSettings.showButtonLabels` is on;
MAIN reports it in `hudState`.

- **`catalog.js`** names each element by the selectors of its nodes —
  `userInfo` (the rank icon's parent), `buttons` (the three buttons), `fps`,
  and `chatInput`, which **joins** the canvas `chat`: it moves, grows and fades
  with it, about the chat's pivot, but is neither drawn in the editor nor part
  of the chat's box — idle, it is an empty strip. The same selectors find the
  nodes in battle and in the ghost: `find(root, c)` takes the class mapper,
  `liveClass` (the game's names) or `ghostClass` (the same names behind the
  extension's `cme_` prefix). The names themselves live in
  `TankiQoL.DOM.HUD` (`features/combos/lib/constants.js`), with every other
  game class name — conventions.md.
- **`ghost.js`** builds that tree hidden (`visibility:hidden`, full window),
  measures each element's layout box (offset chain, so no transform is
  counted) as fractions of the window, and hands the editor fresh clones of
  the nodes to draw. The content is fixed, never the player's: the user info
  is always `Tanker`, Legend (rank 31, the switch's `default`) and a 61% XP bar
  drawn with the game's own rules for it (`ksc-18` and its `::after`, renamed
  since those classes are generated). The rank image is the only
  thing read from the bundle — the game's picker `(rank, premium, size)`
  switches to one `switch(rank)` method per branch, and the large non-premium
  branch is what the user info draws (`discovery/assets.js` → `rankAsset`).
  The tree itself is `markup.js`; the user-info rules are `replica_user.css`.
- **`replica.css`** is the game's own rules for these classes, verbatim, on
  the prefixed names. The game injects its rules only once a battle HUD has
  rendered — the lobby has none of them — so before the first battle there is
  no other source. The user-info rules are copied too, so the copy never
  depends on what the lobby happens to have loaded.
- **Our copy never carries the game's class names.** Other extensions watch
  the whole document for them. Tanki Tweaks attaches its Tab-table observer to
  the first `.BattleHudComponentStyle-hudContainer` that appears and
  disconnects when it goes (it also waits for `.BattleHudComponentStyle-tabButton`).
  With the plain names, every measurement added and removed a HUD container,
  and Tanki Tweaks stopped styling the real Tab table — it came out
  half-transparent, without its background layer. Hence the `cme_` prefix —
  the extension's rule for every class it creates (conventions.md), which the
  first version of the copy broke. The one exception is the editor's back
  button, a single static node, which wears the game's own classes
  (`DOM.BACK_BUTTON_CLASS`, `DOM.BACK_ARROW_CLASS`) so that it looks exactly
  like the game's.
- **`apply.js`** writes `translate`, `scale`, `transform-origin` and `opacity`
  on the live nodes. `translate` and `scale` compose with any `transform` the
  game sets instead of replacing it, and the layout itself is untouched. The
  origin is the element's own centre, or — for the chat's input line — the
  chat's pivot from `HudRects`, so both halves of the chat turn about one
  point. A MutationObserver re-applies when React replaces a node.

`model/rects.js` merges the ghost's rects into the same map as the canvas
ones, so to the editor, the overlap rule, snapping and the pivots an HTML
element is just another rect.

## Geometry: why preferences are fractions

A preference is `{dx, dy, scale, opacity}` where **`dx`/`dy` are fractions of
the screen**, not pixels. The same file therefore works at any resolution, and
the editor (which runs at the browser's CSS pixel size) and the battle (which
runs at the game's own screen units) agree without converting anything.

The editor is opened **outside battle**, where no HUD exists to ask. All of the
canvas geometry is therefore read out of the game's code (next section). The
measurement is the fallback for when that reading fails:
`capture/game/measure.js` records, during battle, what the game gave each
element (its logical box, its anchors, the kind of scaling strategy, and the
screen and UI scale it was measured on), and **`model/seed.js` ships one such
record per layout** so the editor still shows something if discovery breaks on
a new build. A real measurement from the player's own battle overrides the seed,
per element; a discovered recipe overrides both.

> **Refreshing the seed**: in a battle, `__HUD.seed()` prints the current
> measurement as a line ready to paste into `model/seed.js`. Do it once per
> layout.

## Geometry from the game's own code (`discovery/`)

The geometry seed is the fallback. The real source is the bundle: **every canvas element
the editor exposes is placed from literal numbers in the game's code** — the
battle status's width aside, which is the text it shows — and `discovery/` reads
them, so the editor is right without anyone ever entering a battle.

The whole battle-HUD layout reduces to one x-op and one y-op plus an offset:

| axis | ops |
|---|---|
| x | `left` = off · `right` = view.w − w + off · `center` = (view.w − w)/2 + off |
| y | `top` = off · `bottom` = view.h − h + off · `center` = (view.h − h)/2 + off |

and then one of four scaling strategies turns that logical box into pixels.
`model/layout.js` implements both halves; the derivation of every helper and
strategy is in `../../../research/CLAUDE.md` → "Battle HUD layout".

A discovered recipe is therefore `{k, a:[ax,ay], w, h, x:{op,off}, y:{op,off}}`
per layout. Two elements need more: the chat's offset is a fraction of the screen
(`frac` on the axis), and the kill log's size is too — `wf`/`hf` replace `w`/`h`
and mean that fraction of the screen divided by the UI scale.

The radar's, read straight out of the bundle:

```
default  : ry (0,0)  150×150   x left 24     y top 100
centered : iy (.5,1) 120×120   x centre +300 y bottom −20
```

`test_hud_discovery.js` runs the shipped parser against the real bundle and
checks the result **reproduces the developer's live measurement** — logical box
and pixel rect, both layouts, to within a hundredth of a pixel. That is the
check that matters: it ties the static read to what the game actually drew.

### An element is not always one node

Three of the boxes are not a single literal rect, and the arithmetic that builds
them is itself read out of the bundle. `model/layout.js` provides the two
operations, and both are anchor-relative, so neither needs to know the screen:

- `resize(recipe, w, h)` — same centre, different size. The overdrive's button
  is 88×88 but its *ready* glow is `1.5×` that (`_Un().z1gt_1`), and the nuclear
  ring is 24×24 with a flash background of `2.5 × 44` — in both cases the larger
  child is what the player sees and what `groupBox` measures.
- `union(a, b)` — merges two boxes, and **refuses** unless they share a
  strategy, anchors and edge. Outside that case the two map to pixels through
  different transforms and a union in layout space would mean nothing. The
  grenades group is the nuclear ring ∪ the left slot row; in the centered layout
  the ring joins the single supply row instead.

The slot rows come out of the game's own counting: slot 44×44, gap 6, the left
row's origin 162, the right row `view.w − 70 − width`.

**Which slots, and in what order, is read too** (`supplySlots`). The row is built
by iterating a constant list (`Nut.u11p_1`: `NUCLEAR, FIRST_AID, DOUBLE_ARMOR,
DOUBLE_DAMAGE, NITRO, MINE, GOLD_BOX, GRENADE, FLAG, BALL, WEAPON_DEVICE,
HULL_DEVICE`), dropping FLAG/BALL unless the player is carrying one. Each entry
carries a category (`COMMON / NUCLEAR / GRENADE / DEVICE / FLAG`). Then:

- **default** — `COMMON` goes right, always placed; everything else goes left,
  visible ones only: nuclear, grenade, the two augments. Four and six, and the
  right row is 294 wide, exactly as measured.
- **centered** — one row of the *visible* slots, in list order. Right after
  building it the game hides the augments in this layout
  (`d11r(WEAPON_DEVICE, !centered)`), so the row is eight wide: nuclear, the six
  supplies, grenade — which is what the game shows.
- **the nuclear ring** in the centered layout: its literal (`centre − 162`) is
  only a starting value. The row sends it the nuclear slot's x, minus half the
  screen, plus 10 (`Yet(m)` → `sot.v124`), and the ring adds its own half-size
  shift. Computed that way it lands exactly on the slot's centre.

The values are enum entries, and minified accessors like `lA()` are
**imports**, not local functions: the HUD module is one webpack module and the
enum lives in another. `enumAt` follows the chain: the module's parameter list
and its `}(t.exports,i(<id>),…)` call give the imported module, its
`t.$_$.<key>=F` table gives the local accessor there, and `F → init → new
C("NAME",n,category)` gives the name and the category.

**The UI scale is computable too**, so nothing here needs a battle:
`scale = (rootFontSize / 16) × ksi(battleUISize)`, where `ksi` is the game's own
slider curve (0→0.75, 50→1, 100→1.5) and `battleUISize` comes from the trapped
`BattleSettings`. Verified: 13.5758/16 = 0.84849 against a measured 0.8484875.

### Coverage, honestly

| element | geometry from | against the live measurement |
|---|---|---|
| radar | **the bundle** — a unique anchor | exact, both layouts |
| bars | **the bundle** — default: two 304×10 bars pinned 58px off the bottom, the health bar one pixel into the energy bar (`bottom − h + 1`), 19 tall; centered: 140×12 each, health centred 12 above the tank point and energy on it | — (the measured group swept in the tank-mounted nodes and is unusable) |
| effects | **the bundle** — 30px cells at a 37px pitch (`lNt`); default one row 54 above the bars' bottom line, centered one row 54 above the tank point and one 8 below. How many icons is game state; the editor draws one row of five, in the centered layout the one below the tank where the supply effects are, 3px further from the bars than the game's 8 so it reads as separate (editor only) — the row above is pushed in battle by the same rule but not drawn | — |
| overdrive | **the bundle** — the two `fP` literals plus the glow factor | exact: `48, 766, 132×132` |
| grenades | **the bundle** — nuclear ring ∪ left slot row | exact: `129, 781, 227×110` |
| supplies | **the bundle** — right slot row, six slots | x, width and top edge exact |
| chat | **the bundle** — 480×184, and the only element whose offset is a *fraction* of the screen (`18/1920` across, bottom edge at `.65`) rather than a constant. The axis ops in `layout.js` take an optional `frac` for it. Joined by the HTML input line under it. Its opacity goes through `chat_alpha.js` (see the catalogue) | — |
| status | **the bundle, one text width excepted.** The timer is centred at `y = 16` in a `24` font; each score plate is the `62×24` image (the `100×24` one beside it is shown only in CTF) twelve pixels from the timer. The timer's own width is text (`"00:00"`), so it is taken as five glyphs of the font height — `268×24` in all: plate, timer, plate, one row. The `200×20` rect under the timer is a hit area, never drawn, and is not in the box | — |
| kill log | **the bundle** (`killlog.js`). Its layout asks a lambda for its area in *window* coordinates (the lateinit `getActionLogAreaInWindowCoordinates`); the DESKTOP battle config hands it a helper that returns fixed fractions of the window — **x .7–.98, y .2–.5**, the same in all 12 builds (the MOBILE helper has its own). The node is that area divided by the UI scale and right-aligned to it, on `ey` anchored `(1, 0)`, so in pixels it is exactly the area at any scale: the recipe carries the size as `wf/hf`, a fraction of the screen over the scale. The rows are right-aligned text inside it, so its left 40% is never drawn: `inset: {left: .4}` in the catalogue, applied by `HudElements.visibleBox` | exact: logical box and pixel rect (`1304.8, 183.2, 521.92×274.8`) |

Two traps, both of which shipped wrong once and are worth remembering:

- **The bars are not 10px tall.** The size constants come from one initialiser
  (`304, 10, 140, 12, −58, .6`), but the *position* is in the placers: two
  stacked bars, 19 tall, bottom-anchored at `−58`. Reading the size and
  guessing the position put it flat on the bottom edge.
- **The supply row is centred on the line the game computes, not hung from it.**
  `yA` (the engine's `f6`) centres a node on a Y, so the row's top is
  `view.h − slotH + bottom`, a further half-slot up. The centered layout uses
  `tA` on a different line and lands half a slot lower. Getting this wrong is a
  22px error that no bounds check catches — only comparing against the
  measurement does.

`fit()` no longer trusts `measure.js`'s strategy probe. It **solves the anchor
out of the record**: the recorded `l` and `px` pin down an affine map, and the
anchor that produces it is recovered per kind, keeping the first whose anchor
lands in range. The kill log was recorded as `letterbox`; solving says `linear`
with anchors `(0.98, 0.20)`, and only then does the replay reproduce the
measurement to the pixel. The harness asserts exactly that. (Its real strategy,
read from the bundle since, is `ey (1, 0)` — the same affine map at the scale it
was measured on; the recipe now supersedes the measurement anyway.)

Adding an element is now filling in a table, not design work: decode its `o4o`
into an x-op and a y-op (most are done in the research doc), add an extractor
beside its kin in `discovery/` (one file per family, all on the shared
`TankiQoL.HudParse` namespace), wire it in `compose.js`, and the harness will
tell you whether it reproduces reality.

Resolving a constant out of the bundle has three shapes, and `read.js` has a
reader for each: `function A(){return I(),v}` (lazy value), `function
A(){return null==v&&new C,v}` (companion object field), and a plain
`v=new Size(w,h)` inside an initialiser. All three take an anchor offset,
because a minified name is reused across modules and **the right definition is
the one nearest the call site** — the first `indexOf` is usually a different
module's.

> **Bump `CACHE_VERSION` in `discovery/detect.js` (with `V` in `compose.js`)
> whenever `discover()`'s output shape changes** — an entry of an older shape is
> posted to MAIN first and every field it lacks reads empty until the background
> refresh replaces it. Values alone need no bump: `shared/bundle.js` rediscovers
> whatever an older extension version cached.

`model/replay.js` replays that record onto the current screen:

- each element is re-anchored to the third of the screen it was measured in
  (left / centre / right, top / middle / bottom), keeping its distance from
  that anchor — which is exactly what the game's own `o4o` does;
- sizes are multiplied by the change in the game's UI-scale slider
  (`BATTLE_UI_SCALE`, remapped 0→0.75, 50→1, 100→1.5 — the game's own curve)
  and by any change in the root font size.

So even the fallback shows the geometry at the player's current resolution and
UI scale, and our own scale composes with the game's instead of fighting it:
100% means "whatever the game would have drawn".

Records are stored **per layout** and merged per element, so an element that
happened to be hidden during one measurement keeps the rect it had.

## Two layouts, two sets of preferences

The player's layout comes from the game itself, not from storage: the
`BattleSettings` data class is trapped the same way as everything else, and its
`isCenteredLayout` / `battleUISize` fields are read out of its own `toString`.
It is rebuilt on every settings change, so switching the layout while the
editor is open swaps what the editor shows, live.

- Preferences are saved under the layout they were made in.
- Reset clears **only the current layout**.
- A brand-new player starts with both sets empty, i.e. exactly the game's own
  layout.

Why not read the game's `localStorage` keys (`…settings.battle..is_centered_layout`):
they are prefixed with a per-account hash, so with several accounts in one
browser you cannot tell which is current. The trapped object always can.

## The editor

Entry point: **Settings → Controls**, a green `HUD EDITOR` button appended to
the same row as the *Input device* dropdown (the news popup's button goes there
and clicks it for the user — next section). Clicking it hides the game's
`-container` and mounts the editor in its place, on the same radial-gradient
background the game uses.

- **The game's own artwork, not a lookalike.** Each element is drawn with the
  SVG the game itself draws — `radar.svg`, `overdrive.svg`,
  `hudSupplyBackground.svg`, the supply icons — and for the chat with the
  skeleton the game ships for *its own* mobile HUD editor. The bars and the
  effects take the style of that editor's `centralIndicators.svg` (white 25%,
  a black 50% outline, each bar 6 thick in a lane of 10) and the kill log that of `actionLog.svg` (white 15%
  rounded rows) — but in uniform rows, since the file opens with a tall block
  and ends with a short row, which is not what the feed looks like. The HTML
  elements are the game's own markup and classes. Outside the stage the
  viewport is hatched: that is the edge of the screen. No captions needed.

  The grenade is the one icon read from a **named texture** instead:
  `new C("whiteGrenadeSupply",20,<param>)`, whose parameter is the asset
  module. The `grenade` of the mobile-editor cluster is a framed skeleton with
  a small icon inside it, which is exactly what the slot looked like.
  (`moduleOf` also has to read minified module ids: `12000` is written `12e3`.)

  The URLs are discovered, not written down: `discovery/assets.js` reads the
  webpack asset modules (`t.exports=i.p+"static/images/<name>.<hash>.svg"`) and
  `detect.js` rebuilds the absolute URL from the bundle's own `<script src>`,
  so the content hash never has to be guessed. **A base name is not unique** —
  four files are called `mine`, two `overdrive`, two `chat` — so each name is
  resolved inside the cluster that requires it: the anchor is a name that *is*
  unique (`centralIndicators`, `Shield`), and the winner is the candidate
  required nearest to it. Falling back to the first match gives you the
  garage's icon in the battle HUD. (`centralIndicators` itself is no longer
  drawn — the bars and the effects are separate elements now — but it stays
  the anchor of its cluster.)

  A composed element (the supply rows, the grenade row) carries `parts` in its
  recipe — one entry per slot plus the nuclear ring, each as a fraction of the
  element's box, computed from the same literals as the box itself. The ring
  comes out centred on the nuclear slot in both layouts, which is how the game
  draws it and is what the harness checks.
- **Click to select**, drag to move, two sliders for size (50-300%) and opacity
  (0-100%). The sliders are the game's own (`InputRangeComponentStyle`),
  rebuilt as `shared/components/slider.js`.
- **A header bar, not an overlay.** The top strip is
  `BreadcrumbsComponentStyle-headerContainer` — 6em, a hairline bottom border,
  back button, then undo / reset / sliders, and a faded
  "Tanki Combos & QoL - HUD Editor" at the right end — and the stage lives
  *below* it. It used to float over the stage, where the HUD's own top-left
  elements ran straight into it. The back button is the game's own node:
  `BreadcrumbsComponentStyle-backButton` with `IconStyle-iconBackArrow` and the
  `Z` badge, styled by the game's rules (the settings screen has them loaded),
  not a lookalike.
- **The stage is the screen in miniature.** Its width and height are computed
  in JS to the window's exact aspect ratio and fitted into whatever the header
  leaves, so every element shrinks and grows uniformly instead of stretching.
  `aspect-ratio` alone does not do this: with a definite width it loses to
  `max-height` and distorts, which is precisely what the stretching looked
  like. A window resize also re-runs the recipes, because a HUD element keeps
  its size **in pixels** rather than as a fraction of the screen — so its
  fraction genuinely changes — and `stage.rebase` keeps the selection and the
  undo stack while it does.
- **Overlap is the only thing that is refused** (`model/overlap.js`, applied by
  `editor/stage_rules.js`). The shape turns red while the
  gesture would land it on another element and the whole gesture is dropped on
  release. The test is on **area, against what the game itself starts with**:
  the overdrive's ready-glow reaches into the grenade row in the game's own
  layout, so a plain yes/no test froze both elements permanently. A pair may
  keep the overlap the game gave it; it may not deepen it.
  Growing an element into the screen edge is **not** refused — it is
  nudged back inside, because nearly every HUD element sits against an edge and
  refusing there would make the size slider useless. An element that cannot be
  dragged in this layout keeps its position and only grows.
- **One source for the rectangles.** `model/rects.js` computes every element's
  box for the current screen — discovery where it reaches, the measurement
  otherwise — and *both* consumers read it: the editor draws it, and the centre
  of it is sent to the MAIN world as that element's **pivot**. Scaling has to
  turn about the same point on both sides or the element lands somewhere the
  editor never showed; `transform.js` used to derive its own pivot from the live
  `groupBox`, which for the bars is a huge box full of tank-mounted nodes, so
  growing them threw them across the screen. Pivots are re-sent on every
  discovery result, storage change, state change and window resize.

  Only elements **with a recipe** get a pivot this way — today every canvas
  element. One reconstructed from a measurement (only when discovery failed)
  turns about its live box in MAIN instead: the measurement *is* that box, and
  the live one cannot go stale, whereas a pivot fitted from an old record once
  left the kill log misplaced after a fullscreen toggle until the window was
  jiggled.

  **The exception is an element that rides the tank** — the bars in the centered
  layout. A fixed screen pivot turns a scale into a translation as soon as the
  tank moves away from it. Every part of it turns about **the tank point**: each
  bar's provider writes the tank's screen position into its node's anchor every
  frame (`l12h`: `node.k4m_1 = x, node.l4m_1 = y`, the active-state icons
  included), and the node's strategy (`ny`) scales about exactly that anchor.
  `groups.js` → `I.tankPoint()` reads it off the health bar, so our scale
  composes with the game's about the same point.

  Two earlier attempts, both wrong: each part about **its own centre** (the gaps
  between the bars stayed fixed while the bars grew — overlapping at 200%, too
  far apart at 50%, and the active-state row off to the side), and the whole
  group about **its union's centre** (it moves whenever an active-state icon
  appears). The editor draws the same thing: the recipe carries
  `pivot: [.5, .75]`, the tank point within the box, and `HudGeometry.transform`
  honours a rect's `px`/`py`. With no tank on screen outside battle, the editor
  puts the tank point at `TANK_Y` (.7 of the height) — the lower third, where
  the camera shows it; that number is ours, not the game's.

  The live box of a default-layout element still comes from `groupBox`, which
  **skips nodes of 1×1 or smaller**: the engine's display object defaults to a
  `1×1` rect at the origin (`Yd(t,n,i,r)` → `0,0,1,1`), and a container that is
  never given a size would drag the box to the top-left corner. That is why the
  seed recorded the bars as `[0,0,1084,858]`.
- **No save button.** Every accepted gesture writes storage immediately, and
  the change reaches the battle through the bridge at once.
- **Undo** takes back one gesture, per editing session (leaving the editor
  clears it). **Reset** asks through the shared dialog in its warning variant —
  the same chrome as the delete-combo modal with the game's yellow gradient
  instead of the red one.
- The editor closes on the back arrow, on **Z** (the label, as on the game's
  own screens) and on Escape, and on its own if the game navigates away
  underneath it. Keys are matched on `e.code`, so a Hebrew keyboard layout still
  hits `KeyZ`; Ctrl+Z is undo.

## Getting there from the news popup

The 5.0 "what's new" popup (combos' `whats_new_modal.js`) has a **Take me
there** button: it opens Settings → Controls the way the game itself does, and
then the editor.

**How the game gets there.** It never clicks its way to a settings tab; it
dispatches two Redux actions. The quests' "go" buttons (action type 3, the
category from the quest's parameter) and the security dialog's button
(`SECURITY`) both do

```
store.dispatch(new SelectSettingsCategory(category))   // function A(t){this.F=t}
store.dispatch(new GoTo(new LobbySettings()))          // GoTo(screen, history = true)
```

and the lobby's own Settings item dispatches only the second, so the screen
opens on whatever category was selected last. `history` is left at its default,
like the game's own calls, so the screen's back button returns to where the user
was (the garage, for the popup). We send exactly those two, with `CONTROL`.

**Discovery (`discovery/navigation.js`).** Every anchor but one is a string:

| what | anchor |
|---|---|
| `SettingsCategory.valueOf` | the exported `function(t){switch(t){case"ACCOUNT"…` whose default throws `"No enum constant tanks.client.lobby.redux.settings.SettingsCategory."`; it must have a `CONTROL` case |
| the settings screen | `function X(){Y.call(this),this.F="Lobby.Settings"}` |
| `GoTo` | its data-class `toString`: `"GoTo(screen="` |
| the store, its accessor and dispatch | the site `<holder>().<getter>().<dispatch>(new GoTo(new Settings))` — the lobby's Settings item |
| `SelectSettingsCategory` | the `.<dispatch>(new A(…))` just before such a site, where `A` is `function A(t){this.F=t}` and a reducer in A's module reads `t instanceof A?….(t.F)` |

The output is not class names but **export-table entries**: for each of the
five, its key in its module's `t.$_$` table and the **head** of its source (the
whole function, up to 120 characters). All 12 builds, ~40 ms.

**MAIN takes the functions from the module tables.** They are module-scoped:
nothing reachable from the page holds them until the game itself navigates
there. But every Kotlin module ends with `t.$_$=t.$_$||{}` on its webpack
`exports`, and `capture/game/modules.js` keeps each table as it is created (an
`Object.prototype` setter on `$_$` — a compiler name, armed before any discovery;
architecture.md → "Names come only from the bundle"). `navigate.js` takes, for
each entry, the value at its key whose `Function.prototype.toString` starts with
its head: keys repeat across the ~60 module tables (the store holder's `u` is
in half of them), the head is unique
in the bundle (`test_hud_builds.js` checks that on every build). Both actions are
built before either is sent — half a navigation is worse than none.

**The order of events.** `HudSettingsButton.goTo()` (ISOLATED) →
`HudBridge.openControls()` → MAIN dispatches → the game builds the Controls tab →
as soon as our HUD EDITOR button can be injected into its row (the proof the tab
is up; 5 s at most) → `HudEditor.open()`. It also asks combos for the tab back
(`AutoNavigator.openOnNextGarage()`): the game's own back button returns to the
garage on the **Paints** tab, which is where combos left it, so without the
request the user lands on paints instead of the combos tab they came from
(combos.md → "Getting to the combos tab"). A request that comes before the
navigation entries waits for them up to 10 s and is then dropped, rather than
navigating late; ISOLATED gives up at 11 s. If MAIN cannot find a function,
nothing is dispatched and the button does nothing but a console warning.

**The popup does not depend on the HUD.** `whats_new_modal.js` names a
destination (`GO.to = "hudEditor"`) and shows the button only once a feature has
called `WhatsNewModal.provide(to, run)`; `hud/main.js` does. The dependency runs
HUD → combos, the same way as the HUD's use of combos' selectors and of
`AutoNavigator` above.

`__HUD.openControls()` runs the MAIN half alone, from the console.

## Pointing users at the editor (`news/`)

The 5.0 popup is easy to miss, so until the editor is opened once there is a
trail of yellow dots — the lobby's **Settings** item, then the **CONTROLS** tab,
then the top-right corner of our **HUD EDITOR** button — the COMBOS button's
badge in the garage lobby, and a small banner
under combos' import/export buttons ("New feature available — HUD editor"
and an X). The whole banner but the X is the link: it runs
`HudSettingsButton.goTo()`.

- **The COMBOS button's badge in the garage lobby goes with the banner**: it
  used to go out when the 5.0 popup was closed; now it stays lit while
  `HudNews.bannerPending()`, through the third argument of
  `WhatsNewModal.provide` (combos.md → "The 'what's new' modal"). The badge
  leads into the combos tab, where the banner is, so the banner's X answers
  both (the developer's call); the Settings trail stays until the editor.
  `main.js`'s loop calls `LobbyButtonInjector.refreshBadge()` so it goes out at
  once.
- **Gone for good once the editor has been open**: `main.js`'s 300 ms loop calls
  `HudNews.markVisited()` whenever `HudEditor.isOpen()`. The X closes the
  banner and the COMBOS badge (its own flag); the Settings dots stay until the
  editor is opened.
- **Never shown to someone who already uses it.** The feature shipped before
  the pointers did, so if any element in either layout is off its default (an
  entry exists in `hudLayout` — equal-to-default entries are deleted, so that
  is exactly "reset would do something") nothing is shown. Not sticky: reset
  everything without ever having opened the editor since, and they return —
  in practice impossible, since resetting means opening the editor.
- **5.0 kept no "visited" flag.** Someone who opened the editor in 5.0 and
  changed nothing counts as never having opened it, and sees the pointers
  again after updating to 5.1 until they open it (or click the X). Anyone who
  changed something is covered by the rule above.
- **No flash**: nothing shows until both `hudNews` and `hudLayout` have loaded.
- **Every dot copies the game's, value for value.** Read from the bundle
  (`6a85fbcf`), not guessed: a primary-menu item is
  `li.itemCommonLi.menuItemContainer` holding the item's div (`itemLiOption` for
  Settings) and, with `hasNotification`, an
  `<img class="notificationIconNewNews" src=Ellipse.svg>` — the quests' dot.
  Ours restates that class's rules with Ellipse.svg rebuilt in CSS, as combos'
  lobby badge does. The CONTROLS dot copies the one the game puts on ACCOUNT
  (`ItemNotificationMarkerStyle-base -right`, plus its hashed `top: 2.35em`).
  The button's dot (centred on its top-right corner) and the banner's take the
  lobby look, not the CONTROLS one — the developer's call. The lobby dot's halo
  is `!important`: the game's `itemCommonLi:hover div` paints every div in the
  item white, and its own dot escapes only by being an `<img>`.
  **The dots wear no game class.** The first version put the game's classes on
  them so the game would position them, and in the live game the CONTROLS and
  button dots were invisible and the lobby one looked wrong. The likely cause
  (not confirmed live): the game injects a style's rules only once it renders
  that style itself, so on a profile with no such notification the classes
  had no rules at all.
  `news.css` carries every value; the harness fails on a game class in it.
  CONTROLS is found by **index 4** — the settings menu's order in
  the game's code (`GAME, BATTLE, GRAPHIC, SOUND, CONTROL, …`), confirmed in all
  three settings captures in `HTML-examples/`; the tab names are localized, so
  text is not an option.
- **Dependency still HUD → combos**: the banner finds `.cme_import-export-row`
  and appends itself to its parent; combos knows nothing about it.
- `__HUD.resetNews()` clears both flags from the page console (MAIN relays
  `hudNewsReset`, like `__CMB.resetWhatsNew()`); `__HUD.resetNews(true)` also
  ignores an edited HUD until the next reload, for testing on your own profile.

## Storage

One key, `local.hudLayout`:

```javascript
{
  v: 1,
  layouts: {
    default:  { elements: { radar: { dx, dy, scale, opacity }, … } },
    centered: { elements: { … } }
  },
  measured: { default: <measurement record>, centered: <…> }
}
```

An element with no entry is at the game's own setting. An entry equal to the
default is deleted rather than stored.

## Bridge protocol (every message tagged `__hud`)

| dir | action | payload | meaning |
|---|---|---|---|
| `i2m` | `hudSettings` | `{layouts}` | the preferences; sent on load and on every change |
| `i2m` | `hudGame` | `{names, offsets}` | this build's names and add-site table, from `discovery/detect.js`; sent again on `ready` |
| `i2m` | `hudStateRequest` | — | ask for the current state |
| `i2m` | `hudPivots` | `{pivots}` | the pivot of every element that has a recipe, per layout, in screen fractions |
| `i2m` | `hudMeasureRequest` | `{id}` | measure now (the editor opened during a battle) |
| `i2m` | `hudNav` | `{store, goTo, screen, select, category, control}` | the way to Settings → Controls, from `discovery/detect.js`; sent again on `ready` |
| `i2m` | `hudControlsRequest` | `{id}` | open Settings → Controls (the news popup's button) |
| `m2i` | `ready` | — | MAIN's listeners are up; ISOLATED re-sends the game names, the navigation, the pivots and the settings |
| `m2i` | `hudState` | `{layout, showButtonLabels, uiSize, scale, inBattle, rootFontPx, dpr}` | pushed on change, polled once a second |
| `m2i` | `hudMeasure` | a measurement record | pushed after a battle lays the HUD out |
| `m2i` | `hudMeasureResult` | `{id, ok, record}` | reply |
| `m2i` | `hudControlsResult` | `{id, ok, error}` | reply; none for a request dropped after waiting 10 s for discovery |
| `m2i` | `hudNewsReset` | `{force}` | dev helper `__HUD.resetNews()`; not a reply — `news/state.js` listens for it itself |

## Behaviours not to regress

- The transform runs on the **output** rect, never on the node. Writing to the
  node would fight the game's own layout and compound every frame.
- The alpha shadow lives on the display-object prototype, not the scene node.
- A pixel-rect call inside a layout pass must stay untransformed.
- Offsets are fractions of the screen; storing pixels breaks on every other
  monitor.
- The side split of the supply row is recomputed whenever the layout changes —
  `markLayoutChanged()` is called from the wrapped `o4o`.
- An element the current layout cannot move must not be given an offset, even
  if one was saved while the other layout was active.
- Only overlap refuses a gesture; the screen edge clamps.
- No minified name is written into any file (`test_no_names.js` checks it);
  every file reads `I.N` at call time, and `I.applyGame` replaces the names only
  as a complete set.
- Nothing we add to the page carries a game class name of the battle HUD —
  other extensions key on them (see "The HTML elements").
- The `$_$` trap is the only one armed before discovery, and only because its
  name is the compiler's. The navigation sends the game's own two actions,
  built in full before either is dispatched — never a click walk through the UI.

## Debugging

Everything is on `__HUD` in the game tab's console — see `debugging.md`.
