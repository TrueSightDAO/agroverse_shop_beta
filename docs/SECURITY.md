# Security Guidelines for Agroverse.shop

## ⚠️ CRITICAL: Never Commit Credentials

This repository contains sensitive credentials that should **NEVER** be committed to Git:

### Files That Must NOT Be Committed

1. **`google-service-account.json`**
   - Contains Google Cloud service account private key
   - **Action Required**: If this was ever committed, rotate the service account credentials immediately
   - **Current Status**: ✅ Not tracked by Git (in `.gitignore`)

2. **`scripts/youtube_credentials.json`**
   - Contains OAuth client ID and client secret
   - **Action Required**: If this was ever committed, regenerate OAuth credentials
   - **Current Status**: ✅ Not tracked by Git (in `.gitignore`)

3. **`scripts/youtube_token.json`**
   - Contains access tokens and refresh tokens
   - **Action Required**: If this was ever committed, revoke and regenerate tokens
   - **Current Status**: ✅ Not tracked by Git (in `.gitignore`)

4. **`js/config.js`**
   - Contains Google Places API key (public key, but should still be in environment variables)
   - **Status**: ⚠️ Currently tracked by Git
   - **Recommendation**: Move API keys to environment variables or use a build-time configuration

### Current `.gitignore` Protection

The following patterns are excluded from Git:
- `google-service-account.json`
- `*credentials*.json`
- `*token*.json`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- `secrets/`, `credentials/`
- `*.secret`
- `.env`, `.env.local`, `.env.*.local`

### If Credentials Were Already Committed

If any of these files were previously committed to Git:

1. **Remove from Git history** (if repository is private):
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch google-service-account.json scripts/youtube_credentials.json scripts/youtube_token.json" \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **Rotate all exposed credentials**:
   - Google Service Account: Create new service account and delete old one
   - YouTube OAuth: Regenerate client ID and secret in Google Cloud Console
   - YouTube Tokens: Revoke existing tokens and regenerate

3. **Force push** (only if repository is private and you've coordinated with team):
   ```bash
   git push origin --force --all
   ```

### Best Practices Going Forward

1. **Use Environment Variables**: Store sensitive data in environment variables
2. **Use Secret Management**: Consider using services like:
   - Google Secret Manager
   - AWS Secrets Manager
   - HashiCorp Vault
3. **Use `.env.example`**: Create example files showing required variables without values
4. **Review Before Committing**: Always run `git status` and `git diff` before committing
5. **Use Git Hooks**: Set up pre-commit hooks to scan for secrets

### API Keys in `js/config.js`

The `js/config.js` file contains:
- Google Places API key (public key, but should be restricted)
- Facebook Pixel ID (public identifier)

**Recommendations**:
- Move these to environment variables
- Use a build process to inject them at build time
- Restrict Google Places API key to specific domains/IPs in Google Cloud Console
- Consider using a configuration service for production

### Checking for Exposed Credentials

To check if credentials are currently tracked:
```bash
git ls-files | grep -E '(google-service-account|youtube_credentials|youtube_token|\.env|\.key|\.pem)'
```

To check Git history for previously committed credentials:
```bash
git log --all --full-history --source -- "*credentials*" "*token*" "*service-account*"
```

### Emergency Response

If credentials are exposed in a public repository:

1. **Immediately rotate all exposed credentials**
2. **Remove from Git history** (if possible)
3. **Review access logs** for unauthorized usage
4. **Notify team members** to update their local copies
5. **Consider making repository private** if it was public
