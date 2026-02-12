export default class DesktopHorizontalScrollController {
  constructor(options = {}) {
    this.wrapperSelector = options.wrapperSelector || '.sidescrollbox';
    this.scrollerSelector = options.scrollerSelector || '.scroller, .p-grid';
    this.lerp = options.lerp || 0.08;

    this.wrapper = null;
    this.scroller = null;
    this.scrollX = 0;
    this.targetScrollX = 0;
    this.maxScroll = 0;

    this.rafId = null;

    this.onWheel = this.onWheel.bind(this);
    this.onResize = this.onResize.bind(this);
    this.animate = this.animate.bind(this);
  }

  init() {
    this.wrapper = document.querySelector(this.wrapperSelector);
    this.scroller = document.querySelector(this.scrollerSelector);

    if (!this.wrapper || !this.scroller) return false;

    this.wrapper.style.height = '100vh';
    this.wrapper.style.width = '100vw';
    this.wrapper.style.overflow = 'hidden';
    this.wrapper.style.overscrollBehavior = 'contain';

    this.scroller.style.display = 'flex';
    this.scroller.style.flexDirection = 'row';
    this.scroller.style.flexWrap = 'nowrap';
    this.scroller.style.height = '100%';

    this.updateLimit();

    this.wrapper.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('resize', this.onResize);

    this.animate();
    return true;
  }

  updateLimit() {
    this.maxScroll = Math.max(0, this.scroller.scrollWidth - window.innerWidth);
    this.targetScrollX = Math.min(this.targetScrollX, this.maxScroll);
    this.scrollX = Math.min(this.scrollX, this.maxScroll);
  }

  onResize() {
    this.updateLimit();
  }

  onWheel(event) {
    if (!this.wrapper.contains(event.target)) return;
    if (document.querySelector('.nav-trigger.on')) return;
    event.preventDefault();

    const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    this.targetScrollX += delta;
    this.targetScrollX = Math.max(0, Math.min(this.targetScrollX, this.maxScroll));
  }

  animate() {
    this.scrollX += (this.targetScrollX - this.scrollX) * this.lerp;
    this.scroller.style.transform = `translateX(-${this.scrollX}px)`;

    this.rafId = requestAnimationFrame(this.animate);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.wrapper) {
      this.wrapper.removeEventListener('wheel', this.onWheel);
    }
    window.removeEventListener('resize', this.onResize);
  }
}
