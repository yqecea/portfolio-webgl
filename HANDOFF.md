# Handoff — Portfolio WebGL UI Fixes (In Progress)

## Last Action
Ran real-browser Playwright QA against `http://127.0.0.1:5555/` after large uncommitted edits. Screenshots inspected directly (not JSON). Found **two real regressions** in the current uncommitted state that MUST be fixed before deploy. **No fixes have been applied yet** — the user requested a handoff before continuing.

Evidence: `/tmp/portfolio-qa/qa-5-work-hover.png`, `qa-6-work-scrolled.png`, `qa-8-about-latest.png`, `qa-9-contact.png`, `qa-10-menu-open.png`, `qa-report.json`. Verification script: `/tmp/portfolio-qa/verify.cjs`.

## Next Action (concrete, single)

**Fix Block A first** (it is the larger regression):

1. **Work page scroll is dead.** `.nav-trigger` is `position: absolute; top: 0; right: 0; z-index: 999; display: block;` (see `css/style.css:3104`) and acts as a full right-edge overlay that intercepts wheel events before they reach `.sidescrollbox`. The `DesktopHorizontalScrollController.onWheel` guard at `src/work/DesktopHorizontalScrollController.js` does `if (!this.wrapper.contains(event.target)) return;` — the event target is the nav-trigger, not inside the wrapper, so the controller silently ignores every wheel.

   **Pick one of these two fixes:**
   - **Preferred:** Add a CSS rule in the bottom of `css/style.css`:
     ```css
     body[data-page="work"] .nav-trigger,
     body[data-page="about"] .nav-trigger,
     body[data-page="contact"] .nav-trigger {
       pointer-events: none !important;
     }
     ```
   - **Or:** In `src/main.js` where Locomotive is skipped for work/about/contact, also remove or hide the `.nav-trigger` for those pages.
   - **Verify:** re-run `NODE_PATH="$(npm root -g)" node /tmp/portfolio-qa/verify.cjs`. The work scroll step currently reports `scrolledTransform: "matrix(1, 0, 0, 1, 0, 0)"` — after the fix it must report a non-zero translation (≥ -800px after 1500px wheel input). **Mouse must be moved to the center of the scroller** (720,450 for 1440×900) before the wheel, not (2,2).

2. **About page "MY LATEST PROJECTS" heading overlaps the first project row.** `.aw-head` is `clamp(56px, 7.2vw, 132px)` (`css/style.css:10097`) and `.aw-grid` has `margin-left: 9vw` (`css/style.css:4283`). The heading text bleeds into the "oysana landing" / "vent control landing" / "aipay landing" row area. **Fix by stacking instead of floating:** in the about section of `css/style.css`, add:
   ```css
   body[data-page="about"] .a-award .aw-block { float: none !important; display: block; width: 100% !important; margin-top: 2vw !important; margin-bottom: 3vw !important; }
   body[data-page="about"] .a-award .aw-grid  { float: none !important; display: block; width: 100% !important; margin-left: 0 !important; }
   ```
   Then re-inspect `qa-8-about-latest.png` — the heading must sit cleanly above the first row with no overlap.

After both fixes:
```bash
cd "/home/yqecea/coding projects/portfolio_yqecea/portfolio-webgl"
npm run lint:html
npm run check:js
git diff --check
NODE_PATH="$(npm root -g)" node /tmp/portfolio-qa/verify.cjs
# Re-inspect qa-5, qa-6, qa-8, qa-9, qa-10 visually
```

**Only if all five screenshots pass visual inspection:** commit, then `firebase deploy --only hosting`. Otherwise iterate on CSS before committing.

## Why
The user reported 8 visual/UX bugs. We built a first pass of fixes (intro second screen, work card image bottom-reveal, menu speed, about heading, contact spacing) but never ran real-browser verification with skeptical eyes until now. Two of those first-pass fixes are broken: the work page cannot scroll at all, and the about heading is bigger than the layout can contain. Deploying now would ship a broken site. The user explicitly asked to hand off instead of continuing.

## Open Threads (do NOT act on in this handoff)

- Whether to use `pointer-events: none` vs. removing `.nav-trigger` on non-home pages — pick the preferred option in the Next Action block, not both.
- LSP diagnostics are broken (`MCP error -32000: Connection closed` from `lsp_diagnostics` tool). Code-level validation must rely on `npm run lint:html`, `npm run check:js`, `git diff --check`, and visual Playwright QA, not on LSP.
- `npx playwright install --with-deps` failed earlier (sudo password prompt). Chromium binary is already installed; just run scripts with `NODE_PATH="$(npm root -g)"`.
- Playwright script must move the mouse to the center of the scroller before wheel events, or wheel lands on the nav-trigger overlay.
- Earlier Oracle/subagent screenshot claims (rounds 13/14) are **NOT trustworthy**. The `qa-report.json` numbers and the actual PNGs disagree on the work-scroll fact. Always re-inspect the PNGs.
- Contact page: `qa-9-contact.png` shows the email/social column sits next to the hero heading (no dead space below hero — fixed). The "Or just say hello." copy is at y≈580 which is fine; no further change needed.
- Menu open: `qa-10-menu-open.png` shows INTRO/WORK/ABOUT/Contact with roman numerals, all visible, animation fast. No further change needed.
- The two pushed commits before this handoff: `4eddf6f` (CSS cache-bust) and `bff64ae` (work card image bottom). Live site at `https://yqecea-portfolio.web.app/` is on `4eddf6f` and does **not** include any of the uncommitted intro/about/contact changes.

## Do NOT

- **Do not** run `firebase deploy` until the two regressions above are fixed AND re-verified with fresh PNGs.
- **Do not** trust Oracle, Metis, or any subagent screenshot claim without re-running direct Playwright. The user has explicitly burned trust on those.
- **Do not** use `lsp_diagnostics` to validate — it is broken in this environment.
- **Do not** revert `src/main.js` Locomotive-skip for work/about/contact — that part is correct and was needed.
- **Do not** edit `src/work/DesktopHorizontalScrollController.js` `onWheel` to remove the `wrapper.contains` guard — the guard is correct, the nav-trigger overlay is the real culprit.
- **Do not** start a new task or add new features. Fix the two regressions, re-verify, commit, deploy. That is the whole job.
- **Do not** add new dependencies.

## Uncommitted Files (do not commit before verification)

```
M css/style.css
M index.html
M pages/about.html
M pages/work.html
M src/main.js
M src/ui/Menu.js
```

Local server (still running from prior session, may have died — restart if needed):
```bash
python3 -m http.server 5555 --bind 127.0.0.1 --directory "/home/yqecea/coding projects/portfolio_yqecea/portfolio-webgl"
```

## Sanity Check (for the next agent)

- **What to do next?** Fix the `.nav-trigger` overlay on work/about/contact, then stack the about heading above its grid. Two CSS additions.
- **Why?** The work page is currently unscrollable and the about heading overlaps the project list. Both are visible in `qa-6-work-scrolled.png` and `qa-8-about-latest.png`.
- **What not to do?** Do not deploy, do not trust subagent screenshots, do not run LSP, do not touch the scroll controller's `wrapper.contains` guard.
