# Changelog

All notable changes to this portfolio. Dates use the commit date (UTC).

## 2026-02-12 — v2 refactor merged to master

- CI: Firebase auto-deploy on push to master (commit `ea71909`).
- Replaced the 7-project work page with a 10-project gallery
  (commits `6265a5b` and `5f0c247`).
- Refactor: unified runtime bootstrap (commit `9f1a6a0`). The
  `src/main.js` ES module entry now drives menu, sound, cursor,
  page-transition, scroll, mobile animations, and WebGL init. Inline
  scripts remain in the HTML for backward compatibility with the
  Webflow-exported styles and runtime.
- Removed the live `pages/credits.html` (now in `index.backup.html`
  only, which is ignored by Firebase deploy per `firebase.json:13`).
- Added: project agent docs (`CLAUDE.md`), LICENSE, and this CHANGELOG
  (see `plans/002-project-docs.md`).

## 2025-02-12 — v2 refactor branch merged (commit `282c1c4`)

- ES Modules migration: `src/main.js` + 7 modules under `src/`.
- Centralized animation loop in `src/core/Loop.js` (replacing inline
  `RAFClass` in each HTML page; the inline version is still present).
- Mobile fix: dedicated `src/core/MobileFix.js` and
  `src/core/MobileAnimations.js` for the horizontal-scroll work page
  and the IntersectionObserver-based entry animations.
- Renamed the `index` nav entry to `intro` in the burger menu.
- Fixed: burger button hit-box alignment on high-DPI screens.

## Earlier — see `git log`

The 2019-2024 history is in `git log`; only the user-facing refactors
that are still relevant to the running site are summarized above.
