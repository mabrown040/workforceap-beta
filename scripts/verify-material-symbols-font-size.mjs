#!/usr/bin/env node
/**
 * Ensures self-hosted Material Symbols woff2 stays small (bounded transfer budget).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_PATH = path.join(__dirname, '../public/fonts/material-symbols-outlined.woff2');
const MAX_BYTES = 200 * 1024;

try {
  const st = fs.statSync(FONT_PATH);
  const n = st.size;
  if (n > MAX_BYTES) {
    console.error(
      `Material Symbols font is ${Math.round(n / 1024)} KB (limit ${Math.round(MAX_BYTES / 1024)} KB).\n` +
        `Subset with: npm run fonts:subset-material-symbols`,
    );
    process.exit(1);
  }
} catch {
  console.error(`Missing Material Symbols font: ${FONT_PATH}\nRun: npm run fonts:subset-material-symbols`);
  process.exit(1);
}
