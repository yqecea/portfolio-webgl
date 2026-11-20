# Yusuf portfolio

The site serves static HTML and ES modules. Firebase Hosting serves `dist/`. Run `npm run build` to copy the runtime files there from an explicit list. Use Node 24.12 or newer for local checks.

1. Run `npm ci`.
2. Run `npx playwright install chromium` once, or set `CHROME_PATH` to an installed Chrome executable.
3. Run `npm run dev` and open the loopback URL it prints. Restart the server to rebuild after editing.
4. Run `npm run verify` to check source syntax, HTML, CDN integrity attributes, local links, headers, accessibility, and browser interactions. Screenshots and the report land in `artifacts/browser/`.

Set `PORTFOLIO_EVIDENCE` to retain screenshots elsewhere. The browser check uses one Chrome process. Use `npm run lint:links` for the current HTTP status of external destinations. A platform may block automated requests.

## Where to make changes

- `index.html` contains the accessible intro and featured projects. Keep its entry a native button. Navigation and project links work independently of WebGL.
- `src/ui/Menu.js` owns menu state and keyboard focus. `src/ui/HomeIntroMotion.js` owns the intro.
- `src/webgl/WebGLApp.js` starts after entry. It keeps a static sphere available until the scene renders and during a GPU failure. Reduced motion and data saving skip WebGL at entry.
- `pages/work.html` is the project catalogue. Keep mobile and coarse-pointer layouts vertically scrollable. The horizontal controller is for wide, fine-pointer screens.
- Put portfolio style changes in `css/portfolio.css`. `check.sh` lists dated exceptions for the historical CSS and generated Three.js bundle.
- Use root-relative links across subpages. Firebase serves each subpage at its file URL and a short alias.
- `LICENSE` records third-party provenance. Older browser spikes and reports are historical.

Firebase production updates on a push or merge to `master`. Keep work on a separate branch and leave production deployment to the owner.
