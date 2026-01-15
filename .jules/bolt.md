## 2026-01-15 - Consolidating Animation Loops
**Learning:** Merging multiple independent `requestAnimationFrame` loops into a single centralized loop (`Loop.js`) reduces browser overhead but requires careful handling of initialization.
**Action:** When converting a recursive `rAF` loop to a subscription model, always ensure the callback is invoked synchronously once during initialization if the original code did so, to prevent "frame 0" visual glitches or layout jumps before the first loop tick.
