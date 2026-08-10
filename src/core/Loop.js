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

// ⚡ Bolt Optimization: Hijack legacy RAF loop to prevent double-execution
// The legacy RAFClass (in inline scripts) starts its own loop. We merge it here.
if (typeof window !== 'undefined' && window.RAF) {
    console.log('⚡ [Bolt] Optimizing: Hijacking legacy RAF loop');

    // 1. Migrate existing legacy callbacks
    if (window.RAF.callbacks && window.RAF.callbacks.length > 0) {
        window.RAF.callbacks.forEach(item => {
            loop.subscribe(item.name, item.callback);
        });
        // Clear to avoid double-run during transition
        window.RAF.callbacks = [];
    }

    // 2. Kill the legacy loop
    // Overwriting render with no-op stops the NEXT frame from scheduling a new one
    // (Existing frame in queue will run once, call this no-op, and stop)
    window.RAF.render = () => {};

    // 3. Redirect future subscriptions to the central loop
    window.RAF.subscribe = (name, callback) => loop.subscribe(name, callback);

    // 4. Fix the bug in legacy unsubscribe (and redirect to central loop)
    window.RAF.unsubscribe = (name) => loop.unsubscribe(name);

    // 5. Sync 'dt' property because legacy scripts read RAF.dt
    Object.defineProperty(window.RAF, 'dt', {
        get: () => loop.dt
    });
}

export default loop;
export { Loop };
