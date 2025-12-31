/**
 * ResizeManager.js - Centralized Debounced Resize Handler
 * 
 * Provides a single point for resize coordination across the app.
 * Uses debouncing to prevent excessive recalculations during rapid resize.
 */
class ResizeManager {
    constructor() {
        this.callbacks = [];
        this.debounceMs = 150;
        this.timeoutId = null;

        window.addEventListener('resize', () => this.onResize());
    }

    /**
     * Subscribe a callback to resize events
     * @param {string} name - Unique identifier
     * @param {Function} callback - Function to call on resize
     */
    subscribe(name, callback) {
        if (!this.callbacks.find(c => c.name === name)) {
            this.callbacks.push({ name, callback });
        }
    }

    /**
     * Unsubscribe a callback
     * @param {string} name - Identifier to remove
     */
    unsubscribe(name) {
        this.callbacks = this.callbacks.filter(c => c.name !== name);
    }

    /**
     * Internal resize handler with debouncing
     */
    onResize() {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => {
            this.callbacks.forEach(c => c.callback());
        }, this.debounceMs);
    }

    /**
     * Force immediate update (bypass debounce)
     */
    forceUpdate() {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.callbacks.forEach(c => c.callback());
    }
}

const resizeManager = new ResizeManager();
export default resizeManager;
