#!/usr/bin/env python3
"""
Script to add Fazenda São Jorge 81% dark chocolate bar (50g) to "Agroverse SKUs" Google Sheet.

Farm truth: Fazenda São Jorge (Coopercabruca, Itajuípe BA). Beans never had a
dedicated shipment; ledger/shop grouping is AGL4 (Shipment column below).
"""

import sys
from pathlib import Path
import gspread
from google.oauth2.service_account import Credentials

# Configuration
SPREADSHEET_ID = '1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU'
SHEET_NAME = 'Agroverse SKUs'

# Path to service account JSON
SERVICE_ACCOUNT_FILE = Path(__file__).parent.parent / 'google-service-account.json'

# New product data
NEW_PRODUCT = {
    'Product ID': 'organic-81-dark-chocolate-bar-50g-fazenda-sao-jorge-bahia-2024',
    'Product Name': '81% Organic Dark Chocolate Bar (50g) — Fazenda São Jorge, Bahia Brazil, 2024',
    'Price (USD)': 10.00,
    'Weight (oz)': 1.76,
    'Category': 'retail',
    'Shipment': 'AGL4',
    'Farm': 'Fazenda São Jorge',
    'Image Path': 'https://www.agroverse.shop/assets/images/products/81-dark-chocolate-bar-50g-packaging.jpg',
    'Store inventory': ''  # Will be calculated by update_store_inventory.gs
}

def add_product_to_sheet():
    """
    Add the new product to the Google Sheet
    """
    try:
        print(f"📊 Opening spreadsheet {SPREADSHEET_ID}...")
        
        # Authenticate
        if not SERVICE_ACCOUNT_FILE.exists():
            print(f"❌ Error: Service account file not found at {SERVICE_ACCOUNT_FILE}")
            print("Please ensure the service account JSON file exists")
            return False
        
        scope = ['https://spreadsheets.google.com/feeds',
                 'https://www.googleapis.com/auth/drive']
        creds = Credentials.from_service_account_file(str(SERVICE_ACCOUNT_FILE), scopes=scope)
        client = gspread.authorize(creds)
        
        # Open spreadsheet
        spreadsheet = client.open_by_key(SPREADSHEET_ID)
        
        # Get sheet
        try:
            worksheet = spreadsheet.worksheet(SHEET_NAME)
            print(f"✅ Found sheet: {SHEET_NAME}")
        except gspread.exceptions.WorksheetNotFound:
            print(f"❌ Error: Sheet '{SHEET_NAME}' not found")
            return False
        
        # Check if product already exists
        product_id = NEW_PRODUCT['Product ID']
        all_values = worksheet.get_all_values()
        
        # Find existing product IDs (Column A, starting from row 2)
        existing_ids = []
        for i, row in enumerate(all_values[1:], start=2):  # Skip header row
            if row and len(row) > 0 and row[0].strip():
                existing_ids.append((i, row[0].strip()))
        
        # Check if product ID already exists
        existing_row = None
        for row_num, existing_id in existing_ids:
            if existing_id == product_id:
                existing_row = row_num
                break
        
        if existing_row:
            print(f"⚠️  Product ID '{product_id}' already exists in row {existing_row}")
            print("Updating existing row...")
            row_num = existing_row
        else:
            # Find the next empty row (after last row with data)
            if existing_ids:
                row_num = max([r[0] for r in existing_ids]) + 1
            else:
                row_num = 2  # First data row after header
            print(f"➕ Adding new product at row {row_num}")
        
        # Prepare row data in correct order (matching sheet columns)
        row_data = [
            NEW_PRODUCT['Product ID'],
            NEW_PRODUCT['Product Name'],
            NEW_PRODUCT['Price (USD)'],
            NEW_PRODUCT['Weight (oz)'],
            NEW_PRODUCT['Category'],
            NEW_PRODUCT['Shipment'],
            NEW_PRODUCT['Farm'],
            NEW_PRODUCT['Image Path'],
            NEW_PRODUCT['Store inventory']  # Column I
        ]
        
        # Update the row
        range_name = f"A{row_num}:I{row_num}"
        worksheet.update(values=[row_data], range_name=range_name, value_input_option='USER_ENTERED')
        
        # Format price as currency
        worksheet.format(f"C{row_num}", {
            'numberFormat': {
                'type': 'CURRENCY',
                'pattern': '$#,##0.00'
            }
        })
        
        print(f"✅ Successfully {'updated' if existing_row else 'added'} product: {NEW_PRODUCT['Product Name']}")
        print(f"   Product ID: {product_id}")
        print(f"   Row: {row_num}")
        print(f"   Price: ${NEW_PRODUCT['Price (USD)']:.2f}")
        print(f"   Shipment: {NEW_PRODUCT['Shipment']}")
        print(f"   Farm: {NEW_PRODUCT['Farm']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error updating Google Sheet: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    print("=" * 60)
    print("Adding Fazenda São Jorge 81% Bar to Agroverse SKUs Sheet")
    print("=" * 60)
    print()
    
    success = add_product_to_sheet()
    
    if success:
        print()
        print("✅ Done! Product added/updated successfully.")
        print(f"🔗 https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit?gid=98293503#gid=98293503")
    else:
        print()
        print("❌ Failed to add product")
        sys.exit(1)

