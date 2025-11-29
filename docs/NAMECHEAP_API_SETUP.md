# Namecheap API Setup Guide

## Step-by-Step Instructions

### Step 1: Log in to Namecheap
1. Go to [https://www.namecheap.com/](https://www.namecheap.com/)
2. Click **"Sign In"** in the top-right corner
3. Enter your credentials and log in

### Step 2: Navigate to API Access
1. Click on your **profile name/avatar** in the top-right corner
2. Select **"Profile"** from the dropdown menu
3. In the left sidebar, click **"Tools"**
4. Scroll down to **"Business & Dev Tools"** section
5. Click **"Manage"** button next to **"Namecheap API Access"**

### Step 3: Enable API Access
1. Toggle the **"API Access"** switch to **"ON"**
2. Review and accept the **Terms of Service**
3. Enter your **account password** to confirm
4. Click **"Save"** or **"Enable"**

### Step 4: Get Your API Credentials
Once enabled, you'll see:
- **API Username**: This is your Namecheap account username
- **API Key**: A long string of characters (copy this!)

**⚠️ Important**: Save your API key securely. You won't be able to see it again after leaving the page (you'll need to regenerate it if lost).

### Step 5: Whitelist Your IP Address
Namecheap requires you to whitelist the IP address that will make API calls.

1. In the **"Whitelisted IPs"** section, click **"Edit"**
2. Click **"Add IP"**
3. Enter a label (e.g., "Home IP", "Server IP", "Development")
4. Enter your **public IPv4 address**
   - To find your IP: Visit [https://whatismyipaddress.com/](https://whatismyipaddress.com/)
   - Or run: `curl ifconfig.me` in terminal
5. Click **"Save"**

**Note**: Only IPv4 addresses can be whitelisted (not IPv6).

### Step 6: Set Environment Variables
Once you have your credentials, set them as environment variables:

```bash
export NAMECHEAP_API_USER="your_namecheap_username"
export NAMECHEAP_API_KEY="your_api_key_here"
export NAMECHEAP_CLIENT_IP="your_public_ip_address"
```

To make these permanent, add them to your `~/.zshrc` or `~/.bashrc`:

```bash
echo 'export NAMECHEAP_API_USER="your_namecheap_username"' >> ~/.zshrc
echo 'export NAMECHEAP_API_KEY="your_api_key_here"' >> ~/.zshrc
echo 'export NAMECHEAP_CLIENT_IP="your_public_ip_address"' >> ~/.zshrc
source ~/.zshrc
```

### Step 7: Test Your API Access
Run the migration script to test:

```bash
python3 scripts/migrate_dns_namecheap.py
```

## Troubleshooting

### "IP address not whitelisted"
- Make sure your current public IP matches the whitelisted IP
- If your IP changes (dynamic IP), you'll need to update it in Namecheap
- Check your IP: `curl ifconfig.me`

### "Invalid API credentials"
- Double-check your API username (should be your Namecheap account username)
- Verify the API key was copied correctly (no extra spaces)
- Make sure API access is enabled in your account

### "API access not enabled"
- Go back to Profile → Tools → Namecheap API Access
- Ensure the toggle is set to "ON"
- You may need to re-enter your password

## Security Best Practices

1. **Never commit API keys to git** - They're already in `.gitignore`
2. **Use environment variables** - Don't hardcode credentials
3. **Rotate keys periodically** - Regenerate if compromised
4. **Limit IP whitelist** - Only whitelist IPs you actually use
5. **Use separate keys for production/dev** - If possible, use different accounts

## Quick Reference

**Location**: Profile → Tools → Business & Dev Tools → Namecheap API Access

**Required Info**:
- API Username: Your Namecheap account username
- API Key: Generated key from the dashboard
- Client IP: Your public IPv4 address

**API Documentation**: [https://www.namecheap.com/support/api/intro/](https://www.namecheap.com/support/api/intro/)



