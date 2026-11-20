# Portfolio WebGL

- Run `npm run verify` for source changes. The intro and menu acceptance checks
  live in `scripts/check-ui-contracts.mjs`.
- Keep the single-tap intro: dismiss the intro, start sound, and show the Explore
  CTA. The menu link action belongs to `src/ui/Menu.js`. The menu prompt is
  visual copy.
- Preserve native scrolling. The work page retains bounded horizontal scroll.
  Leave `index.backup.html` as a historical snapshot.
