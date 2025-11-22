# Testing Google App Script Endpoints

## Test URLs

Your Google App Script is deployed at:
```
https://script.google.com/macros/s/AKfycbyefqjQnWegrXR9y18HyJMxSM2wWCyucsK5qdh5isJICVhonssajEpT4Dt3hq3A7PTA/exec
```

## Test Endpoints

### 1. Test GET - Order Status (Simple Test)

**URL:**
```
https://script.google.com/macros/s/AKfycbyefqjQnWegrXR9y18HyJMxSM2wWCyucsK5qdh5isJICVhonssajEpT4Dt3hq3A7PTA/exec?action=getOrderStatus&sessionId=test123
```

**Expected Response:**
```json
{
  "status": "error",
  "error": "Order not found"
}
```

This is expected if the session ID doesn't exist. It confirms the endpoint is working.

---

### 2. Test GET - Calculate Shipping Rates

**Direct URL (paste in browser):**
```
https://script.google.com/macros/s/AKfycbyefqjQnWegrXR9y18HyJMxSM2wWCyucsK5qdh5isJICVhonssajEpT4Dt3hq3A7PTA/exec?action=calculateShippingRates&environment=development&cart={"items":[{"productId":"test","name":"Test Product","price":25.00,"quantity":1,"weight":7.05}]}&shippingAddress={"address":"123 Main St","city":"San Francisco","state":"CA","zip":"94102","country":"US"}
```

**Using curl:**
```bash
curl 'https://script.google.com/macros/s/AKfycbyefqjQnWegrXR9y18HyJMxSM2wWCyucsK5qdh5isJICVhonssajEpT4Dt3hq3A7PTA/exec?action=calculateShippingRates&environment=development&cart=%7B%22items%22%3A%5B%7B%22productId%22%3A%22test%22%2C%22name%22%3A%22Test%20Product%22%2C%22price%22%3A25.00%2C%22quantity%22%3A1%2C%22weight%22%3A7.05%7D%5D%7D&shippingAddress=%7B%22address%22%3A%22123%20Main%20St%22%2C%22city%22%3A%22San%20Francisco%22%2C%22state%22%3A%22CA%22%2C%22zip%22%3A%2294102%22%2C%22country%22%3A%22US%22%7D'
```

**Using JavaScript (in browser console):**
```javascript
var params = new URLSearchParams();
params.append('action', 'calculateShippingRates');
params.append('environment', 'development');
params.append('cart', JSON.stringify({
  items: [{
    productId: 'test',
    name: 'Test Product',
    price: 25.00,
    quantity: 1,
    weight: 7.05
  }]
}));
params.append('shippingAddress', JSON.stringify({
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  zip: '94102',
  country: 'US'
}));

fetch('https://script.google.com/macros/s/AKfycbyefqjQnWegrXR9y18HyJMxSM2wWCyucsK5qdh5isJICVhonssajEpT4Dt3hq3A7PTA/exec?' + params.toString(), {
  method: 'GET'
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

**Expected Response:**
```json
{
  "status": "success",
  "rates": [
    {
      "id": "rate_0",
      "name": "Standard Shipping",
      "amount": 5.00,
      "amountCents": 500,
      "deliveryDays": "3-7 business days"
    },
    {
      "id": "rate_1",
      "name": "Express Shipping",
      "amount": 15.00,
      "amountCents": 1500,
      "deliveryDays": "1-3 business days"
    }
  ],
  "totalWeightOz": 19.2
}
```

Or if EasyPost is configured, you'll get real USPS rates.

---

### 3. Test POST - Create Checkout Session (Minimal)

**Using curl:**
```bash
curl -X POST \
  'https://script.google.com/macros/s/AKfycbyefqjQnWegrXR9y18HyJMxSM2wWCyucsK5qdh5isJICVhonssajEpT4Dt3hq3A7PTA/exec' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'action=createCheckoutSession' \
  -d 'environment=development' \
  -d 'cart={"items":[{"productId":"test","name":"Test","price":25.00,"quantity":1,"stripePriceId":"price_test123"}]}'
```

**Expected Response:**
Either:
- Success with `checkoutUrl` and `sessionId`
- Error if Stripe keys not configured or invalid Stripe Price ID

---

## Quick Browser Test

1. Open browser console (F12)
2. Paste this test:

```javascript
// Simple GET test
fetch('https://script.google.com/macros/s/AKfycbyefqjQnWegrXR9y18HyJMxSM2wWCyucsK5qdh5isJICVhonssajEpT4Dt3hq3A7PTA/exec?action=getOrderStatus&sessionId=test')
  .then(r => r.json())
  .then(d => console.log('GET Test:', d))
  .catch(e => console.error('Error:', e));
```

If you see `{"status":"error","error":"Order not found"}` - that's good! The endpoint is working.

---

## Troubleshooting

### "setHeaders is not a function"
- ✅ **Fixed**: Removed `setHeaders()` calls (not supported in ContentService)
- CORS is handled automatically by Web App deployment settings

### CORS Errors
- Make sure Web App is deployed with **"Who has access: Anyone"**
- Redeploy the Web App after code changes
- CORS works automatically for Web Apps deployed correctly

### "Invalid action"
- Make sure you're sending `action` parameter
- Valid actions: `createCheckoutSession`, `calculateShippingRates`, `submitQuoteRequest`, `getOrderStatus`

### "Cart is empty"
- Make sure `cart` parameter is sent as JSON string
- Format: `cart={"items":[...]}`

---

## Deployment Checklist

1. ✅ Code saved in Google App Script editor
2. ✅ Script deployed as Web App
3. ✅ "Execute as: Me"
4. ✅ "Who has access: Anyone" (required for CORS)
5. ✅ Script Properties configured (Stripe keys, Sheet ID, etc.)
6. ✅ Test with the URLs above

