# Plan 004: Quick WebGL wins (matcap/FBX error states, pixel-ratio cap, context-loss handling, no-WebGL fallback, remove unused OrbitControls)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ea71909..HEAD -- src/webgl/WebGLApp.js index.html`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (but plan 001's verification baseline is recommended)
- **Category**: bug
- **Planned at**: commit `ea71909`, 2026-06-20

## Why this matters

The home page's signature WebGL sphere has five reliability gaps, all
M-or-smaller effort:

1. **Silent failure on asset load.** The matcap (`src/webgl/WebGLApp.js:278`)
   and the FBX model (`src/webgl/WebGLApp.js:337`) are loaded from
   `cdn.jsdelivr.net/gh/niccolomiranda/chiara-luzzana` with no `onError`
   handler. If either request fails (CDN outage, repo deleted, CORS
   failure, model file moved), the canvas stays blank and the user sees a
   gray void instead of the sphere.
2. **Mobile pixel ratio uncapped.** `src/webgl/WebGLApp.js:287-289` calls
   `this.renderer.setPixelRatio(window.devicePixelRatio)` with no cap.
   A 3x-DPR iPhone renders the full-screen sphere at 9× the pixels of a
   1x laptop, for no visible gain. This is the dominant frame-time cost
   on mobile.
3. **No WebGL context-loss handling.** `src/webgl/WebGLApp.js:282-285`
   constructs the renderer and appends its canvas, but no
   `webglcontextlost` / `webglcontextrestored` listeners are attached.
   On mobile Safari and low-memory Chromium, a tab switch or a
   GPU pressure event can lose the context permanently. The scene stays
   blank until a manual reload.
4. **No fallback for no-WebGL and no-JS users.** `index.html:597` is an
   empty `<div class="webglholder">`. Users with WebGL disabled (some
   enterprise policies, some battery-saver modes, hardware acceleration
   off) or JS disabled see nothing. There is no `<noscript>` block on the
   home page.
5. **Unused OrbitControls script.** `index.html:153` loads
   `OrbitControls.js` from CDN. `src/webgl/WebGLApp.js:303-306` only
   instantiates the project's custom `CameraController`; the loaded
   `OrbitControls` constructor is never called. That's an extra CDN
   request, parse cost, and a hint to future agents that drag-to-orbit
   was intended (it wasn't — the sphere is cursor-reactive).

## Current state

- `src/webgl/WebGLApp.js:270-330` is the `init()` method. Key sites:
  - Line 278: `const matCapUrl = 'https://cdn.jsdelivr.net/gh/niccolomiranda/chiara-luzzana@72fab3c/sphere/matCap0.jpg';`
  - Line 279: `this.matCaps.push(loader.load(matCapUrl));`
  - Line 282: `this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });`
  - Line 285: `this.container.appendChild(this.renderer.domElement);`
  - Lines 287-289: the mobile-only `setPixelRatio` call with no cap.
  - Line 323: `window.addEventListener('resize', this.resizeCanvas);`
  - Lines 326-329: the `loop.subscribe` for the update tick.
- `src/webgl/WebGLApp.js:332-360` is `loadSphereModel()`. Line 337:
  ```js
  fbxLoader.load(
    'https://cdn.jsdelivr.net/gh/niccolomiranda/chiara-luzzana/sphere/slice2.fbx',
    (obj) => { ... }
  );
  ```
  No second argument for `onError` or `onProgress`.
- `index.html:152-155` loads Three.js r125 + OrbitControls + fflate +
  FBXLoader. The OrbitControls script (line 153) is never wired up.
- `index.html:597` is the empty `.webglholder` div. There is no
  `<noscript>` block in the file.

## Commands you will need

| Purpose   | Command                                              | Expected on success |
|-----------|------------------------------------------------------|---------------------|
| JS check  | `node --check src/webgl/WebGLApp.js && node --check src/main.js` | exit 0, no syntax errors |
| Search    | `grep -nE 'OrbitControls|webglcontextlost|setPixelRatio|noscript' src/webgl/WebGLApp.js index.html` | shows the new handlers and the removed OrbitControls reference |
| HTML lint | `npm run lint:html` (from plan 001)                  | exit 0, no new errors |

## Scope

**In scope** (the only files you should modify):
- `src/webgl/WebGLApp.js`
- `index.html` (remove the OrbitControls script tag; add a `<noscript>` block
  and a static poster inside `.webglholder`)

**Out of scope** (do NOT touch):
- The matcap / FBX URLs themselves. Self-hosting is a separate plan
  (the security subagent's [SECURITY-04] finding).
- Three.js version (r125 → r150+ is a separate L-effort migration).
- The `src/work/DesktopHorizontalScrollController.js`,
  `src/core/MobileFix.js`, or `src/scroll/SmoothVerticalScroll.js` — those
  have their own RAFs but the "collapse to Loop.js" work is a separate
  plan.
- The `pages/work.html`, `pages/about.html`, `pages/contact.html` files
  (they don't have a WebGL canvas).

## Git workflow

- Branch: `advisor/004-quick-webgl-wins`
- Commit per logical step (error handlers, pixel ratio, context loss,
  fallback, OrbitControls removal).
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add `onLoad` / `onError` handlers for the matcap texture

In `src/webgl/WebGLApp.js`, replace line 279:

```js
this.matCaps.push(loader.load(matCapUrl));
```

with:

```js
loader.load(
  matCapUrl,
  (texture) => {
    this.matCaps.push(texture);
    this._markMatCapLoaded();
  },
  undefined,
  (error) => {
    console.warn('[WebGLApp] Matcap load failed:', error);
    this._showFallback('matcap');
  }
);
```

The helpers `_markMatCapLoaded()` and `_showFallback(reason)` are added
in step 5.

**Verify**: `grep -n 'matCapUrl' src/webgl/WebGLApp.js` shows the new
4-argument form. `node --check src/webgl/WebGLApp.js` exits 0.

### Step 2: Add `onProgress` / `onError` handlers for the FBX model

In `src/webgl/WebGLApp.js`, replace the `loadSphereModel()` call at
line 336-338. The current shape:

```js
fbxLoader.load(
  'https://cdn.jsdelivr.net/gh/niccolomiranda/chiara-luzzana/sphere/slice2.fbx',
  (obj) => { ... }
);
```

Replace with:

```js
fbxLoader.load(
  'https://cdn.jsdelivr.net/gh/niccolomiranda/chiara-luzzana/sphere/slice2.fbx',
  (obj) => {
    this._markModelLoaded();
    /* existing success-callback body */
  },
  undefined,
  (error) => {
    console.warn('[WebGLApp] FBX load failed:', error);
    this._showFallback('model');
  }
);
```

Keep the existing success-callback body intact. The new wrappers call
the helpers added in step 5.

**Verify**: `node --check src/webgl/WebGLApp.js` exits 0.

### Step 3: Cap mobile pixel ratio at 1.5

In `src/webgl/WebGLApp.js`, replace lines 287-289:

```js
if (window.isMobile) {
    this.renderer.setPixelRatio(window.devicePixelRatio);
}
```

with:

```js
if (window.isMobile) {
    const cap = 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
}
```

Also update the resize handler to use the same cap. Find the
`resizeCanvas` method (search the file for `resizeCanvas`) and replace
its `setPixelRatio` call with the same `Math.min(..., 1.5)` form.

**Verify**: `grep -n 'setPixelRatio' src/webgl/WebGLApp.js` shows the
`Math.min(..., 1.5)` form at both sites. `node --check` exits 0.

### Step 4: Add WebGL context-loss and context-restored listeners

In `src/webgl/WebGLApp.js`, after line 285 (`this.container.appendChild(...)`),
add:

```js
this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  console.warn('[WebGLApp] WebGL context lost');
  this._showFallback('context-loss');
  this._paused = true;
});

this.renderer.domElement.addEventListener('webglcontextrestored', () => {
  console.log('[WebGLApp] WebGL context restored');
  this._paused = false;
  this._hideFallback();
  // Re-load assets that were tied to the lost context.
  this.loadSphereModel();
});
```

In the `update()` method (find the `update(` definition), short-circuit
when `_paused` is true:

```js
update() {
  if (this._paused) return;
  // ... existing body
}
```

**Verify**: `grep -nE 'webglcontextlost|webglcontextrestored|_paused' src/webgl/WebGLApp.js`
shows the new event listeners and the pause flag. `node --check` exits 0.

### Step 5: Add the `_showFallback` / `_hideFallback` / `_mark*` helpers

In `src/webgl/WebGLApp.js`, add these private methods to the class
(alongside the existing methods; place them after `update()`):

```js
  _showFallback(reason) {
    if (!this.container) return;
    this.container.classList.add('webgl-fallback');
    this.container.dataset.fallbackReason = reason;
  }

  _hideFallback() {
    if (!this.container) return;
    this.container.classList.remove('webgl-fallback');
    delete this.container.dataset.fallbackReason;
  }

  _markMatCapLoaded() {
    this._matCapLoaded = true;
    if (this._modelLoaded) this._hideFallback();
  }

  _markModelLoaded() {
    this._modelLoaded = true;
    if (this._matCapLoaded) this._hideFallback();
  }
```

Initialize the flags in the `init()` method (after the `this.container`
assignment, around line 273). Add:

```js
this._matCapLoaded = false;
this._modelLoaded = false;
this._paused = false;
```

The fallback is shown whenever one of the two assets fails, or when the
context is lost. Both assets loading successfully hides the fallback.

**Verify**: `grep -nE '_showFallback|_hideFallback|_markMatCapLoaded|_markModelLoaded' src/webgl/WebGLApp.js`
shows the new methods and the call sites in steps 1, 2, and 4.
`node --check` exits 0.

### Step 6: Add a static poster inside `.webglholder` and a `<noscript>` block

In `index.html`, replace line 597:

```html
<div style="filter: invert(0%)" class="webglholder"></div>
```

with:

```html
<div style="filter: invert(0%)" class="webglholder">
  <noscript>
    <p class="webgl-fallback-message">
      This portfolio uses WebGL for the home hero. Please enable JavaScript
      or visit <a href="./pages/work.html">the work page</a> to see projects.
    </p>
  </noscript>
  <div class="webgl-static-poster" aria-hidden="true"></div>
</div>
```

Add a small CSS rule to `css/style.css` (anywhere; the file is one
big Webflow export so find a `.webglholder` related block — if none
exists, add to the end):

```css
.webglholder {
  position: relative;
}
.webgl-static-poster {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, #1a1a1a 0%, #0d0d0d 70%);
  z-index: 0;
}
.webglholder.webgl-fallback .webgl-static-poster {
  /* When the canvas fails, ensure the poster stays visible. */
  z-index: 1;
}
.webglholder canvas {
  position: relative;
  z-index: 2;
}
.webgl-fallback-message {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1rem;
  z-index: 3;
}
```

The CSS is intentionally minimal — the static poster is a dark
radial gradient that approximates the WebGL scene's mood. Future plans
can replace it with a static SVG sphere or a curated screenshot.

**Verify**: `grep -n 'webglholder' index.html` shows the new children.
`grep -n 'webgl-fallback\|webgl-static-poster' css/style.css` shows the
new CSS rules. `npm run lint:html` (from plan 001) exits 0.

### Step 7: Remove the unused OrbitControls script

In `index.html`, remove line 153:

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.125.2/examples/js/controls/OrbitControls.js"></script>
```

Do not remove the other Three.js scripts (core, FBXLoader, fflate) — they
are all used by `WebGLApp.js`.

**Verify**: `grep -nE 'OrbitControls' index.html src/webgl/WebGLApp.js`
shows **no matches** in `index.html` (the script tag is removed). The
`WebGLApp.js` file is also clean (the audit confirmed the constructor is
not called).

## Test plan

This is a static site — verify by:

1. **Error states** — In Chrome DevTools, block requests to
   `cdn.jsdelivr.net/gh/niccolomiranda`. Reload the home page. The
   `.webglholder` should show the `.webgl-static-poster` (dark gradient)
   and the console should log `[WebGLApp] Matcap load failed` and
   `[WebGLApp] FBX load failed`. No JavaScript error should propagate.
2. **Pixel ratio cap** — On a 3x-DPR mobile (or Chrome DevTools
   "Sensors" → "Device pixel ratio" = 3), the rendered sphere should
   not stutter. `console.log(this.renderer.getPixelRatio())` should
   return 1.5.
3. **Context loss** — In Chrome DevTools, "Rendering" tab → "Emulate
   WebGL context loss" → "Press to simulate context loss". The poster
   should appear within 1 second. Click the same button to "Restore
   context" — the sphere should re-render.
4. **No-JS fallback** — In Chrome DevTools, "Network" tab → "Block
   request URL" pattern matching `src/main.js`. Reload. The
   `<noscript>` message should appear.
5. **OrbitControls removal** — `grep -rE 'OrbitControls' index.html src/`
   returns no matches in `index.html`. The page still renders the
   sphere identically.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `node --check src/webgl/WebGLApp.js` exits 0
- [ ] `node --check src/main.js` exits 0
- [ ] `grep -nE 'window\.localStorage' src/webgl/WebGLApp.js` returns no matches (this file shouldn't add any)
- [ ] `grep -n 'OrbitControls' index.html` returns no matches
- [ ] `grep -nE 'webglcontextlost|webglcontextrestored' src/webgl/WebGLApp.js` returns 2+ matches
- [ ] `grep -nE 'setPixelRatio' src/webgl/WebGLApp.js` shows `Math.min(..., 1.5)` at both call sites
- [ ] `grep -nE 'noscript|webgl-static-poster' index.html` returns 2+ matches
- [ ] `grep -nE 'webgl-fallback|webgl-static-poster' css/style.css` returns 3+ matches
- [ ] `npm run lint:html` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A step's verification fails twice after a reasonable fix attempt.
- The fallback CSS fights the live canvas layering (the sphere is
  covered by the gradient or vice versa) — that's a layering bug, stop
  and report.
- The pixel-ratio cap introduces visible aliasing on high-DPI mobile.
  The cap is a perf-vs-quality tradeoff; 1.5 is the safe default. If
  aliasing is visible, raise to 2.0 and document the regression.
- Removing OrbitControls breaks a feature the operator relies on
  (drag-to-orbit). The audit confirmed it is not wired up, but if the
  operator says otherwise, stop and ask.

## Maintenance notes

- The `webgl-fallback` class is the single signal that the canvas is in
  a degraded state. Future code (e.g. a "retry load" button) can hook
  into it via `this.container.classList.contains('webgl-fallback')`.
- The 1.5 cap is mobile-only. Desktop renders at full devicePixelRatio.
  If desktop perf becomes an issue (high-DPI laptops), apply the cap
  there too.
- The `<noscript>` block targets the WebGL home hero specifically. Other
  pages (work, about, contact) don't have a WebGL canvas and don't need
  a similar block.
- The personal CDN dependency (`niccolomiranda/chiara-luzzana`) is
  intentional in this plan. Plan 005 (or a follow-up) self-hosts the
  assets.
