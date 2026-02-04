## 2024-05-22 - Animation Loop Termination
**Learning:** Returning early from a lerp animation loop when `diff < threshold` prevents the final frame from rendering, leaving the visual state out of sync with the logical state (drift).
**Action:** Always calculate the new position, snap to target if close, and apply the transform *before* exiting the loop or setting `isAnimating = false`.
