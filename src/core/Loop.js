/**
 * Loop.js - Global RequestAnimationFrame Manager
 * 
 * Singleton pattern for centralized animation loop.
 * Replaces legacy RAFClass from inline scripts.
 */
class Loop {
    constructor() {
        this.callbacks = [];
        this.dt = 16.67; // Default to ~60fps
        this.lastFrame = performance.now();
        this.isRunning = false;
        
        this.render = this.render.bind(this);
    }

    /**
     * Subscribe a callback to the render loop
     * @param {string} name - Unique identifier for the callback
     * @param {Function} callback - Function to call each frame
     */
    subscribe(name, callback) {
        // Prevent duplicate subscriptions
        if (this.callbacks.find(item => item.name === name)) return;
        
        this.callbacks.push({
            name: name,
            callback: callback
        });
    }

    /**
     * Unsubscribe a callback from the render loop
     * @param {string} name - Identifier of the callback to remove
     */
    unsubscribe(name) {
        this.callbacks = this.callbacks.filter(item => item.name !== name);
    }

    /**
     * Start the animation loop
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastFrame = performance.now();
        requestAnimationFrame(this.render);
    }

    /**
     * Stop the animation loop
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Main render loop - executes all subscribed callbacks
     */
    render(timestamp) {
        if (!this.isRunning) return;
        
        requestAnimationFrame(this.render);

        // Ensure timestamp is valid (fallback for manual calls)
        if (!timestamp) timestamp = performance.now();

        // Calculate delta time
        this.dt = Math.max(0, timestamp - this.lastFrame);
        this.lastFrame = timestamp;
        
        // Execute all callbacks
        this.callbacks.forEach(item => {
            item.callback();
        });
    }
}

// Export singleton instance
const loop = new Loop();
export default loop;
export { Loop };
