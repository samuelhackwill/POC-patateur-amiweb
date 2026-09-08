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

/** Generate a closed SVG outline in CSS pixels; this function does not access the DOM. */
export function createPatateurPath(width, height, { seed = 1, wobble = 16, padX = 30, padY = 22 } = {}) {
  const options = { seed, wobble, padX, padY };
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

