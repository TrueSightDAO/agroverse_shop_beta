#!/usr/bin/env python3
"""
Fix paragraph alignment under h1 on event pages.
Centers the paragraph and ensures proper alignment within the hero content.
"""

import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
EVENT_DIR = BASE_DIR / "event-details-registration"

def fix_paragraph_alignment(file_path):
    """Fix paragraph alignment in event hero section."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return False
    
    original_content = content
    
    # Fix .event-hero-content to have max-width and center
    if '.event-hero-content {' in content:
        # Update event-hero-content to center and constrain width
        content = re.sub(
            r'(\.event-hero-content\s*\{[^}]*margin-top:\s*[^;]+;)',
            r'\1\n            max-width: 900px;\n            margin-left: auto;\n            margin-right: auto;',
            content
        )
    
    # Fix h1 to be centered
    if '.event-hero h1 {' in content:
        # Ensure h1 has text-align center
        if 'text-align' not in content.split('.event-hero h1 {')[1].split('}')[0]:
            content = re.sub(
                r'(\.event-hero h1\s*\{[^}]*line-height:[^;]+;)',
                r'\1\n            text-align: center;',
                content
            )
    
    # Fix paragraph to be centered and have proper margins
    if '.event-hero p {' in content:
        # Update paragraph styles
        old_p_style = re.search(r'\.event-hero p\s*\{[^}]+\}', content)
        if old_p_style:
            p_content = old_p_style.group(0)
            # Replace with better aligned version
            new_p_style = """.event-hero-content p {
            font-size: 1.25rem;
            max-width: 800px;
            margin: 0 auto 1.5rem auto;
            opacity: 0.95;
            text-align: center;
        }"""
            content = content.replace(p_content, new_p_style)
    
    # If content changed, write it back
    if content != original_content:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Error writing {file_path}: {e}")
            return False
    
    return False

def main():
    """Fix all event pages."""
    if not EVENT_DIR.exists():
        print(f"Event directory not found: {EVENT_DIR}")
        return
    
    event_files = list(EVENT_DIR.rglob("index.html"))
    
    if not event_files:
        print("No event files found")
        return
    
    print(f"Found {len(event_files)} event pages")
    print("Fixing paragraph alignment...")
    print("=" * 60)
    
    fixed = 0
    skipped = 0
    errors = []
    
    for file_path in event_files:
        print(f"\nProcessing: {file_path.relative_to(BASE_DIR)}")
        
        if fix_paragraph_alignment(file_path):
            print("  ✅ Fixed paragraph alignment")
            fixed += 1
        else:
            print("  ℹ️  No changes needed or error")
            skipped += 1
    
    print("\n" + "=" * 60)
    print(f"Summary:")
    print(f"  ✅ Fixed: {fixed}")
    print(f"  ℹ️  No changes: {skipped}")
    if errors:
        print(f"  ❌ Errors: {len(errors)}")

if __name__ == "__main__":
    main()

