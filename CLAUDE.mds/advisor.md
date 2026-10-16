# Feature: Advisor — recommended protections

**Status: complete, shipping in v4.0.** The recommendation is computed and shown
in the game's protection tab, updates live, and the button equips it. Nothing is
printed at runtime; `__ADV.raw()` serves that need on demand.

```
features/advisor/
├── recon/game/probe.js      [MAIN] the four traps, on the discovered names
├── recon/discover.js        [ISOLATED] trap-field discovery from the bundle
├── recon/detect.js          [ISOLATED] register with shared/bundle.js, send the fields to MAIN
├── recon/game/report.js     [MAIN] parse the roster, rank the turrets
├── recon/game/inventory.js  [MAIN] the account's protection modules
├── bridge/bridge.js         [ISOLATED] + bridge/game/bridge_main.js
├── model/resistance_map.js  turret baseItemId -> resistance, and the 30% bar
├── model/recommend.js       pure: ranking + inventory -> {ordered, equip, equipped}
├── view/panel_render.js     builds the DOM, harvests icons
├── view/protection_panel.js injection, placement, lifecycle, equipping
└── main.js                  starts the panel while the garage is on screen
```

## The problem it solves

Mid-battle, players run to the garage to swap protections against the enemy
team's strongest turrets, then run back. Doing it well means having read the Tab
scoreboard carefully *before* entering the garage — which players routinely
forget, and then they pick badly and carry that for the rest of the battle. The
advisor reads what the client already knows and recommends the four modules
worth wearing.

## Designed to grow into full combo recommendation

The long-term plan is a "recommended combo" card in the combos tab, taking map
size, mode, enemy protections and the player's inventory into account. Two
structural decisions keep that cheap, and both must be preserved:

- **The output is combo-shaped** — the same object as `savedCombos[].data`.
  Today only `protection`; later the full set of slots. That makes "Equip all"
  literally `InstantLoader.equipCombo({data})`, inheriting the cooldown guard,
  the loading ring, protections-as-a-set and the Mk resolution for free, and
  makes the future card a `ComboCardRenderer` on a synthetic combo.
- **Facts and opinions are separate.** The snapshot holds only what the game
  says; the model holds every judgement. Growing means adding fields to the
  snapshot and rules to the scorer, never restructuring. The model must stay
  pure — no `chrome`, no DOM, no game objects — so a harness can run invented
  battles through it.

## What the battle state gives us

Four MAIN-world traps, same technique as the garage hook (last field the
constructor writes, validated by the class name inside its own `toString`).
Field names are read at runtime out of each object's `toString`, so only the
four trap fields depend on the build — and since build f1de53fa broke them
(Sep 2026), those too are **discovered at runtime** rather than pinned:

- `recon/discover.js` [ISOLATED] parses the live bundle: for each marker
  (`"BattleUsers(` etc.) it requires a **unique** `toString`, takes that class's
  constructor, verifies the ctor assigns fields in exactly the `toString` order
  (else returns null), and yields the **last** field. All four or nothing.
- `recon/detect.js` [ISOLATED] registers the discovery with `shared/bundle.js`
  (cached as `advisorFields:v<N>:<url>`; the pipeline: `architecture.md` → "Names
  come only from the bundle") and posts the result to MAIN as an
  `__adv`/`advisorFields` message, again on MAIN's `ready`.
- `probe.js` [MAIN] has no names of its own: it arms nothing until discovery
  sends the four fields. `__ADV.debug.discovered` says they arrived.

**One trapped field may carry several markers, and that is load-bearing.**
`I.armed` maps field → the markers listening on it, because discovery can hand
back a name already armed for a *different* class — the four names come
out of one generator and share prefixes (`hpw_1` was `BattleUsers` in c4428a58;
`lpw_1` was `BattleStatistics` until 8f7f4827, and in 6a85fbcf it is the root
Redux state's field). Simply skipping an already-armed field
would drop that capture silently, so a crossed name **adds** its marker instead.
A field owned by a *foreign* trap (combos, another extension) is still skipped —
`__ADV.debug.skipped` counts those. When newer names replace older ones (an
old-version cache refreshed in the background), the marker a replaced field
carried is removed, and a field left with no marker comes off
`Object.prototype` (the rule for every feature: `architecture.md` → "Names come
only from the bundle"). `test_advisor_probe.js` guards all of it.

The invariant discovery leans on — ctor order == `toString` order, and the
field counts (13/27/2/32) — held on 12/12 bundles (41560f11 … 6a85fbcf);
`build/harnesses/test_advisor_discover.js` re-checks every bundle in
`research/`.

| class | trap field (6a85fbcf) | what it carries |
|---|---|---|
| `BattleUsers` | `uqa_1` | the roster: `uids`, `teams`, `stats`, `gearScores`, `tankInfo`, `tankResistance`, `onlineUsers` |
| `BattleStatistics` | `jq2_1` | `mapName`, `mode`, `battleFormat`, **`isReArmorEnabled`**, `scoreLimit`, `battleLoaded` |
| `LocalBattleUserState` | `vq8_1` | **`weaponResistanceProperty`**, **`isReArmorTemporaryDisabled`** |
| `User` | `wqo_1` | our own profile — `id` identifies "me", and from that, who is an enemy |

Measured facts, each of which cost a round to learn:

- **`UserBattleStat` is a dead end.** It looks like exactly the Tab row we want
  and is never constructed, not even after pressing Tab. `BattleUsers` is the
  real source and it is populated without Tab ever being opened.
- **The battle state survives entering the garage mid-battle.** No snapshot
  mechanism is needed — the objects stay live while the player is in the garage,
  which is precisely when the recommendation is consumed.
- **`tankInfo` empties out temporarily** — on death, and while in the garage.
  Reading it naively yields `weapon: null` for everyone exactly when it matters
  most, so the probe caches equipment per player and falls back to the cache.
  Change detection compares against the cache too, or an empty-then-refilled
  map would read as "everyone changed equipment".
- **`teams` is absolute** (`TEAM_A` / `TEAM_B`), better than a relative
  "enemy" flag. `uids` keeps players who left; `onlineUsers` is real presence.
- **The three re-arm regimes are all readable**: `isReArmorEnabled` (may you
  swap at all in this battle), `isReArmorTemporaryDisabled` (have you already
  used your one swap), and the garage's own `delayMountTimeMs` cooldown.
- **`weaponResistanceProperty` tracks the turret you are actually holding**,
  live — it flipped to `TERMINATOR_RESISTANCE` when the player became a
  juggernaut in a special mode and back on death. It is the game telling us its
  own turret→resistance mapping for one turret at a time.

Enemy `tankInfo` carries `weaponBaseId`, `hullBaseId`, `weaponDeviceId` and
`hullDeviceId` — turret, hull and **both augments** — in the same id space as
the garage, so `__CMB`'s index resolves them to names. `tankResistance` even
gives each enemy's own modules with percentages, which the full-combo version
will want.

## Module → resistance

19 modules. The **game itself** states each module's resistance enum inside the
module item's `upgradeableParams` (`property = SHAFT_RESISTANCE` on Eagle), so
that half needs no table and no language assumptions.

The turret half comes from the wiki table below. **Do not map turret names to
enum names by string similarity** — six of them do not match:

| turret | enum |
|---|---|
| Isida | `ISIS_RESISTANCE` |
| Scorpion | `SCORPIO_RESISTANCE` |
| Vulcan | `MACHINE_GUN_RESISTANCE` |
| Hammer | `SHOTGUN_RESISTANCE` |
| Striker | `ROCKET_LAUNCHER_RESISTANCE` |
| Magnum | `ARTILLERY_RESISTANCE` |

Instead, compose: the game gives module→enum, the table gives module→turret,
and the two together give turret→enum with nothing guessed. The result is then
keyed on **`baseItemId`**, numeric and language-independent, because the turret
names the state returns are localized.

| module | protects from | module | protects from | module | protects from |
|---|---|---|---|---|---|
| Fox | Firebird | Lion | Ricochet | Vulture | Scorpion |
| Badger | Freeze | Shark | Vulcan | Griffin | Magnum |
| Ocelot | Isida | Dolphin | Smoky | Falcon | Railgun |
| Weasel | Tesla | Orka | Striker | Owl | Gauss |
| Wolf | Hammer | Grizzly | Thunder | Eagle | Shaft |
| Panther | Twins | Raven | Tsunami | Spider | Mine |

There is **exactly one module per turret**: 19 modules minus Armadillo
(critical) and Spider (mines) leaves 17, and the garage holds 17 turret
families. A turret with no module would be a new turret, and it is worth
noticing if that count ever stops matching.

### The composed table

Turret `baseItemId` → resistance enum. The ids are what enemy `tankInfo`
reports directly, so nothing is resolved through a localized name at runtime.

| baseItemId | turret | enum |
|---|---|---|
| 920009630983 | Firebird | `FIREBIRD_RESISTANCE` |
| 920009631074 | Freeze | `FREEZE_RESISTANCE` |
| 920009630913 | Isida | `ISIS_RESISTANCE` |
| 921009714084 | Tesla | `TESLA_RESISTANCE` |
| 920009631046 | Hammer | `SHOTGUN_RESISTANCE` |
| 920009630997 | Twins | `TWINS_RESISTANCE` |
| 920009631088 | Ricochet | `RICOCHET_RESISTANCE` |
| 920009631144 | Vulcan | `MACHINE_GUN_RESISTANCE` |
| 920009630969 | Smoky | `SMOKY_RESISTANCE` |
| 920009630990 | Striker | `ROCKET_LAUNCHER_RESISTANCE` |
| 920009631123 | Thunder | `THUNDER_RESISTANCE` |
| 1931009780251 | Tsunami | `TSUNAMI_RESISTANCE` |
| 931009771122 | Scorpion | `SCORPIO_RESISTANCE` |
| 920009630976 | Magnum | `ARTILLERY_RESISTANCE` |
| 920009631011 | Railgun | `RAILGUN_RESISTANCE` |
| 920009631151 | Gauss | `GAUSS_RESISTANCE` |
| 920009631158 | Shaft | `SHAFT_RESISTANCE` |

Verified two ways against a captured battle: every module's enum came from the
game and matched the wiki table on all 19, including the six that do not match
by name; and every turret id observed on an enemy resolved to the expected name
on the same player, 16 for 16. The one apparent contradiction was a player who
genuinely swapped turret mid-battle (Hammer → Isida), which an ordered trace
confirmed — worth knowing, because a set-based check reports that as a
mismatch.

`TERMINATOR_RESISTANCE` exists and belongs to the juggernaut, which is not a
garage turret and has no module. `ALL_RESISTANCE` is the unique modules.

## The ranking

**Score turret types, not players.** That one reframing is what makes the whole
thing work, and it is worth not losing: what you equip is protection against a
*turret*, so two enemies carrying Smoky both feed the same module. Ranking
players and taking "the top 3" throws that away and cannot answer the case that
actually comes up — several enemies on one turret, none of them individually
top-ranked.

So: **sum kills per turret across every online enemy**, rank, and take the top
3 (when Armadillo is worn) or 4. Ties break on points, then number of carriers,
then summed gearScore, then turret id — the last two exist so that a fresh
battle, where every count is zero, still produces a stable order rather than one
that reshuffles between renders for no visible reason.

Kills rather than points as the primary signal, because points come from flags
and control points in objective modes, so a flag runner would outrank a killer.
Kills measure the thing protections defend against.

Two consequences that look like flaws and are not:

- **Kills follow the player, not the turret.** Someone who switched turret
  mid-battle carries their earlier kills to the new one. That is the intended
  reading — the number says "this player is dangerous", which is what matters.
- **The healer-augment exclusion list turned out unnecessary.** A support player
  does not get kills, so they never reach the top of the ranking on their own.
  Kills-based scoring dissolves the problem the list was invented for.

A module below 30% is never recommended (`MIN_PERCENT` in `resistance_map.js`;
30 exactly still qualifies — the bar started at 35 and the developer settled on
30), and neither is one the account does not own; the ranking simply continues
down the list.
If fewer than three qualify, fewer are recommended. This deliberately targets
players whose garage is fully upgraded rather than trying to serve everyone.

**Compute on read, never cache.** The recommendation is derived when it is
displayed, from the freshest captured roster. Confirmed live: `BattleUsers` keeps
being rebuilt while the player sits in the garage, so the data stays current at
exactly the moment the recommendation is consumed.

## The block in the protection tab

Two blocks are injected into `GarageProtectionsComponentStyle-blockParametersProtection`:
a small non-interactive row holding the **whole** ranking in order (the reasoning
behind the recommendation), and below it the 3-4 modules to equip in the game's
own slot styling, with an EQUIP ALL button. Hidden entirely when there is no
battle, when nothing qualifies, or when equipping is blocked — and "blocked"
means **exactly what the combos path checks**, `delayMountTimeMs` through
`mountCooldown()`. The battle also exposes `isReArmorEnabled` and
`isReArmorTemporaryDisabled`, and gating on those as well was wrong: it is a
second, invented rule for the same question.

**The game's block is out of flow, so DOM order does not position ours.**
`ksc-254` (the mounted set) is `position: absolute; bottom: 2.4375em`, and its
containing block is `GarageMainScreenStyle-blockParameters` — *not* the column it
is nested in, which has no `position`. Exactly the same trap as the cooldown
block. Inserting a sibling above it does nothing; our block is absolute too.

**Its top is not where the CSS suggests.** The per-slot delete button carries
`margin-top: -9.125em` under a doubled-class rule, so it floats far above the
slots it belongs to, and a block placed just above the slots lands on top of it.
The offset is therefore a single tuned constant — `bottom: 17.4em` — built from
the game's own numbers: `2.4375` (its `bottom`) + `5` (slot) − `1.5`
(`resistanceIcon` centred in the slot) + `9.125` (that negative margin) + `0.25`
(the 2.5em box overflowing the 2em icon) + the gap. It is the one value to
adjust if the block ever sits wrong. `bottom` only — the horizontal axis keeps
its static position, which is what aligns us with the game's block.

**Read the whole cascade, never one rule.** The game's generated CSS overrides
itself with doubled-class selectors (`.ksc-260.ksc-260`), so the first rule you
find is routinely a lie: the base says the unequip box is `12.375em × 3em`, while
the doubled rule makes it `2.5em × 2.5em` with a `0.063em` ring. Our button
copies those real values. Only values are copied; the hashed class names rotate
per build and are never referenced.

Anchors and assets (every selector and borrowed class name lives in combos'
`lib/constants.js`, like the rest of the project):

- The slots wear the game's slot classes (`PROTECTION_SLOT_CLASSES`), so the
  frame art comes from the game and no hashed SVG URL is hardcoded.
  `pointer-events: none` suppresses the hover, which would otherwise promise an
  interaction that is not there.
- Module icons are harvested from the game's own list cells
  (`GarageItemComponentStyle-itemResistanceIcon`, keyed by the name in
  `-descriptionDevice`), with the item's `resistanceBackgroundImg` and then
  `preview` as fallbacks. The list may be virtualised, so the fallbacks matter.
- **The button disappears once clicking it would change nothing.** The mounted
  set is compared against the recommendation as a *set*, the same rule the write
  path uses — and the sizes must match too, because a fifth module the apply
  would unmount is a real difference. The blocks themselves stay: they are still
  telling you what the enemy is bringing.
- Equipping goes through `InstantLoader.equipCombo(..., {forceProtections:true})`.
  The flag exists because this panel is about protections only and must not be
  silenced by `equipProtectionsOnLoad`. Everything else — the set-based diff, the
  cooldown refusal, the loading state — comes along for free.

## Performance

The game is heavy on its own, so the advisor's standing budget is: **during
battle, capture and nothing else; in the garage, pay for real changes only.**

- **Battle-time captures dedup by reference.** The game's state is immutable, so
  a rebuilt `BattleUsers` reuses the same `tankInfo`/`tankResistance` objects
  when nothing equipment-related changed. `onRoster` compares those references
  and skips the Kotlin-`toString` stringify+parse entirely — which used to run
  on *every* kill and score tick. Equipment harvesting still happens the moment
  the reference changes, so the cache misses nothing.
- **One graph scan per garage-state version.** `I.garageCol()` is the single
  cached `collect()` all readers share — name resolution, `readModules`,
  `mountedProtectionIds` (which passes the collected result into
  `currentProtectionSlots`). The panel polls every second, but an idle garage
  state costs nothing: the scan and the 19 huge module `toString` dumps run only
  when the state object is actually new.
- **`buildUsers` caches per roster reference** (and garage-state reference, for
  name resolution), so repeated reads between battle updates are free.
- The panel's MutationObserver watches the **garage wrapper**, not
  `document.body` — the hide-guard precedent — and exists only while the panel
  does; `AdvisorPanel.stop()` disconnects it outside the garage.

## Product rules

- **Armadillo protects against critical damage** (`CRITICAL_RESISTANCE`) and is
  the most valuable module in the game. If the player owns it **at 30% or
  more**, it always takes the first slot, and the remaining three follow the
  turret ranking.
- **Spider (mine protection) is never recommended.** It guards against mines
  rather than any turret, so it falls outside the model.
- **Unique modules (Spectrum and friends) are out of scope.** They occupy all
  four slots and almost nobody owns one.
- **No healer-augment exclusion list.** It was planned, then made redundant:
  support players do not get kills, so kills-based ranking never elevates them.
  Revisit only if some augment kills a lot yet should not be protected against.
