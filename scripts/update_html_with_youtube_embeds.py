#!/usr/bin/env python3
"""
Update HTML pages to replace <video> tags with YouTube embeds.

This script:
1. Reads YouTube video ID mappings from youtube_videos.json
2. Finds all <video> tags that reference local video files
3. Replaces them with YouTube iframe embeds
4. Maintains existing CSS classes and styling

Usage:
    python3 update_html_with_youtube_embeds.py [--dry-run]
"""

import os
import sys
import json
import argparse
import re
from pathlib import Path
from html.parser import HTMLParser

# File paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
VIDEO_MAPPING_FILE = os.path.join(SCRIPT_DIR, 'youtube_videos.json')
VIDEOS_DIR = os.path.join(REPO_ROOT, 'assets', 'videos')


def load_video_mappings():
    """Load YouTube video ID mappings."""
    if not os.path.exists(VIDEO_MAPPING_FILE):
        print(f"❌ Error: Video mapping file not found: {VIDEO_MAPPING_FILE}")
        print("   Run batch_upload_videos.py first to upload videos and create mappings.")
        sys.exit(1)
    
    with open(VIDEO_MAPPING_FILE, 'r') as f:
        return json.load(f)


def get_video_id_from_filename(filename, mappings):
    """Get YouTube video ID from filename."""
    # Extract just the filename from path
    basename = os.path.basename(filename)
    
    # Check direct match
    if basename in mappings:
        return mappings[basename].get('video_id') or mappings[basename].get('embed_url', '').split('/')[-1]
    
    # Try matching without extension
    name_without_ext = os.path.splitext(basename)[0]
    for key, value in mappings.items():
        if os.path.splitext(key)[0] == name_without_ext:
            return value.get('video_id') or value.get('embed_url', '').split('/')[-1]
    
    return None




def replace_video_tags(html_content, mappings):
    """Replace <video> tags with YouTube embeds."""
    # Pattern to match video tags with source pointing to assets/videos/
    video_pattern = r'<video([^>]*?)>.*?<source\s+src=["\']([^"\']*assets/videos/([^"\']+\.mp4))["\']([^>]*?)>.*?</video>'
    
    def replace_match(match):
        video_attrs = match.group(1)
        src_path = match.group(2)
        filename = match.group(3)
        
        # Extract video ID from mappings
        video_id = get_video_id_from_filename(filename, mappings)
        
        if not video_id:
            print(f"⚠️  No YouTube ID found for: {filename}")
            return match.group(0)  # Return original if no mapping found
        
        # Extract class attribute from video element
        class_match = re.search(r'class=["\']([^"\']+)["\']', video_attrs)
        video_classes = class_match.group(1) if class_match else 'farm-video'
        
        # Create YouTube iframe embed (replaces the video element)
        youtube_embed = f'''<iframe 
    class="{video_classes}"
    src="https://www.youtube.com/embed/{video_id}?rel=0"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
</iframe>'''
        
        return youtube_embed
    
    # Replace all video tags
    new_content = re.sub(video_pattern, replace_match, html_content, flags=re.DOTALL | re.IGNORECASE)
    
    return new_content


def update_html_file(file_path, mappings, dry_run=False):
    """Update a single HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        # Check if file contains video references
        if 'assets/videos/' not in original_content and 'video' not in original_content.lower():
            return False
        
        # Replace video tags
        new_content = replace_video_tags(original_content, mappings)
        
        # Check if content changed
        if new_content == original_content:
            return False
        
        if dry_run:
            print(f"  Would update: {file_path}")
            return True
        else:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"  ✅ Updated: {file_path}")
            return True
            
    except Exception as e:
        print(f"  ❌ Error updating {file_path}: {e}")
        return False


def find_html_files():
    """Find all HTML files that might contain video references."""
    html_files = []
    
    # Directories to search
    search_dirs = [
        os.path.join(REPO_ROOT, 'farms'),
        os.path.join(REPO_ROOT, 'shipments'),
        os.path.join(REPO_ROOT, 'product-page'),
    ]
    
    for search_dir in search_dirs:
        if os.path.exists(search_dir):
            for root, dirs, files in os.walk(search_dir):
                for file in files:
                    if file.endswith('.html'):
                        html_files.append(os.path.join(root, file))
    
    return html_files


def main():
    parser = argparse.ArgumentParser(description='Update HTML pages with YouTube embeds')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be updated without making changes')
    
    args = parser.parse_args()
    
    print("🔍 Loading video mappings...")
    mappings = load_video_mappings()
    print(f"✅ Loaded {len(mappings)} video mappings\n")
    
    print("🔍 Finding HTML files...")
    html_files = find_html_files()
    print(f"✅ Found {len(html_files)} HTML files to check\n")
    
    print("🔄 Updating HTML files...")
    if args.dry_run:
        print("(DRY RUN - no files will be modified)\n")
    
    updated_count = 0
    for html_file in html_files:
        rel_path = os.path.relpath(html_file, REPO_ROOT)
        if update_html_file(html_file, mappings, dry_run=args.dry_run):
            updated_count += 1
    
    print(f"\n{'='*60}")
    print(f"📊 SUMMARY:")
    print(f"   ✅ Files updated: {updated_count}")
    print(f"   📁 Total files checked: {len(html_files)}")
    
    if args.dry_run:
        print(f"\n💡 Run without --dry-run to apply changes")
    else:
        print(f"\n✅ Done! HTML files updated with YouTube embeds")


if __name__ == '__main__':
    main()
