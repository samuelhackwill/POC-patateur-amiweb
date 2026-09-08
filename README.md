# Patateur

Responsive blob text prototype.

Live site: https://samuelhackwill.github.io/POC-patateur-amiweb/

## Notes

- Goal: keep arbitrary-length text inside organic vector blobs without stretching a fixed asset.
- Stack: static HTML, CSS, JavaScript, and Vite for GitHub Pages builds.
- Entry point: `index.html`
- Independent API demo: `demo.html` (also linked from the controls page).

The demo mixes one-line and two-line decorations into ordinary sentences and a
wrapping row, then creates 20 cards with random notes, quotes, lists, and postcards.
Five initial cards are plain text with no background and never call the decoration
API. Shuffle
the text, change the page width, generate new outlines, or add/remove cards. The
organic-shapes toggle removes and reattaches the decorations while preserving the
layout. `src/demo.js` owns the content and calls the API; `demo.css` owns the layout.
Both pages are included in the production build.

## Model

Text controls the layout. The blob is generated around the measured text box.

1. Browser lays out the text with normal responsive wrapping.
2. `ResizeObserver` detects changes to the resulting container size.
3. JavaScript measures the container and generates an SVG path around it.
4. The same seed always produces the same blob personality.

The SVG is decorative and never clips the text. The caller supplies padding to keep
the text clear of the organic edges; the outline is not a guaranteed containment mask.

## Reusable decoration API

Load `src/patateur.css` and import `decoratePatateur` from `src/patateur.js`.
No demo controls, data attributes, or pre-existing SVG markup are required.

```html
<link rel="stylesheet" href="./src/patateur.css" />
<div class="card" id="intro"><p>Your text here.</p></div>
```

```css
/* The consuming page owns every layout decision. */
.card {
  box-sizing: border-box;
  width: fit-content;
  max-width: 100%;
  padding: 24px 36px;
  color: white;
  --patateur-fill: #151515;
}
.card p { margin: 0; }
```

```js
import { decoratePatateur } from "./src/patateur.js";

const element = document.querySelector("#intro");
const potato = decoratePatateur(element, { seed: 7319, wobble: 16 });

// Your application changes content and layout. Size changes redraw automatically.
element.querySelector("p").textContent = "A longer piece of text…";
element.style.maxWidth = "400px";

potato.setOptions({ seed: "another-outline", wobble: 8 });
element.style.setProperty("--patateur-fill", "#3f5d4a");

// Refresh after changing padding if the outer size stays the same.
potato.refresh();

// On component unmount, before removing the element:
potato.destroy();
```

- `decoratePatateur(element, options?)` adds one non-interactive, accessibility-hidden
  SVG and observes the container. Calling it again on the same element updates the
  options and returns the existing controller.
- `seed` is a string or finite number (default `1`). `wobble` is a non-negative
  amplitude in CSS pixels (default `16`), limited by available padding. The demo's
  0–100 slider is converted into pixels by the demo. Zero retains the original
  algorithm's small irregularity and randomised corners.
- `setOptions({ seed?, wobble? })` merges drawing options and schedules an update
  when they change. It does not alter layout or CSS.
- `refresh()` schedules a new measurement. Use it for padding changes that do not
  change the observed outer dimensions. Colour changes need no refresh.
- `destroy()` removes the SVG and the class added by the API, unobserves the
  element, and removes pending work. Repeated calls are safe; methods on a destroyed
  controller do nothing. The element can subsequently be decorated again.

Use a non-scrolling HTML container that can contain an SVG child, such as a `div`
or block-level `p`. The stylesheet establishes relative positioning and an isolated
stacking context; it does not set width, height, padding, typography, or wrapping.
For an already positioned container, preserve the desired `position` in your CSS.
The outline follows the container's padding box, measured in local CSS pixels
(rounded to integers), and uses its smallest horizontal/vertical padding as clearance.
Keep the SVG child when updating content: update a content child instead of replacing
the decorated container's entire `innerHTML` or `textContent`.

All instances share one observer and one pending animation-frame callback. Each
batch reads all dimensions before writing any SVG attributes; unchanged outlines
are skipped. Resize observation handles wrapping and font changes that alter the
container size. There is no continuous loop, global resize listener, or drawing
library dependency. Call `destroy()` when removing components from a long-lived page.

For callers that already know the dimensions or manage their own SVG, the DOM-free
`createPatateurPath(width, height, { seed, wobble, padX, padY })` export returns just
the path's `d` string. Dimensions must be positive, and padding/wobble non-negative,
finite CSS pixel values. Defaults are seed `1`, wobble `16`, padX `30`, padY `22`.
It can also be imported directly from `src/patateur-path.js` outside the browser.

## Development

```sh
npm install
npm run dev
```

Browser checks cover layout preservation, resizing, 20-instance update batching,
padding refreshes, cleanup, and the demo controls:

```sh
npx playwright install chromium
npm test
```

To use an existing Chrome installation, set `CHROMIUM_PATH` to its executable when
running `npm test`.

## GitHub Pages

The Pages workflow builds the site with:

```sh
VITE_BASE_PATH=/POC-patateur-amiweb/ npm run build
```

If the GitHub repository name is different, update `VITE_BASE_PATH` in `.github/workflows/deploy.yml`.
