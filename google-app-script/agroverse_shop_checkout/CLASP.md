# Clasp — Agroverse Shop Checkout (Apps Script)

This folder is a [clasp](https://github.com/google/clasp) project for the **checkout** web app (`doGet` / `doPost`, Stripe, `getGcrContextByQr`, etc.). Newsletter and inventory scripts stay in `google-app-script/` and are **not** pushed from here.

**Apps Script project (editor):** [script.google.com/home/projects/1ovx-Hq5L5MgzF32qB_cPV_G5Hc6XshKMAYOmiJY8tZ355gzWUqvFCPvn/edit](https://script.google.com/home/projects/1ovx-Hq5L5MgzF32qB_cPV_G5Hc6XshKMAYOmiJY8tZ355gzWUqvFCPvn/edit) — `scriptId` is stored in `.clasp.json`.

## Prerequisites

- Node.js (repo root already uses npm for Playwright).
- Google account that owns the Apps Script project.

## One-time setup

1. **Install clasp** (optional global): `npm i -g @google/clasp`  
   Or use repo scripts / `npx @google/clasp`.

2. **Log in** (stores credentials in `~/.clasprc.json`):

   ```bash
   npm run clasp:checkout:login
   ```

3. **Script ID** — Already set in `.clasp.json` for [this project](https://script.google.com/home/projects/1ovx-Hq5L5MgzF32qB_cPV_G5Hc6XshKMAYOmiJY8tZ355gzWUqvFCPvn/edit). To point clasp at a different script: **Project Settings** (gear) → copy **Script ID**, then  
   `npx clasp setting scriptId YOUR_SCRIPT_ID -P google-app-script/agroverse_shop_checkout`

4. **First push** (overwrites the server copy with this repo — confirm you want that):

   ```bash
   npm run clasp:checkout:push
   ```

5. In Apps Script: **Deploy → Manage deployments** → edit the **Web app** deployment → **New version** → so production picks up the latest code.

## Daily workflow

```bash
# From repo root
npm run clasp:checkout:pull   # server → local
npm run clasp:checkout:push   # local → server (if you see “Skipping push” but you edited files, run: `npx clasp push -P google-app-script/agroverse_shop_checkout --force`)
npm run clasp:checkout:open   # open in browser
```

## Files

| File | Purpose |
|------|---------|
| `agroverse_shop_checkout.gs` | All server logic |
| `appsscript.json` | Manifest (timezone, V8) |
| `.clasp.json` | `scriptId` + `rootDir` (points at the deployed checkout project) |
| `.claspignore` | Skip `.md` etc. on push |

If `clasp pull` adds extra `.gs` files from older server-only experiments, commit or delete them intentionally before the next `push`.

---

## Re-authenticate (fix `access_token` / “Cannot read properties of undefined”)

That error almost always means **clasp has no valid OAuth refresh token** for this machine — e.g. expired login, corrupted `~/.clasprc.json`, or **global `clasp`** logged in while **npm** runs a **different** `clasp`.

**Always use the repo’s clasp** (scripts below run `npx clasp` from `devDependencies` after `npm install`).

### 1. Turn on the Apps Script API (Google account)

Open [script.google.com/home/usersettings](https://script.google.com/home/usersettings) while signed into the same Google account that owns the project, and enable **Google Apps Script API**.

### 2. Clean login with repo clasp

From **agroverse_shop** repo root:

```bash
cd /Users/garyjob/Applications/agroverse_shop
npm install
npm run clasp:checkout:logout
npm run clasp:checkout:login
```

A browser window should open; finish Google consent. Credentials are written to **`~/.clasprc.json`**.

### 3. If the browser loopback fails (firewall / remote SSH)

```bash
npm run clasp:checkout:login:manual
```

Follow the printed URL and paste the code back into the terminal.

### 4. Nuclear option (broken file)

Back up and remove the old store, then login again:

```bash
mv ~/.clasprc.json ~/.clasprc.json.bak.$(date +%Y%m%d) 2>/dev/null || true
npm run clasp:checkout:login
```

### 5. Push

```bash
npm run clasp:checkout:push
```

### Avoid mixing global and local clasp

- Prefer **`npm run clasp:checkout:*`** only (uses `npx clasp` from this repo).
- If you use a global install, run `which clasp` and ensure you’re not logging in with one binary and pushing with another.
