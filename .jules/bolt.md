## 2024-05-22 - Fragmented Animation Loops
**Learning:** The codebase utilizes multiple disconnected animation loops: a centralized `src/core/Loop.js`, an ad-hoc recursive `requestAnimationFrame` in `src/main.js`, and separate event-driven loops in `MobileAnimations.js`. This fragmentation makes global performance tuning (like frame clamping or pausing when hidden) difficult.
**Action:** Centralize all continuous animations to subscribe to `src/core/Loop.js` where possible to unify timing and resource management.
