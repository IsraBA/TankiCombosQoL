# Chrome Web Store dashboard — paste-ready texts

Internal cheat sheet for the Developer Dashboard. Everything here is meant to be
copied into a dashboard field. **This file never ships** — see `PACKAGING.md`.

The extension is already published with 500+ users, so every upload is an
*update*, not a new listing. These updates have shaped this file:

- **v3.0** added chat translation, which changed the name, the permissions and —
  for the first time — the fact that user data is transferred to a third party.
  Everything in sections 3 and 4 dates from there and still holds.
- **v4.0** adds protection recommendations, rewrites combos to apply through the
  game's own model, and adds paint and skins as combo slots. It adds **no
  permissions and no data transfer**, so only the listing text below needed
  changing — the Privacy tab was unaffected.
- **v4.1** was a **bugfix-only** upload: Google stopped serving the
  translation endpoint the extension called (HTTP 429), so chat translation had
  degraded to "works rarely". Backend repaired inside the existing host; the two
  dead Lingva hosts were dropped from `host_permissions`. Nothing changed in the
  dashboard.
- **v5.0** (uploaded 16 Oct 2026) adds the **battle HUD editor**. **No new
  permission and no new data transfer** — the arrangement is stored locally and
  applied on the player's own screen. What changes in the dashboard: the
  description (a HUD EDITOR section), "What's new", and three Privacy-tab texts
  that list what the extension does (single purpose, storage, host permission).
  The data-use disclosure is unchanged. The upload also carried the repairs for
  the game update `6a85fbcf` and the one-time update note announcing the HUD
  editor (`NEWS_VERSION` `5.0`), with a button that opens it — the manifest
  stayed `5.0` through those commits.
- **v5.1** (current, Oct 2026): until the HUD editor is opened once, yellow
  dots (lobby Settings → CONTROLS → HUD EDITOR, and the COMBOS button's badge) and a banner in the combos tab
  point to it, for players who dismissed the note unread. **No new permission
  and no new data transfer** — the two new flags are local storage. Only
  "What's new" needs text.

## 1. Read this first: what changes for existing users

**v4.0, v4.1, v5.0 and v5.1 grant no new permission.** `permissions` is unchanged and
`host_permissions` only ever *shrank* — the two dead Lingva hosts were dropped
when the translation backend was repaired (Sep 2026); `translate.googleapis.com`
is the sole remaining translation host. Dropping a host is not a privilege
increase, so the update installs silently and **nobody is disabled**. Do not
repeat the v3.0 service notice as though it applied.

> Keep it that way. The Sep 2026 backend fix was deliberately built inside
> `translate.googleapis.com` — the host already granted — precisely so that
> restoring a broken feature would not force 500+ users through re-approval.
> Cross-provider fallbacks were tested and are documented in
> `CLAUDE.mds/translator.md`, but shipping one means accepting the disable
> below. That is a listing decision, not a code decision.

The v3.0 situation, kept because pre-3.0 users still exist and still hit it:
adding `translate.googleapis.com` and the Lingva hosts to `host_permissions` was
a **privilege increase**, and Chrome's behaviour on such an update is not
negotiable —

- The update installs silently in the background, then Chrome **disables the
  extension** for that user.
- Nothing pops up. The only signal is a badge on the toolbar's puzzle icon; the
  user must open it and click **"Accept permissions"** (or "Enable") to get the
  extension back.

That was a deliberate, accepted trade-off (the alternative — optional permissions
plus an opt-in popup — was considered and rejected as too much complexity). The
listing text below does not scope it to pre-3.0 users — see the note under the
description.

In-extension, v4.0 announced itself: opening the COMBOS tab after the update
showed a one-time note of what changed, and the lobby button carried a badge
until it was seen. **v5.0 announces the HUD editor** the same way:
`NEWS_VERSION` in `view/panels/whats_new_modal.js` is `5.0`, with a **Take me
there** button that opens the editor. **v5.1 keeps it at `5.0` on purpose** —
raising it would show the same note again to everyone who already saw it.
Because a popup is easy to dismiss unread, v5.1 adds yellow dots (lobby
Settings → CONTROLS → HUD EDITOR) and a small banner in the combos tab that keep
pointing at the editor until it has been opened once — hidden from anyone whose
HUD is already edited (`CLAUDE.mds/hud.md` → "Pointing users at the editor").

## 2. The "Store listing" tab

**Name** and **Summary** are taken from `manifest.json` (`name` / `description`)
and update themselves when the new package is uploaded — nothing to type. The
summary is 131 of the allowed 132 characters, so if you ever edit the manifest
description, re-check that it still fits. It still names only combos and chat
translation — neither the advisor (v4.0) nor the HUD editor (v5.0) is in it.

**Category:** Games. **Language:** English.

### Detailed description

The developer's v4.0 wording, plus a HUD EDITOR section for v5.0 (a draft in
the same register — review it before pasting). Replace the whole field with it.

Keep it short. Nobody reads a wall of marketing copy on a store page, and the
screenshots carry the detail anyway.

> **Known mismatch in the last paragraph.** It says Chrome disables the
> extension until a new permission is approved. That is the v3.0 situation:
> **v4.0 and every release since add no permissions**, so nobody is disabled
> and no puzzle-icon badge appears. Kept at the developer's choice — it is harmless for the pre-3.0
> users who do still hit it, and it is a standing service notice for whichever
> future release does add one. If a v4.0 user reports "it told me to approve
> something and there was nothing to approve", this is why.

```
COMBOS
Save a full garage setup - turret, hull, both augments, drone, grenade, protections, skins, paint - and equip it again in one click. Name and reorder your combos, skip individual slots, import/export, or let the randomizer choose. Open it from the garage menu, or press C in the lobby.

PROTECTION RECOMMENDATIONS
Recommends which protections to take mid-battle, based on the battle data and the strongest players on the enemy team.

HUD EDITOR
Move, resize and fade every part of the battle screen - radar, kill feed, supplies, bars, chat, and the rest. Open it from the game's Settings - Controls. The default and centered layouts each keep their own arrangement.

CHAT TRANSLATION
Foreign battle chat, translated in place on the game screen. Pick your language in the game's Settings. Alt+T switches back to the original, and you can turn translation off entirely - combos keep working.

Free, no ads, no account, no automation and no gameplay advantage. Your combos and HUD layout stay in your browser; the only thing that ever leaves it is the text of a message being translated.

Updating from an older version? Chrome disables the extension until you approve the new permission - click the puzzle icon in your toolbar and accept. Once, and you're done.

Bugs or ideas - Discord: isra760
```

Three things in there are not padding and should survive future edits: the
permission line (a service notice — without it an update that *does* add a
permission reads as "the extension broke"), the one-line privacy statement (heads
off "wait, you send my chat where?"), and "no gameplay advantage" (it matters in
a game community).

Two things earlier drafts carried and this one drops, deliberately — worth
knowing so they are not "restored" by mistake, and worth reconsidering if a
reviewer ever pushes back:

- **That the recommendations are computed locally.** A feature that reads a live
  battle is the one a reviewer is most likely to ask about, and the privacy
  sentence above only mentions chat. The answer is in `docs/PRIVACY.md` if it is
  ever needed.
- **The RTL chat fix**, and the note that equipping goes through the game's own
  actions. Both are real, both are just detail the developer judged unnecessary
  on the store page.

Two claims from the pre-3.0 description were deliberately dropped and must not
come back:

- *"Works only in the Garage & Lobby / Does not work in battles"* — false since
  3.0. The translator runs in battle, and 4.0's advisor reads the battle state.
- *"Officially approved by Tanki"* — whatever approval was given covered a
  garage-only tool. Only put it back after confirming with them that it still
  covers an extension that reads and redraws battle chat and reads the battle
  roster.

### "What's new" field for v5.1  (current upload — draft, review before pasting)

```
The HUD editor is now easier to find: yellow markers (Settings - Controls - HUD EDITOR) and a small banner in the combos tab point the way until you have opened it once. Already using it? Nothing changes for you. No new permissions.
```

### "What's new" field for v5.0  (already published — kept for reference)

```
New: a HUD editor. Move, resize and fade every element of the battle screen - radar, kill feed, supplies, health bars, chat and more - from the game's own Settings - Controls - HUD EDITOR. The default and centered layouts each keep their own arrangement, everything saves as you go, and only your screen changes. No new permissions.
```

### "What's new" field for v4.1  (already published — kept for reference)

```
Fixes chat translation, which had stopped working for most messages because the translation service stopped answering the request the extension was making. Translation now goes through a different Google Translate endpoint, with a second one as a fallback. Also fixes the language tag shown on Hebrew and Chinese messages. No new permissions.
```

### "What's new" field for v4.0  (already published — kept for reference)

```
Combos now equip through the game's own equipment actions - instant, no flicker, no walking the tabs. Paint and skins are part of a combo. New: protection recommendations, which read the battle you are in and tell you what to wear against the enemy team, with one button to equip it all. The combo you are wearing is marked, duplicates are no longer kept, and the game's own equip cooldown is respected. No new permissions.
```

### Screenshots (up to 5, 1280×800 or 640×400)

Neither the translator, the advisor nor the HUD editor has a screenshot yet, and
the HUD editor is the headline feature of v5.0. Worth capturing (five is the
limit, so the lobby button gave up its place):

1. The COMBOS tab in the garage with several saved combo cards (one marked as
   currently worn).
2. The HUD editor with one element selected and the size/opacity sliders shown —
   ideally beside a battle screenshot with that arrangement applied.
3. The Protection tab mid-battle showing the ranking row and the recommended set
   with EQUIP ALL.
4. A foreign chat message translated, showing the `[RU] »` prefix.
5. The in-game settings panel (translation toggle + language dropdown with flags).

### Additional fields (currently empty — worth filling)

| Field | Value |
|---|---|
| Homepage URL | `https://github.com/IsraBA/TankiCombosQoL` |
| Support URL | `https://github.com/IsraBA/TankiCombosQoL/issues` |

Both are free credibility: they show the extension is open source and give users
somewhere to report bugs. The *official* URL field needs domain ownership proven
in Search Console — skip it. The promo images (440×280, 1400×560) are optional
and only affect featuring.

## 3. The "Privacy" tab, field by field

**v5.0 changed the three texts below**, which list what the extension does and
now include the HUD editor (drafts — review before pasting). **v5.1 changes none
of them** — the editor pointers are UI, and their two flags are local
preferences, already covered by the storage text. The dashboard's
Privacy tab has **one** justification box for host permissions — not one per
host — so its text covers both hosts together. Each block is sized to fit its
1,000-character limit.

### "Single purpose description"  (804 chars)

```
The single purpose of this extension is to improve the player's quality of life in Tanki Online, inside the game's own interface. It lets players save, manage and instantly switch between full garage equipment setups ("combos" of turrets, hulls, augments, drones, grenades, protections, paint and skins); it recommends which protection modules are worth equipping against the enemy team in the battle the player is in, computed in the browser from data the game has already loaded; it lets players move, resize and fade the elements of the battle HUD, on their own screen only; and it translates the in-game battle chat into a language the player chooses, displayed in place on the game screen. All four reduce friction for the player inside a single game, and none of them operates on any other website.
```

### "storage justification"  (564 chars)

```
The storage permission is used to save the user's own data: their saved garage combos (names, order, contents), their battle HUD arrangement (the position, size and transparency of each element), and their preferences, including the chat translation on/off toggles and the chosen target language. Combos and the HUD arrangement are stored locally in the browser; the few small preferences use Chrome's sync storage so they follow the user's own browser profile. No personal or sensitive data is collected, and none of this data is sent to us or to any third party.
```

### "Host permission justification"  (854 chars)

```
tankionline.com: the extension runs only on the Tanki Online game page. It needs page access to read which items are currently equipped, to inject its own UI into the garage, lobby, protection and settings screens, to read the state of the battle the player is in so it can recommend protection modules, to apply the player's HUD arrangement, and to read the game's own already-loaded script to locate the parts it works with, which are minified and change with every game update. Everything read is used and discarded in the browser; none of it is transmitted.

translate.googleapis.com: to translate a battle-chat message, the text of that message is sent to Google Translate and the result is displayed in place on the game screen. Only the message text and the user's chosen target language are sent. The extension does not access any other websites.
```

### "Are you using remote code?"

Select **"No, I am not using remote code."** The extension fetches the game's own
script **as text and parses it** to find code locations; it never `eval`s or
executes fetched code, and loads no external scripts. The translation calls
return data (JSON), not code. Leave the justification box empty.

## 4. Data-use disclosure (same tab, "Data usage" section)

**v4.0 changes nothing here.** The advisor reads other players' in-battle
equipment and scores, which sounds like it should — but it is read from state the
game already sent to this browser, used to render a panel, and never transmitted,
so it is not *collected* data in the dashboard's sense. Nothing new to tick.
**v5.0 changes nothing here either**: the HUD arrangement is the user's own
preference, kept in local storage and never sent anywhere. Nor does v5.1.

The declaration, as set at v3.0 and still correct:

- **Website content** — YES. The text of chat messages is handled and is
  **transferred to a third party (the translation service) in order to provide the
  core feature**. This transfer is disclosed in the privacy policy and is
  necessary for the feature to function, which CWS permits.
- **Personal communications** — YES. Chat messages can be considered personal
  communications; disclosed on the same "used only to provide the translation
  feature" basis.

Leave **unticked**: personally identifiable information, health, financial,
authentication, location, web history, user activity.

Then affirm the three required certifications — all three hold truthfully:

- *Not selling or transferring data to third parties for purposes unrelated to the
  item's single purpose* — the translation transfer **is** the purpose, so this
  holds.
- *Not using or transferring data to determine creditworthiness or for lending.*
- *Complying with the Developer Program Policies.*

**Privacy policy URL:** required since v3.0 (it was previously allowed to be
empty). The repository is public and GitHub renders Markdown, so the policy is
already served — paste this, no hosting setup needed:

```
https://github.com/IsraBA/TankiCombosQoL/blob/main/docs/PRIVACY.md
```

It stays in sync automatically: editing `docs/PRIVACY.md` and pushing updates the
published policy. **So push the branch before submitting the update** — the
reviewer follows that URL to the `main` copy, and a policy that does not yet
mention a feature in the package is exactly the mismatch a review flags. (If a
cleaner page is ever wanted, enable GitHub Pages — but note that publishing the
whole `docs/` folder would also serve this file and `PACKAGING.md` as web pages.)

## 5. Upload checklist

See `PACKAGING.md` → "Before uploading". In short: bump the version, run
`build/make-zip.ps1`, confirm the privacy policy on `main` covers what is in the
package, update the two dashboard tabs above, upload the zip.
