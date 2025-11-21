# Top-Level Navigation: Shipments vs Farms

## Current State
- **Top Navigation**: Home, Mission, Products, **Shipments**, Contact
- **"Meet Our Farmers" Section**: Links to farm pages
- **"Our Shipments" Section**: Shows recent shipments

## Analysis: Shipments vs Farms as Top-Level Nav

### Option A: Shipments (Current)
**Pros:**
- ✅ **Direct for QR Code Scanners**: Primary use case - users scan QR code and land on shipment page
- ✅ **Action-Oriented**: Shows current activity, status, traceability
- ✅ **Transactional**: Better for customers who want specific shipment details
- ✅ **Granular**: More specific information per page
- ✅ **Status-Driven**: Easy to see what's happening now (MANUFACTURING, SALES IN PROGRESS, etc.)

**Cons:**
- ❌ **Less Emotional**: More technical/business-focused
- ❌ **Overwhelming**: Many shipments can feel cluttered
- ❌ **Less Storytelling**: Focuses on logistics over relationships
- ❌ **Less Brand-Building**: Doesn't emphasize the human/farm story

### Option B: Farms (Recommended)
**Pros:**
- ✅ **Storytelling**: Emphasizes relationships, values, regenerative practices
- ✅ **Brand-Building**: More emotional connection, unique differentiator
- ✅ **Less Overwhelming**: Fewer farms than shipments (3-7 farms vs 11+ shipments)
- ✅ **Better Discovery**: Users can explore all related content from one place
- ✅ **SEO-Friendly**: Rich content pages with farm stories
- ✅ **Human-Centered**: Puts farmers and their stories first
- ✅ **Scalable**: Easy to add new shipments to existing farms

**Cons:**
- ❌ **One More Click**: QR code scanners need to go Farm → Shipment
- ❌ **Less Direct**: Not as immediately actionable

### Option C: Hybrid Approach (Best of Both)
**Top Navigation:**
- Home
- Mission
- Products
- **Farms** (primary)
- **Shipments** (secondary, or in dropdown)
- Contact

**Rationale:**
- Farms = Primary discovery and storytelling
- Shipments = Secondary for direct access and QR code scanners
- Both accessible, but farms prioritized

## Recommendation: **Farms as Primary, Shipments as Secondary**

### Why Farms Should Be Top-Level:

1. **Brand Differentiation**
   - Your unique value is the farm relationships and stories
   - Competitors have products; you have farmer stories
   - Farms = your brand identity

2. **User Journey Priority**
   - **New Visitors**: Want to learn about farms, values, story
   - **QR Code Scanners**: Can still access shipments (via farm page or direct URL)
   - **Returning Customers**: May want to explore new farms or check farm updates

3. **Information Architecture**
   - Farms are the **parent** concept
   - Shipments are **children** of farms
   - Products are **children** of farms
   - Makes logical sense: Farm → Shipments → Products

4. **Scalability**
   - As you add shipments, farms stay stable
   - Farm pages can grow organically
   - Shipments section would become unwieldy with 20+ shipments

5. **SEO & Content**
   - Farm pages = rich, unique content
   - Better for search rankings
   - More shareable (farm stories vs shipment logistics)

### Proposed Navigation Structure:

```
Top Navigation:
├── Home
├── Mission
├── Products
├── Farms ⭐ (Primary)
├── Shipments (Secondary, or in dropdown)
└── Contact
```

**Alternative: Farms with Shipments Dropdown**
```
Top Navigation:
├── Home
├── Mission
├── Products
├── Farms
│   ├── All Farms
│   ├── Oscar's Farm
│   ├── Paulo's Farm
│   ├── Vivi's Farm
│   └── Shipments (link to shipments section)
└── Contact
```

### QR Code Scanner Flow:

**Current (Shipments top-level):**
```
QR Code → Shipment Page ✅ (direct)
```

**Proposed (Farms top-level):**
```
QR Code → Shipment Page ✅ (still direct via URL)
OR
QR Code → Shipment Page → "View Farm Profile" → Farm Page
```

**Note**: QR codes can still link directly to shipment pages regardless of nav structure!

## Implementation Recommendation

### Primary Navigation:
- **Farms** (top-level)
  - Shows all farms
  - Each farm page shows all shipments + products
  - Better for discovery and storytelling

### Secondary Access:
- **Shipments** (in footer or secondary nav)
  - Direct link to shipments section on main page
  - Or keep in top nav but less prominent
  - Or add to "Farms" dropdown menu

### User Flows:

**New Visitor:**
```
Home → Farms → Farm Page → Shipments/Products
```

**QR Code Scanner:**
```
QR Code → Shipment Page (direct URL, nav doesn't matter)
```

**Returning Customer:**
```
Home → Farms → Check favorite farm → See new shipments
```

## Final Recommendation

**Make "Farms" the top-level navigation** because:
1. It's your brand differentiator
2. Better for storytelling and emotional connection
3. More scalable as you grow
4. Better information architecture (parent → children)
5. QR code scanners aren't affected (direct URLs)

**Keep "Shipments" accessible** via:
- Footer link
- "Our Shipments" section on main page
- Or as secondary nav item (less prominent)

This prioritizes your unique value (farm relationships) while maintaining access to all functionality.

