# Reading and writing the game's own state

Since Aug 2026 both saving and equipping run against the game's own model
instead of clicking the UI. Zero flicker, server-persisted. The DOM path is the
fallback only (`combos.md`).

- **Save**: `save/instant_saver.js` → `GarageBridge.readCombo()` → storage. No
  tab navigation; the user never leaves the combos view. Deliberately **no**
  fallback: if the state isn't captured, or it holds no core items, the save
  button saves nothing at all.
- **Equip**: `equip/instant_loader.js` → `GarageBridge.applyCombo()` →
  `equip/game/apply.js` dispatches the game's own Redux actions. Also used by
  random-from-saved.

## Who decides what

`instant_loader.js` (ISOLATED) decides **what** to apply — it strips what the
user removed on the card and honours `equipProtectionsOnLoad` (the advisor
overrides that with `opts.forceProtections`: its panel is protections-only).
the `game/` files (MAIN) decide **how**, because resolving a saved slot to a real
item depends on live state (owned? which Mk? already mounted?) which only exists
there. One message out, a per-slot report back.

Order: base items → decorative → protections → augments, with a short randomised
pause (80±40 ms) between actions. The pause is **request pacing**, not a game
requirement: applying a combo instantly would otherwise fire around ten garage
commands inside a single millisecond. Each one is an ordinary action the server
validates like any other, so spacing them out changes nothing about what is sent
— it only avoids handing the game a burst in one tick.

Two outcomes matter and mean different things:

| result | meaning | what happens |
|---|---|---|
| `failed` | the native dispatch did not work | that **one slot** falls back to the DOM equipper |
| `unavailable` | this account does not own the item | skipped and reported — no fallback, since no path could equip it |

## The bridge protocol

`window.postMessage`, every message tagged `__cmb` with a direction. Each request
carries a running id and its own timeout, so several can be in flight at once.

| dir | action | payload | meaning |
|---|---|---|---|
| `i2m` | `garageConstants` | discovered name-set | from `discovery/detect.js` |
| `i2m` | `readCombo` | `{id}` | read the mounted loadout |
| `i2m` | `readIndex` | `{id}` | flat index of the garage (for the migrator) |
| `i2m` | `cooldown` | `{id}` | is equipping currently restricted? |
| `i2m` | `drawRandom` | `{id, settings}` | draw a random combo from owned gear |
| `i2m` | `selectPaint` | `{id}` | re-select the mounted paint (3D model only) |
| `i2m` | `applyCombo` | `{id, desired, opts}` | apply a combo |
| `m2i` | `ready` | — | MAIN's listeners are up; ISOLATED re-sends the constants |
| `m2i` | `resetWhatsNew` | — | dev helper: MAIN asks ISOLATED to clear the update-notice flag. The only `m2i` that is not a reply, so `bridge.js`'s `REPLIES` filter drops it and `whats_new_modal.js` listens for it itself |
| `m2i` | `comboResult` | `{id, ok, combo, mounted, stats}` | reply |
| `m2i` | `indexResult` | `{id, ok, items[], devices[]}` | reply |
| `m2i` | `cooldownResult` | `{id, known, active, msLeft}` | reply — polled once a second while the view is open |
| `m2i` | `drawResult` | `{id, ok, data, desired}` | reply — `data` for the card, `desired` to apply |
| `m2i` | `applyResult` | `{id, ok, results[], failed[], unavailable[], ms}` | reply |

Timeouts: 4 s for reads, 1.5 s for the cooldown poll (it repeats, so giving up
fast beats piling requests up), 5 s for a draw (it waits on device catalogs) and
20 s for apply (it deliberately pauses between items).

## The model

The garage is a **Redux-style store**: one `Garage` state object holding
`mountedItems`, `items`, `devices` and ~26 more fields. Every item is a
`GarageItem` carrying `id`, `name`, `category`, `preview`, `owned`, **`mounted`**
and **`mountIndex`**. So the current combo is simply every item with
`mounted === true` grouped by `category` — the same selection the game's own code
performs. `mountIndex` separates the 4 protection slots.

Category → slot: `WEAPON`→turret, `ARMOR`→hull, `DRONE`→drone,
**`BAZOOKA`**→grenade, `RESISTANCE_MODULE`→protection (×4), `PAINT`→paint,
`SKIN`→skins.

Four things are **not** plain fields on the item, and each was a separate find:

| What | Where it lives | Trap to avoid |
|---|---|---|
| **Mk level** | `modification.modificationIndex`, **0-based** — the garage displays 1-based, so add 1 | the same object has `modificationCount` = how many Mk levels that item type has *at all*. It looks like a level but is constant per type — reading it reports "Mk7" for everything. |
| **Micro-upgrade (`LVL-X`)** | `upgradeableParams.currentLevel`; the max is behind a method (20 drones, 45 protections) | — |
| **Augments** | the game calls them **Devices**: `GarageDevice` objects with `installed` + `baseItemId` | there is no "augment" string in the bundle. Match a device to its item by `baseItemId`, which for an upgraded item lives on `modification`, not on the item. And the game remembers one installed augment **per turret/hull, mounted or not** — most `installed:true` devices belong to unmounted items. That's normal. |
| **Skins + shot effect** | `mountedSkin` / `mountedShotSkin` on the turret/hull are skin-item **IDs**; the skins themselves are ordinary `GarageItem`s (`SKIN` / `SKINS_SHOT`) resolved through an id index built during the scan. Image = `skinPreview` with `preview` as fallback (the same choice the game's UI makes). | the IDs compare as Kotlin Longs — stringify both sides. |

**Item images** are not strings: `preview` / `skinPreview` are resource objects
with a method that builds the CDN URL, so the URL has to be *called*.

**The same item appears in the state more than once.** The garage copy and the
"on sale" copy are separate objects with the same `id`, differing in `owned` —
measured live at 349 skin objects for 236 distinct ids, 113 duplicated. The scan
order is a stack and therefore arbitrary, so `collect()`'s `byId` index resolves
ties explicitly: **an owned copy always beats an unowned one.** Without that,
`byId.get(id)` could hand back the shop copy, and the skin ownership check would
refuse a skin the player actually owns — silently, as `unavailable`. That is
exactly the bug it caused. `resolveOwnedItem` was never affected because it skips
`owned !== true` while iterating; only the id index needed the rule. The same
class of problem is why `stateDevices()` reads the `state.devices` subtree
instead of scanning the whole graph.

Items are gathered by a **structural scan** of the state graph
(`capture/game/collect.js`), collecting every object that carries all the
`GarageItem` fields. Kotlin collections compile to internal classes whose
iterator names rotate per build; matching on the item's own shape sidesteps that.
The scan traverses `Map`/`Set` too, and counts depth cuts (`debug.depthCut`) —
a silently truncated branch looks exactly like "the user doesn't own that item".

## Capturing the state

`Object.defineProperty(Object.prototype, <field>, {set})`, validated structurally
(the object must carry every known state field) so the trap can't misfire on a
stranger. The store is immutable, so a new state object is built on every garage
action — the trap stays installed and always holds the freshest instance. The
trapped field is the **last** one the constructor writes, so at trap time the
object is fully populated (the Scorpion lesson).

## The write path: two layers of actions

Every garage change is a Redux action, and those actions come in two layers:

```
GarageItemMounted(item, needServerMount)              [thunk — what the UI dispatches]
   ├─ if delayMountTimeMs > 0 → does nothing          ← the mount restriction
   ├─ dispatch <plain 2-field mount action>           ← low-level
   └─ if WEAPON/ARMOR → dispatch GarageLoadDevicesIfNotLoaded(item)

GarageResistanceMount(resistance, index)              [thunk]
   ├─ if the module is ALL_RESISTANCE → unmount everything
   ├─ else → dispatch GarageResistanceUnMount(whatever occupies `index`)
   └─ dispatch GarageApplyResistanceMount(resistance, index, needServerMount)
```

The **low-level** actions are the ones the reducer branches on with `instanceof`
*and* the ones a controller subscribes to in order to send the command to the
server. We dispatch those and reimplement whatever the thunk did on top.

Why not the thunks: **only subscribed actions are locatable at runtime**. A
subscription holds a KClass that points at the constructor, so a bounded walk of
the store's object graph reaches it (`store.js: resolveActionCtor`). Thunks are
in no registry, so their constructors are unreachable.

Rules that are easy to get wrong:

- **Always `new proto.constructor(...)`, never `Object.create`.** Some actions
  are thunks whose behaviour is a closure built *in the constructor*;
  `Object.create` produces a shell that dispatches fine and does nothing. That
  really happened with the select action.
- **Validate by construction.** Every ctor lookup builds a probe instance and
  checks the fields got what we passed. A probe that is never dispatched has no
  side effects at all.
- **Never send a command you haven't identified.** An early experiment sent the
  argument-less garage command (`hcn`) hoping it meant "refresh". It is the
  "garage loaded" response, and sending it out of context loaded another
  player's garage data. If you can't name a command, don't send it.

## The equip cooldown

After changing equipment the game refuses further changes for a few minutes —
client *and* server. Because we dispatch the **low-level** action we skip the
thunk that enforces it, so an equip during the cooldown used to look like it
worked and then quietly vanish: the server rejected it, and the loadout was back
to the old one on the next refresh.

The state field is **`delayMountTimeMs`**, and the name is misleading — it is not
a duration. The reducer stores

```
delayMountTimeMs = delayMs > 0 ? now + delayMs : 0
```

so it is an **absolute epoch-ms deadline**, `0` meaning "no restriction". That is
provable in the bundle rather than assumed: the reducer branch for
`SetRestrictionMount(delayMs)` computes `Gg(Md(), delayMs)`, and `Md()` is *now*
(elsewhere it seeds future timestamps that are later differenced against
`Md()` again, and is used to filter "deadlines still in the future"). `Gg` is
Long addition.

The game's own mount thunk gates on it:

```
(delayMountTimeMs <= now || category === <one exempt category>)
    && dispatch(<low-level mount action>)
```

`equip/game/cooldown.js` reimplements the first half — `deadline - Date.now() > 0`
— and `apply.js` refuses the **whole combo** before dispatching anything, with
`{ok:false, cooldown:true, msLeft}`. Notes:

- The check is `> now`, not `> 0`. The augment thunk and the button props builder
  use the laxer `> 0`, which stays true between expiry and the moment the
  scheduled clear fires. `> now` is the test that decides whether the server will
  accept, so it is the one we copy.
- **Refusing is not a failure.** `instant_loader.js` must not fall back to the DOM
  path: the server rejects that too, and it would visibly walk the UI for nothing.
- **We are stricter than the game by one category.** The thunk exempts a single
  category (`Hy()` in `main.1327298e.js`) whose identity we did not pin down — it
  is an alias into another module's export table, not a local accessor. A combo
  is applied as a set, so refusing all of it is the right call anyway; if that
  ever needs revisiting, resolve the alias first.
- `delayMountTimeMs` is in the Garage `toString`, so discovery picks it up with
  every other field. `verify_shipped.js` asserts it on all 8 bundles — it has
  been in the game for years, and losing it silently would bring the bug back.
- The value is a Kotlin **Long**, so read it through `toString`, never as a
  number.

## Protections

Compared **as a set**, never slot by slot: the four slots are interchangeable, so
what matters is *which* modules are mounted, not where. A combo that contains the
same modules in a different order dispatches **nothing**. The saved slot is only
a placement preference for a module that has to be mounted. Unmounts run before
mounts, because a slot must be free before it can be filled.

We deliberately skip the thunk's ALL_RESISTANCE special case: it exists because
the game's UI mounts one module at a time without knowing the desired end state,
while we always apply the full 4-slot state, so anything unwanted is removed in
the unmount phase anyway.

## Augments (Devices)

`GarageInsertDeviceClientAndServer(device, item)` and
`GarageRemoveDevice(device, item)` are already the low-level layer — both update
local state *and* send. A turret/hull holds exactly one augment, so remove runs
before insert.

Three traps, all hit for real:

- **`state.devices` is the full per-item catalog, owned or not** (verified live:
  43 devices for two mounted items). "It's in the state" ≠ "the user owns it".
- **Ownership is a field with a misleading name.** `GarageDevice` has no `owned`;
  the game derives its purchase state as
  `infinityLifetimeItem ? BOUGHT : NOT_OWNED` (both enum names are literal
  strings in the bundle). Check it **before dispatching anything**: the remove
  runs first, so inserting an unowned device "succeeds" locally, the server
  refuses, and the item ends up with no augment at all.
- **Catalogs load lazily, per baseItemId.** Reading right after a refresh can
  beat the load (that's why the first save came back without augments); the read
  path therefore *waits*, capped at 2.5 s, and sends nothing. Equipping has the
  deeper version: our low-level mount skips the thunk's catalog load, so for a
  never-opened item `device_catalog.js` dispatches
  `GarageLoadAvailableDevices(baseItemId)` itself — the exact action the game's
  own thunk dispatches, so it is identified, not guessed.

## Skins

Skins are **not** mountable items (mounting one dispatches fine and does
nothing). They are shaped like augments: a two-argument action `(skin, item)`
that writes `mountedSkin` on the turret/hull and is sent by its own controller.
There is no "remove", only replace.

It is the only write-path class with **no `toString`** (not a data class), so its
anchor is structural: the reducer builds a `GarageItem` copy where only
`mountedSkin` changes — `copy(VOID ×N, skin.id)`, with N taken from the item's
own `toString` field order. The VOID marker's minified name rotates per build, so
the pattern only requires that all leading arguments be the same identifier.

**Ownership is checked before dispatching**, exactly as for augments and for the
same reason — the garage state carries skins that are only on sale, and applying
one "succeeds" locally until the server refuses and a refresh undoes it. A skin
is an ordinary `GarageItem`, so here the plain `owned` field answers it; no
`infinityLifetimeItem` trick needed.

## Discovery (`discovery/`)

Kotlin emits a `toString` for every data class that spells out **the field names
as literal strings** next to their minified names:

```
ld(MB).toString=function(){return"Garage(itemsOnDepot="+bd(this.tpz_1)+", mountedItems="+bd(this.vpz_1)+ …
```

So discovery reads a direct `semantic name → minified name` map instead of
inferring it from code shape. Anchors:

- **state class** = the only `toString` starting `"Garage("` that contains
  `mountedItems=`; **item class** = the only `"GarageItem("`.
- **trap field** = the **last** field of the state's `toString`. The constructor
  assigns fields in exactly that order; discovery *verifies* this and returns
  `null` if it ever stops holding.
- **`ModificationCC`** (Mk) is a protocol class, so its `toString` uses a
  different shape and gets its own tiny parser.
- **`UpgradableItemParams`** → `currentLevel`; the max is behind a method, found
  via the "am I maxed?" method whose whole body is `currentLevel === maxLevel()`
  (build f1de53fa changed the `===` to `>=`; discovery accepts both).
- **`GarageDevice`** → `installed` / `baseItemId` / `previewImage` /
  `infinityLifetimeItem`.
- **image URL method** — found two independent ways: real call sites
  (`<preview>.<method>()`) and the accessor reflection names `"url"`. They agree
  on every build tested; the call-site count wins if they ever don't.
- **write actions** are data classes too, so `dataClass()` reads each one's class
  name *and* field map straight out of its `toString`. The class **name** matters
  as much as the fields: the reducer branches on `instanceof`.
- **the garage proxy and the mount/select actions** (`discovery/send.js`) anchor
  on the `mountItem` command hash — derived from the command name, so
  build-stable, and verified to appear exactly once in all 8 bundles.

Everything after the core four is **optional**: if one anchor breaks, discovery
still succeeds and only that column goes blank, rather than the whole feature
going inert.

Cached in `chrome.storage.local` keyed by **schema version + bundle URL**
(`garageConstants:v<N>:<url>`). The version exists because of a real bug: adding
fields to `discover()`'s output while an old-schema result was cached meant the
cache loaded as-is and **overrode the seed** (which did have the new fields), so
every new column silently read null. **Bump `CACHE_VERSION` in `discovery/detect.js`
whenever `discover()`'s output shape changes** (currently 11 — v10 cached a
f1de53fa result missing `maxLevelMethod`, from before the `>=` fix, so the bump
also flushes a wrong cache). Stale-prefix keys
are cleaned up on startup. `discovery/game/names.js` seeds the latest-known build so
the hook works during the discovery fetch; discovery overrides it.

**Verified on all 9 bundles in `../../../research/`:**

| build | trap field | mountedItems | mounted | mountIndex |
|---|---|---|---|---|
| f1de53fa (seed) | `aq1_1` | `ypz_1` | `yr3_1` | `zr3_1` |
| 1327298e | `vq0_1` | `vpz_1` | `tr3_1` | `ur3_1` |
| 009aa16b | `oq0_1` | `opz_1` | `lr3_1` | `mr3_1` |
| c0feea5a | `gpz_1` | `gpy_1` | `dr2_1` | `er2_1` |
| bcae4cb9 | `lpw_1` | `lpv_1` | `iqz_1` | `jqz_1` |
| c4428a58 | `lps_1` | `lpr_1` | `iqv_1` | `jqv_1` |
| a81c6ab2 | `lpr_1` | `lpq_1` | `iqu_1` | `jqu_1` |
| e76a162c | `upr_1` | `upq_1` | `rqu_1` | `squ_1` |
| 41560f11 | `qq7_1` | `qq6_1` | `nra_1` | `ora_1` |

The state class has had exactly 29 fields in every build checked. Re-verify after
**any** change to discovery — see the harness section in `debugging.md`.

## Behaviours not to regress

- Mounting alone does not move the 3D tank model — **the model follows item
  SELECTION**, so every native mount is followed by a select dispatch.
- **Paint selection has to be reasserted twice.** After a paint changes, the game
  selects the first paint of that paint's category, so the tank previews a colour
  the combo never equipped. `applyCombo` ends by selecting the mounted paint
  (`selectMountedPaint`), which is enough for the randomiser — but equipping a
  combo then navigates to the Protection tab, and that navigation overwrites the
  selection again. So `ViewRenderer.equipCombo` calls the `selectPaint` bridge
  action *after* the navigation. Order is the whole fix; doing it before is a
  no-op.
- Protections are a **set** (above). A reorder-only combo dispatches nothing.
- Augment ownership is checked **before** anything is dispatched.
- Device catalogs are lazy: the read path waits (capped, sends nothing), the
  equip path requests what's missing.
- Equipping resolves items by `baseItemId` → highest owned Mk *at equip time*.
- The DOM fallback can't equip the decorative slots.
- The equip cooldown is checked **before** anything is dispatched, and a refusal
  never falls back to the DOM.

## The send path that was removed

The first working write was different: push the garage entity onto the game's
context stack, call the proxy's `mountItem`, pop. It proved a real garage command
could be sent, but dispatching Redux actions replaced it entirely — one call that
updates the local state *and* sends — so the whole thing (its module, the
`space`/`ctx` traps, and their discovery anchors) was deleted in Aug 2026.

If the action path ever breaks and you need it back: the Space is anchored on the
literal error `"has been unloaded from space"`, the context stack on
`"GameObject in context is null"`, and the send is
`ctx.push(garageEntity) → proxy.mountItem(space.lookup(item.id)) → ctx.pop()`.
The full derivation is in `../../../research/CLAUDE.md`. The garage **proxy**
itself is still captured — `findStore()` reaches the controller, and the store,
through it.
