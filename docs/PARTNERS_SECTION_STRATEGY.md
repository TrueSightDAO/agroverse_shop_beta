# Partners Section Strategy

## Overview
Create a dedicated partners section showcasing venue partners in USA, Brazil, and Switzerland where Agroverse cacao is available.

## URL Structure

### Main Partners Page
- **URL**: `/partners/index.html`
- **Purpose**: Listing page with all partners, grouped by location

### Individual Partner Pages
- **URL Pattern**: `/partners/{partner-slug}/index.html`
- **Examples**:
  - `/partners/block71-silicon-valley/index.html`
  - `/partners/edge-and-node-house-of-web3/index.html`
  - `/partners/green-gulch-farm-zen-center/index.html`
  - etc.

## Partner List (from downloaded files)

### USA Partners
1. Block71 Silicon Valley
2. Edge and Node, House of Web3
3. Embodied Blindfold Dance
4. Founder Haus
5. Go Ask Alice
6. Green Gulch Farm Zen Center
7. Hacker Dojo
8. Heierling Ski
9. Kiki's Cocoa
10. Love Wisdom Power
11. Love of Ganesha
12. Miss Tomato
13. Peace on Fifth
14. Prism Percussions
15. Queen Hippie Gypsy
16. Republic Cafe and Ming Lounge
17. Sacred Earth Farms
18. Soulfulness Breathe
19. The Enchanted Forest Boutique
20. The Ponderosa, Slab City

### Brazil Partners
(To be determined from content extraction)

### Switzerland Partners
(To be determined from content extraction)

## Implementation Plan

### Phase 1: Main Partners Page
1. Create `/partners/index.html`
2. Design with location-based sections (USA, Brazil, Switzerland)
3. Grid layout showing partner cards with:
   - Partner name
   - Location
   - Partner image/logo
   - Brief description
   - Link to individual partner page
4. Add to main navigation menu

### Phase 2: Individual Partner Pages
1. Extract content from downloaded HTML files
2. Create template for partner pages with:
   - Partner name and logo
   - Location and address
   - Description
   - Contact information
   - Images/gallery
   - Link back to partners listing
3. Create all individual partner pages

### Phase 3: Navigation Integration
1. Add "Partners" to main navigation
2. Add to footer navigation
3. Consider adding a "Find Us" or "Where to Buy" section on main page

## Design Considerations

### Partner Card Design
- Consistent with existing card designs (farmer cards, shipment cards)
- Include:
  - Partner image/logo
  - Partner name
  - Location (city, state/country)
  - Brief tagline or description
  - "Learn More" link

### Location Grouping
- Use tabs or sections for USA, Brazil, Switzerland
- Or use filter buttons
- Or simple section headers with grid layout

### Individual Partner Page
- Hero section with partner name and location
- Partner story/description
- Contact information
- Images/gallery
- Map (if address available)
- Link to partner's website (if available)

## Content Extraction

From the downloaded HTML files, extract:
- Partner name
- Description/bio
- Location details
- Contact information
- Images/logos
- Any special features or offerings

## Next Steps

1. Review downloaded HTML files to extract partner information
2. Create main partners listing page
3. Create individual partner page template
4. Generate all partner pages
5. Add navigation links
6. Test and refine

