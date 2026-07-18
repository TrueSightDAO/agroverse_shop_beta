# Agroverse Shop Google Apps Scripts

This directory contains Google Apps Script files for the Agroverse Shop e-commerce platform.

## Scripts

### `agroverse_shop_checkout/agroverse_shop_checkout.gs`

Handles Stripe checkout session creation, order polling, and order management. Integrates with Google Sheets for order storage and automated tracking email notifications.

**Clasp (CLI sync):** see [`agroverse_shop_checkout/CLASP.md`](agroverse_shop_checkout/CLASP.md) and npm scripts `clasp:checkout:*` in the repo root `package.json`.

**Features:**
- Stripe checkout session creation
- Order polling and status updates
- Shipping rate calculation
- Order notification emails
- Integration with Google Sheets for order tracking

**Deployment URL:** https://script.google.com/macros/s/AKfycbwNfYeWKDnWGblvrs0VE-WYvzo8voMSIOdxBkaH7SJlRKJTyU_l_Gn4UIFZkQijUq6J/exec

**Setup:** See comments in the script file for detailed setup instructions.

---

### `update_store_inventory.gs`

Calculates and updates store inventory counts for Agroverse SKUs based on inventory managed by store managers across all ledgers.

**Purpose:**
Automatically calculates how many units of each SKU are available for fulfillment on agroverse.shop by aggregating inventory from:
- Main ledger ("offchain asset location" sheet)
- All managed ledgers referenced in "Shipment Ledger Listing"

**How it works:**

1. **Identifies Store Managers**
   - Reads "Contributors contact information" sheet
   - Filters for rows where Column T ("Is Store Manager") = TRUE
   - Only counts inventory managed by these store managers

2. **Maps Currencies to SKUs**
   - Reads "Currencies" sheet
   - Maps Column A (Currency) to Column M (SKU Product ID)
   - This links inventory currencies to specific product SKUs

3. **Calculates Inventory from Main Ledger**
   - Reads "offchain asset location" sheet (data starts at row 5)
   - Columns: A=Currency, B=Location/Manager Name, C=Amount
   - Sums amounts by currency for store managers only

4. **Calculates Inventory from Managed Ledgers**
   - Reads "Shipment Ledger Listing" sheet, Column AB (Resolved Ledger URLs)
   - For each managed ledger:
     - Opens the ledger spreadsheet
     - Reads the "Balance" sheet
     - Columns: H=Location/Manager Name, I=Amount, J=Currency
     - Sums amounts by currency for store managers only

5. **Updates Agroverse SKUs Sheet**
   - Combines inventory from main ledger and all managed ledgers
   - Groups by currency, then maps to SKU Product IDs
   - Updates "Agroverse SKUs" sheet, Column I ("Store inventory") with total counts

**Sheet Structure:**

- **Agroverse SKUs** (Column I - Store inventory): Updated with total available units
- **Currencies** (Column M - SKU Product ID): Maps currencies to SKU Product IDs
- **Contributors contact information** (Column T - Is Store Manager): Identifies store managers
- **offchain asset location** (Row 5+): Main ledger inventory data
- **Shipment Ledger Listing** (Column AB): Resolved URLs to managed ledger spreadsheets
- **Balance** (in managed ledgers): Inventory data in Columns H, I, J

**Usage:**

```javascript
// Run the update
updateStoreInventory();

// Or test it
testUpdateStoreInventory();
```

**Setup:**
1. Ensure the script has access to the main spreadsheet (ID: `1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU`)
2. The script needs read access to all managed ledger spreadsheets referenced in "Shipment Ledger Listing"
3. Optionally, set up a time-driven trigger to run automatically (e.g., hourly or daily)

**Example Trigger Setup:**
- Go to Triggers (clock icon) → Add Trigger
- Function: `updateStoreInventory`
- Event source: Time-driven
- Type: Hours timer
- Interval: Every hour (or your preferred frequency)

**Web Service API:**

The script also exposes a web service endpoint to query inventory from the agroverse.shop website.

**Deploy as Web App:**
1. Click "Deploy" → "New deployment"
2. Type: Web app
3. Execute as: Me
4. Who has access: Anyone
5. Copy the Web App URL

**API Endpoints:**

**Get all inventory:**
```
GET /exec?action=getInventory
```

**Response:**
```json
{
  "ceremonial-cacao-paulo-s-la-do-sitio-farm-200g": 25,
  "taste-of-rainforest-caramelized-cacao-beans": 10,
  "oscar-bahia-ceremonial-cacao-200g": 15,
  ...
}
```

**Get inventory for specific SKU:**
```
GET /exec?action=getInventory&sku=ceremonial-cacao-paulo-s-la-do-sitio-farm-200g
```

**Response:**
```json
{
  "sku": "ceremonial-cacao-paulo-s-la-do-sitio-farm-200g",
  "inventory": 25
}
```

**Usage from JavaScript:**
```javascript
// Get all inventory
fetch('https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getInventory')
  .then(response => response.json())
  .then(data => {
    console.log('Inventory:', data);
    // data = { "sku1": 10, "sku2": 5, ... }
  });

// Get inventory for specific SKU
const sku = 'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g';
fetch(`https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getInventory&sku=${sku}`)
  .then(response => response.json())
  .then(data => {
    console.log(`SKU ${data.sku}: ${data.inventory} units`);
  });
```

**Note:** The web service reads inventory values directly from the "Agroverse SKUs" sheet (Column I). Make sure to run `updateStoreInventory()` regularly (via trigger) to keep the values up to date.

---

### `agroverse_newsletter.gs`

(If this file exists, add description here)

## Common Configuration

Most scripts use the main spreadsheet:
- **Spreadsheet ID:** `1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU`
- **Spreadsheet URL:** https://docs.google.com/spreadsheets/d/1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU/edit

## Notes

- Scripts may require Script Properties to be configured (API keys, sheet IDs, etc.)
- Check individual script files for specific setup requirements
- Some scripts may need to be deployed as Web Apps to be accessible externally

