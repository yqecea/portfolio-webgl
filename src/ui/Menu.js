/**
 * Menu.js - Burger Menu Logic
 * 
 * Handles the animated canvas-based burger menu.
 * Extracted from legacy inline scripts.
 * 
 * @target .burgercontainer
 */
import loop from '../core/Loop.js';

export default class Menu {
    constructor() {
        this.container = document.querySelector('.burgercontainer');
        this.menuPanel = document.querySelector('.menu');
        this.burgerIn = document.querySelector('.burgerclickablein');
        this.burgerOut = document.querySelector('.burgerclickableout');
        this.navTrigger = document.querySelector('.nav-trigger');

        if (!this.container) {
            console.warn('Menu: .burgercontainer not found');
            return;
        }

        // Create canvas
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

        // DPI scaling
        this.dpi = window.devicePixelRatio || 1;

        // State
        this.isOpen = false;
        this.isAnimating = false;
        this.fillColor = '#0A0A0A';
        this.targetColor = '#E5E3DC';
        this.lastDistance = 2000; // Hover detection state - reset on resize

        // Animation values
        this.y = { value: 0 };
        this.buttonAlpha = { value: 1 };
        this.lineColor = { value: 230 };
        this.noiseAmplitude = { value: 1 };

        // Burger menu config - responsive breakpoints
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

        // Line positions for hamburger icon
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

        // X positions when menu is open
        this.xLines = {
            top: [
                { value: -10 * this.dpi }, { value: -10 * this.dpi },
                { value: 10 * this.dpi }, { value: 10 * this.dpi }
            ],
            bottom: [
                { value: -10 * this.dpi }, { value: 10 * this.dpi },
                { value: 10 * this.dpi }, { value: -10 * this.dpi }
            ]
        };

        // Small config for closed state
        this.smallConfig = {
            burgerMargin: this.config.burgerMargin,
            burgerRad: this.config.burgerRad
        };

        this.init();
    }

    init() {
        this.resize();
        this.bindEvents();
        this.setActiveHitbox(this.burgerIn, true);
        this.setActiveHitbox(this.burgerOut, false);

        // Subscribe to render loop
        loop.subscribe('menuUpdate', () => this.update());
    }

    bindEvents() {
        // Click handlers
        if (this.burgerIn) {
            this.burgerIn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        }
        if (this.burgerOut) {
            this.burgerOut.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        }

        document.querySelectorAll('.menulink').forEach((link) => {
            link.addEventListener('click', () => this.closeForNavigation());
        });

        // Resize
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
                    if (this.burgerIn) this.burgerIn.classList.add('on');
                    this.animateNoise(0);
                }

                if (distance > threshold && this.lastDistance <= threshold) {
                    document.body.style.cursor = 'inherit';
                    if (this.burgerIn) this.burgerIn.classList.remove('on');
                    this.animateNoise(1);
                }

                this.lastDistance = distance;
            });
        }
    }

    animateNoise(target) {
        if (typeof gsap !== 'undefined') {
            gsap.to(this.noiseAmplitude, { value: target, duration: 0.15 });
        } else {
            this.noiseAmplitude.value = target;
        }
    }

    toggle() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            this.dismissIntroOverlay();
            document.body.classList.add('menu-open');
        }

        const duration = 0.4;
        const targetY = this.isOpen ? 1 : 0;
        const targetRad = this.isOpen ? this.config.burgerBigRad : this.smallConfig.burgerRad;
        const targetMargin = this.isOpen ? this.config.burgerBigMargin : this.smallConfig.burgerMargin;
        const targetLines = this.isOpen ? this.xLines : this.lines;
        const unlockDelay = (duration + 0.5) * 1000;

        if (typeof gsap !== 'undefined') {
            gsap.to(this.y, { value: targetY, ease: "power4.inOut", duration: duration });
            gsap.to(this.config, { burgerRad: targetRad,
                burgerMargin: targetMargin,
                ease: "power4.inOut", duration: duration });

            // Animate lines
            this.lines.top.forEach((line, i) => {
                gsap.to(line, { value: targetLines.top[i].value, ease: "power4.inOut", duration: duration });
            });
            this.lines.bottom.forEach((line, i) => {
                gsap.to(line, { value: targetLines.bottom[i].value, ease: "power4.inOut", duration: duration });
            });
        } else {
            this.y.value = targetY;
            this.config.burgerRad = targetRad;
            this.config.burgerMargin = targetMargin;
            this.lines.top.forEach((line, i) => {
                line.value = targetLines.top[i].value;
            });
            this.lines.bottom.forEach((line, i) => {
                line.value = targetLines.bottom[i].value;
            });
        }

        // Toggle nav visibility
        if (this.navTrigger) {
            if (this.isOpen) {
                if (this.menuPanel) this.menuPanel.style.display = 'flex';
                this.navTrigger.classList.add('on');
            } else {
                setTimeout(() => {
                    this.navTrigger.classList.remove('on');
                    document.body.classList.remove('menu-open');
                    if (this.menuPanel) this.menuPanel.style.display = 'none';
                }, 500);
            }
        }

        // Keep only one active clickable layer during transition.
        if (this.isOpen) {
            this.setActiveHitbox(this.burgerIn, false);
            setTimeout(() => this.setActiveHitbox(this.burgerOut, true), 500);
        } else {
            this.setActiveHitbox(this.burgerOut, false);
            setTimeout(() => this.setActiveHitbox(this.burgerIn, true), 500);
        }

        setTimeout(() => {
            this.isAnimating = false;
        }, unlockDelay);
    }

    closeForNavigation() {
        this.isOpen = false;
        this.isAnimating = false;
        document.body.classList.remove('menu-open');
        if (this.menuPanel) this.menuPanel.style.display = 'none';
        if (this.navTrigger) this.navTrigger.classList.remove('on');
        this.setActiveHitbox(this.burgerOut, false);
        this.setActiveHitbox(this.burgerIn, true);

        this.y.value = 0;
        this.config.burgerRad = this.smallConfig.burgerRad;
        this.config.burgerMargin = this.smallConfig.burgerMargin;
        const closedTop = [-12, -5, 12, -5].map((value) => value * this.dpi);
        const closedBottom = [-12, 5, 12, 5].map((value) => value * this.dpi);
        this.lines.top.forEach((line, index) => {
            line.value = closedTop[index];
        });
        this.lines.bottom.forEach((line, index) => {
            line.value = closedBottom[index];
        });
        this.resize();
    }

    dismissIntroOverlay() {
        document.body.classList.add('intro-dismissed');
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

        // Apply responsive breakpoints FIRST
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

        // Update burger position AFTER breakpoints are applied
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

        // Background fill
        ctx.beginPath();
        ctx.fillStyle = this.fillColor;
        ctx.rect(0, 0, this.width, this.height);
        if (this.isOpen) ctx.fill();
        ctx.closePath();

        // Animated curtain
        ctx.fillStyle = '#0A0A0A';
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

        // Draw noise circles
        this.drawNoiseCircles(ctx);

        // Draw hamburger lines
        this.drawLines(ctx);

        // Update clickable area size
        this.updateClickableAreas();
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

        // Top line
        ctx.beginPath();
        ctx.moveTo(this.lines.top[0].value + pos.x, this.lines.top[1].value + pos.y);
        ctx.lineTo(this.lines.top[2].value + pos.x, this.lines.top[3].value + pos.y);
        ctx.stroke();
        ctx.closePath();

        // Bottom line
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
}
