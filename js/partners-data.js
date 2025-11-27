/**
 * Partner location data with coordinates for geographic navigation
 * Used to calculate nearest neighbors for next/previous navigation
 */
window.PARTNERS_DATA = {
    'block71-silicon-valley': {
        name: 'Block71 Silicon Valley',
        slug: 'block71-silicon-valley',
        lat: 37.5669704,
        lon: -122.3238659,
        location: 'San Mateo, California',
        description: 'A collaborative hackerspace and innovation hub in Silicon Valley where entrepreneurs, programmers, and creators gather around regenerative cacao. Bridging Singaporean and US entrepreneurial ecosystems since 2009, fostering cross-cultural collaboration and technological innovation while supporting rainforest restoration.'
    },
    'go-ask-alice': {
        name: 'Go Ask Alice',
        slug: 'go-ask-alice',
        lat: 36.9719889,
        lon: -122.0256564,
        location: 'Santa Cruz, California',
        description: 'A vibrant, community-focused small business rooted in the heart of downtown Santa Cruz, California. Owned by Nicolina Ammerman, this women-owned and LGBTQ+ friendly space connects people with the transformative and healing power of nature. As a partner venue, Go Ask Alice offers regenerative ceremonial cacao, supporting sustainable living and earth-based practices that make the benefits of the natural world accessible to all.'
    },
    'green-gulch-farm-zen-center': {
        name: 'Green Gulch Farm Zen Center',
        slug: 'green-gulch-farm-zen-center',
        lat: 37.8685,
        lon: -122.5450,
        location: 'Marin County, California',
        description: 'A serene Buddhist practice center in Marin County, blending spiritual cultivation, organic farming, and mindful living in harmony with nature. This sacred space offers meditation, organic farming, and community gatherings where regenerative cacao serves as a bridge between spiritual practice and conscious consumption, supporting rainforest restoration through mindful connection.'
    },
    'hacker-dojo': {
        name: 'Hacker Dojo',
        slug: 'hacker-dojo',
        lat: 37.3962356,
        lon: -122.0491779,
        location: 'Mountain View, California',
        description: 'A community workspace and innovation hub in Mountain View, California, fostering creativity, collaboration, and technological innovation. At Hacker Dojo, regenerative cacao brings together technologists, entrepreneurs, and creators, creating spaces for mindful connection and conscious innovation that support both technological advancement and rainforest restoration.'
    },
    'kikis-cocoa': {
        name: 'Kiki\'s Cocoa',
        slug: 'kikis-cocoa',
        lat: 37.7746386,
        lon: -122.4398332,
        location: 'San Francisco, California',
        description: 'A boutique San Francisco chocolatier owned by Kirsten "Kiki" Ritschel, crafting exquisite, ethically-sourced confections. Kiki\'s Cocoa offers monthly subscriptions, single-origin ganache, and truffle-making classes. As a partner venue, they proudly offer Agroverse ceremonial cacao, connecting their community with regenerative, ethically-sourced cacao from Brazilian farmers while supporting rainforest restoration through conscious chocolate consumption.'
    },
    'love-wisdom-power': {
        name: 'Love Wisdom Power',
        slug: 'love-wisdom-power',
        lat: 42.2190,
        lon: -123.2770,
        location: 'Williams, Oregon',
        description: 'In the tranquil, forested embrace of Williams, Oregon, Love Wisdom Power unfolds as a sacred conduit to wholeness, where profound guidance meets regenerative cacao.'
    },
    'miss-tomato': {
        name: 'Miss Tomato',
        slug: 'miss-tomato',
        lat: 37.7066,
        lon: -122.4619,
        location: 'Daly City, California',
        description: 'A beloved Daly City sandwich shop and community gathering space where neighbors come together around regenerative cacao. Known for gourmet sandwiches, fresh ingredients, and meaningful local connections that support rainforest restoration through conscious consumption.'
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
        location: 'Downtown Oakland, California',
        description: 'A luminous botanica sanctuary in Downtown Oakland, where Black Girl Magic blooms through shimmering crystals and ancestral whispers. Owned by Lilly Ayers, this Oakland gem stands as the city\'s first Black woman-owned crystal, metaphysical, and artisan botanica. As a partner venue, Queen Hippie Gypsy offers Agroverse ceremonial cacao, empowering women of color to reclaim their spiritual sovereignty while supporting regenerative agriculture and rainforest restoration.'
    },
    'sacred-earth-farms': {
        name: 'Sacred Earth Farms',
        slug: 'sacred-earth-farms',
        lat: 42.5173,
        lon: -123.1015,
        location: 'Merlin, Oregon',
        description: 'A regenerative haven of healing and harmony in Merlin, Oregon, where sun-kissed soils and sacred infusions craft potent elixirs. Sacred Earth Farms creates spaces where regenerative cacao meets herbal wisdom, supporting both local healing practices and rainforest restoration through conscious consumption and community connection.'
    },
    'secrets-of-garden-slo': {
        name: 'Secrets of Garden SLO',
        slug: 'secrets-of-garden-slo',
        lat: 35.2828,
        lon: -120.6596,
        location: 'San Luis Obispo, California',
        description: 'A beloved tea and herb shop established in 2004, specializing in hand-blended premium teas and herbal blends. Owned by Kirstin Sherritt, Secrets of Garden SLO is dedicated to enhancing physical, mental, and spiritual well-being through nature\'s healing power. As a partner venue, they offer Agroverse ceremonial cacao, bringing regenerative, ethically-sourced cacao to the Central Coast community, perfectly complementing their existing offerings of premium teas and herbal remedies while supporting rainforest restoration.'
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
        location: 'Chico, California',
        description: 'Owned by Chris and Monique, The Enchanted Forest Boutique in Chico, California, offers a magical space where community gathers around crystals, herbs, and regenerative cacao.'
    },
    'the-ponderosa-slab-city': {
        name: 'The Ponderosa, Slab City',
        slug: 'the-ponderosa-slab-city',
        lat: 33.2581,
        lon: -115.4650,
        location: 'Slab City, California',
        description: 'A unique community space in Slab City, California, where free-spirited gatherings and regenerative cacao create connections in the heart of the desert.'
    },
    'lumin-earth-apothecary': {
        name: 'Lumin Earth Apothecary',
        slug: 'lumin-earth-apothecary',
        lat: 35.3666915,
        lon: -120.8502279,
        location: 'Morro Bay, California',
        description: 'A mother-daughter-owned herbal sanctuary, crystal shop, and house-plant haven in Morro Bay, California. Experience regenerative cacao at their tea bar where Summer and Sierra craft made-to-order herbal elixirs and teas.'
    },
    'republic-cafe-and-ming-lounge': {
        name: 'Republic Cafe and Ming Lounge',
        slug: 'republic-cafe-and-ming-lounge',
        lat: 45.5152,
        lon: -122.6784,
        location: 'Portland, Oregon',
        description: 'One of Portland\'s oldest continuously running Chinese restaurants since 1922, owned by the Mui family for over three decades. This historic venue in Old Town-Chinatown offers a unique space where tradition meets community, and regenerative cacao creates connections.'
    },
    'prism-percussions': {
        name: 'Prism Percussions',
        slug: 'prism-percussions',
        lat: 44.5646,
        lon: -123.2620,
        location: 'Corvallis, Oregon',
        description: 'Crafts soulful wooden drums featuring intricate laser-etched designs. Founded by artisan Jenifer Runnion, Prism Percussions blends fine craftsmanship with ecological restoration, creating spaces where rhythm, creativity, and regenerative cacao converge.'
    },
    'love-of-ganesha': {
        name: 'Love of Ganesha',
        slug: 'love-of-ganesha',
        lat: 37.7699,
        lon: -122.4469,
        location: 'San Francisco, California',
        description: 'A cornerstone of spiritual exploration in San Francisco\'s Haight Street since the counterculture era, offering raw crystals, handcrafted jewelry, protection amulets, and spiritually blessed items, where regenerative cacao enhances sacred gatherings.'
    },
    'embodied-blindfold-dance': {
        name: 'Embodied Blindfold Dance',
        slug: 'embodied-blindfold-dance',
        lat: 44.0521,
        lon: -123.0868,
        location: 'Eugene, Oregon',
        description: 'A unique movement practice space in Eugene, Oregon, offering transformative blindfolded dance experiences that combine dance, mindfulness, and sensory exploration. Through blindfolded movement practices, participants connect more deeply with their bodies, release inhibitions, and explore movement in profound ways. As an Agroverse partner, Embodied Blindfold Dance incorporates regenerative cacao into their healing and movement workshops, creating powerful containers for personal transformation, embodied awareness, and conscious connection while supporting rainforest restoration.'
    },
    'edge-and-node-house-of-web3': {
        name: 'Edge and Node, House of Web3',
        slug: 'edge-and-node-house-of-web3',
        lat: 37.8008980,
        lon: -122.4589384,
        location: 'San Francisco, California',
        description: 'A collaborative space in San Francisco serving as a hub for Web3 innovators, developers, and entrepreneurs. Fosters innovation, collaboration, and community building within the decentralized technology ecosystem, enhanced by regenerative cacao.'
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
        location: 'Seattle, Washington',
        description: 'Led by Jae Nice, RPM Ninja creates safe creative spaces for music, art, and community in Seattle. Through immersive events, fantasy balls, bazaars, and workshops, they bring together artists, musicians, and community members to celebrate creativity and connection.'
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

