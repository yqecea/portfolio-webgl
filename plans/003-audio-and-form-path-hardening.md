# Plan 003: Harden the audio and contact-form paths

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ea71909..HEAD -- src/audio/ src/main.js pages/contact.html`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `ea71909`, 2026-06-20

## Why this matters

Three small but user-visible bugs share one root cause: **the code treats
external resources as if they always succeed.** This plan hardens the three
worst-offending call sites.

1. **Contact form posts to the wrong Mailchimp account.** The visible page
   is "Yusuf — Contact" (`pages/contact.html:7`) and the visible email is
   `yqecea@gmail.com` (`pages/contact.html:425-428`), but the form action
   posts to `chiaraluzzana.us20.list-manage.com` (a Mailchimp account owned
   by the previous site owner) with a double-encoded `&amp;amp;id=...`
   parameter. Every newsletter signup from a real visitor is silently
   routed to the wrong list. This is a privacy issue (form data goes to a
   third party without the visitor's knowledge) and a delivery issue
   (the operator never sees the signups).

2. **Audio toggler flips state to "playing" even when the browser blocks
   playback.** `src/audio/SoundReactor.js:93-104` catches `audio.play()`
   rejections with `console.warn` and returns no signal. Callers
   (`src/audio/SoundToggler.js:103-115` and `src/main.js:150-155`) then
   unconditionally set `soundFlag = true` and call `setWasPlaying(true)`.
   Result: the UI shows sound as enabled, the next reload restores the
   "playing" intent, and a fresh playback attempt will fail again.
   The state machine and the actual audio are out of sync.

3. **`localStorage` is read and written unguarded** in
   `src/audio/SoundReactor.js:64, 81-86, 90`. Browsers with storage
   disabled (private mode, some enterprise policies, some embedded
   WebViews) throw `SecurityError` on access. The throw breaks
   `restorePlaybackTime()`, `syncStorage()`, and `getWasPlaying()` —
   which means the audio toggle, the intro audio resume, and the
   page-transition storage sync all fail in those browsers.

All three are S-effort, M-impact bugs that touch user-visible behavior.

## Current state

- `pages/contact.html:497-500` — the newsletter form. Lines 497-500
  contain the form open tag, the email input, the submit button, and the
  closing tag. Line 499 is the form action:
  ```
  action="https://chiaraluzzana.us20.list-manage.com/subscribe/post?u=f068e795d25dfba3917276e6c&amp;amp;id=f12ca822b9"
  ```
- `src/audio/SoundReactor.js:93-104` — the `play()` method:
  ```js
  async play({ restore = true } = {}) {
    if (!this.audio) return;
    await this.resumeContextIfNeeded();
    if (restore) this.restorePlaybackTime();

    try {
      await this.audio.play();
      this.setWasPlaying(true);
    } catch (error) {
      console.warn('[SoundReactor] Play blocked:', error);
    }
  }
  ```
- `src/audio/SoundToggler.js:103-115` — the `onClick` handler. Line 105
  awaits `play()` but does not check the return; line 107 unconditionally
  calls `setWasPlaying(true)`.
- `src/main.js:150-155` — the homeToggler click handler. Same pattern:
  await `play()` then `soundToggler.started()` with no success check.
- `src/audio/SoundReactor.js:64, 81-86, 90` — the unguarded
  `window.localStorage` calls. Each is one line:
  - Line 64: `const saved = Number(window.localStorage.getItem(this.storage.time) || 0);`
  - Line 81: `window.localStorage.setItem(this.storage.time, String(this.audio.currentTime || 0));`
  - Line 82: `window.localStorage.setItem(this.storage.wasPlaying, String(!this.audio.paused));`
  - Line 86: `window.localStorage.setItem(this.storage.wasPlaying, String(Boolean(value)));`
  - Line 90: `return window.localStorage.getItem(this.storage.wasPlaying) === 'true';`

## Commands you will need

| Purpose   | Command                                              | Expected on success |
|-----------|------------------------------------------------------|---------------------|
| JS check  | `node --check src/audio/SoundReactor.js && node --check src/audio/SoundToggler.js && node --check src/main.js` | exit 0, no syntax errors |
| HTML lint | `npm run lint:html` (from plan 001)                  | exit 0, no new errors |
| Search    | `grep -nE 'localStorage|chiaraluzzana' src/audio/SoundReactor.js src/audio/SoundToggler.js src/main.js pages/contact.html` | shows the new safe-storage adapter and the new form action |

## Scope

**In scope** (the only files you should modify):
- `src/audio/SoundReactor.js`
- `src/audio/SoundToggler.js`
- `src/main.js`
- `pages/contact.html`

**Out of scope** (do NOT touch):
- The other audio modules (`src/audio/SoundToggler.js` calls into
  `SoundReactor.js`; do not refactor unrelated methods).
- The `src/ui/PageTransition.js` `syncStorage()` call — that is a separate
  finding (the auditor flagged it but it has no test, so leave for plan 004
  or a follow-up).
- Any other HTML page (`pages/about.html`, `pages/work.html`,
  `pages/cookie.html`, `index.html`).
- The form layout, the contact email text, or the social links in
  `pages/contact.html` — those are content changes.

## Git workflow

- Branch: `advisor/003-audio-form-hardening`
- Commit per logical step (storage adapter, SoundReactor.play return,
  toggler check, form action).
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add a safe localStorage adapter to `SoundReactor.js`

In `src/audio/SoundReactor.js`, add a private helper at the top of the
class (after `this.update = this.update.bind(this);` on line 20) and use
it everywhere localStorage is touched.

Add these private methods inside the class (between line 20 and the
`init()` method):

```js
  _safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn('[SoundReactor] localStorage read blocked:', error);
      return null;
    }
  }

  _safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn('[SoundReactor] localStorage write blocked:', error);
    }
  }
```

Replace every direct `window.localStorage` call with the adapter:

- Line 64: `const saved = Number(this._safeGet(this.storage.time) || 0);`
- Line 81: `this._safeSet(this.storage.time, String(this.audio.currentTime || 0));`
- Line 82: `this._safeSet(this.storage.wasPlaying, String(!this.audio.paused));`
- Line 86: `this._safeSet(this.storage.wasPlaying, String(Boolean(value)));`
- Line 90: `return this._safeGet(this.storage.wasPlaying) === 'true';`

**Verify**: `grep -n 'window.localStorage' src/audio/SoundReactor.js` shows
**no matches** (all five sites use the adapter). `node --check
src/audio/SoundReactor.js` exits 0.

### Step 2: Make `SoundReactor.play()` return success

In `src/audio/SoundReactor.js`, replace the `play()` method (lines 93-104):

```js
  async play({ restore = true } = {}) {
    if (!this.audio) return false;
    await this.resumeContextIfNeeded();
    if (restore) this.restorePlaybackTime();

    try {
      await this.audio.play();
      this.setWasPlaying(true);
      return true;
    } catch (error) {
      console.warn('[SoundReactor] Play blocked:', error);
      this.setWasPlaying(false);
      return false;
    }
  }
```

The change: the method now `return true` on success, `return false` on
failure. On failure, it also calls `setWasPlaying(false)` so a blocked
playback does not leave a stale "playing" intent in storage.

**Verify**: `node --check src/audio/SoundReactor.js` exits 0. The method
has exactly one `return true` and one `return false` (plus the early
`return false` at the top).

### Step 3: Update `SoundToggler.onClick` to honor the return value

In `src/audio/SoundToggler.js`, replace the `onClick` method
(lines 94-119). The new shape:

```js
  async onClick(event) {
    if (event) event.preventDefault();
    if (!this.soundReactor?.audio) return;
    if (this.isAnimating) return;

    const shouldPlay = !this.soundFlag;
    const targetAmp = shouldPlay ? 30 : 3;
    this.isAnimating = true;

    if (shouldPlay) {
      this.soundReactor.setVolume(0);
      const started = await this.soundReactor.play({ restore: true });
      if (started) {
        this.fadeVolume(1);
        this.soundReactor.setWasPlaying(true);
        this.soundFlag = true;
        this.animateAmp(targetAmp);
      } else {
        // Playback was blocked (autoplay policy, missing audio, etc.).
        // Leave soundFlag false so the next click retries correctly.
        this.soundFlag = false;
      }
      this.isAnimating = false;
    } else {
      this.fadeVolume(0, () => {
        this.soundReactor.pause();
        this.isAnimating = false;
      });
      this.soundReactor.setWasPlaying(false);
      this.soundFlag = false;
      this.animateAmp(targetAmp);
    }
  }
```

Key changes: `await this.soundReactor.play(...)` now returns a boolean
assigned to `started`. The `setWasPlaying(true)`, `soundFlag = true`, and
`animateAmp(targetAmp)` lines only run when `started === true`. The pause
branch is unchanged.

**Verify**: `node --check src/audio/SoundToggler.js` exits 0. `grep -n
'started' src/audio/SoundToggler.js` shows the new variable assignment.

### Step 4: Update `src/main.js` homeToggler click handler

In `src/main.js`, replace the homeToggler click handler (lines 150-156):

```js
      homeToggler.addEventListener('click', async () => {
        await this.soundReactor.resumeContextIfNeeded();
        const started = await this.soundReactor.play({ restore: false });
        if (started && this.soundToggler) {
          this.soundToggler.started();
        }
      });
```

The `started` return value is honored; `soundToggler.started()` is only
called on confirmed playback.

**Verify**: `node --check src/main.js` exits 0.

### Step 5: Replace the contact form action

In `pages/contact.html`, replace line 499. The new action must point at a
contact mechanism owned by the portfolio operator. There are two
acceptable options; pick one:

**Option A (preferred — explicit and recoverable)**: Replace the Mailchimp
form with a plain `mailto:` link inside a styled button. Find the form
element (`<form ... action="..." ...>...</form>`), replace it with:

```html
<div class="contact-cta">
  <a class="contact-button" href="mailto:yqecea@gmail.com?subject=Portfolio%20inquiry">Email me directly</a>
  <p class="contact-note">I read every message. Newsletter signups are not currently supported on this site.</p>
</div>
```

**Option B (only if the operator confirms a working Mailchimp list)**: Set
the form action to the operator's Mailchimp endpoint, e.g.
`https://<your-domain>.list-manage.com/subscribe/post?u=<u-id>&id=<list-id>`
with the `&amp;` correctly encoded (single `&amp;`, not `&amp;amp;`).

Default to Option A unless the operator explicitly chose Option B before
this plan executes.

**Verify**: `grep -nE 'chiaraluzzana|list-manage' pages/contact.html`
returns **no matches**. The form either contains a `mailto:` link or has
the operator's confirmed Mailchimp endpoint.

## Test plan

This is a static site — no automated test framework exists. Verify by:

1. **Storage adapter** — Open the site in a browser with localStorage
   disabled (Chrome DevTools → Application → Storage → "Block site
   storage"). Click the sound toggle. No console errors should appear.
2. **Audio return value** — Open the site, mute the tab (Chrome tab
   context menu → "Mute site"), click the sound toggle. The button
   should NOT show the "playing" visual state.
3. **Contact form** — Open `pages/contact.html` in a browser. The
   form should be either a `mailto:` link or a form pointing to the
   operator's confirmed endpoint. Submitting should not produce a network
   request to `chiaraluzzana.us20`.

The `html-validate` baseline from plan 001 should also pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -nE 'window\.localStorage' src/audio/SoundReactor.js` returns
      no matches (all five sites use the adapter)
- [ ] `node --check src/audio/SoundReactor.js` exits 0
- [ ] `node --check src/audio/SoundToggler.js` exits 0
- [ ] `node --check src/main.js` exits 0
- [ ] `src/audio/SoundReactor.js` `play()` has exactly one `return true`
      and one `return false`
- [ ] `src/audio/SoundToggler.js` `onClick` reads the `started` return value
      and gates the state update on it
- [ ] `src/main.js` `homeToggler` click reads the `started` return value
      and gates `soundToggler.started()` on it
- [ ] `grep -nE 'chiaraluzzana|list-manage' pages/contact.html` returns no
      matches
- [ ] `npm run lint:html` exits 0 (from plan 001)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The operator declines Option A (mailto) AND does not provide a working
  Mailchimp endpoint for Option B. Do not invent an endpoint.
- The audio return-value change breaks an existing test (none exist today;
  this is a regression-only stop).
- `node --check` fails on any in-scope file.
- The localStorage adapter changes a method signature in a way that breaks
  other callers (the adapter is private, so this should not happen, but if
  it does, stop).

## Maintenance notes

- The safe-storage adapter is a class-internal helper. If other modules
  (e.g. `PageTransition.js`) need similar protection, copy the pattern,
  not the implementation. A future plan can extract a shared
  `src/util/safeStorage.js` module.
- `SoundReactor.play()` returning a boolean is a contract change. If a
  future caller ignores the return value, they will get the old buggy
  behavior. Document the contract in the JSDoc when one is added.
- The `mailto:` contact form is a stopgap. A working Mailchimp or
  Buttondown integration is a future direction finding (DIR, not bug).
