// tests/white-label-verification-ux.spec.ts
//
// Guards bugs found in human UAT of the white-label registration flow
// (operator report, 2026-07-16):
//
//   1. Clicking "Get Started" showed no feedback beyond a greyed button for
//      the full duration of keypair generation + the Edgar round-trip --
//      felt frozen. The button now says "Sending…" immediately.
//
//   2. Clicking the email verification link on a different device/browser
//      than the one that registered fails with Edgar's own specific,
//      actionable message ("...used from a different device...") -- but
//      white-label.js discarded it and showed a generic "Verification did
//      not succeed. Try registering again." with no explanation. Also added
//      a same-device/browser tip to the "check your inbox" message so this
//      is stated up front rather than discovered as an unexplained failure.
//
//   3. THE MAIN BUG (found chasing #2 with a real account, admin+claude@
//      truesight.me, against production Edgar): verification failed on the
//      SAME device too -- always, unconditionally. dao-client@1.1.0-rc.4's
//      parseEmailRegistration() reads body.email_registration (snake_case);
//      Edgar's actual /dao/submit_contribution response embeds this as
//      body.emailRegistration (camelCase). result.emailRegistration was
//      therefore always undefined, so the "did it activate?" check could
//      never be true, for anyone, on any device. Confirmed live: a real
//      verification activated the account server-side (proven by re-
//      clicking the same link and getting {"already_consumed":true}) while
//      the frontend showed failure. Fixed by bypassing dao-client's parser
//      (registerEmailFixed/verifyEmailFixed) and reading Edgar's raw JSON
//      directly. The stubs below use the exact shapes Edgar returns live,
//      not the shape dao-client's (broken) parser expected.
//
// Run: npx playwright test tests/white-label-verification-ux.spec.ts --reporter=list

import { test, expect, type BrowserContext } from '@playwright/test';

const WL_BASE = process.env.WL_BASE_URL || 'http://localhost:8000';
const WL_URL = `${WL_BASE}/white-label/index.html`;
const EMAIL = 'brand@acme.com';

async function stubRegister(ctx: BrowserContext, delayMs = 0) {
  await ctx.route('**/edgar.truesight.me/**', async (route) => {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ signature_verification: 'success', emailRegistration: { status: 'pending' } }),
    });
  });
}

test.describe('Registration button gives immediate feedback', () => {
  test('button text changes to a working state right after click, before the response resolves', async ({ page, context }) => {
    await stubRegister(context, 1500); // hold the response open so the transient state is observable
    await page.goto(WL_URL);
    await page.waitForTimeout(1000);
    await page.fill('#wl-email', EMAIL);
    await page.click('#wl-auth-btn');

    // Assert while the request is still in flight (well before the 1500ms stub resolves).
    await expect(page.locator('#wl-auth-btn')).toBeDisabled();
    await expect(page.locator('#wl-auth-btn')).not.toHaveText('Get Started');
    await expect(page.locator('#wl-auth-btn')).toContainText(/sending/i);
  });

  test('button text resets to idle on a failed registration', async ({ page, context }) => {
    await context.route('**/edgar.truesight.me/**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'edgar exploded' }) })
    );
    await page.goto(WL_URL);
    await page.waitForTimeout(1000);
    await page.fill('#wl-email', EMAIL);
    await page.click('#wl-auth-btn');
    await page.waitForTimeout(800);

    await expect(page.locator('#wl-auth-btn')).toHaveText('Get Started');
    await expect(page.locator('#wl-auth-btn')).toBeEnabled();
  });
});

test.describe('The "check your inbox" message warns about same-device/browser', () => {
  test('includes a same-device/browser tip', async ({ page, context }) => {
    await stubRegister(context);
    await page.goto(WL_URL);
    await page.waitForTimeout(1000);
    await page.fill('#wl-email', EMAIL);
    await page.click('#wl-auth-btn');
    await page.waitForTimeout(600);

    await expect(page.locator('#wl-verify-msg')).toContainText(/same device/i);
  });
});

test.describe('Verification failure surfaces Edgar\'s specific reason', () => {
  test('shows the backend error (e.g. cross-device pubkey mismatch) instead of a generic string', async ({ page, context }) => {
    const specificError = 'This verification link was already used from a different device. Start a new registration from create_signature.html.';
    await context.route('**/edgar.truesight.me/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ signature_verification: 'failed', error: specificError }) })
    );

    await page.goto(`${WL_URL}?em=${encodeURIComponent(EMAIL)}&vk=testkey123`);
    await page.waitForTimeout(800);

    await expect(page.locator('#wl-verify-msg')).toContainText(specificError);
    await expect(page.locator('#wl-verify-msg')).not.toContainText('Verification did not succeed. Try registering again.');
  });

  test('falls back to a generic message only when Edgar gives no specific reason', async ({ page, context }) => {
    await context.route('**/edgar.truesight.me/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ signature_verification: 'failed' }) })
    );

    await page.goto(`${WL_URL}?em=${encodeURIComponent(EMAIL)}&vk=testkey123`);
    await page.waitForTimeout(800);

    await expect(page.locator('#wl-verify-msg')).toContainText('Verification did not succeed. Try registering again.');
  });
});

test.describe('Real Edgar response shapes (regression guard for the camelCase bug)', () => {
  // Exact shapes captured live against production edgar.truesight.me,
  // 2026-07-16, with a real account (admin+claude@truesight.me and
  // follow-up admin+claudefresh1/2@truesight.me test accounts).

  test('a fresh activation (emailRegistration.activated=true) reaches the gallery', async ({ page, context }) => {
    await context.route('**/api.github.com/**', (route) => route.fulfill({ status: 404, body: '{}' }));
    await context.route('**/edgar.truesight.me/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          signature_verification: 'success',
          fileUploadedToGithub: false,
          emailRegistration: { applicable: true, ok: true, event: 'EMAIL_VERIFICATION', activated: true, cache_refresh: true },
        }),
      })
    );

    await page.goto(`${WL_URL}?em=${encodeURIComponent(EMAIL)}&vk=testkey123`);
    await page.waitForTimeout(1200);

    await expect(page.locator('#wl-gallery')).toBeVisible();
    await expect(page.locator('#wl-verify-state')).toBeHidden();
  });

  test('already_consumed (re-clicking the same link) also reaches the gallery, not a failure', async ({ page, context }) => {
    await context.route('**/api.github.com/**', (route) => route.fulfill({ status: 404, body: '{}' }));
    await context.route('**/edgar.truesight.me/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          signature_verification: 'success',
          fileUploadedToGithub: false,
          emailRegistration: { applicable: true, ok: true, event: 'EMAIL_VERIFICATION', activated: false, already_consumed: true },
        }),
      })
    );

    await page.goto(`${WL_URL}?em=${encodeURIComponent(EMAIL)}&vk=testkey123`);
    await page.waitForTimeout(1200);

    await expect(page.locator('#wl-gallery')).toBeVisible();
  });

  test('pubkey_mismatch (real cross-device shape, nested under emailRegistration.error) surfaces the specific message', async ({ page, context }) => {
    const specificError = 'This verification link was already used from a different device. Start a new registration from create_signature.html.';
    await context.route('**/edgar.truesight.me/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          signature_verification: 'success',
          fileUploadedToGithub: false,
          emailRegistration: { applicable: true, ok: false, event: 'EMAIL_VERIFICATION', error: specificError },
        }),
      })
    );

    await page.goto(`${WL_URL}?em=${encodeURIComponent(EMAIL)}&vk=testkey123`);
    await page.waitForTimeout(1200);

    await expect(page.locator('#wl-verify-msg')).toContainText(specificError);
    await expect(page.locator('#wl-gallery')).toBeHidden();
  });

  test('registration (EMAIL_REGISTERED shape) still shows "check your inbox", not the gallery', async ({ page, context }) => {
    await context.route('**/edgar.truesight.me/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          signature_verification: 'success',
          fileUploadedToGithub: false,
          emailRegistration: { applicable: true, ok: true, event: 'EMAIL_REGISTERED', email: EMAIL, verification_email_sent: true, skipped: false },
        }),
      })
    );

    await page.goto(WL_URL);
    await page.waitForTimeout(1000);
    await page.fill('#wl-email', EMAIL);
    await page.click('#wl-auth-btn');
    await page.waitForTimeout(800);

    await expect(page.locator('#wl-verify-state')).toBeVisible();
    await expect(page.locator('#wl-gallery')).toBeHidden();
  });
});
