# Bolt's Journal

This journal records critical performance learnings and architectural insights.

## Entries

## 2024-05-22 - [Centralized Animation Loop]
**Learning:** The codebase had multiple independent `requestAnimationFrame` loops (in `main.js` and `Loop.js`). Running parallel RAF loops causes unnecessary overhead and browser scheduling fight.
**Action:** Always subscribe to the centralized `Loop.js` manager (`loop.subscribe`) instead of creating new recursive `requestAnimationFrame` loops. Consolidate animation logic to single rAF tick.
