## 2024-05-23 - Double RAF Loop
**Learning:** The codebase runs two separate RequestAnimationFrame loops: `RAFClass` in inline scripts (legacy) and `Loop.js` in modules (modern). This duplicates frame scheduling and increases main thread overhead.
**Action:** Consolidate animations into `Loop.js` wherever possible. Future work should aim to hijack `window.RAF` to transparently redirect legacy subscribers to the central `Loop.js`.
