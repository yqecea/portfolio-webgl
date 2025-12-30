/**
 * ScrollManager.js - Virtual Scroll System
 * 
 * CRITICAL FIX: Implements vertical-to-horizontal scroll translation for mobile.
 * Users swipe UP (natural gesture) → Gallery moves LEFT (desired behavior).
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
            touchStart: 0, // Touch Y coordinate at start
            isDragging: false
        };

        // Lerp factor for smooth animation
        this.ease = 0.1;

        // Touch sensitivity multiplier
        this.touchMultiplier = 2.5;

        this.init();
    }

    init() {
        // Initial resize calculation
        this.resize();
        this.bindEvents();
    }

    bindEvents() {
        // Resize handler
        window.addEventListener('resize', () => this.resize());

        // Desktop: Wheel events
        window.addEventListener('wheel', (e) => this.onWheel(e));

        // Mobile: Touch events - CRITICAL: passive: false to allow preventDefault
        if (this.dom.wrapper) {
            this.dom.wrapper.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
            this.dom.wrapper.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        }
        window.addEventListener('touchend', () => this.onTouchEnd());
    }

    /**
     * Desktop wheel handler
     */
    onWheel(e) {
        this.state.target += e.deltaY;
        this.clamp();
    }

    /**
     * Mobile touch start
     */
    onTouchStart(e) {
        this.state.isDragging = true;
        this.state.touchStart = e.touches[0].clientY;
    }

    /**
     * Mobile touch move - CRITICAL UX FIX
     * Translates vertical swipe to horizontal scroll
     */
    onTouchMove(e) {
        if (!this.state.isDragging) return;

        // PREVENT native vertical scrolling
        e.preventDefault();

        const y = e.touches[0].clientY;
        // Swipe UP gives positive delta (finger moves from 100 to 80 = +20)
        const delta = this.state.touchStart - y;

        // Translate vertical delta to horizontal target
        this.state.target += delta * this.touchMultiplier;
        this.state.touchStart = y;

        this.clamp();
    }

    /**
     * Mobile touch end
     */
    onTouchEnd() {
        this.state.isDragging = false;
    }

    /**
     * Calculate scroll limits based on content width
     */
    resize() {
        if (this.dom.element) {
            this.state.limit = this.dom.element.offsetWidth - window.innerWidth;
        }
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
        // Smooth interpolation
        this.state.current += (this.state.target - this.state.current) * this.ease;

        // Apply transform - negative X moves content LEFT
        if (this.dom.element) {
            this.dom.element.style.transform = `translate3d(-${this.state.current}px, 0, 0)`;
        }
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
}
