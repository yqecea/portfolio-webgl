## 2025-01-27 - Fragmented Animation Loops
**Learning:** The codebase has fragmented animation loops: `src/core/Loop.js` (centralized), legacy `RAFClass` (inline HTML), and independent loops like `src/core/MobileAnimations.js`. This causes scheduler overhead and lack of synchronization.
**Action:** Always check for existing loops (`Loop.js`) before adding `requestAnimationFrame`. Prioritize unifying these into the central loop when refactoring.
