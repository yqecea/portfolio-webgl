import loop from '../core/Loop.js';

export default class ElasticLines {
  constructor(options = {}) {
    this.selector = options.selector || '.elasticbox';
    this.audioUrls = options.audioUrls || [];

    this.boxes = [];
    this.boxByElement = new Map();
    this.mouse = { x: 0, y: 0 };
    this.transitioning = false;

    this.onResize = this.onResize.bind(this);
    this.update = this.update.bind(this);
    this.onPageLinkClick = this.onPageLinkClick.bind(this);
  }

  init() {
    const containers = Array.from(document.querySelectorAll(this.selector));
    if (!containers.length) return;

    const usableAudioUrls = this.audioUrls.filter(Boolean);
    this.audios = containers.map((_, index) => {
      if (!usableAudioUrls.length) return null;
      const url = usableAudioUrls[index % usableAudioUrls.length];
      if (!url) return null;
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      return audio;
    });

    this.boxes = containers.map((container, index) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.canvas.width = container.offsetWidth;
      ctx.canvas.height = container.offsetHeight;

      container.classList.add(`boxid_${index}`);
      container.appendChild(canvas);

      const box = {
        container,
        ctx,
        canvas,
        mouseIn: false,
        handlePos: {
          x: ctx.canvas.width / 2,
          y: ctx.canvas.height / 2
        },
        handleInitPos: {
          x: ctx.canvas.width / 2,
          y: ctx.canvas.height / 2
        },
        anim: null
      };

      this.boxByElement.set(container, box);

      if (!window.isMobile) {
        container.addEventListener('mouseenter', (event) => this.onEnter(event));
        container.addEventListener('mouseleave', (event) => this.onLeave(event));
        container.addEventListener('mousemove', (event) => this.onMove(event));
      }

      return box;
    });

    document.querySelectorAll('.pagelink').forEach((link) => {
      link.addEventListener('click', this.onPageLinkClick);
    });

    window.addEventListener('resize', this.onResize);
    loop.subscribe('elasticLinesUpdate', this.update);
  }

  onPageLinkClick() {
    this.transitioning = true;
  }

  findBoxByTarget(target) {
    if (!target || typeof target.closest !== 'function') return null;
    const container = target.closest(this.selector);
    if (!container) return null;
    return this.boxByElement.get(container) || null;
  }

  onEnter(event) {
    const box = this.findBoxByTarget(event.target);
    if (!box) return;

    box.mouseIn = true;
    if (box.anim && typeof box.anim.kill === 'function') {
      box.anim.kill();
    }
  }

  onLeave(event) {
    const box = this.findBoxByTarget(event.target);
    if (!box) return;

    box.mouseIn = false;
    if (typeof gsap !== 'undefined') {
      box.anim = gsap.to(box.handlePos, { x: box.handleInitPos.x,
        y: box.handleInitPos.y,
        ease: "elastic.out(1, 0.3)", duration: 1 });
    } else {
      box.handlePos.x = box.handleInitPos.x;
      box.handlePos.y = box.handleInitPos.y;
    }

    if (this.transitioning) return;

    const idx = this.boxes.findIndex((entry) => entry === box);
    const hoverAudio = this.audios[idx];
    if (!hoverAudio) return;

    hoverAudio.currentTime = 0;
    hoverAudio.play().catch(() => {
      // Ignore autoplay-policy rejections.
    });
  }

  onMove(event) {
    const box = this.findBoxByTarget(event.target);
    if (!box) return;
    const rect = box.container.getBoundingClientRect();
    this.mouse.x = event.clientX - rect.left;
    this.mouse.y = event.clientY - rect.top;
  }

  onResize() {
    this.boxes.forEach((box) => {
      box.ctx.canvas.width = box.container.offsetWidth;
      box.ctx.canvas.height = box.container.offsetHeight;
      box.handleInitPos.x = box.ctx.canvas.width / 2;
      box.handleInitPos.y = box.ctx.canvas.height / 2;
    });
  }

  update() {
    this.boxes.forEach((box) => {
      const width = (box.ctx.canvas.width = box.container.offsetWidth);
      const height = (box.ctx.canvas.height = box.container.offsetHeight);

      if (box.mouseIn) {
        box.handlePos.x += 0.5 * (this.mouse.x - box.handlePos.x);
        box.handlePos.y += 0.5 * (this.mouse.y - box.handlePos.y);
      }

      box.ctx.clearRect(0, 0, width, height);
      box.ctx.beginPath();
      box.ctx.moveTo(width / 2, 0);
      box.ctx.quadraticCurveTo(box.handlePos.x, box.handlePos.y, width / 2, height);
      box.ctx.stroke();
      box.ctx.closePath();
    });
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    loop.unsubscribe('elasticLinesUpdate');
    document.querySelectorAll('.pagelink').forEach((link) => {
      link.removeEventListener('click', this.onPageLinkClick);
    });
  }
}
