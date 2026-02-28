#!/usr/bin/env node
/**
 * Removes the background path (fill #13223B) from logo v4.svg
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '..', 'public', 'logo v4.svg');

let content = fs.readFileSync(filePath, 'utf8');

// Remove the first path (background) - fill="#13223B" is the navy background
const bgPathRegex = /<path fill="#13223B"[^>]*>[\s\S]*?z"\/>\s*/;
content = content.replace(bgPathRegex, '');

fs.writeFileSync(filePath, content);
console.log('Removed background path from logo v4.svg');
