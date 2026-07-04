import loop from '../core/Loop.js';

export default class SoundToggler {
  constructor(options = {}) {
    this.containerSelector = options.containerSelector || '.soundtoggler';
    this.storage = options.storage || {
      wasPlaying: 'audioWasPlaying',
      time: 'audioTime'
    };

    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.soundReactor = null;

    this.dpi = window.devicePixelRatio || 1;
    this.soundFlag = false;
    this.moveFlag = false;
    this.isAnimating = false;

    this.amp = { value: 3 };
    this.wL = 0.1;
    this.speed = 0.003;

    this.update = this.update.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onMouseMoveAutoplay = this.onMouseMoveAutoplay.bind(this);
  }

  init(soundReactor, options = {}) {
    this.soundReactor = soundReactor;
    this.container = document.querySelector(this.containerSelector);
    if (!this.container) return;

    this.allowAutoplayByMouse = options.allowAutoplayByMouse === true;

    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.onResize();
    this.container.addEventListener('click', this.onClick);
    window.addEventListener('resize', this.onResize);
    loop.subscribe('soundTogglerUpdate', this.update);

    this.soundFlag = this.soundReactor?.isPlaying() || false;
    if (this.soundFlag) {
      this.amp.value = 30;
    }

    if (this.allowAutoplayByMouse && this.soundReactor?.getWasPlaying()) {
      window.addEventListener('mousemove', this.onMouseMoveAutoplay, { once: true });
    }
  }

  onMouseMoveAutoplay() {
    if (this.moveFlag) return;
    this.moveFlag = true;
    this.onClick();
  }

  onResize() {
    if (!this.ctx || !this.container) return;
    this.dpi = window.devicePixelRatio || 1;
    this.ctx.canvas.width = this.container.offsetWidth * this.dpi;
    this.ctx.canvas.height = this.container.offsetHeight * this.dpi;
    this.ctx.lineWidth = this.dpi;
  }

  syncAriaPressed() {
    if (!this.container) return;
    this.container.setAttribute('aria-pressed', String(this.soundFlag));
  }

  animateAmp(target) {
    if (typeof gsap !== 'undefined') {
      gsap.to(this.amp, { value: target, duration: 0.5 });
      return;
    }
    this.amp.value = target;
  }

  fadeVolume(target, onComplete) {
    if (!this.soundReactor?.audio) return;

    if (typeof gsap !== 'undefined') {
      gsap.to(this.soundReactor.audio, { volume: target,
        onComplete, duration: 0.5 });
      return;
    }

    this.soundReactor.setVolume(target);
    if (onComplete) onComplete();
  }

  async onClick(event) {
    if (event) event.preventDefault();
    if (!this.soundReactor?.audio) return;
    if (this.isAnimating) return;

    const shouldPlay = !this.soundFlag;
    const targetAmp = shouldPlay ? 30 : 3;
    this.isAnimating = true;

    if (shouldPlay) {
      this.soundReactor.setVolume(0);
      const started = await this.soundReactor.play({ restore: true });
      if (started) {
        this.fadeVolume(1);
        this.soundReactor.setWasPlaying(true);
        this.soundFlag = true;
        this.animateAmp(targetAmp);
      } else {
        // Playback was blocked (autoplay policy, missing audio, etc.).
        // Leave soundFlag false so the next click retries correctly.
        this.soundFlag = false;
      }
      this.isAnimating = false;
    } else {
      this.fadeVolume(0, () => {
        this.soundReactor.pause();
        this.isAnimating = false;
      });
      this.soundReactor.setWasPlaying(false);
      this.soundFlag = false;
      this.animateAmp(targetAmp);
    }
    this.syncAriaPressed();
  }

  started() {
    this.soundFlag = true;
    this.animateAmp(30);
    this.syncAriaPressed();
  }

  update() {
    if (!this.ctx || !this.container) return;

    const width = this.ctx.canvas.width;
    const height = this.ctx.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    this.ctx.beginPath();
    for (let x = 0; x < width; x += 2) {
      const y =
        height / 2 +
        this.amp.value *
          this.dpi *
          Math.sin(
            ((x * (1 / (this.container.offsetWidth * 0.01)) * this.wL) / this.dpi) +
              Date.now() * this.speed
          );

      if (x === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
    this.ctx.closePath();
  }

  destroy() {
    loop.unsubscribe('soundTogglerUpdate');
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMoveAutoplay);
    if (this.container) {
      this.container.removeEventListener('click', this.onClick);
    }
  }
}
