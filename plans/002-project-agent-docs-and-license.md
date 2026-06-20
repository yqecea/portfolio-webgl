# Plan 002: Add project agent docs, LICENSE, and CHANGELOG

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ea71909..HEAD -- CLAUDE.md AGENTS.md LICENSE CHANGELOG.md docs/README.md`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `ea71909`, 2026-06-20

## Why this matters

The portfolio has **no project-level documentation that survives a fresh
agent session**:

- `docs/README.md:1` is empty (placeholder).
- `GEMINI.md:1-280` is a 9KB de-facto reference doc, but `firebase.json:5-13`
  explicitly excludes it from deploy AND it is not in the standard
  `CLAUDE.md` / `AGENTS.md` location that fresh agents look for.
- No `LICENSE` file at the portfolio root (the parent `portfolio_yqecea/LICENSE.md`
  is the `@improve` plugin's MIT, not the portfolio's).
- No `CHANGELOG.md` for the public site.

`GEMINI.md` is also **stale**:
- It claims the home page has no `.webglholder` (`GEMINI.md:97`) — but
  `index.html:597` has `<div ... class="webglholder"></div>`.
- It claims `pages/work.html` has 7 work cards (`GEMINI.md:106-111`) — but
  a `grep -c 'p-col' pages/work.html` returns 10 (lines 283, 310, 337, 365,
  393, 420, 447, 475, 504, 533).
- It claims the `pages/credits.html` page exists (`GEMINI.md:129-133`) — but
  the directory only has `about.html`, `contact.html`, `cookie.html`,
  `work.html`. Credits is referenced only in `index.backup.html` (which is
  ignored by `firebase.json:13`).

Every future agent that opens this repo will start from wrong context unless
this is fixed. The `improve` skill's audit-playbook explicitly flags missing
`CLAUDE.md` / `AGENTS.md` as a DX finding.

## Current state

- `docs/README.md` is a 1-line placeholder (empty content).
- `GEMINI.md` is 280 lines, last updated 2025-12-31 per line 280.
- `index.html:597` has `<div style="filter: invert(0%)" class="webglholder"></div>`
  — WebGL is on the home page, contradicting `GEMINI.md:97`.
- `pages/work.html` ships 10 `class="p-col pagelink w-inline-block">` cards
  (verified by `grep -c 'p-col' pages/work.html` → 10).
- `firebase.json:5-13` ignores `docs/**` and `GEMINI.md` from deploy, so
  they remain local-only references.
- The parent directory has a `LICENSE.md` (the `@improve` plugin's MIT
  license, author shadcn); the portfolio does not have its own.

## Commands you will need

| Purpose   | Command                                              | Expected on success |
|-----------|------------------------------------------------------|---------------------|
| List root | `ls portfolio-webgl/CLAUDE.md portfolio-webgl/LICENSE portfolio-webgl/CHANGELOG.md` | all three exist |
| Confirm   | `cat portfolio-webgl/CLAUDE.md \| head -3`           | shows the `# Portfolio` heading |
| Diff      | `git diff --stat ea71909..HEAD -- CLAUDE.md AGENTS.md LICENSE CHANGELOG.md docs/README.md` | only the listed files |

(Commands are run from the repo root.)

## Scope

**In scope** (the only files you should create, modify, or delete):
- `CLAUDE.md` (create at `portfolio-webgl/` root)
- `LICENSE` (create at `portfolio-webgl/` root)
- `CHANGELOG.md` (create at `portfolio-webgl/` root)
- `docs/README.md` (delete — empty placeholder, replaced by `CLAUDE.md`)
- `firebase.json` (add `CLAUDE.md`, `LICENSE`, `CHANGELOG.md` to `ignore` —
  these are project docs, not deployed artifacts)

**Out of scope** (do NOT touch):
- `GEMINI.md` — leave it as historical context; future agents will read
  `CLAUDE.md` first. Removing GEMINI is a separate, longer plan (it
  encodes a 4-month refactor history).
- `index.html`, `pages/*.html`, `src/**`, `css/**`, `javascript/**` — this
  plan adds docs, it does not change code.
- The Firebase-deployed files.

## Git workflow

- Branch: `advisor/002-project-docs`
- Commit per logical step (CLAUDE.md, LICENSE, CHANGELOG.md, ignore additions,
  docs/README.md deletion).
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Create `portfolio-webgl/CLAUDE.md`

Create `portfolio-webgl/CLAUDE.md` with the following sections, in this order.
Keep the file under 200 lines — terse, declarative, no narrative.

```markdown
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
- GSAP 3.2.6 + EaselPlugin (CDN) for animation
- Locomotive Scroll 4.0.3 (CDN) for smooth scroll on home + work
- jQuery 3.5.1 (CDN, has SRI hash) for the Webflow runtime
- Webflow runtime (CDN) for legacy form + IX2 animations

## Pages

| Path                  | Purpose             | WebGL? | Locomotive? |
|-----------------------|---------------------|--------|-------------|
| `index.html`          | Home / hero         | Yes (`index.html:597` `.webglholder`) | Yes (home) |
| `pages/work.html`     | 10 project cards (horizontal scroll on desktop) | No | Yes (work) |
| `pages/about.html`    | About               | No  | No (custom SmoothVerticalScroll) |
| `pages/contact.html`  | Contact form        | No  | No (custom SmoothVerticalScroll) |
| `pages/cookie.html`   | Cookie notice       | No  | No |

The work page ships **10 cards** (not 7 — `GEMINI.md` is stale on this).
Verified at `pages/work.html:283, 310, 337, 365, 393, 420, 447, 475, 504, 533`.

## Verification

```bash
cd portfolio-webgl
npm ci
npm run lint:html   # html-validate on index.html + pages/*.html
npm run check:js    # node --check on every .js under src/ and javascript/
npm run lint:links  # linkinator against the live deploy
```

(Setup is in `plan 001`.)

## Known issues

- The contact form (`pages/contact.html:499`) still posts to a Mailchimp
  endpoint owned by the previous site owner (`chiaraluzzana.us20`). Plan
  003 fixes this.
- The `assets/work/` directory has 10 webp images; all 10 are mounted.
- 5 stale `bolt-optimize-scroll-loop-*` branches on `origin/`
  (plus ~15 more in the broader `bolt*` / `bolt/*` family) are
  AI-agent collision on the same RAF consolidation. Do not merge them;
  pick a winner or close.
- The `javascript/` directory holds legacy `cursor/` and `webglball/`
  implementations. The active code in `src/ui/CursorCanvas.js` and
  `src/webgl/WebGLApp.js` supersedes them. Plan 003 (deferred) removes them.

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
```

**Verify**: `wc -l CLAUDE.md` reports ≤ 220 lines. `head -1 CLAUDE.md` shows
`# Portfolio`. `grep -c 'webglholder' CLAUDE.md` ≥ 1 (the doc mentions the
home WebGL is present).

### Step 2: Create `portfolio-webgl/LICENSE`

Create `portfolio-webgl/LICENSE` with the standard All Rights Reserved
placeholder. If the operator has a specific license preference, ask
before this step.

```
All Rights Reserved.

Copyright (c) 2026 Yusuf (yqecea)

This work is the personal portfolio of the author. No part of this
repository may be copied, modified, distributed, or used for any
purpose, commercial or non-commercial, without the prior written
permission of the author.

The Webflow-exported portions of css/style.css remain the property of
their respective rightsholders. The CDN dependencies used by this site
(GSAP, Locomotive Scroll, Three.js, jQuery) retain their own licenses;
see their respective project pages for terms.

Contact: yqecea@gmail.com
```

**Verify**: `cat LICENSE | head -3` shows the copyright line. `wc -l LICENSE`
is between 10 and 30 lines.

### Step 3: Create `portfolio-webgl/CHANGELOG.md`

Create `portfolio-webgl/CHANGELOG.md` with the following content (history
inferred from `git log`):

```markdown
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
```

**Verify**: `head -3 CHANGELOG.md` shows the `# Changelog` heading.
`grep -c '^## ' CHANGELOG.md` reports 2 or more version sections.

### Step 4: Delete `docs/README.md` and update `firebase.json` ignore

Delete `docs/README.md` (empty placeholder, no content to preserve).

Edit `firebase.json` to add `CLAUDE.md`, `LICENSE`, and `CHANGELOG.md` to
the `ignore` list. The final array should be:

```json
"ignore": [
  "firebase.json",
  ".firebaserc",
  ".gitignore",
  "GEMINI.md",
  "**/.*",
  "**/node_modules/**",
  "docs/**",
  "index.backup.html",
  "package.json",
  "package-lock.json",
  "CLAUDE.md",
  "LICENSE",
  "CHANGELOG.md"
]
```

(The `package.json` and `package-lock.json` lines are added by plan 001;
this plan only adds the last three.)

**Verify**: `ls docs/` shows no `README.md`. `cat firebase.json` is valid
JSON and the `ignore` array contains `CLAUDE.md`, `LICENSE`, `CHANGELOG.md`.

## Test plan

No new automated tests are required by this plan. Verify by inspection:

- Open `CLAUDE.md` and confirm the "Pages" table matches the actual page
  inventory.
- Run `grep -c 'p-col' pages/work.html` and confirm `CLAUDE.md`'s "10 cards"
  claim is correct.
- Confirm `GEMINI.md` is still present (this plan does not delete it).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `portfolio-webgl/CLAUDE.md` exists and is ≤ 220 lines
- [ ] `portfolio-webgl/LICENSE` exists and contains "All Rights Reserved"
- [ ] `portfolio-webgl/CHANGELOG.md` exists and contains at least 2 `##` sections
- [ ] `docs/README.md` is deleted
- [ ] `firebase.json` lists `CLAUDE.md`, `LICENSE`, `CHANGELOG.md` in `ignore`
- [ ] `firebase.json` is valid JSON (`python3 -c 'import json; json.load(open("firebase.json"))'`)
- [ ] `git status` shows only the files in scope as modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The operator does not want an "All Rights Reserved" LICENSE placeholder;
  ask before writing plan 003+.
- The Pages table in `CLAUDE.md` does not match the actual page inventory
  (e.g. a new page was added since `ea71909`).

## Maintenance notes

- `CLAUDE.md` is the source of truth for the project state. When a refactor
  lands, update `CLAUDE.md` in the same PR.
- `GEMINI.md` should be kept as long as the v2 refactor history is
  load-bearing. When the refactor is fully complete (legacy inline scripts
  removed), archive or delete `GEMINI.md`.
- `CHANGELOG.md` should be appended on each public release, not rewritten.
- If the operator later picks a permissive license, replace the LICENSE
  body and update the year.
