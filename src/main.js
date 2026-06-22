import loop from './core/Loop.js';
import MobileFix from './core/MobileFix.js';
import MobileAnimations from './core/MobileAnimations.js';
import WebGLApp from './webgl/WebGLApp.js';
import Menu from './ui/Menu.js';
import SoundReactor from './audio/SoundReactor.js';
import SoundToggler from './audio/SoundToggler.js';
import CursorCanvas from './ui/CursorCanvas.js';
import PageTransition from './ui/PageTransition.js';
import LocomotiveBridge from './scroll/LocomotiveBridge.js';
import SmoothVerticalScroll from './scroll/SmoothVerticalScroll.js';
import ElasticLines from './work/ElasticLines.js';
import AnimationLock from './about/AnimationLock.js';
import DesktopHorizontalScrollController from './work/DesktopHorizontalScrollController.js';

const SOUND_URL = '../assets/sound/mainSound.mp3';
const ROLLOVER_URL = '../assets/sound/rollovers/rol05.mp3';

class App {
  constructor() {
    this.page = null;
    this.isMobile = false;
    this.instances = [];

    this.soundReactor = null;
    this.soundToggler = null;
    this.mobileAnimations = null;
    this.boundResponsiveAnimationsResize = this.ensureResponsiveAnimations.bind(this);
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
    window.isMobileDevice = this.isMobile;
    window.isSafari = isSafari;
  }

  setupGlobalLifecycle() {
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

  initIntroDismiss() {
    if (this.page !== 'home') return;

    const showSecondIntroScreen = () => {
      if (document.body.classList.contains('intro-dismissed')) return;
      document.body.classList.add('intro-second');
    };

    const dismissIntro = () => {
      if (document.body.classList.contains('intro-dismissed')) return;
      document.body.classList.add('intro-dismissed');
      document.body.classList.remove('intro-second');
    };

    const advanceIntro = (event) => {
      if (document.body.classList.contains('intro-dismissed')) return;
      if (event && event.type === 'keydown') {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
      }
      // If clicking a quicknav link, let the link navigate naturally.
      // The link's default behavior will load the page and the intro
      // will be dismissed on the next page load (since intro-dismissed
      // is not persisted, we add a sessionStorage flag).
      if (event && event.target && event.target.closest('.l-quicknav-link')) {
        // Mark as dismissed for this session so the next page doesn't show intro
        try { sessionStorage.setItem('intro-dismissed', '1'); } catch (e) {}
        return; // let the link navigate
      }
      // If clicking the sound toggle, toggle sound and stay on second screen
      if (event && event.target && event.target.closest('.l-sound-toggle')) {
        document.body.classList.toggle('sound-on');
        return; // don't advance intro
      }
      if (!document.body.classList.contains('intro-second')) {
        showSecondIntroScreen();
        return;
      }
      dismissIntro();
    };

    // Check if intro was already dismissed this session (via quicknav)
    try {
      if (sessionStorage.getItem('intro-dismissed') === '1') {
        document.body.classList.add('intro-dismissed');
        return;
      }
    } catch (e) {}

    const introOverlay = document.querySelector('.load.hometoggler');
    if (introOverlay) {
      introOverlay.addEventListener('pointerdown', advanceIntro);
    }

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      advanceIntro(event);
    });
  }

  hideRotateOverlayDesktop() {
    if (this.isMobile) return;
    const rotateOverlay = document.querySelector('.rotate');
    if (rotateOverlay) rotateOverlay.style.display = 'none';
  }

  initMenu() {
    const menuContainer = document.querySelector('.burgercontainer');
    if (!menuContainer) return;

    const menu = new Menu();
    this.instances.push(menu);
  }

  initSound() {
    if (this.isMobile) return;

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

    this.instances.push(this.soundToggler);

    if (this.page === 'home') {
      const homeToggler = document.querySelector('.hometoggler');
      if (!homeToggler) return;

      homeToggler.addEventListener('click', async () => {
        await this.soundReactor.resumeContextIfNeeded();
        const started = await this.soundReactor.play({ restore: false });
        if (started && this.soundToggler) {
          this.soundToggler.started();
        }
      });
    }
  }

  initCursor() {
    const container = document.querySelector('.cursorcontainer');
    if (!container) return;

    if (this.isMobile) {
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
    const isHome = this.page === 'home';

    const transition = new PageTransition({
      initialColor: isHome ? '#FFFF00' : '#FFAAFF',
      clickColor: '#E5E3DC',
      curtainFill: isHome ? '#FFFFFF' : '#0D0D0D',
      allowOnMobile: true
    });

    transition.init({ soundReactor: this.soundReactor });
    this.instances.push(transition);
  }

  initLocomotive() {
    if (this.page === 'about' || this.page === 'contact') return;

    const locomotive = new LocomotiveBridge();
    locomotive.init();
    this.instances.push(locomotive);
  }

  initSmoothVerticalScroll() {
    if (this.page !== 'about' && this.page !== 'contact') return;

    const smoothScroll = new SmoothVerticalScroll();
    const started = smoothScroll.init();
    if (started) this.instances.push(smoothScroll);
  }

  initWorkDesktopScroll() {
    if (this.page !== 'work' || this.isMobile) return;

    const scroller = new DesktopHorizontalScrollController();
    const started = scroller.init();
    if (started) this.instances.push(scroller);
  }

  initWorkElasticLines() {
    if (this.page !== 'work') return;

    const elastic = new ElasticLines({
      audioUrls: [ROLLOVER_URL]
    });

    elastic.init();
    this.instances.push(elastic);
  }

  initWorkMobileFix() {
    if (this.page !== 'work' || !this.isMobile) return;

    const mobileFix = new MobileFix();
    this.instances.push(mobileFix);
  }

  initMobileAnimations() {
    this.ensureResponsiveAnimations();
    window.addEventListener('resize', this.boundResponsiveAnimationsResize);
  }

  ensureResponsiveAnimations() {
    if (this.mobileAnimations) return;
    if (!this.isMobile && window.innerWidth > 1199) return;

    this.mobileAnimations = new MobileAnimations({
      force: true,
      maxWidth: 1199
    });
    this.instances.push(this.mobileAnimations);
  }

  initAboutAnimationLock() {
    if (this.page !== 'about') return;

    const animationLock = new AnimationLock();
    animationLock.init();
    this.instances.push(animationLock);
  }

  initWebgl() {
    const webglContainer = document.querySelector('.webglholder');
    if (!webglContainer) return;

    const webglApp = new WebGLApp();
    webglApp.init();
    this.instances.push(webglApp);
  }

  init() {
    this.page = this.detectPage();
    this.setPageFlags();
    this.setEnvironmentFlags();
    this.setupGlobalLifecycle();
    this.hideRotateOverlayDesktop();
    this.initIntroDismiss();

    this.initMenu();
    this.initSound();
    this.initCursor();
    this.initPageTransition();
    this.initLocomotive();
    this.initSmoothVerticalScroll();

    this.initWorkDesktopScroll();
    this.initWorkElasticLines();
    this.initWorkMobileFix();

    this.initMobileAnimations();
    this.initAboutAnimationLock();
    this.initWebgl();
    this.fixMobileIntroBottomText();

    loop.start();
  }

  fixMobileIntroBottomText() {
    if (this.page !== 'home') return;
    if (window.innerWidth > 767) return;

    const apply = () => {
      const quoteW = document.querySelector('.h-quote-w');
      const quote = document.querySelector('.h-quote');
      const startW = document.querySelector('.h-start-w');
      const start = document.querySelector('.h-start');

      if (quoteW) {
        quoteW.style.setProperty('position', 'absolute', 'important');
        quoteW.style.setProperty('bottom', '14vw', 'important');
        quoteW.style.setProperty('left', '5vw', 'important');
        quoteW.style.setProperty('z-index', '1300', 'important');
      }
      if (quote) {
        quote.style.setProperty('transform', 'none', 'important');
        quote.style.setProperty('font-size', '3.5vw', 'important');
        quote.style.setProperty('line-height', '1.3', 'important');
        quote.style.setProperty('opacity', '1', 'important');
        quote.style.setProperty('z-index', '1300', 'important');
      }
      if (startW) {
        startW.style.setProperty('display', 'flex', 'important');
        startW.style.setProperty('position', 'static', 'important');
        startW.style.setProperty('justify-content', 'center', 'important');
        startW.style.setProperty('margin-top', '4vw', 'important');
        startW.style.setProperty('z-index', '1300', 'important');
      }
      if (start) {
        start.style.setProperty('font-size', '4.5vw', 'important');
        start.style.setProperty('line-height', '1.2', 'important');
        start.style.setProperty('opacity', '1', 'important');
        start.style.setProperty('z-index', '1300', 'important');
      }
    };

    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('intro-second') ||
          document.body.classList.contains('intro-dismissed')) {
        apply();
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    requestAnimationFrame(apply);
    setTimeout(apply, 200);
    setTimeout(apply, 600);

    setInterval(() => {
      if (document.body.classList.contains('intro-second') ||
          document.body.classList.contains('intro-dismissed')) {
        apply();
      }
    }, 500);
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
