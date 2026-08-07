#!/usr/bin/env node
/**
 * Generates public/og.png — the 1200x630 social preview card.
 *
 * It crops the hero band out of a full-page render of the site, so the card is
 * literally the top of the page rather than a separately maintained graphic
 * that drifts out of sync with the design.
 *
 * Regenerate after any hero change:
 *   node scripts/make-og.mjs <full-page-screenshot.png>
 */

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const source = process.argv[2];
const out = path.join(root, 'public', 'og.png');

// No default path: this is a public repo, and the previous default pointed at a
// folder that only existed on one machine.
if (!source) {
  console.error('usage: node scripts/make-og.mjs <full-page-screenshot.png>');
  console.error('Take a full-page screenshot of the site in dark theme, then pass it here.');
  process.exit(1);
}

if (!existsSync(source)) {
  console.error(`make-og: source not found: ${source}`);
  process.exit(1);
}

const OG_W = 1200;
const OG_H = 630;

const image = sharp(source);
const { width, height } = await image.metadata();

if (!width || !height) {
  console.error('make-og: could not read source dimensions');
  process.exit(1);
}

// Crop a band of the same aspect ratio as the card, starting just below the
// sticky header, then scale it to the exact OG size.
const cropH = Math.round(width / (OG_W / OG_H));
const top = Math.min(48, Math.max(0, height - cropH));

await image
  .extract({ left: 0, top, width, height: Math.min(cropH, height - top) })
  .resize(OG_W, OG_H, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log(`make-og: wrote ${path.relative(root, out)} (${OG_W}x${OG_H}) from ${source}`);
