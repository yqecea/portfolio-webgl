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
        this.isPiggybacking = false;
        
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

        // Reset lastFrame to prevent large delta time on start
        this.lastFrame = Date.now();

        // Performance Optimization:
        // If legacy RAFClass loop is running globally, reuse it instead of starting a second loop.
        // This consolidates all animations into a single requestAnimationFrame cycle.
        if (window.RAF && typeof window.RAF.subscribe === 'function') {
            console.log('⚡ Bolt: Consolidating animation loops (piggybacking on legacy RAF)');
            window.RAF.subscribe('BoltModernLoop', () => {
                // Update delta time BEFORE callbacks so they have fresh timing data
                const now = Date.now();
                this.dt = now - this.lastFrame;
                this.lastFrame = now;

                // Execute all callbacks
                this.callbacks.forEach(item => {
                    item.callback();
                });
            });
            this.isRunning = true;
            this.isPiggybacking = true;
            return;
        }

        this.isRunning = true;
        this.render();
    }

    /**
     * Stop the animation loop
     */
    stop() {
        this.isRunning = false;

        if (this.isPiggybacking && window.RAF && typeof window.RAF.unsubscribe === 'function') {
            window.RAF.unsubscribe('BoltModernLoop');
            this.isPiggybacking = false;
        }
    }

    /**
     * Main render loop - executes all subscribed callbacks
     */
    render() {
        if (!this.isRunning || this.isPiggybacking) return;
        
        requestAnimationFrame(this.render);
        
        // Update delta time
        const now = Date.now();
        this.dt = now - this.lastFrame;
        this.lastFrame = now;

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
