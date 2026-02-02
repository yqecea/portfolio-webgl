/**
 * main.js - Application Entry Point
 * 
 * Bootstraps all managers:
 * - MobileFix: MOBILE ONLY - handles horizontal scroll for Work page
 * - MobileAnimations: MOBILE ONLY - scroll animations for ALL pages
 * - WebGLApp: 3D sphere (both mobile and desktop)
 * - Menu: Burger menu (both mobile and desktop)
 * 
 * IMPORTANT: Desktop behavior is NOT modified by this module.
 */
import loop from './core/Loop.js';
import resizeManager from './core/ResizeManager.js';
import MobileFix from './core/MobileFix.js';
import MobileAnimations from './core/MobileAnimations.js';
import WebGLApp from './webgl/WebGLApp.js';
import Menu from './ui/Menu.js';

class App {
    constructor() {
        this.mobileFix = null;
        this.mobileAnimations = null;
        this.webglApp = null;
        this.menu = null;
    }

    init() {
        console.log('[App] Initializing...');

        // Check if on mobile (User-Agent ONLY - not width-based)
        // This prevents false positives when resizing desktop browser window
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        // Expose to window for legacy scripts and CSS override
        window.isMobileDevice = isMobile;


        // DESKTOP FIX: Hide the "Rotate your device" overlay
        // CSS shows it via media query at narrow widths, but we hide it on desktop
        if (!isMobile) {
            const rotateOverlay = document.querySelector('.rotate');
            if (rotateOverlay) {
                rotateOverlay.style.display = 'none';
                console.log('[App] Desktop: Rotate overlay hidden');
            }

            // DESKTOP FIX: Force correct height for sidescrollbox at narrow widths
            // CSS media query sets height:100% which breaks layout
            const sidescrollbox = document.querySelector('.sidescrollbox');
            if (sidescrollbox) {
                sidescrollbox.style.height = '100vh';
                sidescrollbox.style.width = '100vw';
                sidescrollbox.style.overflow = 'hidden';
                console.log('[App] Desktop: sidescrollbox layout fixed');

                // Also fix scroller layout
                const scroller = document.querySelector('.scroller, .p-grid');
                if (scroller) {
                    scroller.style.display = 'flex';
                    scroller.style.flexDirection = 'row';
                    scroller.style.flexWrap = 'nowrap';
                    scroller.style.height = '100%';

                    // Smooth horizontal scroll with lerp interpolation
                    let scrollX = 0;
                    let targetScrollX = 0;
                    let maxScroll = Math.max(0, scroller.scrollWidth - window.innerWidth);
                    const lerp = 0.08; // Smoothness factor (0-1, lower = smoother)

                    // Animation loop for smooth scrolling
                    // Optimized: Subscribe to central Loop and use early return
                    loop.subscribe('desktopScrollAnimation', () => {
                        const diff = targetScrollX - scrollX;

                        // Performance: Skip DOM updates if movement is negligible
                        if (Math.abs(diff) < 0.1) return;

                        // Lerp toward target
                        scrollX += diff * lerp;

                        // Apply transform
                        scroller.style.transform = `translateX(-${scrollX}px)`;
                    });

                    // Subscribe to resize events to recalculate maxScroll
                    resizeManager.subscribe('desktopScroll', () => {
                        maxScroll = Math.max(0, scroller.scrollWidth - window.innerWidth);
                        targetScrollX = Math.min(targetScrollX, maxScroll); // Clamp target to new bounds
                        scrollX = Math.min(scrollX, maxScroll); // Also clamp current position
                        console.log('[App] Desktop scroll updated, maxScroll:', maxScroll);
                    });

                    window.addEventListener('wheel', (e) => {
                        if (!sidescrollbox.contains(e.target)) return;
                        e.preventDefault();

                        // Update target (not current position) for smooth scroll
                        targetScrollX += e.deltaY;
                        targetScrollX = Math.max(0, Math.min(targetScrollX, maxScroll));
                    }, { passive: false });

                    console.log('[App] Desktop: Smooth horizontal scroll enabled for Work section');
                }
            }
        }

        // Initialize MobileFix (ONLY for Work page with horizontal scroll)
        if (isMobile) {
            this.mobileFix = new MobileFix();
            console.log('[App] MobileFix initialized (mobile only)');
        } else {
            console.log('[App] Desktop detected, MobileFix skipped');
        }

        // Initialize MobileAnimations (for ALL pages on mobile)
        if (isMobile) {
            this.mobileAnimations = new MobileAnimations();
            console.log('[App] MobileAnimations initialized (mobile only)');
        }

        // Initialize WebGL Sphere (both mobile and desktop, if container exists)
        const webglContainer = document.querySelector('.webglholder');
        if (webglContainer) {
            this.webglApp = new WebGLApp();
            this.webglApp.init();
            console.log('[App] WebGLApp initialized');
        }

        // Initialize Menu (both mobile and desktop)
        const menuContainer = document.querySelector('.burgercontainer');
        if (menuContainer) {
            this.menu = new Menu();
            console.log('[App] Menu initialized');
        }

        // Start the animation loop (for WebGL)
        loop.start();
        console.log('[App] Loop started');
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new App();
        app.init();
    });
} else {
    const app = new App();
    app.init();
}

export default App;
