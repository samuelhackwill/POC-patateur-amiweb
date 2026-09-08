import { decoratePatateur } from "./patateur.js";

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

// The demo owns content, layout, padding, and colours. Patateur only decorates.
const decorations = new Map(blobNodes.map((blob) => [blob, decoratePatateur(blob)]));

function lerp(min, max, amount) {
  return min + (max - min) * amount;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
  decorations.get(preview).setOptions({ wobble: mainWobble, seed: mainSeed });
  preview.classList.toggle("show-safe-box", controls.mainSafeBox.checked);
  updateTone(preview, controls.mainTone.value);

  for (const [index, blob] of sampleBlobs.entries()) {
    const ratio = sampleWidthRatios[index] || 1;
    const width = Math.round(sampleMaxWidth * ratio);

    blob.style.setProperty("--blob-pad-x", `${samplePadding.x}px`);
    blob.style.setProperty("--blob-pad-y", `${samplePadding.y}px`);
    blob.style.setProperty("--blob-max", `${width}px`);
    decorations.get(blob).setOptions({
      wobble: sampleWobble,
      seed: sampleSeed + Number(blob.dataset.seedOffset || index),
    });
    blob.classList.toggle("show-safe-box", controls.sampleSafeBox.checked);
  }

  for (const [index, frameNode] of sampleFrames.entries()) {
    const ratio = sampleWidthRatios[index] || 1;
    frameNode.style.maxWidth = `${Math.round(sampleMaxWidth * ratio + 56)}px`;
  }

  // Padding can change without changing the outer size, so explicitly refresh.
  for (const decoration of decorations.values()) decoration.refresh();
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
applyState();
