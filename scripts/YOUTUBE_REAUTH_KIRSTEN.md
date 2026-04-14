# Re-authorize YouTube upload (`invalid_scope` / expired token)

The upload helper is `scripts/upload_video_to_youtube.py`. It uses:

- `scripts/youtube_credentials.json` — OAuth **Desktop** client from Google Cloud Console
- `scripts/youtube_token.json` — saved user token (gitignored)

If you see `google.auth.exceptions.RefreshError: ('invalid_scope: Bad Request', …)`, the saved token no longer matches the OAuth client scopes.

## Fix

1. In [Google Cloud Console](https://console.cloud.google.com/) for the project that owns the OAuth client, ensure the OAuth consent screen is valid and the **YouTube Data API v3** is enabled.
2. Confirm the OAuth client type is **Desktop app** (matches `InstalledAppFlow` in the script).
3. Locally, remove the old token and re-run the consent flow:

```bash
cd /path/to/agroverse_shop
rm -f scripts/youtube_token.json
python3 scripts/upload_video_to_youtube.py \
  "/Users/garyjob/Downloads/kirsten making hot chocolate.MP4" \
  --title "Kirsten (KiKi's Cocoa) makes hot chocolate — Agroverse single-estate cacao | #Shorts" \
  --description "$(cat scripts/kirsten-hot-chocolate-youtube-description.txt)" \
  --privacy public \
  --tags Agroverse KiKisCocoa cacao hotchocolate singleorigin craftchocolate Brazil Bahia Shorts
```

A browser window opens; sign in with the channel owner account (**admin@truesight.me** if that is the channel).

4. After upload, copy the **video id** from the script output and replace every site occurrence of:

`__KIRSTEN_HOT_CHOCOLATE_YOUTUBE_ID__`

(in blog post, partner page, both 81% PDPs — search the repo).

5. Optional: paste YouTube Studio’s auto transcript into `scripts/kirsten-hot-chocolate-youtube-description.txt` and the blog section “Transcript”, then re-upload metadata only (Studio editor or API).

## Shorts

The source file is **1080×1920**, ~43s — suitable for **YouTube Shorts** once uploaded (vertical). The Data API does not set a separate “Shorts” flag; classification follows YouTube’s rules. Including `#Shorts` in the title/description helps discovery.
