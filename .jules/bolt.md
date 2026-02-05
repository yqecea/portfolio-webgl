# Bolt's Journal

## 2024-05-22 - Infinite Animation Loops in Legacy Code
**Learning:** Found an isolated `requestAnimationFrame` loop in `src/main.js` (Desktop Fix) that ran continuously even when idle, wasting GPU/CPU cycles. It lacked a condition to stop when the delta was negligible.
**Action:** Always check `requestAnimationFrame` loops for an exit condition (e.g., `Math.abs(diff) < 0.1`). Implement a "sleep" state when the animation settles.
