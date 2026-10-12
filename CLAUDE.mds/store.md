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
  of the same version.

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
   entry to the tab. Closing it any way (X, button, backdrop, Escape) clears
   both, permanently. `TankiQoL.WhatsNewModal.reset()` replays it.
8. **HUD editor** — needs one battle first, since the geometry is learned there:
   - enter a battle and leave it, then Settings → Controls → HUD EDITOR: every
     element is drawn where it actually was, at the right size;
   - drag one, resize it, fade it → re-enter a battle and confirm it matches;
   - drag one onto another → red outline, the move is dropped;
   - grow one that sits against a screen edge → it slides inside rather than
     refusing;
   - in the centred layout the health/energy bars can be resized and faded but
     not dragged;
   - change the layout in the game's own settings → the editor switches to that
     layout's arrangement, and the other one is untouched;
   - undo, and reset (which must clear only the layout being edited);
   - change the game's own **battle UI scale** and confirm the editor and the
     battle still agree;
   - resize the browser window / go fullscreen and confirm the arrangement
     follows.
9. **Translator**: enter a battle; foreign chat should show original → spinner →
   `[SRC] » translation`. Check the toggle button next to the chat alert button
   and Alt+T. Open the game's Settings screen and confirm the injected toggle +
   language dropdown are there and styled natively. Resize / toggle fullscreen
   and confirm no duplicate chat lines.
10. After code changes: click the refresh icon on the extension card, then reload
    the game tab.

Before any release, also run the offline harnesses (`debugging.md`) — they cover
the discovery and write logic that manual testing can only sample.
