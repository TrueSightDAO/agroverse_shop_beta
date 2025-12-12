# DNS Records Parsing from Wix

## Issue

The `wix_agroverse_Domains.htm` file is a saved HTML page from the Wix dashboard. DNS records are loaded dynamically via JavaScript API calls and are **not embedded in the HTML file**.

## Solutions

### Option 1: Export from Wix Dashboard (Recommended)
1. Log into your Wix account
2. Go to Domains → DNS Settings
3. Look for an "Export" or "Download" button
4. Export as CSV or JSON if available

### Option 2: Capture API Response
1. Open the Wix domains page in your browser
2. Open Developer Tools (F12)
3. Go to Network tab
4. Filter by "XHR" or "Fetch"
5. Refresh the page
6. Look for API calls that return DNS records (usually JSON)
7. Copy the JSON response
8. Use the script below to convert JSON to CSV

### Option 3: Manual Entry
1. Open `assets/raw/agroverse_wix_domains_template.csv`
2. Fill in the DNS records manually:
   - **hostname**: The subdomain or @ for root domain
   - **value**: The target/record value (IP, domain, etc.)
   - **ttl**: Time to live in seconds (usually 3600)

### Option 4: Use the Template Script

If you have the DNS records in JSON format, you can use:

```python
python3 scripts/json_to_dns_csv.py your_dns_data.json
```

## CSV Format

The output CSV should have these columns:
- `hostname`: DNS record name (e.g., `@`, `www`, `mail`, `ftp`)
- `value`: Record value (e.g., IP address, domain name, CNAME target)
- `ttl`: Time to live in seconds (e.g., `3600`, `86400`)

## Example DNS Records

```
hostname,value,ttl
@,agroverse.shop,3600
www,agroverse.shop,3600
mail,mail.agroverse.shop,3600
ftp,ftp.agroverse.shop,3600
```







