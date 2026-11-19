import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const index = read('index.html');
const css = read('css/style.css');
const menu = read('src/ui/Menu.js');
const main = read('src/main.js');
const lenisSmoothScroll = read('src/scroll/LenisSmoothScroll.js');
const nativeScrollMotion = read('src/scroll/NativeScrollMotion.js');
const workScroll = read('src/work/DesktopHorizontalScrollController.js');
const pages = ['pages/work.html', 'pages/about.html', 'pages/contact.html'].map((path) => [
  path,
  read(path),
]);

const failures = [];
const must = (condition, message) => {
  if (!condition) failures.push(message);
};

must(/<button class="intro-enter primary-action" type="button">/.test(index), 'Home must have a native intro entry button');
must(/class="intro-about-cta primary-action" href="\.\/pages\/about\.html"/.test(index), 'Home must link to About from the hero');
must(css.includes('body[data-page="home"].intro-load-active .hero'), 'Home must keep the hero hidden during the intro');
must(css.includes('transition: none;'), 'css/style.css must keep CSS menu transitions disabled in favor of GSAP-controlled motion');
must(css.includes('body:not([data-page="home"]) .trigger.burgerclickablein.on'), 'css/style.css must keep the non-home trigger visibility guard');
must(css.includes('body[data-page="work"] .sidescrollbox'), 'css/style.css must keep horizontal work scroll rules');

must(menu.includes("document.querySelector('.trigger.burgerclickablein')"), 'Menu.js must bind the real fixed open hitbox before menu-prompt');
must(menu.includes("document.querySelector('.trigger.burgerclickableout')"), 'Menu.js must bind the real fixed close hitbox');
must(menu.includes('const MENU_ANIMATION_SECONDS = 0.8'), 'Menu.js must keep the legacy menu animation duration');
must(menu.includes('drawMenuCurtain'), 'Menu.js must keep the legacy canvas curtain animation');
must(menu.includes('closedLineValues'), 'Menu.js must keep immutable closed line targets for reliable close animation');
must(menu.includes('animatePanel'), 'Menu.js must use one JS-controlled menu panel animation path');
must(!menu.includes("this.burgerIn.classList.remove('on')"), 'Menu.js hover handling must not remove the active open hitbox class');

must(main.includes("import LenisSmoothScroll from './scroll/LenisSmoothScroll.js'"), 'main.js must use LenisSmoothScroll for stable vertical smoothness');
must(main.includes("import NativeScrollMotion from './scroll/NativeScrollMotion.js'"), 'main.js must use NativeScrollMotion');
must(!/LocomotiveBridge|SmoothVerticalScroll|MobileFix|MobileAnimations/.test(main), 'main.js must not reintroduce old scroll-hijack controllers');
must(lenisSmoothScroll.includes('new window.Lenis'), 'LenisSmoothScroll must initialize the pinned Lenis runtime');
must(lenisSmoothScroll.includes('gsap.ticker.add'), 'LenisSmoothScroll must use GSAP ticker integration');
must(nativeScrollMotion.includes('IntersectionObserver'), 'NativeScrollMotion must use IntersectionObserver for reveal motion');
must(!nativeScrollMotion.includes("addEventListener('wheel'"), 'NativeScrollMotion must not hijack wheel scrolling');
must(workScroll.includes('translate3d'), 'work scroll controller must use smoothed transform motion');
must(workScroll.includes('Math.abs(diff) < 0.25'), 'work scroll controller must stop RAF after interpolation settles');
must(!workScroll.includes('this.animate();'), 'work scroll controller must not start a permanent RAF transform loop');
must(workScroll.includes('(min-width: 992px)'), 'work scroll controller must stay desktop-only so mobile work can scroll vertically');

for (const [path, html] of pages) {
  must(html.includes('class="trigger burgerclickablein'), `${path} must include the fixed open trigger hitbox`);
  must(html.includes('class="trigger burgerclickableout'), `${path} must include the fixed close trigger hitbox`);
  must(!/locomotive-scroll/i.test(html), `${path} must not load Locomotive Scroll`);
  if (path !== 'pages/work.html') must(/lenis@1\.3\.23/.test(html), `${path} must load the pinned Lenis runtime`);
}
must(!/locomotive-scroll/i.test(index), 'index.html must not load Locomotive Scroll');
must(/lenis@1\.3\.23/.test(index), 'index.html must load the pinned Lenis runtime');

if (failures.length) {
  console.error('UI contract check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('UI contract check passed.');
