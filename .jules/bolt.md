## 2024-05-23 - Duplicate Animation Loops
**Learning:** The codebase contained two concurrent `requestAnimationFrame` loops: one from legacy inline scripts (`RAFClass`) and one from the modern module system (`src/core/Loop.js`). This wasted resources and CPU.
**Action:** Implemented a hijack mechanism in `Loop.js` to detect `window.RAF`, migrate its callbacks to the singleton `Loop`, and kill the legacy loop. Also fixed a dormant bug in the legacy `unsubscribe` method by redirecting it to the correct implementation.
