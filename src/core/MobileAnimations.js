/**
 * MobileAnimations.js - Universal Mobile Animation System
 * 
 * Provides scroll-triggered animations for ALL pages on mobile:
 * 1. IntersectionObserver for viewport detection (performant)
 * 2. Staggered fade-in animations for elements with [data-scroll]
 * 3. Touch feedback micro-interactions
 * 4. Lightweight parallax effects
 * 
 * IMPORTANT: This module is MOBILE-ONLY and does not affect desktop.
 */

export default class MobileAnimations {
    constructor() {
        // Check if on mobile (User-Agent ONLY - not width-based)
        // This prevents false positives when resizing desktop browser window
        this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (!this.isMobile) {
            console.log('[MobileAnimations] Desktop detected, skipping');
            return;
        }

        console.log('[MobileAnimations] Mobile detected, initializing...');

        // Collect all animatable elements
        this.scrollElements = document.querySelectorAll('[data-scroll]');
        this.parallaxElements = document.querySelectorAll('[data-scroll-speed]');
        this.interactiveElements = document.querySelectorAll('.a-client, .aw-title, .a-quote, .a-desc, .c-item, .cr-item, .p-title, .p-client');

        // FALLBACK: If no data-scroll elements, target content by class names
        // This handles Contact and Credits pages which don't use data-scroll attributes
        if (this.scrollElements.length === 0) {
            console.log('[MobileAnimations] No data-scroll elements found, using fallback selectors');
            // Fallback selectors for Contact and Credits pages
            this.scrollElements = document.querySelectorAll(
                '.c-title, .c-item, .c-inner, .c-head, .c-block, .c-row, ' +
                '.c-link-w, .c-email-w, .social-col, .c-list, .c-sub, ' +
                '.cr-inner, .credits .c-row, .contact .c-col'
            );

            // Mark these elements as needing animation
            this.scrollElements.forEach(el => {
                el.dataset.scrollFallback = 'true';
            });

            this.useFallback = true;
        }

        // State
        this.lastScrollY = 0;
        this.ticking = false;

        // Initialize
        this.init();
    }

    init() {
        // Add CSS for animations
        this.injectStyles();

        // Setup scroll-triggered animations
        if (this.scrollElements.length > 0) {
            this.setupScrollAnimations();
        }

        // Setup touch feedback
        if (this.interactiveElements.length > 0) {
            this.setupTouchFeedback();
        }

        // Setup lightweight parallax
        if (this.parallaxElements.length > 0) {
            this.setupParallax();
        }

        // Hide rotate overlay (we support portrait now!)
        this.hideRotateOverlay();

        console.log('[MobileAnimations] Initialized with', this.scrollElements.length, 'scroll elements');
    }

    /**
     * Inject mobile animation styles
     */
    injectStyles() {
        const style = document.createElement('style');
        style.id = 'mobile-animations-css';
        style.textContent = `
            @media (max-width: 991px) {
                /* ======== SCROLL ENTRANCE ANIMATIONS ======== */
                [data-scroll] {
                    opacity: 0;
                    transform: translateY(40px);
                    transition: opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                                transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }
                
                [data-scroll].is-inview {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                /* ======== FALLBACK ANIMATIONS (Contact/Credits pages) ======== */
                [data-scroll-fallback] {
                    opacity: 0;
                    transform: translateY(30px);
                    transition: opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                                transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }
                
                [data-scroll-fallback].is-inview {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                /* ======== STAGGERED DELAYS ======== */
                [data-scroll][data-scroll-delay] {
                    /* Delay is set via JS */
                }
                
                /* ======== TOUCH FEEDBACK ======== */
                .mobile-touch-active {
                    transform: scale(0.97) !important;
                    opacity: 0.85 !important;
                    transition: transform 0.15s ease, opacity 0.15s ease !important;
                }
                
                /* ======== INTERACTIVE ELEMENTS ======== */
                .a-client,
                .aw-title,
                .a-quote,
                .a-desc,
                .c-item,
                .cr-item,
                .p-title,
                .p-client,
                .c-email-w,
                .c-social,
                .c-link {
                    transition: transform 0.2s ease, opacity 0.2s ease;
                    -webkit-tap-highlight-color: transparent;
                }
                
                /* ======== HERO ELEMENTS - immediate visibility ======== */
                .a-hero [data-scroll],
                .h-row [data-scroll],
                .hero [data-scroll] {
                    opacity: 1;
                    transform: none;
                }
                
                /* ======== SMOOTH PARALLAX CONTAINER ======== */
                [data-scroll-speed] {
                    will-change: transform;
                }
                
                /* ======== SECTION BREATHING ======== */
                .a-bio,
                .a-award,
                .a-clients,
                .c-form,
                .cr-block {
                    animation: mobileBreathe 3s ease-in-out infinite alternate;
                }
                
                @keyframes mobileBreathe {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-5px); }
                }
            }
        `;
        document.head.appendChild(style);
        console.log('[MobileAnimations] Styles injected');
    }

    /**
     * Setup IntersectionObserver for scroll-triggered animations
     */
    setupScrollAnimations() {
        const observerOptions = {
            root: null, // viewport
            threshold: 0.1, // Trigger when 10% visible
            rootMargin: '0px 0px -5% 0px' // Slight bottom offset
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add class with calculated delay
                    const delay = parseFloat(entry.target.dataset.scrollDelay) || 0;
                    entry.target.style.transitionDelay = `${delay * 0.2}s`;

                    // Small timeout for stagger effect
                    setTimeout(() => {
                        entry.target.classList.add('is-inview');
                    }, delay * 100);
                }
            });
        }, observerOptions);

        // Observe all scroll elements
        this.scrollElements.forEach(el => {
            // Skip hero elements - they should be visible immediately
            if (el.closest('.a-hero') || el.closest('.hero') || el.closest('.h-row')) {
                el.classList.add('is-inview');
                return;
            }
            observer.observe(el);
        });

        console.log('[MobileAnimations] Scroll observer active');
    }

    /**
     * Setup touch feedback for interactive elements
     */
    setupTouchFeedback() {
        this.interactiveElements.forEach(el => {
            el.addEventListener('touchstart', (e) => {
                el.classList.add('mobile-touch-active');
            }, { passive: true });

            el.addEventListener('touchend', () => {
                el.classList.remove('mobile-touch-active');
            }, { passive: true });

            el.addEventListener('touchcancel', () => {
                el.classList.remove('mobile-touch-active');
            }, { passive: true });
        });

        console.log('[MobileAnimations] Touch feedback active for', this.interactiveElements.length, 'elements');
    }

    /**
     * Setup lightweight parallax effect
     */
    setupParallax() {
        const handleScroll = () => {
            if (!this.ticking) {
                window.requestAnimationFrame(() => {
                    this.updateParallax();
                    this.ticking = false;
                });
                this.ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        console.log('[MobileAnimations] Parallax active for', this.parallaxElements.length, 'elements');
    }

    updateParallax() {
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;

        this.parallaxElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const speed = parseFloat(el.dataset.scrollSpeed) || 1;

            // Only animate if element is in viewport
            if (rect.bottom > 0 && rect.top < viewportHeight) {
                // Calculate parallax offset
                const centerOffset = rect.top + rect.height / 2 - viewportHeight / 2;
                const parallaxOffset = centerOffset * (speed * 0.08);

                // Apply subtle parallax
                el.style.transform = `translateY(${parallaxOffset}px)`;
            }
        });
    }

    /**
     * Hide "Rotate your device" overlay
     */
    hideRotateOverlay() {
        const rotateOverlay = document.querySelector('.rotate');
        if (rotateOverlay) {
            rotateOverlay.style.display = 'none';
            console.log('[MobileAnimations] Rotate overlay hidden');
        }
    }
}
