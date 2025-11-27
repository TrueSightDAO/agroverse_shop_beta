/**
 * Partner location data with coordinates for geographic navigation
 * Used to calculate nearest neighbors for next/previous navigation
 */
window.PARTNERS_DATA = {
    'block71-silicon-valley': {
        name: 'Block71 Silicon Valley',
        slug: 'block71-silicon-valley',
        lat: 37.3956,
        lon: -122.0758,
        location: 'Silicon Valley, California'
    },
    'go-ask-alice': {
        name: 'Go Ask Alice',
        slug: 'go-ask-alice',
        lat: 36.9741,
        lon: -122.0308,
        location: 'Santa Cruz, California'
    },
    'green-gulch-farm-zen-center': {
        name: 'Green Gulch Farm Zen Center',
        slug: 'green-gulch-farm-zen-center',
        lat: 37.8685,
        lon: -122.5450,
        location: 'Marin County, California'
    },
    'hacker-dojo': {
        name: 'Hacker Dojo',
        slug: 'hacker-dojo',
        lat: 37.3956,
        lon: -122.0758,
        location: 'Mountain View, California'
    },
    'kikis-cocoa': {
        name: 'Kiki\'s Cocoa',
        slug: 'kikis-cocoa',
        lat: 37.7749,
        lon: -122.4194,
        location: 'San Francisco, California'
    },
    'love-wisdom-power': {
        name: 'Love Wisdom Power',
        slug: 'love-wisdom-power',
        lat: 42.2190,
        lon: -123.2770,
        location: 'Williams, Oregon'
    },
    'miss-tomato': {
        name: 'Miss Tomato',
        slug: 'miss-tomato',
        lat: 37.7066,
        lon: -122.4619,
        location: 'Daly City, California'
    },
    'peace-on-fifth': {
        name: 'Peace on Fifth',
        slug: 'peace-on-fifth',
        lat: 39.7589,
        lon: -84.1916,
        location: 'Dayton, Ohio'
    },
    'queen-hippie-gypsy': {
        name: 'Queen Hippie Gypsy',
        slug: 'queen-hippie-gypsy',
        lat: 37.8044,
        lon: -122.2712,
        location: 'Downtown Oakland, California'
    },
    'sacred-earth-farms': {
        name: 'Sacred Earth Farms',
        slug: 'sacred-earth-farms',
        lat: 42.5173,
        lon: -123.1015,
        location: 'Merlin, Oregon'
    },
    'secrets-of-garden-slo': {
        name: 'Secrets of Garden SLO',
        slug: 'secrets-of-garden-slo',
        lat: 35.2828,
        lon: -120.6596,
        location: 'San Luis Obispo, California'
    },
    'soulfulness-breathe': {
        name: 'Soulfulness Breathe',
        slug: 'soulfulness-breathe',
        lat: 39.7392,
        lon: -104.9903,
        location: 'Denver, Colorado'
    },
    'the-enchanted-forest-boutique': {
        name: 'The Enchanted Forest Boutique',
        slug: 'the-enchanted-forest-boutique',
        lat: 39.7458,
        lon: -121.8374,
        location: 'Chico, California'
    },
    'the-ponderosa-slab-city': {
        name: 'The Ponderosa, Slab City',
        slug: 'the-ponderosa-slab-city',
        lat: 33.2581,
        lon: -115.4650,
        location: 'Slab City, California'
    },
    'lumin-earth-apothecary': {
        name: 'Lumin Earth Apothecary',
        slug: 'lumin-earth-apothecary',
        lat: 35.3666915,
        lon: -120.8502279,
        location: 'Morro Bay, California'
    },
    'republic-cafe-and-ming-lounge': {
        name: 'Republic Cafe and Ming Lounge',
        slug: 'republic-cafe-and-ming-lounge',
        lat: 45.5152,
        lon: -122.6784,
        location: 'Portland, Oregon'
    },
    'prism-percussions': {
        name: 'Prism Percussions',
        slug: 'prism-percussions',
        lat: 44.5646,
        lon: -123.2620,
        location: 'Corvallis, Oregon'
    },
    'love-of-ganesha': {
        name: 'Love of Ganesha',
        slug: 'love-of-ganesha',
        lat: 37.7699,
        lon: -122.4469,
        location: 'San Francisco, California'
    },
    'embodied-blindfold-dance': {
        name: 'Embodied Blindfold Dance',
        slug: 'embodied-blindfold-dance',
        lat: 44.0521,
        lon: -123.0868,
        location: 'Eugene, Oregon'
    },
    'edge-and-node-house-of-web3': {
        name: 'Edge and Node, House of Web3',
        slug: 'edge-and-node-house-of-web3',
        lat: 37.7749,
        lon: -122.4194,
        location: 'San Francisco, California'
    },
    'founderhaus': {
        name: 'Founderhaus',
        slug: 'founderhaus',
        lat: -27.4305,
        lon: -48.4306,
        location: 'Florianópolis, Brazil'
    },
    'heierling-ski': {
        name: 'Heierling Ski',
        slug: 'heierling-ski',
        lat: 46.8047,
        lon: 9.8361,
        location: 'Davos, Switzerland'
    },
    'rpm-ninja': {
        name: 'RPM Ninja',
        slug: 'rpm-ninja',
        lat: 47.6062,
        lon: -122.3321,
        location: 'Seattle, Washington'
    }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Build a traveling salesman path through all partners
 * Uses greedy nearest neighbor algorithm starting from the westernmost partner
 * Returns an array of slugs in order
 */
function buildTravelingSalesmanPath() {
    const allSlugs = Object.keys(window.PARTNERS_DATA);
    if (allSlugs.length === 0) return [];
    
    // Start from the westernmost partner (lowest longitude)
    let startSlug = allSlugs[0];
    let minLon = window.PARTNERS_DATA[startSlug].lon;
    for (const slug of allSlugs) {
        if (window.PARTNERS_DATA[slug].lon < minLon) {
            minLon = window.PARTNERS_DATA[slug].lon;
            startSlug = slug;
        }
    }
    
    const path = [startSlug];
    const visited = new Set([startSlug]);
    
    // Greedy nearest neighbor: at each step, go to the nearest unvisited partner
    let currentSlug = startSlug;
    while (visited.size < allSlugs.length) {
        let nearestSlug = null;
        let minDistance = Infinity;
        
        for (const slug of allSlugs) {
            if (visited.has(slug)) continue;
            
            const distance = calculateDistance(
                window.PARTNERS_DATA[currentSlug].lat,
                window.PARTNERS_DATA[currentSlug].lon,
                window.PARTNERS_DATA[slug].lat,
                window.PARTNERS_DATA[slug].lon
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestSlug = slug;
            }
        }
        
        if (nearestSlug) {
            path.push(nearestSlug);
            visited.add(nearestSlug);
            currentSlug = nearestSlug;
        } else {
            break; // No more unvisited partners
        }
    }
    
    return path;
}

// Cache the path so we don't rebuild it every time
let cachedPath = null;
function getTravelingSalesmanPath() {
    if (!cachedPath) {
        cachedPath = buildTravelingSalesmanPath();
    }
    return cachedPath;
}

/**
 * Find nearest neighbors for a given partner in the traveling salesman path
 * Returns { previous: partnerData, next: partnerData } or null if not found
 */
function findNearestNeighbors(currentSlug) {
    const current = window.PARTNERS_DATA[currentSlug];
    if (!current) return null;
    
    const path = getTravelingSalesmanPath();
    const currentIndex = path.indexOf(currentSlug);
    
    if (currentIndex === -1) return null;
    
    // Get previous and next in the path (wrapping around)
    const prevIndex = currentIndex === 0 ? path.length - 1 : currentIndex - 1;
    const nextIndex = currentIndex === path.length - 1 ? 0 : currentIndex + 1;
    
    return {
        previous: window.PARTNERS_DATA[path[prevIndex]],
        next: window.PARTNERS_DATA[path[nextIndex]]
    };
}

// Expose function to window for use by partner-navigation.js
window.findNearestNeighbors = findNearestNeighbors;

