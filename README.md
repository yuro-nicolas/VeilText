# VeilText Profanity Filter

A browser extension that performs **real-time, client-side detection and filtering**
of undesired textual web content, powered by a **switchable multi-pattern string
matching engine** - choose between **Aho-Corasick** and **Wu-Manber**. All processing
occurs locally on your device, no data is ever sent to an external server.

---

## Installation

VeilText is a **Google Chrome extension**. There is no server or backend to set
up - once it is loaded into Chrome, it runs entirely inside your browser.

### Option 1: Chrome Web Store (recommended)

1. Open the [Chrome Web Store](https://chromewebstore.google.com/).
2. Search for **VeilText - Profanity Filter**.
3. Click **Add to Chrome**, then confirm **Add extension**.
4. (Optional) Click the puzzle-piece icon in Chrome's toolbar and **pin** VeilText
   so its popup is one click away.

<!-- TODO: replace step 1-2 with the direct listing link once you have it:
     https://chromewebstore.google.com/detail/<name>/<extension-id> -->

### Option 2: Install from source (Load unpacked)

Use this to run the latest code from this repository, or while developing.

1. **Get the code**

   ```bash
   git clone https://github.com/yuro-nicolas/VeilText-No-Dashboard.git
   ```

   Or click **Code -> Download ZIP** on GitHub and extract it.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder - the one that
   directly contains `manifest.json`.
5. VeilText now appears in your extensions list and its master toggle starts
   **ON**. Tabs that were already open are filtered right away, without a
   refresh (see [Activation & Toggle Behavior](#activation--toggle-behavior)).

No `npm install` or build step is needed; the extension loads as-is.

**After changing code:** go back to `chrome://extensions`, click the reload
icon on the VeilText card, then refresh the page you're testing on.

### Option 3: Docker (developer tooling only)

Docker cannot run the extension itself - see [Docker](#docker) below for why,
and for the commands that validate, rebuild the lexicon for, and package the
extension inside a container.

### Direct Links

https://chromewebstore.google.com/detail/veiltext-profanity-filter/clhbicgajbeccgkhkelpkompmoeeomin

https://hub.docker.com/r/yuro04/veiltext-tools 

### Quick check that it works

Open any normal website (not a `chrome://` page and not the Chrome Web Store -
Chrome blocks all extensions there), click the VeilText icon, and confirm the
master toggle is on. Matching words on the page should be covered according to
your chosen filter mode.

---

## Algorithms

The filter ships with two interchangeable matching engines. Both scan the same
page text against the same keyword list and produce identical redaction results;
they differ only in *how* the matching is computed, which makes them directly
comparable for benchmarking.

### Aho-Corasick - O(n + m + z)

- **n** = length of input text, **m** = total length of all keywords, **z** = number of matches

1. **Trie Construction** - All keywords are inserted into a prefix trie. Each node
   stores child transitions and output (matched keyword) information.
2. **Failure Link Computation (BFS)** - Failure (suffix) links are computed via a
   breadth-first traversal so the automaton can recover from mismatches without
   returning to the root, enabling a single-pass search.
3. **Linear Search** - Text is scanned character-by-character in one pass. Matches
   are collected and the DOM is surgically updated to apply the selected filter mode.

### Wu-Manber - average sub-linear, block-hash based

1. **Block Preprocessing** - Using `m`, the length of the *shortest* keyword, and a
   block size `B` (2 characters where possible), every keyword contributes hashed
   blocks from its first `m` characters.
2. **SHIFT Table** - Maps each block hash to the minimum safe distance the scanner
   can jump forward without missing a possible match, letting the search skip over
   large stretches of text that can't contain any keyword.
3. **HASH Table + Verification** - When a lookup returns a shift of zero, the block
   might be the tail of a real match. The HASH table lists candidate keywords for
   that block, which are then verified directly against the text.

Both engines respect the same **case sensitivity** and **whole-word matching**
settings, so switching the toggle in Settings changes only the underlying search
strategy, not the filtering behavior.

---

## Features

| Feature | Description |
|---|---|
| **Dual-algorithm engine** | Toggle between Aho-Corasick and Wu-Manber from Settings |
| **3 filter modes** | Blur, Hide, or Replace matched text |
| **Quick-add** | Add one or more custom blocked keywords from the popup quickly |
| **Auto-Duplicate removal** | Checks for duplicate keywords automatically |
| **Include allowlist** | Mark specific words as always-allowed, overriding both the built-in lexicon and your custom blocked keywords |
| **Click-to-reveal, with a warning** | Clicking redacted text shows a content warning; confirming reveals the original text, and clicking again hides it |
| **Live DOM observation** | MutationObserver re-scans dynamically loaded content |
| **Case-sensitivity toggle** | Exact or case-insensitive matching |
| **Whole word matching** | Only redacts exact word matches |
| **Page load & link warnings** | Optional overlays warn before viewing a flagged page or following a flagged link |
| **Privacy-first** | Zero external requests for filtering; all processing is local |

---

## What It Can and Can't Filter

VeilText detects and filters **plain, ordinary text only** — it reads whatever
the browser stores as readable text in a webpage's underlying code (the DOM),
and checks it against the active keyword list. It does not use machine
learning, AI, or any kind of meaning/context understanding — it's a literal
keyword match, nothing more. This keeps it fast and lightweight, but it also
defines exactly what it can and cannot reach.

### What it CAN filter

- Ordinary text rendered on a webpage — articles, comments, posts, chat
  messages, and any text that loads dynamically after the initial page load
- Text inside "open" Shadow DOM widgets some sites use for self-contained
  components
- Text inside embedded frames the browser permits the extension to access
- Outbound links, via the link pre-scan warning, before you click them

### What it CANNOT filter

- **Anything that isn't actual text** — images, audio, video, or text baked
  into pixels (e.g. a screenshot containing offensive words, or text burned
  into a video frame). None of that is readable text to begin with, so the
  extension has no way to see it.
- **Canvas-based apps** — tools like Google Docs, Google Sheets, and Figma
  draw their content onto a canvas or as shapes rather than storing it as
  readable text, so the extension cannot reach any of it, regardless of what
  the words actually say.
- **Chrome's built-in PDF viewer** — works the same canvas-like way and is
  likewise out of reach.
- **"Closed" Shadow DOM** — deliberately sealed-off widgets some sites build
  that no extension, including this one, is permitted to read into.
- **Text you're actively typing** — search bars, comment boxes, and any
  editable field are intentionally skipped, so the extension never interferes
  with someone mid-sentence.
- **Text that isn't actually visible on screen** — e.g. hidden via the page's
  own CSS — so nothing gets flagged that a reader wouldn't actually see anyway.
- **Chrome-protected pages** — Chrome blocks *all* extensions, this one
  included, from running on certain pages no matter what permissions are
  requested — for example, Chrome's own internal settings pages (`chrome://...`)
  and **the Chrome Web Store itself**. This isn't a bug or an oversight in
  VeilText; it's a security restriction Chrome enforces at the browser level,
  and there is no permission or workaround an extension can request to bypass
  it. If you notice VeilText doesn't blur anything while browsing the Chrome
  Web Store, this is why.
- **Words never added to its list** — detection depends entirely on its fixed
  keyword list (the default lexicon plus whatever you add). Regional slang,
  community-specific insults, or brand-new terms that simply weren't included
  will pass through undetected, and the list only updates when a person —
  developer or user — manually adds to it; it does not learn or pull updates
  from the internet on its own.
- **Context and intent** — because it has no understanding of meaning, a word
  that's offensive in one sentence but an ordinary/technical term in another
  can't be told apart. This means both false positives (flagging harmless
  text) and false negatives (missing genuinely offensive text that just
  doesn't literally match the list) are expected, inherent limitations of a
  literal keyword-matching approach.

### A note on how filtering is applied

Matched text is never permanently deleted — it's only visually covered
(blurred, hidden, or replaced, depending on your chosen mode), while the
original text stays untouched underneath. Clicking covered text reveals it
(with a confirmation prompt by default), and clicking again re-hides it. This
is a deliberate design choice to keep the person in control rather than
enforcing a hard block — which also means the extension cannot guarantee a
user will never see flagged content, since choosing to look past a warning or
reveal covered text is always their choice.

---

## Activation & Toggle Behavior

- **First install:** the master toggle starts **ON** automatically
- **Works on already-open tabs without a refresh:** on install (and on
  update/reload of the extension), `background.js` uses
  `chrome.scripting.executeScript` to inject the content script files
  directly into every currently open, injectable tab (`http(s)://` and
  `file://` URLs — browser-internal pages like `chrome://` can't be
  injected into and are skipped). This means you don't have to manually
  reload a tab that was already open before you installed or reloaded the
  extension.

---

## How Scan Performance Is Measured

Every full-page scan and every mutation-triggered re-scan is timed using the
browser's `performance.now()` high-resolution timer, which is more precise than
`Date.now()` and unaffected by system clock adjustments.

- **Full-page scans** (`filter-engine.js`) - a timestamp is taken immediately
  before the DOM tree walk begins and again right after it finishes; the
  difference (`scanMs`) is recorded alongside the number of characters scanned
  and the number of matches found.
- **Mutation-triggered scans** (`observer.js`) - the same timing is applied to
  the smaller, scoped re-scans that run when new content is added to the page
  (infinite scroll, chat messages, SPA navigation), so live filtering overhead
  can be measured separately from the initial page load.
- **Per-algorithm attribution** - because timing is captured independently of
  which engine is active, the same measurement code produces directly
  comparable numbers for Aho-Corasick and Wu-Manber without any special-casing.

This timing data drives the live "Filtered" counter shown in the popup.

---

## Live Content Monitoring (MutationObserver)

Filtering doesn't stop after the page's initial load. `src/content/observer.js`
attaches a `MutationObserver` to the page after the first full scan completes,
so content that appears afterward - infinite-scroll feeds, chat widgets, ads,
comment sections, or anything else injected into the DOM later - gets scanned
and filtered too, without requiring a page refresh.

Key behaviors:

- **Debounced batching** - rapid bursts of DOM changes are collected over a
  short window (40ms) and processed together in one pass, rather than
  triggering a separate scan per individual change.
- **Scoped re-scans** - only the newly added nodes are checked against the
  matcher, not the entire page again, keeping live filtering cheap even on
  pages that mutate frequently.
- **Shadow DOM support** - open shadow roots are detected and given their own
  scan and their own observer, since a page-level `MutationObserver` cannot
  see inside shadow DOM on its own.
- **SPA navigation detection** - `history.pushState`/`replaceState` and the
  `popstate` event are patched/hooked so single-page-app route changes (which
  don't trigger a real page load) still trigger a fresh full-page re-scan,
  debounced so rapid-fire route changes collapse into a single rescan.
- **Special-widget polling** - a small interval periodically re-checks a
  short list of known caption/subtitle selectors (e.g. video captions, embedded
  post text) that sometimes update in ways the observer's debounce window can
  miss.

---

## Project Structure

```
VeilText-No-Dashboard/
├── manifest.json           # Extension manifest (permissions, content script list)
├── background.js           # Service worker: install defaults, tab injection, link pre-scan fetch
├── early-hide.js           # document_start overlay that hides the page briefly to avoid a flash of unfiltered content
├── popup.html / .css / .js # Settings popup UI
├── Dockerfile              # Dev tooling image (validate / lexicon / package)
├── docker-compose.yml      # Convenience commands for the Dockerfile
├── .dockerignore
├── scripts/
│   └── validate-extension.js    # Checks manifest.json and that every file it references exists
├── data/
│   ├── default_lexicon.json     # Built-in blocked-word list shipped with the extension
│   └── build_default_lexicon.py # Script that regenerates default_lexicon.json from data/raw/*
└── src/
    ├── namespace.js         # Declares the shared window.VeilText namespace (load first)
    ├── algorithms/           # Pattern-matching engines, isolated from all DOM/config code
    │   ├── aho-corasick.js
    │   ├── wu-manber.js
    │   └── matcher-factory.js
    └── content/              # The rest of the content script, one concern per file
        ├── config.js         # Loads/merges/exposes user settings
        ├── state.js           # Holds the live matcher + include-list + default lexicon
        ├── dom-utils.js        # Shared DOM predicates (isHidden, isEditableContext, ...)
        ├── filter-engine.js     # Finds + redacts blocked text in the DOM
        ├── reveal-ui.js          # The redacted <span> itself + click-to-reveal popover
        ├── page-warning.js        # Full-page "flagged content" interstitial
        ├── link-scanner.js         # Pre-checks outbound links before navigating
        ├── observer.js              # MutationObserver, shadow DOM, SPA route changes
        ├── messaging.js              # Reacts to popup/storage config changes live
        ├── styles.js                  # One shared <style> tag for the hover outline
        └── main.js                     # Entry point; wires the above together
```

The content script is deliberately **not** built as ES modules — Chrome loads
each file in `manifest.json`'s `content_scripts[].js` array as a plain
classic script, in order, inside one shared "isolated world" per page. Every
file attaches its exports to `window.VeilText.<Namespace>` (see
`src/namespace.js`) instead of using top-level `import`/`export`, so there's
no bundler step required — you can load the extension unpacked as-is.
`background.js` keeps its own copy of that same file list so it can inject
the same set of scripts into already-open tabs (see
[Activation & Toggle Behavior](#activation--toggle-behavior)).

---

## Docker

### Why the extension itself can't run in Docker

Docker packages **server-side programs** - things that start up, listen on a
port, and run on a machine somewhere. VeilText isn't one. It has no backend, no
server, and no port to expose: it is a set of JavaScript files that **Google
Chrome loads into your own browser** and runs on each web page you visit.
Since it only works inside a real, running Chrome on your computer, there is
nothing meaningful to "start" in a container, and installing it there would
accomplish nothing for end users. Users install it from the Chrome Web Store
or via **Load unpacked** (see [Installation](#installation)).

### What Docker *is* used for here

The container wraps the **developer tooling** around the extension, so these
tasks run the same way on any machine without installing Node or Python
locally:

| Command | What it does |
|---|---|
| `docker compose run --rm validate` | Checks that `manifest.json` is valid JSON and that every file it references (content scripts, popup, service worker, icons, etc.) exists. Also checks `data/default_lexicon.json` is a valid JSON array. |
| `docker compose run --rm lexicon` | Regenerates `data/default_lexicon.json` by running `data/build_default_lexicon.py` (requires the source lists in `data/raw/`). |
| `docker compose run --rm package` | Produces `dist/veiltext.zip`, ready to upload to the Chrome Web Store (or to unzip and load unpacked). Dev-only files (Docker files, scripts, raw lexicon sources, `.git`) are excluded. |

### Setup

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   (Windows/macOS) or Docker Engine with the Compose plugin (Linux), and make
   sure it is running.
2. From the project root (the folder containing `manifest.json`), build the
   image once:

   ```bash
   docker compose build
   ```

3. Run any of the commands from the table above. Outputs (`dist/`, the
   regenerated lexicon) are written back into your project folder through a
   bind mount, so you can use them straight away.

Example workflow before publishing an update:

```bash
docker compose run --rm lexicon     # only if you changed the raw word lists
docker compose run --rm validate
docker compose run --rm package     # upload dist/veiltext.zip to the Web Store
```

Commands work the same in PowerShell, Command Prompt, and bash.

### Notes

- Loading the extension in Chrome and testing it on real pages is still done
  manually through `chrome://extensions` -> **Load unpacked**.
- `lexicon` needs the raw source lists in `data/raw/`. If that folder isn't in
  your clone, the script will fail; add the files first.

---

## Default Lexicon

The extension includes a predefined English profanity lexicon generated by
merging publicly available datasets into a single deduplicated keyword
list. The resulting lexicon serves as the extension's default set of blocked
terms and can be supplemented or overridden with custom keywords and allowlist
entries through the extension's settings.

The default lexicon is built from the following sources:

1. **Surge AI Profanity Dataset**  
   Available at: https://huggingface.co/datasets/mmathys/profanity  
   A curated lexicon containing over 1,600 English profanities and their
   variations compiled by Surge AI.

2. **List of Dirty, Naughty, Obscene, and Otherwise Bad Words**  
   Available at: https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words  
   An open-source profanity lexicon originally derived from the Shutterstock
   banned-word list and expanded through community contributions.

3. **Google Profanity Words List**  
   Available at: https://github.com/coffee-and-fun/google-profanity-words  
   A comprehensive list of commonly filtered offensive terms that is widely
   used in profanity detection and content moderation applications.

4. **Swear Words Used by Filipino: A Case Study**  
   Available at: https://www.researchgate.net/publication/397749432_Swear_Words_Used_by_Filipino_A_Case_Study  
   A study documenting Filipino/Tagalog swear words and their usage among Filipinos. Its inclusion helps the default lexicon represent undesired language commonly used in the Philippine context, complementing the English-language profanity sources.
