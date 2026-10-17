# Store, packaging and testing

## Chrome Web Store

The extension is published and has 500+ users, so store hygiene matters.

- The extension changes how a third-party page behaves, which reviewers read
  closely. Describe it plainly and accurately: the listing text and the
  permission justifications in `docs/STORE.md` are written to match what the code
  actually does, and **must be updated whenever the code's behaviour changes**.
  An accurate description is also the extension's best defence if anyone asks
  what it does.
- The translator **sends chat text to a third-party translation service**, so the
  dashboard's Privacy practices tab must declare *website content* and *personal
  communications*, and a hosted privacy-policy URL is **mandatory**. The
  paste-ready texts are in `docs/STORE.md`; the policy itself is
  `docs/PRIVACY.md`, served from the public GitHub repo — its URL is the one in
  the CWS listing, so edits there go live immediately.
- Adding hosts to `host_permissions` is a privilege increase, so **Chrome
  disables the extension for every existing user until they re-approve it**. That
  was a deliberate, accepted trade-off for the translation hosts — don't "fix" it
  by making them optional without asking the developer.
- **Bump `version` in `manifest.json` for every upload**; CWS rejects re-uploads
  of the same version. When a release happens, and which number it gets, is the
  developer's call — a fix does not bump the version by itself.

## Packaging

`docs/PACKAGING.md` is the single source of truth for what ships;
`build/make-zip.ps1` implements it and refuses to build if anything forbidden
slips in.

`CLAUDE.md`, `CLAUDE.mds/`, `docs/`, `HTML-examples/` and `build/` **never** go
into the zip. The package contains exactly the files the extension loads and
nothing else: it keeps the upload small, and it keeps what a reviewer inspects
identical to what actually executes. (The repository is public, so this is about
a clean package, not secrecy — `HTML-examples/` alone is several MB of
development reference no user needs.)

Run it from the project root at the end of a round of edits:

```
powershell -ExecutionPolicy Bypass -File build/make-zip.ps1
```

The zip lands in `build/dist/tanki-combos-qol-v<version>.zip`.

## Testing (manual)

1. `chrome://extensions/` → enable Developer Mode.
2. "Load unpacked" → select this directory.
3. Open [Tanki Online](https://tankionline.com) and sign in.
4. **Combos**: enter the garage; the COMBOS tab appears; save a combo; equip it
   (instant, no tab walking, no flicker, and it lands on the Protection tab);
   reorder by drag; delete; import/export; the `C` shortcut in the lobby. Check
   that the 3D tank model still renders, survives a window resize, and can be
   drag-rotated while the combos tab is open.
5. **Combos, the state-dependent parts** — these only misbehave against a real
   account, which is exactly what the harnesses cannot cover:
   - the combo you are wearing is marked green, and the mark moves when you
     equip another one or change gear in the game's own tabs and come back;
   - saving a loadout you already have replaces that entry instead of adding a
     second, keeps its name, and does not flicker;
   - **randomiser**: both modes; the card shows its loading border and the
     button is blocked while it runs; a grenade you have no ammo for is never
     drawn; "Max equipment only" only offers Mk7-20; skins never come out as
     the standard one;
   - **equip cooldown**: right after changing gear, the red timer shows over the
     tank, SURPRISE ME disappears, and clicking a card does nothing.
6. **Advisor** — needs a real battle, so nothing offline covers it:
   - enter a battle, then the garage mid-battle → PROTECTION: the recommended
     block appears above the game's mounted set, with the full ranking row above
     it and the enemies' top turrets translated to the right modules;
   - it updates live while you stand in the garage (kills change the order);
   - EQUIP ALL equips exactly the shown set and the button then disappears;
     changing a protection by hand brings it back;
   - no battle, an equip cooldown, or nothing qualifying (all modules under
     30%) → the block is absent entirely;
   - pressing Enter to chat in battle must **not** create a combo (the ghost-save
     regression).
7. **Update notice**: on a profile that has not seen this `NEWS_VERSION`, the
   lobby COMBOS button carries a yellow badge and the modal opens on the first
   entry to the tab. Closing it any way (X, either button, backdrop, Escape)
   marks it seen, permanently; the badge stays until the HUD editor has been
   opened or the HUD banner's X clicked (unless the HUD is already edited). `TankiQoL.WhatsNewModal.reset()` replays it. Its
   **Take me there** button closes it, opens Settings straight on the Controls
   tab (no click walk through the lobby) and then the HUD editor; leaving the
   editor and then Settings brings you back to the garage **on the combos tab**,
   not on paints. Read the text in a few languages: the tab names in it are ours,
   not the game's, and the title carries the version.
   Also check the three ways into the tab and the back button after each: the
   lobby COMBOS button, the **C** key, and entering the garage with auto-open on.
   One press of back must leave — a press that seems to do nothing, or reopens
   the tab, is the regression in `combos.md` → "Getting to the combos tab".
   **HUD pointers**: on a profile with an unedited HUD (`__HUD.resetNews(true)`
   on your own), the badge on the lobby COMBOS button, a yellow dot on the lobby Settings item, on CONTROLS (same
   height as ACCOUNT's dot), on the HUD EDITOR button's top-right corner, and
   the banner under import/export. The lobby dot must match the quests' dot
   exactly. The banner's X hides it and the COMBOS badge, not the
   Settings dots; a click anywhere else on it goes to
   the editor; once the editor has been open, all of it is gone for good.
8. **HUD editor** — the geometry comes from the game's code, so no battle is
   needed first:
   - on a fresh profile, Settings → Controls → HUD EDITOR: every element is
     drawn where the game puts it, at the right size, including the HTML ones
     (name/rank/XP, the top-right buttons, FPS), the chat and the kill feed;
   - in the console, `__HUD.debug.names === "bundle"`, and in battle
     `__HUD.nodes()` gives every element a `role` (not `null`);
   - drag one, resize it, fade it → enter a battle and confirm it matches,
     the chat's text fading too;
   - drag one onto another → red outline, the move is dropped; drag near the
     screen's centre lines → it snaps, with a guide line;
   - grow one that sits against a screen edge → it slides inside rather than
     refusing;
   - in the centred layout the health/energy bars can be resized and faded but
     not dragged, and growing them pushes the active-effect rows clear of them;
   - change the layout in the game's own settings → the editor switches to that
     layout's arrangement, and the other one is untouched;
   - undo (and Ctrl+Z), and reset (which must clear only the layout being
     edited); Z, Escape and the back arrow all leave;
   - change the game's own **battle UI scale** and confirm the editor and the
     battle still agree;
   - resize the browser window / go fullscreen and confirm the arrangement
     follows;
   - with **Tanki Tweaks** installed, open the editor, then a battle: its Tab
     table must still be styled (not half-transparent).
9. **Translator**: enter a battle; foreign chat should show original → spinner →
   `[SRC] » translation`, and slang alone (`gg`, `OD`) shown as is. Check the toggle button next to the chat alert button
   and Alt+T. Open the game's Settings screen and confirm the injected toggle +
   language dropdown are there and styled natively. Resize / toggle fullscreen
   and confirm no duplicate chat lines.
10. After code changes: click the refresh icon on the extension card, then reload
    the game tab.
11. **After a game update** (a new `main.<hash>.js`): first follow
    `debugging.md` → "When the game ships a new build". Then run this list
    twice — once on the very first load of the new build (the discovery cache is
    cold; equipping may fall back to the DOM path and the HUD may not know its
    layout until a reload — expected, see `architecture.md`), and once after a
    reload, when everything must work.

Before any release, also run the offline harnesses (`debugging.md`) — they cover
the discovery and write logic that manual testing can only sample.
