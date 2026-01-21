import loop from './Loop.js';

/**
 * MobileFix.js - Complete Mobile Experience Enhancement
 * 
 * This module handles ALL mobile-specific fixes:
 * 1. Vertical → Horizontal scroll translation
 * 2. Gradient banding fix (noise overlay)
 * 3. Section animations on scroll
 * 4. Touch gesture improvements
 * 
 * IMPORTANT: All fixes are MOBILE-ONLY and do not affect desktop.
 */

export default class MobileFix {
    constructor() {
        // Check if we're on mobile (User-Agent ONLY - not width-based)
        // This prevents false positives when resizing desktop browser window
        this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (!this.isMobile) {
            console.log('[MobileFix] Desktop detected, skipping all mobile fixes');
            return;
        }

        console.log('[MobileFix] Mobile detected, applying fixes...');

        // DOM elements
        this.wrapper = document.querySelector('.sidescrollbox');
        this.scroller = document.querySelector('.scroller') || document.querySelector('.p-grid');
        this.sections = document.querySelectorAll('.p-col');

        // Scroll state
        this.scroll = {
            current: 0,
            target: 0,
            limit: 0,
            touchY: 0,
            lastY: 0,
            velocity: 0,
            isDragging: false
        };

        // Initialize all fixes
        this.init();
    }

    init() {
        // Fix 0: Hide "Rotate your device" overlay - we support portrait now!
        this.hideRotateOverlay();

        // Fix 1: Gradient banding
        this.fixGradientBanding();

        // Fix 2: Force horizontal layout on mobile
        if (this.wrapper && this.scroller) {
            this.setupHorizontalScroll();
        }

        // Fix 3: Section animations
        if (this.sections.length > 0) {
            this.setupSectionAnimations();
        }

        // Start animation loop
        // OPTIMIZATION: Use central Loop.js instead of recursive rAF
        loop.subscribe('mobileFix', () => this.animate());

        console.log('[MobileFix] All fixes applied');
    }

    /**
     * FIX 0: Hide Rotate Overlay
     * Hides the "Rotate your device" message since we now support portrait mode
     */
    hideRotateOverlay() {
        const rotateOverlay = document.querySelector('.rotate');
        if (rotateOverlay) {
            rotateOverlay.style.display = 'none';
            console.log('[MobileFix] Rotate overlay hidden');
        }
    }

    /**
     * FIX 1: Mobile Layout + Number Scaling + Scroll Snap
     * - Noise dithering is handled globally in CSS
     * - Scales numbers to fill the screen on mobile
     * - Adds scroll snap for auto-centering
     * - Removes extra space after project 7
     */
    fixGradientBanding() {
        // Noise overlay is now handled in CSS globally (works on all pages)

        // Apply mobile-specific layout fixes
        const style = document.createElement('style');
        style.id = 'mobile-fixes-css';
        style.textContent = `
            @media (max-width: 991px) {
                /* ======== SCROLL SNAP for auto-centering ======== */
                .sidescrollbox {
                    scroll-snap-type: x mandatory !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                
                .p-col {
                    scroll-snap-align: center !important;
                    scroll-snap-stop: always !important;
                }
                
                /* ======== LARGE PROJECT NUMBERS - fill screen ======== */
                .p-numb {
                    font-size: 75vh !important;
                    line-height: 0.85 !important;
                    white-space: nowrap !important;
                    color: rgba(10, 10, 10, 0.95) !important;
                }
                
                .p-numb-w {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    width: 100% !important;
                    height: 70vh !important;
                    overflow: visible !important;
                }
                
                /* ======== SECTION LAYOUT - full viewport width ======== */
                .p-col {
                    min-width: 100vw !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    align-items: center !important;
                    padding: 0 !important;
                    flex-shrink: 0 !important;
                }
                
                /* ======== FIX GRID WIDTH - exactly 7 screens ======== */
                .p-grid.scroller {
                    width: calc(100vw * 7) !important;
                    max-width: calc(100vw * 7) !important;
                }
                
                .p-inner {
                    width: 100% !important;
                    height: 100% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    text-align: center !important;
                }
                
                .p-block {
                    text-align: center !important;
                    margin-top: 2vh !important;
                }
                
                .p-title {
                    font-size: clamp(5vw, 7vw, 9vw) !important;
                    line-height: 1.2 !important;
                    text-align: center !important;
                    color: #0a0a0a !important;
                }
                
                .p-client {
                    font-size: clamp(3vw, 4vw, 5vw) !important;
                    text-align: center !important;
                }
                
                /* Hide the elastic line on mobile */
                .elastic, .elasticbox {
                    display: none !important;
                }
                
                /* Hide the arrow on mobile */
                .p-side {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);
        console.log('[MobileFix] Gradient banding + number scaling + scroll snap applied');
    }

    /**
     * FIX 2: Horizontal Scroll
     * Forces horizontal layout and captures vertical touch → horizontal scroll
     */
    setupHorizontalScroll() {
        // Apply CSS fixes to force horizontal layout
        this.wrapper.style.cssText = `
            overflow: hidden !important;
            width: 100vw !important;
            height: 100vh !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            touch-action: none !important;
        `;

        this.scroller.style.cssText = `
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            height: 100vh !important;
            width: max-content !important;
            will-change: transform !important;
        `;

        // Lock body scroll
        document.body.style.cssText += `
            overflow: hidden !important;
            position: fixed !important;
            width: 100% !important;
            height: 100% !important;
            touch-action: none !important;
        `;

        document.documentElement.style.cssText += `
            overflow: hidden !important;
            touch-action: none !important;
        `;

        // Calculate scroll limit
        this.updateLimit();
        window.addEventListener('resize', () => this.updateLimit());

        // Touch events with passive: false to allow preventDefault
        document.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });

        console.log('[MobileFix] Horizontal scroll setup complete, limit:', this.scroll.limit);
    }

    updateLimit() {
        if (!this.scroller) return;
        // Calculate limit based on exact number of sections (each is 100vw)
        const numSections = this.sections.length || 7;
        const sectionWidth = window.innerWidth;
        // Limit = total content width - one screen (so we can see the last section)
        this.scroll.limit = Math.max(0, (numSections - 1) * sectionWidth);
        console.log('[MobileFix] Updated scroll limit:', this.scroll.limit, 'for', numSections, 'sections');
    }

    onTouchStart(e) {
        if (!this.wrapper) return;

        this.scroll.isDragging = true;
        this.scroll.touchY = e.touches[0].clientY;
        this.scroll.lastY = e.touches[0].clientY;
        this.scroll.velocity = 0;
    }

    onTouchMove(e) {
        if (!this.wrapper || !this.scroll.isDragging) return;

        // Block ALL native scrolling
        e.preventDefault();
        e.stopPropagation();

        const currentY = e.touches[0].clientY;

        // Delta: swipe UP (finger moves up) = positive delta = move content LEFT
        const deltaY = this.scroll.lastY - currentY;

        // Apply multiplier for better feel
        const multiplier = 2.5;

        if (Math.abs(deltaY) > 1) {
            this.scroll.target += deltaY * multiplier;
            this.scroll.velocity = deltaY * multiplier;

            // Clamp to bounds
            this.scroll.target = Math.max(0, Math.min(this.scroll.target, this.scroll.limit));
        }

        this.scroll.lastY = currentY;
    }

    onTouchEnd(e) {
        if (!this.wrapper) return;

        this.scroll.isDragging = false;

        // Apply momentum first
        if (Math.abs(this.scroll.velocity) > 5) {
            this.scroll.target += this.scroll.velocity * 5;
            this.scroll.target = Math.max(0, Math.min(this.scroll.target, this.scroll.limit));
        }

        // SCROLL SNAP: Snap to nearest section after momentum
        this.snapToNearestSection();
    }

    /**
     * Snap to the nearest section center
     * This makes numbers auto-align centered on screen
     */
    snapToNearestSection() {
        const sectionWidth = window.innerWidth; // Each section is 100vw
        const numSections = this.sections.length || 7;

        // Calculate which section we're closest to
        const currentSection = Math.round(this.scroll.target / sectionWidth);

        // Clamp to valid range
        const targetSection = Math.max(0, Math.min(currentSection, numSections - 1));

        // Calculate target scroll position (centered)
        const targetPosition = targetSection * sectionWidth;

        // Animate to the snapped position
        this.scroll.target = targetPosition;

        console.log('[MobileFix] Snapped to section', targetSection + 1);
    }

    /**
     * FIX 3: Section Animations
     * Adds fade-in/scale animations as sections enter viewport
     */
    setupSectionAnimations() {
        // Initial state: hide all sections
        this.sections.forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px) scale(0.95)';
            section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            section.style.transitionDelay = `${index * 0.05}s`;
        });

        // Trigger initial animation after a short delay
        setTimeout(() => {
            this.animateSections();
        }, 300);

        console.log('[MobileFix] Section animations setup for', this.sections.length, 'sections');
    }

    animateSections() {
        if (!this.scroller) return;

        const viewportWidth = window.innerWidth;
        const scrollX = this.scroll.current;

        this.sections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            const sectionLeft = rect.left;
            const sectionWidth = rect.width;

            // Section is visible if it's within viewport
            const isVisible = sectionLeft < viewportWidth && sectionLeft + sectionWidth > 0;

            // Calculate visibility percentage for parallax effect
            const centerX = sectionLeft + sectionWidth / 2;
            const distanceFromCenter = Math.abs(viewportWidth / 2 - centerX);
            const maxDistance = viewportWidth / 2 + sectionWidth / 2;
            const visibility = 1 - Math.min(distanceFromCenter / maxDistance, 1);

            if (isVisible) {
                section.style.opacity = '1';
                section.style.transform = `translateY(0) scale(1)`;
            } else if (sectionLeft > viewportWidth) {
                // Sections to the right: hide them
                section.style.opacity = '0';
                section.style.transform = 'translateY(30px) scale(0.95)';
            }
        });
    }

    /**
     * Animation Loop
     */
    animate() {
        if (!this.isMobile) return;

        // Smooth interpolation (lerp)
        const ease = 0.1;
        this.scroll.current += (this.scroll.target - this.scroll.current) * ease;

        // Apply transform
        if (this.scroller) {
            const rounded = Math.round(this.scroll.current * 10) / 10;
            this.scroller.style.transform = `translate3d(-${rounded}px, 0, 0)`;
        }

        // Update section animations
        this.animateSections();
    }

    /**
     * Get scroll progress (0 to 1)
     */
    getProgress() {
        if (this.scroll.limit === 0) return 0;
        return this.scroll.current / this.scroll.limit;
    }
}
