# Portfolio (Yusuf — yqecea-portfolio)

Static WebGL portfolio. No build step, no test framework. Dependencies are
CDN `<script>` tags in each HTML page. Hosted on Firebase at
`yqecea-portfolio.web.app`.

## Architecture

The site has two parallel animation systems:

1. **Inline `<script>` blocks** in `index.html` and `pages/*.html` (legacy,
   Webflow-export era). These still load and run.
2. **ES modules under `src/`** (modern). The entry point is `src/main.js`,
   loaded as `<script type="module" src="./src/main.js">` from each page.

Both run on the same page. The ES module in `src/main.js` is the
authoritative one for new work; the inline scripts are kept only because
the v2 refactor was not fully completed.

## Stack

- HTML5 + CSS (one file: `css/style.css`, 9.3K LOC, Webflow-generated)
- ES modules under `src/`: `core/`, `ui/`, `webgl/`, `scroll/`, `audio/`,
  `about/`, `work/`
- Three.js r125 (CDN) for the WebGL sphere
- GSAP 3.13.0 + EaselPlugin (CDN) for animation
- Lenis 1.3.23 (pinned CDN) for vertical smooth scrolling on home/about/contact,
  integrated through GSAP ticker in `src/scroll/LenisSmoothScroll.js`.
- `src/scroll/NativeScrollMotion.js` handles lightweight IntersectionObserver +
  GSAP reveal motion; it must not hijack wheel/keyboard scrolling or animate
  every `[data-scroll]` element.
- Work uses bounded smooth horizontal transform motion through
  `src/work/DesktopHorizontalScrollController.js`; RAF starts on wheel input and
  stops after interpolation settles.
- jQuery 3.5.1 (CDN, has SRI hash) for the Webflow runtime
- Webflow runtime (CDN) for legacy form + IX2 animations

## Pages

| Path                  | Purpose             | WebGL? | Scroll |
|-----------------------|---------------------|--------|--------|
| `index.html`          | Home / hero         | Yes (`index.html:597` `.webglholder`) | Lenis vertical |
| `pages/work.html`     | 10 project cards (horizontal scroll on desktop) | No | Smooth horizontal transform |
| `pages/about.html`    | About               | No  | Lenis vertical + data-scroll parallax |
| `pages/contact.html`  | Contact form        | No  | Lenis vertical |
| `pages/cookie.html`   | Cookie notice       | No  | Native vertical |

The work page ships **10 cards** (not 7 — `GEMINI.md` is stale on this).
Verified at `pages/work.html:283, 310, 337, 365, 393, 420, 447, 475, 504, 533`.

## Verification

```bash
cd portfolio-webgl
npm ci
npm run lint:html   # html-validate on index.html + pages/*.html
npm run check:js    # node --check on every .js under src/
npm run check:ui-contracts
npm run verify      # check:js + lint:html + check:ui-contracts
npm run lint:links  # linkinator against the live deploy
```

(Setup is in `plan 001`.)

## Current UI Contracts

- **Home intro contract (resolved — plan 011 Phase 1, 2026-07-03): Option B — single-tap CTA.**
  The first screen shows the oversized `Hello my name is / YUSUF. creative /
  developer / from Kazakhstan / 16 y.o.` overlay. A single tap on the overlay
  dismisses the intro, starts sound, and reveals the `.intro-explore-cta`
  element (a "Start explore" link to `pages/about.html`). The legacy
  `.l-over.hometoggler` "Click anywhere to enable the sound" prompt markup
  is still present in the DOM as a fallback (used by `showPrompt()` when the
  intro root becomes invisible) but is NOT the active first-tap behavior.
  Do not replace the active single-tap flow with quicknav/progress/frame controls.
- The global menu has two separate concepts: `.trigger.burgerclickablein` /
  `.trigger.burgerclickableout` are the fixed hitboxes, while
  `.menu-prompt.burgerclickablein` is visual copy only. Do not bind menu logic
  to the first `.burgerclickablein` in the DOM.
- `src/ui/Menu.js` owns the canvas burger and legacy curtain animation.
  Hover must never remove the active `.on` class from the fixed hitbox. Open and
  close line targets must stay immutable; do not use the mutable current
  `this.lines` values as close targets.
- Do not reintroduce Locomotive Scroll or the old custom global wheel/keyboard
  hijackers. The stable path is pinned Lenis for vertical smoothness, GSAP-owned
  menu/intro timelines, and bounded work-page horizontal interpolation.
- Run `npm run check:ui-contracts` after any intro/menu work; it exists to
  catch the regressions that previously broke the restored intro and menu.

## Known issues

- The `assets/work/` directory has 10 webp images; all 10 are mounted.
  The 10 images are decorative (`alt=""` + `aria-hidden="true"`); the
  project name and client live in the `h2.p-title` and `h3.p-client`
  elements. Re-evaluate if the design intent changes.
- Stale `bolt-optimize-scroll-loop-*` remote-tracking branches (5 visible
  on `origin/`) are AI-agent collision on the same RAF consolidation.
  Do not merge them; pick a winner or close.
- The 4 self-hosted assets in `assets/sound/` and `assets/sphere/`
  originated from `niccolomiranda/chiara-luzzana` on GitHub. See
  `LICENSE` for the redistribution-rights note.

## Resolved

- **Contact form Mailchimp misroute** (resolved by plan 003): the
  form was posting to `chiaraluzzana.us20.list-manage.com` (a
  Mailchimp account owned by the previous site owner). Replaced
  with a `mailto:yqecea@gmail.com` CTA and updated the stale
  `data-wf-domain` Webflow metadata.

## Do not

- Add a build system, TypeScript, or a JS framework. The site is intentionally
  dependency-free at the bundle level.
- Touch `index.backup.html` (excluded from deploy by `firebase.json:13`,
  kept as a reference for the v2 refactor diff).
- Trust `GEMINI.md` for facts about the current state. It is a historical
  document, last updated 2025-12-31. Use `CLAUDE.md` instead.

## Reference

- Project structure (historical, may be stale): `GEMINI.md`
- The audit and plans that produced this doc: `plans/README.md` and
  `plans/00N-*.md`
- Firebase hosting config: `firebase.json`
