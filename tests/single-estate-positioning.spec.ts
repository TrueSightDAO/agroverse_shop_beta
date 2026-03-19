/**
 * Single Estate Positioning Test
 *
 * Ensures the site uses "single estate" (not "single origin") for positioning.
 * Run: npx playwright test single-estate-positioning
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AGROVERSE_ROOT = path.join(__dirname, '..');

// Files/extensions to scan (exclude raw assets, node_modules)
const SCAN_PATTERNS = ['.html', '.js', '.md'];
const EXCLUDE_DIRS = ['node_modules', 'assets/raw', '.git', 'venv'];

/** Educational post, its assets note, and blog teaser must name the older industry term */
const ALLOW_FILES_WITH_ORIGIN_PHRASE = [
  'post/single-estate-vs-single-origin-why-it-matters/index.html',
  'post/single-estate-vs-single-origin-why-it-matters/ASSET_LIST.md',
  'blog/index.html',
];

function getAllFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(AGROVERSE_ROOT, fullPath);
    if (EXCLUDE_DIRS.some((ex) => relativePath.startsWith(ex))) continue;
    if (entry.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (SCAN_PATTERNS.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

test.describe('Single Estate Positioning', () => {
  test('no "single origin" or "single-origin" remains in site content', () => {
    const files = getAllFiles(AGROVERSE_ROOT);
    const violations: { file: string; line: number; match: string }[] = [];

    const pattern = /single[- ]origin/gi;

    for (const file of files) {
      const rel = path.relative(AGROVERSE_ROOT, file);
      const norm = rel.split(path.sep).join('/');
      if (ALLOW_FILES_WITH_ORIGIN_PHRASE.includes(norm)) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const match = line.match(pattern);
        if (match) {
          violations.push({
            file: rel,
            line: index + 1,
            match: match[0],
          });
        }
      });
    }

    expect(
      violations,
      `Found "single origin" in ${violations.length} place(s). Update to "single estate":\n${violations
        .map((v) => `  ${v.file}:${v.line} - "${v.match}"`)
        .join('\n')}`
    ).toHaveLength(0);
  });
});
