## 2024-05-23 - Multiple Animation Loops Discovered
**Learning:** The codebase contains multiple independent animation loop systems:
1. `src/core/Loop.js`: The modern, centralized module-based loop (used by WebGLApp and now Desktop Scroll).
2. `RAFClass` (inline in HTML): A legacy loop system used by inline scripts for cursor and burger menu animations.
3. Ad-hoc `requestAnimationFrame` loops: Found in `src/main.js` (fixed) and `src/core/MobileFix.js`.

This fragmentation leads to multiple `requestAnimationFrame` calls per frame, increasing overhead and potential for desynchronization.

**Action:** Future optimizations should aim to consolidate all animations into the centralized `Loop.js`. Legacy inline scripts should be migrated to modules if possible, or at least share the `GlobalLoop` instance if exposed.
