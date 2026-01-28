# Bolt's Journal

## 2024-05-22 - Vanilla JS Architecture
**Learning:** The project uses a custom `Loop.js` for centralized RAF management but `src/main.js` was still using a manual `requestAnimationFrame` loop for scrolling. Consolidating these improves performance and architectural consistency.
**Action:** Always check for existing centralized managers (Loop, Resize) before implementing ad-hoc listeners or loops.
