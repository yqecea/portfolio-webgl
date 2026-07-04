import loop from '../core/Loop.js';

const MENU_ANIMATION_SECONDS = 0.8;
const MENU_PANEL_SECONDS = 0.28;

export default class Menu {
    constructor() {
        this.container = document.querySelector('.burgercontainer');
        this.menuPanel = document.querySelector('.menu');
        this.menuPrompt = document.querySelector('.menu-prompt.burgerclickablein');
        this.burgerIn = document.querySelector('.trigger.burgerclickablein') || document.querySelector('.burgerclickablein');
        this.burgerOut = document.querySelector('.trigger.burgerclickableout') || document.querySelector('.burgerclickableout');
        this.navTrigger = document.querySelector('.nav-trigger');
        this.panelTimeline = null;
        this.menuItems = [];

        this.reducedMotion =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!this.container) {
            console.warn('Menu: .burgercontainer not found');
            return;
        }

        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Initialize simplex noise (use window. for explicit global access
        // since simplex-noise.js is loaded as a global script, not a module)
        // Provide a complete fallback with both noise2D and noise3D
        const noopNoise = { noise2D: () => 0, noise3D: () => 0 };
        if (typeof window.SimplexNoise === 'function') {
            try {
                this.simplex = new window.SimplexNoise();
            } catch (e) {
                console.warn('Menu: SimplexNoise construct failed, using fallback');
                this.simplex = noopNoise;
            }
        } else {
            console.warn('Menu: SimplexNoise not available, using fallback');
            this.simplex = noopNoise;
        }

        this.dpi = window.devicePixelRatio || 1;

        this.isOpen = false;
        this.fillColor = '#0A0A0A';
        this.lastDistance = 2000;

        this.y = { value: 0 };
        this.buttonAlpha = { value: 1 };
        this.lineColor = { value: 230 };
        this.noiseAmplitude = { value: 1 };

        this.breakpoints = [
            { sWidth: 0, burgerRad: 30 * this.dpi, burgerMargin: 40 * this.dpi, burgerBigRad: 80 * this.dpi, burgerBigMargin: 50 * this.dpi },
            { sWidth: 479, burgerRad: 35 * this.dpi, burgerMargin: 35 * this.dpi, burgerBigRad: 100 * this.dpi, burgerBigMargin: 60 * this.dpi },
            { sWidth: 767, burgerRad: 40 * this.dpi, burgerMargin: 40 * this.dpi, burgerBigRad: 250 * this.dpi, burgerBigMargin: 120 * this.dpi },
            { sWidth: 991, burgerRad: 40 * this.dpi, burgerMargin: 50 * this.dpi, burgerBigRad: 250 * this.dpi, burgerBigMargin: 130 * this.dpi }
        ];

        this.config = {
            burgerRad: 40 * this.dpi,
            burgerMargin: 50 * this.dpi,
            burgerBigRad: 250 * this.dpi,
            burgerBigMargin: 130 * this.dpi,
            burgerPosition: { x: 0, y: 0 },
            circleNumber: 2,
            noiseDetail: 2,
            noiseSpeed: 0.0003
        };

        this.lines = {
            top: [
                { value: -12 * this.dpi }, { value: -5 * this.dpi },
                { value: 12 * this.dpi }, { value: -5 * this.dpi }
            ],
            bottom: [
                { value: -12 * this.dpi }, { value: 5 * this.dpi },
                { value: 12 * this.dpi }, { value: 5 * this.dpi }
            ]
        };

        this.closedLineValues = {
            top: [-12, -5, 12, -5],
            bottom: [-12, 5, 12, 5]
        };
        this.openLineValues = {
            top: [-10, -10, 10, 10],
            bottom: [-10, 10, 10, -10]
        };

        this.smallConfig = {
            burgerMargin: this.config.burgerMargin,
            burgerRad: this.config.burgerRad
        };

        this.init();
    }

    init() {
        this.resize();
        this.setupPanelMotion();
        this.bindEvents();
        this.setOpenTriggerActive(true);
        this.setCloseTriggerActive(false);

        loop.subscribe('menuUpdate', () => this.update());
    }

    bindEvents() {
        const openTriggers = new Set([this.burgerIn, this.menuPrompt].filter(Boolean));
        openTriggers.forEach((trigger) => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        });
        if (this.burgerOut) {
            this.burgerOut.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        }

        document.querySelectorAll('.menulink').forEach((link) => {
            link.addEventListener('click', () => this.closeForNavigation());
        });

        window.addEventListener('resize', () => this.resize());

        // Mouse hover detection (desktop only)
        // Use inline User-Agent detection instead of relying on external global
        const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!isMobileDevice) {
            window.addEventListener('mousemove', (e) => {
                const cursor = [e.clientX, e.clientY];
                const distance = Math.sqrt(
                    Math.pow(this.config.burgerPosition.x / this.dpi - cursor[0], 2) +
                    Math.pow(this.config.burgerPosition.y / this.dpi - cursor[1], 2)
                );

                const threshold = this.config.burgerRad / this.dpi;

                if (distance <= threshold && this.lastDistance > threshold) {
                    document.body.style.cursor = 'pointer';
                    this.animateNoise(0);
                }

                if (distance > threshold && this.lastDistance <= threshold) {
                    document.body.style.cursor = 'inherit';
                    this.animateNoise(1);
                }

                this.lastDistance = distance;
            });
        }
    }

    animateNoise(target) {
        if (typeof gsap !== 'undefined') {
            gsap.to(this.noiseAmplitude, { value: target, duration: 0.15, overwrite: 'auto' });
        } else {
            this.noiseAmplitude.value = target;
        }
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;

        this.dismissIntroOverlay();
        this.showMenuPanel();
        this.animatePanel(true);
        this.animateBurger(true);
        this.showCloseButton();

        if (this.navTrigger) this.navTrigger.classList.add('on');
        this.setOpenTriggerActive(false);
        this.setCloseTriggerActive(true);
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        this.animatePanel(false);
        this.animateBurger(false);
        this.hideCloseButton();

        if (this.navTrigger) this.navTrigger.classList.remove('on');
        this.setCloseTriggerActive(false);
        this.setOpenTriggerActive(true);
    }

    ensureCloseButton() {
        if (this.closeButton) return this.closeButton;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'menu-close';
        btn.setAttribute('aria-label', 'Close menu');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
                <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>
            </svg>
        `;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.close();
        });
        // Mount the button at the document root so it escapes the
        // .burgercontainer stacking context (the .menu panel is a
        // sibling inside the same container and would otherwise sit on
        // top of the close button despite the higher z-index).
        document.body.appendChild(btn);
        this.closeButton = btn;
        return btn;
    }

    showCloseButton() {
        const btn = this.ensureCloseButton();
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf(btn);
            gsap.fromTo(btn, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.22, ease: 'power2.out' });
        } else {
            btn.style.opacity = '1';
        }
        btn.style.pointerEvents = 'auto';
    }

    hideCloseButton() {
        if (!this.closeButton) return;
        const btn = this.closeButton;
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf(btn);
            gsap.to(btn, {
                opacity: 0,
                scale: 0.85,
                duration: 0.18,
                ease: 'power2.in',
                onComplete: () => { btn.style.pointerEvents = 'none'; }
            });
        } else {
            btn.style.opacity = '0';
            btn.style.pointerEvents = 'none';
        }
    }

    animateBurger(isOpening) {
        const targetY = isOpening ? 1 : 0;
        const targetRad = isOpening ? this.config.burgerBigRad : this.smallConfig.burgerRad;
        const targetMargin = isOpening ? this.config.burgerBigMargin : this.smallConfig.burgerMargin;
        const targetLines = isOpening ? this.openLineValues : this.closedLineValues;

        if (typeof gsap !== 'undefined') {
            const lineTargets = [...this.lines.top, ...this.lines.bottom];
            gsap.killTweensOf([this.y, this.config, ...lineTargets]);
            gsap.to(this.y, {
                value: targetY,
                ease: "power4.inOut",
                duration: MENU_ANIMATION_SECONDS,
                overwrite: 'auto'
            });
            gsap.to(this.config, {
                burgerRad: targetRad,
                burgerMargin: targetMargin,
                ease: "power4.inOut",
                duration: MENU_ANIMATION_SECONDS,
                overwrite: 'auto'
            });

            this.lines.top.forEach((line, i) => {
                gsap.to(line, {
                    value: targetLines.top[i] * this.dpi,
                    ease: "power4.inOut",
                    duration: MENU_ANIMATION_SECONDS,
                    overwrite: 'auto'
                });
            });
            this.lines.bottom.forEach((line, i) => {
                gsap.to(line, {
                    value: targetLines.bottom[i] * this.dpi,
                    ease: "power4.inOut",
                    duration: MENU_ANIMATION_SECONDS,
                    overwrite: 'auto'
                });
            });
        } else {
            this.y.value = targetY;
            this.config.burgerRad = targetRad;
            this.config.burgerMargin = targetMargin;
            this.lines.top.forEach((line, i) => {
                line.value = targetLines.top[i] * this.dpi;
            });
            this.lines.bottom.forEach((line, i) => {
                line.value = targetLines.bottom[i] * this.dpi;
            });
        }
    }

    setupPanelMotion() {
        this.menuItems = Array.from(document.querySelectorAll('.menu-item, .menu-as'));

        if (!this.menuPanel) return;

        this.menuPanel.style.display = 'none';
        this.menuPanel.style.visibility = 'hidden';
        this.menuPanel.style.pointerEvents = 'none';

        if (typeof gsap !== 'undefined') {
            // Clear any inline Webflow IX2 initial state on the menu items
            // (data-w-id elements had `transform: translate3d(0, 50%, 0); opacity: 0`).
            // The WebflowIX2Stripper should have already removed the style attribute,
            // but call clearProps defensively in case items are added later.
            if (this.menuItems.length) {
                gsap.set(this.menuItems, { clearProps: 'transform,opacity' });
            }
            gsap.set(this.menuPanel, { opacity: 0, scale: 0.992, transformOrigin: '100% 0%' });
            gsap.set(this.menuItems, { opacity: 0, y: 18 });
        }
    }

    showPanelImmediate(isOpening) {
        if (typeof gsap === 'undefined') return;
        gsap.set(this.menuPanel, {
            opacity: isOpening ? 1 : 0,
            scale: 1,
            clearProps: 'transform'
        });
        gsap.set(this.menuItems, { opacity: 1, y: 0, clearProps: 'transform' });
    }

    animatePanel(isOpening) {
        if (!this.menuPanel) return;

        if (this.panelTimeline) {
            this.panelTimeline.kill();
            this.panelTimeline = null;
        }

        if (this.reducedMotion) {
            this.showPanelImmediate(isOpening);
        }

        if (typeof gsap === 'undefined') {
            if (isOpening) {
                this.menuPanel.style.display = 'flex';
                this.menuPanel.style.visibility = 'visible';
                this.menuPanel.style.pointerEvents = 'auto';
                document.body.classList.add('menu-open');
            } else {
                this.hideMenuPanel();
                document.body.classList.remove('menu-open');
                if (this.navTrigger) this.navTrigger.classList.remove('on');
            }
            return;
        }

        gsap.killTweensOf([this.menuPanel, ...this.menuItems]);

        if (isOpening) {
            this.menuPanel.style.display = 'flex';
            this.menuPanel.style.visibility = 'visible';
            this.menuPanel.style.pointerEvents = 'auto';
            document.body.classList.add('menu-open');

            this.panelTimeline = gsap.timeline({
                defaults: { overwrite: 'auto' }
            });
            this.panelTimeline
                .set(this.menuPanel, { opacity: 0, scale: 0.992, transformOrigin: '100% 0%' })
                .set(this.menuItems, { opacity: 0, y: 18, willChange: 'opacity, transform' })
                .to(this.menuPanel, {
                    opacity: 1,
                    scale: 1,
                    duration: MENU_PANEL_SECONDS,
                    ease: 'power3.out'
                }, 0)
                .to(this.menuItems, {
                    opacity: 1,
                    y: 0,
                    duration: 0.28,
                    ease: 'power3.out',
                    stagger: 0.025,
                    clearProps: 'transform,opacity,willChange'
                }, 0.03);
            return;
        }

        this.panelTimeline = gsap.timeline({
            defaults: { overwrite: 'auto' },
            onComplete: () => {
                this.hideMenuPanel();
                document.body.classList.remove('menu-open');
                if (this.navTrigger) this.navTrigger.classList.remove('on');
            }
        });
        this.panelTimeline
            .to(this.menuItems, {
                opacity: 0,
                y: -10,
                duration: 0.16,
                ease: 'power2.in',
                stagger: { each: 0.025, from: 'end' }
            }, 0)
            .to(this.menuPanel, {
                opacity: 0,
                scale: 0.992,
                duration: 0.2,
                ease: 'power2.in'
            }, 0.05);
    }

    closeForNavigation() {
        if (this.panelTimeline) {
            this.panelTimeline.kill();
            this.panelTimeline = null;
        }
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf([this.menuPanel, ...this.menuItems]);
        }
        this.isOpen = false;
        document.body.classList.remove('menu-open');
        this.hideMenuPanel();
        if (this.navTrigger) this.navTrigger.classList.remove('on');
        this.setCloseTriggerActive(false);
        this.setOpenTriggerActive(true);

        this.y.value = 0;
        this.config.burgerRad = this.smallConfig.burgerRad;
        this.config.burgerMargin = this.smallConfig.burgerMargin;
        const closedTop = this.closedLineValues.top.map((value) => value * this.dpi);
        const closedBottom = this.closedLineValues.bottom.map((value) => value * this.dpi);
        this.lines.top.forEach((line, index) => {
            line.value = closedTop[index];
        });
        this.lines.bottom.forEach((line, index) => {
            line.value = closedBottom[index];
        });
        this.resize();
    }

    showMenuPanel() {
        if (this.menuPanel) {
            this.menuPanel.style.display = 'flex';
            this.menuPanel.style.visibility = 'visible';
            this.menuPanel.style.pointerEvents = 'auto';
        }
    }

    hideMenuPanel() {
        if (!this.menuPanel) return;
        this.menuPanel.style.display = 'none';
        this.menuPanel.style.visibility = 'hidden';
        this.menuPanel.style.pointerEvents = 'none';
    }

    dismissIntroOverlay() {
        document.body.classList.add('intro-dismissed');
        document.body.classList.remove('intro-load-active');
        document.body.classList.remove('intro-second');
        document.querySelectorAll('.load.hometoggler, .l-over.hometoggler').forEach((element) => {
            element.style.display = 'none';
            element.style.opacity = '0';
            element.style.pointerEvents = 'none';
        });
    }

    resize() {
        if (!this.canvas || !this.ctx) return;

        this.width = this.ctx.canvas.width = this.container.offsetWidth * this.dpi;
        this.height = this.ctx.canvas.height = this.container.offsetHeight * this.dpi;
        this.ctx.lineWidth = this.dpi;

        this.breakpoints.forEach(bp => {
            if (window.innerWidth > bp.sWidth) {
                this.config.burgerRad = bp.burgerRad;
                this.config.burgerMargin = bp.burgerMargin;
                this.config.burgerBigRad = bp.burgerBigRad;
                this.config.burgerBigMargin = bp.burgerBigMargin;
            }
        });

        this.smallConfig.burgerMargin = this.config.burgerMargin;
        this.smallConfig.burgerRad = this.config.burgerRad;

        if (this.isOpen) {
            this.config.burgerMargin = this.config.burgerBigMargin;
            this.config.burgerRad = this.config.burgerBigRad;
        }

        this.config.burgerPosition.x = this.width - this.config.burgerMargin;
        this.config.burgerPosition.y = this.config.burgerMargin;

        // Reset hover detection state to fix menu interaction after resize
        this.lastDistance = 2000;

        // Keep trigger hitboxes in sync immediately, not only on the next RAF tick.
        this.updateClickableAreas();
    }

    update() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.lineWidth = this.dpi;

        ctx.beginPath();
        ctx.fillStyle = this.fillColor;
        ctx.rect(0, 0, this.width, this.height);
        if (this.isOpen) ctx.fill();
        ctx.closePath();

        this.drawMenuCurtain(ctx);

        // Skip noise circles when menu is closed and idle: 2 full paths at
        // 60Hz is wasted work that competes with the WebGL/GSAP renderers.
        if (this.shouldRenderNoise()) {
            this.drawNoiseCircles(ctx);
        }

        this.drawLines(ctx);

        this.updateClickableAreas();
    }

    shouldRenderNoise() {
        if (this.isOpen) return true;
        if (this.y.value > 0.001) return true;
        if (this.noiseAmplitude.value < 0.99) return true;
        return false;
    }

    drawMenuCurtain(ctx) {
        if (this.y.value === 0) return;

        ctx.fillStyle = this.fillColor;
        ctx.beginPath();
        ctx.moveTo(0, this.height * this.y.value);

        const curveDirection = this.isOpen ? 1 : -1;
        ctx.quadraticCurveTo(
            this.width / 2,
            this.height * this.y.value + curveDirection * 300 * Math.sin(this.y.value * Math.PI),
            this.width,
            this.height * this.y.value
        );
        ctx.lineTo(this.width, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
    }

    drawNoiseCircles(ctx) {
        for (let c = 0; c < this.config.circleNumber; c++) {
            ctx.beginPath();

            for (let a = 0; a < 2 * Math.PI; a += (2 * Math.PI) / 50) {
                const cosA = Math.cos(a);
                const sinA = Math.sin(a);

                const n = this.simplex.noise3D(
                    cosA * this.config.noiseDetail,
                    sinA * this.config.noiseDetail,
                    Date.now() * this.config.noiseSpeed + c
                );

                const radius = this.config.burgerRad + n * 10 * this.dpi * this.noiseAmplitude.value;
                const x = cosA * radius + this.config.burgerPosition.x;
                const y = sinA * radius + this.config.burgerPosition.y;

                if (a === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            const alpha = c === 0 ? 0.6 : 1;
            ctx.strokeStyle = `rgba(${this.lineColor.value}, ${this.lineColor.value}, ${this.lineColor.value}, ${alpha * this.buttonAlpha.value})`;
            ctx.closePath();
            ctx.stroke();
        }
    }

    drawLines(ctx) {
        const pos = this.config.burgerPosition;

        ctx.beginPath();
        ctx.moveTo(this.lines.top[0].value + pos.x, this.lines.top[1].value + pos.y);
        ctx.lineTo(this.lines.top[2].value + pos.x, this.lines.top[3].value + pos.y);
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(this.lines.bottom[0].value + pos.x, this.lines.bottom[1].value + pos.y);
        ctx.lineTo(this.lines.bottom[2].value + pos.x, this.lines.bottom[3].value + pos.y);
        ctx.stroke();
        ctx.closePath();
    }

    updateClickableAreas() {
        const size = (2 * this.config.burgerRad) / this.dpi;
        const top = (this.config.burgerPosition.y - this.config.burgerRad) / this.dpi;
        const left = (this.config.burgerPosition.x - this.config.burgerRad) / this.dpi;

        this.applyHitboxStyle(this.burgerIn, size, top, left);
        this.applyHitboxStyle(this.burgerOut, size, top, left);
    }

    applyHitboxStyle(el, size, top, left) {
        if (!el) return;
        el.style.position = 'fixed';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.top = `${top}px`;
        el.style.left = `${left}px`;
        el.style.right = 'auto';
    }

    setActiveHitbox(el, isActive) {
        if (!el) return;
        el.classList.toggle('on', isActive);
        el.style.pointerEvents = isActive ? 'auto' : 'none';
    }

    setOpenTriggerActive(isActive) {
        this.setActiveHitbox(this.burgerIn, isActive);
        if (this.menuPrompt && this.menuPrompt !== this.burgerIn) {
            this.menuPrompt.classList.toggle('on', isActive);
            this.menuPrompt.style.pointerEvents = 'none';
        }
    }

    setCloseTriggerActive(isActive) {
        this.setActiveHitbox(this.burgerOut, isActive);
    }
}
