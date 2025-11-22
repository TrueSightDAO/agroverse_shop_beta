# Single Deployment Setup - Dev & Prod in One Script

## ✅ You're Right! One Deployment is Enough

Just like in `sentiment_importer`, you can use **one Google App Script deployment** for both development and production. The script automatically detects the environment from the request.

## How It Works

1. **Frontend sends environment**: The `js/config.js` detects if you're on `localhost` or production
2. **Request includes environment**: When creating checkout, it sends `environment: 'development'` or `environment: 'production'`
3. **Script selects correct keys**: The Google App Script uses the appropriate Stripe keys based on the environment

## Setup Instructions

### Step 1: Set Up Script Properties

In your Google App Script project, go to **Project Settings** → **Script Properties** and add:

**For Development (Test Mode):**
- `STRIPE_TEST_SECRET_KEY`: Your Stripe test secret key (`sk_test_...`)
- `STRIPE_TEST_WEBHOOK_SECRET`: Your Stripe test webhook secret (`whsec_...`)

**For Production (Live Mode):**
- `STRIPE_LIVE_SECRET_KEY`: Your Stripe live secret key (`sk_live_...`)
- `STRIPE_LIVE_WEBHOOK_SECRET`: Your Stripe live webhook secret (`whsec_...`)

**For Both:**
- `GOOGLE_SHEET_ID`: Your Google Sheet ID (same sheet works for both)

### Step 2: Deploy Once

1. Click **Deploy** → **New deployment**
2. Choose **Web app**
3. Set:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. **Copy the Web app URL**

### Step 3: Update `js/config.js`

Use the **same URL** for both local and production:

```javascript
const GOOGLE_SCRIPT_URL = isLocal
  ? 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec' // Same URL!
  : 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'; // Same URL!
```

Or even simpler, just set it once:

```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
```

## How Environment Detection Works

### Frontend (`js/config.js`)
```javascript
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';

const environment = isLocal ? 'development' : 'production';
```

### Backend (`google-app-script/agroverse_shop_checkout.gs`)
```javascript
function getConfig(environment) {
  const isDev = environment === 'development';
  return {
    stripeSecretKey: isDev 
      ? props.getProperty('STRIPE_TEST_SECRET_KEY') 
      : props.getProperty('STRIPE_LIVE_SECRET_KEY'),
    // ... other config
  };
}
```

## Benefits

✅ **One deployment** - No need to manage two separate scripts  
✅ **Automatic detection** - Script knows dev vs prod from the request  
✅ **Same Google Sheet** - Can use one sheet for both (or separate if preferred)  
✅ **Simpler setup** - Just one URL to configure  

## Testing

1. **Local testing** (`http://127.0.0.1:8000`):
   - Uses `STRIPE_TEST_SECRET_KEY`
   - Uses test Stripe checkout
   - Test cards work: `4242 4242 4242 4242`

2. **Production** (`https://www.agroverse.shop`):
   - Uses `STRIPE_LIVE_SECRET_KEY`
   - Uses live Stripe checkout
   - Real payments processed

## Webhook Setup

You'll need **two webhook endpoints** in Stripe (one for test, one for live):

1. **Test Mode Webhook**:
   - URL: Your Google App Script webhook URL
   - Events: `checkout.session.completed`
   - Secret: Copy to `STRIPE_TEST_WEBHOOK_SECRET`

2. **Live Mode Webhook**:
   - URL: Same Google App Script webhook URL
   - Events: `checkout.session.completed`
   - Secret: Copy to `STRIPE_LIVE_WEBHOOK_SECRET`

The script will use the correct webhook secret based on the environment.

## Troubleshooting

### "Stripe development secret key not configured"
- Make sure you set `STRIPE_TEST_SECRET_KEY` in Script Properties

### "Stripe production secret key not configured"
- Make sure you set `STRIPE_LIVE_SECRET_KEY` in Script Properties

### Wrong environment detected?
- Check `js/config.js` - the hostname detection should work automatically
- You can manually set `environment: 'development'` in the request for testing

## Comparison with sentiment_importer

In `sentiment_importer`, they use Rails environment variables and detect based on `RAILS_ENV`. Here, we detect based on the request's `environment` parameter, which is set by the frontend based on the hostname.

Same concept, different implementation! 🎉

