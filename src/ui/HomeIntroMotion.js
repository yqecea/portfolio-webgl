export default class HomeIntroMotion {
  constructor() {
    this.root = document.querySelector('.load.hometoggler');
    this.grid = this.root?.querySelector('.l-grid') || null;
    this.prompt = this.root?.querySelector('.l-over.hometoggler') || null;
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

        // The CTA carries its own navigation handler; let it run untouched.
        if (event.target.closest('.intro-explore-cta')) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // Single-tap workflow: the first tap on the intro overlay
        // dismisses it and reveals the post-intro state (WebGL ball +
        // Start Explore CTA). No intermediate "Click anywhere" step.
        if (!document.body.classList.contains('intro-load-active')) return;
        this.dismissIntroWithCta();
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

    // The post-intro state shows the WebGL ball plus a "Start Explore" CTA.
    // Build the CTA once and return it; caller decides where to mount it.
    ensureStartExploreCta() {
        if (this.startExploreCta) return this.startExploreCta;
        const cta = document.createElement('a');
        cta.className = 'intro-explore-cta';
        cta.href = './pages/about.html';
        cta.setAttribute('aria-label', 'Start exploring my work');
        cta.innerHTML = `
            <span class="intro-explore-cta__label">Start explore</span>
            <svg class="intro-explore-cta__arrow" viewBox="0 0 24 14" aria-hidden="true" focusable="false">
                <path d="M0 7h22M16 1l6 6-6 6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        cta.addEventListener('click', (event) => {
            // Let the browser handle the navigation, but make sure the
            // intro is fully dismissed first so the next page boots clean.
            event.stopPropagation();
            this.dismissIntro();
        });
        this.startExploreCta = cta;
        return cta;
    }

    showStartExploreCta() {
        const cta = this.ensureStartExploreCta();
        const anchor = this.root?.parentElement || document.body;
        if (!cta.isConnected) anchor.appendChild(cta);

        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf(cta);
            gsap.fromTo(cta, { opacity: 0, y: 18 }, {
                opacity: 1,
                y: 0,
                duration: 0.42,
                ease: 'power3.out',
                delay: 0.12
            });
        } else {
            cta.style.opacity = '1';
            cta.style.transform = 'none';
        }
    }

    hideStartExploreCta() {
        if (!this.startExploreCta) return;
        const cta = this.startExploreCta;
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf(cta);
            gsap.to(cta, { opacity: 0, y: 18, duration: 0.18, ease: 'power2.in' });
        } else {
            cta.style.opacity = '0';
        }
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

    // Dismiss + show the "Start Explore" CTA. This is the path used by
    // the single-tap workflow (the first tap on the intro reveals the
    // post-intro WebGL ball with the CTA anchored to the same overlay).
    async dismissIntroWithCta() {
        if (this.dismissing) return;
        this.dismissing = true;
        document.body.classList.add('intro-dismissed');
        document.body.classList.remove('intro-load-active', 'intro-prompt-active', 'intro-second');

        await this.startSoundFromGesture();

        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf([this.root, this.grid, this.prompt, this.promptText].filter(Boolean));
            gsap.to(this.root, {
                opacity: 0,
                duration: 0.32,
                ease: 'power2.out',
                overwrite: 'auto',
                onComplete: () => {
                    this.hideIntroElements();
                    this.showStartExploreCta();
                }
            });
            return;
        }

        this.hideIntroElements();
        this.showStartExploreCta();
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
