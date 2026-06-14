/**
 * Partner Page Consistency Test
 * 
 * Validates that all partner pages under /partners/ have standardized
 * header navigation, footer, and content sections.
 * 
 * Usage: node tests/partner-page-consistency.test.js
 */

const fs = require('fs');
const path = require('path');

const PARTNERS_DIR = path.join(__dirname, '..', 'partners');

// Standard elements every partner page MUST have
const REQUIRED_NAV_LINKS = [
  { href: '../../index.html#home', text: 'Home' },
  { href: '../../index.html#products', text: 'Products' },
  { href: '../../cacao-journeys/index.html', text: 'Cacao Journeys' },
  { href: '../../blog/', text: 'Blog' },
  { href: '../../index.html#contact', text: 'Contact' },
];

const REQUIRED_FOOTER_ELEMENTS = [
  { pattern: /Agroverse/i, desc: 'Footer Agroverse heading' },
  { pattern: /regenerating|rainforest|cacao/i, desc: 'Footer tagline' },
  { pattern: /\d{3}[-\.\s]?\d{3}[-\.\s]?\d{4}/, desc: 'Footer phone number' },
  { pattern: /©|&copy;|&#169;/, desc: 'Footer copyright symbol' },
  { pattern: /all rights reserved/i, desc: 'Footer rights reserved' },
];

const REQUIRED_FOOTER_LINKS = [
  { href: '../../index.html#home', text: 'Home' },
  { href: '../../index.html#mission', text: 'Mission' },
  { href: '../../index.html#products', text: 'Products' },
  { href: '../../farms/', text: 'Farms' },
  { href: '../../index.html#shipments', text: 'Shipments' },
  { href: '../../blog/', text: 'Blog' },
  { href: '../index.html', text: 'Partners' },
  { href: '../../wholesale/', text: 'Wholesale' },
  { href: '../../order-history/', text: 'Order History' },
  { href: 'mailto:community@agroverse.shop', text: 'Contact' },
];

const REQUIRED_CONTENT_SECTIONS = [
  { pattern: /partner-logo-container|partner-logo/i, desc: 'Partner logo section' },
  { pattern: /partner-info|partner-information|info-label.*Location/i, desc: 'Partner Information box' },
  { pattern: /back-link|Back to All Partners|Back to all partners/i, desc: 'Back to All Partners link' },
  { pattern: /leaflet|map/i, desc: 'Leaflet map section' },
];

const REQUIRED_META = [
  { pattern: /<title>/, desc: 'Page title' },
  { pattern: /property="og:title"/, desc: 'OG title' },
  { pattern: /property="og:description"/, desc: 'OG description' },
  { pattern: /property="og:image"/, desc: 'OG image' },
  { pattern: /name="twitter:card"/, desc: 'Twitter card' },
  { pattern: /rel="canonical"/, desc: 'Canonical URL' },
];

let passed = 0;
let failed = 0;
let errors = [];

function check(condition, desc, pageName) {
  if (condition) {
    passed++;
    return true;
  } else {
    failed++;
    errors.push(`  FAIL [${pageName}] ${desc}`);
    return false;
  }
}

function findPartnerDirs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory())
    .map(e => path.join(dir, e.name))
    .filter(d => fs.existsSync(path.join(d, 'index.html')));
}

function testPage(pageDir) {
  const pageName = path.basename(pageDir);
  const html = fs.readFileSync(path.join(pageDir, 'index.html'), 'utf-8');
  
  console.log(`\n=== Testing: ${pageName} ===`);
  
  // 1. Check nav links
  console.log('  [Navigation]');
  for (const link of REQUIRED_NAV_LINKS) {
    const hasLink = html.includes(`href="${link.href}"`) && 
      new RegExp(`<a[^>]*href="${link.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>\s*${link.text}\s*<`).test(html);
    check(hasLink, `Nav link: ${link.text} (${link.href})`, pageName);
  }
  
  // 2. Check mobile menu toggle
  const hasMobileToggle = html.includes('mobile-menu-toggle') && html.includes('hamburger-line');
  check(hasMobileToggle, 'Mobile menu toggle button', pageName);
  
  // 3. Check footer elements
  console.log('  [Footer]');
  for (const el of REQUIRED_FOOTER_ELEMENTS) {
    const footerSection = html.split('<footer')[1]?.split('</footer>')[0] || '';
    check(el.pattern.test(footerSection), `Footer: ${el.desc}`, pageName);
  }
  
  // 4. Check footer links
  for (const link of REQUIRED_FOOTER_LINKS) {
    const footerSection = html.split('<footer')[1]?.split('</footer>')[0] || '';
    const hasLink = footerSection.includes(`href="${link.href}"`);
    check(hasLink, `Footer link: ${link.text} (${link.href})`, pageName);
  }
  
  // 5. Check content sections
  console.log('  [Content]');
  for (const section of REQUIRED_CONTENT_SECTIONS) {
    check(section.pattern.test(html), `Content: ${section.desc}`, pageName);
  }
  
  // 6. Check meta tags
  console.log('  [Meta]');
  for (const meta of REQUIRED_META) {
    check(meta.pattern.test(html), `Meta: ${meta.desc}`, pageName);
  }
  
  // 7. Check canonical URL matches page path
  const canonicalMatch = html.match(/href="https:\/\/[^"]*\/partners\/([^"/]+)/);
  if (canonicalMatch) {
    check(canonicalMatch[1] === pageName, `Canonical URL matches page name: ${canonicalMatch[1]} === ${pageName}`, pageName);
  } else {
    check(false, 'Canonical URL contains /partners/{slug}', pageName);
  }
}

function main() {
  console.log('=== Agroverse Partner Page Consistency Test ===');
  console.log(`Scanning: ${PARTNERS_DIR}`);
  
  if (!fs.existsSync(PARTNERS_DIR)) {
    console.error(`ERROR: Partners directory not found at ${PARTNERS_DIR}`);
    console.error('Run this script from the agroverse_shop_beta repo root.');
    process.exit(1);
  }
  
  const partnerDirs = findPartnerDirs(PARTNERS_DIR);
  
  if (partnerDirs.length === 0) {
    console.error('ERROR: No partner pages found.');
    process.exit(1);
  }
  
  console.log(`Found ${partnerDirs.length} partner page(s):`);
  partnerDirs.forEach(d => console.log(`  - ${path.basename(d)}`));
  
  for (const dir of partnerDirs) {
    testPage(dir);
  }
  
  // Summary
  console.log(`\n=== Results ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach(e => console.log(e));
  }
  
  if (failed > 0) {
    console.log(`\n❌ ${failed} check(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All checks passed!`);
  }
}

main();
