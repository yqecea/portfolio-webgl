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

must(
  /Hello my name is[\s\S]*text-stroke">YUSUF\.[\s\S]*creative[\s\S]*developer[\s\S]*from Kazakhstan[\s\S]*text-stroke-2">16 y\.o\./.test(index),
  'index.html must keep the restored legacy home intro copy and order'
);
must(index.includes('class="l-over hometoggler"'), 'index.html must keep the second intro overlay');
must(index.includes('Click anywhere') && index.includes('to enable the sound'), 'index.html must keep the legacy second intro prompt');
must(!/\bl-quicknav\b|\bl-sound-control\b/.test(index), 'index.html must not reintroduce generated quicknav/sound-control intro UI');
must(!/\bintro-frame\b|\bintro-progress\b|\bintro-context\b/.test(index), 'index.html home intro must not use generated frame/progress intro UI');

must(css.includes('body[data-page="home"]:not(.intro-dismissed) .load.hometoggler .text-stroke'), 'css/style.css must keep the home intro stroke-over-fill rule');
must(css.includes('body[data-page="home"].intro-load-active .hero'), 'css/style.css must hide the underlying hero while the first intro overlay is active');
must(css.includes('body[data-page="home"].intro-prompt-active .webglholder'), 'css/style.css must hide the WebGL canvas during the second intro prompt so it does not double-render over the visible hero copy');
must(!css.includes('body[data-page="home"].intro-prompt-active .hero'), 'css/style.css must NOT hide the hero during the second intro prompt — the legacy contract keeps the oversized intro copy visible behind the "Click anywhere" overlay');
must(css.includes('body[data-page="home"].intro-prompt-active .l-over.hometoggler'), 'css/style.css must show the old l-over prompt as the second intro screen');
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
const homeIntroMotion = read('src/ui/HomeIntroMotion.js');
must(homeIntroMotion.includes('intro-load-active'), 'HomeIntroMotion must own the first-intro active state');
must(homeIntroMotion.includes('intro-prompt-active'), 'HomeIntroMotion must own the old second intro prompt state');
must(homeIntroMotion.includes('stopImmediatePropagation'), 'HomeIntroMotion must prevent Webflow from replacing responsive intro with hero');
must(lenisSmoothScroll.includes('new window.Lenis'), 'LenisSmoothScroll must initialize the pinned Lenis runtime');
must(lenisSmoothScroll.includes('gsap.ticker.add'), 'LenisSmoothScroll must use GSAP ticker integration');
must(nativeScrollMotion.includes('IntersectionObserver'), 'NativeScrollMotion must use IntersectionObserver for reveal motion');
must(!nativeScrollMotion.includes("addEventListener('wheel'"), 'NativeScrollMotion must not hijack wheel scrolling');
must(workScroll.includes('translate3d'), 'work scroll controller must use smoothed transform motion');
must(workScroll.includes('Math.abs(diff) < 0.25'), 'work scroll controller must stop RAF after interpolation settles');
must(!workScroll.includes('this.animate();'), 'work scroll controller must not start a permanent RAF transform loop');

for (const [path, html] of pages) {
  must(html.includes('class="trigger burgerclickablein'), `${path} must include the fixed open trigger hitbox`);
  must(html.includes('class="trigger burgerclickableout'), `${path} must include the fixed close trigger hitbox`);
  must(!/locomotive-scroll/i.test(html), `${path} must not load Locomotive Scroll`);
  must(/lenis@1\.3\.23/.test(html), `${path} must load the pinned Lenis runtime`);
}
must(!/locomotive-scroll/i.test(index), 'index.html must not load Locomotive Scroll');
must(/lenis@1\.3\.23/.test(index), 'index.html must load the pinned Lenis runtime');

if (failures.length) {
  console.error('UI contract check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('UI contract check passed.');
