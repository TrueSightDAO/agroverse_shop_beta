/**
 * Drift Navigation Script
 * Provides navigation based on drift/journey order instead of traveling salesman
 */

(function() {
    'use strict';
    
    // Get Pacific West Coast Drift order (North to South)
    function getPacificWestCoastDriftOrder() {
        if (!window.PARTNERS_DATA) return [];
        
        const westCoastStates = ['Washington', 'Oregon', 'California', 'Arizona'];
        const filtered = {};
        
        for (const slug in window.PARTNERS_DATA) {
            const partner = window.PARTNERS_DATA[slug];
            const location = partner.location.toLowerCase();
            const isWestCoast = westCoastStates.some(state => 
                location.includes(state.toLowerCase())
            );
            if (isWestCoast) {
                filtered[slug] = partner;
            }
        }
        
        // Sort North to South (latitude descending)
        const slugs = Object.keys(filtered);
        const sorted = slugs.sort((a, b) => filtered[b].lat - filtered[a].lat);
        
        // Remove Ponderosa from partner list (it's part of Slab City experience)
        const sortedWithoutPonderosa = sorted.filter(slug => slug !== 'the-ponderosa-slab-city');
        
        // Add Slab City experience (before Winter Desert)
        if (window.PACIFIC_PATH_DATA && window.PACIFIC_PATH_DATA['slab-city-salvation-mountain']) {
            sortedWithoutPonderosa.push('slab-city-salvation-mountain');
        }
        
        // Add winter desert experience as final stop
        if (window.PACIFIC_PATH_DATA && window.PACIFIC_PATH_DATA['winter-desert-gatherings']) {
            sortedWithoutPonderosa.push('winter-desert-gatherings');
        }
        
        return sortedWithoutPonderosa;
    }
    
    // Get Brazilian Drift order - includes farms, partners, cooperatives, and experiences
    // This matches the exact order from the Brazilian path page
    function getBrazilianDriftOrder() {
        // Define the exact order matching the Brazilian path page itinerary
        const exactOrder = [
            'founderhaus',                    // Partner - Florianópolis
            'fazenda-capelavelha-bahia',      // Farm - Bahia
            'fazenda-sao-jorge-bahia',        // Farm - Itajuípe, Bahia
            'fazenda-analuana-bahia',          // Farm - Bahia
            'fazenda-santa-ana-bahia',        // Farm - Bahia
            'vivi-jesus-do-deus-itacare',    // Farm - Itacaré, Bahia
            'oscar-bahia',                    // Farm - Bahia
            'coopercabruca',                  // Cooperative - Bahia
            'cic-cacao-innovation-center',    // Partner - CIC Lab, Ilhéus, Bahia
            'black-king-ilheus',              // Partner - Ilhéus, Bahia
            'itacare-cultural-experiences',   // Experience - Itacaré
            'salvador-colonial-history',      // Experience - Salvador
            'paulo-la-do-sitio-para',         // Farm - Pará, Amazon
            'santa-anna-fazenda-para',        // Farm - Pará, Amazon
            'rancho-maranta-para',            // Farm - Pará, Amazon
            'raimundo-geniza-para',           // Farm - Uruará, Pará (COPOPS/CEPOTX)
            'fazenda-santa-rosa-para',        // Farm - Uruará, Pará (COPOPS/CEPOTX)
            'fazenda-cleide-para',            // Farm - Altamira, Pará (CEPOTX)
            'cepotx',                         // Cooperative - Pará
            'jungle-johnny-amazon-tours',     // Experience - Manaus
            'cargo-boat-manaus-leticia'       // Experience - Leticia
        ];
        
        return exactOrder;
    }
    
    // Get neighbors in drift order
    // type can be 'partner', 'farm', 'cooperative', or 'experience'
    function getDriftNeighbors(currentSlug, type) {
        let order = [];
        let journeyUrl = '';
        
        // Determine type if not provided
        if (typeof type === 'boolean') {
            // Legacy: boolean indicates isPartner
            type = type ? 'partner' : 'farm';
        }
        
        if (type === 'partner') {
            // Check if partner is in Pacific West Coast drift
            const pacificOrder = getPacificWestCoastDriftOrder();
            if (pacificOrder.includes(currentSlug)) {
                order = pacificOrder;
                journeyUrl = '../../cacao-journeys/pacific-west-coast-path/index.html';
            } else {
                // Check if in Brazilian drift
                const brazilianOrder = getBrazilianDriftOrder();
                if (brazilianOrder.includes(currentSlug)) {
                    order = brazilianOrder;
                    journeyUrl = '../../cacao-journeys/brazilian-path/index.html';
                } else {
                    return { previous: null, next: null, journeyUrl: null };
                }
            }
        } else if (type === 'farm' || type === 'cooperative' || type === 'experience') {
            // Check if in Brazilian drift
            order = getBrazilianDriftOrder();
            if (order.includes(currentSlug)) {
                journeyUrl = '../../cacao-journeys/brazilian-path/index.html';
            } else {
                // Check if in Pacific West Coast drift (for experiences)
                if (type === 'experience') {
                    const pacificOrder = getPacificWestCoastDriftOrder();
                    if (pacificOrder.includes(currentSlug)) {
                        order = pacificOrder;
                        journeyUrl = '../../cacao-journeys/pacific-west-coast-path/index.html';
                    } else {
                        return { previous: null, next: null, journeyUrl: null };
                    }
                } else if (type === 'partner') {
                    // Partners can also be in Pacific drift
                    const pacificOrder = getPacificWestCoastDriftOrder();
                    if (pacificOrder.includes(currentSlug)) {
                        order = pacificOrder;
                        journeyUrl = '../../cacao-journeys/pacific-west-coast-path/index.html';
                    } else {
                        return { previous: null, next: null, journeyUrl: null };
                    }
                } else {
                    return { previous: null, next: null, journeyUrl: null };
                }
            }
        } else {
            return { previous: null, next: null, journeyUrl: null };
        }
        
        const currentIndex = order.indexOf(currentSlug);
        if (currentIndex === -1) {
            return { previous: null, next: null, journeyUrl: null };
        }
        
        const prevSlug = currentIndex > 0 ? order[currentIndex - 1] : null;
        const nextSlug = currentIndex < order.length - 1 ? order[currentIndex + 1] : null;
        
        let previous = null;
        let next = null;
        
        // Helper function to get data for a slug
        function getDataForSlug(slug) {
            // Check Brazilian path data first (includes all types)
            if (window.BRAZILIAN_PATH_DATA && window.BRAZILIAN_PATH_DATA[slug]) {
                return window.BRAZILIAN_PATH_DATA[slug];
            }
            // Check Pacific path data (for experiences)
            if (window.PACIFIC_PATH_DATA && window.PACIFIC_PATH_DATA[slug]) {
                return window.PACIFIC_PATH_DATA[slug];
            }
            // Check farms data
            if (window.FARMS_DATA && window.FARMS_DATA[slug]) {
                return window.FARMS_DATA[slug];
            }
            // Check partners data
            if (window.PARTNERS_DATA && window.PARTNERS_DATA[slug]) {
                return window.PARTNERS_DATA[slug];
            }
            return null;
        }
        
        if (prevSlug) {
            previous = getDataForSlug(prevSlug);
        }
        
        if (nextSlug) {
            next = getDataForSlug(nextSlug);
        }
        
        return { previous, next, journeyUrl };
    }
    
    // Expose to window
    window.getDriftNeighbors = getDriftNeighbors;
    window.getPacificWestCoastDriftOrder = getPacificWestCoastDriftOrder;
    window.getBrazilianDriftOrder = getBrazilianDriftOrder;
})();

