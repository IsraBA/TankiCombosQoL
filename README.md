# Tanki Online — Combos & QoL

<div align="center">
  <img src="assets/icons/icon128.png" alt="Tanki Online — Combos & QoL" width="128" height="128">

  **Quality-of-life browser extension for Tanki Online**

  [![Version](https://img.shields.io/badge/version-4.0-blue.svg)](manifest.json)
  [![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)](manifest.json)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [Privacy & permissions](#-privacy--permissions)
- [Architecture](#-architecture)
- [Project structure](#-project-structure)
- [Development](#-development)

---

## 🎯 Overview

A single extension with the tools that make Tanki Online less tedious, added
directly into the game's own interface:

- **Combo manager** — save a full garage setup and equip it again in one click.
  It applies the change through the game's own model, so there is no tab walking
  and no flicker.
- **Protection recommendations** — while you are in a battle, the garage tells
  you which protection modules are worth wearing against the enemy team, and
  equips all of them with one button.
- **Battle chat translation** — read foreign chat in your own language, in place
  on the game screen.

All of it is built to look and feel native: the UI mirrors the game's own
colors, fonts, and hover states rather than announcing itself as a third-party
addition.

---

## ✨ Features

### ⚙️ Combo manager

- **Save your current setup** — read straight out of the game's garage state,
  so saving is instant and you never leave the tab.
- **Equip in one click** — applied through the game's own equip actions rather
  than by clicking around the UI: no tab walking, no flicker, and it lands on
  the Protection tab when it's done.
- **Full equipment coverage:**

  | Category | Notes |
  | --- | --- |
  | **Turrets** | includes augment support |
  | **Hulls** | includes augment support |
  | **Drones** | handles name variations |
  | **Grenades** | — |
  | **Protection** | all 4 slots, compared as a set so a reorder changes nothing |
  | **Augments** | tracked separately per turret/hull |
  | **Paint** | saved and equipped as part of the combo |
  | **Skins** | turret and hull skins, saved with the combo |

- **Combo cards** with item preview images; drag and drop to reorder; rename
  inline; delete with confirmation.
- **Per-item skip** — mark a single slot as "removed" so a combo only changes part
  of your setup.
- **"Include protections" toggle** — when off, equipping a combo leaves your
  current protections untouched (their icons dim on the cards to show they're
  skipped).
- **Randomizer** — pick a random saved combo, or roll a fully random setup from
  the items you own.
- **The combo you are wearing is marked** — a card whose items are all equipped
  is highlighted, so you can see at a glance what is on your tank.
- **No duplicates** — saving a loadout you already have replaces that entry
  instead of adding a second copy, and keeps the name you gave it.
- **Respects the game's equip cooldown** — while the game is blocking equipment
  changes the cards are disabled and the timer is shown, so a change cannot be
  silently rejected by the server.
- **Import / export** — move your combos between browsers or back them up.
- **Quick access** — a "COMBOS" tab in the garage menu, a button in the lobby, and
  the `C` key shortcut.
- **Follows the game's language** and only ever equips items you actually own.

### 🛡️ Protection recommendations

Players duck into the garage mid-battle to swap protections against whoever is
hurting them most, and usually have to remember the enemy line-up from memory.
This does the remembering.

- **Reads the battle you are actually in** — the enemy team's turrets and their
  kills, straight from the game's own battle state. No scoreboard scraping and
  nothing typed in by hand.
- **Ranks turret types, not players** — three enemies on one turret add up, which
  is exactly the case that is easy to misjudge by eye.
- **Shown in the game's Protection tab**, above your mounted set: the full
  ranking in order, then the modules worth equipping, in the game's own styling.
- **EQUIP ALL** applies the whole set in one click, changing only what actually
  differs, and disappears once there is nothing left to change.
- **Only recommends what you own and have upgraded** to 30% or more, and
  Armadillo always takes the first slot when you have it.
- **Stays out of the way** — nothing is shown outside a battle, or while the
  game is blocking equipment changes.

### 💬 Battle chat translation

- **Instant, then translated** — the original message is drawn immediately (so
  chat never lags), with a small spinner, then swaps to the translation.
- **Source language shown** — e.g. `[RU] » nice shot`, so you always know what was
  translated.
- **20 target languages**, picked from a native-styled dropdown injected into the
  game's own Settings screen.
- **Slang stays slang** — `gg`, `ez`, `noob`, `hahaha` and friends are shown
  verbatim and never sent anywhere.
- **Hebrew and Arabic read the right way round** — the game draws chat left to
  right whatever the language, so right-to-left messages arrive reversed on
  screen. The extension reorders them before they're drawn. This is a display
  fix done entirely in your browser; nothing is sent anywhere for it.
- **Toggle any time** — a button next to the chat bar, or `Alt+T`, flips the whole
  chat between original and translated. The setting persists.
- **Fully optional** — turn translation off in the game's Settings screen and the
  combo manager keeps working exactly as before.

---

## 🚀 Installation

### From the Chrome Web Store

**[➜ Install from the Chrome Web Store](https://chromewebstore.google.com/detail/tanki-online-combo-manage/aodkeckgccekmgmeddikfjgfnomalacm)**

> **Updating from an older version?** v4.0 asks for **no new permissions**, so
> nothing needs re-approving. (If you are coming from before v3.0, that release
> added chat translation and did need permission for the translation service —
> Chrome disables an extension until such a permission is approved. Click the
> extensions (puzzle 🧩) icon in your toolbar and accept it; it happens once.)

### Load unpacked (development)

1. Clone the repository:
   ```bash
   git clone https://github.com/IsraBA/TankiCombosQoL.git
   ```
2. Open `chrome://extensions/` and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Open [Tanki Online](https://tankionline.com), log in, and enter the garage —
   you should see a new **COMBOS** tab.

Requires Chrome, Edge, or another Chromium-based browser.

---

## 📖 Usage

### Saving your first combo

1. Equip the setup you want in the garage.
2. Open the **COMBOS** tab (or press `C` in the lobby).
3. Click **Save Current Combo** — a card appears with your equipment.
4. Click the combo's name to rename it (e.g. "Sniper Setup") and press Enter.

### Loading a combo

Open the **COMBOS** tab and click the combo card. Everything — items, augments,
paint, skins and protection modules — is applied through the game's own equip
actions, so it happens at once rather than by walking the tabs, and you land on
the Protection tab afterwards.

### Managing combos

- **Reorder** — drag a card to a new position.
- **Delete** — click the × on the card and confirm.
- **Skip one item** — click the × on an individual item image; it will be left
  untouched when the combo is equipped.

### Using protection recommendations

Enter a battle, then open the garage and go to the **PROTECTION** tab. Above
your mounted modules you will see the recommended set for the battle you are in,
with the full ranking above it. Click **EQUIP ALL** to wear them. The
recommendation keeps updating while you stand there, so it reflects the battle
as it develops.

### Using chat translation

It is on by default. Enter a battle and foreign messages will translate
themselves. To configure it, open the game's **Settings** screen and scroll to the
**Chat Translator** section, where you can turn it off or change your language.
In battle, the button next to the chat bar (or `Alt+T`) switches between the
original text and the translation.

### Keyboard shortcuts

| Key | Action | Context |
| --- | --- | --- |
| `C` | Open the combo manager | Lobby / garage |
| `Alt+T` | Toggle original ↔ translated chat | In battle |

### Tips

- Create combos per game mode (TDM, CTF, CP) and give them clear names.
- Put your most-used combos at the top.
- Re-save a combo after upgrading equipment so it stays current.

---

## 🔒 Privacy & permissions

Short version: **your combos never leave your browser. The only thing that is ever
sent anywhere is the text of a chat message you asked to have translated.**

| Permission | Why it's needed |
| --- | --- |
| `storage` | saves your combos and settings locally |
| `*://*.tankionline.com/*` | the game page — read equipped items, inject the UI, locate the chat UI |
| `translate.googleapis.com`, `lingva.lunar.icu`, `lingva.ml` | send message text to be translated |

- Combos, names, order and settings are stored with the browser's extension
  storage. They are never transmitted.
- The protection recommendations are computed **entirely in your browser** from
  data the game has already sent to it. Nothing about the battle, the players in
  it or your equipment is sent anywhere.
- When translation is enabled, the **text of a chat message** is sent to Google
  Translate (with Lingva as a fallback) to get the translation back. Only the text
  and your target language are sent — no username, no sender identity, no other
  metadata. Nothing is sent while translation is off, and slang-only messages are
  never sent at all.
- There is no server of our own, no account, no analytics, no tracking, and no
  chat history stored anywhere.

Full details: [docs/PRIVACY.md](docs/PRIVACY.md).

This extension is an independent tool and is not affiliated with or endorsed by
Tanki Online or its publisher.

---

## 🏗️ Architecture

Vanilla JavaScript, Manifest V3, no build step and no external libraries. Each
feature is self-contained under `features/`; only UI components are shared.

```
┌────────────────────── ISOLATED world ──────────────────────┐
│  features/combos/     the UI, and what to apply             │
│  features/advisor/    the recommendation model + its panel   │
│  features/translator/isolated/    chrome.* access:           │
│    bridge.js   settings sync + translate relay               │
│    detect.js   parses the game bundle for the chat HUD       │
└──────────────────────────┬──────────────────────────────────┘
                           │ window.postMessage bridges
┌──────────────────────────┴───── MAIN world ─────────────────┐
│  any game/ folder    shares the page's window                │
│  combos  capture the garage state, dispatch the game's own    │
│          Redux actions to equip                               │
│  advisor capture the battle state, rank the enemy turrets     │
│  translator/main/  captures the chat HUD, rewrites messages   │
└──────────────────────────┬──────────────────────────────────┘
                           │ chrome.runtime.sendMessage
┌──────────────────────────┴──────────────────────────────────┐
│  background.js (service worker)                              │
│    the only context allowed the cross-origin fetch           │
│    Google Translate → Lingva fallback                        │
└──────────────────────────────────────────────────────────────┘
```

Why three contexts: content scripts run in an isolated world by default, which is
fine for DOM work, but reading the game's own state — the garage, the chat HUD,
the battle roster — needs a hook on the page's own `Object.prototype`, which is
MAIN-world only. And in MV3 a content-script `fetch` is bound by the page's CORS
policy, so the translation request has to happen in the service worker. One rule
keeps it straight: **anything under a `game/` folder runs in MAIN.**

`shared/` holds the native-styled `switch`, `select` and `drawer` components plus
`icons.js`. Because JS worlds don't share a `window`, the component files are
listed in both worlds' content-script blocks; each world gets its own copy on
`window.TankiQoL`.

---

## 📂 Project structure

```
.
├── manifest.json              # 7 content-script blocks (CSS / translator ×2 / combos ×3 / advisor ×2)
├── background.js              # service worker — translation fetch
├── shared/
│   ├── icons.js               # SVG paths more than one feature draws
│   └── components/            # switch, select, drawer
├── features/
│   ├── combos/                # folders follow the flow; any game/ folder = MAIN world
│   │   ├── main.js            # orchestrator
│   │   ├── lib/               # constants (DOM selectors), utils, language, cleaner
│   │   ├── discovery/         # find this build's minified names, arm the hook
│   │   ├── bridge/            # the pipe between the two JS worlds
│   │   ├── capture/           # hold the game's live garage state
│   │   ├── save/              # read the mounted loadout and store it
│   │   ├── view/              # the combos UI: cards, lobby entry, panels
│   │   ├── equip/             # apply a combo through the game's own actions
│   │   ├── migration/         # backfill ids on old combos
│   │   ├── randomizer/        # random combo / random full setup
│   │   └── dom/               # the DOM toolbox the legacy paths use
│   ├── advisor/               # protection recommendations
│   │   ├── recon/game/        # [MAIN] capture the battle state, rank the turrets
│   │   ├── bridge/            # its own pipe between the worlds
│   │   ├── model/             # pure: ranking + your modules -> a recommendation
│   │   └── view/              # the block injected into the Protection tab
│   └── translator/
│       ├── isolated/          # bridge.js, detect.js
│       ├── main/              # chat.js, translate.js, settings.js, skiplist.js, toggle.js, gamesettings.js
│       └── assets/flags/      # language flags
├── assets/icons/              # extension icons
├── docs/                      # PRIVACY.md, STORE.md, PACKAGING.md
├── build/
│   ├── make-zip.ps1           # builds the Chrome Web Store zip
│   └── harnesses/             # offline checks that run the shipped code
├── HTML-examples/             # captured game HTML/CSS, used as styling reference
├── CLAUDE.md                  # developer/agent guide — start here
└── CLAUDE.mds/                # the detailed docs, one file per area
```

**Design rules** (the long version lives in [CLAUDE.mds/](CLAUDE.mds/README.md)):

- Scanners only read, equippers only write, navigators only move.
- All game DOM selectors live in one file
  (`features/combos/lib/constants.js`) — every feature uses it, not just combos.
- Never use the game's generated CSS class names (`ksc-*`) — they change every
  build. Extension classes are prefixed `cme_`.
- Wait on the DOM with MutationObservers, not fixed timeouts.
- The script order in `manifest.json` is a dependency chain — don't reorder it.

---

## 💻 Development

```bash
git clone https://github.com/IsraBA/TankiCombosQoL.git
```

Then load the folder unpacked (see [Installation](#-installation)). There is no
build step — edit a file, hit the reload icon on the extension card in
`chrome://extensions`, and refresh the game tab.

**Debugging.** The extension prints nothing at runtime; state is pulled on demand
instead. In the game page's console, `__CMB.read()`, `__CMB.state()` and
`__CMB.debug` expose the garage hook, `__ADV.raw()` the captured battle, and
`__CT_STATE()` / `__CT_DEBUG` / `__CT_MSGS` the translator. Full debugging and
recovery notes — including what to do when a Tanki update breaks chat detection —
are in [CLAUDE.mds/debugging.md](CLAUDE.mds/debugging.md).

**Packaging for the store.** Run `build/make-zip.ps1`. It packs only what should
ship and refuses to build if internal docs slip in; see
[docs/PACKAGING.md](docs/PACKAGING.md).

**Testing.** `build/harnesses/` holds plain `node <file>.js` scripts — no
dependencies, no framework — that run the *shipped* code offline against real
game bundles: discovery, the read and write paths, the migrator, the randomiser's
filters, the recommendation model. Run them all after any change. What they
cannot cover is anything that needs a live account or a real battle, so also walk
the checklist in [CLAUDE.mds/store.md](CLAUDE.mds/store.md) → "Testing", with at
least one non-English game locale if you touched UI or selectors.

### Common issues

| Symptom | Likely cause |
| --- | --- |
| COMBOS tab missing | game UI changed — update selectors in `features/combos/lib/constants.js` |
| Items not equipping | name cleaning in `utils.js`, or ownership detection |
| Clicks not registering | timing — adjust the waits in the equippers/navigators |
| Chat not translating | bundle detection broke after a game update — see CLAUDE.mds/translator.md → "When a Tanki build breaks the translator" |

---

### Version history

**v4.0** — Saving and equipping now run against the game's own state instead of
clicking through the UI: instant, no flicker. Paint and skins became combo slots.
Added protection recommendations that read the battle you are in. The combo you
are wearing is marked, duplicate combos are no longer kept, and the game's equip
cooldown is respected. Opening the tab after an update shows a one-time note of
what changed. No new permissions.

**v3.1** — Right-to-left chat fix: Hebrew and Arabic messages are no longer shown
reversed on the game's canvas.

**v3.0** — Added battle chat translation (previously a separate extension) and
renamed to "Combos & QoL". Restructured into `features/` + `shared/`.

**v2.5** — "Include protections" toggle when equipping.

**v2.0** — Full rewrite: modular layout, automatic tab navigation, protection (4
slots) and augment support, drag-and-drop reorder, lobby button and `C` shortcut,
multi-language, per-item removal.

**v1.0** — Basic save/load, manual tab switching, limited equipment.

---

## 📄 License

Copyright © 2025–2026 IsraBA.

This program is free software: you can redistribute it and/or modify it under
the terms of the **GNU General Public License, version 3** as published by the
Free Software Foundation. See [LICENSE](LICENSE) for the full text.

In plain terms: read it, learn from it, fork it, build on it. But if you
distribute something that contains this code — a browser extension, a userscript,
anything — that work has to be released under the GPL as well, with its source
available. This code may not be absorbed into a closed-source or paid product.

It is distributed in the hope that it will be useful, but **without any
warranty**; without even the implied warranty of merchantability or fitness for
a particular purpose.

---

[Issues](https://github.com/IsraBA/TankiCombosQoL/issues)
