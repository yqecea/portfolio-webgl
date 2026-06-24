export default class LenisSmoothScroll {
  constructor(options = {}) {
    this.page = document.body?.dataset?.page || 'home';
    this.parallaxSelector = options.parallaxSelector || '[data-scroll][data-scroll-speed]';
    this.lenis = null;
    this.ticker = null;
    this.rafId = null;
    this.parallaxItems = [];
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.onResize = this.onResize.bind(this);
    this.onBodyClassChange = this.onBodyClassChange.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.raf = this.raf.bind(this);
  }

  init() {
    if (this.reducedMotion || this.page === 'work') return false;
    if (typeof window.Lenis !== 'function') return false;

    this.collectParallaxItems();

    this.lenis = new window.Lenis({
      autoRaf: false,
      lerp: 0.1,
      wheelMultiplier: 1.0,
      touchMultiplier: 1,
      smoothWheel: true,
      syncTouch: true,
      gestureOrientation: 'vertical',
      anchors: true
    });

    this.lenis.on('scroll', this.onScroll);
    this.startTicker();
    this.observeMenuState();
    this.onScroll({ scroll: window.scrollY || 0 });

    window.addEventListener('resize', this.onResize);
    document.documentElement.classList.add('lenis-scroll-motion');
    window.lenisScroll = this.lenis;
    return true;
  }

  collectParallaxItems() {
    this.parallaxItems = Array.from(document.querySelectorAll(this.parallaxSelector))
      .filter((element) => !element.closest('.menu, .load, .rotate'))
      .map((element) => {
        const speed = Number(element.getAttribute('data-scroll-speed') || 0);
        const direction = element.getAttribute('data-scroll-direction') || 'vertical';
        element.style.willChange = 'transform';
        return { element, speed, direction };
      });
  }

  startTicker() {
    if (typeof window.gsap !== 'undefined') {
      this.ticker = (time) => this.lenis?.raf(time * 1000);
      window.gsap.ticker.add(this.ticker);
      window.gsap.ticker.lagSmoothing(0);
      return;
    }

    this.rafId = window.requestAnimationFrame(this.raf);
  }

  raf(time) {
    this.lenis?.raf(time);
    this.rafId = window.requestAnimationFrame(this.raf);
  }

  observeMenuState() {
    if (!document.body || typeof MutationObserver === 'undefined') return;

    this.bodyObserver = new MutationObserver(this.onBodyClassChange);
    this.bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
    this.onBodyClassChange();
  }

  onBodyClassChange() {
    if (!this.lenis) return;

    if (document.body.classList.contains('menu-open')) {
      this.lenis.stop();
    } else {
      this.lenis.start();
    }
  }

  onResize() {
    this.lenis?.resize();
    this.onScroll({ scroll: this.lenis?.animatedScroll || window.scrollY || 0 });
  }

  onScroll(event = {}) {
    if (!this.parallaxItems.length) return;

    const scroll = Number(event.scroll ?? window.scrollY ?? 0);
    const viewportCenter = window.innerHeight / 2;

    this.parallaxItems.forEach(({ element, speed, direction }) => {
      if (!speed || element.offsetParent === null) return;

      const rect = element.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const baseOffset = (viewportCenter - elementCenter) * speed * 0.032;
      const scrollDrift = scroll * speed * 0.006;
      const offset = Math.max(-240, Math.min(240, baseOffset + scrollDrift));
      const transform =
        direction === 'horizontal'
          ? `translate3d(${offset.toFixed(2)}px, 0, 0)`
          : `translate3d(0, ${offset.toFixed(2)}px, 0)`;

      element.style.transform = transform;
    });
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);

    if (this.ticker && typeof window.gsap !== 'undefined') {
      window.gsap.ticker.remove(this.ticker);
    }

    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.bodyObserver) {
      this.bodyObserver.disconnect();
      this.bodyObserver = null;
    }

    this.parallaxItems.forEach(({ element }) => {
      element.style.willChange = '';
      element.style.transform = '';
    });

    this.lenis?.destroy();
    this.lenis = null;
    if (window.lenisScroll) window.lenisScroll = null;
    document.documentElement.classList.remove('lenis-scroll-motion');
  }
}
