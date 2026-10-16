# Code conventions

## Comments

**Up to 10 words per comment. Up to 20 words in a file header.** That is a hard
budget, not a guideline.

- A comment explains **why**, or names a non-obvious trap. It never narrates what
  the next line already says.
- Anything that needs a paragraph is not a comment — it is documentation. Put it
  in the matching `CLAUDE.mds/` file and, if the code needs a pointer, write one
  short line: `// הרציונל: CLAUDE.mds/combos.md`.
- Comments are **in Hebrew**. (The translator's files were written in English as
  a separate project; new code in them should be Hebrew, existing English text
  may stay.)
- Keep the one-line section separators (`// ---- הגנות ----`). They are cheap and
  make a long file scannable.
- **No commented-out code.** Git remembers it.
- **The extension prints nothing at runtime.** No `console.log`, no
  `console.warn`. The only permitted call is **`console.error`, and only for an
  unexpected total failure** — a thrown exception, or a piece of the game's DOM
  we depend on being absent (e.g. a garage tab that isn't there). Anything that
  can legitimately happen — the user doesn't own an item, a combo has no
  protections, a slot fell back to the DOM path — is **not** an error and is not
  logged. Return a value and let the caller decide.

Why the budget: this codebase went through a phase of 30-line block comments
that duplicated the docs, drifted from them, and buried the code. If a future
change makes a comment wrong, the comment is the bug.

## Files

- Every file starts with **its own path**, then one short line saying what it is:

  ```javascript
  // features/combos/dom/scanners/protection_scanner.js

  // סורק את מודולי ההגנה המורכבים כרגע
  ```

  For a file that runs in a specific JS world, note it on the path line:
  `// features/translator/main/chat.js  [MAIN world]`.

- **One file, one responsibility. Target ≤150 lines.** A little over is fine; a
  file that keeps growing is telling you it holds two things.
- Scanners only read, equippers only write, navigators only move, UI modules
  render and bind. A folder is one stage of the flow — see `architecture.md`.
- A new feature is a new folder under `features/`. Only genuinely cross-feature
  code goes in `shared/`, and nothing in `shared/` may _require_ a feature.
  (Known soft spot: `drawer.js` reads its close-button label from
  `TankiQoL.LanguageManager` and falls back to `"Close"`. Safe today because the
  drawer is only loaded in the combos block; if another feature needs it, pass
  the label in as an option instead of deepening that dependency.)
- Adding a file means adding it to `manifest.json` in the right position — see
  `architecture.md`.
- **One name on `window.TankiQoL` per module.** Two files assigning the same
  name is silent: the later one wins and the earlier module simply stops
  existing, with no error until something calls a method that vanished. It
  happened — a new `ComboMatch` killed the migrator's `ComboMatch` and the id
  backfill died unnoticed. `build/harnesses/test_namespaces.js` now fails on a
  collision, and on a name that is read but never defined.

## Splitting a big module

Two patterns are already in use; prefer them over inventing a third.

- **Object mixins** (UI): the base file creates the namespace object, and each
  extra file does `Object.assign(window.TankiQoL.ViewRenderer, { … })`. Call
  sites and `this` are unchanged. See `view/` and `view/card/`.
- **Shared internals object** (the MAIN-world garage hook): every file does
  `const I = (NS.internals = NS.internals || {})` and hangs its state and
  functions there, reading `I.x` at call time so load order only has to satisfy
  _runtime_ dependencies. See any `game/` folder.

## JavaScript

- **Vanilla JS only.** No frameworks, no libraries, no build step. Content
  scripts can't use ES modules, so modules share namespace objects on `window`
  (see `architecture.md`).
- Every module is an IIFE singleton:
  ```javascript
  (function () {
    "use strict";
    window.TankiQoL = window.TankiQoL || {};
    // ... private ...
    window.TankiQoL.ModuleName = { publicMethod };
  })();
  ```
- Core operations (save, load, equip) use **async/await**; `chrome.storage` calls
  use the **callback** API — keep that consistent.
- **Graceful degradation**: skip and continue. If an item can't be found or
  equipped, drop that slot and move on — never block the user, never alert, and
  (per the comments section above) never log it either: that is a normal outcome,
  so return it to the caller instead of printing it.
- Prefer `NavigationHelpers.waitForDOMChange()` (MutationObserver + debounce)
  over fixed `setTimeout` delays. Short `sleep()` (≤50 ms) is fine where a game
  animation genuinely needs time.

## Game names and discovery anchors

Everything the extension knows about the game's *code* is found at run time;
this section is how to write that finding so it survives the next build. The
rationale and the machinery are in `architecture.md` → "Names come only from
the bundle".

- **No minified name in the code — ever.** Not as a seed, not as a "latest known
  build" fallback, not in a comment that code depends on. Every trap field,
  class and method name comes from a `discovery/` file reading the live bundle.
  `test_no_names.js` fails on an `xx_1`-shaped literal or a `SEED` constant.
  Minified names in the *docs* are fine as labels for what was researched.
- **Anchor only on what minification keeps**, roughly strongest first:
  1. enum entry names (`new C("DESKTOP",2)`) and data-class `toString` strings
     (`"BattleSettings(isCenteredLayout="+…`) — they are the source names;
  2. `callableName="…"` (the name of a Kotlin function reference) and webpack
     asset paths;
  3. DI and lateinit strings (`vj("radarVisual")`) — **the weakest**: the string
     only exists while the field is `lateinit`. `6a85fbcf` turned three of them
     into nullable fields and the strings simply vanished;
  4. code shape (a regex over a method body) — the last resort, and then match
     every identifier as `[\w$]+`, never by its current spelling.
  When an anchor breaks, look for a surviving name in the same area before
  reaching for shape.
- **A minified name repeats across webpack modules.** The same short name is a
  class in one module and a function in another (the garage proxy's class name
  was reused on six of twelve builds). Never take the first `indexOf` of the
  whole bundle: search inside the module of the anchor (`HudParse.moduleOf`,
  `importOf`, `exportOf`) or take the definition nearest the call site
  (`HudParse.fnOffsets`).
- **Verify a reading against what it means, not only that it matched.** A regex
  that finds *a* name passes every harness that only checks for presence. Tie
  it to its meaning: a field count, the order a ctor assigns, a live
  measurement (the HUD), a value the game itself computes.
- **Research notes are hypotheses.** Before building on one, confirm it in the
  current bundle. The kill log's position was written down as "read from the
  HTML HUD" and believed for a month; the bundle had it as four literals.
- **Bump `CACHE_VERSION`** in a feature's `detect.js` (and `V` in the HUD's
  `compose.js`) whenever the discovery's output *shape* changes. A fix that only
  changes values reaches users on the next release by itself (`shared/bundle.js`
  rediscovers whatever an older version cached).

## UI and styling

- **All extension CSS classes are prefixed `cme_`** — collisions with Tanki's own
  classes and with other extensions are real (users do run several).
- **Every game selector — and every game class name we apply to our own
  elements — lives in `features/combos/lib/constants.js`** (`TankiQoL.DOM`),
  whichever feature uses it. When the game updates its HTML, only that file
  changes; a selector hardcoded elsewhere is a selector nobody will find. The
  advisor deliberately shares the combos file rather than growing its own.
- New UI must look native: same colors, fonts, hover effects, transitions,
  spacing. When the existing code doesn't cover it, ask for the game's exact CSS
  (rule 1 in `../CLAUDE.md`).
- User-facing strings go through `LanguageManager.getUIText()` and must be added
  to **all 11 languages**. The English → key fallback is a safety net, not a
  licence to skip translations.

## Editing files in bulk

The source is **UTF-8 without BOM and full of Hebrew comments**. Windows
PowerShell 5.1 reads such a file as ANSI, so a `Get-Content` → `Set-Content`
round-trip silently double-encodes every Hebrew character (it happened; 11 files
turned to mojibake in one command). If you must rewrite files from a script, be
explicit in both directions:

```powershell
$utf8 = New-Object System.Text.UTF8Encoding($false)   # no BOM
$raw  = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($path, $new, $utf8)
```

Preserve the file's existing line endings, and check afterwards: a file
containing `×` followed by another high byte is corrupted. Prefer the editing
tools over scripted rewrites whenever the change is small enough.

Two more traps from scripted edits:

- **Mixed line endings.** Most files here are CRLF on disk. A script that
  inserts `"\n"` into one leaves a file with both, which git and the harnesses
  read fine and which still diffs as noise. Normalise after writing, and check:
  a file must not contain both `\r\n` and a bare `\n`.
- **Inline shell scripts eat backslashes.** A heredoc passed through the agent's
  shell tool can arrive with `\\` collapsed to `\`, so a regex or `"\t"` inside an
  inline Python/Node script silently means something else. Write such a script
  to a file with the editor tool and run the file.

## Finishing a round of edits

Three steps, every time — **not only before a release** (rule 9 in
`../CLAUDE.md`). A one-line change counts as a round.

1. **Update the harnesses in `build/harnesses/`.** They are part of the code, not
   scaffolding, and they are the only automated check this project has:
   - moved or split a source file → fix the file list at the top of every harness
     that loads it, or it silently stops testing anything;
   - fixed a bug → add the check that would have caught it, and **watch it fail on
     the code before the fix** (`git stash push <file>`, run, `git stash pop`). A
     check that passes on the broken code too is testing nothing;
   - new behaviour → new checks;
   - a harness that needs game names gets them **from the shipped discovery** on the
     newest bundle (`game_names.js`), never from a list written into the
     harness — the extension has none either;
   - every feature that reads the game has two kinds of harness: one that runs its
     discovery on **every** bundle in `research/`, and one that runs its MAIN side
     in a sandbox (traps, captures, the bridge).

   A harness that no longer matches the code is worse than no harness: it reports
   PASS for code it isn't running.

2. **Run every one of them**: `node build/harnesses/<file>.js`. A few seconds,
   no dependencies. What each one covers is in `debugging.md`.
3. **Run `build/make-zip.ps1`** — manually, never from a hook. Beyond building the
   zip it cross-checks `manifest.json` against the disk in both directions, so it
   catches a file you added but never registered (which would simply never load)
   even when nothing is being released.

## Git

- Commit messages in English, descriptive body, and:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
