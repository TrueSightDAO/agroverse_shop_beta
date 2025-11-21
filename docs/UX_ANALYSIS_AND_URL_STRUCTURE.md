# UX Analysis & URL Structure Documentation

## Current User Journey

### Flow Overview
```
QR Code Scan 
  ↓
agroverse.shop/shipments/{agl} (Consumer-facing, emotional)
  ↓
Email Signup (Get tree planting notifications)
  ↓
Optional: truesight.me/agroverse-shipments/{agl} (Transparency/audit)
```

## URL Structures

### Agroverse Shop (Consumer-Facing)
**Base URL**: `https://www.agroverse.shop`

**Landing Page**:
- `https://www.agroverse.shop/` - Main landing page

**Shipment Pages** (QR Code Landing):
- `https://www.agroverse.shop/shipments/agl8` - Paulo's Farm (La do Sitio, Pará)
- `https://www.agroverse.shop/shipments/agl6` - São Jorge Farm (Itabuna, Bahia)
- `https://www.agroverse.shop/shipments/{agl}` - Pattern for all shipments

**Purpose**: 
- Emotional connection (farmer stories, farm photos)
- Simple, accessible information
- Email registration for tree planting updates
- Clear call-to-action

### TrueSight DAO (Transparency/Audit)
**Base URL**: `https://www.truesight.me`

**Shipment Pages** (Deep Dive):
- `https://www.truesight.me/agroverse-shipments/agl8` - Full ledger, contracts, maps
- `https://www.truesight.me/agroverse-shipments/agl6` - Complete transparency data
- `https://www.truesight.me/agroverse-shipments/{agl}` - Pattern for all shipments

**Purpose**:
- Complete transparency (invoices, FDA notices, lab reports)
- Financial ledger details
- Geographic mapping
- Technical/audit information

## UX Analysis: Current State

### ✅ What Works Well

1. **Clear Separation of Concerns**
   - Consumer experience (agroverse.shop) vs. Transparency (truesight.me)
   - Each site serves a distinct purpose

2. **Progressive Disclosure**
   - Simple story first (agroverse.shop)
   - Deep dive available (truesight.me)

3. **Emotional Connection**
   - Farmer photos and stories on consumer site
   - Builds trust before showing data

### ⚠️ Areas for Improvement (Johnny Ive Philosophy)

**1. Friction in Email Signup**
- Currently: No visible email signup on shipment pages
- **Ive Principle**: "Simplicity is the ultimate sophistication"
- **Improvement**: Prominent, one-field email signup above the fold

**2. Contextual Ledger Link**
- Currently: Buried in "Transparency Ledger" row
- **Ive Principle**: "Design is not just what it looks like, design is how it works"
- **Improvement**: Clear visual hierarchy - "View Full Transparency" as secondary action

**3. Value Proposition Clarity**
- Currently: Tree count shown, but connection to user's bag unclear
- **Ive Principle**: "Focus on the essential"
- **Improvement**: "Your bag = 1 tree planted" messaging

**4. Visual Hierarchy**
- Currently: All information presented equally
- **Ive Principle**: "Remove everything unnecessary"
- **Improvement**: Hero → Email Signup → Story → Transparency (progressive disclosure)

## Recommended UX Improvements

### 1. Email Signup (Primary CTA)
**Placement**: Immediately after hero section, before shipment details
**Design**: 
- Single email field
- Clear value prop: "Get notified when your tree is planted"
- Minimal, elegant form
- Success state: "You'll be notified when AGL8 trees are planted"

### 2. Information Architecture
```
Hero (Tree count + Shipment ID)
  ↓
Email Signup (Primary CTA)
  ↓
Farmer Story (Emotional connection)
  ↓
Shipment Details (Quick facts)
  ↓
Transparency Section (Secondary - "Want to verify?")
  ↓
Link to TrueSight DAO (Clear, but not prominent)
```

### 3. Visual Design Principles
- **Clarity**: One primary action per screen
- **Simplicity**: Remove unnecessary elements
- **Focus**: Email signup is the hero action
- **Trust**: Transparency available but not overwhelming

### 4. Micro-interactions
- Email field: Subtle focus state
- Submit: Loading state → Success animation
- Ledger link: Subtle hover state (not competing with primary CTA)

## Implementation Recommendations

1. **Add Email Signup Form** to shipment pages
2. **Reorder Content** for better flow
3. **Visual Hierarchy** - Make email signup prominent
4. **Contextual Messaging** - "Your bag from AGL8 = 1 tree"
5. **Progressive Disclosure** - Transparency as secondary action

