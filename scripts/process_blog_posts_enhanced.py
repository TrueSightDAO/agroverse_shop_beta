#!/usr/bin/env python3
"""
Enhanced blog post processor that extracts content and images from raw HTML files.
Handles Wix blog post format and extracts all images properly.
"""

import os
import re
import shutil
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import urlparse

# Base directory
BASE_DIR = Path(__file__).parent.parent
RAW_BLOGS_DIR = BASE_DIR / "assets" / "raw" / "blogs"
POSTS_DIR = BASE_DIR / "post"
POST_IMAGES_DIR = BASE_DIR / "assets" / "images" / "blog-posts"

# URL to filename mapping - mapping URLs to actual file names
URL_TO_FILENAME = {
    "the-heart-of-brazilian-cacao-bahia-and-amazon-origins": None,
    "unveiling-cacao-bean-flavor-profiles-insights-from-global-tasting-tools-and-brazilian-expertise": None,
    "okanogan-regenerative-cacao-journey": None,
    "vote-for-the-artwork-on-the-first-series-of-our-2024-limited-edition-paulo-s-farm-cacao-collection": None,
    "ceremonial-cacao-and-the-art-of-being-from-biohacking-to-presence": None,
    "the-connection-between-wildfires-and-climate-change-a-growing-global-crisis": None,
    "agroverse-and-the-center-sf-a-partnership-rooted-in-regeneration-and-community": None,
    "trends-driving-deforestation-in-the-amazon-rainforest-and-how-agroforestry-can-reverse-them": None,
    "agroverse-partners-with-green-gulch-zen-monastery-to-offer-regenerative-cacao-nibs-to-marin-county-c": "Agroverse Partners with Green Gulch Zen Monastery to Offer Regenerative Amazonian Cacao Nibs to Marin County Community",
    "how-stem-cells-regenerate-with-regular-cacao-consumption": "How Stem Cells Regenerate with Regular Cacao Consumption",
    "agroverse-partners-with-mestre-bico-duro-to-bring-capoeira-fitness-and-cacao-circle-gatherings-to-th": None,
    "the-joy-of-cacao-circles-connections-and-community": "The Joy of Cacao Circles_ Connections and Community",
    "understanding-cabruca-a-traditional-agroforestry-practice-for-amazonian-rainforest-conservation": "Understanding Cabruca_ A Traditional Agroforestry Practice for Amazonian Rainforest Conservation"
}

def normalize_filename(name):
    """Normalize filename for matching."""
    return name.lower().replace(' ', '_').replace(':', '_').replace('/', '_')

def find_blog_file(url_slug, preferred_filename=None):
    """Find blog post file matching URL slug or filename."""
    if not RAW_BLOGS_DIR.exists():
        return None
    
    # Try preferred filename first
    if preferred_filename:
        exact_file = RAW_BLOGS_DIR / f"{preferred_filename}.html"
        if exact_file.exists():
            return exact_file
        
        # Try case-insensitive match
        for file in RAW_BLOGS_DIR.glob("*.html"):
            if file.stem.lower().replace('_', ' ') == preferred_filename.lower().replace('_', ' '):
                return file
    
    # Try to match by slug in URL
    slug_keywords = url_slug.replace('-', ' ').split()
    
    # Search in existing files
    for file in RAW_BLOGS_DIR.glob("*.html"):
        file_stem_lower = file.stem.lower()
        # Check if any keywords match
        if any(keyword in file_stem_lower for keyword in slug_keywords if len(keyword) > 3):
            return file
    
    return None

def extract_images_from_soup(soup, html_file_path):
    """Extract all images from the soup and return image mapping."""
    images = {}
    img_tags = soup.find_all('img')
    
    for img in img_tags:
        src = img.get('src', '') or img.get('data-src', '') or img.get('data-image', '')
        if not src:
            continue
        
        # Skip logos, icons, etc.
        if any(skip in src.lower() for skip in ['logo', 'icon', 'avatar', 'wix', 'facebook', 'twitter']):
            continue
        
        # Get original src for reference
        original_src = src
        
        # Check if it's a local file reference
        if src.startswith('./') or src.startswith('../'):
            # Try to find file in _files directory
            file_name = Path(src).name
            files_dir = html_file_path.parent / f"{html_file_path.stem}_files"
            
            # Try different possible paths
            possible_paths = [
                files_dir / file_name,
                html_file_path.parent / file_name,
                files_dir / Path(src).name,
            ]
            
            # Also try with common Wix file patterns
            if '_files' in src:
                match = re.search(r'([^/]+_files/[^/]+)', src)
                if match:
                    possible_paths.append(html_file_path.parent / match.group(1))
            
            found_file = None
            for path in possible_paths:
                if path.exists():
                    found_file = path
                    break
            
            if found_file:
                # Copy to blog images directory
                POST_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
                
                # Create unique filename
                image_name = f"{html_file_path.stem}_{file_name}"
                image_name = re.sub(r'[^\w\.-]', '_', image_name)
                dest_file = POST_IMAGES_DIR / image_name
                
                try:
                    shutil.copy2(found_file, dest_file)
                    images[original_src] = f"../../assets/images/blog-posts/{image_name}"
                except Exception as e:
                    print(f"    ⚠️  Could not copy image {found_file}: {e}")
                    images[original_src] = original_src
            else:
                images[original_src] = original_src
        elif src.startswith('http'):
            # External URL - keep as is
            images[original_src] = src
        else:
            images[original_src] = src
    
    return images

def clean_content_html(content_soup, image_mapping):
    """Clean and process content HTML."""
    # Remove scripts, styles, and unwanted elements
    for tag in content_soup.find_all(['script', 'style', 'nav', 'header', 'footer', 'iframe']):
        tag.decompose()
    
    # Update image sources
    for img in content_soup.find_all('img'):
        src = img.get('src', '') or img.get('data-src', '') or img.get('data-image', '')
        if src in image_mapping:
            img['src'] = image_mapping[src]
            # Remove data attributes
            for attr in list(img.attrs.keys()):
                if attr.startswith('data-'):
                    del img[attr]
    
    # Clean up links
    for link in content_soup.find_all('a'):
        href = link.get('href', '')
        # Make external links open in new tab
        if href.startswith('http') and 'agroverse.shop' not in href:
            link['target'] = '_blank'
            link['rel'] = 'noopener noreferrer'
    
    # Clean up classes and IDs
    for tag in content_soup.find_all(True):
        # Keep only essential attributes
        attrs_to_keep = ['href', 'src', 'alt', 'target', 'rel']
        attrs_to_remove = []
        for attr in tag.attrs:
            if attr not in attrs_to_keep:
                attrs_to_remove.append(attr)
        for attr in attrs_to_remove:
            del tag[attr]
    
    return str(content_soup)

def extract_blog_content(html_file_path):
    """Extract blog post content from raw HTML file."""
    try:
        with open(html_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
    except Exception as e:
        print(f"    ❌ Error reading {html_file_path}: {e}")
        return None
    
    # Extract title
    title = None
    if soup.title:
        title = soup.title.string.strip()
        # Remove " | Agroverse" suffix if present
        title = re.sub(r'\s*\|\s*Agroverse\s*$', '', title)
    
    # Try to find h1 as title
    h1_tags = soup.find_all('h1')
    for h1 in h1_tags:
        h1_text = h1.get_text().strip()
        if h1_text and not h1_text.lower().startswith('blog'):
            title = h1_text
            break
    
    if not title:
        title = html_file_path.stem.replace('_', ' ')
    
    # Extract meta description
    meta_desc = None
    meta_desc_tag = soup.find('meta', property='og:description') or soup.find('meta', {'name': 'description'})
    if meta_desc_tag:
        meta_desc = meta_desc_tag.get('content', '')
    
    # Extract published date
    published_date = None
    pub_date_tag = soup.find('meta', property='article:published_time')
    if pub_date_tag:
        pub_date_str = pub_date_tag.get('content', '')
        try:
            published_date = datetime.fromisoformat(pub_date_str.replace('Z', '+00:00'))
        except:
            pass
    
    # Extract author
    author = None
    author_tag = soup.find('meta', property='article:author')
    if author_tag:
        author = author_tag.get('content', '')
    
    # Extract images first
    image_mapping = extract_images_from_soup(soup, html_file_path)
    print(f"    Found {len(image_mapping)} images")
    
    # Extract main content - look for Wix blog post content
    content_soup = None
    
    # Try various selectors for Wix blog content
    content_selectors = [
        '[data-testid*="richText"]',
        '[class*="rich-text"]',
        '[class*="blog-post-content"]',
        '[class*="post-content"]',
        'article',
        '[class*="blog"]',
    ]
    
    for selector in content_selectors:
        content_elem = soup.select_one(selector)
        if content_elem:
            content_soup = BeautifulSoup(str(content_elem), 'html.parser')
            break
    
    # If no specific content found, try to get body content
    if not content_soup:
        body = soup.find('body')
        if body:
            # Clone body to avoid modifying original
            content_soup = BeautifulSoup(str(body), 'html.parser')
            # Remove unwanted elements
            for tag in content_soup.find_all(['script', 'style', 'nav', 'header', 'footer', 'iframe', 'noscript']):
                tag.decompose()
    
    if not content_soup:
        print(f"    ⚠️  Could not find content")
        return None
    
    # Clean and process content
    content_html = clean_content_html(content_soup, image_mapping)
    
    return {
        'title': title or 'Untitled Blog Post',
        'description': meta_desc or f"Read about {title} on Agroverse.",
        'content': content_html,
        'published_date': published_date,
        'author': author or 'Agroverse Team',
        'images': list(image_mapping.values())
    }

def generate_blog_post_html(blog_data, url_slug):
    """Generate clean HTML for a blog post using the site template."""
    title = blog_data['title']
    description = blog_data['description']
    content = blog_data['content']
    published_date = blog_data['published_date']
    author = blog_data['author']
    
    # Format date
    date_str = ''
    if published_date:
        date_str = published_date.strftime('%B %d, %Y')
    
    # Calculate relative path for assets (from /post/slug/ to root)
    relative_path = '../../'
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    
    <!-- SEO Meta Tags -->
    <title>{title} | Agroverse</title>
    <meta name="description" content="{description}">
    <link rel="canonical" href="https://www.agroverse.shop/post/{url_slug}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://www.agroverse.shop/post/{url_slug}">
    <meta property="og:title" content="{title} | Agroverse">
    <meta property="og:description" content="{description}">
    <meta property="article:author" content="{author}">
    {f'<meta property="article:published_time" content="{published_date.isoformat()}">' if published_date else ''}
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://www.agroverse.shop/post/{url_slug}">
    <meta property="twitter:title" content="{title} | Agroverse">
    <meta property="twitter:description" content="{description}">
    
    <!-- Favicon -->
    <link rel="icon" type="image/jpeg" href="{relative_path}assets/images/logo/agroverse-logo.jpeg">
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Open+Sans:wght@400;700&display=swap" rel="stylesheet">
    
    <style>
        :root {{
            --color-primary: #3b3333;
            --color-secondary: #4d4d4d;
            --color-accent: #fefc8f;
            --color-text: #3b3333;
            --color-text-light: #756F63;
            --color-bg: #ffffff;
            --color-bg-light: #f7f7f7;
            --font-heading: 'Playfair Display', serif;
            --font-body: 'Open Sans', sans-serif;
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: var(--font-body);
            color: var(--color-text);
            line-height: 1.6;
            background-color: var(--color-bg);
        }}
        
        /* Header */
        header {{
            background-color: var(--color-bg);
            padding: 1.5rem 2rem;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            position: sticky;
            top: 0;
            z-index: 1000;
        }}
        
        nav {{
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        .logo img {{
            height: 61px;
            width: auto;
        }}
        
        .nav-links {{
            display: flex;
            gap: 2rem;
            list-style: none;
        }}
        
        .nav-links a {{
            color: var(--color-text);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s;
        }}
        
        .nav-links a:hover {{
            color: var(--color-secondary);
        }}
        
        /* Blog Post */
        .blog-container {{
            max-width: 900px;
            margin: 0 auto;
            padding: 3rem 2rem;
        }}
        
        .blog-header {{
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 2px solid var(--color-bg-light);
        }}
        
        .blog-title {{
            font-family: var(--font-heading);
            font-size: 2.5rem;
            color: var(--color-primary);
            margin-bottom: 1rem;
            line-height: 1.2;
        }}
        
        .blog-meta {{
            color: var(--color-text-light);
            font-size: 0.95rem;
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }}
        
        .blog-content {{
            font-size: 1.1rem;
            line-height: 1.8;
            color: var(--color-text);
        }}
        
        .blog-content h1,
        .blog-content h2,
        .blog-content h3,
        .blog-content h4 {{
            font-family: var(--font-heading);
            margin-top: 2rem;
            margin-bottom: 1rem;
            color: var(--color-primary);
        }}
        
        .blog-content h1 {{
            font-size: 2rem;
        }}
        
        .blog-content h2 {{
            font-size: 1.75rem;
        }}
        
        .blog-content h3 {{
            font-size: 1.5rem;
        }}
        
        .blog-content h4 {{
            font-size: 1.25rem;
        }}
        
        .blog-content p {{
            margin-bottom: 1.5rem;
        }}
        
        .blog-content img {{
            max-width: 100%;
            height: auto;
            margin: 2rem 0;
            border-radius: 8px;
            display: block;
        }}
        
        .blog-content a {{
            color: var(--color-secondary);
            text-decoration: underline;
        }}
        
        .blog-content a:hover {{
            color: var(--color-primary);
        }}
        
        .blog-content ul,
        .blog-content ol {{
            margin-left: 2rem;
            margin-bottom: 1.5rem;
        }}
        
        .blog-content li {{
            margin-bottom: 0.5rem;
        }}
        
        .blog-content blockquote {{
            border-left: 4px solid var(--color-secondary);
            padding-left: 1.5rem;
            margin: 2rem 0;
            font-style: italic;
            color: var(--color-text-light);
        }}
        
        .blog-content table {{
            width: 100%;
            border-collapse: collapse;
            margin: 2rem 0;
        }}
        
        .blog-content table th,
        .blog-content table td {{
            padding: 0.75rem;
            border: 1px solid var(--color-bg-light);
        }}
        
        .blog-content table th {{
            background-color: var(--color-bg-light);
            font-weight: 700;
        }}
        
        .back-link {{
            display: inline-block;
            margin-top: 3rem;
            color: var(--color-secondary);
            text-decoration: none;
            font-weight: 500;
        }}
        
        .back-link:hover {{
            color: var(--color-primary);
        }}
        
        @media (max-width: 768px) {{
            .blog-title {{
                font-size: 2rem;
            }}
            
            .blog-container {{
                padding: 2rem 1rem;
            }}
            
            .nav-links {{
                gap: 1rem;
                font-size: 0.9rem;
            }}
            
            .blog-content {{
                font-size: 1rem;
            }}
        }}
    </style>
</head>
<body>
    <header>
        <nav>
            <div class="logo">
                <a href="{relative_path}index.html">
                    <img src="{relative_path}assets/images/logo/agroverse-logo.jpeg" alt="Agroverse Logo">
                </a>
            </div>
            <ul class="nav-links">
                <li><a href="{relative_path}index.html">Home</a></li>
                <li><a href="{relative_path}index.html#mission">Mission</a></li>
                <li><a href="{relative_path}category/retail-packs/index.html">Products</a></li>
                <li><a href="{relative_path}farms/oscar-bahia/index.html">Farms</a></li>
                <li><a href="{relative_path}shipments/agl8/index.html">Shipments</a></li>
                <li><a href="{relative_path}index.html#contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    
    <main class="blog-container">
        <article class="blog-post">
            <header class="blog-header">
                <h1 class="blog-title">{title}</h1>
                <div class="blog-meta">
                    {f'<span>Published: {date_str}</span>' if date_str else ''}
                    <span>By {author}</span>
                </div>
            </header>
            
            <div class="blog-content">
                {content}
            </div>
            
            <a href="{relative_path}index.html" class="back-link">← Back to Home</a>
        </article>
    </main>
</body>
</html>"""
    
    return html

def main():
    """Process all blog posts."""
    # Create directories
    POSTS_DIR.mkdir(exist_ok=True)
    POST_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    
    # First, find all available blog files
    available_files = list(RAW_BLOGS_DIR.glob("*.html"))
    print(f"Found {len(available_files)} blog HTML files in raw/blogs/")
    print(f"Files: {[f.stem for f in available_files]}")
    print("=" * 60)
    
    processed = 0
    skipped = 0
    errors = []
    
    print("\nProcessing blog posts...")
    print("=" * 60)
    
    for url_slug, preferred_filename in URL_TO_FILENAME.items():
        print(f"\nProcessing: {url_slug}")
        
        # Find the blog file
        blog_file = find_blog_file(url_slug, preferred_filename)
        if not blog_file:
            print(f"  ⚠️  File not found for: {url_slug}")
            if preferred_filename:
                print(f"      Looking for: {preferred_filename}.html")
            skipped += 1
            continue
        
        print(f"  Found: {blog_file.name}")
        
        # Extract content
        blog_data = extract_blog_content(blog_file)
        if not blog_data:
            print(f"  ❌ Failed to extract content")
            skipped += 1
            errors.append(url_slug)
            continue
        
        print(f"  Title: {blog_data['title']}")
        print(f"  Author: {blog_data['author']}")
        if blog_data['published_date']:
            print(f"  Date: {blog_data['published_date'].strftime('%Y-%m-%d')}")
        
        # Create directory for this post
        post_dir = POSTS_DIR / url_slug
        post_dir.mkdir(exist_ok=True)
        
        # Generate HTML
        html_content = generate_blog_post_html(blog_data, url_slug)
        
        # Save HTML file
        output_file = post_dir / "index.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"  ✅ Created: {output_file.relative_to(BASE_DIR)}")
        processed += 1
    
    print("\n" + "=" * 60)
    print(f"Summary:")
    print(f"  ✅ Processed: {processed}")
    print(f"  ⚠️  Skipped: {skipped}")
    if errors:
        print(f"  ❌ Errors: {', '.join(errors)}")
    
    if skipped > 0:
        print(f"\n⚠️  Note: Some blog posts were not found.")
        print(f"   Make sure all blog post HTML files are saved in: {RAW_BLOGS_DIR}")

if __name__ == "__main__":
    main()

