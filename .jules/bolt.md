# Bolt's Journal

## 2024-05-22 - [Optimization Strategy]
**Learning:** This codebase uses a vanilla JS architecture with a centralized Loop manager (`src/core/Loop.js`). However, `MobileAnimations.js` and `main.js` (desktop scroll) implemented their own RAF loops, fragmenting the animation logic.
**Action:** Consolidate animation loops into the centralized `Loop.js` manager whenever possible to reduce RAF overhead and ensure synchronized frame updates.
