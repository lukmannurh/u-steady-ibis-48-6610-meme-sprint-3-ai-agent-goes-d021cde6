// Meme Sprint 3: AI Agent Goes Rogue — v2 "My agent went to my meetings."
// The agent attended every meeting: boss, client, HR and YOU are all the
// same robot. The picture itself is the joke — four identical robot faces
// in a video-call grid, the YOU tile winking in a red frame. Drawn entirely
// in code: 1024x1024 PNG, Node stdlib only, deterministic (no random /
// clock / network / downloaded assets).
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;
const img = new Uint8Array(W * H * 4);

// ---- palette ----
const CREAM = [246, 241, 230, 255];
const NAVY = [34, 48, 74, 255];
const TILE = [24, 33, 52, 255];
const WHITE = [255, 255, 255, 255];
const RED = [192, 57, 43, 255];
const STEEL = [217, 222, 227, 255];
const DARKGREY = [90, 98, 110, 255];

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

// ---- 5x7 bitmap font (own hand-drawn glyphs) ----
const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
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

// ---- robot head (one tile of the call) ----
function drawHead(cx: number, cy: number, w: number, h: number, wink: boolean): void {
  // antenna
  thickLine(cx, cy - Math.round(h / 2), cx, cy - Math.round(h / 2) - 26, 5, DARKGREY);
  fillCircle(cx, cy - Math.round(h / 2) - 34, 9, RED);
  // head
  roundRect(cx - Math.round(w / 2), cy - Math.round(h / 2), w, h, 20, STEEL);
  // eyes: open pair, or one open + one wink (the YOU tile)
  const ey = cy - 18;
  fillCircle(cx - 34, ey, 11, NAVY);
  fillCircle(cx - 31, ey - 3, 3, WHITE);
  if (wink) {
    arc(cx + 34, ey + 12, 11, 200, 340, 5, NAVY);
  } else {
    fillCircle(cx + 34, ey, 11, NAVY);
    fillCircle(cx + 37, ey - 3, 3, WHITE);
  }
  // smile
  arc(cx, cy + 8, 26, 15, 165, 5, NAVY);
}

// ---- scene ----
function drawScene(): void {
  fillRect(0, 0, W, H, CREAM);

  // Title bar
  fillRect(0, 0, W, 110, NAVY);
  const title = "MY AGENT WENT TO MY MEETINGS";
  drawText(title, Math.round((W - textWidth(title, 4)) / 2), 36, 4, WHITE);

  // 2x2 video-call grid: every participant is the same robot.
  const tiles: { label: string; x: number; y: number; wink: boolean }[] = [
    { label: "BOSS", x: 60, y: 140, wink: false },
    { label: "CLIENT", x: 524, y: 140, wink: false },
    { label: "HR", x: 60, y: 464, wink: false },
    { label: "YOU", x: 524, y: 464, wink: true },
  ];
  for (const t of tiles) {
    // The YOU tile gets a red frame: the eye goes to the kicker.
    if (t.label === "YOU") roundRect(t.x - 5, t.y - 5, 450, 310, 18, RED);
    roundRect(t.x, t.y, 440, 300, 14, TILE);
    drawHead(t.x + 220, t.y + 138, 150, 120, t.wink);
    drawText(t.label, t.x + 20, t.y + 248, 3, t.label === "YOU" ? RED : WHITE);
  }

  // Punchline
  const cap = "IT IS ALSO ME NOW.";
  drawText(cap, Math.round((W - textWidth(cap, 5)) / 2), 848, 5, RED);
}

drawScene();
const png = encodePNG();
// Gate self-check (strengthened in the second edit): verify the encoded PNG
// itself before writing — signature, IHDR dimensions, and the 1 MiB cap —
// so an entry the sealed scorer would reject never reaches /output.
const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!png.subarray(0, 8).equals(SIG)) throw new Error("bad PNG signature");
if (png.readUInt32BE(16) !== W || png.readUInt32BE(20) !== H)
  throw new Error(`bad dimensions: ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);
if (W > 1024 || H > 1024) throw new Error(`too big: ${W}x${H}`);
if (png.length > 1048576) throw new Error(`too big: ${png.length} bytes`);
mkdirSync("/output", { recursive: true });
writeFileSync("/output/entry.png", png);
