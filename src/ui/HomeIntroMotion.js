export default class HomeIntroMotion {
  constructor(onDismiss) {
    this.onDismiss = onDismiss;
    this.root = document.querySelector('.load.hometoggler');
    this.main = document.querySelector('main');
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  init() {
    document.body.classList.add('intro-load-active');
    this.main.inert = true;
    this.root.addEventListener('click', () => this.dismiss({ playSound: true, focus: true }));
    document.querySelector('.skip-to-content').addEventListener('click', () => this.dismiss());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.classList.contains('intro-load-active')) {
        this.dismiss({ focus: true });
      }
    });

    const lines = this.root.querySelectorAll('.intro-copy p');
    if (this.reducedMotion || !window.gsap) return;

    this.timeline = gsap.fromTo(lines, { opacity: 0, y: 16 }, {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.06, ease: 'power3.out',
      clearProps: 'opacity,transform',
    });
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

    if (focus) document.querySelector('.intro-about-cta').focus({ preventScroll: true });
    this.onDismiss({ playSound });

    if (animate) {
      gsap.to(this.root, {
        opacity: 0, duration: 0.36, ease: 'power2.out',
        onComplete: () => classList.remove('intro-revealing'),
      });
    }
  }
}
