# LinkedIn Auto Connect

A Chrome extension (Manifest V3) that automatically clicks **Connect** buttons on LinkedIn
invitation pages and sends the connection request **without a note**, then advances through
subsequent pages on its own.

---

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [How to use](#how-to-use)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [State model](#state-model)
- [How the extension finds buttons](#how-the-extension-finds-buttons)
- [Console debugging](#console-debugging)
- [Troubleshooting](#troubleshooting)
- [Known limitations and issues](#known-limitations-and-issues)
- [Development notes](#development-notes)
- [Legal](#legal)

---

## Features

- **Auto-connect** — clicks every `Connect` button it finds on the current page.
- **Send without a note** — dismisses the connect modal by clicking the
  `Send without a note` button, so no note is required.
- **Auto-pagination** — when a page runs out of invitations, it moves to the next one by
  rewriting the `?page=` query parameter and resuming after the reload.
- **Survives reloads** — running state lives in `chrome.storage.sync`, so the automation
  resumes even after a page navigation or a manual refresh.
- **Live dashboard** — the popup shows status, invitations sent, current page, and last action.
- **Toolbar badge** — displays a live count of connection requests sent.
- **Start / Stop / Reset** — full manual control from the popup.

---

## Requirements

| Requirement | Details |
|---|---|
| Browser | Google Chrome (or any Chromium-based browser) |
| Chrome version | 88+ (Manifest V3 support) |
| Build tooling | None — this is a plain, dependency-free extension. No npm, no webpack, no build step. |
| LinkedIn account | Signed in, with access to the page containing your invitations |

---

## Installation

The extension is loaded **unpacked** from this folder. There is nothing to build.

1. Open Chrome and navigate to `chrome://extensions`.
2. Turn on the **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select this folder:
   ```
   C:\Users\msid9228\WebstormProjects\linkedin-chrome-extension
   ```
   > Select the folder that contains `manifest.json` — not the `icons` folder, not `src`.
5. The extension **LinkedIn Auto Connect** appears in the list and is pinned to the toolbar.

### Loading in other Chromium browsers

Edge: `edge://extensions`. Brave: `brave://extensions`. Opera: `opera://extensions`.
Turn on developer mode and use **Load unpacked** in the same way.

### Updating after a code change

Go to `chrome://extensions`, find the extension card, and click the **reload** (circular arrow)
icon. Your settings and counters in `chrome.storage.sync` are preserved.

---

## How to use

1. **Sign in to LinkedIn** and open the page that lists your invitations (the My Network /
   Invitations page, or a people-search results page) in a normal browser tab.
2. **Make sure the tab is the active tab.** The extension reads the current tab's URL to work
   out which page it is on — it uses the `?page=` query parameter, defaulting to page 1.
3. **Click the extension icon** in the Chrome toolbar to open the popup.
4. **Click `▶ Start`.**
   - The popup shows a green *Running* status and the counter starts climbing.
   - The toolbar badge shows how many requests have been sent.
   - The page itself visibly clicks through the connect buttons.
5. **Let it run.** Each request takes roughly **3 seconds** (1s to open the modal, 1s to click
   *Send without a note*, 2s before the next one). When a page is exhausted, the extension
   navigates to the next page and continues automatically.
6. **Click `■ Stop`** to pause at any time. The counter and current page are kept, so you can
   resume later.
7. **Click `Reset counter`** to zero out the "Sent" number without stopping the automation.

> **Tip:** Keep the LinkedIn tab focused and visible. LinkedIn throttles background tabs, and a
> long-running tab may be discarded by Chrome if left idle — the extension will resume
> automatically when the tab reloads, but the pause is unavoidable.

---

## How it works

```
┌──────────────────────────────────────────────────────────────┐
│  POPUP  (popup.html / popup.js)                              │
│  Start / Stop / Reset buttons, polls storage every 1s       │
└───────────────┬──────────────────────────┬───────────────────┘
                │ chrome.storage.sync      │ chrome.tabs
                │   (state)                │   .sendMessage
                ▼                          ▼
┌──────────────────────────────────────────────────────────────┐
│  CONTENT SCRIPT  (content.js) — runs on linkedin.com         │
│                                                              │
│   processNext()                                              │
│     ├─ find Connect buttons  ──► click                       │
│     ├─ wait 1s → click "Send without a note" (shadow DOM)    │
│     ├─ wait 2s → processNext() again                          │
│     └─ no buttons left → bump ?page= and navigate → reload    │
└───────────────┬──────────────────────────┬───────────────────┘
                │ chrome.storage.sync      │ chrome.runtime
                ▼                          ▼
┌──────────────────────────────┐  ┌────────────────────────────┐
│  SERVICE WORKER              │  │  chrome.action.setBadgeText│
│  (background.js)             │  │  → toolbar badge counter   │
│  Persists state, sets badge │  └────────────────────────────┘
└──────────────────────────────┘
```

**The loop, step by step:**

1. The popup writes `{ isRunning: true, currentPage: N, totalSent: 0 }` to `chrome.storage.sync`
   and sends `START` to the content script.
2. The content script finds all Connect buttons and clicks the first one.
3. After 1 second it looks inside the `<interop-outlet>` shadow root for the
   `Send without a note` button and clicks it.
4. After 2 more seconds it repeats from step 2.
5. When no Connect buttons remain, it increments the page number, sets `?page=N+1` on the
   current URL, and navigates there.
6. The reload re-injects the content script, which reads `isRunning: true` from storage and
   resumes on the new page.

---

## Project structure

```
linkedin-chrome-extension/
├── manifest.json      # Extension manifest (MV3): permissions, entry points, icons
├── background.js      # Service worker — state relay + toolbar badge
├── content.js         # Runs on linkedin.com — the actual automation loop
├── popup.html         # Extension popup markup + inline CSS
├── popup.js           # Popup logic — buttons, 1s polling of live state
├── state.js           # Shared storage helpers (currently not referenced — see Known issues)
├── icons/
│   ├── icon16.png     # Toolbar icon, 16×16
│   ├── icon48.png     # Extension list icon, 48×48
│   └── icon128.png    # Store / install icon, 128×128
├── make-icons.ps1     # PowerShell script that regenerates the three PNG icons
└── README.md          # This file
```

### File responsibilities

| File | Runs in | Responsibility |
|---|---|---|
| `manifest.json` | — | Declares permissions (`activeTab`, `scripting`, `storage`), host access to `linkedin.com`, the content script injection at `document_idle`, the background service worker, and the popup. |
| `background.js` | Service worker | Central state relay. Handles `GET_STATE`, `START`, `STOP`, `UPDATE_STATE` and `UPDATE_BADGE`. Sets the toolbar badge count. |
| `content.js` | Page (isolated world) | The automation loop: finds Connect buttons, opens the modal, clicks *Send without a note*, advances pages, resumes after reloads. Exposes `window.autoConnect` for debugging. |
| `popup.html` / `popup.js` | Popup | Dashboard UI and Start/Stop/Reset controls. Polls `chrome.storage.sync` once per second for live updates. |
| `state.js` | — | Thin promise-based wrapper over `chrome.storage.sync` for `getState` / `setState` / `updateState`. |

---

## State model

All state is stored in `chrome.storage.sync` under three keys:

| Key | Type | Meaning |
|---|---|---|
| `isRunning` | boolean | Whether the automation loop should continue. The single source of truth for "keep going". |
| `currentPage` | number | The `?page=` value the extension believes it is on. Re-derived from the URL on every page load. |
| `totalSent` | number | Number of Connect buttons clicked since the last Start or Reset. |

`chrome.storage.sync` was chosen over `local` so the run survives a service-worker restart and
travels across the user's Chrome profile. Note that Chrome caps sync storage at ~8 KB per item
and ~100 KB total — irrelevant here, but the limit exists.

---

## How the extension finds buttons

Two selectors do all the work, and both are coupled to LinkedIn's internal DOM. If either
breaks, the extension silently stops sending requests.

**1. Connect buttons** — matched by LinkedIn's internal `componentkey` attribute
(`content.js:53`):

```js
[componentkey^="ConnectButtonstate:invitation:urn:li:member:"][componentkey$="_connect"]
```

**2. The "Send without a note" button** — this lives inside a **shadow root**, so a normal
`document.querySelector` cannot see it (`content.js:45`):

```js
document.querySelector('#interop-outlet').shadowRoot
  .querySelector('button[aria-label="Send without a note"]')
```

**Both are brittle by nature.** `componentkey` is an undocumented internal attribute that
LinkedIn renames without notice, and `aria-label` is **translated** — on a non-English
LinkedIn account the modal button is labelled differently and the extension will click the
Connect button, fail to find the send button, warn in the console, and move on without
actually sending.

To check whether the selectors still work after a LinkedIn redesign, open the page and run
this in the DevTools console:

```js
document.querySelectorAll(
  '[componentkey^="ConnectButtonstate:invitation:urn:li:member:"][componentkey$="_connect"]'
).length
```

If that returns `0` on a page you know has invitations, the selector needs updating.

---

## Console debugging

The content script logs every step with the `[AutoConnect]` prefix. To see the logs, open
DevTools on the LinkedIn tab and select the **content script** context from the console's
context dropdown (e.g. `linkedin.com` → `AutoConnect`) — plain page logs will not show them.

Sample output:

```
[AutoConnect] Content script loaded.
[AutoConnect] Starting on page 1
[AutoConnect] Page 1 ready. Processing...
[AutoConnect] Page 1: 10 remaining — clicking...
[AutoConnect] Sent without a note. Total: 1
```

The content script also exposes a small debug API:

```js
autoConnect.status();   // → { isRunning, currentPage, totalSent }
autoConnect.start(3);   // start on page 3
autoConnect.stop();     // stop the loop
```

> These are only callable from the **content script** console context (same dropdown as above),
> not from the page's own `window`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Nothing happens when you click Start | The active tab is not a LinkedIn page, or the content script is not injected | Open the LinkedIn invitations tab and make sure it is the active tab. Reload the extension from `chrome://extensions`. |
| Status flips to *Stopped* immediately | The page has no Connect buttons, or the selectors no longer match | Run the selector test in [How the extension finds buttons](#how-the-extension-finds-buttons). |
| Counter climbs but no invitations are actually sent | The `Send without a note` button was not found — usually a language mismatch or a LinkedIn redesign | Check the console for `Send button not found.` and confirm your LinkedIn UI language is English. |
| Automation stops after the first page | The target page uses infinite scroll rather than `?page=` pagination | Navigate manually to a URL that supports `?page=N`, or pick a different page. |
| "Extension context invalidated" errors in the console | You reloaded the extension while the page was open | Reload the LinkedIn tab. |
| Nothing happens after a browser restart | Chrome discarded the tab, or `chrome.storage.sync` was cleared | Open the LinkedIn page again; the extension resumes automatically if `isRunning` is still `true`. |
| The toolbar badge shows a stale count | The badge is only updated by the content script | Open the popup and press `Reset counter`. |

---

## Known limitations and issues

**Behaviours worth knowing:**

- **The counter counts clicks, not confirmed sends.** `totalSent` increments immediately after
  the Connect button is clicked, before the modal is confirmed. If the send button is not
  found, the count still went up even though no request was sent.
- **Possible end-of-list pagination loop.** When a page has no Connect buttons, the extension
  increments the page number and navigates. If LinkedIn serves an empty-but-valid page for
  out-of-range numbers, the extension will keep advancing pages indefinitely. Watch the
  `Page` value in the popup; press **Stop** if it climbs past the last real page.
- **English UI only.** The `Send without a note` lookup is by English `aria-label`.
- **LinkedIn rate limits and ToS.** Sending many connection requests in quick succession will
  trigger LinkedIn's anti-automation systems, which may result in a temporary restriction on
  the account. See [Legal](#legal).
- **The extension targets pages that use `?page=N` pagination.** LinkedIn's newer My Network
  view uses infinite scroll; on those pages the "auto-advance to next page" step will not find
  anything new.

**Bugs in the current codebase:**

- `make-icons.ps1:38` writes to `...\linkedin-chrome-extension\extension\icons`, but the icons
  live in `...\linkedin-chrome-extension\icons`. The script creates a stray `extension\` folder
  instead of overwriting the real icons. Fix the `$base` path to remove the `extension\`
  segment.
- `state.js` is **not referenced anywhere** — it is not listed in `manifest.json`, not injected
  into the content script, and not included in `popup.html`. Its helpers are dead code, and the
  popup and content script each implement their own storage access instead. Either wire it in
  or delete it.
- The `background.js` handler for `UPDATE_STATE` and the `content.js` handler for
  `NAVIGATE_NEXT_PAGE` are both unreachable — nothing sends those messages. Page advancement is
  handled entirely inside `content.js` via a direct `window.location.href` assignment.
- The `activeTab` and `scripting` permissions in `manifest.json` are declared but never used;
  the content script is declared statically instead. `scripting` in particular is the
  higher-risk of the two — removing it would tighten the extension's permissions.
- In `content.js`, the `setTimeout` callback that clicks the *Send without a note* button is
  not guarded by an `isRunning` check, so a request that was already in flight when the user
  pressed **Stop** can still complete.

---

## Development notes

**There is no build step.** Edit the `.js` / `.html` files directly, then hit the reload button
on `chrome://extensions`. There is no package manager, bundler, or linter configured in this
repository.

**Regenerating the icons** (requires PowerShell with `System.Drawing`):

```powershell
cd C:\Users\msid9228\WebstormProjects\linkedin-chrome-extension
.\make-icons.ps1
```

> Fix the `$base` path first (see Known issues) or it will write to the wrong folder.

**Changing the timing.** The delays live in `content.js`:

| Constant | Location | Effect |
|---|---|---|
| `1000` before `startAutomation` | `content.js:14` | Delay between pressing Start and the first click. |
| `1000` before finding the send button | `content.js:92` | How long to wait for the connect modal to appear. Increase on slow connections. |
| `2000` before the next iteration | `content.js:100` | Pause between requests. Increase this to slow the extension down and reduce the chance of a rate limit. |
| `2000` before resuming after reload | `content.js:125` | Grace period after a page load before the automation resumes. |

**Adding support for a new LinkedIn page type** means extending the Connect-button selector in
`content.js:53` — match the `componentkey` prefix used by that page's cards.

**Adding a new state field** means touching four places: the write in `content.js` (`saveState`),
the reads in `background.js` and `popup.js`, and the key list in `state.js`.

---

## Legal

This extension automates actions on LinkedIn. Use it at your own risk: automating connection
requests may violate the [LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement)
and can trigger account restrictions. Only use it on an account you own, and at a rate a human
could realistically achieve by hand.
