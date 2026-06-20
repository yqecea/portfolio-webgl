import loop from '../core/Loop.js';

export default class PageTransition {
  constructor(options = {}) {
    this.selector = options.selector || '.pagelink, .menulink';
    this.duration = options.duration || 1.2;
    this.initialColor = options.initialColor || '#FFAAFF';
    this.clickColor = options.clickColor || '#E5E3DC';
    this.curtainFill = options.curtainFill || '#0D0D0D';
    this.allowOnMobile = options.allowOnMobile === true;

    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;

    this.overlayColor = this.initialColor;
    this.overlayActive = false;
    this.isTransitioning = false;
    this.navigateTimer = null;

    this.topWave = { value: 1 };
    this.bottomWave = { value: 1 };

    this.onResize = this.onResize.bind(this);
    this.update = this.update.bind(this);
    this.onLinkClick = this.onLinkClick.bind(this);
  }

  init({ soundReactor } = {}) {
    this.soundReactor = soundReactor || null;

    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.zIndex = '2000';
    this.canvas.style.pointerEvents = 'none';

    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.onResize();
    window.addEventListener('resize', this.onResize);

    document.querySelectorAll(this.selector).forEach((link) => {
      link.addEventListener('click', this.onLinkClick);
    });

    loop.subscribe('pageTransitionUpdate', this.update);
  }

  onResize() {
    if (!this.ctx) return;
    this.width = this.ctx.canvas.width = window.innerWidth;
    this.height = this.ctx.canvas.height = window.innerHeight;
  }

  fadeOutAudio() {
    if (!this.soundReactor?.audio || window.isMobile) return;

    if (typeof gsap !== 'undefined') {
      gsap.to(this.soundReactor.audio, { volume: 0, duration: this.duration });
      return;
    }

    this.soundReactor.audio.volume = 0;
  }

  navigate(href, target) {
    if (!href) return;

    if (target === '_blank') {
      window.open(href, '_blank', 'noopener');
      return;
    }

    document.location.href = href;
  }

  closeMenuStateForNavigation() {
    document.body.classList.remove('menu-open');
    document.querySelector('.nav-trigger')?.classList.remove('on');
    document.querySelector('.burgerclickableout')?.classList.remove('on');
    document.querySelector('.burgerclickablein')?.classList.add('on');
    const menu = document.querySelector('.menu');
    if (menu) menu.style.display = 'none';
  }

  onLinkClick(event) {
    if (this.isTransitioning) {
      event.preventDefault();
      return;
    }

    // Preserve native new-tab/window gestures.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    const link = event.currentTarget;
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
    if (link.hasAttribute('download')) return;
    if (link.getAttribute('target') === '_blank') return;

    if (!this.allowOnMobile && window.isMobile) return;

    event.preventDefault();
    this.isTransitioning = true;
    this.closeMenuStateForNavigation();

    const target = link.getAttribute('target');
    const targetColor = link.getAttribute('targetcolor');

    this.overlayColor = targetColor || this.clickColor;
    this.overlayActive = false;
    this.topWave.value = 1;
    this.bottomWave.value = 1;

    this.fadeOutAudio();

    if (typeof gsap !== 'undefined') {
      gsap.to(this.bottomWave, {
        value: 0,
        ease: 'power4.inOut',
        duration: this.duration,
        onComplete: () => {
          this.overlayActive = true;
        }
      });

      gsap.to(this.topWave, {
        value: 0,
        ease: 'power4.inOut',
        duration: this.duration,
        delay: this.duration,
        onComplete: () => {
          if (this.soundReactor) {
            this.soundReactor.syncStorage();
          }
        }
      });
    } else {
      this.bottomWave.value = 0;
      this.topWave.value = 0;
      this.overlayActive = true;
    }

    this.navigateTimer = window.setTimeout(() => {
      this.navigate(href, target);
    }, this.duration * 1000);
  }

  update() {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.fillStyle = this.overlayColor;
    ctx.rect(0, 0, w, h);
    if (this.overlayActive) ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.moveTo(0, h * this.topWave.value);
    ctx.quadraticCurveTo(
      w / 2,
      h * this.topWave.value + 300 * Math.sin(this.topWave.value * Math.PI),
      w,
      h * this.topWave.value
    );
    ctx.lineTo(w, h * this.bottomWave.value);
    ctx.quadraticCurveTo(
      w / 2,
      h * this.bottomWave.value - 300 * Math.sin(this.bottomWave.value * Math.PI),
      0,
      h * this.bottomWave.value
    );
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = this.curtainFill;
    ctx.fill();
  }

  destroy() {
    loop.unsubscribe('pageTransitionUpdate');
    window.removeEventListener('resize', this.onResize);
    if (this.navigateTimer) {
      window.clearTimeout(this.navigateTimer);
      this.navigateTimer = null;
    }
    document.querySelectorAll(this.selector).forEach((link) => {
      link.removeEventListener('click', this.onLinkClick);
    });
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
