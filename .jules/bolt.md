## 2025-01-27 - [Ad-hoc RAF Loops vs Centralized Loop]
**Learning:** Found multiple independent `requestAnimationFrame` loops (one in `Loop.js`, another in `main.js` closure). This fragmentation doubles the overhead and prevents global frame synchronization.
**Action:** Always check `main.js` init logic for "hidden" animation loops and refactor them to use the centralized `Loop.subscribe()` pattern.
