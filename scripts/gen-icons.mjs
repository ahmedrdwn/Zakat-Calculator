/**
 * Generate PWA icon PNGs from public/logo.svg.
 *
 * Run only when the logo changes:
 *   npm install --no-save sharp
 *   node scripts/gen-icons.mjs
 *
 * sharp is intentionally NOT in package.json — it's a heavy native
 * dependency and the icons only need regeneration on logo updates.
 * The generated PNGs are committed to the repo.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svg = fs.readFileSync('public/logo.svg');
const outDir = 'public/icons';
fs.mkdirSync(outDir, { recursive: true });

// Maskable variant — solid dark-green background so Android's mask
// (~10 % edge crop) doesn't eat into the star.
const inner = fs.readFileSync('public/logo.svg', 'utf-8')
  .replace(/<\?xml[^>]*\?>/, '')
  .match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" fill="#0D1B12"/>
  <g transform="translate(64 64) scale(0.72) translate(-64 -64)">${inner}</g>
</svg>`;

async function make(name, size, source) {
  const out = path.join(outDir, name);
  await sharp(Buffer.from(source), { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  const stat = fs.statSync(out);
  console.log(`  ${name}: ${size}x${size} — ${(stat.size / 1024).toFixed(1)} KB`);
}

const svgStr = svg.toString();
await make('icon-192.png', 192, svgStr);
await make('icon-512.png', 512, svgStr);
await make('icon-maskable-512.png', 512, maskable);
await make('apple-touch-icon.png', 180, maskable);
console.log('✓ icons generated in public/icons/');
