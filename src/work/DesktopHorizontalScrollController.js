export default class DesktopHorizontalScrollController {
  constructor(options = {}) {
    this.wrapperSelector = options.wrapperSelector || '.sidescrollbox';
    this.scrollerSelector = options.scrollerSelector || '.scroller, .p-grid';
    this.desktopQuery = options.desktopQuery || '(min-width: 992px) and (pointer: fine)';
    this.lerp = options.lerp || 0.085;
    this.wheelMultiplier = options.wheelMultiplier || 1;

    this.wrapper = null;
    this.scroller = null;
    this.scrollX = 0;
    this.targetScrollX = 0;
    this.maxScroll = 0;
    this.rafId = null;
    this.media = matchMedia(this.desktopQuery);
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');

    this.onWheel = this.onWheel.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onResize = this.onResize.bind(this);
    this.animate = this.animate.bind(this);
  }

  init() {
    this.wrapper = document.querySelector(this.wrapperSelector);
    this.scroller = document.querySelector(this.scrollerSelector);

    if (!this.wrapper || !this.scroller) return false;

    this.media.addEventListener('change', () => {
      if (this.media.matches) this.activate();
      else this.destroy();
    });
    if (this.media.matches) this.activate();
    return true;
  }

  activate() {
    this.wrapper.classList.add('native-horizontal-scroll');
    this.wrapper.style.width = '100vw';
    this.wrapper.style.height = '100vh';
    this.wrapper.style.overflowX = 'hidden';
    this.wrapper.style.overflowY = 'hidden';
    this.wrapper.style.overscrollBehavior = 'contain';
    this.wrapper.style.webkitOverflowScrolling = 'touch';

    this.scroller.style.display = 'flex';
    this.scroller.style.flexDirection = 'row';
    this.scroller.style.flexWrap = 'nowrap';
    this.scroller.style.height = '100%';
    this.scroller.style.willChange = 'transform';

    this.wrapper.addEventListener('focusin', this.onFocus);
    this.wrapper.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('resize', this.onResize);

    this.onResize();
  }

  onResize() {
    this.maxScroll = Math.max(0, this.scroller.scrollWidth - window.innerWidth);
    this.targetScrollX = this.clamp(this.targetScrollX);
    this.scrollX = this.clamp(this.scrollX);
    this.applyTransform();
  }

  onWheel(event) {
    if (!this.wrapper.contains(event.target)) return;
    if (document.querySelector('.nav-trigger.on')) return;

    const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (!delta) return;

    event.preventDefault();
    this.targetScrollX = this.clamp(this.targetScrollX + delta * this.wheelMultiplier);
    if (this.motion.matches) {
      this.scrollX = this.targetScrollX;
      this.applyTransform();
    } else {
      this.start();
    }
  }

  onFocus(event) {
    const card = event.target.closest('.p-col');
    if (!card) return;

    // Browsers may scroll overflow:hidden wrappers when an offscreen link receives focus.
    const viewport = this.wrapper.getBoundingClientRect();
    const bounds = card.getBoundingClientRect();
    const offset = bounds.left < viewport.left
      ? bounds.left - viewport.left
      : Math.max(0, bounds.right - viewport.right);
    this.targetScrollX = this.clamp(this.scrollX + this.wrapper.scrollLeft + offset);
    this.scrollX = this.targetScrollX;
    this.wrapper.scrollLeft = 0;
    this.applyTransform();
  }

  start() {
    if (this.rafId) return;
    this.rafId = window.requestAnimationFrame(this.animate);
  }

  animate() {
    this.rafId = null;

    const diff = this.targetScrollX - this.scrollX;
    if (Math.abs(diff) < 0.25) {
      this.scrollX = this.targetScrollX;
      this.applyTransform();
      return;
    }

    this.scrollX += diff * this.lerp;
    this.applyTransform();
    this.start();
  }

  applyTransform() {
    if (!this.scroller) return;
    this.scroller.style.transform = `translate3d(${-this.scrollX.toFixed(2)}px, 0, 0)`;
  }

  resetInlineStyles() {
    if (this.wrapper) {
      this.wrapper.style.width = '';
      this.wrapper.style.height = '';
      this.wrapper.style.overflowX = '';
      this.wrapper.style.overflowY = '';
      this.wrapper.style.overscrollBehavior = '';
      this.wrapper.style.webkitOverflowScrolling = '';
    }

    if (this.scroller) {
      this.scroller.style.display = '';
      this.scroller.style.flexDirection = '';
      this.scroller.style.flexWrap = '';
      this.scroller.style.height = '';
      this.scroller.style.willChange = '';
      this.scroller.style.transform = '';
    }
  }

  clamp(value) {
    return Math.max(0, Math.min(value, this.maxScroll));
  }

  destroy() {
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.wrapper) {
      this.wrapper.removeEventListener('wheel', this.onWheel);
      this.wrapper.removeEventListener('focusin', this.onFocus);
      this.wrapper.classList.remove('native-horizontal-scroll');
    }
    window.removeEventListener('resize', this.onResize);
    this.resetInlineStyles();
  }
}
