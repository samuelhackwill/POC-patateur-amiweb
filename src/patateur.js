import { createPatateurPath } from "./patateur-path.js";

export { createPatateurPath } from "./patateur-path.js";

const instances = new WeakMap();
const pending = new Set();
let frame = null;
let observer;

function schedule(instance) {
  if (instance.destroyed) return;
  pending.add(instance);
  if (frame === null) frame = requestAnimationFrame(flush);
}

function flush() {
  frame = null;
  const batch = Array.from(pending);
  pending.clear();

  // Finish every layout read before writing any SVG attributes.
  const measurements = batch.map((instance) => {
    const { element, options } = instance;
    const style = getComputedStyle(element);
    return {
      instance,
      // Local padding-box dimensions: CSS transforms must not affect geometry.
      width: element.clientWidth,
      height: element.clientHeight,
      padX: Math.min(parseFloat(style.paddingLeft), parseFloat(style.paddingRight)) || 0,
      padY: Math.min(parseFloat(style.paddingTop), parseFloat(style.paddingBottom)) || 0,
      ...options,
    };
  });

  for (const { instance, width, height, ...options } of measurements) {
    if (width === 0 || height === 0) continue;
    const key = JSON.stringify([width, height, options.padX, options.padY, options.seed, options.wobble]);
    if (key === instance.lastKey) continue;
    instance.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    instance.path.setAttribute("d", createPatateurPath(width, height, options));
    instance.lastKey = key;
  }
}

function nextOptions(current, patch) {
  const seed = patch.seed ?? current.seed;
  const wobble = patch.wobble ?? current.wobble;
  if (typeof seed !== "string" && !(typeof seed === "number" && Number.isFinite(seed))) {
    throw new TypeError("Patateur seed must be a string or finite number.");
  }
  if (!Number.isFinite(wobble) || wobble < 0) {
    throw new TypeError("Patateur wobble must be a non-negative number in CSS pixels.");
  }
  return { seed: String(seed), wobble };
}

/**
 * Decorate an existing HTML container. Import patateur.css alongside this module.
 * The caller owns content, size, padding, and --patateur-fill.
 * Call destroy() before removing the container from a long-lived page.
 */
export function decoratePatateur(element, options = {}) {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError("decoratePatateur expects an HTML container element.");
  }
  const existing = instances.get(element);
  if (existing) {
    existing.controller.setOptions(options);
    return existing.controller;
  }

  const resolved = nextOptions({ seed: "1", wobble: 16 }, options);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svg.classList.add("patateur-svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  path.classList.add("patateur-path");
  svg.append(path);

  const instance = {
    element, svg, path, options: resolved, lastKey: null, destroyed: false,
    addedClass: !element.classList.contains("patateur"),
  };
  const controller = {
    setOptions(patch = {}) {
      if (instance.destroyed) return;
      const next = nextOptions(instance.options, patch);
      if (next.seed === instance.options.seed && next.wobble === instance.options.wobble) return;
      instance.options = next;
      schedule(instance);
    },
    refresh() {
      schedule(instance);
    },
    destroy() {
      if (instance.destroyed) return;
      instance.destroyed = true;
      observer.unobserve(element);
      pending.delete(instance);
      instances.delete(element);
      svg.remove();
      if (instance.addedClass) element.classList.remove("patateur");
      if (pending.size === 0 && frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    },
  };
  instance.controller = controller;

  observer ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      const instance = instances.get(entry.target);
      if (instance) schedule(instance);
    }
  });
  instances.set(element, instance);
  element.classList.add("patateur");
  element.prepend(svg);
  observer.observe(element, { box: "border-box" });
  schedule(instance);
  return controller;
}
