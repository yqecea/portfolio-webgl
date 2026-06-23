export default class HomeIntroMotion {
  constructor() {
    this.root = document.querySelector('.load.hometoggler');
    this.grid = this.root?.querySelector('.l-grid') || null;
    this.prompt = this.root?.querySelector('.l-over.hometoggler') || null;
    this.promptText = this.prompt?.querySelector('.l-text-w') || null;
    this.timeline = null;
    this.rootObserver = null;
    this.clearActiveTimer = null;
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

    if (typeof MutationObserver === 'undefined') return;

    this.rootObserver = new MutationObserver(() => this.syncIntroLoadState());
    this.rootObserver.observe(this.root, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    this.syncIntroLoadState();
  }

  syncIntroLoadState() {
    if (document.body.classList.contains('intro-prompt-active')) {
      this.applyPromptState();
      return;
    }

    if (!this.root || document.body.classList.contains('intro-dismissed')) {
      this.clearIntroLoadActive();
      return;
    }

    const style = window.getComputedStyle(this.root);
    const isVisible =
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0.01;

    if (!isVisible) this.showPrompt();
  }

  onIntroClick(event) {
    if (document.body.classList.contains('intro-dismissed')) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (document.body.classList.contains('intro-prompt-active')) {
      this.dismissIntro();
      return;
    }

    this.showPrompt();
  }

  showPrompt() {
    if (!this.root || !this.prompt) return;

    document.body.classList.remove('intro-load-active');
    document.body.classList.add('intro-prompt-active', 'intro-second');

    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }

    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf([this.root, this.grid, this.prompt, this.promptText].filter(Boolean));
      gsap.set(this.root, {
        display: 'flex',
        opacity: 1,
        pointerEvents: 'auto'
      });
      // Keep .l-grid visible during the second prompt — the legacy
      // contract shows the same first-screen copy behind the
      // "Click anywhere" overlay. Force the first-screen text to its
      // final state (the previous gsap.killTweensOf above can leave
      // .l-head/.l-inner at their initial yPercent:105 / opacity:0 if
      // the user clicks mid-animation).
      const lineTargets = this.getLineTargets();
      const fillTargets = this.getFillTargets();
      if (lineTargets.length) {
        gsap.set(lineTargets, {
          opacity: 1,
          yPercent: 0,
          clearProps: 'willChange'
        });
      }
      if (fillTargets.length) {
        gsap.set(fillTargets, { width: '100%' });
      }
      // CSS !important already keeps the grid visible; only set
      // display here when CSS is unavailable so the legacy path
      // stays intact.
      if (!document.body.classList.contains('intro-prompt-active')) {
        gsap.set(this.grid, { display: 'none', opacity: 0 });
      }
      gsap.set(this.prompt, {
        display: 'flex',
        opacity: 1,
        pointerEvents: 'auto'
      });
      gsap.fromTo(
        this.promptText,
        { opacity: 0, y: 8 },
        {
          opacity: 0.78,
          y: 0,
          duration: 0.28,
          ease: 'power2.out',
          overwrite: 'auto'
        }
      );
      return;
    }

    this.applyPromptState();
  }

  applyPromptState() {
    if (!this.root || !this.prompt) return;

    this.root.style.display = 'flex';
    this.root.style.opacity = '1';
    this.root.style.pointerEvents = 'auto';
    if (this.grid) {
      this.grid.style.display = 'none';
      this.grid.style.opacity = '0';
    }
    this.prompt.style.display = 'flex';
    this.prompt.style.opacity = '1';
    this.prompt.style.pointerEvents = 'auto';
    if (this.promptText) {
      this.promptText.style.opacity = '0.78';
      this.promptText.style.transform = 'none';
    }
  }

  async dismissIntro() {
    if (!this.root) return;

    document.body.classList.add('intro-dismissed');
    document.body.classList.remove('intro-load-active', 'intro-prompt-active', 'intro-second');

    await this.startSoundFromGesture();

    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf([this.root, this.grid, this.prompt, this.promptText].filter(Boolean));
      gsap.to(this.root, {
        opacity: 0,
        duration: 0.22,
        ease: 'power2.out',
        overwrite: 'auto',
        onComplete: () => this.hideIntroElements()
      });
      return;
    }

    this.hideIntroElements();
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
    if (this.clearActiveTimer) {
      window.clearTimeout(this.clearActiveTimer);
      this.clearActiveTimer = null;
    }
  }
}
