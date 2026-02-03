## 2025-01-01 - Centralized Animation Loop
**Learning:** The project uses a centralized `Loop.js` singleton. New animations should subscribe to it (`loop.subscribe`) rather than creating isolated `requestAnimationFrame` loops. Isolated loops fight for resources and are harder to manage globally.
**Action:** When adding or optimizing animations, always import `loop` from `src/core/Loop.js` and use `.subscribe()`.

## 2025-01-01 - Artifact Management
**Learning:** Tools like `run_in_bash_session` can create persistent artifacts (e.g., logs). These must be cleaned up.
**Action:** Always check `git status` or file list before submitting to ensure no temporary files are included.
