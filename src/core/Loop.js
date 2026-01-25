/**
 * Loop.js - Global RequestAnimationFrame Manager
 * 
 * Singleton pattern for centralized animation loop.
 * Replaces legacy RAFClass from inline scripts.
 */
class Loop {
    constructor() {
        this.callbacks = [];
        this.dt = 16.66; // Default to ~60fps frame time (ms)
        this.lastFrame = 0;
        this.isRunning = false;
        this.elapsedTime = 0;
        
        this.render = this.render.bind(this);
    }

    /**
     * Subscribe a callback to the render loop
     * @param {string} name - Unique identifier for the callback
     * @param {Function} callback - Function to call each frame. Receives (dt, elapsedTime).
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
        this.render();
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
    render() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(this.render);
        
        const now = performance.now();
        this.dt = now - this.lastFrame;

        // Clamp dt to avoid huge jumps (e.g. max 100ms)
        if (this.dt > 100) this.dt = 100;

        this.lastFrame = now;
        this.elapsedTime += this.dt;

        // Execute all callbacks
        this.callbacks.forEach(item => {
            item.callback(this.dt, this.elapsedTime);
        });
    }
}

// Export singleton instance
const loop = new Loop();
export default loop;
export { Loop };
