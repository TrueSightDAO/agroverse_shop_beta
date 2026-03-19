/**
 * Partner Navigation Script
 * Adds next/previous navigation based on drift/journey order
 */
(function() {
    'use strict';
    
    // Wait for partners data and drift navigation to load
    function initPartnerNavigation() {
        if (!window.getDriftNeighbors) {
            setTimeout(initPartnerNavigation, 100);
            return;
        }
        
        // Get current partner slug from URL
        const currentPath = window.location.pathname;
        const slugMatch = currentPath.match(/partners\/([^\/]+)\//);
        if (!slugMatch) return;
        
        const currentSlug = slugMatch[1];
        const result = window.getDriftNeighbors(currentSlug, 'partner');
        
        if (!result || (!result.previous && !result.next)) return;
        
        const navContainer = document.getElementById('partner-navigation');
        if (!navContainer) return;
        
        let navHTML = '';
        
        // Helper function to get URL for a stop based on its type
        function getUrlForStop(stop) {
            if (!stop) {
                return '#';
            }
            
            // Check if it's a known experience slug first (even if type is missing)
            if (stop.slug === 'slab-city-salvation-mountain' || stop.slug === 'winter-desert-gatherings') {
                return '../../cacao-journeys/pacific-west-coast-path/experiences/' + stop.slug + '/index.html';
            }
            
            if (stop.slug === 'itacare-cultural-experiences' || stop.slug === 'salvador-colonial-history' || stop.slug === 'jungle-johnny-amazon-tours' || stop.slug === 'cargo-boat-manaus-leticia') {
                const slugToFolderMap = {
                    'itacare-cultural-experiences': 'itacare-cultural-immersion',
                    'salvador-colonial-history': 'salvador-colonial-history',
                    'jungle-johnny-amazon-tours': 'jungle-johnny-amazon-tours',
                    'cargo-boat-manaus-leticia': 'cargo-boat-manaus-leticia'
                };
                const folderName = slugToFolderMap[stop.slug] || stop.slug;
                return '../../cacao-journeys/brazilian-path/experiences/' + folderName + '/index.html';
            }
            
            if (!stop.type) {
                // Fallback: try to determine from slug
                if (stop.slug === 'founderhaus' || stop.slug === 'black-king-ilheus' || stop.slug === 'cic-cacao-innovation-center') {
                    return '../' + stop.slug + '/index.html';
                } else if (window.FARMS_DATA && window.FARMS_DATA[stop.slug]) {
                    return '../../farms/' + stop.slug + '/index.html';
                } else if (stop.slug === 'coopercabruca' || stop.slug === 'cepotx') {
                    return '../../cooperatives/' + stop.slug + '/index.html';
                } else {
                    return '../' + stop.slug + '/index.html';
                }
            }
            
            switch (stop.type) {
                case 'partner':
                    return '../' + stop.slug + '/index.html';
                case 'farm':
                    return '../../farms/' + stop.slug + '/index.html';
                case 'cooperative':
                    return '../../cooperatives/' + stop.slug + '/index.html';
                case 'experience':
                    // Map data slug to folder name
                    const slugToFolderMap = {
                        'itacare-cultural-experiences': 'itacare-cultural-immersion',
                        'salvador-colonial-history': 'salvador-colonial-history',
                        'jungle-johnny-amazon-tours': 'jungle-johnny-amazon-tours',
                        'cargo-boat-manaus-leticia': 'cargo-boat-manaus-leticia',
                        'slab-city-salvation-mountain': 'slab-city-salvation-mountain',
                        'winter-desert-gatherings': 'winter-desert-gatherings'
                    };
                    const folderName = slugToFolderMap[stop.slug] || stop.slug;
                    // Determine if it's Pacific or Brazilian path based on slug
                    if (stop.slug === 'slab-city-salvation-mountain' || stop.slug === 'winter-desert-gatherings') {
                        return '../../cacao-journeys/pacific-west-coast-path/experiences/' + folderName + '/index.html';
                    } else {
                        return '../../cacao-journeys/brazilian-path/experiences/' + folderName + '/index.html';
                    }
                default:
                    return '#';
            }
        }
        
        // Previous stop
        if (result.previous) {
            let prevUrl = getUrlForStop(result.previous);
            navHTML += '<a href="' + prevUrl + '" class="partner-nav-link previous">';
            navHTML += '<span class="partner-nav-label">← Previous</span>';
            navHTML += '<span class="partner-nav-name">' + result.previous.name + '</span>';
            navHTML += '</a>';
        } else {
            navHTML += '<div class="partner-nav-link previous disabled">';
            navHTML += '<span class="partner-nav-label">← Previous</span>';
            navHTML += '<span class="partner-nav-name">—</span>';
            navHTML += '</div>';
        }
        
        // Next stop
        if (result.next) {
            let nextUrl = getUrlForStop(result.next);
            navHTML += '<a href="' + nextUrl + '" class="partner-nav-link next">';
            navHTML += '<span class="partner-nav-label">Next →</span>';
            navHTML += '<span class="partner-nav-name">' + result.next.name + '</span>';
            navHTML += '</a>';
        } else {
            navHTML += '<div class="partner-nav-link next disabled">';
            navHTML += '<span class="partner-nav-label">Next →</span>';
            navHTML += '<span class="partner-nav-name">—</span>';
            navHTML += '</div>';
        }
        
        navContainer.innerHTML = navHTML;
        
        // Update back link if journey URL is available
        if (result.journeyUrl) {
            const backLink = document.querySelector('.back-link');
            if (backLink) {
                backLink.href = result.journeyUrl;
                backLink.textContent = 'Back to Journey';
            }
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPartnerNavigation);
    } else {
        initPartnerNavigation();
    }
})();

