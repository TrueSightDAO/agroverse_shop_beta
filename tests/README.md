# Agroverse Shop Tests

Playwright visual consistency tests for agroverse.shop. Ensure header/footer, cart, nav, and SEO content are consistent across all pages.

> **Local runs:** Tests hit `http://localhost:8000`. Playwright auto-starts Python `http.server` on port 8000. Ensure port 8000 is free. To test against beta instead: `BASE_URL=https://beta.agroverse.shop npm test`

## Quick start

```bash
npm test              # Run all tests (starts local server on :8000)
npm run test:headed   # Run with browser visible
npm run test:ui       # Playwright UI mode
npm run test:ci       # CI-friendly output (HTML + GitHub reporter)
```

## Smart test runner (resume on failure)

For long test runs, use the smart runner to resume from failures:

```bash
npm run test:smart    # Run all, track progress
npm run test:resume   # Resume from last failure
npm run test:reset    # Reset and start fresh
```

## CI (GitHub Actions)

- **Workflow**: `.github/workflows/visual-consistency.yml`
- **Triggers**: Push/PR to `main` or `master`; also `workflow_dispatch` (manual)
- **URL selection**: Beta repo → `beta.agroverse.shop`; Prod repo → `www.agroverse.shop`
- **Artifacts**: Playwright report (30 days); screenshots on failure (7 days)

## Local vs CI

| Mode | baseURL | Server |
|------|---------|--------|
| Local | `http://localhost:8000` | Python `http.server` (auto-started) |
| CI (beta) | `https://beta.agroverse.shop` | None (live site) |
| CI (prod) | `https://www.agroverse.shop` | None (live site) |

Override: `BASE_URL=https://beta.agroverse.shop npm test`

## Test files

- `header-footer-consistency.spec.ts` — Header and footer menu items across pages
- `nav-consistency.spec.ts` — Navigation structure
- `footer-consistency.spec.ts` — Footer links and structure
- `cart-*.spec.ts` — Cart icon, functionality, image visibility
- `hamburger-menu-functionality.spec.ts` — Mobile menu
- `mobile-menu-elements.spec.ts` — Mobile menu elements
- `nav-footer-relationship.spec.ts` — Nav ↔ footer alignment
- `seo-content-alignment.spec.ts` — SEO metadata and content
- `consistency.spec.ts` — General consistency checks

## Adding tests

1. Add a new `.spec.ts` in `tests/`
2. Use `playwright.config.ts` baseURL (or override via `BASE_URL`)
3. Tests run against live site in CI — no mocking; keep tests resilient to minor content changes
