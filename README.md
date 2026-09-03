# Patateur

Responsive blob text prototype.

## Notes

- Goal: keep arbitrary-length text inside organic vector blobs without stretching a fixed asset.
- Stack: static HTML, CSS, JavaScript, and Vite for GitHub Pages builds.
- Entry point: `index.html`

## Model

Text controls the layout. The blob is generated around the measured text box.

1. Browser lays out the text with normal responsive wrapping.
2. `ResizeObserver` measures the resulting box.
3. JavaScript generates an SVG path around that exact width and height.
4. The same seed always produces the same blob personality.

The blob never clips the text. It sits behind a rectangular safe text area with responsive padding.

## Development

```sh
npm install
npm run dev
```

## GitHub Pages

The Pages workflow builds the site with:

```sh
VITE_BASE_PATH=/POC-patateur-amiweb/ npm run build
```

If the GitHub repository name is different, update `VITE_BASE_PATH` in `.github/workflows/deploy.yml`.
