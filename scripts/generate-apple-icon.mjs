#!/usr/bin/env node
/**
 * Generates apple-touch-icon.png (180x180) from logo v3.svg
 * Uses Orbit navy (#0C1F35) for letterbox padding when fitting wide logo into square.
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public', 'logo v3.svg');
const outPath = join(root, 'public', 'apple-touch-icon.png');

const ORBIT_NAVY = { r: 12, g: 31, b: 53 };

sharp(svgPath)
  .resize(180, 180, {
    fit: 'contain',
    background: ORBIT_NAVY,
  })
  .png()
  .toFile(outPath)
  .then((info) => {
    console.log(`Generated ${outPath} (${info.width}x${info.height})`);
  })
  .catch((err) => {
    console.error('Failed to generate apple-touch-icon:', err);
    process.exit(1);
  });
