/**
 * main.js - Application Entry Point
 * 
 * Bootstraps all managers:
 * - MobileFix: MOBILE ONLY - handles scroll, gradient, animations
 * - WebGLApp: 3D sphere (both mobile and desktop)
 * - Menu: Burger menu (both mobile and desktop)
 * 
 * IMPORTANT: Desktop behavior is NOT modified by this module.
 */
import loop from './core/Loop.js';
import MobileFix from './core/MobileFix.js';
import WebGLApp from './webgl/WebGLApp.js';
import Menu from './ui/Menu.js';

class App {
    constructor() {
        this.mobileFix = null;
        this.webglApp = null;
        this.menu = null;
    }

    init() {
        console.log('[App] Initializing...');

        // Check if on mobile
        const isMobile = window.innerWidth <= 991 ||
            /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        // Initialize MobileFix (ONLY on mobile - handles scroll, gradient, animations)
        if (isMobile) {
            this.mobileFix = new MobileFix();
            console.log('[App] MobileFix initialized (mobile only)');
        } else {
            console.log('[App] Desktop detected, MobileFix skipped');
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
