
---

# refactor.md

## 1. Project Overview

**Role:** AI Coding Agent / Senior Developer
**Task:** Refactor a legacy WebGL portfolio from a single `index.html` with "spaghetti code" into a structured **Vanilla JS (ES Modules)** architecture.
**Critical Fix:** Implement "Vertical-to-Horizontal" scroll translation for mobile devices. Users naturally swipe UP to see more content; you must intercept this and translate it into moving the gallery LEFT.

### ⛔ ZERO-DESTRUCTION POLICY (STRICT)

1. **DO NOT** modify, rename, or delete any HTML structure, classes, or IDs within `index.html`.
2. **DO NOT** modify `css/style.css` or the `assets/` folder.
3. **THE ONLY ALLOWED HTML CHANGE:** You may delete the inline `<script>` tags at the bottom of the body and replace them with:
```html
<script type="module" src="./src/main.js"></script>

```



---

## 2. Hardcoded DOM Targets

You must verify and attach your JavaScript logic to these exact selectors found in the source:

| Component | Selector | Role |
| --- | --- | --- |
| **Viewport** | `.sidescrollbox` | The outer container with `overflow: hidden`. |
| **Moving Content** | `.scroller` | The long strip containing `.p-grid`. You will animate this via `transform`. |
| **Menu Trigger** | `.burgercontainer` | The container for the canvas menu. |
| **WebGL Container** | `.webglholder` | The container for the 3D sphere. |

---

## 3. New File Structure

Create the following directory structure inside the root folder:

```text
/
├── css/ (Existing - DO NOT TOUCH)
├── assets/ (Existing - DO NOT TOUCH)
├── src/
│   ├── core/
│   │   ├── ScrollManager.js   <-- (CRITICAL: Handles Virtual Scroll & Mobile Swipe)
│   │   └── Loop.js            <-- (Global RequestAnimationFrame)
│   ├── webgl/
│   │   └── WebGLApp.js        <-- (The 3D Sphere Logic)
│   ├── ui/
│   │   └── Menu.js            <-- (Burger Menu Logic)
│   └── main.js                <-- (Entry Point)
└── index.html                 <-- (Modified only to swap script tags)

```

---

## 4. Logic Specifications

### Phase 1: The Scroll System (CRITICAL UX FIX)

**File:** `src/core/ScrollManager.js`

**Objective:** Decouple user input from DOM movement. Intercept vertical swipes on mobile and force horizontal movement.

1. **State Management:**
* `current`: Actual pixel position (interpolated).
* `target`: Destination pixel position (input-driven).
* `limit`: `dom.scroller.offsetWidth - window.innerWidth`.


2. **Desktop Event (`wheel`):**
* Listen for `wheel`.
* `target += e.deltaY`.
* Clamp `target` between `0` and `limit`.


3. **Mobile Event (`touchstart`, `touchmove`):**
* **Config:** Listener **MUST** use `{ passive: false }` to allow `preventDefault()`.
* **Logic:**
* On `touchmove`: Call `e.preventDefault()` to stop native vertical scrolling.
* Calculate `delta = touchStartY - currentTouchY`.
* *Scenario:* User swipes UP (Finger moves 100px -> 80px). `delta` is +20.
* *Intent:* "Go to next slide."


* Update `target += delta * 2.0` (Use a multiplier for natural feel).
* Update `touchStartY` for the next frame.




4. **Render Loop:**
* Lerp: `current += (target - current) * 0.1`.
* Apply: `dom.scroller.style.transform = "translate3d(-" + current + "px, 0, 0)"`.
* *Note:* The negative sign ensures positive target values move the content to the LEFT.



### Phase 2: WebGL Decoupling

**File:** `src/webgl/WebGLApp.js`

1. Extract the Three.js initialization code (Scene, Camera, Renderer, SphereGeometry) from the legacy script.
2. Target `.webglholder`.
3. **Sync:** Expose an `update()` method that rotates the sphere. Call this from the global loop to keep the rotation alive.

### Phase 3: UI Interaction

**File:** `src/ui/Menu.js`

1. Select `.burgercontainer`.
2. Migrate the existing click event logic (toggling classes) into this class.
3. Migrate the Canvas drawing logic (if present) to render the menu icon lines.

---

## 5. Implementation Code Snippet (Mobile Logic)

Use this pattern in `ScrollManager.js` to ensure the mobile fix works:

```javascript
// src/core/ScrollManager.js

export default class ScrollManager {
    constructor() {
        this.dom = {
            wrapper: document.querySelector('.sidescrollbox'),
            element: document.querySelector('.scroller')
        };
        this.state = {
            current: 0,
            target: 0,
            limit: 0,
            touchStart: 0,
            isDragging: false
        };
        this.resize();
        this.init();
    }

    init() {
        // Resize
        window.addEventListener('resize', () => this.resize());
        
        // Desktop
        window.addEventListener('wheel', (e) => {
            this.state.target += e.deltaY;
            this.clamp();
        });

        // Mobile - CRITICAL: passive: false
        this.dom.wrapper.addEventListener('touchstart', (e) => {
            this.state.isDragging = true;
            this.state.touchStart = e.touches[0].clientY;
        }, { passive: false });

        this.dom.wrapper.addEventListener('touchmove', (e) => {
            if (!this.state.isDragging) return;
            
            // PREVENT VERTICAL SCROLL
            e.preventDefault();

            const y = e.touches[0].clientY;
            const delta = this.state.touchStart - y; // Swipe UP gives positive delta
            
            this.state.target += delta * 2.5; // Translate vertical delta to horizontal target
            this.state.touchStart = y;
            this.clamp();
        }, { passive: false });

        window.addEventListener('touchend', () => {
            this.state.isDragging = false;
        });
    }

    resize() {
        this.state.limit = this.dom.element.offsetWidth - window.innerWidth;
    }

    clamp() {
        this.state.target = Math.max(0, Math.min(this.state.target, this.state.limit));
    }

    update() {
        // Smooth Lerp
        this.state.current += (this.state.target - this.state.current) * 0.1;
        
        // Move Content LEFT
        this.dom.element.style.transform = `translate3d(-${this.state.current}px, 0, 0)`;
    }
}

```

## 6. Step-by-Step Guide

1. **Backup:** Duplicate `index.html` to `index.backup.html`.
2. **Scaffold:** Create the `/src` directory structure.
3. **Extract:** Move logic from inline scripts to `WebGLApp.js` and `Menu.js`.
4. **Develop:** Write `ScrollManager.js` using the snippet above.
5. **Assemble:** Create `main.js` to import and start all managers.
6. **Clean:** Remove inline scripts from `index.html` and link `main.js`.
7. **Verify:** Open in Chrome DevTools (Mobile View). Swipe UP. The gallery must move LEFT.