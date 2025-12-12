#!/usr/bin/env python3
"""
Generate event pages for community gatherings from raw HTML files
"""
import os
import re
from pathlib import Path
from html import unescape

# Manual RSVP URL mapping (from user's provided URLs)
RSVP_URL_MAPPING = {
    "cacao-circle-at-okanogan-fall-barter-faire-2025": "https://lu.ma/32vl9dbd",
    "cacao-circle-at-okanogan-family-faire-spring-barter-faire-2025": "https://www.eventbrite.com/e/northwest-nomads-2024-tickets-858149928537",
    "cacao-circle-at-create-the-future-summit-2025": "https://lu.ma/createthefuture",
}

# URL slugs from user
URL_SLUGS = [
    "agroverse-cacao-circle-ai-web3-founders-mixer-regenerating-the-amazon-with-tech-visionaries",
    "agroverse-cacao-circle-regenerating-the-amazon-rainforest-with-the-underdog-founders",
    "cacao-circle-at-okanogan-fall-barter-faire-2025",
    "one-cacao-at-a-time-geopolitics-your-craft",
    "cacao-circle-at-create-the-future-summit-2025",
    "under-the-seven-sistars-cacao-circle",
    "cacao-circle-at-mings-lounge",
    "cacao-circle-at-soha-summer-festiva",
    "mantra-fire-cacao-circle-with-hudost",
    "cacao-circle-at-regen-house-in-london-on-climate-action-week-2025",
    "agroverse-cacao-circle-at-rebel-market-outpost",
    "agroverse-cacao-circle-at-better-daze-festival-2025",
    "cacao-circle-at-wesfest-25",
    "cacao-circle-at-8th-annual-burning-cow-bart",
    "cacao-circle-at-okanogan-family-faire-spring-barter-faire-2025",
    "sacred-cacao-circle-heart-opening-townhall",
    "cacao-circle-anchoring-resilience-with-agroverse",
    "agroverse-sip-savor-restore-with-sustainable-cacao-at-sf-climate-week-sonoma-county",
    "cacao-circle-grounding-growth-with-agroverse",
    "agroverse-cacao-circle-a-heart-centering-experience",
    "cacao-circle-at-orbis86-ai-x-web3-in-gaming-happy-hour-gdc",
    "cacao-circle-at-eth-sf-after-hours-with-crypto-underground-x-stand-with-crypto-cali-tour",
    "join-our-cacao-circle-at-orbis86-eth-sf-the-future-of-tech-ai-x-web3",
    "cacao-circle-at-edge-and-node-hard-crypto-bridging-physical-digital-worlds-co-creator-spotlight",
    "cacao-circle-at-the-social-innovation-hub-uplifting-minds-and-hearts-with-regenerative-cacao",
    "cacao-circle-at-the-climate-hub-savoring-sustainability-from-the-amazon-rainforest",
    "cacao-circle-at-better-daze-festival-2024",
    "web3-holiday-food-drive",
    "halloweekend-free-entrance"
]

def extract_from_html(file_path):
    """Extract title, description, dates, location, and images from HTML file"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(500000)
        
        data = {
            'title': None,
            'description': None,
            'og_title': None,
            'og_description': None,
            'og_image': None,
            'header_image': None,
            'date': None,
            'location': None,
            'rsvp_url': None
        }
        
        # Extract title
        title_match = re.search(r'<title>(.*?)\s*\|\s*Agroverse</title>', content, re.DOTALL)
        if title_match:
            data['title'] = unescape(title_match.group(1).strip())
        
        # Extract description
        desc_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', content, re.DOTALL)
        if desc_match:
            data['description'] = unescape(desc_match.group(1).strip())
        
        # Extract OG title
        og_title_match = re.search(r'<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']', content, re.DOTALL)
        if og_title_match:
            data['og_title'] = unescape(og_title_match.group(1).strip())
        
        # Extract OG description
        og_desc_match = re.search(r'<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']', content, re.DOTALL)
        if og_desc_match:
            data['og_description'] = unescape(og_desc_match.group(1).strip())
        
        # Extract OG image
        og_image_match = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']', content)
        if og_image_match:
            data['og_image'] = og_image_match.group(1).strip()
            data['header_image'] = data['og_image']  # Use OG image as header
        
        # Look for structured data (JSON-LD)
        json_ld_match = re.search(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', content, re.DOTALL)
        if json_ld_match:
            try:
                import json
                json_data = json.loads(json_ld_match.group(1))
                if isinstance(json_data, dict):
                    if 'startDate' in json_data:
                        data['date'] = json_data['startDate']
                    if 'location' in json_data:
                        if isinstance(json_data['location'], dict):
                            if 'name' in json_data['location']:
                                data['location'] = json_data['location']['name']
                            elif 'address' in json_data['location']:
                                if isinstance(json_data['location']['address'], dict):
                                    addr_parts = []
                                    for key in ['streetAddress', 'addressLocality', 'addressRegion']:
                                        if key in json_data['location']['address']:
                                            addr_parts.append(json_data['location']['address'][key])
                                    if addr_parts:
                                        data['location'] = ', '.join(addr_parts)
            except:
                pass
        
        # Look for date patterns in text content
        if not data['date']:
            date_patterns = [
                r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',
                r'\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}',
            ]
            for pattern in date_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                if matches:
                    data['date'] = matches[0] if isinstance(matches[0], str) else ' '.join(matches[0])
                    break
        
        # Look for location in text
        if not data['location']:
            location_match = re.search(r'(?:at|in)\s+([A-Z][a-zA-Z\s&]+(?:,\s*[A-Z][a-zA-Z\s]+)?)', content)
            if location_match:
                data['location'] = location_match.group(1).strip()
        
        # Look for large images if no header image found
        if not data['header_image']:
            images = re.findall(r'https?://[^"\'>\s]+wixstatic[^"\'>\s]+(?:jpg|jpeg|png|webp|avif)', content)
            if images:
                large_images = [img for img in images if any(size in img for size in ['w_', 'h_', 'fill'])]
                if large_images:
                    data['header_image'] = large_images[0]
                elif images:
                    data['header_image'] = images[0]
        
        # Extract RSVP URL
        # Look for Eventbrite
        eventbrite = re.findall(r'https?://[^"\'>\s]*eventbrite[^"\'>\s]*', content)
        if eventbrite:
            data['rsvp_url'] = eventbrite[0]
        
        # Look for Luma
        if not data['rsvp_url']:
            luma = re.findall(r'https?://[^"\'>\s]*lu\.ma/[^"\'>\s]*', content)
            if luma:
                data['rsvp_url'] = luma[0]
        
        # Look in JSON-LD for event URL
        if not data['rsvp_url'] and json_ld_match:
            try:
                import json
                json_data = json.loads(json_ld_match.group(1))
                if isinstance(json_data, dict):
                    if 'url' in json_data:
                        url = json_data['url']
                        if any(domain in url for domain in ['eventbrite', 'lu.ma', 'ticket', 'register']):
                            data['rsvp_url'] = url
            except:
                pass
        
        # Set defaults
        if not data['title']:
            data['title'] = 'Cacao Circle Event'
        if not data['description']:
            data['description'] = 'Join us for a regenerative cacao circle experience.'
        if not data['og_title']:
            data['og_title'] = data['title']
        if not data['og_description']:
            data['og_description'] = data['description']
        if not data['og_image']:
            data['og_image'] = 'https://www.agroverse.shop/assets/images/hero/cacao-circles.jpg'
        if not data['header_image']:
            data['header_image'] = data['og_image']
        
        return data
    except Exception as e:
        print(f"Error extracting from {file_path}: {e}")
        return None

def find_matching_html(url_slug):
    """Find matching HTML file for a URL slug"""
    gatherings_dir = Path('assets/raw/gatherings')
    html_files = list(gatherings_dir.glob('*.html'))
    
    # Extract keywords from slug
    keywords = url_slug.replace('-', ' ').split()
    
    best_match = None
    best_score = 0
    
    for html_file in html_files:
        filename_lower = html_file.stem.lower()
        score = sum(1 for keyword in keywords if keyword.lower() in filename_lower)
        if score > best_score and score >= 2:  # Require at least 2 keyword matches
            best_score = score
            best_match = html_file
    
    return best_match

def format_date(date_str):
    """Format ISO date string to readable format"""
    if not date_str:
        return None
    try:
        from datetime import datetime
        # Try parsing ISO format
        if 'T' in date_str:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.strftime('%B %d, %Y at %I:%M %p')
        else:
            return date_str
    except:
        return date_str

def is_past_event(date_str):
    """Check if event date is in the past"""
    if not date_str:
        return False
    try:
        from datetime import datetime
        # Try parsing ISO format
        if 'T' in date_str:
            event_dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return event_dt < datetime.now(event_dt.tzinfo if event_dt.tzinfo else None)
        return False
    except:
        return False

def generate_event_page(event_data):
    """Generate HTML for an event page"""
    slug = event_data['slug']
    title = event_data['title']
    description = event_data['description']
    og_title = event_data['og_title']
    og_description = event_data['og_description']
    og_image = event_data['og_image']
    header_image = event_data.get('header_image', og_image)
    date = format_date(event_data.get('date'))
    location = event_data.get('location')
    raw_date = event_data.get('date')
    is_past = is_past_event(raw_date) if raw_date else False
    rsvp_url = None if is_past else (event_data.get('rsvp_url') or RSVP_URL_MAPPING.get(slug))
    
    # Calculate relative path depth (event-details-registration is 2 levels deep)
    depth = '../../'
    
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    
    <!-- SEO Meta Tags -->
    <title>{title} | Agroverse</title>
    <meta name="description" content="{description}">
    <link rel="canonical" href="https://www.agroverse.shop/event-details-registration/{slug}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.agroverse.shop/event-details-registration/{slug}">
    <meta property="og:title" content="{og_title} | Agroverse">
    <meta property="og:description" content="{og_description}">
    <meta property="og:image" content="{og_image}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://www.agroverse.shop/event-details-registration/{slug}">
    <meta property="twitter:title" content="{og_title} | Agroverse">
    <meta property="twitter:description" content="{og_description}">
    <meta property="twitter:image" content="{og_image}">
    
    <!-- Favicon -->
    <link rel="icon" type="image/jpeg" href="{depth}assets/images/logo/agroverse-logo.jpeg">
    
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
        
        /* Hero Section */
        .event-hero {{
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
            color: white;
            padding: 3rem 2rem;
            text-align: center;
        }}
        
        .event-poster-container {{
            max-width: 800px;
            margin: 2rem auto;
            background-color: #f7f7f7;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }}
        
        .event-poster-image {{
            width: 100%;
            height: auto;
            display: block;
            object-fit: contain;
        }}
        
        .event-hero-content {{
            margin-top: 2rem;
        }}
        
        .event-meta {{
            display: flex;
            gap: 2rem;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 1.5rem;
            font-size: 1.1rem;
        }}
        
        .event-meta-item {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}
        
        .event-hero h1 {{
            font-family: var(--font-heading);
            font-size: 3rem;
            margin-bottom: 1.5rem;
            line-height: 1.2;
        }}
        
        .event-hero p {{
            font-size: 1.25rem;
            max-width: 800px;
            opacity: 0.95;
        }}
        
        /* Content Section */
        .event-content {{
            max-width: 900px;
            margin: 4rem auto;
            padding: 0 2rem;
        }}
        
        .event-description {{
            font-size: 1.125rem;
            line-height: 1.8;
            color: var(--color-text);
            margin-bottom: 3rem;
        }}
        
        .event-cta {{
            text-align: center;
            margin: 3rem 0;
        }}
        
        .cta-button {{
            display: inline-block;
            padding: 1.25rem 3rem;
            background-color: var(--color-primary);
            color: white;
            text-decoration: none;
            font-weight: 700;
            font-size: 1.2rem;
            border-radius: 8px;
            transition: transform 0.3s, box-shadow 0.3s, background-color 0.3s;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }}
        
        .cta-button:hover {{
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
            background-color: var(--color-secondary);
        }}
        
        /* Footer */
        footer {{
            background-color: var(--color-primary);
            color: white;
            padding: 3rem 2rem;
            text-align: center;
        }}
        
        .footer-content {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        
        .footer-links {{
            display: flex;
            justify-content: center;
            gap: 2rem;
            list-style: none;
            margin: 1.5rem 0;
            flex-wrap: wrap;
        }}
        
        .footer-links a {{
            color: white;
            text-decoration: none;
        }}
        
        .footer-links a:hover {{
            text-decoration: underline;
        }}
        
        @media (max-width: 768px) {{
            .event-hero h1 {{
                font-size: 2rem;
            }}
            
            .event-hero p {{
                font-size: 1rem;
            }}
            
            .nav-links {{
                flex-direction: column;
                gap: 1rem;
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
            <a href="{depth}index.html" class="logo">
                <img src="{depth}assets/images/logo/agroverse-logo.jpeg" alt="Agroverse Logo">
            </a>
            <ul class="nav-links">
                <li><a href="{depth}index.html#home">Home</a></li>
                <li><a href="{depth}index.html#mission">Mission</a></li>
                <li><a href="{depth}index.html#products">Products</a></li>
                <li><a href="{depth}index.html#farmers">Farms</a></li>
                <li><a href="{depth}index.html#shipments">Shipments</a></li>
                <li><a href="{depth}partners/index.html">Partners</a></li>
                <li><a href="mailto:community@agroverse.shop">Contact</a></li>
            </ul>
        </nav>
    </header>
    
    <section class="event-hero">
        {f'<div class="event-poster-container"><img src="{header_image}" alt="{title}" class="event-poster-image"></div>' if header_image else ''}
        <div class="event-hero-content">
            <h1>{title}</h1>
            <p>{description}</p>
            <div class="event-meta">
                {f'<div class="event-meta-item"><span>📅</span> <span>{date}</span></div>' if date else ''}
                {f'<div class="event-meta-item"><span>📍</span> <span>{location}</span></div>' if location else ''}
            </div>
        </div>
    </section>
    
    <section class="event-content">
        <div class="event-description">
            <p>{description}</p>
            <p style="margin-top: 1.5rem;">Join us for a regenerative cacao circle experience that connects community, supports Amazon rainforest restoration, and celebrates mindful connection through ethically-sourced cacao from small farmers' agroforestry.</p>
        </div>
        
        <div class="event-cta">
            {f'<a href="{rsvp_url}" target="_blank" rel="noopener noreferrer" class="cta-button">Register for This Event</a>' if rsvp_url else (f'<p style="color: var(--color-text-light); font-style: italic;">This event has passed. Thank you for being part of our community!</p>' if is_past else f'<a href="mailto:community@agroverse.shop?subject=Registration for {title}" class="cta-button">Contact Us About This Event</a>')}
        </div>
    </section>
    
    <footer>
        <div class="footer-content">
            <h3 style="font-family: var(--font-heading); font-size: 2rem; margin-bottom: 1rem;">Agroverse</h3>
            <p>Regenerating our Amazon rainforest, One Cacao at a time</p>
            <p>Phone: <a href="tel:4153000019" style="color: white;">415-300-0019</a></p>
            <ul class="footer-links">
                <li><a href="{depth}index.html#home">Home</a></li>
                <li><a href="{depth}index.html#mission">Mission</a></li>
                <li><a href="{depth}index.html#products">Products</a></li>
                <li><a href="{depth}index.html#farmers">Farms</a></li>
                <li><a href="{depth}index.html#shipments">Shipments</a></li>
                <li><a href="{depth}partners/index.html">Partners</a></li>
                <li><a href="mailto:community@agroverse.shop">Contact</a></li>
            </ul>
            <p style="margin-top: 2rem; opacity: 0.8; font-size: 0.9rem;">&copy; 2024 Agroverse. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>'''
    
    return html

def main():
    """Main function to generate all event pages"""
    base_dir = Path('event-details-registration')
    base_dir.mkdir(exist_ok=True)
    
    events_created = 0
    
    for url_slug in URL_SLUGS:
        # Find matching HTML file
        matching_file = find_matching_html(url_slug)
        
        if matching_file:
            event_data = extract_from_html(matching_file)
            if not event_data:
                # Use defaults
                event_data = {
                    'slug': url_slug,
                    'title': url_slug.replace('-', ' ').title(),
                    'description': 'Join us for a regenerative cacao circle experience.',
                    'og_title': url_slug.replace('-', ' ').title(),
                    'og_description': 'Join us for a regenerative cacao circle experience.',
                    'og_image': 'https://www.agroverse.shop/assets/images/hero/cacao-circles.jpg'
                }
        else:
            # Use defaults
            event_data = {
                'slug': url_slug,
                'title': url_slug.replace('-', ' ').title(),
                'description': 'Join us for a regenerative cacao circle experience.',
                'og_title': url_slug.replace('-', ' ').title(),
                'og_description': 'Join us for a regenerative cacao circle experience.',
                'og_image': 'https://www.agroverse.shop/assets/images/hero/cacao-circles.jpg'
            }
        
        event_data['slug'] = url_slug
        
        # Create directory for this event
        event_dir = base_dir / url_slug
        event_dir.mkdir(exist_ok=True)
        
        # Generate HTML
        html_content = generate_event_page(event_data)
        
        # Write file
        output_file = event_dir / 'index.html'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        events_created += 1
        print(f"✅ Created {url_slug}")
    
    print(f"\n✅ Created {events_created} event pages")

if __name__ == '__main__':
    main()

