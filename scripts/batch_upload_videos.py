#!/usr/bin/env python3
"""
Batch upload videos to YouTube using metadata from video_metadata.json.

This script:
1. Reads video metadata from video_metadata.json
2. Uploads each video with proper titles, descriptions, and tags
3. Stores YouTube video IDs in youtube_videos.json
4. Updates HTML pages with YouTube embeds (optional)

Usage:
    python3 batch_upload_videos.py [--update-html]
"""

import os
import sys
import json
import argparse
from pathlib import Path

# Import upload function from upload_video_to_youtube.py
# We need to import the module functions
import importlib.util
upload_module_path = os.path.join(os.path.dirname(__file__), 'upload_video_to_youtube.py')
spec = importlib.util.spec_from_file_location("upload_module", upload_module_path)
upload_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upload_module)
get_authenticated_service = upload_module.get_authenticated_service
upload_video = upload_module.upload_video

# File paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
METADATA_FILE = os.path.join(SCRIPT_DIR, 'video_metadata.json')
VIDEO_MAPPING_FILE = os.path.join(SCRIPT_DIR, 'youtube_videos.json')
VIDEOS_DIR = os.path.join(REPO_ROOT, 'assets', 'videos')


def load_metadata():
    """Load video metadata from JSON file."""
    if not os.path.exists(METADATA_FILE):
        print(f"❌ Error: Metadata file not found: {METADATA_FILE}")
        sys.exit(1)
    
    with open(METADATA_FILE, 'r') as f:
        data = json.load(f)
    return data['videos']


def load_existing_mappings():
    """Load existing YouTube video ID mappings."""
    if os.path.exists(VIDEO_MAPPING_FILE):
        with open(VIDEO_MAPPING_FILE, 'r') as f:
            return json.load(f)
    return {}


def save_mappings(mappings):
    """Save YouTube video ID mappings to JSON file."""
    with open(VIDEO_MAPPING_FILE, 'w') as f:
        json.dump(mappings, f, indent=2)
    print(f"✅ Saved mappings to {VIDEO_MAPPING_FILE}")


def upload_all_videos(update_existing=False):
    """Upload all videos from metadata file."""
    metadata_list = load_metadata()
    mappings = load_existing_mappings()
    youtube = get_authenticated_service()
    
    print(f"📤 Found {len(metadata_list)} videos to process\n")
    
    uploaded = 0
    skipped = 0
    failed = 0
    
    for i, video_data in enumerate(metadata_list, 1):
        filename = video_data['filename']
        video_path = os.path.join(VIDEOS_DIR, filename)
        
        print(f"\n[{i}/{len(metadata_list)}] Processing: {filename}")
        print("=" * 60)
        
        # Check if already uploaded
        if filename in mappings and not update_existing:
            print(f"⏭️  Already uploaded (ID: {mappings[filename]['video_id']})")
            print(f"   URL: {mappings[filename]['url']}")
            skipped += 1
            continue
        
        # Check if file exists
        if not os.path.exists(video_path):
            print(f"❌ Video file not found: {video_path}")
            failed += 1
            continue
        
        # Upload video
        result = upload_video(
            youtube,
            video_path,
            video_data['title'],
            video_data['description'],
            video_data.get('privacy', 'public'),
            video_data.get('tags', [])
        )
        
        if result:
            video_id = result['id']
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            
            # Store mapping
            mappings[filename] = {
                'video_id': video_id,
                'url': video_url,
                'embed_url': f"https://www.youtube.com/embed/{video_id}",
                'title': video_data['title'],
                'pages': video_data.get('pages', []),
                'uploaded_at': result.get('snippet', {}).get('publishedAt', '')
            }
            
            save_mappings(mappings)
            uploaded += 1
            print(f"✅ Uploaded successfully!")
        else:
            failed += 1
            print(f"❌ Upload failed")
    
    print("\n" + "=" * 60)
    print(f"📊 SUMMARY:")
    print(f"   ✅ Uploaded: {uploaded}")
    print(f"   ⏭️  Skipped: {skipped}")
    print(f"   ❌ Failed: {failed}")
    print(f"   📁 Total: {len(metadata_list)}")
    
    return mappings


def main():
    parser = argparse.ArgumentParser(description='Batch upload videos to YouTube')
    parser.add_argument('--update-existing', action='store_true',
                       help='Re-upload videos that already exist')
    parser.add_argument('--upload-only', action='store_true',
                       help='Only upload videos, do not update HTML')
    
    args = parser.parse_args()
    
    print("🚀 Starting batch video upload to YouTube")
    print("=" * 60)
    
    mappings = upload_all_videos(update_existing=args.update_existing)
    
    if not args.upload_only:
        print("\n💡 Next step: Run update_html_with_youtube_embeds.py")
        print("   to replace <video> tags with YouTube embeds")
    
    print(f"\n✅ Done! Video mappings saved to {VIDEO_MAPPING_FILE}")


if __name__ == '__main__':
    main()
