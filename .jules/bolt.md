## 2025-01-01 - Infinite Animation Loop in Desktop Scroll
**Learning:** The desktop smooth scroll implementation created an infinite `requestAnimationFrame` loop that ran even when idle, causing unnecessary style recalculations every frame. This pattern consumes CPU/GPU resources continuously.
**Action:** Replace unconditional recursive `requestAnimationFrame` loops with centralized loop subscriptions (like `Loop.js`) and implement early returns when delta is negligible (e.g., `< 0.1px`).
