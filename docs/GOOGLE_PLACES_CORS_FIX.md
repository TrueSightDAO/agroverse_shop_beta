# Google Places API CORS Error Fix

## Issue

You're seeing CORS errors when Google Maps API tries to call:
```
https://maps.googleapis.com/maps/api/mapsjs/gen_204?csp_test=true
```

## What is `gen_204`?

The `gen_204` endpoint is a Google Maps API analytics/tracking endpoint that gets called automatically when the Maps API loads. It's used for:
- Usage analytics
- Performance monitoring
- CSP (Content Security Policy) testing

This is **normal behavior** - Google Maps API calls this automatically.

## Why CORS Error?

The CORS error typically happens when:

1. **API Key Restrictions**: Your Google Places API key has domain restrictions that don't include `127.0.0.1:8000` or `localhost:8000`
2. **Missing Referrer**: The API key requires HTTP referrer restrictions
3. **API Not Enabled**: Places API might not be enabled in your Google Cloud project

## Solutions

### Option 1: Update API Key Restrictions (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your API key
4. Under **Application restrictions**, choose **HTTP referrers (web sites)**
5. Add these referrers:
   ```
   http://127.0.0.1:8000/*
   http://localhost:8000/*
   https://www.agroverse.shop/*
   https://agroverse.shop/*
   ```
6. Click **Save**

### Option 2: Remove Restrictions (Development Only)

For local development, you can temporarily remove restrictions:
1. Go to API key settings
2. Under **Application restrictions**, choose **None**
3. **⚠️ Warning**: Only do this for development! Re-enable restrictions for production.

### Option 3: Use a Separate Test API Key

Create a separate API key for development:
1. Create new API key in Google Cloud Console
2. Don't add restrictions (or add only localhost restrictions)
3. Use this key in `js/config.js` for local development
4. Keep restricted key for production

### Option 4: Disable Google Places (If Not Needed)

If you don't need address autocomplete, you can disable it:
1. Remove or comment out the script tag in `checkout/index.html`:
   ```html
   <!-- <script src="../js/checkout-places-autocomplete.js"></script> -->
   ```
2. Users can still manually enter addresses

## Current Configuration

The API key in use is: `AIzaSyCJvOEQgMAqLPzQnTkFfH-wWMhusNTpWaE`

This key is from the dapp repository. Check if it has the proper restrictions for your domains.

## Testing

After updating API key restrictions:
1. Wait a few minutes for changes to propagate
2. Clear browser cache
3. Refresh the checkout page
4. The CORS error should be gone

## Note

The `gen_204` call itself is harmless - it's just analytics. The CORS error won't break functionality, but it's annoying in the console. Fixing the API key restrictions will eliminate the error.

