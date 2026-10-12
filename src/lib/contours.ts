/**
 * Procedural terrain drawn as contour lines. A height field is built from
 * layered value noise plus optional hills, then traced with marching
 * squares. Deterministic for a given seed, so the map is the same on every
 * visit and on every surface that draws it.
 */

export type Hill = { x: number; y: number; radius: number; height: number };

export type ContourOptions = {
  width: number;
  height: number;
  seed?: number;
  /** Size of the largest noise features, in the same units as width. */
  scale?: number;
  levels?: number;
  /** Grid cell size. Smaller is smoother and slower. */
  cell?: number;
  hills?: Hill[];
  color?: string;
  /** Opacity of ordinary lines. Every fourth line is drawn stronger. */
  alpha?: number;
  lineWidth?: number;
};

function hash(ix: number, iy: number, seed: number) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function heightAt(x: number, y: number, scale: number, seed: number, hills: Hill[]) {
  let v = 0;
  let amp = 0.55;
  let freq = 1 / scale;
  for (let o = 0; o < 4; o++) {
    v += amp * valueNoise(x * freq, y * freq, seed + o * 17);
    amp *= 0.5;
    freq *= 2.03;
  }
  for (const hill of hills) {
    const dx = (x - hill.x) / hill.radius;
    const dy = (y - hill.y) / hill.radius;
    v += hill.height * Math.exp(-(dx * dx + dy * dy));
  }
  return v;
}

export function drawContours(ctx: CanvasRenderingContext2D, opts: ContourOptions) {
  const {
    width,
    height,
    seed = 7,
    scale = 260,
    levels = 14,
    cell = 7,
    hills = [],
    color = "#5fd4e6",
    alpha = 0.3,
    lineWidth = 1,
  } = opts;

  const cols = Math.ceil(width / cell) + 1;
  const rows = Math.ceil(height / cell) + 1;
  const field = new Float32Array(cols * rows);
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const v = heightAt(i * cell, j * cell, scale, seed, hills);
      field[j * cols + i] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.lineJoin = "round";

  for (let l = 1; l < levels; l++) {
    const t = min + ((max - min) * l) / levels;
    ctx.globalAlpha = l % 4 === 0 ? Math.min(1, alpha * 2.1) : alpha;
    ctx.beginPath();
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = field[j * cols + i];
        const b = field[j * cols + i + 1];
        const c = field[(j + 1) * cols + i + 1];
        const d = field[(j + 1) * cols + i];
        const code = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0);
        if (code === 0 || code === 15) continue;
        const x = i * cell;
        const y = j * cell;
        // Where the level crosses each edge of the cell.
        const top = x + (cell * (t - a)) / (b - a);
        const right = y + (cell * (t - b)) / (c - b);
        const bottom = x + (cell * (t - d)) / (c - d);
        const left = y + (cell * (t - a)) / (d - a);
        const seg = (x1: number, y1: number, x2: number, y2: number) => {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        };
        switch (code) {
          case 1:
          case 14:
            seg(x, left, bottom, y + cell);
            break;
          case 2:
          case 13:
            seg(bottom, y + cell, x + cell, right);
            break;
          case 3:
          case 12:
            seg(x, left, x + cell, right);
            break;
          case 4:
          case 11:
            seg(top, y, x + cell, right);
            break;
          case 6:
          case 9:
            seg(top, y, bottom, y + cell);
            break;
          case 7:
          case 8:
            seg(x, left, top, y);
            break;
          case 5:
            seg(x, left, top, y);
            seg(bottom, y + cell, x + cell, right);
            break;
          case 10:
            seg(x, left, bottom, y + cell);
            seg(top, y, x + cell, right);
            break;
        }
      }
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
