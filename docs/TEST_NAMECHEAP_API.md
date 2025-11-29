# Test Namecheap API Script

## Quick Start

The test script will:
1. ✅ Read credentials from `.env` file
2. ✅ List all domains in your Namecheap account
3. ✅ Fetch DNS records for each domain
4. ✅ Display results in a readable format

## Run the Test

```bash
python3 scripts/test_namecheap_api.py
```

## Expected Output

```
======================================================================
Namecheap API Test - List Domains and DNS Records
======================================================================

✅ Loaded credentials for user: your_username
✅ Client IP: 172.59.160.247

📋 Fetching all domains from Namecheap...

✅ Found 3 domain(s)

======================================================================

1. Domain: agroverse.shop
   ID: 12345678
   Locked: false
   Auto-Renew: true
   Created: 01/01/2024
   Expires: 01/01/2025
   Fetching DNS records... ✅ Found 15 record(s)

   DNS Records:
      1. @ (root)                        A     → 185.230.63.171                              (TTL: 3600)
      2. www                             CNAME → cdn1.wixdns.net                             (TTL: 3600)
      3. @ (root)                        MX    → 10 aspmx.l.google.com                      (TTL: 3600)
      ...

----------------------------------------------------------------------
```

## Troubleshooting

### "Missing Namecheap API credentials"
Make sure your `.env` file contains:
```
NAMECHEAP_API_USER=your_username
NAMECHEAP_API_KEY=your_api_key
NAMECHEAP_CLIENT_IP=your_ip_address
```

### "IP address not whitelisted"
- Go to Namecheap → Profile → Tools → API Access
- Add your current IP to the whitelist
- Check your IP: `curl -4 ifconfig.me`

### "API Error: Invalid API credentials"
- Double-check your API username (should match your Namecheap account username)
- Verify the API key was copied correctly
- Make sure API access is enabled in your account

### "No domains found"
- This could mean:
  - You have no domains in your account
  - API credentials are incorrect
  - IP address not whitelisted

## What the Script Does

1. **Loads credentials** from `.env` file using `python-dotenv`
2. **Calls Namecheap API** to list all domains (`namecheap.domains.getList`)
3. **For each domain**, fetches DNS records (`namecheap.domains.dns.getHosts`)
4. **Displays results** in a formatted, readable way

## Next Steps

After verifying the API works:
- Use `scripts/migrate_dns_namecheap.py` to migrate DNS records
- Or manually review the DNS records shown



