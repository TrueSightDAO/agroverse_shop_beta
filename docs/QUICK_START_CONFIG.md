# Quick Start: Configure Google App Script URL

## The Problem
You're seeing this error:
```
Google App Script URL not configured. Please set AGROVERSE_CONFIG.googleScriptUrl
```

## The Solution (5 minutes)

### Step 1: Deploy Your Google App Script (2 minutes)

1. Go to [Google Apps Script](https://script.google.com)
2. Open your "Agroverse Checkout" project (or create it if you haven't)
3. Make sure you've copied the code from `google-app-script/agroverse_shop_checkout.gs`
4. Click **Deploy** → **New deployment**
5. Click the gear icon (⚙️) next to "Select type"
6. Choose **Web app**
7. Configure:
   - **Execute as**: Me
   - **Who has access**: Anyone (or "Anyone with link" for testing)
8. Click **Deploy**
9. **Copy the Web app URL** - it will look like:
   ```
   https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec
   ```

### Step 2: Update config.js (1 minute)

1. Open `js/config.js` in your project
2. Find these lines (around line 26-28):
   ```javascript
   const GOOGLE_SCRIPT_URL = isLocal
     ? 'YOUR_LOCAL_DEV_SCRIPT_URL'
     : 'YOUR_PRODUCTION_SCRIPT_URL';
   ```
3. Replace `YOUR_LOCAL_DEV_SCRIPT_URL` with your actual URL:
   ```javascript
   const GOOGLE_SCRIPT_URL = isLocal
     ? 'https://script.google.com/macros/s/AKfycbx.../exec'  // Your URL here
     : 'https://script.google.com/macros/s/AKfycbx.../exec'; // Same or different URL
   ```
4. Save the file

### Step 3: Test (2 minutes)

1. Refresh your browser (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)
2. Add items to cart
3. Go to checkout
4. Fill out the form
5. Click "Continue to Payment"
6. You should now be redirected to Stripe! ✅

## Troubleshooting

### Still seeing the error?
- Make sure you saved `config.js` after editing
- Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console (F12) for any errors
- Verify the URL is correct (should start with `https://script.google.com/macros/s/`)

### URL not working?
- Make sure the script is deployed as a **Web app** (not just saved)
- Check that "Who has access" is set to "Anyone" or "Anyone with link"
- Try accessing the URL directly in your browser - you should see a response (even if it's an error)

### Need different URLs for dev/prod?
You can deploy the same script twice with different settings, or use two different scripts:
- One for local testing (development)
- One for production (live site)

Just paste the appropriate URL in each field in `config.js`.

## Next Steps

After configuring the URL, make sure you've also:
- ✅ Set up Stripe API keys in Google App Script properties
- ✅ Set up Google Sheet ID in Google App Script properties
- ✅ Created products in Stripe and added Price IDs to your product pages

See `docs/SETUP_GUIDE.md` for complete setup instructions.

