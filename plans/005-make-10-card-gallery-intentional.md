# Plan 005: Make the shipped 10-card work gallery intentional

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ea71909..HEAD -- pages/work.html assets/work/ CLAUDE.md`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `ea71909`, 2026-06-20

## Why this matters

The work page ships **10 project cards** — verified by
`grep -c 'p-col' pages/work.html` returning 10, with anchors at lines
283, 310, 337, 365, 393, 420, 447, 475, 504, 533. The 10 corresponding
images exist at `assets/work/{zero-to-infinity, inko, overprint,
kazakhstan-unesco, requiem, aitu-halogens, ciridae, oysana-landing,
aipay-landing, vent-oysana}.webp`.

But the operator's reference doc (`GEMINI.md:106-111`) still says 7.
And the cards are inconsistent:

- Some have `data-fallback-shot="true"` (`pages/work.html:422`,
  aitu-halogens).
- Some link to deployed subdomains (`https://inko.web.app/`,
  `https://aitu-halogens.vercel.app/`, `https://ciridae-clone.vercel.app/`,
  `https://overprint.web.app/`) — most don't.
- Project copy, role descriptions, and tech tags are missing or
  inconsistent across cards.

A first-time visitor sees 10 thumbnails; a returning visitor or a
recruiter sees 10 thumbnails with mostly empty context. The
"portfolio-as-product" value is leaving leverage on the table.

This plan standardizes the 10 cards: clear titles, one-line roles,
consistent external-link treatment, and an updated reference doc so
the count of 10 is the documented truth.

## Current state

- `pages/work.html` has 10 cards. The full per-card line layout:
  - Line 283: card 1, image `zero-to-infinity.webp`
  - Line 310: card 2, image `inko.webp`, link `https://inko.web.app/`
  - Line 337: card 3, image `overprint.webp`, link `https://overprint.web.app/`
  - Line 365: card 4, image `kazakhstan-unesco.webp`
  - Line 393: card 5, image `requiem.webp`
  - Line 420: card 6, image `aitu-halogens.webp`, link `https://aitu-halogens.vercel.app/`, `data-fallback-shot="true"`
  - Line 447: card 7, image `ciridae.webp`, link `https://ciridae-clone.vercel.app/`
  - Line 475: card 8, image `oysana-landing.webp`
  - Line 504: card 9, image `aipay-landing.webp`
  - Line 533: card 10, image `vent-oysana.webp`
- The `data-fallback-shot="true"` attribute on card 6 is a CSS hook
  that, combined with `pages/work.html:55-58` Locomotive scroll init,
  appears to be a non-blocking fallback for when the side-scroll viewport
  is too narrow on mobile. Verify with `grep -n 'data-fallback-shot' css/style.css` —
  if the CSS does not reference it, the attribute is a leftover.
- `GEMINI.md:106-111` documents only 7 cards and is stale.

## Commands you will need

| Purpose   | Command                                              | Expected on success |
|-----------|------------------------------------------------------|---------------------|
| Count     | `grep -c 'p-col' pages/work.html`                    | 10 |
| Asset list| `ls assets/work/`                                    | 10 webp files |
| Link list | `grep -nE 'href="https?://[^"]*"' pages/work.html`   | the existing links are present, no new broken ones added |
| HTML lint | `npm run lint:html` (from plan 001)                  | exit 0, no new errors |

## Scope

**In scope** (the only files you should modify):
- `pages/work.html`
- `CLAUDE.md` (the doc created in plan 002 — update the "10 cards" claim
  to enumerate them)
- `css/style.css` (only if the executor decides to remove the
  `data-fallback-shot` attribute; see step 3)

**Out of scope** (do NOT touch):
- The `assets/work/*.webp` images themselves (no cropping, no
  re-optimization; they were committed Jun 19 and are already
  WebP).
- The `src/work/DesktopHorizontalScrollController.js` and
  `ElasticLines.js` (work-page logic, not content).
- `GEMINI.md` (historical doc, not the source of truth).
- The card layout / visual design (the Webflow-exported markup stays).
  This plan adds **content and attributes**, not layout.

## Git workflow

- Branch: `advisor/005-10-card-gallery`
- Commit per logical step (project copy, link consistency,
  attribute cleanup, CLAUDE.md update).
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add a one-line project title and a one-line role to each card

For each of the 10 cards in `pages/work.html`, add a `<span class="p-title">`
and a `<span class="p-role">` inside the `<a class="p-col ...">...</a>`
anchor. The current card structure is:

```html
<a rel="noopener noreferrer" href="..." target="_blank" class="p-col pagelink w-inline-block">
  <figure class="p-shot">
    <img src="../assets/work/<slug>.webp" alt="" loading="lazy" decoding="async">
  </figure>
</a>
```

The new structure (for cards 2, 3, 6, 7 which already have an `href`):

```html
<a rel="noopener noreferrer" href="..." target="_blank" class="p-col pagelink w-inline-block">
  <figure class="p-shot">
    <img src="../assets/work/<slug>.webp" alt="<project title>" loading="lazy" decoding="async">
  </figure>
  <span class="p-title"><Project Title></span>
  <span class="p-role"><one-line role></span>
</a>
```

For cards 1, 4, 5, 8, 9, 10 (no current `href`), keep the anchor as a
non-link card. The `class="p-col pagelink w-inline-block"` is left in
place for layout consistency; the `href` stays absent. The `<span
class="p-title">` and `<span class="p-role">` are still added.

The titles and roles below are placeholders derived from the image
filenames. The operator should review and adjust; if the operator
prefers different copy, edit the placeholders in this step.

| # | Slug                  | Suggested title         | Suggested role (one line)                       |
|---|-----------------------|-------------------------|--------------------------------------------------|
| 1 | zero-to-infinity      | Zero to Infinity        | Generative art / WebGL experiments               |
| 2 | inko                  | Inko                    | Brand site for a design studio                   |
| 3 | overprint             | Overprint               | Print-on-demand storefront                        |
| 4 | kazakhstan-unesco     | Kazakhstan UNESCO        | Editorial microsite for a heritage nomination    |
| 5 | requiem               | Requiem                 | Interactive longform essay                       |
| 6 | aitu-halogens         | AITU Halogens           | Product launch site for a hardware line          |
| 7 | ciridae               | Ciridae                 | Marketing site for an AI startup                 |
| 8 | oysana-landing        | Oysana Landing          | Landing page for a fashion brand                 |
| 9 | aipay-landing         | AIPay Landing           | Landing page for a fintech app                   |
| 10| vent-oysana           | Vent × Oysana           | Collaboration microsite                          |

**Verify**: `grep -c 'p-title' pages/work.html` reports 10. `grep -c 'p-role' pages/work.html` reports 10.

### Step 2: Add the small CSS for `.p-title` and `.p-role`

Append to `css/style.css` (find a logical end-of-section; if unsure,
add to the very end of the file):

```css
.p-col .p-title {
  display: block;
  margin-top: 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111;
  text-decoration: none;
}
.p-col .p-role {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.8rem;
  font-weight: 400;
  color: #555;
  text-decoration: none;
}
.p-col:hover .p-title,
.p-col:hover .p-role {
  color: #000;
}
```

The styling is intentionally minimal — the Webflow export sets most of
the card typography. The new rules only establish contrast and spacing
for the added spans.

**Verify**: `grep -nE '\.p-title|\.p-role' css/style.css` reports 3+ matches.

### Step 3: Resolve the `data-fallback-shot="true"` attribute

Run `grep -nE 'data-fallback-shot' css/style.css` to determine if the
attribute is referenced. Two outcomes:

- **Outcome A — referenced in CSS.** Leave the attribute in place.
  Add a `<!-- data-fallback-shot is consumed by css/style.css -->` comment
  above card 6 (line 422) to document its purpose. Skip step 3.
- **Outcome B — not referenced in CSS.** Remove the attribute from line
  422. Document the removal in a short commit message: "remove unused
  data-fallback-shot attribute on aitu-halogens card."

**Verify**: `grep -nE 'data-fallback-shot' pages/work.html` reports
either 1 (kept) or 0 (removed). `grep -nE 'data-fallback-shot' css/style.css`
matches the decision.

### Step 4: Update `CLAUDE.md` to enumerate the 10 cards

In `CLAUDE.md` (created by plan 002), find the sentence:

```
The work page ships **10 cards** (not 7 — `GEMINI.md` is stale on this).
Verified at `pages/work.html:283, 310, 337, 365, 393, 420, 447, 475, 504, 533`.
```

Replace it with a table:

```markdown
The work page ships **10 cards**. Verified at `pages/work.html:283, 310,
337, 365, 393, 420, 447, 475, 504, 533`.

| # | Slug                | Title            | External link                          |
|---|---------------------|------------------|----------------------------------------|
| 1 | zero-to-infinity    | Zero to Infinity | —                                      |
| 2 | inko                | Inko             | https://inko.web.app/                  |
| 3 | overprint           | Overprint        | https://overprint.web.app/             |
| 4 | kazakhstan-unesco   | Kazakhstan UNESCO| —                                      |
| 5 | requiem             | Requiem          | —                                      |
| 6 | aitu-halogens       | AITU Halogens    | https://aitu-halogens.vercel.app/      |
| 7 | ciridae             | Ciridae          | https://ciridae-clone.vercel.app/      |
| 8 | oysana-landing      | Oysana Landing   | —                                      |
| 9 | aipay-landing       | AIPay Landing    | —                                      |
| 10| vent-oysana         | Vent × Oysana    | —                                      |
```

(Use the actual titles and links from step 1.)

**Verify**: `grep -c '| [0-9]|' CLAUDE.md` reports at least 10. The table
header and divider are present.

## Test plan

This is a content/UI plan — verify by:

1. Open `pages/work.html` in a browser. The 10 cards should each show
   a title and a one-line role beneath the thumbnail. Layout should
   not shift significantly (the new spans are small).
2. On a card that has an external link (cards 2, 3, 6, 7), click
   the title or role — it should navigate to the same `href` as the
   card anchor.
3. On a card without a link (cards 1, 4, 5, 8, 9, 10), the title and
   role should be plain text (no underline, no cursor change on hover).
4. `npm run lint:html` exits 0 (from plan 001).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -c 'p-col' pages/work.html` reports 10
- [ ] `grep -c 'p-title' pages/work.html` reports 10
- [ ] `grep -c 'p-role' pages/work.html` reports 10
- [ ] `grep -nE 'p-title|p-role' css/style.css` reports 3+ matches
- [ ] `data-fallback-shot` decision documented (either kept with comment
      or removed, with `grep` matching the decision)
- [ ] `CLAUDE.md` enumerates all 10 cards in a table
- [ ] `npm run lint:html` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The operator wants different titles or roles than the placeholders
  above. Do not invent copy; ask.
- The card layout breaks (e.g. the new spans push the thumbnail off-grid
  on mobile). The CSS in step 2 is conservative; if a regression appears,
  tighten the margin and font-size.
- The `data-fallback-shot` attribute is referenced by JavaScript (not
  just CSS). Check `grep -rE 'data-fallback-shot' src/ javascript/`
  before deciding to remove.

## Maintenance notes

- The 10-card table in `CLAUDE.md` is the source of truth for the work
  inventory. When a card is added, removed, or relinked, update the
  table in the same PR.
- The titles and roles in step 1 are placeholders. The operator
  should review and adjust them in a follow-up. A future plan can
  add per-card detail pages (a "case study" sub-page per project).
- Card-level accessibility (alt text) is added in step 1. If the
  operator wants richer alt text, edit the `<img alt="...">` attributes
  in step 1 directly.
- The "External link" column in the `CLAUDE.md` table is empty for
  cards 1, 4, 5, 8, 9, 10 because they are not currently linked. A
  follow-up plan can decide whether to host detail pages for those
  projects or leave them as portfolio-only thumbnails.
