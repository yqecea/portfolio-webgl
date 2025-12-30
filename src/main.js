/**
 * main.js - Application Entry Point
 * 
 * Bootstraps all managers and starts the global animation loop.
 * This replaces the inline scripts in the legacy index.html.
 */
import loop from './core/Loop.js';
import ScrollManager from './core/ScrollManager.js';
import WebGLApp from './webgl/WebGLApp.js';
import Menu from './ui/Menu.js';

class App {
    constructor() {
        this.scrollManager = null;
        this.webglApp = null;
        this.menu = null;
    }

    init() {
        console.log('[App] Initializing...');

        // Initialize ScrollManager (Critical Mobile Fix)
        this.scrollManager = new ScrollManager();
        loop.subscribe('scrollUpdate', () => this.scrollManager.update());
        console.log('[App] ScrollManager initialized');

        // Initialize WebGL Sphere
        this.webglApp = new WebGLApp();
        this.webglApp.init();
        console.log('[App] WebGLApp initialized');

        // Initialize Menu
        this.menu = new Menu();
        console.log('[App] Menu initialized');

        // Start the animation loop
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
