/**
 * Partner Navigation Script
 * Adds next/previous navigation based on geographic proximity
 */
(function() {
    'use strict';
    
    // Wait for partners data to load
    function initPartnerNavigation() {
        if (!window.PARTNERS_DATA || !window.findNearestNeighbors) {
            setTimeout(initPartnerNavigation, 100);
            return;
        }
        
        // Get current partner slug from URL
        const currentPath = window.location.pathname;
        const slugMatch = currentPath.match(/partners\/([^\/]+)\//);
        if (!slugMatch) return;
        
        const currentSlug = slugMatch[1];
        const neighbors = window.findNearestNeighbors(currentSlug);
        
        if (!neighbors) return;
        
        const navContainer = document.getElementById('partner-navigation');
        if (!navContainer) return;
        
        let navHTML = '';
        
        // Previous partner
        if (neighbors.previous) {
            navHTML += '<a href="../' + neighbors.previous.slug + '/index.html" class="partner-nav-link previous">';
            navHTML += '<span class="partner-nav-label">← Previous</span>';
            navHTML += '<span class="partner-nav-name">' + neighbors.previous.name + '</span>';
            navHTML += '</a>';
        } else {
            navHTML += '<div class="partner-nav-link previous disabled">';
            navHTML += '<span class="partner-nav-label">← Previous</span>';
            navHTML += '<span class="partner-nav-name">—</span>';
            navHTML += '</div>';
        }
        
        // Next partner
        if (neighbors.next) {
            navHTML += '<a href="../' + neighbors.next.slug + '/index.html" class="partner-nav-link next">';
            navHTML += '<span class="partner-nav-label">Next →</span>';
            navHTML += '<span class="partner-nav-name">' + neighbors.next.name + '</span>';
            navHTML += '</a>';
        } else {
            navHTML += '<div class="partner-nav-link next disabled">';
            navHTML += '<span class="partner-nav-label">Next →</span>';
            navHTML += '<span class="partner-nav-name">—</span>';
            navHTML += '</div>';
        }
        
        navContainer.innerHTML = navHTML;
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPartnerNavigation);
    } else {
        initPartnerNavigation();
    }
})();

