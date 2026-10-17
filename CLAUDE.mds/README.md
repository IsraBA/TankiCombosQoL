# CLAUDE.mds — the detailed docs

One file per area. **Read only what your task needs** — that is the whole point
of the split. `../CLAUDE.md` (loaded automatically) already carries the project
overview and the rules that apply to every task.

| File                                   | Read it when you are…                                                       | Contents                                                                                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [`conventions.md`](conventions.md)     | writing or reviewing **any** code here | comment budget, file headers, modularity, naming, CSS prefix, native look, error handling, **how to anchor a discovery on the game's code**, **the end-of-round checklist** |
| [`architecture.md`](architecture.md)   | touching `manifest.json`, adding a file, or wondering where code may live | the three execution contexts, the 10 manifest blocks and why, load order, namespaces, storage layout, **how every game name is found (no seeds, `shared/bundle.js`)**, the full source tree |
| [`combos.md`](combos.md)               | working on the combos feature — cards, storage shape, randomizer, migration | selectors, the two data generations, the combo-card interaction model, the migrator, languages, the legacy DOM path                          |
| [`garage-native.md`](garage-native.md) | touching anything that reads or writes the **game's own state**             | the ISOLATED/MAIN split, the bridge protocol, discovery anchors, the write path, ownership and lazy-loading traps, behaviours not to regress |
| [`advisor.md`](advisor.md)             | working on recommended protections                                          | what the battle state exposes and how it is trapped, the module↔turret map, the ranking, the protection-tab block, the product rules          |
| [`hud.md`](hud.md)                     | working on the battle HUD editor                                            | the one render hook, identifying an element by who added it, per-build discovery of names and geometry, the two layouts, the editor's rules, **the game's own way to Settings → Controls**, the yellow-dot / banner pointers to the editor |
| [`translator.md`](translator.md)       | working on the battle-chat translator                                       | the canvas takeover, the two bugs it is shaped around, RTL/bidi, backends, in-game settings, recovery when a build breaks it                 |
| [`debugging.md`](debugging.md)         | something is broken, or **the game shipped a new build** | what the console exposes (`__CMB`, `__ADV`, `__HUD`, `__CT_*`), symptom → cause tables, the offline harnesses, **the new-build procedure** |
| [`store.md`](store.md)                 | releasing, packaging, or changing what the listing claims                   | CWS hygiene, permissions, packaging rules, the manual test checklist                                                                         |

Deeper reverse-engineering material (how the anchors were originally derived,
the WebSocket protocol, dead ends) lives outside the extension in
`../../../research/CLAUDE.md`. Everything needed to _work on the extension_ is
here.
