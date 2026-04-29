#!/usr/bin/env python3
"""
Optimize mobile responsiveness across all pages.
Ensures proper hamburger menu functionality and mobile-optimized layouts.

History: an earlier version of this script produced two bugs that propagated
to every page it touched (35 partner pages, swept in PR #87):

1. A `body { overflow-x: hidden; }` rule was injected *inside* the
   `@media (max-width: 768px)` block via `re.sub` with a `[^}]*` pattern.
   That pattern stops at the first inner `}` (a child rule's closer), so
   the appended body{} ended up nested inside a child rule — invalid CSS
   that browsers silently dropped. Fixed by injecting the rule at top
   level (before `</style>`) instead.

2. The idempotency check used `if 'body {' not in existing.split('}')[0]
   if '}' in existing else existing:` — operator precedence parses that
   as `(... if '}' in existing else existing)`, which evaluates to the
   raw string `existing` (truthy) when there's no `}`. Result: re-runs
   appended duplicate body rules. Fixed by checking with an explicit
   top-level regex match.

Both fixes are idempotent: re-running on already-fixed pages is a no-op.
"""

import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

def optimize_mobile_responsive(file_path):
    """Optimize mobile responsiveness in an HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return False
    
    original_content = content
    changed = False

    # Defensive cleanup: strip the malformed orphan
    #   body {
    #       overflow-x: hidden;
    #   }
    # that a prior version of this script injected nested INSIDE another
    # rule. The orphan's trailing `}` was actually the parent rule's
    # closer, so we drop the 3 lines of body{} but leave the trailing `}`
    # in place. The rule will be re-added at top level below if missing.
    orphan_body_re = re.compile(
        r'[ ]*body[ ]\{\n[ ]+overflow-x:[ ]hidden;\n[ ]+\}\n(?=[ ]*\})',
    )
    new_content = orphan_body_re.sub('', content)
    if new_content != content:
        content = new_content
        changed = True

    # Check if file has navigation
    if '<nav' not in content:
        # File doesn't have a nav, but if we cleaned an orphan body{},
        # we still want to write back. Fall through to the writer.
        if changed:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True
            except Exception:
                return False
        return False
    
    # Ensure mobile menu CSS includes hiding regular nav-links.
    # Inject `.nav-links:not(.mobile-menu) { display: none !important; }` as a
    # sibling rule immediately AFTER the `@media (max-width: 768px) { ... }`
    # block — not inside it. The previous version used a non-greedy `[^}]*`
    # regex that matched up to the first inner `}`, landing inside a child
    # rule (e.g. `.mobile-menu-toggle { display: flex; }`); appending after
    # that match nested the new rule inside the child, producing invalid CSS
    # that browsers silently ignored.
    if '@media (max-width: 768px)' in content and '.mobile-menu-toggle' in content:
        if '.nav-links:not(.mobile-menu)' not in content:
            # Match the whole @media block by counting braces. Anchor on the
            # specific @media that contains .mobile-menu-toggle.
            media_block_re = re.compile(
                r'@media\s*\(max-width:\s*768px\)\s*\{', re.DOTALL
            )
            for m in media_block_re.finditer(content):
                # Walk forward, balancing braces, to find the matching close.
                depth = 1
                i = m.end()
                while i < len(content) and depth > 0:
                    if content[i] == '{':
                        depth += 1
                    elif content[i] == '}':
                        depth -= 1
                    i += 1
                block = content[m.start():i]
                if '.mobile-menu-toggle' not in block:
                    continue
                insertion = (
                    '\n        @media (max-width: 768px) {'
                    '\n            .nav-links:not(.mobile-menu) {'
                    '\n                display: none !important;'
                    '\n            }'
                    '\n        }'
                )
                content = content[:i] + insertion + content[i:]
                changed = True
                break

    # Add general mobile optimizations
    if '@media (max-width: 768px)' in content:
        # Ensure viewport meta tag
        if 'viewport' not in content:
            # Add viewport meta tag
            content = re.sub(
                r'(<head[^>]*>)',
                r'\1\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
                content
            )
            changed = True

        # Inject a TOP-LEVEL `body { overflow-x: hidden; }` rule (placed just
        # before `</style>`), not inside the @media block. overflow-x:hidden
        # applies regardless of viewport, so it doesn't belong in a media
        # query, and the previous nested-injection regex was malformed: it
        # used `[^}]*` which terminates at the first `}` inside @media,
        # landing inside a child rule and nesting `body { ... }` invalidly.
        # Idempotency is enforced by checking for an exact top-level match.
        top_level_body_rule_re = re.compile(
            r'^[ \t]*body\s*\{\s*\n?[ \t]*overflow-x:\s*hidden;\s*\n?[ \t]*\}',
            re.MULTILINE,
        )
        if not top_level_body_rule_re.search(content) and '</style>' in content:
            body_rule = (
                '\n        body {'
                '\n            overflow-x: hidden;'
                '\n        }\n    '
            )
            content = content.replace('</style>', body_rule + '</style>', 1)
            changed = True
    
    # Fix any remaining class_ attributes
    if 'class_=' in content:
        content = re.sub(r'class_=', 'class=', content)
        changed = True
    
    if changed and content != original_content:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Error writing {file_path}: {e}")
            return False
    
    return False

def main():
    """Optimize mobile responsiveness on all HTML pages."""
    print("Optimizing mobile responsiveness...")
    print("=" * 60)
    
    # Find HTML files (exclude assets/raw)
    html_files = []
    directories = [
        BASE_DIR,
        BASE_DIR / 'post',
        BASE_DIR / 'event-details-registration',
        BASE_DIR / 'category',
        BASE_DIR / 'product-page',
        BASE_DIR / 'farms',
        BASE_DIR / 'shipments',
        BASE_DIR / 'partners',
    ]
    
    for directory in directories:
        if directory.exists():
            html_files.extend(list(directory.rglob('*.html')))
    
    html_files = list(set(html_files))
    html_files = [f for f in html_files 
                  if 'assets/raw' not in str(f)
                  and '.git' not in str(f)
                  and f.is_file()]
    
    print(f"Found {len(html_files)} HTML files")
    print("=" * 60)
    
    fixed = 0
    skipped = 0
    
    for file_path in sorted(html_files):
        if optimize_mobile_responsive(file_path):
            fixed += 1
            print(f"  ✅ Optimized: {file_path.relative_to(BASE_DIR)}")
        else:
            skipped += 1
    
    print("\n" + "=" * 60)
    print(f"Summary:")
    print(f"  ✅ Optimized: {fixed}")
    print(f"  ℹ️  Skipped: {skipped}")

if __name__ == "__main__":
    main()


