# Privacy Policy — Tanki Online: Combos & QoL

**Last updated: 1 September 2026**

Tanki Online: Combos & QoL ("the extension") is a browser extension that adds
quality-of-life tools to the game at tankionline.com: saving and switching
equipment setups ("combos"), recommending protection modules against the enemy
team in the battle you are in, and translating in-game battle chat. This policy
explains exactly what data the extension processes and what it does not. It is
written to be honest and specific — please read it before installing.

## Summary (plain language)

- Your combos and settings are stored **locally in your browser**. They are never
  transmitted anywhere.
- **The chat translation feature is the only thing that sends anything out of your
  browser**: to translate a chat message, the text of that message is sent to a
  third-party translation service (Google Translate). Nothing else ever leaves
  your browser.
- The extension has **no server of its own**, collects **no personal
  information**, uses **no analytics or tracking**, and **stores no chat history**
  anywhere.

## What data is processed, and why

### 1. Your combos and settings (stored locally)

The equipment setups you save, their names and order, and your preferences
(including the translation feature's on/off state and your chosen target
language) are stored using the browser's own extension storage. Combos are stored
locally on your device. Your small translation preferences use the browser's
sync storage, which means that if you are signed into your browser, the browser
vendor may sync them across your own devices — this is handled entirely by your
browser, and the data contains no personal information.

None of this is ever sent to us or to any third party. We have no server; there is
nowhere for us to send it.

### 2. Chat message text (sent to a third party, only when translation is on)

When the translation feature is enabled and a chat message needs translating, the
**text content of that message** is sent to a third-party translation service to
obtain the translation. Specifically:

- The request contains only the message text and your chosen target language.
- It does **not** include your username, your account, the sender's identity, any
  identifier added by us, or any other metadata — just the text.
- Messages are **not** sent when: the translation feature is off; you are viewing
  originals (toggle off); the message is made up entirely of universal gaming
  slang (e.g. "gg", "noob"); or the message contains no letters.
- Chat can contain whatever players type, which **could include personal
  information** if a player types it into chat. By the nature of translating chat,
  such text would be included in the request. Only enable the translation feature
  if you accept this.

The third-party services used are:

- **Google Translate** (`translate.googleapis.com`) — see Google's Privacy
  Policy: https://policies.google.com/privacy

This is the only third party the extension contacts. Message text is sent to
Google and nowhere else.

These services are operated by third parties. We do not control how they process
requests, and their privacy policies govern their handling of the text. The
request goes directly from your browser to them; it does not pass through any
server we operate (because we operate none).

### 3. The game's own script file (read locally, not transmitted)

To locate the chat UI inside the game — which is minified and changes with every
game update — the extension reads the game's own JavaScript file from
tankionline.com (the same file your browser already loaded) and searches it for
the relevant code. This file is only **read and parsed in your browser**; nothing
from it is transmitted anywhere. The result (a small set of internal names) is
cached locally so it isn't re-parsed on every load.

### 4. The game's page content (read locally, not transmitted)

To detect your currently equipped items and to add its own buttons and panels, the
extension reads and modifies the game page in your browser. Nothing read from the
page is transmitted anywhere.

### 5. The battle you are in (read locally, not transmitted)

The protection-recommendation feature needs to know what the enemy team is
using. It reads that from the battle data the game has **already loaded into your
browser** — the same information the in-game scoreboard shows you: which team
each player is on, their score and kills, and the turret, hull and augments they
are currently using. It uses that to rank which turrets are doing the damage and
to suggest the matching protection modules.

- This is read **only while you are in a battle**, and only from data the game
  itself put in your browser. The extension does not request it from anywhere and
  does not communicate with the game's servers to obtain it.
- It is used to draw a panel and then discarded. **Nothing about the battle, the
  other players in it, or your own equipment is transmitted, stored or retained**
  — not to us (we have no server), and not to any third party.
- No profile or history of any player is built. Close the battle and the data is
  gone.

## What the extension does NOT do

- No account, sign-up, or login.
- No personal information collected (name, email, location, device IDs).
- No analytics, telemetry, tracking pixels, or advertising.
- No selling, renting, or sharing of any data.
- No storage of chat messages or translations beyond a temporary in-memory cache
  that is cleared when the page is reloaded.
- No server operated by us; there is nowhere for us to collect data even if we
  wanted to.
- No access to your browsing on any site other than tankionline.com.

## Data retention

We retain nothing, because we have no server. The in-memory translation cache
exists only for the current page session and is discarded on reload or when the
tab is closed. Your combos and settings persist in your browser until you delete
them or uninstall the extension.

## Permissions the extension requests, and why

- **storage** — to save your combos and your settings.
- **access to tankionline.com** — to run on the game page: to read your equipped
  items, inject the extension's UI, read the battle you are in so it can
  recommend protection modules, and read the game script in order to locate the
  chat UI.
- **access to the translation service** (`translate.googleapis.com`) — to send
  message text for translation.

## Your choices

- Turn chat translation off at any time (the toggle in the game's Settings
  screen, the in-battle button, or Alt+T). While off, no message text is sent
  anywhere. The combos feature works normally with translation off.
- Uninstall the extension to remove all locally stored data.

## Children

The extension is a utility for a general-audience online game and is not directed
at children. It collects no personal information from anyone.

## Changes to this policy

If this policy changes, the "Last updated" date above will change and the updated
policy will be published with the extension listing.

## Contact

For any question about this policy or the extension, contact:
**israelbenari1000@gmail.com**
