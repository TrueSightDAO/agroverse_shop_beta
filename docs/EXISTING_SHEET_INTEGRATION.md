# Existing Sheet Integration

## Overview

The checkout system integrates with your **existing** Google Sheet: `Stripe Social Media Checkout ID` in the [TrueSight DAO Contribution Ledger](https://docs.google.com/spreadsheets/d/1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU/edit).

## Existing Sheet Structure

The sheet has these columns (in order):

| Column | Header | Description |
|--------|--------|-------------|
| A | Timestamp | When the order was placed |
| B | Customer Name | Customer's name |
| C | Stripe Session ID | Unique Stripe checkout session ID |
| D | Wix Order Number | Wix order number (empty for our orders) |
| E | Wix Order ID | Wix order ID (empty for our orders) |
| F | Items Purchased | Comma-separated list of items |
| G | Total Quantity | Total number of items |
| H | Amount | Total order amount |
| I | Currency | Currency code (USD, etc.) |

## How We Integrate

### ✅ Safe Integration

1. **Idempotency Check**: Before adding a row, we check if the Stripe Session ID already exists (column C)
2. **No Conflicts**: We only append new rows, never modify existing ones
3. **Compatible Format**: We write data in the exact same format as the existing script
4. **Wix Columns Empty**: We leave Wix Order Number and Wix Order ID empty (as expected)

### Data Mapping

When a Stripe checkout completes, we write:

```javascript
[
  new Date().toISOString(),        // Timestamp (A)
  customerName,                    // Customer Name (B)
  session.id,                      // Stripe Session ID (C)
  '',                              // Wix Order Number (D) - empty
  '',                              // Wix Order ID (E) - empty
  itemsPurchased,                  // Items Purchased (F) - comma-separated
  totalQuantity,                   // Total Quantity (G)
  totalAmount,                     // Amount (H)
  currency                         // Currency (I) - e.g., "USD"
]
```

## Conflict Prevention

### Existing Script (`sentiment_importer`)

The existing script from `sentiment_importer` also writes to this sheet. Here's how we avoid conflicts:

1. **Same Check**: Both scripts check for existing Stripe Session ID before writing
2. **Append Only**: Both scripts only append rows, never update existing ones
3. **Unique Key**: Stripe Session ID is unique, so no duplicates possible

### Best Practices

- ✅ **Safe**: Both scripts can run simultaneously
- ✅ **No Data Loss**: Idempotency checks prevent duplicates
- ✅ **Compatible**: Same column structure and format

## Configuration

### Script Properties

Set these in Google App Script:

- `GOOGLE_SHEET_ID`: `1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU`
- `GOOGLE_SHEET_NAME`: `Stripe Social Media Checkout ID` (or leave empty to use default)

### Sheet Tab Name

The script uses the sheet tab name from Script Properties. If not set, it defaults to `Stripe Social Media Checkout ID`.

**Important**: The tab name must match exactly (case-sensitive).

## Testing

### Verify Integration

1. Complete a test checkout
2. Check the Google Sheet
3. Verify:
   - New row appears at the bottom
   - Stripe Session ID is unique
   - All columns are filled correctly
   - Wix columns are empty

### Check for Conflicts

If you see duplicate entries:
- Check that idempotency is working (shouldn't happen)
- Verify both scripts are checking for existing Session IDs

## Troubleshooting

### "Sheet not found"
- Verify `GOOGLE_SHEET_NAME` matches the tab name exactly
- Check that the sheet exists in the spreadsheet

### "Duplicate entries"
- Shouldn't happen due to idempotency check
- If it does, check that `findOrderRowBySessionId` is working correctly

### "Wrong column data"
- Verify the sheet structure matches expected columns
- Check that headers are in row 1

## Next Steps

1. Set `GOOGLE_SHEET_ID` in Script Properties
2. Set `GOOGLE_SHEET_NAME` (or use default)
3. Test with a checkout
4. Verify data appears correctly in the sheet

The integration is designed to be safe and non-conflicting with your existing scripts! 🎉

