#!/usr/bin/env python3
"""
Fix image references from assets/raw folders.
Finds all references to assets/raw and moves images to appropriate locations.
"""

import os
import re
import shutil
from pathlib import Path
from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).parent.parent
RAW_DIR = BASE_DIR / "assets" / "raw"
IMAGES_DIR = BASE_DIR / "assets" / "images"

def find_image_references(file_path):
    """Find all image references in an HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return []
    
    images = []
    
    # Find all img tags
    for img in soup.find_all('img'):
        src = img.get('src', '') or img.get('data-src', '') or img.get('data-image', '')
        if src and ('raw' in src.lower() or src.startswith('./') or src.startswith('../')):
            images.append({
                'tag': img,
                'src': src,
                'original': str(img)
            })
    
    # Find background images in style attributes
    for tag in soup.find_all(style=True):
        style = tag.get('style', '')
        if 'background' in style and 'raw' in style.lower():
            match = re.search(r'url\(["\']?([^"\')]+)["\']?\)', style)
            if match:
                images.append({
                    'tag': tag,
                    'src': match.group(1),
                    'type': 'background'
                })
    
    return images

def locate_image_file(src_path, html_file_path):
    """Locate the actual image file from a src path."""
    # Resolve relative paths
    if src_path.startswith('./') or src_path.startswith('../'):
        # Make relative to HTML file
        html_dir = html_file_path.parent
        resolved = (html_dir / src_path).resolve()
        if resolved.exists():
            return resolved
    
    # Check if it's in raw folder
    if 'raw' in src_path:
        # Try to extract filename
        filename = Path(src_path).name
        # Search in raw directories
        for raw_file in RAW_DIR.rglob(filename):
            return raw_file
        
        # Try to match partial path
        parts = src_path.split('/')
        for part in reversed(parts):
            if part and '.' in part:  # Looks like a filename
                for raw_file in RAW_DIR.rglob(part):
                    return raw_file
    
    # Check if already in images folder
    if 'assets/images' in src_path:
        rel_path = src_path.split('assets/images/')[-1]
        image_file = IMAGES_DIR / rel_path
        if image_file.exists():
            return image_file
    
    return None

def copy_image_to_assets(image_file, context='blog-posts'):
    """Copy image to appropriate assets/images location."""
    if not image_file or not image_file.exists():
        return None
    
    # Determine destination
    if context == 'blog-posts':
        dest_dir = IMAGES_DIR / 'blog-posts'
    elif context == 'events':
        dest_dir = IMAGES_DIR / 'events'
    else:
        dest_dir = IMAGES_DIR / context
    
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    # Create unique filename
    filename = image_file.name
    dest_file = dest_dir / filename
    
    # If file exists, add counter
    counter = 1
    while dest_file.exists():
        stem = image_file.stem
        suffix = image_file.suffix
        dest_file = dest_dir / f"{stem}_{counter}{suffix}"
        counter += 1
    
    try:
        shutil.copy2(image_file, dest_file)
        # Return relative path from root
        return f"assets/images/{dest_dir.name}/{dest_file.name}"
    except Exception as e:
        print(f"    ⚠️  Error copying {image_file}: {e}")
        return None

def fix_file_images(file_path, context='blog-posts'):
    """Fix all image references in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return False
    
    changed = False
    images = find_image_references(file_path)
    
    for img_info in images:
        src = img_info['src']
        
        # Locate the actual image file
        image_file = locate_image_file(src, file_path)
        
        if image_file and image_file.exists():
            # Copy to assets/images
            new_path = copy_image_to_assets(image_file, context)
            
            if new_path:
                # Calculate relative path from HTML file to assets/images
                html_dir = file_path.parent
                assets_path = BASE_DIR / new_path
                
                # Calculate relative path
                try:
                    relative_path = os.path.relpath(assets_path, html_dir)
                    # Normalize for web paths
                    relative_path = relative_path.replace('\\', '/')
                    
                    # Update the tag
                    if 'tag' in img_info:
                        tag = img_info['tag']
                        if img_info.get('type') == 'background':
                            # Update style attribute
                            style = tag.get('style', '')
                            new_style = re.sub(
                                r'url\(["\']?[^"\')]+["\']?\)',
                                f'url("{relative_path}")',
                                style
                            )
                            tag['style'] = new_style
                        else:
                            tag['src'] = relative_path
                        changed = True
                        print(f"    ✅ Fixed: {src} -> {relative_path}")
                except Exception as e:
                    print(f"    ⚠️  Error calculating path for {src}: {e}")
        else:
            # Try to fix relative path if it's broken
            if src.startswith('./') or src.startswith('../'):
                # Check if we can fix it
                fixed_path = None
                
                # If it references a _files directory, try to find it
                if '_files' in src:
                    parts = src.split('_files')
                    if len(parts) == 2:
                        base_name = Path(parts[0]).name
                        file_name = Path(parts[1].lstrip('/')).name
                        
                        # Search in raw for matching _files directory
                        for raw_html in RAW_DIR.rglob("*.html"):
                            files_dir = raw_html.parent / f"{raw_html.stem}_files"
                            if files_dir.exists():
                                img_file = files_dir / file_name
                                if img_file.exists():
                                    new_path = copy_image_to_assets(img_file, context)
                                    if new_path:
                                        assets_path = BASE_DIR / new_path
                                        try:
                                            relative_path = os.path.relpath(assets_path, file_path.parent)
                                            relative_path = relative_path.replace('\\', '/')
                                            img_info['tag']['src'] = relative_path
                                            changed = True
                                            print(f"    ✅ Fixed broken path: {src} -> {relative_path}")
                                        except:
                                            pass
                                    break
    
    if changed:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            return True
        except Exception as e:
            print(f"    ❌ Error writing {file_path}: {e}")
            return False
    
    return False

def main():
    """Fix all image references."""
    print("Scanning for image references to assets/raw...")
    print("=" * 60)
    
    # Find all HTML files
    html_files = []
    
    # Blog posts
    html_files.extend(list((BASE_DIR / "post").rglob("*.html")))
    
    # Event pages
    html_files.extend(list((BASE_DIR / "event-details-registration").rglob("*.html")))
    
    print(f"Found {len(html_files)} HTML files to check")
    print("=" * 60)
    
    fixed = 0
    skipped = 0
    
    for file_path in html_files:
        # Determine context
        if 'post' in str(file_path):
            context = 'blog-posts'
        elif 'event' in str(file_path):
            context = 'events'
        else:
            context = 'general'
        
        print(f"\nProcessing: {file_path.relative_to(BASE_DIR)}")
        
        if fix_file_images(file_path, context):
            fixed += 1
            print(f"  ✅ Fixed images in file")
        else:
            skipped += 1
    
    print("\n" + "=" * 60)
    print(f"Summary:")
    print(f"  ✅ Fixed: {fixed}")
    print(f"  ℹ️  No changes: {skipped}")

if __name__ == "__main__":
    main()

