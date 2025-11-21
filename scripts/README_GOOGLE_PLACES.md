# Google Places API Integration for Partner Maps

This directory contains scripts to geocode partner locations using Google Places API and embed interactive maps on partner pages.

## Setup

1. **Get a Google Places API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the "Places API" and "Geocoding API"
   - Create an API key in "Credentials"

2. **Set the API Key**

   Option A: Environment variable
   ```bash
   export GOOGLE_PLACES_API_KEY="your_api_key_here"
   ```

   Option B: Create a `.env` file in the repo root
   ```
   GOOGLE_PLACES_API_KEY=your_api_key_here
   ```

## Usage

1. **Geocode Partner Locations**
   ```bash
   python3 scripts/geocode_partners.py
   ```

   This will:
   - Query Google Places API for each partner location
   - Extract coordinates (latitude/longitude)
   - Save results to `partner_coordinates.json`

2. **Update Partner Pages**

   The partner pages are already set up with maps. Once you have `partner_coordinates.json`:
   - The maps will automatically use the precise coordinates
   - If coordinates aren't available, maps will use OpenStreetMap geocoding as fallback

## Current Status

- ✅ All 14 partner pages have interactive maps embedded
- ✅ Maps use Leaflet.js (same as shipment pages)
- ✅ Fallback geocoding via OpenStreetMap Nominatim API
- ⏳ Waiting for Google Places API key to get precise coordinates

## Partner Locations

Partner locations are stored in `partner_locations.json`. To update:
1. Edit `partner_locations.json`
2. Run the geocoding script
3. Partner pages will automatically use the new coordinates

## Notes

- The Google Places API has usage limits and may incur costs
- OpenStreetMap Nominatim is free but has rate limits (1 request per second)
- Maps are embedded using Leaflet.js which is free and open-source
- Each partner page includes a "View on Google Maps" link

