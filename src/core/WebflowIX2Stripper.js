/**
 * WebflowIX2Stripper.js
 *
 * The portfolio was exported from Webflow. The export bakes inline
 * `style="...transform: translate3d(0, N%, 0) scale3d(1,1,1)..."` initial
 * states onto every element that Webflow's IX2 animation system targets
 * (marked with `data-w-id`). On a static page reload the Webflow runtime
 * (jquery + webflow.fcbda2e35.js) cannot re-trigger IX2, so these inline
 * initial states stay stuck — the elements remain translated by 100% of
 * their own height, hidden off-screen or overlapping the next sibling.
 *
 * This module runs at the top of `src/main.js` and removes the inline
 * `style` attribute from every `[data-w-id][style*="translate3d"]`
 * element, so GSAP can take over the motion cleanly.
 *
 * Side effects: removes the inline transform/opacity on the first intro
 * screen (`.l-head`, `.l-inner`, `.l-inner-2`, `.text-fill*`) and the
 * post-intro hero (`.h-block`, `.h-block > *`, `.h-quote-w`, etc.) and
 * the contact page reveal blocks. Every one of those elements is then
 * re-set by GSAP in `HomeIntroMotion`, `Menu`, and `NativeScrollMotion`
 * before any animation runs.
 *
 * @target every [data-w-id] element with an inline transform
 */
const TRANSLATE_PATTERN = /translate3d\s*\(\s*[^)]*\)/;

export default function stripWebflowIX2InitialStates(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;

  const targets = root.querySelectorAll('[data-w-id][style]');
  let stripped = 0;

  targets.forEach((element) => {
    const inlineStyle = element.getAttribute('style');
    if (!inlineStyle || !TRANSLATE_PATTERN.test(inlineStyle)) return;
    element.removeAttribute('style');
    stripped += 1;
  });

  return stripped;
}
