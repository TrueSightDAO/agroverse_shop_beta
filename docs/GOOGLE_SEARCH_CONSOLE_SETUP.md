# Submitting agroverse.shop to Google Search Console

Use these steps to add your site and submit the sitemap so Google can index it.

---

## 1. Open Google Search Console

- Go to: **https://search.google.com/search-console**
- Sign in with the Google account that should own the property (e.g. your Agroverse or team account).

---

## 2. Add a property (if you haven’t already)

1. Click **“Add property”** (or use the property dropdown → “Add property”).
2. Choose **“URL prefix”** (recommended for a single domain).
3. Enter: `https://www.agroverse.shop`
4. Click **“Continue”**.

---

## 3. Verify ownership

Google will ask you to verify that you own the site. Common options:

- **HTML file upload**  
  - Download the verification file from Search Console.  
  - Put it in the **root** of your site (same folder as `index.html` or where the site is served from).  
  - Ensure it’s reachable at:  
    `https://www.agroverse.shop/Google-Search-Console-verification-file.html`  
    (or whatever filename Google gives you).  
  - In Search Console, click **“Verify”**.

- **HTML tag**  
  - Copy the `<meta name="google-site-verification" content="…" />` tag.  
  - Add it in the `<head>` of your homepage (e.g. `agroverse_shop/index.html`).  
  - Deploy, then in Search Console click **“Verify”**.

- **DNS (if you use a DNS provider)**  
  - Add the TXT record Google shows you at your DNS host (e.g. Namecheap, Cloudflare).  
  - Wait for DNS to propagate, then click **“Verify”**.

Use whichever method you can complete with your current hosting/DNS setup.

---

## 4. Submit the sitemap

1. In the left sidebar, open **“Sitemaps”** (under “Indexing”).
2. In **“Add a new sitemap”**, enter:  
   `sitemap.xml`  
   (Search Console will request `https://www.agroverse.shop/sitemap.xml`).
3. Click **“Submit”**.

Status will show as “Success” once Google has fetched the sitemap. Indexing of individual URLs can take days or weeks.

---

## 5. Optional: Request indexing for key URLs

To speed up indexing of important pages:

1. Use the top **URL inspection** bar.
2. Enter a full URL, e.g.  
   `https://www.agroverse.shop/`  
   or  
   `https://www.agroverse.shop/product-page/oscar-s-bahia-ceremonial-cacao`
3. Press Enter, then click **“Request indexing”** if the page is not yet indexed.

You can repeat for homepage, main category pages, and a few top products.

---

## 6. Confirm robots.txt and sitemap

- **robots.txt**:  
  Open `https://www.agroverse.shop/robots.txt` in a browser.  
  You should see something like:  
  `Sitemap: https://www.agroverse.shop/sitemap.xml`
- **sitemap**:  
  Open `https://www.agroverse.shop/sitemap.xml` and confirm the XML loads and lists your URLs.

---

## Quick checklist

- [ ] Signed in to Search Console with the right Google account  
- [ ] Property added: `https://www.agroverse.shop`  
- [ ] Ownership verified (HTML file, meta tag, or DNS)  
- [ ] Sitemap submitted: `sitemap.xml`  
- [ ] (Optional) Requested indexing for homepage and a few product URLs  
- [ ] Confirmed `robots.txt` and `sitemap.xml` are live on the site  

If you tell me how you host agroverse.shop (e.g. GitHub Pages, Netlify, custom server), I can tailor the verification steps (e.g. where to put the HTML file or meta tag in your repo).
