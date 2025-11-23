# Shipment Status & Farm Pages Strategy

## 1. Dynamic Shipment Status from Google Sheet

### Current State
- Shipment status is **hardcoded** in HTML (e.g., "MANUFACTURING", "SALES IN PROGRESS", "COMPLETED")
- Status needs to be fetched dynamically from Google Sheet: `https://docs.google.com/spreadsheets/d/1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU/edit?gid=483234653`

### Implementation Plan

#### A. Google Apps Script Extension
Create/update a Google Apps Script to expose shipment status:

**New Endpoint:**
```
GET https://script.google.com/macros/s/{SCRIPT_ID}/exec?shipmentId=AGL8
```

**Response Format:**
```json
{
  "timestamp": "2025-01-27T12:00:00.000Z",
  "shipmentId": "AGL8",
  "status": "MANUFACTURING",
  "treesSold": 42,
  "weight": "330 kg",
  "date": "2024-10-15",
  "farm": "La do Sitio",
  "farmer": "Paulo"
}
```

**Google Apps Script Function:**
```javascript
function getShipmentStatus(shipmentId) {
  // Read from Google Sheet
  // Find row matching shipmentId
  // Return status and other details
}
```

#### B. Frontend Integration
Update all shipment pages to:
1. Fetch status dynamically on page load
2. Display loading state while fetching
3. Fallback to static value if API fails
4. Update status badge styling based on status

**JavaScript Pattern:**
```javascript
async function updateShipmentStatus(shipmentId) {
  const statusElement = document.getElementById('shipment-status');
  statusElement.textContent = 'Loading...';
  
  try {
    const response = await fetch(`API_URL?shipmentId=${shipmentId}`);
    const data = await response.json();
    statusElement.textContent = data.status;
    statusElement.className = `status-badge status-${data.status.toLowerCase().replace(/\s+/g, '-')}`;
  } catch (error) {
    // Fallback to static value
    statusElement.textContent = 'SALES IN PROGRESS'; // Default
  }
}
```

### Benefits
- ✅ Real-time status updates without page regeneration
- ✅ Single source of truth (Google Sheet)
- ✅ Consistent status across all pages
- ✅ Easy status management

---

## 2. Individual Farm Pages Strategy

### Concept
Create dedicated pages for each farm that serve as a hub for:
- Farm story and history
- All shipments from that farm
- All products from that farm
- Farmer profile and photos
- Farm location and map
- Regenerative practices

### Farm Structure

**Farms Identified:**
1. **Oscar's Farm** (Bahia)
   - Shipments: AGL4, AGL14
   - Products: Ceremonial Cacao (200g), Criollo Beans (wholesale), Criollo Nibs (wholesale), Cacao Nibs (8oz)
   - Story: Three generations, 80-year-old trees, 100-year-old farm

2. **Paulo's La do Sitio Farm** (Pará, Amazon Rainforest)
   - Shipments: AGL8
   - Products: Ceremonial Cacao (200g), Cacao Beans (wholesale)
   - Story: Award-winning, CEPOTX cooperative, multiple regional awards

3. **Vivi's Jesus Do Deus Farm** (Itacaré, Bahia)
   - Shipments: AGL13
   - Products: Cacao Beans (wholesale)
   - Story: Former policeman/politician, divine calling, cattle ranch to cabruca agroforestry

4. **Capela Velha Fazenda** (Bahia)
   - Shipments: AGL10
   - Products: Caramelized Cacao Beans (200g)
   - Story: Women-owned, regenerative organic

5. **São Jorge Farm** (Itabuna, Bahia)
   - Shipments: AGL6
   - Products: (None currently listed)

6. **Coopercabruca** (Bahia)
   - Shipments: AGL0, AGL1, AGL2
   - Products: (None currently listed)

7. **Bahia Small Scale Farmers** (Bahia)
   - Shipments: AGL5, AGL7
   - Products: (None currently listed)

### URL Structure
```
/farms/oscar-bahia/index.html
/farms/paulo-la-do-sitio-para/index.html
/farms/vivi-jesus-do-deus-itacare/index.html
/farms/capela-velha-bahia/index.html
/farms/sao-jorge-itabuna/index.html
/farms/coopercabruca-bahia/index.html
/farms/bahia-small-scale-farmers/index.html
```

### Farm Page Components

1. **Hero Section**
   - Farm name and location
   - Hero image/video
   - Key highlights (generations, awards, practices)

2. **Farm Story**
   - Detailed narrative
   - Historical context
   - Regenerative practices
   - Farmer profile

3. **Shipments from This Farm**
   - Grid of shipment cards
   - Status badges
   - Links to shipment pages
   - Total impact (trees planted, hectares)

4. **Products from This Farm**
   - Product cards (retail and wholesale)
   - Links to product pages
   - Pricing information

5. **Farm Location**
   - Interactive map
   - Coordinates
   - Link to Google Maps

6. **Transparency**
   - Link to TrueSight DAO ledger
   - Certifications
   - Awards and recognition

### Navigation Integration

**From Main Page:**
- "Meet Our Farmers" section → Links to farm pages
- "Our Shipments" section → Links to farm pages via shipment cards

**From Shipment Pages:**
- "View Farm Profile" button/link
- Farmer section → Link to farm page

**From Product Pages:**
- "View Farm Profile" button/link
- Farm details → Link to farm page

**From Farm Pages:**
- Navigation to all shipments
- Navigation to all products
- Link to TrueSight DAO

### Benefits of Farm Pages

1. **Storytelling**
   - Deep dive into each farm's unique story
   - Build emotional connection
   - Showcase regenerative practices

2. **SEO**
   - Rich content for search engines
   - Farm-specific keywords
   - Internal linking structure

3. **User Experience**
   - Centralized hub for farm information
   - Easy discovery of related shipments/products
   - Better understanding of supply chain

4. **Transparency**
   - Complete farm profile
   - All shipments in one place
   - Full traceability

5. **Marketing**
   - Shareable farm stories
   - Social media content
   - Educational resource

### Implementation Priority

**Phase 1: Core Farms (High Priority)**
1. Oscar's Farm (Bahia) - Most products/shipments
2. Paulo's La do Sitio Farm (Pará) - Award-winning, featured
3. Vivi's Jesus Do Deus Farm (Itacaré) - Unique story

**Phase 2: Supporting Farms**
4. Capela Velha Fazenda - Women-owned
5. São Jorge Farm
6. Coopercabruca
7. Bahia Small Scale Farmers

### Cross-Linking Strategy

```
Farm Page
├── Shipments Section
│   ├── AGL4 → Shipment Page
│   └── AGL14 → Shipment Page
├── Products Section
│   ├── Ceremonial Cacao → Product Page
│   └── Criollo Beans → Product Page
└── Transparency
    └── TrueSight DAO → Ledger

Shipment Page
└── Farm Section
    └── "View Farm Profile" → Farm Page

Product Page
└── Farm Details
    └── "View Farm Profile" → Farm Page
```

### Design Considerations

- Consistent with existing agroverse_shop styling
- Hero section with farm imagery
- Story section with rich typography
- Grid layouts for shipments/products
- Interactive map integration
- Mobile responsive
- Fast loading (optimize images)

---

## Recommendation

**Start with:**
1. ✅ Implement dynamic shipment status fetching (high value, low effort)
2. ✅ Create farm pages for top 3 farms (Oscar, Paulo, Vivi)
3. ✅ Add cross-links between farms, shipments, and products

**Then:**
4. Create remaining farm pages
5. Add farm filtering to category pages
6. Add "Farms" section to main navigation

