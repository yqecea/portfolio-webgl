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
        // Check if we're on mobile (screen width OR userAgent)
        this.isMobile = window.innerWidth <= 991 ||
            /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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
        this.animate();

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
     * FIX 1: Gradient Banding + Number Scaling
     * - Adds VERY subtle noise overlay (doesn't change colors)
     * - Scales numbers to fit on mobile screen
     */
    fixGradientBanding() {
        // Create very subtle noise SVG - much lower opacity
        const noiseSVG = `
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
                <filter id="noise">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
                    <feColorMatrix type="saturate" values="0"/>
                </filter>
                <rect width="100%" height="100%" filter="url(#noise)" opacity="0.02"/>
            </svg>
        `;
        const noiseDataURL = `url("data:image/svg+xml,${encodeURIComponent(noiseSVG)}")`;

        // Apply ONLY noise overlay - NO gradient changes
        const style = document.createElement('style');
        style.id = 'mobile-fixes-css';
        style.textContent = `
            @media (max-width: 991px) {
                /* Very subtle noise - doesn't darken anything */
                body::after {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1;
                    background: ${noiseDataURL};
                    opacity: 0.15;
                    mix-blend-mode: overlay;
                }
                
                /* Number scaling - auto-fit to screen */
                .p-numb {
                    font-size: clamp(40vw, 50vw, 60vw) !important;
                    line-height: 0.9 !important;
                    white-space: nowrap !important;
                }
                
                .p-numb-w {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    width: 100% !important;
                    overflow: visible !important;
                }
                
                /* Section content scaling */
                .p-col {
                    min-width: 100vw !important;
                    width: 100vw !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    align-items: center !important;
                    padding: 5vw !important;
                }
                
                .p-inner {
                    width: 100% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    text-align: center !important;
                }
                
                .p-block {
                    text-align: center !important;
                }
                
                .p-title {
                    font-size: clamp(6vw, 8vw, 10vw) !important;
                    line-height: 1.2 !important;
                    text-align: center !important;
                }
                
                .p-client {
                    font-size: clamp(3vw, 4vw, 5vw) !important;
                    text-align: center !important;
                }
            }
        `;
        document.head.appendChild(style);
        console.log('[MobileFix] Gradient banding + number scaling applied');
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
        this.scroll.limit = Math.max(0, this.scroller.scrollWidth - window.innerWidth);
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

        // Apply momentum
        if (Math.abs(this.scroll.velocity) > 5) {
            this.scroll.target += this.scroll.velocity * 5;
            this.scroll.target = Math.max(0, Math.min(this.scroll.target, this.scroll.limit));
        }
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

        // Continue loop
        requestAnimationFrame(() => this.animate());
    }

    /**
     * Get scroll progress (0 to 1)
     */
    getProgress() {
        if (this.scroll.limit === 0) return 0;
        return this.scroll.current / this.scroll.limit;
    }
}
