/**
 * ScrollManager.js - Virtual Scroll System
 * 
 * CRITICAL FIX: Implements vertical-to-horizontal scroll translation for mobile.
 * Users swipe UP (natural gesture) → Gallery moves LEFT (desired behavior).
 * 
 * This manager also applies CSS fixes on mobile to force horizontal layout.
 * 
 * @selectors
 * - .sidescrollbox (wrapper with overflow:hidden)
 * - .scroller (long horizontal strip to transform)
 */
export default class ScrollManager {
    constructor() {
        this.dom = {
            wrapper: document.querySelector('.sidescrollbox'),
            element: document.querySelector('.scroller')
        };

        this.state = {
            current: 0,    // Actual pixel position (interpolated)
            target: 0,     // Destination pixel position (input-driven)
            limit: 0,      // Maximum scroll value
            touchStartY: 0, // Touch Y coordinate at start
            touchStartX: 0, // Touch X coordinate at start (for hybrid detection)
            lastTouchY: 0,  // Track last touch for delta calculation
            isDragging: false,
            velocity: 0     // For momentum scrolling
        };

        // Lerp factor for smooth animation (higher = faster)
        this.ease = 0.08;

        // Touch sensitivity multiplier for vertical input
        this.touchMultiplier = 2.0;

        // Minimum touch delta to register as scroll (prevents jitter)
        this.minDelta = 2;

        // Check if we should handle scroll (has horizontal content)
        this.isActive = false;

        this.init();
    }

    init() {
        if (!this.dom.wrapper || !this.dom.element) {
            console.warn('[ScrollManager] Required elements not found (.sidescrollbox, .scroller)');
            return;
        }

        // Check if on mobile (User-Agent ONLY - not width-based)
        // This prevents false positives when resizing desktop browser window
        this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        console.log('[ScrollManager] Mobile detection:', this.isMobile);

        // Apply mobile CSS fixes if on mobile
        if (this.isMobile) {
            this.applyMobileFixes();
        }

        // Initial resize calculation
        this.resize();

        // Only activate if there's horizontal overflow
        if (this.state.limit > 0) {
            this.isActive = true;
            this.bindEvents();
            console.log('[ScrollManager] Activated with limit:', this.state.limit);
        } else {
            console.log('[ScrollManager] No horizontal overflow, deactivated');
        }
    }

    /**
     * Apply CSS fixes on mobile to maintain horizontal layout
     * The original CSS changes layout to vertical on mobile - we override that
     */
    applyMobileFixes() {
        if (!this.dom.wrapper || !this.dom.element) return;

        // Force horizontal layout on mobile
        this.dom.wrapper.style.cssText = `
            overflow: hidden !important;
            width: 100vw !important;
            height: 100vh !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            touch-action: none !important;
        `;

        // Force scroller to be horizontal
        this.dom.element.style.cssText += `
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            height: 100vh !important;
            width: max-content !important;
        `;

        // Fix body to prevent any native scroll
        document.body.style.cssText += `
            overflow: hidden !important;
            position: fixed !important;
            width: 100% !important;
            height: 100% !important;
            touch-action: none !important;
        `;

        // Fix html element too
        document.documentElement.style.cssText += `
            overflow: hidden !important;
            touch-action: none !important;
        `;

        console.log('[ScrollManager] Applied mobile CSS fixes');
    }

    bindEvents() {
        // Resize handler
        window.addEventListener('resize', () => this.resize());

        // Desktop: Wheel events
        window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

        // Mobile: Touch events on wrapper and document to ensure capture
        // CRITICAL: passive: false to allow preventDefault
        const touchOptions = { passive: false, capture: true };

        document.addEventListener('touchstart', (e) => this.onTouchStart(e), touchOptions);
        document.addEventListener('touchmove', (e) => this.onTouchMove(e), touchOptions);
        document.addEventListener('touchend', (e) => this.onTouchEnd(e), touchOptions);
    }

    /**
     * Desktop wheel handler
     */
    onWheel(e) {
        if (!this.isActive) return;

        // Prevent default to stop any native horizontal scrolling
        e.preventDefault();

        // Use both deltaY and deltaX (for trackpads)
        const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

        this.state.target += delta;
        this.clamp();
    }

    /**
     * Mobile touch start
     */
    onTouchStart(e) {
        if (!this.isActive) return;

        this.state.isDragging = true;
        this.state.touchStartY = e.touches[0].clientY;
        this.state.touchStartX = e.touches[0].clientX;
        this.state.lastTouchY = e.touches[0].clientY;
        this.state.velocity = 0;
    }

    /**
     * Mobile touch move - CRITICAL UX FIX
     * Translates vertical swipe to horizontal scroll
     */
    onTouchMove(e) {
        if (!this.isActive || !this.state.isDragging) return;

        // PREVENT native scrolling (both vertical and horizontal)
        e.preventDefault();
        e.stopPropagation();

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;

        // Calculate vertical delta (primary input)
        const deltaY = this.state.lastTouchY - currentY;

        // Calculate horizontal delta as fallback
        const deltaX = this.state.touchStartX - currentX;

        // Use whichever has more movement (but prefer vertical)
        let delta = 0;
        if (Math.abs(deltaY) > this.minDelta) {
            // Swipe UP (finger moves up, deltaY positive) → Move content LEFT
            delta = deltaY * this.touchMultiplier;
        } else if (Math.abs(deltaX) > this.minDelta) {
            // Fallback to horizontal swipe
            delta = deltaX * 0.5;
        }

        if (delta !== 0) {
            this.state.target += delta;
            this.state.velocity = delta;
            this.clamp();
        }

        // Update last position for next frame
        this.state.lastTouchY = currentY;
    }

    /**
     * Mobile touch end - apply momentum
     */
    onTouchEnd(e) {
        if (!this.isActive) return;

        this.state.isDragging = false;

        // Apply momentum (velocity-based inertia)
        if (Math.abs(this.state.velocity) > 5) {
            this.state.target += this.state.velocity * 3;
            this.clamp();
        }
    }

    /**
     * Calculate scroll limits based on content width
     */
    resize() {
        if (!this.dom.element) return;

        const contentWidth = this.dom.element.scrollWidth || this.dom.element.offsetWidth;
        this.state.limit = Math.max(0, contentWidth - window.innerWidth);

        // Re-check activation
        this.isActive = this.state.limit > 0;
    }

    /**
     * Clamp target within valid bounds
     */
    clamp() {
        this.state.target = Math.max(0, Math.min(this.state.target, this.state.limit));
    }

    /**
     * Update loop - called every frame
     * Lerps current position toward target and applies transform
     */
    update() {
        if (!this.isActive || !this.dom.element) return;

        // Smooth interpolation
        this.state.current += (this.state.target - this.state.current) * this.ease;

        // Round to prevent subpixel rendering issues
        const rounded = Math.round(this.state.current * 100) / 100;

        // Apply transform - negative X moves content LEFT
        this.dom.element.style.transform = `translate3d(-${rounded}px, 0, 0)`;
    }

    /**
     * Get normalized scroll progress (0 to 1)
     */
    getProgress() {
        if (this.state.limit === 0) return 0;
        return this.state.current / this.state.limit;
    }

    /**
     * Programmatically scroll to a position
     * @param {number} position - Target position in pixels
     */
    scrollTo(position) {
        this.state.target = position;
        this.clamp();
    }

    /**
     * Scroll to progress (0-1)
     */
    scrollToProgress(progress) {
        this.scrollTo(progress * this.state.limit);
    }
}
