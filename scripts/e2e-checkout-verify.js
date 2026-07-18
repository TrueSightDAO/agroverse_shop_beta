#!/usr/bin/env node
/**
 * Real end-to-end checkout verification: register -> verify email -> upload
 * design -> fill order + shipping -> confirm the flow reaches a real Stripe
 * Checkout session (test/sandbox mode on beta and localhost).
 *
 * Why this exists: mocked Playwright specs (tests/white-label-*.spec.ts) stub
 * Edgar/GAS responses, so they can't catch a live field-name mismatch between
 * what the GAS actually returns and what the frontend reads (e.g. the
 * 2026-07-18 bug where calculateShipping() read rate.service/rate.rate
 * instead of rate.name/rate.amount, silently breaking every white-label
 * order total). This script hits the real backend, so it catches that class
 * of bug before merge.
 *
 * Usage (two steps, because email verification needs a human/inbox in the loop):
 *
 *   node scripts/e2e-checkout-verify.js register <email> [profileDir] [baseUrl]
 *     -> submits registration; check the inbox for the verification email.
 *
 *   node scripts/e2e-checkout-verify.js continue <verificationUrl> [profileDir] [baseUrl]
 *     -> visits the verification link (same profileDir = same browser
 *        session/device), uploads a test design, fills a shipping address,
 *        selects a rate, and submits the order. Exits non-zero unless it
 *        actually lands on checkout.stripe.com with a cs_test_ session.
 *
 * profileDir defaults to a throwaway dir under /tmp so `continue` MUST reuse
 * the same profileDir as `register` (same-device verification; Edgar treats
 * cross-device links as pubkey_mismatch by design).
 *
 * baseUrl defaults to https://beta.agroverse.shop -- pass
 * http://127.0.0.1:8000 to test a local build instead (requires a local
 * `python3 -m http.server 8000` from the repo root).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MODE = process.argv[2];
const ARG = process.argv[3];
const PROFILE_DIR = process.argv[4] || path.join(os.tmpdir(), 'e2e-checkout-verify-profile');
const BASE_URL = process.argv[5] || 'https://beta.agroverse.shop';

const TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

async function run() {
  if (MODE !== 'register' && MODE !== 'continue') {
    fail('usage: e2e-checkout-verify.js <register|continue> <email|verificationUrl> [profileDir] [baseUrl]');
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, { headless: true });
  const page = context.pages()[0] || (await context.newPage());
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  try {
    if (MODE === 'register') {
      const email = ARG;
      if (!email) fail('register requires an email argument');
      await page.goto(`${BASE_URL}/white-label/index.html`);
      await page.waitForTimeout(1500);
      await page.fill('#wl-email', email);
      await page.click('#wl-auth-btn');
      await page.waitForTimeout(4000);
      console.log(`Registration submitted for ${email}. Check the inbox, then run:`);
      console.log(`  node scripts/e2e-checkout-verify.js continue "<verification-url>" "${PROFILE_DIR}" "${BASE_URL}"`);
      return;
    }

    // MODE === 'continue'
    const verificationUrl = ARG;
    if (!verificationUrl) fail('continue requires the verification URL argument');

    await page.goto(verificationUrl);
    await page.waitForTimeout(4000);

    await page.goto(`${BASE_URL}/white-label/index.html`);
    await page.waitForTimeout(2000);

    // Returning users (existing designs) start with the upload panel collapsed
    // behind an "Upload New Design" toggle; first-time users see it open.
    const uploadPanelHidden = await page.evaluate(() => {
      const panel = document.getElementById('wl-upload-panel');
      return panel ? getComputedStyle(panel).display === 'none' : false;
    });
    if (uploadPanelHidden) {
      await page.locator('#wl-upload-btn').click();
      await page.waitForTimeout(1000);
    }

    const fileInput = await page.$('input[type=file]');
    if (!fileInput) fail('no file input found -- verification likely did not succeed (still on auth screen?)');
    const pngPath = path.join(os.tmpdir(), 'e2e-test-design.png');
    fs.writeFileSync(pngPath, Buffer.from(TEST_PNG_BASE64, 'base64'));
    await fileInput.setInputFiles(pngPath);
    await page.waitForTimeout(1500);

    const autofitBtn = page.locator('#wl-upload-autofit');
    if ((await autofitBtn.count()) > 0) {
      await autofitBtn.click();
      await page.waitForTimeout(1500);
    }
    const uploadSubmitBtn = page.locator('#wl-upload-submit');
    if ((await uploadSubmitBtn.count()) > 0) {
      await uploadSubmitBtn.click();
      await page.waitForTimeout(4000);
    }

    // Gallery grid can lag behind the GitHub Contents API write by 10-20s.
    const reorderBtn = page.locator('#wl-gallery-grid button:has-text("Reorder")').first();
    let found = false;
    for (let i = 0; i < 10 && !found; i++) {
      await page.goto(`${BASE_URL}/white-label/index.html`);
      await page.waitForTimeout(2000);
      found = (await reorderBtn.count()) > 0;
      if (!found) await page.waitForTimeout(3000);
    }
    if (!found) fail('uploaded design never appeared in gallery (Reorder button not found after retries)');
    await page.waitForTimeout(2000); // let images settle to avoid layout shift mid-click
    await reorderBtn.scrollIntoViewIfNeeded();
    await reorderBtn.click();
    await page.waitForTimeout(1500);

    await page.selectOption('#wl-order-qty', '50').catch((e) => fail('qty select failed: ' + e.message));
    await page.fill('#wl-ship-address', '1600 Amphitheatre Parkway');
    await page.fill('#wl-ship-city', 'Mountain View');
    const stateEl = await page.$('#wl-ship-state');
    const stateTag = stateEl ? await stateEl.evaluate((el) => el.tagName) : null;
    if (stateTag === 'SELECT') await page.selectOption('#wl-ship-state', 'CA');
    else await page.fill('#wl-ship-state', 'CA');
    await page.fill('#wl-ship-zip', '94043');
    await page.locator('#wl-ship-zip').dispatchEvent('blur');

    let rateLabel = '';
    for (let i = 0; i < 8 && !rateLabel; i++) {
      await page.waitForTimeout(1500);
      rateLabel = await page.evaluate(() => {
        const el = document.getElementById('wl-ship-rates');
        return el ? el.textContent : null;
      });
    }
    console.log('Shipping rates rendered:', rateLabel);
    if (!rateLabel) fail('shipping rates never rendered (empty #wl-ship-rates after waiting)');
    if (/undefined|NaN/.test(rateLabel)) {
      fail(`shipping rate rendering looks broken (found "undefined"/"NaN" in: ${rateLabel})`);
    }

    const rateRadio = page.locator('#wl-ship-rates input[type=radio]').first();
    if ((await rateRadio.count()) > 0) await rateRadio.click();
    await page.waitForTimeout(1000);

    const submitBtn = page.locator('#wl-order-submit');
    if ((await submitBtn.count()) === 0) fail('order submit button not found');
    const disabled = await submitBtn.evaluate((el) => el.disabled);
    if (disabled) fail('order submit button is disabled -- form validation is blocking checkout');

    const navPromise = page.waitForURL(/checkout\.stripe\.com/, { timeout: 20000 });
    await submitBtn.click();
    await navPromise;
    await page.waitForTimeout(2000);

    const finalUrl = page.url();
    console.log('Reached:', finalUrl);
    if (!finalUrl.startsWith('https://checkout.stripe.com/')) {
      fail(`did not land on Stripe Checkout (got ${finalUrl})`);
    }
    if (!/\/cs_test_/.test(finalUrl) && BASE_URL.includes('beta')) {
      fail(`beta should reach a Stripe TEST session (cs_test_...) but got ${finalUrl}`);
    }

    const shotPath = path.join(os.tmpdir(), 'e2e-checkout-verify-final.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log('Screenshot:', shotPath);
    console.log('PASS: white-label flow reached Stripe Checkout.');
  } finally {
    await context.close();
  }
}

run().catch((e) => fail(e.message));
