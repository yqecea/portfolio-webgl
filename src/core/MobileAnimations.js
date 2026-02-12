/**
 * MobileAnimations.js - lightweight mobile-only viewport/touch effects.
 *
 * This module is intentionally conservative so it does not create
 * cross-page layout or interaction side effects.
 */
export default class MobileAnimations {
  constructor(options = {}) {
    this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!this.isMobile) return;

    this.fallbackSelector =
      options.fallbackSelector ||
      '.c-title, .c-item, .c-inner, .c-head, .c-block, .c-row, .c-link-w, .c-email-w, .social-col, .c-list, .c-sub, .cr-inner, .credits .c-row, .contact .c-col';
    this.interactiveSelector =
      options.interactiveSelector || 'a, button, .menu-li, .menu-ti, .c-link, .submit';

    this.scrollElements = Array.from(document.querySelectorAll('[data-scroll]'));
    if (!this.scrollElements.length) {
      const fallbackElements = Array.from(document.querySelectorAll(this.fallbackSelector));
      fallbackElements.forEach((el) => el.setAttribute('data-scroll-fallback', ''));
      this.scrollElements = fallbackElements;
    }

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
      @media (max-width: 991px) {
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
          entry.target.classList.add('is-inview');
          this.observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        threshold: 0.12,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    this.scrollElements.forEach((element) => {
      if (element.closest('.a-hero') || element.closest('.hero') || element.closest('.h-row')) {
        element.classList.add('is-inview');
        return;
      }
      this.observer.observe(element);
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
