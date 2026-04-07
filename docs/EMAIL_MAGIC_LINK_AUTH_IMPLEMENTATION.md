# Email magic-link authentication — end-to-end implementation guide

This document specifies how **Agroverse Shop** (`agroverse.shop`) can add **passwordless sign-in**: user enters email → receives a **one-time link** → returns to the site with a **server-verified session**, aligned with optional **TrueSight DApp** patterns (public key on Google Sheets, private key only in the browser).

**Status:** design / implementation checklist — not yet shipped in this repository. Use this as the single reference when building the feature and opening the PR.

---

## 1. Goals and non-goals

### Goals

- Let shoppers **sign in with email** via a **time-limited, single-use** magic link.
- Avoid storing **passwords** for this path.
- Use **Google Apps Script (GAS)** + **Google Sheets** as the authority (no standalone Postgres/MySQL required).
- Session material must be **unforgeable** without GAS secrets (no “trust `localStorage.email` alone”).
- **Optionally** bind or reuse an **RSA public key** per user (same cryptographic story as [TrueSight DApp `create_signature.html`](https://github.com/TrueSightDAO/dapp)) for high-assurance actions.

### Non-goals (for v1)

- Replacing **Stripe Checkout** identity for payment (keep payment flow as today unless you explicitly unify later).
- **Passkeys** (orthogonal; can be a later step-up).
- **HttpOnly cookie** sessions without a **same-origin** API or BFF (static site + GAS defaults to **bearer JWT in JS** — see security notes).

---

## 2. High-level architecture

```mermaid
sequenceDiagram
  participant User
  participant Agroverse as agroverse.shop
  participant GAS as GAS Web App
  participant Sheet as Google Sheet
  participant Mail as Email provider

  User->>Agroverse: Enter email, Submit
  Agroverse->>GAS: POST requestMagicLink(email)
  GAS->>GAS: Generate token, hash, expiry
  GAS->>Sheet: Insert login ticket row
  GAS->>Mail: Send link with ?token=...
  GAS-->>Agroverse: 200 (generic message)

  User->>Mail: Open magic link
  Mail->>Agroverse: GET /login?token=...
  Agroverse->>GAS: POST consumeMagicLink(token)
  GAS->>Sheet: Lookup hash, check expiry, consumed
  GAS->>Sheet: Mark consumed
  GAS-->>Agroverse: JWT (email, exp, jti)
  Agroverse->>Agroverse: Store JWT; show logged-in UI

  opt Optional DApp-style key bind
    Agroverse->>Agroverse: Generate or load RSA keypair (Web Crypto)
    Agroverse->>GAS: POST bindPublicKey(JWT, publicKey SPKI b64)
    GAS->>Sheet: Upsert email + public_key
  end
```

---

## 3. Components

| Piece | Responsibility |
|--------|----------------|
| **Agroverse static pages** | Login form; landing route for `?token=`; store JWT; attach `Authorization: Bearer` or query param per GAS contract; optional key generation UI. |
| **GAS Web App** | `requestMagicLink`, `consumeMagicLink`, optional `bindPublicKey`, optional `whoami`; secrets in **Script Properties**. |
| **Sheet: `LoginTickets`** (name as you prefer) | One row per issued token: `token_hash`, `email`, `expires_at`, `consumed`, `created_at`. |
| **Sheet: `UserKeys`** (optional, may mirror existing DApp sheet) | `email`, `public_key_spki_b64`, `updated_at` — **never** `private_key`. |
| **Email** | GAS `MailApp` / `GmailApp` sends link to user (same patterns as other Agroverse GAS mail). |

---

## 4. Google Sheet schemas

### 4.1 `LoginTickets`

| Column | Type | Notes |
|--------|------|--------|
| `token_hash` | string | SHA-256(hex) or similar of raw token; **do not** store raw token. |
| `email` | string | Normalized lowercase. |
| `expires_at` | datetime | ISO or serial; enforce TTL in code (e.g. 15–30 minutes). |
| `consumed` | boolean | Set `true` after successful `consume`. |
| `consumed_at` | datetime | Optional audit. |
| `created_at` | datetime | Optional. |

**Cleanup:** periodic job or manual prune of expired rows (optional GAS time-driven trigger).

### 4.2 `UserKeys` (optional)

| Column | Type | Notes |
|--------|------|--------|
| `email` | string | Matches JWT `sub` / claim. |
| `public_key_spki_b64` | string | Same format as DApp `localStorage.publicKey`. |
| `updated_at` | datetime | Last bind. |

---

## 5. GAS API design (illustrative)

Deploy as one Web App; use **`doPost(e)`** with JSON or form body containing `action` + payload. Restrict CORS to production and beta origins when using `doGet`/`doPost` + `ContentService` patterns you already use elsewhere.

### 5.1 `action=requestMagicLink`

**Input:** `{ "action": "requestMagicLink", "email": "user@example.com" }`

**Behavior:**

1. Validate email format; normalize.
2. **Rate limit** (per email and globally — e.g. sheet log or in-memory is limited; at minimum throttle repeated rows per email in a short window).
3. Generate `token` (32+ bytes crypto random); `token_hash = SHA256(token)`.
4. Append row to `LoginTickets` with `expires_at = now + TTL`.
5. Build URL: `https://agroverse.shop/login?token=` + **URL-encoded raw token** (token appears only in email + first navigation; still use short TTL + one-time use).
6. Send email with link and short explanation.
7. Return **generic** JSON, e.g. `{ "ok": true }` — same response whether or not the email is “known” if you want **anti-enumeration**.

### 5.2 `action=consumeMagicLink`

**Input:** `{ "action": "consumeMagicLink", "token": "..." }`  
Prefer **POST** so the token is not stuck in Referer headers to third parties as often as GET-only flows.

**Behavior:**

1. Hash incoming token; find row where `token_hash` matches, `consumed === false`, `now < expires_at`.
2. If not found: return `401` / `{ "error": "invalid_or_expired" }`.
3. Set `consumed = true` (transactional intent: avoid double-redeem race if two requests — use **LockService** or mark consumed in one atomic update).
4. Mint **JWT** (or HMAC-signed compact token) with claims like: `sub` = email, `exp`, `iat`, `jti` (random). Sign with **HMAC secret** or private key stored in **Script Properties** only.
5. Return `{ "token": "<jwt>", "expires_in": 3600 }`.

### 5.3 `action=whoami` (optional)

**Input:** `Authorization: Bearer <jwt>` or body.

**Behavior:** Verify signature + `exp`; return `{ "email": "..." }` or 401.

### 5.4 `action=bindPublicKey` (optional, DApp alignment)

**Input:** Bearer JWT + `{ "publicKey": "<spki base64>" }`  
Match RSA **RSASSA-PKCS1-v1_5** / **SHA-256** and SPKI export format used by [DApp `create_signature.html`](https://github.com/TrueSightDAO/dapp/blob/main/create_signature.html).

**Behavior:** Verify JWT; upsert `UserKeys` for that email. **Never** accept or store private key.

---

## 6. Frontend (Agroverse Shop)

### 6.1 Pages / routes

- **`/login` or `/account/login`** — email form + “Check your email” state.
- **`/login`** (same or dedicated) — reads `token` from query on load; POSTs to `consumeMagicLink`; on success stores JWT and redirects to `/` or `/order-history` with **query stripped** (avoid token lingering in history where possible).

### 6.2 Storage

- Store **JWT** in `localStorage` (e.g. `agroverse_session_jwt`) or `sessionStorage` if you want tab-scoped sessions.
- **Do not** treat “user is logged in” as `localStorage.email` set by client from URL without verification.

### 6.3 Authenticated API calls

- For GAS or Edgar endpoints that require login, send `Authorization: Bearer <jwt>` (or agreed query param if you must match legacy GAS — prefer header).

### 6.4 Optional RSA client

- Reuse DApp flow: after login, if no `publicKey`/`privateKey` in `localStorage`, offer “Create security key” using Web Crypto; register **public** key via `bindPublicKey`.
- Signing outbound payloads can follow [`EdgarPayloadHelper`](https://github.com/TrueSightDAO/dapp/blob/main/scripts/edgar_payload_helper.js) patterns for DAO-grade actions only.

---

## 7. Security checklist

| Topic | Requirement |
|--------|-------------|
| **Token entropy** | CSPRNG; long enough; single-use. |
| **Storage in Sheet** | **Hash** token; never log raw token in persistent logs. |
| **TTL** | Short (15–30 min typical for magic links). |
| **HTTPS** | Entire site and link targets. |
| **Secrets** | JWT/HMAC key only in **Script Properties**; not in `config.js`. |
| **CORS** | Allowlist `https://agroverse.shop`, `https://www.agroverse.shop`, beta, and `localhost` for dev if needed. |
| **XSS** | JWT in `localStorage` is **stealable** by XSS — invest in **CSP**, sanitization, and dependency hygiene; consider future **HttpOnly** cookie + same-origin worker if requirements grow. |
| **Email compromise** | Inherits risk of any email-based auth; document for users. |
| **Rate limiting** | Mitigate abuse of `requestMagicLink`. |
| **Private keys** | **Never** in URL, email body, or Sheets. |

---

## 8. Relationship to checkout and orders

- **Checkout** can remain **guest + Stripe** as today.
- **Signed-in** users can later correlate **Stripe customer email** or **order references** with Sheet-backed identity; design order-history GAS to require valid JWT and return only rows for that email.

---

## 9. Implementation order (suggested)

1. GAS: `LoginTickets` sheet + `requestMagicLink` + email template + `consumeMagicLink` + JWT signing in Script Properties.
2. Agroverse: login page + consume landing + JWT storage + logout (delete JWT).
3. Optional: `whoami` + gated order-history stub.
4. Optional: `bindPublicKey` + UI parity with DApp key creation.
5. Playwright smoke: request link (mock or test inbox), consume token, see authenticated state.

---

## 10. Suggested PR title and description

**Title:** `docs: email magic-link auth — end-to-end implementation guide`

**Description (summary):**

> Adds `docs/EMAIL_MAGIC_LINK_AUTH_IMPLEMENTATION.md`, a single reference for implementing passwordless email sign-in on Agroverse Shop using GAS + Sheets + optional JWT session and optional RSA public-key binding aligned with the TrueSight DApp. No runtime behavior change in this PR.

---

## 11. References

- TrueSight DApp — digital signature creation: `https://github.com/TrueSightDAO/dapp/blob/main/create_signature.html`
- TrueSight DApp — payload signing helper: `https://github.com/TrueSightDAO/dapp/blob/main/scripts/edgar_payload_helper.js`
- Agroverse Shop security notes: `docs/SECURITY.md`

---

*Last updated: 2026-04-07 — design doc for future implementation; adjust dates and endpoints when shipping.*
