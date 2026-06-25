export default class HomeIntroMotion {
  constructor() {
    this.root = document.querySelector('.load.hometoggler');
    this.grid = this.root?.querySelector('.l-grid') || null;
    this.prompt = document.querySelector('.l-over.hometoggler');
    this.promptText = this.prompt?.querySelector('.l-text-w') || null;
    this.timeline = null;
    this.rootObserver = null;
    this.onIntroClick = this.onIntroClick.bind(this);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  init() {
    if (document.body?.dataset?.page !== 'home') return false;
    if (!this.root || document.body.classList.contains('intro-dismissed')) return false;

    this.markIntroLoadActive();

    const lineTargets = this.getLineTargets();
    const fillTargets = this.getFillTargets();
    if (!lineTargets.length || typeof gsap === 'undefined') {
      this.showFinalState(lineTargets, fillTargets);
      return false;
    }

    if (this.reducedMotion) {
      this.showFinalState(lineTargets, fillTargets);
      return true;
    }

    window.setTimeout(() => this.play(lineTargets, fillTargets), 80);
    return true;
  }

  markIntroLoadActive() {
    document.body.classList.add('intro-load-active');
    this.root.addEventListener('click', this.onIntroClick, true);
    this.prompt?.addEventListener('click', this.onIntroClick, true);
    this.showPromptText();

    if (typeof MutationObserver === 'undefined') return;

    this.rootObserver = new MutationObserver(() => this.syncIntroLoadState());
    this.rootObserver.observe(this.root, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    this.syncIntroLoadState();
  }

  syncIntroLoadState() {
    if (!this.root || document.body.classList.contains('intro-dismissed')) {
      this.clearIntroLoadActive();
      return;
    }

    const style = window.getComputedStyle(this.root);
    const isVisible =
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0.01;

    if (!isVisible) this.dismissIntro();
  }

  onIntroClick(event) {
    if (document.body.classList.contains('intro-dismissed')) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    this.dismissIntro();
  }

  showPromptText() {
    if (!this.prompt) return;
    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf([this.prompt, this.promptText].filter(Boolean));
      gsap.set(this.prompt, {
        display: 'flex',
        opacity: 1,
        pointerEvents: 'none'
      });
      gsap.set(this.promptText, { opacity: 0.78, y: 0 });
      return;
    }

    this.prompt.style.display = 'flex';
    this.prompt.style.opacity = '1';
    this.prompt.style.pointerEvents = 'none';
    if (this.promptText) {
      this.promptText.style.opacity = '0.78';
      this.promptText.style.transform = 'none';
    }
  }

  ensureAboutCta() {
    if (this.aboutCta) return this.aboutCta;

    const cta = document.createElement('a');
    cta.className = 'intro-about-cta';
    cta.href = './pages/about.html';
    cta.setAttribute('aria-label', 'Go to about');
    cta.textContent = 'Start explore';
    this.aboutCta = cta;
    return cta;
  }

  showAboutCta() {
    const cta = this.ensureAboutCta();
    if (!cta.isConnected) document.body.appendChild(cta);

    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf(cta);
      gsap.fromTo(cta, { opacity: 0, xPercent: -50, y: 18, scale: 0.96 }, {
        opacity: 1,
        xPercent: -50,
        y: 0,
        scale: 1,
        duration: 0.48,
        ease: 'back.out(1.35)',
        overwrite: 'auto'
      });
      return;
    }

    cta.style.opacity = '1';
    cta.style.transform = 'translateX(-50%)';
  }

  async dismissIntro() {
    if (!this.root) return;

    document.body.classList.add('intro-dismissed', 'intro-revealing');
    document.body.classList.remove('intro-load-active', 'intro-prompt-active', 'intro-second');

    this.startSoundFromGesture();

    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf([this.root, this.grid, this.prompt, this.promptText].filter(Boolean));
      gsap.to([this.grid, this.promptText].filter(Boolean), {
        opacity: 0,
        y: -14,
        duration: 0.34,
        ease: 'power3.inOut',
        overwrite: 'auto'
      });
      gsap.to(this.root, {
        opacity: 0,
        scale: 0.985,
        duration: 0.52,
        delay: 0.04,
        ease: 'power3.inOut',
        overwrite: 'auto',
        onComplete: () => {
          this.hideIntroElements();
          this.showAboutCta();
          document.body.classList.remove('intro-revealing');
        }
      });
      return;
    }

    this.hideIntroElements();
    this.showAboutCta();
    document.body.classList.remove('intro-revealing');
  }

  async startSoundFromGesture() {
    const reactor = window.soundReactor;
    if (!reactor || window.isMobile) return;

    try {
      await reactor.resumeContextIfNeeded?.();
      const started = await reactor.play?.({ restore: false });
      if (started && window.soundToggler) {
        window.soundToggler.started?.();
      }
    } catch (error) {
      console.warn('HomeIntroMotion: sound start failed', error);
    }
  }

  hideIntroElements() {
    [this.root, this.prompt].forEach((element) => {
      if (!element) return;
      element.style.display = 'none';
      element.style.opacity = '0';
      element.style.pointerEvents = 'none';
    });
  }

  getLineTargets() {
    return Array.from(
      this.root.querySelectorAll('.l-head, .l-inner, .l-inner-2')
    ).filter((element) => element.offsetParent !== null);
  }

  getFillTargets() {
    return Array.from(this.root.querySelectorAll('.text-fill, .text-fill-2'));
  }

  play(lineTargets, fillTargets) {
    if (!this.root || document.body.classList.contains('intro-dismissed')) return;

    gsap.killTweensOf([...lineTargets, ...fillTargets]);
    if (this.timeline) this.timeline.kill();

    gsap.set(lineTargets, {
      opacity: 0,
      yPercent: 105,
      force3D: true,
      willChange: 'opacity, transform'
    });
    gsap.set(fillTargets, { width: '0%' });

    this.timeline = gsap.timeline({
      defaults: {
        ease: 'power3.out',
        overwrite: 'auto'
      }
    });

    this.timeline
      .to(lineTargets, {
        opacity: 1,
        yPercent: 0,
        duration: 0.72,
        stagger: 0.09,
        clearProps: 'opacity,transform,willChange'
      })
      .to(
        fillTargets,
        {
          width: '100%',
          duration: 0.82,
          stagger: 0.12,
          ease: 'power2.out'
        },
        0.22
      );
  }

  showFinalState(lineTargets = this.getLineTargets(), fillTargets = this.getFillTargets()) {
    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf([...lineTargets, ...fillTargets]);
      gsap.set(lineTargets, { opacity: 1, yPercent: 0, clearProps: 'opacity,transform,willChange' });
      gsap.set(fillTargets, { width: '100%' });
      return;
    }

    lineTargets.forEach((element) => {
      element.style.opacity = '1';
      element.style.transform = 'none';
      element.style.willChange = '';
    });
    fillTargets.forEach((element) => {
      element.style.width = '100%';
    });
  }

  destroy() {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    this.clearIntroLoadActive();
  }

  clearIntroLoadActive() {
    document.body.classList.remove('intro-load-active', 'intro-prompt-active', 'intro-second');
    if (this.root) {
      this.root.removeEventListener('click', this.onIntroClick, true);
    }
    this.prompt?.removeEventListener('click', this.onIntroClick, true);
    if (this.rootObserver) {
      this.rootObserver.disconnect();
      this.rootObserver = null;
    }
  }
}
