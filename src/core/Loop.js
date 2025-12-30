/**
 * Loop.js - Global RequestAnimationFrame Manager
 * 
 * Singleton pattern for centralized animation loop.
 * Replaces legacy RAFClass from inline scripts.
 */
class Loop {
    constructor() {
        this.callbacks = [];
        this.dt = 0.15;
        this.lastFrame = Date.now();
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
        
        // Execute all callbacks
        this.callbacks.forEach(item => {
            item.callback();
        });

        // Calculate delta time
        this.dt = Date.now() - this.lastFrame;
        this.lastFrame = Date.now();
    }
}

// Export singleton instance
const loop = new Loop();
export default loop;
export { Loop };
