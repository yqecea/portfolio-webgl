## 2026-01-10 - Consolidate duplicate RAF loops
**Learning:** Legacy inline scripts and modern ES modules were both initializing independent `requestAnimationFrame` loops, causing redundant Main Thread overhead.
**Action:** Always check for existing global animation loops (like `window.RAF`) before starting a new one in module-based architectures.
