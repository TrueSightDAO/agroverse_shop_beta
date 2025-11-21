#!/usr/bin/env python3
"""
Script to geocode partner locations using Google Places API
Requires GOOGLE_PLACES_API_KEY environment variable or .env file
"""

import os
import json
import requests
import sys
from pathlib import Path

# Load partner locations
script_dir = Path(__file__).parent
repo_root = script_dir.parent
locations_file = repo_root / 'partner_locations.json'

if not locations_file.exists():
    print(f"❌ Error: {locations_file} not found")
    sys.exit(1)

with open(locations_file, 'r') as f:
    partner_locations = json.load(f)

# Get API key from environment or .env file
api_key = os.getenv('GOOGLE_PLACES_API_KEY') or os.getenv('GOOGLE_MAPS_API_KEY')

if not api_key:
    # Try to load from .env file
    env_file = repo_root / '.env'
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                if line.startswith('GOOGLE_PLACES_API_KEY=') or line.startswith('GOOGLE_MAPS_API_KEY='):
                    api_key = line.split('=', 1)[1].strip().strip('"').strip("'")
                    break

if not api_key:
    print("❌ Error: GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY not found")
    print("   Please set it as an environment variable or in .env file")
    sys.exit(1)

print(f"✅ Using Google Places API key: {api_key[:10]}...")

# Geocode each partner location
partner_coordinates = {}

for slug, data in partner_locations.items():
    location = data['location']
    name = data['name']
    
    print(f"\n📍 Geocoding: {name} - {location}")
    
    # Use Google Places API Text Search
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        'query': f"{name}, {location}",
        'key': api_key
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        result = response.json()
        
        if result['status'] == 'OK' and result['results']:
            place = result['results'][0]
            lat = place['geometry']['location']['lat']
            lng = place['geometry']['location']['lng']
            formatted_address = place.get('formatted_address', location)
            
            partner_coordinates[slug] = {
                'name': name,
                'location': location,
                'lat': lat,
                'lng': lng,
                'formatted_address': formatted_address,
                'place_id': place.get('place_id', '')
            }
            
            print(f"   ✅ Found: {formatted_address}")
            print(f"   Coordinates: {lat}, {lng}")
        else:
            print(f"   ⚠️  Status: {result.get('status', 'UNKNOWN')}")
            if result.get('error_message'):
                print(f"   Error: {result['error_message']}")
            partner_coordinates[slug] = {
                'name': name,
                'location': location,
                'lat': None,
                'lng': None,
                'formatted_address': location,
                'place_id': None
            }
    except Exception as e:
        print(f"   ❌ Error: {e}")
        partner_coordinates[slug] = {
            'name': name,
            'location': location,
            'lat': None,
            'lng': None,
            'formatted_address': location,
            'place_id': None
        }

# Save coordinates
output_file = repo_root / 'partner_coordinates.json'
with open(output_file, 'w') as f:
    json.dump(partner_coordinates, f, indent=2)

print(f"\n✅ Saved coordinates to {output_file}")
print(f"   Successfully geocoded: {sum(1 for p in partner_coordinates.values() if p['lat'] is not None)}/{len(partner_coordinates)} partners")

