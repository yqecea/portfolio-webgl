export default class NativeScrollMotion {
  constructor(options = {}) {
    this.revealSelector =
      options.revealSelector ||
      '.c-title, .c-item, .c-inner, .c-head, .c-block, .c-row, .c-link-w, .c-email-w, .social-col, .c-list, .c-sub, .contact .c-col';
    this.interactiveSelector = options.interactiveSelector || 'a, button, .menu-li, .menu-ti, .c-link, .submit';

    this.observer = null;
    this.revealElements = [];
    this.interactiveElements = [];
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
  }

  init() {
    document.documentElement.classList.add('native-scroll-motion');
    this.hideRotateOverlay();
    this.setupReveals();
    this.setupTouchFeedback();
    return true;
  }

  setupReveals() {
    this.revealElements = Array.from(document.querySelectorAll(this.revealSelector)).filter(
      (element) => !this.shouldSkipReveal(element)
    );

    if (!this.revealElements.length) return;

    if (this.reducedMotion || typeof IntersectionObserver === 'undefined') {
      this.revealElements.forEach((element) => this.revealNow(element));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          this.revealElement(entry.target);
          this.observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -8% 0px'
      }
    );

    window.requestAnimationFrame(() => {
      this.revealElements.forEach((element) => {
        if (this.isInitiallyVisible(element)) {
          this.revealNow(element);
          return;
        }

        this.prepareElement(element);
        this.observer.observe(element);
      });
    });
  }

  shouldSkipReveal(element) {
    if (!element || !(element instanceof Element)) return true;
    if (element.closest('.load, .menu, .nav, .webglholder, .rotate')) return true;
    if (document.body?.dataset?.page === 'home' && element.closest('.hero')) return true;
    return false;
  }

  isInitiallyVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
  }

  prepareElement(element) {
    if (typeof gsap === 'undefined') {
      element.classList.add('is-inview');
      return;
    }

    gsap.killTweensOf(element);
    gsap.set(element, {
      opacity: 0,
      y: 18,
      force3D: true,
      willChange: 'opacity, transform'
    });
  }

  revealElement(element) {
    element.classList.add('is-inview');

    if (typeof gsap === 'undefined') {
      this.revealNow(element);
      return;
    }

    gsap.killTweensOf(element);
    gsap.to(element, {
      opacity: 1,
      y: 0,
      duration: 0.42,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'opacity,transform,willChange'
    });
  }

  revealNow(element) {
    element.classList.add('is-inview');
    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf(element);
      gsap.set(element, { opacity: 1, y: 0, clearProps: 'opacity,transform,willChange' });
      return;
    }

    element.style.opacity = '';
    element.style.transform = '';
    element.style.willChange = '';
  }

  setupTouchFeedback() {
    this.interactiveElements = Array.from(document.querySelectorAll(this.interactiveSelector));
    this.interactiveElements.forEach((element) => {
      element.addEventListener('touchstart', this.onTouchStart, { passive: true });
      element.addEventListener('touchend', this.onTouchEnd, { passive: true });
      element.addEventListener('touchcancel', this.onTouchEnd, { passive: true });
    });
  }

  onTouchStart(event) {
    event.currentTarget?.classList.add('native-touch-active');
  }

  onTouchEnd(event) {
    event.currentTarget?.classList.remove('native-touch-active');
  }

  hideRotateOverlay() {
    const rotateOverlay = document.querySelector('.rotate');
    if (rotateOverlay) rotateOverlay.style.display = 'none';
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.interactiveElements.forEach((element) => {
      element.removeEventListener('touchstart', this.onTouchStart);
      element.removeEventListener('touchend', this.onTouchEnd);
      element.removeEventListener('touchcancel', this.onTouchEnd);
    });

    document.documentElement.classList.remove('native-scroll-motion');
  }
}
