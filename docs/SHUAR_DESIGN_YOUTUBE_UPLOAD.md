# Shuar Design Boutique — YouTube upload (Andrea videos)

Two videos from **Downloads** were uploaded to **admin@truesight.me** (TrueSight DAO YouTube) and are embedded on the partner page.

| Video | YouTube ID | URL |
|-------|------------|-----|
| QR code on cacao | `J0rIxH5MEOk` | https://www.youtube.com/watch?v=J0rIxH5MEOk |
| Walking into the boutique | `nKyNIOCT0oI` | https://www.youtube.com/watch?v=nKyNIOCT0oI |

## Video files (in Downloads)

| File | Suggested title | Use |
|------|------------------|-----|
| `andrea_sticking_qr_code.mp4` | See below | Partner page / social |
| `andrea_walking into the boutique.mp4` | See below | Partner page / social |

*(Note: second filename has a space; use quotes when running commands.)*

## Where YouTube credentials live

- **video_editor** project: `video_editor/youtube_uploader.py` and `video_editor/upload_cli.py`
- Credentials: **per-account** in `video_editor/credentials/`:
  - `{account_email}_credentials.json` — OAuth 2.0 client secrets (from Google Cloud Console, YouTube API enabled)
  - `{account_email}_token.json` — created after first successful login
- Example account from CLI help: `admin@truesight.me`. To use TrueSight DAO channel, add that account’s credentials as `credentials/admin@truesight.me_credentials.json` (or the email that owns the channel), then run the first upload; the script will open a browser for OAuth and save the token.

## Upload commands (run from `video_editor`)

```bash
cd /Users/garyjob/Applications/video_editor
# List configured accounts (dummy path needed when using --list-accounts)
python upload_cli.py . --list-accounts

# Upload 1: Andrea sticking QR code
python upload_cli.py "/Users/garyjob/Downloads/andrea_sticking_qr_code.mp4" \
  --account admin@truesight.me \
  --title "Agroverse at Shuar Design Boutique — QR code on our cacao" \
  --description "Shuar Design Boutique, Bern. Our partner Andrea places the Agroverse QR code on ceremonial cacao. Find bags of cacao at Yankuam culture centre, Gerechtigkeitsgasse 32. https://www.agroverse.shop/partners/shuar-design-boutique" \
  --tags Agroverse ShuarDesignBoutique ceremonial cacao Bern Switzerland Yankuam \
  --privacy public

# Upload 2: Andrea walking into the boutique
python upload_cli.py "/Users/garyjob/Downloads/andrea_walking into the boutique.mp4" \
  --account admin@truesight.me \
  --title "Agroverse partner — Shuar Design Boutique, Bern" \
  --description "Walking into Shuar Design Boutique at Yankuam culture centre, Bern. Fair-trade craft from Shuar artists and Agroverse ceremonial cacao. Gerechtigkeitsgasse 32. https://www.agroverse.shop/partners/shuar-design-boutique" \
  --tags Agroverse ShuarDesignBoutique Bern Switzerland Yankuam \
  --privacy public
```

*(Replace `admin@truesight.me` with the actual TrueSight DAO YouTube account email if different.)*

## Suggested captions (for YouTube Studio or .srt)

**Video 1 — andrea_sticking_qr_code.mp4**

- **Short caption (thumbnail / social):**  
  Agroverse at Shuar Design Boutique — QR code on our cacao. Bern, Switzerland.
- **In-video / description:**  
  Our partner at Shuar Design Boutique (Yankuam, Bern) places the Agroverse QR code on ceremonial cacao. Bags of cacao available at Gerechtigkeitsgasse 32.

**Video 2 — andrea_walking into the boutique.mp4**

- **Short caption:**  
  Walking into Shuar Design Boutique — Agroverse partner in Bern.
- **In-video / description:**  
  Shuar Design Boutique at Yankuam culture centre, Bern. Fair-trade craft from the Ecuadorian Amazon and Agroverse ceremonial cacao.

After upload, you can add these as captions in YouTube Studio (Subtitles) or upload a short .srt if you time them.

## After upload

- Add the two YouTube URLs to the Shuar Design Boutique partner page (e.g. an “Videos” or “See more” section) if desired.
- Optionally embed one or both on `agroverse.shop/partners/shuar-design-boutique`.
