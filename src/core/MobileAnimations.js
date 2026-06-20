/**
 * MobileAnimations.js - lightweight responsive viewport/touch effects.
 *
 * This module is intentionally conservative so it does not create
 * cross-page layout or interaction side effects.
 */
export default class MobileAnimations {
  constructor(options = {}) {
    this.maxWidth = options.maxWidth || 1199;
    this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.isResponsiveViewport = window.matchMedia(`(max-width: ${this.maxWidth}px)`).matches;
    if (!options.force && !this.isMobile && !this.isResponsiveViewport) return;

    this.fallbackSelector =
      options.fallbackSelector ||
      '.c-title, .c-item, .c-inner, .c-head, .c-block, .c-row, .c-link-w, .c-email-w, .social-col, .c-list, .c-sub, .contact .c-col';
    this.extraSelector =
      options.extraSelector ||
      '.hero .h-block, .hero .h-quote-w, .hero .h-start-w, .a-logo, .a-icon-w';
    this.interactiveSelector =
      options.interactiveSelector || 'a, button, .menu-li, .menu-ti, .c-link, .submit';

    this.scrollElements = Array.from(document.querySelectorAll('[data-scroll]'));
    if (!this.scrollElements.length) {
      const fallbackElements = Array.from(document.querySelectorAll(this.fallbackSelector));
      fallbackElements.forEach((el) => el.setAttribute('data-scroll-fallback', ''));
      this.scrollElements = fallbackElements;
    }
    const extraElements = Array.from(document.querySelectorAll(this.extraSelector));
    extraElements.forEach((el) => el.setAttribute('data-scroll-fallback', ''));
    this.scrollElements = Array.from(new Set([...this.scrollElements, ...extraElements]));

    this.interactiveElements = Array.from(document.querySelectorAll(this.interactiveSelector));
    this.observer = null;
    this.styleNode = null;
    this.boundTouchStart = this.onTouchStart.bind(this);
    this.boundTouchEnd = this.onTouchEnd.bind(this);

    if (!this.scrollElements.length && !this.interactiveElements.length) {
      this.hideRotateOverlay();
      return;
    }

    this.init();
  }

  init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.scrollElements.forEach((element) => {
        element.classList.add('is-inview');
      });
      this.hideRotateOverlay();
      return;
    }

    this.injectStyles();
    this.setupScrollAnimations();
    this.setupTouchFeedback();
    this.hideRotateOverlay();
  }

  injectStyles() {
    const existing = document.getElementById('mobile-animations-css');
    if (existing) {
      this.styleNode = existing;
      return;
    }

    const style = document.createElement('style');
    style.id = 'mobile-animations-css';
    style.textContent = `
      @media (max-width: ${this.maxWidth}px) {
        [data-scroll],
        [data-scroll-fallback] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.55s ease, transform 0.55s ease;
          will-change: opacity, transform;
        }

        [data-scroll].is-inview,
        [data-scroll-fallback].is-inview {
          opacity: 1;
          transform: none;
        }

        .mobile-touch-active {
          transform: scale(0.98) !important;
          opacity: 0.9 !important;
          transition: transform 0.12s ease, opacity 0.12s ease !important;
        }
      }
    `;

    document.head.appendChild(style);
    this.styleNode = style;
  }

  setupScrollAnimations() {
    if (!this.scrollElements.length) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          this.revealElement(entry.target);
          this.observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        threshold: 0.12,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    window.requestAnimationFrame(() => {
      this.scrollElements.forEach((element) => {
        this.prepareElement(element);
        this.observer.observe(element);
      });
      window.setTimeout(() => {
        document.querySelectorAll('.hero [data-scroll-fallback], .hero .h-head, .a-hero [data-scroll-fallback]').forEach((element) => {
          this.revealElement(element);
        });
      }, 260);
    });
  }

  prepareElement(element) {
    if (!element || element.closest('.load')) return;
    element.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    element.style.opacity = '0';
    element.style.transform = 'translate3d(0, 24px, 0)';
    element.style.willChange = 'opacity, transform';
  }

  revealElement(element) {
    element.classList.add('is-inview');
    element.style.opacity = '1';
    element.style.transform = 'none';
    element.style.willChange = 'auto';
    element.querySelectorAll('[data-w-id], .h-head').forEach((child) => {
      child.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
      child.style.opacity = '1';
      child.style.transform = 'none';
      child.style.willChange = 'auto';
    });
  }

  setupTouchFeedback() {
    if (!this.interactiveElements.length) return;
    this.interactiveElements.forEach((element) => {
      element.addEventListener('touchstart', this.boundTouchStart, { passive: true });
      element.addEventListener('touchend', this.boundTouchEnd, { passive: true });
      element.addEventListener('touchcancel', this.boundTouchEnd, { passive: true });
    });
  }

  onTouchStart(event) {
    const element = event.currentTarget;
    element.classList.add('mobile-touch-active');
  }

  onTouchEnd(event) {
    const element = event.currentTarget;
    element.classList.remove('mobile-touch-active');
  }

  hideRotateOverlay() {
    const rotateOverlay = document.querySelector('.rotate');
    if (rotateOverlay) {
      rotateOverlay.style.display = 'none';
    }
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.interactiveElements.forEach((element) => {
      element.removeEventListener('touchstart', this.boundTouchStart);
      element.removeEventListener('touchend', this.boundTouchEnd);
      element.removeEventListener('touchcancel', this.boundTouchEnd);
    });
  }
}
