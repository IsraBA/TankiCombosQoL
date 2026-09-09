# Feature: Translator

Translates foreign battle chat **in place on the game canvas**.

| Behaviour | Detail |
|---|---|
| Foreign message shown instantly | the original is drawn immediately, so chat never lags |
| Braille spinner while translating | `⠋⠙⠹…` appended until the translation returns |
| Swap to translation | `[<SRC>] » <translation>` in the target language |
| No prefix when source == target | nothing to translate |
| Universal slang verbatim | `gg`, `ez`, `noob`, `hahaha`, … never hit the API (`skiplist.js`) |
| RTL displayed correctly | the canvas renderer has no bidi — see below |
| Toggle original↔translation | in-game button (next to the chat alert button) + Alt+T, persisted |
| Target language | native-styled dropdown injected into the game's Settings screen |

There is **no browser popup**: the toolbar icon only carries the icon, everything
is configured in-game.

| Surface | Controls | File |
|---|---|---|
| In-battle button + **Alt+T** | `showOriginal` | `main/toggle.js` |
| In-game settings panel | `enabled`, `targetLang` | `main/gamesettings.js` |
| Console helpers | everything (debug) | `main/chat.js` |

Storage is the single source of truth. The button, Alt+T and the settings panel
all `set()` → storage → `onChanged` echoes back → everyone updates. No local
mutation, so nothing ever disagrees.

## Bridge protocol (every message tagged `__ct`)

| dir | action | payload | meaning |
|---|---|---|---|
| `i2m` | `settings` | `{enabled, showOriginal, targetLang}` | initial + on every storage change |
| `i2m` | `config` | `{flagsBase}` | paths MAIN can't resolve itself |
| `i2m` | `hudConstants` | discovered name-set | from `detect.js` (or cache) |
| `i2m` | `translateResult` | `{id, ok, text, lang, error}` | reply to a translate request |
| `m2i` | `ready` | — | MAIN's listeners are up; ISOLATED resends everything |
| `m2i` | `set` | partial settings | MAIN asks ISOLATED to write storage |
| `m2i` | `translate` | `{id, text, targetLang}` | MAIN asks for a translation |

## Translation flow

```
chat.js (MAIN)  --postMessage 'translate'-->  bridge.js (ISOLATED)
   ^                                              |
   |                                     chrome.runtime.sendMessage
   |                                              v
translate.js resolves the Promise        background.js (service worker)
   ^                                              |  fetch() with host_permissions
   |  <--postMessage 'translateResult'--          v
   +------------------------------------  translate_a/t -> translate_a/single
                                          (both client=dict-chrome-ex)
```

- **`translate.js`** (MAIN) owns the per-session cache (keyed by
  `targetLang + '\n' + text`) and a hard request timeout, so a hung backend can
  never leave a message stuck on its spinner.
- **`background.js`** runs the backend chain. Both legs report the detected
  source language, so the `[RU]` prefix survives a failover:

  | # | Backend | Notes |
  |---|---|---|
  | 1 | `translate_a/t?client=dict-chrome-ex` | what Chrome's own translate feature uses. `[[text, lang]]`, **plain text**, the flattest reply of any option |
  | 2 | `translate_a/single?client=dict-chrome-ex` | per-sentence segments (`d[0][i][0]`), source lang in `d[2]`. Returns an intermittent HTTP 500, which is survivable *because* it is second |

  Both are GET with the text in the query string, so this design assumes
  chat-sized strings.

- **The client id carries the quota, not the endpoint.** `dict-chrome-ex` is
  Chrome's own; it took 100+ calls in a sitting with zero rejections, while
  `gtx` and `at` both start returning 429 within a single 20-call burst. That is
  why leg 2 does *not* switch client id: it buys **endpoint** diversity (a shape
  change or outage on `/translate_a/t`), and switching to a rate-limited id
  would make it useless exactly when it is needed.
- **Everything stays on `translate.googleapis.com`, deliberately.** Adding a
  host is a privilege increase, and Chrome then **disables the extension for
  every existing user** until each re-accepts (see `docs/STORE.md` §1). A
  bugfix must never cost that, so the chain was built inside the one host
  already granted. Working alternatives exist if that ever becomes acceptable:
  `translate-pa.googleapis.com/v1/translateHtml` (POST, the current widget's
  endpoint — translates *HTML*, so the reply needs tag-stripping and entity
  decoding) and `api.mymemory.translated.net` (a different provider entirely,
  so it survives a Google-wide block; loose wording, small anonymous quota,
  and it signals errors/quota as **HTTP 200** with the reason in the envelope).
- **Language normalization**: Google still reports `iw` (Hebrew), `in`
  (Indonesian) and regional `zh-CN`, while our target codes are the bare modern
  form. `chat.js` compares source against target to decide whether to draw a
  prefix, so without `normalizeLang()` a Hebrew user sees `[IW] » <same text>`
  on their own language. This was latent in the old `gtx` path too.
- **Why the service worker at all**: in MV3 there is no `GM_xmlhttpRequest`, and
  a content-script fetch is subject to the page's CORS policy; the translation
  endpoints don't reliably send permissive headers. Only the SW may read
  cross-origin responses for hosts in `host_permissions`. The SW is ephemeral —
  don't rely on module state surviving between calls.

The free chain is a **permanent** choice; there is no plan to move to a paid API.
Honest risk: neither endpoint is a supported API — they can change or rate-limit
at any time. To add or replace a backend, write the call in `background.js` and
add it to the `attempts` array in `translate()`. If it needs a host that is not
already in `host_permissions`, read the privilege-increase note above first —
that is a listing-wide decision, not a code one.

### Precedent: the Sep 2026 outage

Symptom the user reported — *"translation works only rarely, mostly not"*.

The old chain was `translate_a/single?client=gtx` → two Lingva instances, and
all three had died:

| Old backend | State |
|---|---|
| `translate_a/single?client=gtx` | **HTTP 429** on nearly every call — the "works rarely" part. Not a format change; Google simply stopped serving that client id at this volume |
| `lingva.lunar.icu` | HTTP 500 `"error occurred while retrieving the translation"` |
| `lingva.ml` | Cloudflare `"Just a moment..."` interstitial — unusable from a `fetch()` |

The whole public Lingva network is down, not just those two: `lingva.ml`,
`lingva.garudalinux.org` (Cloudflare), `translate.plausibility.cloud` (500),
`lingva.thedaviddelta.com` (503), and three more that no longer resolve. Lingva
proxies Google, so whatever broke `gtx` broke the proxies with it. **Don't
reach for a Lingva instance as a fallback again without testing it first.**

Lessons, in the order they cost time:

1. **A 429 is not an API change.** Before rewriting a parser, `curl` each
   backend and read the status code. The fix here was a different **client id**
   on the same API — no new host, no new provider, and the reply shape was
   *simpler* than the old one.
2. **Re-test a fallback after the burst that "proved" it.** `client=at` passed
   20/20 and looked like the obvious second leg; it was 429 on every call ten
   minutes later, having been rate-limited by that very burst. A backend
   verified once is not verified — check it again once the quota has been
   exercised, or you ship a fallback that fails exactly when it is called on.
3. **Check `host_permissions` before designing the chain.** The first version
   of this fix added two hosts for cross-provider resilience, which would have
   auto-disabled the extension for all 500+ users to ship a bugfix. Scope the
   solution to the hosts already granted unless the resilience is worth a
   forced re-approval.

## MAIN-world API

```js
__CT.settings.get()                // {enabled, showOriginal, targetLang, config, ready}
__CT.settings.subscribe(fn)        // fn(state) now + on every change; returns unsubscribe
__CT.settings.set(partial)         // request a change (writes storage via the bridge)

__CT.translate.request(text, lang) // -> Promise<{text, lang}>; cached
__CT.skip.shouldSkip(text)         // true if every word is universal slang
__CT.bidi.toVisual(text)           // logical→visual RTL; identity (===) for non-RTL
__CT.rebuild()                     // force a clear+replay rebuild
```

## How the canvas hook works

The battle chat is drawn to the WebGL canvas as positioned glyph meshes. **There
is no "edit message" API.** To change displayed text we take over: intercept the
HUD's per-channel render methods, and to apply an async translation **rebuild** —
clear the visible lines and replay the last ≤8 messages through the game's own
render methods with the text we want.

1. **Capture** (`chat.js` `armTrap`): `Object.defineProperty(Object.prototype,
   <offset field>, {set})`. The HUD ctor writes `this.<offset> = new …`, hitting
   our setter with `this` = the live HUD. Validated structurally (`looksLikeHud`:
   the prototype must have all render methods + the evict method), so a wrong
   field never misfires. Re-captures every new HUD (each battle builds one).
2. **Intercept** (`wrapRenderMethod`): wrap the render methods on the
   **instance** (zero collateral). Each call: find the text (the longest
   top-level own string on the arg — structural, name-independent), record it,
   set the display text (original + spinner), fire a translation. On translation
   done → debounced rebuild.
3. **Rebuild** (`rebuildNow`): evict every visible line (exactly as the engine
   does when messages scroll off), then replay the last ≤8 records through the
   **prototype** methods (bypassing our instance wrapper → no re-record), setting
   each arg's text to the current display text.

### Two bugs this code is deliberately shaped around

- **Manual offset reset = duplicate/ghost lines.** `rebuildNow` must NOT touch
  the ring pointer or vertical offset. The offset grows monotonically (the chat
  is a view that follows the bottom); zeroing it desyncs the meshes once a
  translated line wraps to a different line count. Only evict + replay; let the
  engine manage its counters.
- **Resize re-emits everything = duplicates.** On resize/fullscreen the engine
  blanks the chat and re-emits the last ≤max stored messages through the same
  render methods with fresh arg objects. The dedup: a render call arriving while
  the visible-line count is 0 although we still hold records means the canvas was
  just blanked, so what follows is a replay — we adopt the fresh args into
  existing records (matched by method + original text, in order) instead of
  re-recording. Time-bounded (1.5 s) so a stale queue can't swallow a real new
  message. `replayAdopts` counts it.

## RTL / bidi

The chat glyph renderer has **no bidi handling at all**: it iterates the string
in logical order and advances the x-cursor left→right, so Hebrew/Arabic is drawn
reversed ("שלום מה קורה" → "הרוק המ םולש"). There is no direction knob anywhere
in the bundle, and the game ships no RTL locale, so support was never built.

`bidi.js` converts logical→visual (reverse RTL runs and run order under an RTL
base, mirror brackets, keep Latin/digit runs intact) at **every** display point
in `chat.js` — originals, translations into RTL targets, slang, "show original"
mode. Purely local, no API call, gated on the translator's `enabled` toggle.

Caveats: the game wraps lines *after* our conversion, so a multi-line RTL message
reads bottom-up; Arabic renders as isolated letterforms because the font atlas is
per-codepoint with no contextual shaping. A sender's **nickname** goes through
the same path, but Tanki does not allow Hebrew nicknames (confirmed Aug 2026), so
that path is unreachable — do not spend time on it.

## In-game settings panel (`gamesettings.js`)

Anchored on `[class*="GameSettingsStyle-gameSettingsBlock"]` (a **semantic** game
class, stable across builds — never the rotating `ksc-*` hashes) and appended as
the block's last child, re-injected via a MutationObserver when the settings
screen mounts.

The block is a flex item in a fixed-height scrolling column, and its class sets
both `height:21em` and `min-height:21em`. Once our content (plus another
extension's) pushes past that, flex-shrink squeezes it back and the overflow
rides over the block below. Fix: inline `height:auto` **and** `flex-shrink:0`,
re-asserted on every call because a game re-render clears our styles.

> If the game ever renders more than one settings block at once we inject into
> the first match. If it lands on the wrong tab, add a discriminator.

**Adding a language**: add it to `LANGS` in `gamesettings.js` (the single list)
and drop a matching flag SVG at `features/translator/assets/flags/<value>.svg`
(filename = the lang code, mapped to a country flag: `en`→gb, `pt`→br, `uk`→ua,
`ar`→sa, `he`→il, …; source: flag-icons, MIT).

## Cross-build self-location (`isolated/detect.js`)

Every minified name rotates per build. `detect.js` fetches the live bundle
(same-origin, from the browser cache) and regexes out the HUD name-set. Anchors:

- **append fn** = the `NAME(this,": ",` call (the "name: text" separator).
- **HUD class + proto-set helper** (`s$`/`_q`/`sk`/`v$` — can contain `$`, so
  `[\w$]+`) = a single-arg render method body reaching `<appendFn>(this,": ",`.
- **finalize free-fn tail** (resets per-line x, advances y by 23, bumps count &
  write-pointer) → offset field + its two sub-fields + count + ptr + finalize fn.
- **evict** = `<helper>(<class>).<m>=function(){if(this.<count><1)return`, count
  matching finalize's (sanity check).
- **render methods** = single-arg methods on the class calling BOTH the append
  and finalize fns (the 2-arg resize method is excluded by the arity filter).

The trap field is the **offset object**. `chat.js` seeds the latest-known build
so it works during the discovery fetch; discovery overrides it. Cached in
`chrome.storage.local` keyed by bundle URL (which contains the build hash, so a
stale cache can't happen). **Verified on 7 bundles:**

| build | class | append | finalize | evict | offset | count | ptr |
|---|---|---|---|---|---|---|---|
| 009aa16b (seed) | `MAn` | `kAn` | `yAn` | `q1fr` | `k1fr_1` | `i1fr_1` | `j1fr_1` |
| c0feea5a | `OAn` | `kAn` | `yAn` | `m1fo` | `g1fo_1` | `e1fo_1` | `f1fo_1` |
| bcae4cb9 | `yRn` | `iRn` | `nRn` | `i1fo` | `c1fo_1` | `a1fo_1` | `b1fo_1` |
| c4428a58 | `zMn` | `cMn` | `aMn` | `d1ff` | `x1fe_1` | `v1fe_1` | `w1fe_1` |
| e76a162c | `zMn` | `cMn` | `aMn` | `w1fd` | `q1fd_1` | `o1fd_1` | `p1fd_1` |
| a81c6ab2 | `IMn` | `wMn` | `dMn` | `c1ff` | `w1fe_1` | `u1fe_1` | `v1fe_1` |
| 41560f11 | `EMn` | `vMn` | `lMn` | `n1fz` | `h1fz_1` | `f1fz_1` | `g1fz_1` |

## When a Tanki build breaks the translator

Symptom: after a Tanki update, chat stops translating.

1. Page console: `__CT_STATE()`. If `discovered:false`, detection failed.
2. Get the new bundle: `copy(Array.from(document.scripts).find(s =>
   /main\.[a-f0-9]+\.js/.test(s.src)).src)`, download it into
   `../../../research/` as `main.<hash>.js`.
3. Run `discover()` from `detect.js` against it offline. It prints the extracted
   name-set, or `null` if the regexes no longer match.
4. If it returns a set → detection logic is fine; the extension self-locates.
5. If `null` → Tanki changed the chat HUD shape. Find the chat render code (grep
   the `": "` separator, the `+23` line-advance, the `if(this.<count><1)return`
   evict) and update the anchors. Re-verify on the new build **and** on the old
   ones (the bundles in `research/` are the regression set), then refresh the
   seed in `chat.js` and the table above.
6. If detection is fine but capture fails (`__CT_HUD` stays null in battle), the
   trap field (offset) is wrong — re-derive it from `this.<offset> = new …` and
   confirm `looksLikeHud` still matches.

## Toggle graphic + extension icons

`assets/translate-icon.svg` is a Material "translate" glyph on dark rounded
chrome. The toggle button's copy is **inlined in `toggle.js`** (the `ICON`
constant) — it was previously fetched over the bridge, but that could silently
fail and leave an invisible button. It uses the *game's* chat-button chrome so it
blends in, which is intentionally different from the opaque standalone extension
icon. OFF is derived by recoloring the glyph and adding a red slash. **Keep the
inline copy in sync with the SVG file.**

Extension icons are `assets/icons/icon{16,48,128}.png` (Chrome can't use SVG).
To regenerate from an SVG on this machine (no cairosvg/rsvg/ImageMagick; Chrome +
Pillow are installed):
```
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --disable-gpu --force-device-scale-factor=1 --default-background-color=00000000 \
  --screenshot=icon128.png --window-size=128,128 "file:///<abs>/<source>.svg"
# then downscale 128 -> 48,16 with Pillow (Image.LANCZOS)
```

## Known limitations

- **Slang stays verbatim regardless of target language.** A Russian-speaking user
  still sees `gg`/`noob` in English — they're universal gaming terms.
- **Enabling mid-battle** re-translates only the currently visible messages, not
  scrolled-off history. Changing the target language re-translates the visible
  ones. Both by design (`refreshVisibleTranslations`).
- **Own messages are translated too** (English/target ones collapse to a no-op).
  Hard-skipping them needs the local user's name/uid, which we don't capture.
- **Canvas glyphs**: `»` and `[文]` render from the game font atlas; confirm they
  aren't missing-boxes on a new build.
