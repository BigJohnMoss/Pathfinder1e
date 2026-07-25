import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = resolve(root, "apps/web/public/icons");

const icon = (size, maskable = false) => {
  const inset = maskable ? Math.round(size * 0.18) : Math.round(size * 0.08);
  const inner = size - inset * 2;
  const radius = Math.round(inner * 0.16);
  const textSize = Math.round(inner * 0.28);
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="#f4f0e7"/>
      <rect x="${inset}" y="${inset}" width="${inner}" height="${inner}"
        rx="${radius}" fill="#7f1d1d"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${inner * 0.31}"
        fill="none" stroke="#f3c969" stroke-width="${Math.max(6, size * 0.025)}"/>
      <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
        fill="#fffaf0" font-family="Georgia, serif" font-size="${textSize}"
        font-weight="700">PF</text>
      <text x="50%" y="69%" dominant-baseline="middle" text-anchor="middle"
        fill="#f3c969" font-family="system-ui, sans-serif" font-size="${textSize * 0.28}"
        font-weight="700" letter-spacing="${textSize * 0.03}">1E</text>
    </svg>
  `);
};

await mkdir(output, { recursive: true });
await Promise.all([
  sharp(icon(192)).png().toFile(resolve(output, "pf1e-192.png")),
  sharp(icon(512)).png().toFile(resolve(output, "pf1e-512.png")),
  sharp(icon(512, true))
    .png()
    .toFile(resolve(output, "pf1e-maskable-512.png")),
]);

console.log(`Generated application icons in ${output}`);
