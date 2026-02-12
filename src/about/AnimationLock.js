export default class AnimationLock {
  constructor(options = {}) {
    this.delayMs = options.delayMs || 2500;
    this.debounceMs = options.debounceMs || 150;
    this.selectors = options.selectors || [
      '[data-w-id="b84a4718-3d32-7794-986d-ff4584ed2164"]',
      '[data-w-id="32eaee09-4cf5-ec96-4bf0-c6da8ea3e53e"]',
      '[data-w-id="fade6d6e-aa5a-6018-b8be-75b18fa12882"]'
    ];

    this.completed = false;
    this.resizeTimer = null;

    this.onLoad = this.onLoad.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  init() {
    if (document.readyState === 'complete') {
      this.onLoad();
    } else {
      window.addEventListener('load', this.onLoad);
    }
    window.addEventListener('resize', this.onResize);
  }

  onLoad() {
    window.setTimeout(() => {
      this.completed = true;
    }, this.delayMs);
  }

  lockFinalStates() {
    this.selectors.forEach((selector) => {
      const element = document.querySelector(selector);
      if (!element) return;
      element.style.setProperty('opacity', '1', 'important');
    });
  }

  onResize() {
    if (!this.completed) return;
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.lockFinalStates();
    }, this.debounceMs);
  }

  destroy() {
    window.removeEventListener('load', this.onLoad);
    window.removeEventListener('resize', this.onResize);
    window.clearTimeout(this.resizeTimer);
  }
}
