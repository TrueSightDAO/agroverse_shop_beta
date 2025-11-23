# Meet Our Farmers Section - Simplification Strategy

## Current Structure (Multi-Level)
Each farmer card has:
1. **Primary link**: "View AGL14 Shipment" → Goes to shipment page
2. **Secondary link**: "View Full Ledger →" → Goes to TrueSight DAO

**Problem:**
- Two competing calls-to-action
- User has to choose between shipment and ledger
- Creates decision fatigue
- Not clear what the primary action is

## Proposed Structure (One Level)

### Option 1: Farm Page as Primary Destination (Recommended)
**If we create farm pages:**
- Make the **entire farmer card clickable** → Links to farm page
- Farm page shows: story, all shipments, all products, ledger link
- Single, clear call-to-action: "Learn More" or just make card clickable

**Benefits:**
- ✅ One clear destination
- ✅ Farm page becomes hub for all related content
- ✅ Cleaner, less cluttered cards
- ✅ Better storytelling (full story on farm page)
- ✅ Users can explore from farm page

**Visual:**
```
┌─────────────────────────┐
│   [Farmer Image]        │
│                         │
│   Oscar                 │
│   Bahia, Brazil         │
│                         │
│   [Story excerpt...]    │
│                         │
│   🌳 Highlights         │
│                         │
│   [Entire card links    │
│    to farm page]        │
└─────────────────────────┘
```

### Option 2: Shipment Page as Primary (If No Farm Pages)
- Make the **entire farmer card clickable** → Links to most recent/featured shipment
- Remove secondary ledger link from card
- Ledger link available on shipment page

**Benefits:**
- ✅ Still one level
- ✅ Direct to actionable content (shipment)
- ✅ Simpler than current

### Option 3: Keep Current But Simplify
- Single primary link: "View Farm Profile" or "Explore Shipments"
- Remove secondary link from card
- Show ledger link on destination page

## Recommendation: Option 1 (Farm Pages)

**Why:**
1. **Better Storytelling**: Farm pages allow full narrative
2. **Central Hub**: All related content in one place
3. **Future-Proof**: Easy to add more shipments/products
4. **SEO**: Rich content pages
5. **User Journey**: Natural flow from farmer → farm → shipments/products

**Implementation:**
1. Create farm pages for top 3 farmers (Oscar, Paulo, Vivi)
2. Make farmer cards clickable (entire card or prominent CTA)
3. Remove secondary links from cards
4. Farm pages include:
   - Full story
   - All shipments from that farm
   - All products from that farm
   - Link to TrueSight DAO ledger

**Card Structure:**
```html
<a href="/farms/oscar-bahia/index.html" class="farmer-card">
  <div class="farmer-image-container">...</div>
  <div class="farmer-card-content">
    <div class="farmer-name">Oscar</div>
    <div class="farmer-location">Bahia, Brazil</div>
    <div class="farmer-story">[Excerpt]</div>
    <div class="farmer-highlight">🌳 Highlights</div>
    <div class="farmer-cta">Learn More →</div>
  </div>
</a>
```

## Alternative: Keep Simple Without Farm Pages

If we don't create farm pages yet:
- Make entire card link to **most recent shipment**
- Remove secondary ledger link
- Add "View All Shipments" link in shipments section instead

**Card Structure:**
```html
<a href="/shipments/agl14/index.html" class="farmer-card">
  <!-- Same content -->
  <div class="farmer-cta">View Latest Shipment →</div>
</a>
```

## Visual Comparison

### Current (Multi-Level)
```
Farmer Card
├── View AGL14 Shipment → (Primary)
└── View Full Ledger → (Secondary)
```

### Proposed (One Level)
```
Farmer Card (Clickable)
└── Entire card → Farm Page
    ├── Full Story
    ├── All Shipments
    ├── All Products
    └── Link to Ledger
```

## Next Steps

1. **Decision**: Create farm pages or simplify to shipment links?
2. **If farm pages**: Create top 3 farm pages first
3. **Update cards**: Make clickable, remove secondary links
4. **Test UX**: Ensure clear call-to-action

