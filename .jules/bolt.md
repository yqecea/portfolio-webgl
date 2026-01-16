## 2024-10-18 - Centralized Animation Loop
**Learning:** The codebase uses a centralized `Loop.js` to manage `requestAnimationFrame`. Isolated recursive `RAF` loops in components (like `src/main.js`) fight for resources and drift out of sync.
**Action:** Always check for `Loop` or global animation controllers before implementing local `requestAnimationFrame` loops.
