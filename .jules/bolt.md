## 2024-05-23 - Centralized Animation Loop vs Dedicated RAF
**Learning:** The codebase contains a mix of centralized `Loop.js` subscriptions and dedicated `requestAnimationFrame` loops. Dedicated loops for smooth scrolling (lerp) often run indefinitely even when idle, causing constant layout/paint cycles.
**Action:** Prefer subscribing to `Loop.js` for all animations. Implement early returns (`Math.abs(diff) < 0.1`) in lerp functions to stop processing when the target is reached, preventing unnecessary CPU/GPU usage.
