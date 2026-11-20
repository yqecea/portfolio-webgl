export default class HomeIntroMotion {
  constructor(onDismiss) {
    this.onDismiss = onDismiss;
    this.root = document.querySelector('.load.hometoggler');
    this.prompt = document.querySelector('.intro-enter');
    this.main = document.querySelector('main');
    this.about = this.main.querySelector('.intro-about-cta');
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  init() {
    document.body.classList.add('intro-load-active');
    this.main.inert = true;
    const enter = () => this.dismiss({ playSound: true, focus: true });
    this.root.addEventListener('click', enter);
    this.prompt.addEventListener('click', enter);
    document.querySelector('.skip-to-content').addEventListener('click', () => this.dismiss());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.classList.contains('intro-load-active')) {
        this.dismiss({ focus: true });
      }
    });

    const lines = this.root.querySelectorAll('.l-head, .l-inner, .l-inner-2');
    const fills = this.root.querySelectorAll('.text-fill, .text-fill-2');
    if (this.reducedMotion || !window.gsap) {
      for (const fill of fills) fill.style.width = '100%';
      return;
    }

    this.timeline = gsap.timeline({ defaults: { ease: 'power3.out', overwrite: 'auto' } })
      .fromTo(lines, { opacity: 0, yPercent: 105 }, {
        opacity: 1, yPercent: 0, duration: 0.72, stagger: 0.09, clearProps: 'opacity,transform',
      })
      .fromTo(fills, { width: '0%' }, { width: '100%', duration: 0.82, stagger: 0.12, ease: 'power2.out' }, 0.22);
  }

  dismiss({ playSound = false, focus = false } = {}) {
    const { classList } = document.body;
    if (!classList.contains('intro-load-active')) return;

    this.timeline?.kill();
    this.main.inert = false;
    this.root.inert = true;
    const animate = focus && !this.reducedMotion && window.gsap;
    if (animate) classList.add('intro-revealing');
    classList.remove('intro-load-active');
    classList.add('intro-dismissed');

    this.onDismiss({ playSound });
    const finish = () => {
      classList.remove('intro-revealing');
      if (focus) this.about.focus({ preventScroll: true });
    };
    if (animate) {
      gsap.fromTo(this.root, { opacity: 1 }, {
        opacity: 0, scale: 0.985, duration: 0.52, ease: 'power3.inOut', onComplete: finish,
      });
    } else {
      finish();
    }
  }
}
