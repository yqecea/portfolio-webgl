export default class MobileWorkScrollGuard {
  constructor(options = {}) {
    this.cardSelector = options.cardSelector || 'body[data-page="work"] .p-col.pagelink';
    this.mobileQuery = options.mobileQuery || '(pointer: coarse), (max-width: 991px)';
    this.cards = [];
    this.index = 0;
    this.controls = null;

    this.onPrev = this.onPrev.bind(this);
    this.onNext = this.onNext.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  init() {
    if (document.body?.dataset?.page !== 'work') return false;
    if (!window.matchMedia(this.mobileQuery).matches) return false;

    this.wrapper = document.querySelector('body[data-page="work"] .sidescrollbox');
    this.grid = document.querySelector('body[data-page="work"] .p-grid.scroller');
    this.cards = Array.from(document.querySelectorAll(this.cardSelector));
    if (!this.wrapper || !this.grid || !this.cards.length) return false;

    this.buildControls();
    document.body.classList.add('mobile-work-carousel-active');
    this.applyCarouselLayout();
    this.goTo(0, { animate: false });

    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    return true;
  }

  buildControls() {
    if (this.controls) return;

    const controls = document.createElement('div');
    controls.className = 'mobile-work-controls';
    controls.innerHTML = `
      <button class="mobile-work-arrow" type="button" data-dir="prev" aria-label="Previous project">
        <span>Prev</span>
        <span aria-hidden="true">&larr;</span>
      </button>
      <div class="mobile-work-dots" aria-label="Choose project"></div>
      <button class="mobile-work-arrow" type="button" data-dir="next" aria-label="Next project">
        <span>Next</span>
        <span aria-hidden="true">&rarr;</span>
      </button>
    `;

    const dots = controls.querySelector('.mobile-work-dots');
    this.cards.forEach((_, index) => {
      const button = document.createElement('button');
      button.className = 'mobile-work-dot';
      button.type = 'button';
      button.textContent = String(index + 1);
      button.setAttribute('aria-label', `Show project ${index + 1}`);
      button.addEventListener('click', () => this.goTo(index));
      dots.appendChild(button);
    });

    controls.querySelector('[data-dir="prev"]').addEventListener('click', this.onPrev);
    controls.querySelector('[data-dir="next"]').addEventListener('click', this.onNext);
    document.body.appendChild(controls);
    this.controls = controls;
  }

  applyCarouselLayout() {
    const html = document.documentElement;
    const body = document.body;
    const rotate = document.querySelector('body[data-page="work"] .rotate');

    Object.assign(html.style, {
      height: '100%',
      overflow: 'hidden'
    });

    Object.assign(body.style, {
      height: '100svh',
      minHeight: '100svh',
      overflow: 'hidden',
      touchAction: 'pan-y'
    });

    if (rotate) {
      rotate.style.display = 'none';
      rotate.style.pointerEvents = 'none';
    }

    Object.assign(this.wrapper.style, {
      position: 'relative',
      display: 'block',
      width: '100vw',
      height: '100svh',
      overflowX: 'hidden',
      overflowY: 'hidden',
      overscrollBehavior: 'contain',
      touchAction: 'pan-y'
    });

    Object.assign(this.grid.style, {
      position: 'relative',
      inset: 'auto',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      alignItems: 'stretch',
      gap: '0',
      width: `${this.cards.length * window.innerWidth}px`,
      height: '100%',
      minHeight: '0',
      padding: '74px 0 112px',
      overflow: 'visible',
      transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
      willChange: 'transform'
    });

    this.cards.forEach((card) => {
      Object.assign(card.style, {
        flex: `0 0 ${window.innerWidth}px`,
        width: `${window.innerWidth}px`,
        minWidth: `${window.innerWidth}px`,
        maxWidth: 'none',
        height: 'auto',
        minHeight: '0',
        maxHeight: 'none',
        margin: '0',
        padding: '0 18px',
        scrollSnapAlign: 'none',
        touchAction: 'pan-y'
      });
    });
  }

  goTo(index, options = {}) {
    this.index = Math.max(0, Math.min(index, this.cards.length - 1));
    if (options.animate === false) {
      this.grid.style.transition = 'none';
      window.requestAnimationFrame(() => {
        this.grid.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
      });
    }
    this.grid.style.transform = `translate3d(${-this.index * 100}vw, 0, 0)`;
    this.wrapper.scrollLeft = this.index * window.innerWidth;
    this.updateControls();
  }

  updateControls() {
    this.controls?.querySelectorAll('.mobile-work-dot').forEach((button, index) => {
      button.classList.toggle('is-active', index === this.index);
      button.setAttribute('aria-current', index === this.index ? 'true' : 'false');
    });

    this.cards.forEach((card, index) => {
      card.classList.toggle('is-mobile-active', index === this.index);
      card.classList.toggle('is-mobile-before', index < this.index);
      card.classList.toggle('is-mobile-after', index > this.index);
    });
  }

  onPrev() {
    this.goTo(this.index - 1);
  }

  onNext() {
    this.goTo(this.index + 1);
  }

  onResize() {
    this.applyCarouselLayout();
    this.goTo(this.index, { animate: false });
  }

  destroy() {
    document.body.classList.remove('mobile-work-carousel-active');
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    this.controls?.remove();
    this.controls = null;
  }
}
