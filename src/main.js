import loop from './core/Loop.js';
import stripWebflowIX2InitialStates from './core/WebflowIX2Stripper.js';
import Menu from './ui/Menu.js';
import SoundReactor from './audio/SoundReactor.js';
import SoundToggler from './audio/SoundToggler.js';
import CursorCanvas from './ui/CursorCanvas.js';
import PageTransition from './ui/PageTransition.js';
import HomeIntroMotion from './ui/HomeIntroMotion.js';
import LenisSmoothScroll from './scroll/LenisSmoothScroll.js';
import NativeScrollMotion from './scroll/NativeScrollMotion.js';
import ElasticLines from './work/ElasticLines.js';
import AnimationLock from './about/AnimationLock.js';
import DesktopHorizontalScrollController from './work/DesktopHorizontalScrollController.js';

const SOUND_URL = '/assets/sound/mainSound.mp3';
const ROLLOVER_URL = '/assets/sound/rollovers/rol05.mp3';

class App {
  constructor() {
    this.page = null;
    this.isMobile = false;
    this.instances = [];
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');

    this.soundReactor = null;
    this.soundToggler = null;
  }

  detectPage() {
    const fromData = document.body?.dataset?.page;
    if (fromData) return fromData;

    const path = window.location.pathname.toLowerCase();
    if (path.includes('/pages/work')) return 'work';
    if (path.includes('/pages/about')) return 'about';
    if (path.includes('/pages/contact')) return 'contact';
    return 'home';
  }

  setEnvironmentFlags() {
    this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const ua = navigator.userAgent.toLowerCase();
    const isSafari =
      ua.includes('safari') &&
      !ua.includes('chrome') &&
      !ua.includes('crios') &&
      !ua.includes('android');

    window.isMobile = this.isMobile;
    window.isSafari = isSafari;
  }

  setupGlobalLifecycle() {
    // plan 011 P1.3: spike confirmed full reload on bfcache back is required.
    // Tests/bfcache.mjs asserts that event.persisted -> reload fires; if
    // you remove this listener, the spike will start passing and the
    // home intro state + scroll position + sound context will desync
    // (the module-level gsap timelines + sound reactor are initialized
    // once in the original page load, not re-initialized on bfcache
    // restore). Re-evaluate when module lifecycle is refactored.
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        window.location.reload();
      }
    });
  }

  setPageFlags() {
    document.documentElement.dataset.page = this.page;
    document.body.classList.remove('menu-open');
  }

  initMenu() {
    const menuContainer = document.querySelector('.burgercontainer');
    if (!menuContainer) return;

    const menu = new Menu(() => this.homeIntro?.dismiss());
    this.instances.push(menu);
  }

  initSound() {
    if (this.isMobile || matchMedia('(pointer: coarse)').matches) return;

    const enableAnalyser = this.page === 'home';
    this.soundReactor = new SoundReactor(SOUND_URL, { enableAnalyser });
    this.soundReactor.init();
    window.soundReactor = this.soundReactor;

    if (enableAnalyser) {
      loop.subscribe('soundReactorUpdate', () => this.soundReactor.update());
    }

    const soundButton = document.querySelector('.soundtoggler');
    if (!soundButton) return;

    this.soundToggler = new SoundToggler();
    this.soundToggler.init(this.soundReactor, {
      allowAutoplayByMouse: this.page !== 'home' && !window.isSafari
    });
    window.soundToggler = this.soundToggler;

    this.instances.push(this.soundToggler);
  }

  initCursor() {
    const container = document.querySelector('.cursorcontainer');
    if (!container) return;

    if (this.isMobile || this.motion.matches || matchMedia('(pointer: coarse)').matches) {
      container.classList.add('is-disabled');
      return;
    }

    const cursor = new CursorCanvas();
    cursor.init(container);

    document.querySelectorAll('a').forEach((link) => {
      link.addEventListener('mouseenter', cursor.aIn);
      link.addEventListener('mouseleave', cursor.aOut);
    });

    this.instances.push(cursor);
  }

  initPageTransition() {
    if (this.motion.matches || this.isMobile || matchMedia('(pointer: coarse)').matches) return;
    const isHome = this.page === 'home';

    const transition = new PageTransition({
      initialColor: isHome ? '#FFFF00' : '#FFAAFF',
      clickColor: '#E5E3DC',
      curtainFill: isHome ? '#FFFFFF' : '#0D0D0D',
      allowOnMobile: false
    });

    transition.init({ soundReactor: this.soundReactor });
    this.instances.push(transition);
  }

  initHomeIntroMotion() {
    if (this.page !== 'home') return;

    this.homeIntro = new HomeIntroMotion(({ playSound }) => {
      if (playSound) this.startIntroSound();
      if (!this.motion.matches && !navigator.connection?.saveData) this.initWebgl();
    });
    this.homeIntro.init();
  }

  initNativeScrollMotion() {
    const scrollMotion = new NativeScrollMotion();
    const started = scrollMotion.init();
    if (started) this.instances.push(scrollMotion);
  }

  initLenisSmoothScroll() {
    const smoothScroll = new LenisSmoothScroll();
    const started = smoothScroll.init();
    if (started) this.instances.push(smoothScroll);
  }

  initWorkScroll() {
    if (this.page !== 'work') return;

    const scroller = new DesktopHorizontalScrollController();
    scroller.init();
    this.instances.push(scroller);
  }

  initWorkElasticLines() {
    if (this.page !== 'work' || this.motion.matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const elastic = new ElasticLines({
      audioUrls: [ROLLOVER_URL]
    });

    elastic.init();
    this.instances.push(elastic);
  }

  initAboutAnimationLock() {
    if (this.page !== 'about') return;

    const animationLock = new AnimationLock();
    animationLock.init();
    this.instances.push(animationLock);
  }

  async startIntroSound() {
    if (!this.soundReactor) return;
    await this.soundReactor.resumeContextIfNeeded();
    if (await this.soundReactor.play({ restore: false })) this.soundToggler?.started();
  }

  async initWebgl() {
    const container = document.querySelector('.webglholder');
    try {
      if (this.motion.matches) return;
      const { default: WebGLApp } = await import('./webgl/WebGLApp.js');
      if (this.motion.matches) return;
      const webglApp = new WebGLApp(container, this.motion);
      webglApp.init();
      this.instances.push(webglApp);
    } catch (error) {
      container.dataset.fallbackReason = 'dependency';
      console.warn('[WebGL] Static sphere retained', error);
    }
  }

  initAudioNotice() {
    const notice = document.querySelector('.cookie-c');
    if (!notice || !this.soundReactor) return;
    try {
      if (localStorage.getItem('portfolio.audio-notice')) return;
    } catch {
      // The notice remains dismissible when storage is unavailable.
    }
    notice.hidden = false;
    notice.querySelector('.confirm').addEventListener('click', () => {
      notice.hidden = true;
      try {
        localStorage.setItem('portfolio.audio-notice', 'seen');
      } catch {
        // Dismissal is still effective on this page.
      }
    });
  }

  init() {
    // Strip the Webflow-exported inline `style="transform: translate3d(0, N%, 0)..."`
    // initial states from every `[data-w-id]` element. The Webflow runtime
    // cannot re-trigger IX2 on a static page reload, so those inline styles
    // are stuck and would otherwise push every animated element off-screen
    // (the post-intro hero, the menu items, the contact page reveals, etc.).
    // Must run before any module reads element computed styles or GSAP sets
    // initial values.
    stripWebflowIX2InitialStates();

    this.page = this.detectPage();
    this.setPageFlags();
    this.setEnvironmentFlags();
    this.setupGlobalLifecycle();
    this.initSound();
    this.initCursor();
    this.initPageTransition();
    this.initHomeIntroMotion();
    this.initMenu();
    this.initAudioNotice();
    this.initLenisSmoothScroll();
    this.initNativeScrollMotion();

    this.initWorkScroll();
    this.initWorkElasticLines();

    this.initAboutAnimationLock();
    loop.start();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
  });
} else {
  const app = new App();
  app.init();
}

export default App;
