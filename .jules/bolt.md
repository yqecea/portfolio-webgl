## 2024-05-23 - Consolidating Animation Loops
**Learning:** Legacy inline scripts running `requestAnimationFrame` can conflict with modern module-based loops. Modules cannot see global variables defined with `const/let` in inline scripts.
**Action:** Attach critical legacy globals to `window` (e.g., `window.RAF`) to allow modern modules to "piggyback" on existing loops instead of spawning new ones. This unifies the "heartbeat" of the app.
