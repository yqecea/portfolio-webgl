/**
 * MobileFix.js - Work-page mobile horizontal scroll controller.
 *
 * Keeps touch capture scoped to the work wrapper and avoids global gesture hijacking.
 */
export default class MobileFix {
  constructor(options = {}) {
    this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    this.wrapperSelector = options.wrapperSelector || '.sidescrollbox';
    this.scrollerSelector = options.scrollerSelector || '.scroller, .p-grid';
    this.sectionSelector = options.sectionSelector || '.p-col';

    this.wrapper = document.querySelector(this.wrapperSelector);
    this.scroller = document.querySelector(this.scrollerSelector);
    this.sections = Array.from(document.querySelectorAll(this.sectionSelector));

    this.scroll = {
      current: 0,
      target: 0,
      limit: 0,
      lastX: 0,
      lastY: 0,
      velocity: 0,
      isDragging: false
    };

    this.lerp = options.lerp || 0.12;
    this.multiplier = options.multiplier || 2.1;
    this.rafId = null;

    this.onResize = this.onResize.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.animate = this.animate.bind(this);

    if (!this.isMobile || !this.wrapper || !this.scroller) return;
    this.init();
  }

  init() {
    this.hideRotateOverlay();
    this.applyLayoutGuards();
    this.updateLimit();

    window.addEventListener('resize', this.onResize);
    this.wrapper.addEventListener('wheel', this.onWheel, { passive: false });
    this.wrapper.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.wrapper.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.wrapper.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.wrapper.addEventListener('touchcancel', this.onTouchEnd, { passive: false });

    this.rafId = window.requestAnimationFrame(this.animate);
  }

  hideRotateOverlay() {
    const rotateOverlay = document.querySelector('.rotate');
    if (rotateOverlay) {
      rotateOverlay.style.display = 'none';
    }
  }

  applyLayoutGuards() {
    this.wrapper.style.overflow = 'hidden';
    this.wrapper.style.width = '100vw';
    this.wrapper.style.height = '100vh';
    this.wrapper.style.touchAction = 'none';
    this.wrapper.style.overscrollBehavior = 'contain';

    this.scroller.style.display = 'flex';
    this.scroller.style.flexDirection = 'row';
    this.scroller.style.flexWrap = 'nowrap';
    this.scroller.style.willChange = 'transform';
  }

  onResize() {
    this.updateLimit();
  }

  updateLimit() {
    const contentWidth = this.scroller.scrollWidth;
    const viewportWidth = this.wrapper.clientWidth || window.innerWidth;
    this.scroll.limit = Math.max(0, contentWidth - viewportWidth);
    this.clampTarget();
    this.scroll.current = Math.max(0, Math.min(this.scroll.current, this.scroll.limit));
  }

  clampTarget() {
    this.scroll.target = Math.max(0, Math.min(this.scroll.target, this.scroll.limit));
  }

  shouldIgnorePointerEvent(target) {
    if (!target || typeof target.closest !== 'function') return false;
    if (document.querySelector('.nav-trigger.on')) return true;

    return Boolean(
      target.closest(
        '.nav, .nav-trigger, .burgerclickablein, .burgerclickableout, .soundtoggler, .menu, .menulink, .nav-logo'
      )
    );
  }

  onWheel(event) {
    if (!this.wrapper.contains(event.target)) return;
    if (this.shouldIgnorePointerEvent(event.target)) return;

    event.preventDefault();
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    this.scroll.target += delta;
    this.clampTarget();
  }

  onTouchStart(event) {
    if (!event.touches || !event.touches.length) return;
    if (this.shouldIgnorePointerEvent(event.target)) return;

    this.scroll.isDragging = true;
    this.scroll.lastX = event.touches[0].clientX;
    this.scroll.lastY = event.touches[0].clientY;
    this.scroll.velocity = 0;
  }

  onTouchMove(event) {
    if (!this.scroll.isDragging) return;
    if (!event.touches || !event.touches.length) return;
    if (this.shouldIgnorePointerEvent(event.target)) return;

    event.preventDefault();

    const x = event.touches[0].clientX;
    const y = event.touches[0].clientY;
    const deltaY = this.scroll.lastY - y;
    const deltaX = this.scroll.lastX - x;
    const dominantDelta = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;

    if (Math.abs(dominantDelta) > 0.5) {
      const adjusted = dominantDelta * this.multiplier;
      this.scroll.target += adjusted;
      this.scroll.velocity = adjusted;
      this.clampTarget();
    }

    this.scroll.lastX = x;
    this.scroll.lastY = y;
  }

  onTouchEnd() {
    if (!this.scroll.isDragging) return;
    this.scroll.isDragging = false;

    if (Math.abs(this.scroll.velocity) > 4) {
      this.scroll.target += this.scroll.velocity * 5;
      this.clampTarget();
    }

    this.snapToNearestSection();
  }

  snapToNearestSection() {
    if (!this.sections.length) return;

    const sectionWidth =
      this.sections[0].getBoundingClientRect().width || this.wrapper.clientWidth || window.innerWidth;
    if (!sectionWidth) return;

    const maxIndex = Math.max(0, this.sections.length - 1);
    const nextIndex = Math.round(this.scroll.target / sectionWidth);
    const clampedIndex = Math.max(0, Math.min(nextIndex, maxIndex));

    this.scroll.target = clampedIndex * sectionWidth;
    this.clampTarget();
  }

  animate() {
    this.scroll.current += (this.scroll.target - this.scroll.current) * this.lerp;

    if (Math.abs(this.scroll.target - this.scroll.current) < 0.05) {
      this.scroll.current = this.scroll.target;
    }

    this.scroller.style.transform = `translate3d(-${this.scroll.current.toFixed(2)}px, 0, 0)`;
    this.rafId = window.requestAnimationFrame(this.animate);
  }

  getProgress() {
    if (this.scroll.limit === 0) return 0;
    return this.scroll.current / this.scroll.limit;
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    if (this.wrapper) {
      this.wrapper.removeEventListener('wheel', this.onWheel);
      this.wrapper.removeEventListener('touchstart', this.onTouchStart);
      this.wrapper.removeEventListener('touchmove', this.onTouchMove);
      this.wrapper.removeEventListener('touchend', this.onTouchEnd);
      this.wrapper.removeEventListener('touchcancel', this.onTouchEnd);
    }
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
