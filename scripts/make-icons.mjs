import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x / size, y / size);
      const o = row + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4);
    data.copy(out, 8);
    const crc = zlib.crc32(Buffer.concat([Buffer.from(type), data]));
    out.writeUInt32BE(crc >>> 0, 8 + data.length);
    return out;
  };
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function capy(u, v) {
  const skyTop = [47, 143, 230];
  const skyBot = [255, 196, 138];
  const mix = skyTop.map((c, i) => Math.round(c + (skyBot[i] - c) * v));
  const dx = u - 0.5;
  const dy = v - 0.5;
  if (dx * dx + dy * dy > 0.46) return [...mix, 0];
  const feather = u > 0.12 && u < 0.32 && v < 0.42 && v > 0.16 && (v - 0.42) < (0.32 - u) * 1.3;
  const body = (u - 0.42) ** 2 / 0.14 + (v - 0.62) ** 2 / 0.07;
  const head = u > 0.52 && u < 0.68 && v > 0.4 && v < 0.58;
  const snout = u > 0.64 && u < 0.84 && v > 0.48 && v < 0.64;
  const ear = (u - 0.56) ** 2 / 0.012 + (v - 0.34) ** 2 / 0.02;
  if (feather) return [246, 196, 83, 255];
  if (snout) {
    const nose = (u - 0.78) ** 2 / 0.003 + (v - 0.55) ** 2 / 0.002 < 1;
    if (nose) return [58, 36, 24, 255];
    return [240, 208, 174, 255];
  }
  if (head || ear < 1) {
    const eye = (u - 0.6) ** 2 + (v - 0.44) ** 2 < 0.0011;
    const pupil = (u - 0.61) ** 2 + (v - 0.445) ** 2 < 0.00032;
    if (pupil) return [26, 18, 14, 255];
    if (eye) return [255, 250, 246, 255];
    return [215, 163, 106, 255];
  }
  if (body < 1) return [196, 124, 60, 255];
  return [...mix, 255];
}

const dir = path.resolve('public/icons');
fs.mkdirSync(dir, { recursive: true });
for (const size of [192, 512]) {
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), png(size, capy));
}
console.log('icons ok');
