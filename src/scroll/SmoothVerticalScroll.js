export default class SmoothVerticalScroll {
  constructor(options = {}) {
    this.ease = options.ease || 0.14;
    this.maxDelta = options.maxDelta || 900;
    this.parallaxSelector = options.parallaxSelector || '[data-scroll][data-scroll-speed]';

    this.currentY = window.scrollY || 0;
    this.targetY = this.currentY;
    this.maxScroll = 0;
    this.raf = null;
    this.isAnimating = false;
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.parallaxItems = [];

    this.onWheel = this.onWheel.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.onResize = this.onResize.bind(this);
    this.animate = this.animate.bind(this);
  }

  init() {
    if (this.isReducedMotion) return false;

    this.collectParallaxItems();
    this.updateBounds();
    this.applyParallax();

    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeydown);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize);

    document.documentElement.classList.add('smooth-vertical-scroll');
    return true;
  }

  collectParallaxItems() {
    this.parallaxItems = Array.from(document.querySelectorAll(this.parallaxSelector))
      .filter((element) => !element.classList.contains('a-over'))
      .map((element) => {
        element.style.willChange = 'transform';
        return {
          element,
          speed: Number(element.getAttribute('data-scroll-speed') || 0),
          direction: element.getAttribute('data-scroll-direction') || 'vertical'
        };
      });
  }

  updateBounds() {
    this.maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
      document.body.scrollHeight - window.innerHeight
    );
    this.targetY = this.clamp(this.targetY);
    this.currentY = this.clamp(this.currentY);
  }

  onWheel(event) {
    if (event.ctrlKey || event.defaultPrevented || this.shouldAllowNativeScroll(event.target)) return;

    this.updateBounds();
    if (this.maxScroll <= 0) return;

    event.preventDefault();
    const delta = Math.max(-this.maxDelta, Math.min(this.maxDelta, event.deltaY));
    this.targetY = this.clamp(this.targetY + delta);
    this.start();
  }

  onKeydown(event) {
    if (event.defaultPrevented || this.shouldAllowNativeScroll(event.target)) return;

    const keyDeltas = {
      ArrowDown: 90,
      ArrowUp: -90,
      PageDown: window.innerHeight * 0.85,
      PageUp: -window.innerHeight * 0.85,
      Home: -Infinity,
      End: Infinity,
      ' ': event.shiftKey ? -window.innerHeight * 0.85 : window.innerHeight * 0.85
    };

    if (!(event.key in keyDeltas)) return;
    event.preventDefault();
    this.updateBounds();

    const delta = keyDeltas[event.key];
    if (delta === Infinity) {
      this.targetY = this.maxScroll;
    } else if (delta === -Infinity) {
      this.targetY = 0;
    } else {
      this.targetY = this.clamp(this.targetY + delta);
    }

    this.start();
  }

  onScroll() {
    if (this.isAnimating) return;
    this.currentY = window.scrollY || 0;
    this.targetY = this.currentY;
    this.applyParallax();
  }

  onResize() {
    this.updateBounds();
    this.applyParallax();
  }

  shouldAllowNativeScroll(target) {
    const element = target instanceof Element ? target : null;
    if (!element) return false;

    const scrollable = element.closest('textarea, select, [data-native-scroll]');
    if (!scrollable) return false;

    return scrollable.scrollHeight > scrollable.clientHeight;
  }

  start() {
    if (this.raf) return;
    this.raf = window.requestAnimationFrame(this.animate);
  }

  animate() {
    this.raf = null;
    this.isAnimating = true;

    const diff = this.targetY - this.currentY;
    if (Math.abs(diff) < 0.45) {
      this.currentY = this.targetY;
    } else {
      this.currentY += diff * this.ease;
    }

    window.scrollTo(0, this.currentY);
    this.applyParallax();

    if (Math.abs(this.targetY - this.currentY) >= 0.45) {
      this.raf = window.requestAnimationFrame(this.animate);
      return;
    }

    this.isAnimating = false;
  }

  applyParallax() {
    if (!this.parallaxItems.length) return;

    const viewportCenter = window.innerHeight / 2;
    this.parallaxItems.forEach(({ element, speed, direction }) => {
      if (!speed) return;
      const rect = element.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const offset = (viewportCenter - elementCenter) * speed * 0.035;
      const transform =
        direction === 'horizontal'
          ? `translate3d(${offset.toFixed(2)}px, 0, 0)`
          : `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      element.style.transform = transform;
    });
  }

  clamp(value) {
    return Math.max(0, Math.min(this.maxScroll, value));
  }

  destroy() {
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeydown);
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    if (this.raf) window.cancelAnimationFrame(this.raf);
    this.parallaxItems.forEach(({ element }) => {
      element.style.willChange = 'auto';
      element.style.transform = '';
    });
    document.documentElement.classList.remove('smooth-vertical-scroll');
  }
}
