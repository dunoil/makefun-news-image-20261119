// Thursday 19 November 2026 — the world's news in one picture.
// A from-scratch software renderer: hand-built bitmap typeface, vector
// scene illustrations, deterministic PNG encoder. Node 22, stdlib only.
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Writes entry.png (1024x1024, < 1 MiB). Deterministic: two runs are
// byte-identical (fixed seed, no clocks, no network, no assets).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- font --
// One 7x9 bitmap face, mixed case. Caps sit rows 0-6, x-height rows 2-6,
// descenders rows 7-8. '#' = ink. Drawn at scale 1 (briefs), 2 (card
// headlines), 3 (lead headline), 4 (masthead).
const FONT: Record<string, string[]> = {
  A: ['..###..', '.##.##.', '##...##', '##...##', '#######', '##...##', '##...##', '.......', '.......'],
  B: ['######.', '##...##', '##...##', '######.', '##...##', '##...##', '######.', '.......', '.......'],
  C: ['..####.', '.##...#', '##.....', '##.....', '##.....', '##.....', '.##...#', '..####.', '.......'],
  D: ['######.', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '######.', '.......'],
  E: ['#######', '##.....', '##.....', '#####..', '##.....', '##.....', '#######', '.......', '.......'],
  F: ['#######', '##.....', '##.....', '#####..', '##.....', '##.....', '##.....', '.......', '.......'],
  G: ['..####.', '.##...#', '##.....', '##..###', '##...##', '##...##', '.##.###', '..###..', '.......'],
  H: ['##...##', '##...##', '##...##', '#######', '##...##', '##...##', '##...##', '.......', '.......'],
  I: ['..###..', '...#...', '...#...', '...#...', '...#...', '...#...', '..###..', '.......', '.......'],
  J: ['....###', '.....##', '.....##', '.....##', '.....##', '##...##', '.##.##.', '..###..', '.......'],
  K: ['##...##', '##..##.', '##.##..', '####...', '##.##..', '##..##.', '##...##', '.......', '.......'],
  L: ['##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '#######', '.......', '.......'],
  M: ['##...##', '###.###', '#######', '##.#.##', '##...##', '##...##', '##...##', '.......', '.......'],
  N: ['##...##', '###..##', '####.##', '##.####', '##..###', '##...##', '##...##', '.......', '.......'],
  O: ['..###..', '.##.##.', '##...##', '##...##', '##...##', '##...##', '.##.##.', '..###..', '.......'],
  P: ['######.', '##...##', '##...##', '######.', '##.....', '##.....', '##.....', '.......', '.......'],
  Q: ['..###..', '.##.##.', '##...##', '##...##', '##.####', '##..###', '.##.##.', '..###.#', '.......'],
  R: ['######.', '##...##', '##...##', '######.', '##.##..', '##..##.', '##...##', '.......', '.......'],
  S: ['..####.', '.##...#', '##.....', '..###..', '....##.', '#...##.', '.####..', '.......', '.......'],
  T: ['#######', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '.......', '.......'],
  U: ['##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.', '.......', '.......'],
  V: ['##...##', '##...##', '##...##', '##...##', '##...##', '.##.##.', '..###..', '.......', '.......'],
  W: ['##...##', '##...##', '##...##', '##.#.##', '#######', '###.###', '##...##', '.......', '.......'],
  X: ['##...##', '##...##', '.##.##.', '..###..', '.##.##.', '##...##', '##...##', '.......', '.......'],
  Y: ['##...##', '##...##', '.##.##.', '..###..', '...#...', '...#...', '...#...', '.......', '.......'],
  Z: ['#######', '.....##', '....##.', '...##..', '..##...', '.##....', '#######', '.......', '.......'],
  a: ['.......', '.......', '.####..', '....##.', '.#####.', '##..##.', '.###.#.', '.......', '.......'],
  b: ['##.....', '##.....', '######.', '##...##', '##...##', '##...##', '######.', '.......', '.......'],
  c: ['.......', '.......', '..####.', '##.....', '##.....', '##.....', '..####.', '.......', '.......'],
  d: ['....##.', '....##.', '.#####.', '##..##.', '##...##', '##..##.', '.#####.', '.......', '.......'],
  e: ['.......', '.......', '.####..', '##..##.', '#######', '##.....', '.####..', '.......', '.......'],
  f: ['...##..', '..##...', '.####..', '..##...', '..##...', '..##...', '..##...', '.......', '.......'],
  g: ['.......', '.......', '.#####.', '##..##.', '##..##.', '.#####.', '....##.', '.####..', '.......'],
  h: ['##.....', '##.....', '######.', '##...##', '##...##', '##...##', '##...##', '.......', '.......'],
  i: ['.......', '...#...', '.......', '..##...', '..##...', '..##...', '..##...', '.......', '.......'],
  j: ['.......', '....#..', '.......', '...##..', '...##..', '...##..', '...##..', '##.##..', '..###..'],
  k: ['##.....', '##.....', '##..##.', '##.##..', '####...', '##.##..', '##..##.', '.......', '.......'],
  l: ['..##...', '..##...', '..##...', '..##...', '..##...', '..##...', '..##...', '.......', '.......'],
  m: ['.......', '.......', '###.##.', '#######', '##.#.##', '##.#.##', '##.#.##', '.......', '.......'],
  n: ['.......', '.......', '######.', '##...##', '##...##', '##...##', '##...##', '.......', '.......'],
  o: ['.......', '.......', '.####..', '##..##.', '##..##.', '##..##.', '.####..', '.......', '.......'],
  p: ['.......', '.......', '######.', '##...##', '##...##', '######.', '##.....', '##.....', '##.....'],
  q: ['.......', '.......', '.#####.', '##..##.', '##..##.', '.#####.', '....##.', '....##.', '....##.'],
  r: ['.......', '.......', '##.###.', '###..##', '##.....', '##.....', '##.....', '.......', '.......'],
  s: ['.......', '.......', '.####..', '##.....', '..###..', '....##.', '####...', '.......', '.......'],
  t: ['..#....', '..#....', '#####..', '..#....', '..#....', '..#....', '...##..', '.......', '.......'],
  u: ['.......', '.......', '##...##', '##...##', '##...##', '##..##.', '.#####.', '.......', '.......'],
  v: ['.......', '.......', '##...##', '##...##', '##...##', '.##.##.', '..###..', '.......', '.......'],
  w: ['.......', '.......', '##...##', '##.#.##', '#######', '###.###', '##...##', '.......', '.......'],
  x: ['.......', '.......', '##...##', '.##.##.', '..###..', '.##.##.', '##...##', '.......', '.......'],
  y: ['.......', '.......', '##...##', '##...##', '##...##', '.#####.', '....##.', '..###..', '.......'],
  z: ['.......', '.......', '#######', '....##.', '...##..', '..##...', '#######', '.......', '.......'],
  '0': ['..###..', '.##.##.', '##...##', '##..###', '##.####', '##...##', '.##.##.', '..###..', '.......'],
  '1': ['...#...', '..##...', '...#...', '...#...', '...#...', '...#...', '..###..', '.......', '.......'],
  '2': ['.####..', '##..##.', '....##.', '...##..', '..##...', '.##....', '#######', '.......', '.......'],
  '3': ['#####..', '....##.', '...##..', '..###..', '....##.', '##..##.', '.####..', '.......', '.......'],
  '4': ['...##..', '..###..', '.####..', '##.##..', '#######', '...##..', '...##..', '.......', '.......'],
  '5': ['#######', '##.....', '#####..', '....##.', '....##.', '##..##.', '.####..', '.......', '.......'],
  '6': ['..###..', '.##....', '##.....', '######.', '##...##', '##...##', '.####..', '.......', '.......'],
  '7': ['#######', '....##.', '...##..', '...##..', '..##...', '..##...', '..##...', '.......', '.......'],
  '8': ['.####..', '##..##.', '##..##.', '.####..', '##..##.', '##..##.', '.####..', '.......', '.......'],
  '9': ['.####..', '##..##.', '##..##.', '.#####.', '....##.', '...##..', '..###..', '.......', '.......'],
  '.': ['.......', '.......', '.......', '.......', '.......', '.......', '..##...', '..##...', '.......'],
  ',': ['.......', '.......', '.......', '.......', '.......', '.......', '..##...', '..##...', '.##....'],
  ':': ['.......', '.......', '..##...', '..##...', '.......', '..##...', '..##...', '.......', '.......'],
  ';': ['.......', '.......', '..##...', '..##...', '.......', '..##...', '..##...', '.##....', '.##....'],
  '!': ['..##...', '..##...', '..##...', '..##...', '..##...', '.......', '..##...', '..##...', '.......'],
  '?': ['.####..', '##..##.', '....##.', '...##..', '..##...', '.......', '..##...', '.......', '.......'],
  "'": ['..##...', '..##...', '.##....', '.......', '.......', '.......', '.......', '.......', '.......'],
  '"': ['.##.##.', '.##.##.', '.##.##.', '.......', '.......', '.......', '.......', '.......', '.......'],
  '(': ['....##.', '...##..', '..##...', '..##...', '..##...', '...##..', '....##.', '.......', '.......'],
  ')': ['.##....', '..##...', '...##..', '...##..', '...##..', '..##...', '.##....', '.......', '.......'],
  '-': ['.......', '.......', '.......', '#######', '.......', '.......', '.......', '.......', '.......'],
  '–': ['.......', '.......', '.......', '#######', '.......', '.......', '.......', '.......', '.......'],
  '—': ['.......', '.......', '.......', '#######', '.......', '.......', '.......', '.......', '.......'],
  '&': ['.####..', '##..##.', '##..##.', '.##.#..', '##.##..', '##..##.', '.###.#.', '.......', '.......'],
  $: ['..#....', '.####..', '##.#...', '.###...', '...##..', '.###...', '..#....', '.......', '.......'],
  '%': ['##...##', '##..##.', '....##.', '...##..', '..##...', '.##..##', '##...##', '.......', '.......'],
  '/': ['.....##', '....##.', '...##..', '..##...', '.##....', '##.....', '##.....', '.......', '.......'],
  '+': ['.......', '.......', '...#...', '...#...', '.#####.', '...#...', '...#...', '.......', '.......'],
  '=': ['.......', '.......', '.......', '#######', '.......', '#######', '.......', '.......', '.......'],
  '·': ['.......', '.......', '.......', '..##...', '..##...', '.......', '.......', '.......', '.......'],
  '*': ['.#.#.#.', '..###..', '.#####.', '..###..', '.#.#.#.', '.......', '.......', '.......', '.......'],
  '#': ['.##.##.', '.##.##.', '#######', '.##.##.', '#######', '.##.##.', '.##.##.', '.......', '.......'],
  _: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '#######', '.......'],
  ' ': ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
};

// -------------------------------------------------------------- canvas --
const W = 1024;
const H = 1024;

type RGB = [number, number, number];
const PAPER: RGB = [247, 243, 234];
const INK: RGB = [17, 17, 17];
const RED: RGB = [163, 22, 33];
const NAVY: RGB = [27, 58, 92];
const GREY: RGB = [110, 108, 100];
const LIGHT: RGB = [233, 227, 214];

function hex(c: RGB): number {
  return (c[0] << 16) | (c[1] << 8) | c[2];
}

class Canvas {
  data = new Uint8Array(W * H * 3);
  constructor() {
    for (let i = 0; i < W * H; i++) {
      this.data[i * 3] = PAPER[0];
      this.data[i * 3 + 1] = PAPER[1];
      this.data[i * 3 + 2] = PAPER[2];
    }
  }
  px(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2];
  }
  fill(x: number, y: number, w: number, h: number, c: RGB): void {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * W + x0) * 3;
      for (let xx = x0; xx < x1; xx++) {
        this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2];
        i += 3;
      }
    }
  }
  hline(x: number, y: number, w: number, c: RGB, t = 1): void { this.fill(x, y, w, t, c); }
  vline(x: number, y: number, h: number, c: RGB, t = 1): void { this.fill(x, y, t, h, c); }
  rect(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
    this.hline(x, y, w, c, t); this.hline(x, y + h - t, w, c, t);
    this.vline(x, y, h, c, t); this.vline(x + w - t, y, h, c, t);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    // round: float endpoints never met the integer equality test, so a
    // line once ran 4000 steps across the whole canvas
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, x = x0, y = y0;
    for (let n = 0; n < 4000; n++) {
      this.fill(x - ((t - 1) >> 1), y - ((t - 1) >> 1), t, t, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }
  circle(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y));
      this.fill(cx - w, cy + y, w * 2 + 1, 1, c);
    }
  }
  ring(cx: number, cy: number, r: number, c: RGB, t = 1): void {
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      for (let k = 0; k < t; k++) {
        this.px(Math.round(cx + (r + k - t / 2) * Math.cos(rad)), Math.round(cy + (r + k - t / 2) * Math.sin(rad)), c);
      }
    }
  }
  // filled polygon, scanline
  poly(pts: [number, number][], c: RGB): void {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        this.fill(Math.round(xs[k]), y, Math.max(1, Math.round(xs[k + 1]) - Math.round(xs[k])), 1, c);
      }
    }
  }
  // simple person: head + shoulders/body
  person(x: number, y: number, s: number, skin: RGB, shirt: RGB, pants: RGB): void {
    this.circle(x, y, Math.max(2, Math.round(3 * s)), skin);
    this.fill(x - Math.round(4 * s), y + Math.round(3 * s), Math.round(8 * s), Math.round(7 * s), shirt);
    this.fill(x - Math.round(3 * s), y + Math.round(10 * s), Math.round(3 * s), Math.round(8 * s), pants);
    this.fill(x + Math.round(1 * s), y + Math.round(10 * s), Math.round(3 * s), Math.round(8 * s), pants);
  }
  text(x: number, y: number, s: string, scale: number, c: RGB): number {
    let cx = x;
    for (const ch of s) {
      const g = FONT[ch] ?? FONT['?'];
      for (let r = 0; r < 9; r++) {
        const row = g[r];
        for (let col = 0; col < 7; col++) {
          if (row[col] === '#') this.fill(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
      cx += 8 * scale;
    }
    return cx;
  }
  textW(s: string, scale: number): number { return s.length * 8 * scale; }
  // wrap text to lines of at most maxW px at scale
  wrap(s: string, maxW: number, scale: number): string[] {
    const words = s.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (this.textW(t, scale) <= maxW) { cur = t; continue; }
      if (cur) lines.push(cur);
      cur = w;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  // centred text
  ctext(cx: number, y: number, s: string, scale: number, c: RGB): void {
    this.text(cx - Math.floor(this.textW(s, scale) / 2), y, s, scale, c);
  }
}

// deterministic PRNG for texture
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ png --
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}
function encodePNG(cv: Canvas): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const rowStart = y * (1 + W * 3);
    raw[rowStart] = 1; // Sub filter
    for (let x = 0; x < W; x++) {
      const si = (y * W + x) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const left = x === 0 ? 0 : cv.data[si - 3 + ch];
        raw[rowStart + 1 + x * 3 + ch] = (cv.data[si + ch] - left) & 0xff;
      }
    }
  }
  const idat = deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --------------------------------------------------------------- scenes --
// Each scene paints a recognisable vignette inside rect (x,y,w,h).
function scene(cv: Canvas, kind: string, x: number, y: number, w: number, h: number): void {
  const sky = (c: RGB) => cv.fill(x, y, w, h, c);
  const R = (a: number, b: number, c2: number, d: number, col: RGB) => cv.fill(x + a, y + b, c2, d, col);
  switch (kind) {
    case 'gta': { // Vice City sunset: skyline, palm, sports car
      sky([255, 122, 89]); R(0, h * 0.55, w, h * 0.45, [46, 24, 64]);
      cv.circle(x + w * 0.78, y + h * 0.3, 6, [255, 214, 130]);
      cv.fill(x + w * 0.05, y + h * 0.25, w * 0.08, h * 0.35, [30, 16, 44]);
      cv.fill(x + w * 0.16, y + h * 0.35, w * 0.1, h * 0.25, [30, 16, 44]);
      cv.fill(x + w * 0.3, y + h * 0.2, w * 0.07, h * 0.4, [30, 16, 44]);
      // palm
      cv.line(x + w * 0.62, y + h * 0.62, x + w * 0.62, y + h * 0.3, [20, 60, 30], 2);
      cv.line(x + w * 0.62, y + h * 0.3, x + w * 0.5, y + h * 0.22, [20, 60, 30], 2);
      cv.line(x + w * 0.62, y + h * 0.3, x + w * 0.74, y + h * 0.22, [20, 60, 30], 2);
      // car
      cv.fill(x + w * 0.38, y + h * 0.68, w * 0.34, h * 0.14, [255, 46, 99]);
      cv.fill(x + w * 0.44, y + h * 0.6, w * 0.18, h * 0.1, [255, 46, 99]);
      cv.circle(x + w * 0.45, y + h * 0.84, 3, [10, 10, 10]);
      cv.circle(x + w * 0.65, y + h * 0.84, 3, [10, 10, 10]);
      break;
    }
    case 'apec': { // three flags + handshake figures
      sky([214, 232, 244]);
      // flags on poles
      const flags: RGB[][] = [[[178, 34, 52], [255, 255, 255]], [[222, 41, 16], [255, 222, 0]], [[255, 255, 255], [0, 57, 166]]];
      for (let i = 0; i < 3; i++) {
        const fx = x + w * (0.14 + i * 0.3);
        cv.vline(fx, y + 2, h * 0.62, INK, 1);
        cv.fill(fx + 1, y + 2, w * 0.24, h * 0.2, flags[i][0]);
        cv.fill(fx + 1, y + 2 + h * 0.1, w * 0.24, h * 0.1, flags[i][1]);
      }
      cv.person(x + w * 0.32, y + h * 0.62, 1.1, [232, 190, 150], [27, 58, 92], [30, 30, 30]);
      cv.person(x + w * 0.62, y + h * 0.62, 1.1, [240, 205, 170], [163, 22, 33], [30, 30, 30]);
      cv.line(x + w * 0.4, y + h * 0.72, x + w * 0.55, y + h * 0.72, [120, 90, 40], 2);
      break;
    }
    case 'speaker': { // Capitol dome + podium figure
      sky([232, 238, 245]);
      cv.fill(x + w * 0.42, y + h * 0.18, w * 0.16, h * 0.2, [245, 245, 240]);
      cv.circle(x + w * 0.5, y + h * 0.18, 5, [245, 245, 240]);
      cv.fill(x + w * 0.3, y + h * 0.38, w * 0.4, h * 0.1, [245, 245, 240]);
      for (let i = 0; i < 5; i++) cv.vline(x + w * (0.33 + i * 0.07), y + h * 0.38, h * 0.12, [200, 200, 195], 2);
      cv.fill(x + w * 0.05, y + h * 0.55, w * 0.9, h * 0.06, [180, 180, 175]);
      cv.person(x + w * 0.5, y + h * 0.6, 1.1, [90, 60, 40], [27, 58, 92], [30, 30, 30]);
      cv.fill(x + w * 0.4, y + h * 0.82, w * 0.2, h * 0.12, [120, 80, 40]);
      break;
    }
    case 'chip': { // green chip + rising chart
      sky([18, 60, 40]);
      cv.fill(x + w * 0.32, y + h * 0.22, w * 0.36, h * 0.56, [16, 40, 28]);
      cv.rect(x + w * 0.32, y + h * 0.22, w * 0.36, h * 0.56, [118, 200, 90], 2);
      cv.fill(x + w * 0.42, y + h * 0.38, w * 0.16, h * 0.24, [118, 200, 90]);
      for (let i = 0; i < 3; i++) {
        cv.hline(x + w * 0.28, y + h * (0.3 + i * 0.16), w * 0.04, [118, 200, 90], 2);
        cv.hline(x + w * 0.68, y + h * (0.3 + i * 0.16), w * 0.04, [118, 200, 90], 2);
      }
      cv.line(x + w * 0.06, y + h * 0.85, x + w * 0.3, y + h * 0.6, [255, 214, 130], 2);
      cv.line(x + w * 0.3, y + h * 0.6, x + w * 0.55, y + h * 0.68, [255, 214, 130], 2);
      cv.line(x + w * 0.55, y + h * 0.68, x + w * 0.92, y + h * 0.3, [255, 214, 130], 2);
      break;
    }
    case 'cyclone': { // spiral storm over a coastline
      sky([176, 208, 224]);
      cv.fill(x, y + h * 0.72, w, h * 0.28, [212, 190, 150]);
      cv.circle(x + w * 0.45, y + h * 0.42, 13, [255, 255, 255]);
      cv.ring(x + w * 0.45, y + h * 0.42, 13, [120, 140, 160], 3);
      cv.ring(x + w * 0.45, y + h * 0.42, 20, [255, 255, 255], 3);
      cv.ring(x + w * 0.45, y + h * 0.42, 27, [120, 140, 160], 2);
      cv.circle(x + w * 0.45, y + h * 0.42, 4, [90, 110, 130]);
      cv.line(x + w * 0.1, y + h * 0.2, x + w * 0.3, y + h * 0.25, [255, 255, 255], 2);
      cv.line(x + w * 0.7, y + h * 0.15, x + w * 0.9, y + h * 0.22, [255, 255, 255], 2);
      cv.fill(x + w * 0.7, y + h * 0.72, w * 0.05, h * 0.16, [60, 90, 60]);
      cv.fill(x + w * 0.78, y + h * 0.7, w * 0.05, h * 0.18, [60, 90, 60]);
      break;
    }
    case 'voyager': { // black space, dish, stars, pale sun
      sky([8, 12, 28]);
      const rnd = mulberry32(7);
      for (let i = 0; i < 26; i++) cv.px(x + Math.floor(rnd() * w), y + Math.floor(rnd() * h * 0.8), [255, 255, 255]);
      cv.circle(x + w * 0.12, y + h * 0.22, 4, [255, 240, 180]);
      // dish spacecraft
      cv.poly([[x + w * 0.55, y + h * 0.55], [x + w * 0.85, y + h * 0.4], [x + w * 0.9, y + h * 0.55], [x + w * 0.6, y + h * 0.7]], [200, 200, 210]);
      cv.line(x + w * 0.55, y + h * 0.55, x + w * 0.35, y + h * 0.75, [200, 200, 210], 2);
      cv.line(x + w * 0.35, y + h * 0.75, x + w * 0.15, y + h * 0.72, [255, 214, 130], 2);
      cv.line(x + w * 0.35, y + h * 0.75, x + w * 0.2, y + h * 0.9, [255, 214, 130], 2);
      break;
    }
    case 'fed': { // bank columns + rate arrow
      sky([226, 232, 238]);
      cv.fill(x + w * 0.08, y + h * 0.15, w * 0.5, h * 0.12, [245, 245, 240]);
      cv.poly([[x + w * 0.08, y + h * 0.15], [x + w * 0.33, y + h * 0.02], [x + w * 0.58, y + h * 0.15]], [200, 200, 195]);
      for (let i = 0; i < 4; i++) cv.fill(x + w * (0.12 + i * 0.11), y + h * 0.3, w * 0.05, h * 0.45, [245, 245, 240]);
      cv.fill(x + w * 0.08, y + h * 0.78, w * 0.5, h * 0.08, [200, 200, 195]);
      cv.line(x + w * 0.66, y + h * 0.8, x + w * 0.78, y + h * 0.5, [163, 22, 33], 3);
      cv.line(x + w * 0.78, y + h * 0.5, x + w * 0.92, y + h * 0.55, [163, 22, 33], 3);
      cv.poly([[x + w * 0.88, y + h * 0.42], [x + w * 0.96, y + h * 0.55], [x + w * 0.86, y + h * 0.6]], [163, 22, 33]);
      break;
    }
    case 'eu': { // EU flag + coins
      sky([0, 51, 153]);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        cv.circle(x + w * 0.3 + Math.round(Math.cos(a) * w * 0.16), y + h * 0.5 + Math.round(Math.sin(a) * h * 0.3), 2, [255, 204, 0]);
      }
      cv.circle(x + w * 0.72, y + h * 0.68, 9, [255, 204, 0]);
      cv.circle(x + w * 0.82, y + h * 0.62, 8, [255, 214, 130]);
      cv.circle(x + w * 0.9, y + h * 0.72, 7, [255, 204, 0]);
      break;
    }
    case 'vangogh': { // swirling sky + chestnut tree + gilt frame
      sky([70, 110, 180]);
      cv.circle(x + w * 0.8, y + h * 0.22, 5, [255, 240, 160]);
      for (let i = 0; i < 3; i++) cv.line(x + w * 0.05, y + h * (0.18 + i * 0.14), x + w * 0.55, y + h * (0.24 + i * 0.14), [255, 220, 120], 2);
      cv.fill(x, y + h * 0.68, w, h * 0.32, [90, 140, 70]);
      cv.line(x + w * 0.5, y + h * 0.68, x + w * 0.5, y + h * 0.4, [90, 60, 30], 3);
      cv.circle(x + w * 0.5, y + h * 0.36, 10, [40, 120, 50]);
      cv.circle(x + w * 0.38, y + h * 0.44, 8, [60, 150, 70]);
      cv.circle(x + w * 0.62, y + h * 0.44, 8, [60, 150, 70]);
      cv.circle(x + w * 0.44, y + h * 0.32, 3, [255, 255, 255]);
      cv.circle(x + w * 0.58, y + h * 0.4, 3, [255, 255, 255]);
      cv.rect(x, y, w, h, [200, 160, 60], 2);
      break;
    }
    case 'anthropic': { // stock chart + ANT ticker
      sky([255, 250, 235]);
      cv.fill(x + w * 0.06, y + h * 0.12, w * 0.3, h * 0.3, [210, 80, 50]);
      cv.text(x + w * 0.1, y + h * 0.16, 'ANT', 1, [255, 255, 255]);
      cv.line(x + w * 0.05, y + h * 0.85, x + w * 0.2, y + h * 0.6, [27, 58, 92], 2);
      cv.line(x + w * 0.2, y + h * 0.6, x + w * 0.45, y + h * 0.66, [27, 58, 92], 2);
      cv.line(x + w * 0.45, y + h * 0.66, x + w * 0.7, y + h * 0.4, [27, 58, 92], 2);
      cv.line(x + w * 0.7, y + h * 0.4, x + w * 0.95, y + h * 0.18, [27, 58, 92], 2);
      cv.poly([[x + w * 0.9, y + h * 0.1], [x + w * 0.97, y + h * 0.22], [x + w * 0.86, y + h * 0.24]], [27, 58, 92]);
      break;
    }
    case 'bridge': { // bridge arch over sea, broken span, smoke
      sky([190, 210, 225]);
      cv.fill(x, y + h * 0.62, w, h * 0.38, [70, 120, 160]);
      cv.line(x + w * 0.02, y + h * 0.55, x + w * 0.98, y + h * 0.55, [90, 90, 95], 3);
      cv.line(x + w * 0.1, y + h * 0.55, x + w * 0.5, y + h * 0.3, [90, 90, 95], 3);
      cv.line(x + w * 0.9, y + h * 0.55, x + w * 0.5, y + h * 0.3, [90, 90, 95], 3);
      cv.vline(x + w * 0.5, y + h * 0.3, h * 0.25, [90, 90, 95], 2);
      // broken middle span
      cv.fill(x + w * 0.44, y + h * 0.55, w * 0.12, h * 0.05, [70, 120, 160]);
      cv.line(x + w * 0.44, y + h * 0.55, x + w * 0.47, y + h * 0.68, [90, 90, 95], 2);
      cv.circle(x + w * 0.5, y + h * 0.42, 4, [255, 180, 60]);
      cv.circle(x + w * 0.54, y + h * 0.36, 6, [120, 120, 120]);
      break;
    }
    case 'gaza': { // tanks on a road, smoke, buildings
      sky([232, 214, 180]);
      cv.fill(x, y + h * 0.6, w, h * 0.4, [200, 180, 140]);
      cv.fill(x + w * 0.06, y + h * 0.3, w * 0.14, h * 0.3, [180, 170, 150]);
      cv.fill(x + w * 0.24, y + h * 0.4, w * 0.12, h * 0.2, [170, 160, 140]);
      cv.fill(x + w * 0.7, y + h * 0.35, w * 0.16, h * 0.25, [180, 170, 150]);
      // tank
      cv.fill(x + w * 0.4, y + h * 0.62, w * 0.3, h * 0.12, [80, 90, 70]);
      cv.fill(x + w * 0.48, y + h * 0.54, w * 0.14, h * 0.08, [80, 90, 70]);
      cv.line(x + w * 0.62, y + h * 0.56, x + w * 0.8, y + h * 0.5, [60, 70, 55], 2);
      cv.circle(x + w * 0.46, y + h * 0.78, 3, [40, 40, 40]);
      cv.circle(x + w * 0.56, y + h * 0.78, 3, [40, 40, 40]);
      cv.circle(x + w * 0.66, y + h * 0.78, 3, [40, 40, 40]);
      cv.circle(x + w * 0.82, y + h * 0.28, 5, [110, 110, 110]);
      cv.circle(x + w * 0.86, y + h * 0.2, 4, [130, 130, 130]);
      break;
    }
    case 'saff': { // football pitch, players, ball, trophy
      sky([40, 130, 60]);
      cv.fill(x, y + h * 0.1, w, h * 0.9, [52, 150, 70]);
      cv.hline(x, y + h * 0.5, w, [255, 255, 255], 1);
      cv.circle(x + w * 0.5, y + h * 0.5, 8, [255, 255, 255]);
      cv.ring(x + w * 0.5, y + h * 0.5, 8, [255, 255, 255], 1);
      cv.person(x + w * 0.25, y + h * 0.45, 1.1, [190, 140, 100], [20, 60, 160], [255, 255, 255]);
      cv.person(x + w * 0.72, y + h * 0.5, 1.1, [200, 150, 110], [0, 120, 60], [0, 80, 40]);
      cv.circle(x + w * 0.5, y + h * 0.78, 4, [255, 255, 255]);
      // trophy
      cv.fill(x + w * 0.88, y + h * 0.12, w * 0.06, h * 0.12, [255, 204, 0]);
      cv.fill(x + w * 0.89, y + h * 0.24, w * 0.04, h * 0.04, [255, 204, 0]);
      break;
    }
  }
}

// -------------------------------------------------------------- layout --
// Story data: [num, region, field, headline, deck, scene]
type Card = [number, string, string, string, string, string];
const CARDS: Card[] = [
  [2, 'AMERICAS', 'GAMES', 'GTA VI rolls out worldwide', 'Vice City opens at midnight, time zone by time zone. Metacritic 99.', 'gta'],
  [3, 'ASIA', 'DIPLOMACY', 'Trump, Xi and Putin to meet in Shenzhen', 'First trilateral at the APEC summit. Ukraine, Iran, nukes on the table.', 'apec'],
  [4, 'AMERICAS', 'POLITICS', 'Jeffries nominated for Speaker', 'Democrats vote 251-11. First Black Speaker if elected on 3 January.', 'speaker'],
  [5, 'AMERICAS', 'TECHNOLOGY', 'Nvidia doubles revenue to $115.84bn', 'First report since Huang quit. Next quarter guided at $130bn.', 'chip'],
  [6, 'ASIA', 'WEATHER', "Cyclone Akvan nears India's east coast", 'Red alert in Andhra Pradesh. Landfall due Friday, winds 120-130 km/h.', 'cyclone'],
  [7, 'WORLD', 'SPACE', 'Voyager 1 reaches one light-day', 'First object one light-day from Earth. Signals take 24 hours.', 'voyager'],
  [8, 'AMERICAS', 'ECONOMY', 'Fed minutes point to more rate hikes', 'Most officials see further rises if inflation holds. Hold was 10-2.', 'fed'],
  [9, 'EUROPE', 'DIPLOMACY', 'EU proposes EUR 45bn loan for Ukraine', 'Repaid after Russia pays reparations, Brussels says. 25bn for arms.', 'eu'],
  [10, 'WORLD', 'CULTURE', 'Van Gogh sells for record $190.4m', "Chestnut Trees in Blossom at Sotheby's after a Nazi-era row is settled.", 'vangogh'],
  [11, 'AMERICAS', 'TECHNOLOGY', 'Anthropic lists on Nasdaq', 'Claude-maker ANT lists. Up to $1.4tn value, $64bn raised.', 'anthropic'],
  [12, 'EUROPE', 'WAR', 'Crimean Bridge hit again', 'Traffic halted. Road arch fell into the sea this week.', 'bridge'],
  [13, 'MID EAST', 'WAR', 'Israeli tanks cross Gaza line', 'First ground raid since the truce. Three killed.', 'gaza'],
  [14, 'ASIA', 'SPORT', 'India beat Pakistan 2-1', "Mandi's 88th-minute header seals a record 10th title.", 'saff'],
];

const BRIEFS: [number, string, string][] = [
  [15, 'US', 'Senators warn of AI cyber risks'],
  [16, 'France', 'Melenchon could win in 2027'],
  [17, 'Saudi Arabia', 'Danger passed in south'],
  [18, 'Libya', 'Cocaine, pills seized in east'],
  [19, 'India-Japan', 'Defence ties in 2+2'],
  [20, 'Canada', 'Carney adjusts China ties'],
  [21, 'Australia', 'Sanctions on settlers'],
  [22, 'US', 'Peltola completes Senate 56-44'],
  [23, 'US', 'Tougher green-card rules eyed'],
  [24, 'Germany', 'IMF lifts growth to 1.3%'],
  [25, 'US', 'Trump to import Russian diesel'],
  [26, 'England', 'Drought in 82% of territory'],
  [27, 'Germany', 'Cosco takeover blocked'],
  [28, 'EU', 'Russia sanctions extended 3 years'],
  [29, 'World', 'Third carrier reaches the Gulf'],
  [30, 'Gaza', 'Senior Hamas commander killed'],
  [31, 'Gaza', 'Hamas tunnel destroyed in Gaza'],
  [32, 'World', '20m drones planned for Ukraine'],
  [33, 'World', 'Islam largest faith by 2035'],
  [34, 'World', 'Missing billion years found'],
  [35, 'UK', 'EasyJet safe after bird strike'],
  [36, 'Bulgaria', 'Tanker hit by projectiles'],
  [37, 'Sport', 'Duckett 133, England on top'],
  [38, 'Sport', 'Germany women win 4-2'],
  [39, 'India', 'Railways review Akvan plans'],
  [40, 'US', 'Judge keeps Trump arch frozen'],
  [41, 'World', 'Oil slides, Brent $88.73'],
  [42, 'Kenya', 'Ruto State of Nation speech'],
  [43, 'Somalia', 'UAE accused of secret bases'],
  [44, 'Asia', 'Myanmar genocide verdict due'],
];

// region counts: [label, count, colour]
const REGIONS: [string, number, RGB][] = [
  ['MID EAST', 5, [120, 90, 20]],
  ['AMERICAS', 11, [27, 58, 92]],
  ['ASIA', 6, [163, 22, 33]],
  ['EUROPE', 9, [40, 90, 120]],
  ['AFRICA', 3, [110, 60, 140]],
  ['OCEANIA', 3, [20, 120, 110]],
  ['WORLD', 7, [90, 90, 90]],
];

const STATS: [string, string][] = [
  ['$115.8bn', 'Nvidia revenue'],
  ['EUR 45bn', 'EU loan for Kyiv'],
  ['$190.4m', 'Van Gogh record'],
  ['24 hours', 'Voyager signals'],
  ['251-11', 'Jeffries vote'],
  ['120 km/h', 'Akvan winds'],
  ['99', 'GTA VI score'],
];

// world-map projection inside rect (mx,my,mw,mh): lon -180..180, lat 75..-60
function proj(mx: number, my: number, mw: number, mh: number, lon: number, lat: number): [number, number] {
  return [mx + ((lon + 180) / 360) * mw, my + ((75 - lat) / 135) * mh];
}
const CONTINENTS: [number, number][][] = [
  [[-168, 66], [-140, 70], [-125, 72], [-110, 73], [-95, 80], [-85, 76], [-75, 72], [-60, 60], [-55, 47], [-70, 42], [-75, 35], [-80, 26], [-90, 21], [-97, 16], [-105, 20], [-115, 28], [-125, 40], [-140, 60], [-165, 60]],
  [[-55, 60], [-45, 60], [-40, 70], [-30, 76], [-55, 76], [-60, 70]],
  [[-80, 10], [-75, 5], [-60, 5], [-50, 0], [-35, -8], [-40, -20], [-50, -30], [-60, -40], [-70, -50], [-75, -35], [-75, -20], [-80, -5]],
  [[-10, 36], [-5, 44], [0, 50], [5, 55], [10, 58], [20, 60], [25, 65], [30, 70], [40, 68], [45, 60], [40, 50], [30, 45], [20, 40], [10, 38], [0, 36]],
  [[-17, 15], [-10, 30], [0, 35], [10, 37], [20, 32], [30, 31], [35, 28], [40, 15], [50, 11], [45, 0], [40, -10], [35, -20], [30, -30], [20, -35], [15, -25], [12, -10], [8, 4], [-8, 4]],
  [[40, 70], [60, 70], [80, 73], [100, 77], [120, 75], [140, 72], [160, 70], [178, 66], [170, 60], [160, 55], [150, 45], [140, 40], [130, 35], [120, 30], [110, 20], [105, 10], [100, 5], [95, 15], [90, 22], [85, 20], [80, 10], [75, 8], [70, 20], [60, 25], [55, 25], [50, 30], [45, 30], [40, 35], [40, 45], [40, 55]],
  [[113, -22], [114, -30], [120, -34], [130, -32], [140, -38], [150, -37], [153, -27], [146, -19], [142, -11], [136, -12], [132, -11], [126, -14], [122, -17]],
  [[95, -5], [100, -2], [105, -6], [110, -7], [115, -3], [120, -2], [125, -8], [130, -3], [135, -4], [140, -6], [105, -8]],
];
// card pin positions [lon, lat]
const PINS: [number, number, number][] = [
  [1, 50, 28], [2, -100, 40], [3, 114, 22], [4, -80, 45], [5, -122, 37],
  [6, 82, 17], [7, 165, 65], [8, -95, 30], [9, 4, 51], [10, -70, 38],
  [11, -115, 45], [12, 34, 45], [13, 34, 31], [14, 95, 28],
];
// brief dot positions [num, lon, lat]
const DOTS: [number, number, number][] = [
  [15, -77, 39], [16, 2, 47], [17, 45, 24], [18, 20, 32], [19, 90, 35],
  [20, -105, 55], [21, 135, -25], [22, -150, 64], [23, -77, 39], [24, 10, 51],
  [25, -77, 39], [26, -1, 52], [27, 10, 51], [28, 15, 50], [29, 58, 25],
  [30, 34, 31], [31, 34, 31], [32, 35, 50], [33, 0, 0], [34, -110, 40],
  [35, -3, 51], [36, 28, 43], [37, 135, -25], [38, 10, 51], [39, 78, 21],
  [40, -77, 39], [41, 0, 0], [42, 37, 0], [43, 46, 6], [44, 96, 20],
];

function drawGulfMap(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fill(x, y, w, h, [232, 222, 196]); // land
  // sea: Persian Gulf shape
  cv.poly([
    [x + w * 0.28, y + h * 0.42], [x + w * 0.45, y + h * 0.3], [x + w * 0.7, y + h * 0.34],
    [x + w * 0.92, y + h * 0.3], [x + w * 0.97, y + h * 0.42], [x + w * 0.85, y + h * 0.55],
    [x + w * 0.6, y + h * 0.62], [x + w * 0.35, y + h * 0.58], [x + w * 0.28, y + h * 0.5],
  ], [168, 205, 225]);
  // land masses above/below
  cv.poly([[x, y], [x + w, y], [x + w * 0.92, y + h * 0.3], [x + w * 0.45, y + h * 0.3], [x + w * 0.28, y + h * 0.42], [x, y + h * 0.35]], [232, 222, 196]);
  cv.fill(x, y + h * 0.62, w, h * 0.38, [222, 210, 180]);
  cv.text(x + 8, y + 8, 'IRAN', 1, INK);
  cv.text(x + 6, y + h * 0.42, 'IRAQ', 1, INK);
  cv.text(x + w * 0.55, y + h * 0.82, 'SAUDI ARABIA', 1, INK);
  // Qeshm, Kuwait, Bahrain
  const qx = x + w * 0.62, qy = y + h * 0.36;
  const kx = x + w * 0.42, ky = y + h * 0.44;
  const bx = x + w * 0.62, by = y + h * 0.52;
  cv.text(x + w * 0.55, y + h * 0.24, 'QESHM ISLAND', 1, INK);
  cv.text(x + w * 0.3, y + h * 0.36, 'KUWAIT', 1, INK);
  cv.text(x + w * 0.68, y + h * 0.46, 'BAHRAIN', 1, INK);
  // dashed strike lines
  const dash = (ax: number, ay: number, bx2: number, by2: number) => {
    const n = 12;
    for (let i = 0; i < n; i += 2) {
      cv.line(ax + ((bx2 - ax) * i) / n, ay + ((by2 - ay) * i) / n, ax + ((bx2 - ax) * (i + 1)) / n, ay + ((by2 - ay) * (i + 1)) / n, RED, 2);
    }
  };
  dash(qx, qy, kx, ky); dash(qx, qy, bx, by);
  cv.circle(qx, qy, 4, RED); cv.circle(kx, ky, 4, RED); cv.circle(bx, by, 4, RED);
  cv.circle(qx, qy, 2, [255, 255, 255]); cv.circle(kx, ky, 2, [255, 255, 255]); cv.circle(bx, by, 2, [255, 255, 255]);
  // tags
  const t1 = 'US BASE HIT';
  cv.fill(kx - 8, ky + 10, cv.textW(t1, 1) + 8, 12, RED);
  cv.text(kx - 4, ky + 11, t1, 1, [255, 255, 255]);
  const t2 = 'RADAR HIT';
  cv.fill(bx - 4, by + 10, cv.textW(t2, 1) + 8, 12, INK);
  cv.text(bx, by + 11, t2, 1, [255, 255, 255]);
  cv.rect(x, y, w, h, INK, 1);
}

function drawWorldMap(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fill(x, y, w, h, [214, 230, 238]);
  for (const cont of CONTINENTS) {
    const pts = cont.map(([lo, la]) => proj(x, y, w, h, lo, la));
    cv.poly(pts, [178, 205, 170]);
  }
  cv.text(x + 4, y + 4, 'NORTH AMERICA', 1, GREY);
  cv.text(x + w * 0.52, y + h * 0.12, 'EUROPE', 1, GREY);
  cv.text(x + w * 0.72, y + h * 0.3, 'ASIA', 1, GREY);
  cv.text(x + w * 0.42, y + h * 0.55, 'AFRICA', 1, GREY);
  cv.text(x + w * 0.78, y + h * 0.82, 'OCEANIA', 1, GREY);
  cv.text(x + w * 0.06, y + h * 0.68, 'S. AMERICA', 1, GREY);
  // brief dots first, pins on top
  for (const [n, lo, la] of DOTS) {
    const [px, py] = proj(x, y, w, h, lo, la);
    cv.circle(px, py, 2, [120, 40, 50]);
  }
  for (const [n, lo, la] of PINS) {
    const [px, py] = proj(x, y, w, h, lo, la);
    cv.circle(px, py, 5, RED);
    const s = String(n);
    cv.text(px - (s.length === 1 ? 3 : 6), py - 3, s, 1, [255, 255, 255]);
  }
  cv.rect(x, y, w, h, INK, 1);
}

function render(): Canvas {
  const cv = new Canvas();

  const X0 = 10, X1 = 1014, CW = X1 - X0;

  // top rules
  cv.hline(X0, 6, CW, INK, 2);
  cv.hline(X0, 10, CW, INK, 1);
  // kicker
  cv.text(X0, 15, "THE WORLD'S NEWS IN ONE PICTURE", 1, RED);
  const kr = '44 STORIES  ·  7 REGIONS  ·  10 FIELDS  ·  14 ILLUSTRATED';
  cv.text(X1 - cv.textW(kr, 1), 15, kr, 1, INK);
  cv.hline(X0, 27, CW, INK, 1);
  // masthead
  cv.text(X0, 31, 'Thursday 19 November 2026', 4, INK);
  cv.hline(X0, 68, CW, INK, 2);

  // region bar
  let rx = X0;
  const total = REGIONS.reduce((a, r) => a + r[1], 0);
  for (const [label, count, col] of REGIONS) {
    const w = Math.round((count / total) * CW);
    cv.fill(rx, 72, w, 16, col);
    const t = `${label} ${count}`;
    if (cv.textW(t, 1) < w - 4) cv.text(rx + 4, 75, t, 1, [255, 255, 255]);
    rx += w;
  }
  // field bar
  cv.fill(X0, 90, CW, 14, INK);
  cv.text(X0 + 4, 92, 'BY FIELD: War 14 · Politics 11 · Economy 3 · Tech 3 · Society 4 · Disasters 5 · Space 1 · Sport 3 · Games 1 · Justice 1', 1, [255, 255, 255]);

  // DAY IN NUMBERS
  const sw = CW / STATS.length;
  STATS.forEach(([num, label], i) => {
    const sx = X0 + i * sw;
    if (i > 0) cv.vline(sx, 108, 28, [200, 195, 185], 1);
    cv.text(sx + 4, 108, num, 2, RED);
    cv.text(sx + 4, 127, label, 1, INK);
  });
  cv.hline(X0, 140, CW, INK, 2);

  // ---- lead story ----
  const LY = 146, LH = 156;
  drawGulfMap(cv, X0, LY, 330, LH);
  const lx = 352;
  cv.fill(lx, LY, cv.textW('MIDDLE EAST  ·  GULF WAR', 1) + 10, 13, RED);
  cv.text(lx + 5, LY + 2, 'MIDDLE EAST  ·  GULF WAR', 1, [255, 255, 255]);
  const leadHead = cv.wrap('US and Iran trade fire as Gulf attacks widen', 660, 3);
  let hy = LY + 18;
  for (const ln of leadHead) { cv.text(lx, hy, ln, 3, INK); hy += 29; }
  const deck = cv.wrap('Tehran hit a US base in Kuwait and struck Bahrain again, widening an exchange that opened with US strikes on Qeshm Island.', 660, 1);
  let dy = hy + 4;
  for (const ln of deck) { cv.text(lx, dy, ln, 1, INK); dy += 11; }
  const bullets = [
    '· Kuwait: US base hit as Iran widens targets',
    '· Bahrain: radar site struck for a second time',
    '· Oil slides as Gulf risk rises; third carrier arrives',
  ];
  dy += 3;
  for (const b of bullets) { cv.text(lx, dy, b, 1, INK); dy += 11; }
  cv.hline(X0, LY + LH + 4, CW, INK, 1);

  // ---- cards ----
  const CY = 310, CH = 106, CG = 4;
  const rows: Card[][] = [
    CARDS.slice(0, 3), CARDS.slice(3, 6), CARDS.slice(6, 9), CARDS.slice(9, 13),
  ];
  rows.forEach((row, ri) => {
    const y = CY + ri * (CH + CG);
    const n = row.length;
    const cw = n === 3 ? 330 : 246;
    const gap = n === 3 ? 7 : 6;
    row.forEach((c, ci) => {
      const [num, region, field, head, dk, kind] = c;
      const cx = X0 + ci * (cw + gap);
      // image strip
      scene(cv, kind, cx, y, cw, 30);
      cv.rect(cx, y, cw, 30, INK, 1);
      // number badge + tag
      cv.fill(cx, y + 32, 14, 12, RED);
      cv.text(cx + 4, y + 33, String(num), 1, [255, 255, 255]);
      cv.text(cx + 18, y + 33, `${region}  ·  ${field}`, 1, RED);
      // headline (scale 2, up to 2 lines, 19px line height for 18px glyphs)
      const hl = cv.wrap(head, cw - 6, 2).slice(0, 2);
      let hy2 = y + 46;
      for (const ln of hl) { cv.text(cx + 2, hy2, ln, 2, INK); hy2 += 19; }
      // deck (scale 1, up to 2 lines)
      const dl = cv.wrap(dk, cw - 6, 1).slice(0, 2);
      let dy2 = y + 46 + hl.length * 19 + 2;
      for (const ln of dl) { cv.text(cx + 2, dy2, ln, 1, INK); dy2 += 11; }
      // thin divider under card
      cv.hline(cx, y + CH - 2, cw, [200, 195, 185], 1);
    });
  });

  // ---- map + briefs ----
  const MY = 750;
  cv.text(X0, MY, 'WHERE IT HAPPENED', 1, RED);
  cv.text(352, MY, 'ALSO ON THURSDAY 19 NOVEMBER', 1, RED);
  cv.text(X1 - cv.textW('Pins 1-14, dots 15-44.', 1), MY, 'Pins 1-14, dots 15-44.', 1, GREY);
  cv.hline(X0, MY + 11, CW, INK, 1);
  drawWorldMap(cv, X0, MY + 14, 330, 182);
  // briefs in two columns, one line each (texts are sized to fit)
  const colW = 327;
  BRIEFS.forEach(([num, tag, txt], i) => {
    const col = i < 15 ? 0 : 1;
    const row = i % 15;
    const bx = 352 + col * (colW + 8);
    const by = MY + 16 + row * 12;
    cv.text(bx, by, `${num} ${tag}:`, 1, RED);
    const tx = bx + cv.textW(`${num} ${tag}: `, 1);
    const maxW = (bx + colW) - tx;
    let fit = txt;
    while (cv.textW(fit, 1) > maxW && fit.includes(' ')) fit = fit.slice(0, fit.lastIndexOf(' '));
    cv.text(tx, by, fit, 1, INK);
  });

  // ---- DATE CHECK ----
  const DY = 952;
  cv.rect(X0, DY, CW, 48, RED, 2);
  cv.text(X0 + 6, DY + 4, 'DATE CHECK', 1, RED);
  const dc = cv.wrap('Left out on purpose because they broke before today: Jensen Huang resigning from Nvidia (12-13 Nov); the first US strike on Qeshm Island (17 Nov); Cyclone Akvan forming (16 Nov). Today\'s stories are the earnings beat, the widening to Kuwait and Bahrain, and the storm\'s approach.', CW - 14, 1);
  let dcy = DY + 16;
  for (let i = 0; i < dc.length && i < 3; i++) { cv.text(X0 + 6, dcy, dc[i], 1, INK); dcy += 11; }

  // footer
  cv.text(X0, 1006, 'All stories from Thursday 19 November 2026. Sources: AP, Reuters, AFP, BBC, The Hindu, NDTV, IMD, NASA. Original drawings.', 1, GREY);
  cv.hline(X0, 1020, CW, INK, 1);
  // paper grain: deterministic +/-2 variation on every paper pixel.
  // Flat colour compresses to ~76 KB; the grain keeps the file honest
  // (target >= 400 KB) while staying invisible at reading distance.
  const grnd = mulberry32(19112026);
  for (let i = 0; i < W * H; i++) {
    const idx = i * 3;
    if (cv.data[idx] === PAPER[0] && cv.data[idx + 1] === PAPER[1] && cv.data[idx + 2] === PAPER[2]) {
      const d = Math.floor(grnd() * 5) - 2;
      cv.data[idx] = PAPER[0] + d; cv.data[idx + 1] = PAPER[1] + d; cv.data[idx + 2] = PAPER[2] + d;
    }
  }
  return cv;
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const png = encodePNG(render());
writeFileSync(join(outDir, 'entry.png'), png);
