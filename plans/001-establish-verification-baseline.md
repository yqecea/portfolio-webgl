# Plan 001: Establish a one-command verification baseline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ea71909..HEAD -- package.json .htmlvalidate.json .github/workflows/`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `ea71909`, 2026-06-20

## Why this matters

The portfolio ships with **zero automated verification** — no test framework,
no linter, no HTML validator, no link checker, no CI step that runs anything
between `actions/checkout` and `FirebaseExtended/action-hosting-deploy`. The
only "tests" are the Firebase CI workflows (`.github/workflows/firebase-hosting-merge.yml:12-19`
and `firebase-hosting-pull-request.yml:14-20`), which only checkout and deploy.

Every other plan in this cycle (SRI, CSP, WebGL fallbacks, audio hardening,
form bug fixes) is regression-prone without a baseline that catches broken
HTML, missing scripts, dead internal links, or JS syntax errors before they
ship to `yqecea-portfolio.web.app`. The `improve` skill's playbook
(`improve/skills/improve/references/audit-playbook.md:58`) calls this
"finding #1" explicitly: missing one-command verification is the prerequisite
for every risky change.

This plan adds the minimum: a `package.json` with three devDependencies
(`html-validate`, `linkinator`, `playwright` is NOT added — per the skill
warning, no full test framework), three npm scripts, a `.htmlvalidate.json`
allow-list for the existing inline scripts, and a CI step that runs them
before the Firebase deploy.

## Current state

- `portfolio-webgl/` has **no `package.json`** — the project is "no build
  system, no bundler" per `GEMINI.md:262-271`. Dependencies load via CDN
  `<script>` tags in each HTML page.
- `docs/README.md:1` is empty (placeholder).
- `.github/workflows/firebase-hosting-merge.yml:12-19` runs:
  ```yaml
  steps:
    - uses: actions/checkout@v4
    - uses: FirebaseExtended/action-hosting-deploy@v0
      with: ...
  ```
  No test/lint/typecheck step.
- `.github/workflows/firebase-hosting-pull-request.yml:14-20` has the same
  pattern.
- `firebase.json:5-14` ignores `docs/**`, `index.backup.html`, dotfiles, but
  deploys everything else. Adding a `package.json` (or `package-lock.json`)
  at the root is therefore deployable — so add a `firebaseignore` line OR
  rely on Firebase's default behavior of ignoring `package*.json` (Firebase
  hosting does NOT ignore `package.json` by default; it only ignores dotfiles
  via the `**/.*` glob).

## Commands you will need

| Purpose   | Command                                      | Expected on success |
|-----------|----------------------------------------------|---------------------|
| Install   | `npm install`                                | exit 0, `node_modules/` populated |
| HTML lint | `npm run lint:html`                          | exit 0, "0 errors" in html-validate output |
| JS check  | `npm run check:js`                           | exit 0, no syntax errors |
| Link check| `npm run lint:links -- --skip 'https://(?!yqecea-portfolio\.web\.app\|niccolomiranda|chiaraluzzana|aitu-halogens|inko|overprint|ciridae|kazakhstan-unesco|oysana|requiem|vent|zero-to-infinity|aipay-landing)'` | exit 0, all internal links resolve |
| CI step   | `npm ci && npm run lint:html && npm run check:js && npm run lint:links` | exit 0 |

(Commands are run from the `portfolio-webgl/` directory.)

## Suggested executor toolkit

- The `html-validate` package (https://www.npmjs.com/package/html-validate)
  is forgiving and configurable; use `.htmlvalidate.json` to allow inline
  scripts and the Google Analytics inline snippet.
- The `linkinator` package (https://www.npmjs.com/package/linkinator)
  crawls the site via a local server. The executor should run it against
  `npx serve . -p 5000` in the background, or use the built-in `--server`
  flag.

## Scope

**In scope** (the only files you should create or modify):
- `package.json` (create)
- `package-lock.json` (created by `npm install`)
- `.htmlvalidate.json` (create)
- `.github/workflows/firebase-hosting-merge.yml` (add a `verify` job before `build_and_deploy`)
- `.github/workflows/firebase-hosting-pull-request.yml` (same)
- `firebase.json` (add `package*.json` and `node_modules/**` to `ignore`)

**Out of scope** (do NOT touch):
- `index.html`, `pages/*.html`, `css/style.css`, `src/**`, `javascript/**` —
  this plan adds verification, it does not fix any source.
- The legacy inline scripts in HTML — `html-validate` will flag them; the
  allow-list in `.htmlvalidate.json` silences them. Removing the duplicates
  is plan 003.
- Any change to the public response shape or visual behavior.

## Git workflow

- Branch: `advisor/001-verification-baseline`
- Commit per logical step (package.json, CI workflow, firebase.json).
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add `package.json` with three devDependencies and three scripts

Create `portfolio-webgl/package.json`:

```json
{
  "name": "portfolio-webgl",
  "version": "1.0.0",
  "private": true,
  "description": "Static WebGL portfolio. Verification baseline only — no build step.",
  "scripts": {
    "lint:html": "html-validate \"index.html\" \"pages/**/*.html\"",
    "check:js": "node --check src/main.js && find src javascript -name '*.js' -exec node --check {} \\;",
    "lint:links": "linkinator https://yqecea-portfolio.web.app --skip '^(https?://(?!yqecea-portfolio\\.web\\.app|niccolomiranda|chiaraluzzana|aitu-halogens|inko|overprint|ciridae|kazakhstan-unesco|oysana|requiem|vent|zero-to-infinity|aipay-landing))'"
  },
  "devDependencies": {
    "html-validate": "^8.0.0",
    "linkinator": "^6.0.0"
  }
}
```

**Verify**: `cd portfolio-webgl && npm install` → exit 0, `node_modules/` contains
`html-validate` and `linkinator`. `cat package-lock.json | head -5` shows lockfile metadata.

### Step 2: Add `.htmlvalidate.json` allow-list

Create `portfolio-webgl/.htmlvalidate.json`:

```json
{
  "extends": ["html-validate:recommended"],
  "rules": {
    "no-inline-style": "off",
    "no-trailing-whitespace": "off",
    "wcag/h30": "off",
    "wcag/h32": "off",
    "wcag/h36": "off",
    "wcag/h37": "off",
    "wcag/h63": "off",
    "wcag/h67": "off",
    "no-implicit-button-type": "off",
    "no-redundant-role": "off"
  }
}
```

The Webflow-generated HTML is incompatible with strict WCAG rules; the goal
is a baseline that catches REAL errors (unclosed tags, invalid attributes,
broken script references) without drowning in Webflow-style false positives.

**Verify**: `npm run lint:html` → exit 0, output shows "0 errors" or only
warnings. If 100+ errors appear, the rules above are too strict — back off
further by adding specific rule IDs to the `off` list.

### Step 3: Update CI to run verification before deploy

Edit `.github/workflows/firebase-hosting-merge.yml`. Insert a verify step
before the existing `FirebaseExtended/action-hosting-deploy@v0` step:

```yaml
jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install
        run: npm ci
      - name: Verify
        run: |
          npm run lint:html
          npm run check:js
          # linkinator needs a live server; skip in CI, run manually
          # npm run lint:links
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_GEN_LANG_CLIENT_0698883101 }}
          channelId: live
          projectId: gen-lang-client-0698883101
```

Apply the same change to `.github/workflows/firebase-hosting-pull-request.yml`.

`linkinator` is excluded from CI because it needs a live server (the
deployment target). Document this in the `verify` step comment. A future
plan can wire `linkinator` against the Firebase preview channel via the
PR workflow's preview URL.

**Verify**: read the modified YAML files; they parse as valid YAML. The
`actions/setup-node@v4` step is referenced.

### Step 4: Add `package*.json` and `node_modules/**` to `firebase.json` ignore

Edit `firebase.json` — add two lines to the `ignore` array:

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
  "package-lock.json"
]
```

This prevents the new `package.json` and `node_modules/` (if any agent
accidentally runs `npm install` in the deploy root) from being uploaded
to Firebase hosting.

**Verify**: `cat firebase.json` shows the two new entries at the end of the
`ignore` array, JSON is valid.

## Test plan

No new automated tests are required by this plan (it IS the baseline).
Verify by running the commands locally:

- `cd portfolio-webgl && npm ci && npm run lint:html && npm run check:js` → exit 0
- Manually start `npx serve .` and click through every link in the home and
  work pages; no 404s.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd portfolio-webgl && npm install` exits 0
- [ ] `npm run lint:html` exits 0
- [ ] `npm run check:js` exits 0
- [ ] `package.json`, `package-lock.json`, `.htmlvalidate.json` exist
- [ ] `firebase.json` lists `package.json` and `package-lock.json` in `ignore`
- [ ] `.github/workflows/firebase-hosting-merge.yml` and `firebase-hosting-pull-request.yml` have a `verify` job that runs the three scripts before deploy
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `npm run lint:html` reports errors in a file OTHER than the Webflow-exported
  HTML and the inline script blocks. Webflow artifacts are expected; first-party
  code is not.
- `html-validate` cannot be installed (network restriction, Node version).
- Any verification step fails twice after a reasonable fix attempt.

## Maintenance notes

- The `html-validate` rule list is intentionally permissive. When the
  Webflow-exported HTML is replaced (later refactor), tighten the rules.
- `linkinator` against the live deploy is a manual step. A future plan
  can wire it against the Firebase PR preview URL.
- When new first-party modules are added (e.g. ES modules under `src/`),
  the `check:js` glob needs no change (it already picks up `src/` and
  `javascript/`).
- The CI `node-version` is `20`. Bump to match the Firebase action's
  supported Node version when upgrading.
