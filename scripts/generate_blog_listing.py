#!/usr/bin/env python3
"""
Generate a blog listing page from all existing blog posts.
"""

import os
import re
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import urlparse

BASE_DIR = Path(__file__).parent.parent
POSTS_DIR = BASE_DIR / "post"
BLOG_DIR = BASE_DIR / "blog"

def extract_blog_metadata(post_dir):
    """Extract metadata from a blog post HTML file."""
    index_file = post_dir / "index.html"
    if not index_file.exists():
        return None
    
    try:
        with open(index_file, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
    except Exception as e:
        print(f"Error reading {index_file}: {e}")
        return None
    
    # Extract title
    title_tag = soup.find('title')
    title = title_tag.string.strip() if title_tag else 'Untitled'
    # Remove " | Agroverse" suffix
    title = re.sub(r'\s*\|\s*Agroverse\s*$', '', title)
    
    # Extract description
    meta_desc = soup.find('meta', {'name': 'description'}) or soup.find('meta', property='og:description')
    description = meta_desc.get('content', '') if meta_desc else ''
    # Truncate description
    if len(description) > 150:
        description = description[:147] + '...'
    
    # Extract published date
    pub_date_tag = soup.find('meta', property='article:published_time')
    published_date = None
    if pub_date_tag:
        pub_date_str = pub_date_tag.get('content', '')
        try:
            published_date = datetime.fromisoformat(pub_date_str.replace('Z', '+00:00'))
        except:
            pass
    
    # Extract author
    author_tag = soup.find('meta', property='article:author')
    author = author_tag.get('content', 'Agroverse Team') if author_tag else 'Agroverse Team'
    
    # Extract slug from directory name
    slug = post_dir.name
    
    # Try to find featured image
    og_image = soup.find('meta', property='og:image')
    featured_image = og_image.get('content', '') if og_image else ''
    
    return {
        'title': title,
        'description': description,
        'published_date': published_date,
        'author': author,
        'slug': slug,
        'featured_image': featured_image,
        'url': f'/post/{slug}/'
    }

def generate_blog_listing_html(posts):
    """Generate the blog listing page HTML."""
    # Sort posts by date (newest first)
    posts_sorted = sorted(
        [p for p in posts if p and p.get('published_date')],
        key=lambda x: x['published_date'],
        reverse=True
    )
    # Add posts without dates at the end
    posts_sorted.extend([p for p in posts if p and not p.get('published_date')])
    
    # Generate post cards HTML
    post_cards_html = ''
    for post in posts_sorted:
        date_str = ''
        if post.get('published_date'):
            date_str = post['published_date'].strftime('%B %d, %Y')
        
        featured_image_html = ''
        if post.get('featured_image'):
            featured_image_html = f'<img src="{post["featured_image"]}" alt="{post["title"]}" class="blog-card-image">'
        else:
            # Use placeholder
            featured_image_html = '<div class="blog-card-image-placeholder">📝</div>'
        
        post_cards_html += f'''
            <article class="blog-card">
                <a href="{post["url"]}" class="blog-card-link">
                    <div class="blog-card-image-container">
                        {featured_image_html}
                    </div>
                    <div class="blog-card-content">
                        <h2 class="blog-card-title">{post["title"]}</h2>
                        <p class="blog-card-description">{post["description"]}</p>
                        <div class="blog-card-meta">
                            {f'<span class="blog-card-date">{date_str}</span>' if date_str else ''}
                            <span class="blog-card-author">By {post["author"]}</span>
                        </div>
                    </div>
                </a>
            </article>
        '''
    
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    
    <!-- SEO Meta Tags -->
    <title>Blog | Agroverse</title>
    <meta name="description" content="Read stories about regenerative cacao farming, Amazon rainforest conservation, and our community of farmers.">
    <link rel="canonical" href="https://www.agroverse.shop/blog/">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.agroverse.shop/blog/">
    <meta property="og:title" content="Blog | Agroverse">
    <meta property="og:description" content="Read stories about regenerative cacao farming, Amazon rainforest conservation, and our community of farmers.">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://www.agroverse.shop/blog/">
    <meta property="twitter:title" content="Blog | Agroverse">
    <meta property="twitter:description" content="Read stories about regenerative cacao farming, Amazon rainforest conservation, and our community of farmers.">
    
    <!-- Favicon -->
    <link rel="icon" type="image/jpeg" href="../assets/images/logo/agroverse-logo.jpeg">
    
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
        
        /* Blog Hero */
        .blog-hero {{
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
            color: white;
            padding: 5rem 2rem;
            text-align: center;
        }}
        
        .blog-hero h1 {{
            font-family: var(--font-heading);
            font-size: 3.5rem;
            margin-bottom: 1rem;
        }}
        
        .blog-hero p {{
            font-size: 1.25rem;
            opacity: 0.9;
            max-width: 600px;
            margin: 0 auto;
        }}
        
        /* Blog Grid */
        .blog-container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 4rem 2rem;
        }}
        
        .blog-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }}
        
        .blog-card {{
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s, box-shadow 0.3s;
        }}
        
        .blog-card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }}
        
        .blog-card-link {{
            text-decoration: none;
            color: inherit;
            display: block;
        }}
        
        .blog-card-image-container {{
            width: 100%;
            height: 200px;
            overflow: hidden;
            background-color: var(--color-bg-light);
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        
        .blog-card-image {{
            width: 100%;
            height: 100%;
            object-fit: cover;
        }}
        
        .blog-card-image-placeholder {{
            font-size: 4rem;
            opacity: 0.3;
        }}
        
        .blog-card-content {{
            padding: 1.5rem;
        }}
        
        .blog-card-title {{
            font-family: var(--font-heading);
            font-size: 1.5rem;
            color: var(--color-primary);
            margin-bottom: 0.75rem;
            line-height: 1.3;
        }}
        
        .blog-card-description {{
            color: var(--color-text-light);
            font-size: 0.95rem;
            margin-bottom: 1rem;
            line-height: 1.5;
        }}
        
        .blog-card-meta {{
            display: flex;
            gap: 1rem;
            font-size: 0.85rem;
            color: var(--color-text-light);
            flex-wrap: wrap;
        }}
        
        .blog-card-date {{
            font-weight: 500;
        }}
        
        .blog-card-author {{
            opacity: 0.8;
        }}
        
        @media (max-width: 768px) {{
            .blog-hero h1 {{
                font-size: 2.5rem;
            }}
            
            .blog-grid {{
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }}
            
            .nav-links {{
                gap: 1rem;
                font-size: 0.9rem;
            }}
        }}
    </style>
    
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-S6EP25EHF4"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){{dataLayer.push(arguments);}}
      gtag('js', new Date());

      gtag('config', 'G-S6EP25EHF4');
    </script>
</head>
<body>
    <header>
        <nav>
            <div class="logo">
                <a href="../index.html">
                    <img src="../assets/images/logo/agroverse-logo.jpeg" alt="Agroverse Logo">
                </a>
            </div>
            <ul class="nav-links">
                <li><a href="../index.html">Home</a></li>
                <li><a href="../index.html#mission">Mission</a></li>
                <li><a href="../category/retail-packs/index.html">Products</a></li>
                <li><a href="../farms/oscar-bahia/index.html">Farms</a></li>
                <li><a href="../shipments/agl8/index.html">Shipments</a></li>
                <li><a href="../blog/">Blog</a></li>
                <li><a href="../partners/index.html">Partners</a></li>
                <li><a href="../index.html#gatherings">Gatherings</a></li>
                <li><a href="mailto:community@agroverse.shop">Contact</a></li>
            </ul>
        </nav>
    </header>
    
    <section class="blog-hero">
        <h1>Our Blog</h1>
        <p>Stories about regenerative cacao farming, Amazon rainforest conservation, and our community of farmers</p>
    </section>
    
    <main class="blog-container">
        <div class="blog-grid">
            {post_cards_html}
        </div>
    </main>
</body>
</html>'''
    
    return html

def main():
    """Generate blog listing page."""
    # Create blog directory
    BLOG_DIR.mkdir(exist_ok=True)
    
    if not POSTS_DIR.exists():
        print("❌ Posts directory not found!")
        return
    
    # Find all blog posts
    posts = []
    for post_dir in POSTS_DIR.iterdir():
        if post_dir.is_dir():
            metadata = extract_blog_metadata(post_dir)
            if metadata:
                posts.append(metadata)
                print(f"✅ Found: {metadata['title']}")
    
    if not posts:
        print("❌ No blog posts found!")
        return
    
    # Generate HTML
    html_content = generate_blog_listing_html(posts)
    
    # Save to blog/index.html
    output_file = BLOG_DIR / "index.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"\n✅ Created blog listing page: {output_file.relative_to(BASE_DIR)}")
    print(f"   Found {len(posts)} blog posts")

if __name__ == "__main__":
    main()


