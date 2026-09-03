const DEFAULTS = {
  main: {
    text: "L'Amicale est une plateforme cooperative de production et diffusion de projets vivants.",
    fit: 73,
    wobble: 100,
    maxWidth: 620,
    frame: 760,
    seed: 7319,
    tone: "ink",
    safeBox: false,
  },
  samples: {
    fit: 100,
    wobble: 0,
    maxWidth: 300,
    seed: 1200,
    safeBox: false,
  },
};

const controls = {
  mainText: document.querySelector("#mainTextInput"),
  mainFit: document.querySelector("#mainFitInput"),
  mainWobble: document.querySelector("#mainWobbleInput"),
  mainMaxWidth: document.querySelector("#mainMaxWidthInput"),
  frame: document.querySelector("#frameInput"),
  mainSeed: document.querySelector("#mainSeedInput"),
  mainTone: document.querySelector("#mainToneInput"),
  mainSafeBox: document.querySelector("#mainSafeBoxInput"),
  sampleFit: document.querySelector("#sampleFitInput"),
  sampleWobble: document.querySelector("#sampleWobbleInput"),
  sampleMaxWidth: document.querySelector("#sampleMaxWidthInput"),
  sampleSeed: document.querySelector("#sampleSeedInput"),
  sampleSafeBox: document.querySelector("#sampleSafeBoxInput"),
  newMainSeed: document.querySelector("#newMainSeedButton"),
  newSampleSeed: document.querySelector("#newSampleSeedButton"),
  reset: document.querySelector("#resetButton"),
};

const outputs = {
  mainFit: document.querySelector("#mainFitValue"),
  mainWobble: document.querySelector("#mainWobbleValue"),
  mainMaxWidth: document.querySelector("#mainMaxWidthValue"),
  frame: document.querySelector("#frameValue"),
  sampleFit: document.querySelector("#sampleFitValue"),
  sampleWobble: document.querySelector("#sampleWobbleValue"),
  sampleMaxWidth: document.querySelector("#sampleMaxWidthValue"),
};

const stageFrame = document.querySelector("#stageFrame");
const preview = document.querySelector(".blob-text.is-main");
const previewCopy = document.querySelector("#previewCopy");
const blobNodes = Array.from(document.querySelectorAll("[data-blob-text]"));
const sampleBlobs = Array.from(document.querySelectorAll("[data-sample-blob]"));
const sampleFrames = Array.from(document.querySelectorAll("[data-sample-frame]"));
const sampleWidthRatios = [0.88, 0.98, 0.92];

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    updateBlob(entry.target.closest("[data-blob-text]"));
  }
});

for (const blob of blobNodes) {
  resizeObserver.observe(blob.querySelector(".blob-copy"));
}

function hashSeed(value) {
  const input = String(value);
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(min, max, amount) {
  return min + (max - min) * amount;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(random, min, max) {
  return lerp(min, max, random());
}

function point(x, y) {
  return { x, y };
}

function catmullRomPath(points) {
  if (points.length < 2) return "";

  const commands = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
  const size = points.length;

  for (let index = 0; index < size; index += 1) {
    const p0 = points[(index - 1 + size) % size];
    const p1 = points[index];
    const p2 = points[(index + 1) % size];
    const p3 = points[(index + 2) % size];

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    commands.push(
      `C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    );
  }

  commands.push("Z");
  return commands.join(" ");
}

function createBlobPath(width, height, options) {
  const random = mulberry32(hashSeed(options.seed));
  const minDimension = Math.min(width, height);
  const cornerMax = Math.max(
    12,
    Math.min(minDimension * 0.36, Math.min(options.padX, options.padY) * 2.25),
  );
  const corner = clamp(minDimension * randomBetween(random, 0.18, 0.3), Math.min(18, cornerMax), cornerMax);
  const guard = Math.max(10, Math.min(options.padX, options.padY) * 0.56);
  const edge = clamp(options.wobble, 1, guard);
  const topInset = () => randomBetween(random, 0, edge);
  const rightInset = () => randomBetween(random, 0, edge);
  const bottomInset = () => randomBetween(random, 0, edge);
  const leftInset = () => randomBetween(random, 0, edge);

  const topSegments = clamp(Math.round(width / 150), 2, 5);
  const sideSegments = clamp(Math.round(height / 120), 1, 4);
  const points = [];

  points.push(point(randomBetween(random, corner * 0.72, corner * 1.16), topInset()));

  for (let index = 1; index < topSegments; index += 1) {
    const x = lerp(corner, width - corner, index / topSegments);
    points.push(point(x + randomBetween(random, -edge, edge), topInset()));
  }

  points.push(point(width - randomBetween(random, corner * 0.8, corner * 1.18), topInset()));
  points.push(point(width - rightInset(), randomBetween(random, corner * 0.62, corner * 1.06)));

  for (let index = 1; index < sideSegments; index += 1) {
    const y = lerp(corner, height - corner, index / sideSegments);
    points.push(point(width - rightInset(), y + randomBetween(random, -edge, edge)));
  }

  points.push(point(width - rightInset(), height - randomBetween(random, corner * 0.72, corner * 1.12)));
  points.push(point(width - randomBetween(random, corner * 0.78, corner * 1.2), height - bottomInset()));

  for (let index = topSegments - 1; index > 0; index -= 1) {
    const x = lerp(corner, width - corner, index / topSegments);
    points.push(point(x + randomBetween(random, -edge, edge), height - bottomInset()));
  }

  points.push(point(randomBetween(random, corner * 0.76, corner * 1.16), height - bottomInset()));
  points.push(point(leftInset(), height - randomBetween(random, corner * 0.72, corner * 1.08)));

  for (let index = sideSegments - 1; index > 0; index -= 1) {
    const y = lerp(corner, height - corner, index / sideSegments);
    points.push(point(leftInset(), y + randomBetween(random, -edge, edge)));
  }

  points.push(point(leftInset(), randomBetween(random, corner * 0.7, corner * 1.12)));

  const safePoints = points.map((candidate) =>
    point(clamp(candidate.x, 0, width), clamp(candidate.y, 0, height)),
  );

  return catmullRomPath(safePoints);
}

function getPadding(fit, limits = { looseX: 54, looseY: 38, tightX: 20, tightY: 16 }) {
  const tightness = fit / 100;
  return {
    x: Math.round(lerp(limits.looseX, limits.tightX, tightness)),
    y: Math.round(lerp(limits.looseY, limits.tightY, tightness)),
  };
}

function getWobble(rawWobble, padding) {
  return Math.round(lerp(0, 30, rawWobble / 100) * clamp(Math.min(padding.x, padding.y) / 28, 0.58, 1.15));
}

function updateBlob(blob) {
  if (!blob) return;

  const copy = blob.querySelector(".blob-copy");
  const svg = blob.querySelector(".blob-svg");
  const path = blob.querySelector(".blob-path");
  const bounds = copy.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(bounds.width));
  const height = Math.max(1, Math.ceil(bounds.height));
  const style = getComputedStyle(blob);
  const padX = parseFloat(style.getPropertyValue("--blob-pad-x")) || 30;
  const padY = parseFloat(style.getPropertyValue("--blob-pad-y")) || 22;
  const wobble = parseFloat(blob.dataset.wobble || "16");
  const seed = blob.dataset.seed || "1";

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  path.setAttribute("d", createBlobPath(width, height, { seed, wobble, padX, padY }));
}

function updateTone(blob, tone) {
  blob.classList.remove("tone-ink", "tone-fog", "tone-moss", "tone-paper");
  blob.classList.add(`tone-${tone}`);
  blob.dataset.tone = tone;
}

function applyState() {
  const mainFit = Number(controls.mainFit.value);
  const mainRawWobble = Number(controls.mainWobble.value);
  const mainMaxWidth = Number(controls.mainMaxWidth.value);
  const frame = Number(controls.frame.value);
  const mainSeed = Number(controls.mainSeed.value) || DEFAULTS.main.seed;
  const sampleFit = Number(controls.sampleFit.value);
  const sampleRawWobble = Number(controls.sampleWobble.value);
  const sampleMaxWidth = Number(controls.sampleMaxWidth.value);
  const sampleSeed = Number(controls.sampleSeed.value) || DEFAULTS.samples.seed;
  const mainPadding = getPadding(mainFit);
  const samplePadding = getPadding(sampleFit, {
    looseX: 46,
    looseY: 32,
    tightX: 8,
    tightY: 7,
  });
  const mainWobble = getWobble(mainRawWobble, mainPadding);
  const sampleWobble = getWobble(sampleRawWobble, samplePadding);

  outputs.mainFit.value = mainFit;
  outputs.mainWobble.value = mainRawWobble;
  outputs.mainMaxWidth.value = mainMaxWidth;
  outputs.frame.value = frame;
  outputs.sampleFit.value = sampleFit;
  outputs.sampleWobble.value = sampleRawWobble;
  outputs.sampleMaxWidth.value = sampleMaxWidth;

  previewCopy.textContent = controls.mainText.value;
  stageFrame.style.setProperty("--frame-width", `${frame}px`);

  preview.style.setProperty("--blob-pad-x", `${mainPadding.x}px`);
  preview.style.setProperty("--blob-pad-y", `${mainPadding.y}px`);
  preview.style.setProperty("--blob-max", `${mainMaxWidth}px`);
  preview.dataset.wobble = String(mainWobble);
  preview.dataset.seed = String(mainSeed);
  preview.classList.toggle("show-safe-box", controls.mainSafeBox.checked);
  updateTone(preview, controls.mainTone.value);

  for (const [index, blob] of sampleBlobs.entries()) {
    const ratio = sampleWidthRatios[index] || 1;
    const width = Math.round(sampleMaxWidth * ratio);

    blob.style.setProperty("--blob-pad-x", `${samplePadding.x}px`);
    blob.style.setProperty("--blob-pad-y", `${samplePadding.y}px`);
    blob.style.setProperty("--blob-max", `${width}px`);
    blob.dataset.wobble = String(sampleWobble);
    blob.dataset.seed = String(sampleSeed + Number(blob.dataset.seedOffset || index));
    blob.classList.toggle("show-safe-box", controls.sampleSafeBox.checked);
  }

  for (const [index, frameNode] of sampleFrames.entries()) {
    const ratio = sampleWidthRatios[index] || 1;
    frameNode.style.maxWidth = `${Math.round(sampleMaxWidth * ratio + 56)}px`;
  }

  requestAnimationFrame(() => {
    for (const blob of blobNodes) updateBlob(blob);
  });
}

function resetControls() {
  controls.mainText.value = DEFAULTS.main.text;
  controls.mainFit.value = DEFAULTS.main.fit;
  controls.mainWobble.value = DEFAULTS.main.wobble;
  controls.mainMaxWidth.value = DEFAULTS.main.maxWidth;
  controls.frame.value = DEFAULTS.main.frame;
  controls.mainSeed.value = DEFAULTS.main.seed;
  controls.mainTone.value = DEFAULTS.main.tone;
  controls.mainSafeBox.checked = DEFAULTS.main.safeBox;
  controls.sampleFit.value = DEFAULTS.samples.fit;
  controls.sampleWobble.value = DEFAULTS.samples.wobble;
  controls.sampleMaxWidth.value = DEFAULTS.samples.maxWidth;
  controls.sampleSeed.value = DEFAULTS.samples.seed;
  controls.sampleSafeBox.checked = DEFAULTS.samples.safeBox;
  applyState();
}

for (const input of [
  controls.mainText,
  controls.mainFit,
  controls.mainWobble,
  controls.mainMaxWidth,
  controls.frame,
  controls.mainSeed,
  controls.mainTone,
  controls.mainSafeBox,
  controls.sampleFit,
  controls.sampleWobble,
  controls.sampleMaxWidth,
  controls.sampleSeed,
  controls.sampleSafeBox,
]) {
  input.addEventListener("input", applyState);
}

controls.newMainSeed.addEventListener("click", () => {
  controls.mainSeed.value = Math.floor(Math.random() * 99999) + 1;
  applyState();
});

controls.newSampleSeed.addEventListener("click", () => {
  controls.sampleSeed.value = Math.floor(Math.random() * 99999) + 1;
  applyState();
});

controls.reset.addEventListener("click", resetControls);
window.addEventListener("resize", applyState);

if (document.fonts) {
  document.fonts.ready.then(applyState);
}

applyState();
