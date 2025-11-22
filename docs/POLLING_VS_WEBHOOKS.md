# Polling vs Webhooks - Which to Use?

## ✅ Recommended: Polling (Current Implementation)

We use **polling** instead of webhooks because:
- ✅ **Simpler setup** - No webhook endpoint configuration needed
- ✅ **No webhook secrets required** - One less thing to manage
- ✅ **More reliable** - Won't miss events if webhook fails
- ✅ **Easier debugging** - Can manually trigger sync
- ✅ **Works with Google App Script** - Time-driven triggers are built-in

## How Polling Works

1. **Time-driven trigger** runs `syncStripeOrders()` every 5-15 minutes
2. **Polls Stripe API** for completed checkout sessions from the last hour
3. **Checks Google Sheet** to see which sessions already exist
4. **Adds new orders** that aren't in the sheet yet
5. **Idempotent** - Won't create duplicates

## Setup Instructions

### Step 1: Create Time-Driven Trigger

1. Open your Google App Script project
2. Click the **clock icon** (Triggers) in the left sidebar
3. Click **"+ Add Trigger"** (bottom right)
4. Configure:
   - **Function**: `syncStripeOrders`
   - **Event source**: Time-driven
   - **Type**: Minutes timer
   - **Interval**: Every 5 minutes (or 10-15 minutes)
5. Click **Save**

### Step 2: Test It

1. Complete a test checkout
2. Wait 5 minutes (or manually run `syncStripeOrders`)
3. Check Google Sheet - order should appear

### Step 3: Manual Sync (Optional)

You can also manually trigger a sync:
1. In Google App Script editor
2. Select `syncStripeOrders` from function dropdown
3. Click **Run** ▶️

## Polling Frequency

**Recommended:**
- **Every 5 minutes** - For near real-time updates
- **Every 10-15 minutes** - For less frequent but still timely updates
- **Every hour** - For low-volume stores

**Considerations:**
- More frequent = more API calls to Stripe
- Stripe API has rate limits (but generous for this use case)
- 5-15 minutes is usually a good balance

## Webhooks (Alternative - Not Required)

If you prefer webhooks:
- ✅ **Real-time** - Orders appear immediately
- ❌ **More complex** - Requires webhook endpoint setup
- ❌ **Webhook secrets needed** - Additional configuration
- ❌ **Can miss events** - If webhook fails, order might not be recorded
- ❌ **Signature verification** - More code to implement

## Current Implementation

The code supports **both** approaches:
- **Polling**: `syncStripeOrders()` - ✅ Recommended
- **Webhooks**: `handleStripeWebhook()` - Optional, kept for compatibility

You can use either or both, but polling is simpler and recommended.

## Script Properties Needed

**Required:**
- `STRIPE_TEST_SECRET_KEY`
- `STRIPE_LIVE_SECRET_KEY`
- `GOOGLE_SHEET_ID`

**Optional:**
- `STRIPE_TEST_WEBHOOK_SECRET` - Only if using webhooks
- `STRIPE_LIVE_WEBHOOK_SECRET` - Only if using webhooks
- `GOOGLE_SHEET_NAME` - Defaults to "Stripe Social Media Checkout ID"

## Troubleshooting

### Orders not appearing?
1. Check trigger is set up correctly
2. Manually run `syncStripeOrders` to test
3. Check Script Properties are set
4. Check Logger for errors

### Too many API calls?
- Increase polling interval (e.g., every 15 minutes instead of 5)
- Adjust time range in `retrieveCompletedSessions` (currently 1 hour)

### Want real-time updates?
- Use webhooks instead (more complex setup)
- Or reduce polling interval to 1-2 minutes

## Summary

**Use polling** - It's simpler, more reliable, and easier to set up. No webhook secrets needed! 🎉

