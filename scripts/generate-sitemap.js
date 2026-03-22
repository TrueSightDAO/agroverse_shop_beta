#!/usr/bin/env node
/**
 * Regenerates the blog post section of sitemap.xml from each post/SLUG/index.html.
 *
 * Usage:
 *   node scripts/generate-sitemap.js           # rewrite sitemap.xml
 *   node scripts/generate-sitemap.js --check   # exit 1 if sitemap would change (CI)
 *
 * After adding a new post under post/your-slug/, run: npm run sitemap
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const POSTS_DIR = path.join(ROOT, 'post');

const BEGIN = '<!-- BEGIN_AUTO_BLOG_POSTS -->';
const END = '<!-- END_AUTO_BLOG_POSTS -->';

const BASE_URL = 'https://www.agroverse.shop';

function formatDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function collectPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const slugs = fs
    .readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((slug) => {
      const idx = path.join(POSTS_DIR, slug, 'index.html');
      return fs.existsSync(idx);
    })
    .sort();
  return slugs.map((slug) => {
    const idx = path.join(POSTS_DIR, slug, 'index.html');
    const mtime = fs.statSync(idx).mtime;
    return { slug, mtime };
  });
}

function buildBlogPostBlock(posts) {
  const lines = [''];
  for (const { slug, mtime } of posts) {
    const lastmod = formatDate(mtime);
    lines.push('  <url>');
    lines.push(`    <loc>${BASE_URL}/post/${slug}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push('    <changefreq>monthly</changefreq>');
    lines.push('    <priority>0.65</priority>');
    lines.push('  </url>');
  }
  lines.push('');
  return lines.join('\n');
}

function injectBlogIndexLastmod(xml, posts) {
  if (posts.length === 0) return xml;
  const maxDate = formatDate(
    new Date(Math.max(...posts.map((p) => p.mtime.getTime())))
  );
  // Update lastmod for the /blog listing only (first occurrence after blog loc)
  const blogLoc = `<loc>${BASE_URL}/blog</loc>`;
  const idx = xml.indexOf(blogLoc);
  if (idx === -1) return xml;
  const afterLoc = xml.indexOf('<lastmod>', idx);
  if (afterLoc === -1) return xml;
  const close = xml.indexOf('</lastmod>', afterLoc);
  if (close === -1) return xml;
  return (
    xml.slice(0, afterLoc + '<lastmod>'.length) +
    maxDate +
    xml.slice(close)
  );
}

function findEndMarkerStart(xml) {
  const j = xml.indexOf(END);
  if (j === -1) return -1;
  let k = j;
  while (k > 0 && (xml[k - 1] === ' ' || xml[k - 1] === '\t')) k--;
  return k;
}

function replaceAutoBlock(xml, newInner) {
  const i = xml.indexOf(BEGIN);
  const j = findEndMarkerStart(xml);
  if (i === -1 || j === -1 || j < i) {
    throw new Error(
      `sitemap.xml must contain ${BEGIN} and ${END} in that order`
    );
  }
  return xml.slice(0, i + BEGIN.length) + newInner + xml.slice(j);
}

function main() {
  const check = process.argv.includes('--check');
  const posts = collectPosts();
  const block = buildBlogPostBlock(posts);
  let xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const before = xml;
  xml = replaceAutoBlock(xml, block);
  xml = injectBlogIndexLastmod(xml, posts);

  if (check) {
    if (xml !== before) {
      console.error(
        'sitemap.xml is out of date. Run: npm run sitemap\n' +
          '(New or changed posts under post/ must be reflected in the sitemap.)'
      );
      process.exit(1);
    }
    console.log('sitemap.xml blog section matches post/ directories.');
    process.exit(0);
  }

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
  console.log(`Updated sitemap.xml (${posts.length} blog post URLs).`);
}

main();
