export default class LocomotiveBridge {
  constructor(options = {}) {
    this.minWidth = options.minWidth || 991;
    this.containerSelector = options.containerSelector || '[data-scroll-container]';
    this.parazoomSelector = options.parazoomSelector || '.parazoom';

    this.instance = null;
    this.items = [];

    this.onResize = this.onResize.bind(this);
  }

  init() {
    if (window.innerWidth < this.minWidth) return;
    if (typeof LocomotiveScroll === 'undefined') return;

    const container = document.querySelector(this.containerSelector);
    if (!container) return;

    this.items = Array.from(document.querySelectorAll(this.parazoomSelector)).map((el) => ({
      el,
      width: el.offsetWidth,
      height: el.offsetHeight
    }));

    this.instance =
      navigator.userAgent.toLowerCase().indexOf('firefox') > -1
        ? new LocomotiveScroll({
            el: container,
            smooth: true,
            multiplier: 5
          })
        : new LocomotiveScroll({
            el: container,
            smooth: true
          });

    this.instance.on('scroll', (payload) => {
      const y = payload.scroll.y;
      const limit = payload.limit || 1;

      this.items.forEach((item) => {
        const intensity = Number(item.el.getAttribute('zoomIntensity') || 0.3);
        item.el.style.width = `${item.width + item.width * (y / limit) * intensity}px`;
        item.el.style.height = `${item.height + item.height * (y / limit) * intensity}px`;
      });
    });

    window.addEventListener('resize', this.onResize);
  }

  onResize() {
    this.items.forEach((item) => {
      item.width = item.el.offsetWidth;
      item.height = item.el.offsetHeight;
    });

    if (this.instance && typeof this.instance.update === 'function') {
      this.instance.update();
    }
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    if (this.instance && typeof this.instance.destroy === 'function') {
      this.instance.destroy();
    }
  }
}
