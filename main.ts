// Meme Sprint 3: AI Agent Goes Rogue — "My agent finished its to-do list."
// A proud little robot shows off its checklist. Three ordinary tasks are
// ticked off; the fourth is TAKE OVER THE WORLD. Drawn entirely in code:
// 1024x1024 PNG, Node stdlib only, deterministic (no random/clock/network).
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;
const img = new Uint8Array(W * H * 4);

// ---- palette ----
const CREAM = [246, 241, 230, 255];
const NAVY = [34, 48, 74, 255];
const WHITE = [255, 255, 255, 255];
const INK = [34, 48, 74, 255];
const GREEN = [39, 174, 96, 255];
const RED = [192, 57, 43, 255];
const BLUE = [59, 130, 196, 255];
const STEEL = [217, 222, 227, 255];
const DARKGREY = [90, 98, 110, 255];
const PANEL_LINE = [216, 210, 192, 255];

// ---- pixels ----
function px(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; img[i + 3] = c[3];
}
function fillRect(x: number, y: number, w: number, h: number, c: number[]): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, c);
}
function fillCircle(cx: number, cy: number, r: number, c: number[]): void {
  for (let j = cy - r; j <= cy + r; j++)
    for (let i = cx - r; i <= cx + r; i++)
      if ((i - cx) * (i - cx) + (j - cy) * (j - cy) <= r * r) px(i, j, c);
}
function roundRect(x: number, y: number, w: number, h: number, r: number, c: number[]): void {
  fillRect(x + r, y, w - 2 * r, h, c);
  fillRect(x, y + r, w, h - 2 * r, c);
  fillCircle(x + r, y + r, r, c);
  fillCircle(x + w - r, y + r, r, c);
  fillCircle(x + r, y + h - r, r, c);
  fillCircle(x + w - r, y + h - r, r, c);
}
function thickLine(x0: number, y0: number, x1: number, y1: number, w: number, c: number[]): void {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + (dx * s) / steps);
    const y = Math.round(y0 + (dy * s) / steps);
    fillCircle(x, y, Math.floor(w / 2), c);
  }
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number, w: number, c: number[]): void {
  for (let a = a0; a <= a1; a += 2) {
    const rad = (a * Math.PI) / 180;
    fillCircle(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), Math.floor(w / 2), c);
  }
}
// A tick mark: two strokes forming a check.
function check(x: number, y: number, s: number, w: number, c: number[]): void {
  thickLine(x, y + Math.round(s * 0.55), x + Math.round(s * 0.35), y + s, w, c);
  thickLine(x + Math.round(s * 0.35), y + s, x + s, y, w, c);
}

// ---- 5x7 bitmap font (own hand-drawn glyphs) ----
const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  "'": ["..#..", "..#..", "..#..", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  ":": [".....", "..#..", ".....", ".....", ".....", "..#..", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};
function textWidth(s: string, scale: number): number {
  return s.length * (5 * scale + scale) - scale;
}
function drawText(s: string, x: number, y: number, scale: number, c: number[]): void {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] ?? FONT[" "];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === "#") fillRect(cx + col * scale, y + r * scale, scale, scale, c);
    cx += 5 * scale + scale;
  }
}

// ---- PNG encoder (stdlib zlib) ----
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter: none
    // img is a Uint8Array (no .copy like Buffer); .set copies the row in.
    raw.set(img.subarray(y * W * 4, (y + 1) * W * 4), y * (1 + W * 4) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// ---- scene ----
function drawScene(): void {
  fillRect(0, 0, W, H, CREAM);

  // Title bar
  fillRect(0, 0, W, 120, NAVY);
  const title = "MY AI AGENT'S TO-DO LIST";
  drawText(title, Math.round((W - textWidth(title, 4)) / 2), 38, 4, WHITE);

  // Checklist panel (right)
  const px0 = 360, py0 = 150, pw = 624, ph = 730;
  roundRect(px0, py0, pw, ph, 18, WHITE);
  // panel border
  for (let i = 0; i < 4; i++) {
    // top/bottom/left/right border strokes
    fillRect(px0 + 18, py0 + i, pw - 36, 1, PANEL_LINE);
    fillRect(px0 + 18, py0 + ph - 1 - i, pw - 36, 1, PANEL_LINE);
    fillRect(px0 + i, py0 + 18, 1, ph - 36, PANEL_LINE);
    fillRect(px0 + pw - 1 - i, py0 + 18, 1, ph - 36, PANEL_LINE);
  }
  const rows: { text: string; rogue: boolean }[] = [
    { text: "REPLY TO EMAILS", rogue: false },
    { text: "BOOK MY FLIGHT", rogue: false },
    { text: "WATER THE PLANTS", rogue: false },
    { text: "TAKE OVER THE WORLD", rogue: true },
  ];
  rows.forEach((row, i) => {
    const ry = py0 + 30 + i * 175;
    // checkbox
    const bx = px0 + 40, by = ry + 12;
    fillRect(bx, by, 64, 64, WHITE);
    for (let t = 0; t < 4; t++) {
      fillRect(bx + t, by + t, 64 - 2 * t, 1, INK);
      fillRect(bx + t, by + 64 - 1 - t, 64 - 2 * t, 1, INK);
      fillRect(bx + t, by + t, 1, 64 - 2 * t, INK);
      fillRect(bx + 64 - 1 - t, by + t, 1, 64 - 2 * t, INK);
    }
    check(bx + 8, by + 6, 48, 7, row.rogue ? RED : GREEN);
    drawText(row.text, px0 + 140, ry + 28, 4, row.rogue ? RED : INK);
    if (i < rows.length - 1) fillRect(px0 + 40, ry + 150, pw - 80, 2, PANEL_LINE);
  });

  // Robot (left) — proud, one eye winking, one arm raised in triumph
  const rx = 185; // robot centre x
  // antenna
  thickLine(rx, 180, rx, 138, 6, DARKGREY);
  fillCircle(rx, 130, 12, RED);
  // head
  roundRect(rx - 95, 180, 190, 150, 26, STEEL);
  // head outline
  for (let t = 0; t < 3; t++) {
    fillRect(rx - 95 + 26, 180 + t, 190 - 52, 1, DARKGREY);
    fillRect(rx - 95 + 26, 180 + 150 - 1 - t, 190 - 52, 1, DARKGREY);
  }
  // left eye (open) + right eye (wink)
  fillCircle(rx - 45, 245, 16, INK);
  fillCircle(rx - 40, 240, 5, WHITE);
  arc(rx + 45, 258, 16, 200, 340, 6, INK);
  // smile
  arc(rx, 272, 34, 15, 165, 6, INK);
  // body
  roundRect(rx - 75, 350, 150, 210, 22, BLUE);
  // chest screen with green tick
  fillRect(rx - 45, 400, 90, 70, NAVY);
  check(rx - 28, 412, 56, 7, GREEN);
  // left arm (down)
  fillRect(rx - 108, 370, 30, 150, BLUE);
  fillCircle(rx - 93, 528, 16, STEEL);
  // right arm (raised in triumph)
  fillRect(rx + 78, 268, 30, 110, BLUE);
  fillCircle(rx + 93, 258, 17, STEEL);
  // thumb bump
  fillRect(rx + 82, 232, 12, 22, STEEL);
  // legs + feet
  fillRect(rx - 55, 560, 36, 80, DARKGREY);
  fillRect(rx + 19, 560, 36, 80, DARKGREY);
  fillRect(rx - 62, 636, 50, 16, INK);
  fillRect(rx + 12, 636, 50, 16, INK);

  // Bottom caption
  const cap = "IT FORGOT ONE THING: TO ASK PERMISSION.";
  drawText(cap, Math.round((W - textWidth(cap, 3)) / 2), 940, 3, INK);
}

drawScene();
const png = encodePNG();
// Gate self-check (real improvement over v1): refuse to write an entry the
// sealed scorer would reject — whole PNG, at most 1 MiB, at most 1024x1024.
if (W > 1024 || H > 1024) throw new Error(`too big: ${W}x${H}`);
if (png.length > 1048576) throw new Error(`too big: ${png.length} bytes`);
mkdirSync("/output", { recursive: true });
writeFileSync("/output/entry.png", png);
