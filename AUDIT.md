# jQuery + Webflow Runtime Usage Audit (T3)

Date: 2026-06-24
Repo: /home/yqecea/coding projects/portfolio_yqecea/portfolio-webgl

## Conclusion

**jQuery and the Webflow runtime are dead weight on every active page.** The
contact form was replaced with a `mailto:` CTA (resolved in plan 003 per
CLAUDE.md). No active page uses jQuery, no active page uses the Webflow
runtime, and no active page uses Webflow's `IX2` animation system
(IX2 targets live on `data-w-id` elements but the runtime script is
incapable of re-triggering them on a static page reload — the
`style="transform: translate3d(0, 100%, 0)"` initial states are baked
into the static HTML and stuck).

## Search results

```
grep -E "jQuery|jquery|webflow|WebFlow|IX2|w-form|\$\(" *.html pages/*.html
```

| File                           | jQuery | Webflow | w-form | Verdict |
|--------------------------------|--------|---------|--------|---------|
| `index.html`                   | 1 (script tag) | 1 (script tag) | 0 | **DROP** |
| `pages/work.html`              | 1 (script tag) | 1 (script tag) | 0 | **DROP** |
| `pages/contact.html`           | 1 (script tag) | 1 (script tag) | 3 (f-block w-form, w-form-done, w-form-fail — but form was replaced with mailto) | **DROP** |
| `pages/about.html`             | 1 (script tag) | 1 (script tag) | 0 | **DROP** |
| `pages/cookie.html`            | 1 (script tag) | 1 (script tag) | 0 | **DROP** |
| `index.backup.html`            | 1 (script tag) | 1 (script tag) | 0 | **KEEP (excluded from deploy by firebase.json:13)** |

```
grep -E "jQuery|webflow|IX2|\\\$\(" src/*.js src/**/*.js
```

- src/: 0 matches across all ES modules.

## What's actually used

- **pages/contact.html:493-504**: the `.f-block.w-form` wrapper still
  exists with a `.contact-cta` containing a `<a href="mailto:...">Email me directly</a>`.
  The `.w-form-done` and `.w-form-fail` blocks are dead — no `<form>` element
  wraps them, no submission handler is wired. The webflow runtime would
  have to do nothing.
- **pages/contact.html:528** (cookie notice in index.html): the cookie
  banner has a `<a class="confirm">` that uses `e.preventDefault()` from
  inline JS — this could be done without jQuery.

## Why we drop both

- jQuery 3.5.1 = ~30KB gzipped parse cost, ~3rd-party CDN domain (`d3e54v103j8qbb.cloudfront.net`).
- webflow.fcbda2e35.js = ~80KB gzipped, ~4th CDN domain (`uploads-ssl.webflow.com`).
- Both load synchronously in `<head>` or end of `<body>` and block
  critical resource discovery.
- Neither library is used by anything in `src/` or by any active inline
  script in the active pages.

## Plan T9 actions

1. Remove `<script src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=...">`
   from each of the 5 active pages.
2. Remove `<script src="https://uploads-ssl.webflow.com/5ea69b4027484b2df2b45806/js/webflow.fcbda2e35.js">`
   from each of the 5 active pages.
3. Leave `index.backup.html` untouched (already excluded from deploy).
4. Run `npm run lint:html` and Playwright network-log check to confirm.
