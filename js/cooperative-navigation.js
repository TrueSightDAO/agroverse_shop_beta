/**
 * Cooperative Navigation Script
 * Adds next/previous navigation based on drift/journey order
 */
(function() {
    'use strict';
    
    // Wait for data and drift navigation to load
    function initCooperativeNavigation() {
        if (!window.getDriftNeighbors) {
            setTimeout(initCooperativeNavigation, 100);
            return;
        }
        
        // Get current cooperative slug from URL
        const currentPath = window.location.pathname;
        const slugMatch = currentPath.match(/cooperatives\/([^\/]+)\//);
        if (!slugMatch) return;
        
        const currentSlug = slugMatch[1];
        const result = window.getDriftNeighbors(currentSlug, 'cooperative');
        
        if (!result || (!result.previous && !result.next)) return;
        
        const navContainer = document.getElementById('cooperative-navigation');
        if (!navContainer) return;
        
        let navHTML = '';
        
        // Previous stop
        if (result.previous) {
            let prevUrl = getUrlForStop(result.previous);
            navHTML += '<a href="' + prevUrl + '" class="cooperative-nav-link previous">';
            navHTML += '<span class="cooperative-nav-label">← Previous</span>';
            navHTML += '<span class="cooperative-nav-name">' + result.previous.name + '</span>';
            navHTML += '</a>';
        } else {
            navHTML += '<div class="cooperative-nav-link previous disabled">';
            navHTML += '<span class="cooperative-nav-label">← Previous</span>';
            navHTML += '<span class="cooperative-nav-name">—</span>';
            navHTML += '</div>';
        }
        
        // Next stop
        if (result.next) {
            let nextUrl = getUrlForStop(result.next);
            navHTML += '<a href="' + nextUrl + '" class="cooperative-nav-link next">';
            navHTML += '<span class="cooperative-nav-label">Next →</span>';
            navHTML += '<span class="cooperative-nav-name">' + result.next.name + '</span>';
            navHTML += '</a>';
        } else {
            navHTML += '<div class="cooperative-nav-link next disabled">';
            navHTML += '<span class="cooperative-nav-label">Next →</span>';
            navHTML += '<span class="cooperative-nav-name">—</span>';
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
    
    // Helper function to get URL for a stop based on its type
    function getUrlForStop(stop) {
        if (!stop || !stop.type) {
            // Fallback: try to determine from slug
            if (stop.slug === 'founderhaus' || stop.slug === 'black-king-ilheus') {
                return '../../partners/' + stop.slug + '/index.html';
            } else if (window.FARMS_DATA && window.FARMS_DATA[stop.slug]) {
                return '../../farms/' + stop.slug + '/index.html';
            } else if (stop.slug === 'coopercabruca' || stop.slug === 'cepotx') {
                return '../' + stop.slug + '/index.html';
            } else {
                return '../../cacao-journeys/brazilian-path/experiences/' + stop.slug + '/index.html';
            }
        }
        
        switch (stop.type) {
            case 'partner':
                if (stop.slug === 'founderhaus') {
                    return '../../partners/founderhaus/index.html';
                } else {
                    return '../../partners/' + stop.slug + '/index.html';
                }
            case 'farm':
                return '../../farms/' + stop.slug + '/index.html';
            case 'cooperative':
                return '../' + stop.slug + '/index.html';
            case 'experience':
                return '../../cacao-journeys/brazilian-path/experiences/' + stop.slug + '/index.html';
            default:
                return '#';
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCooperativeNavigation);
    } else {
        initCooperativeNavigation();
    }
})();






