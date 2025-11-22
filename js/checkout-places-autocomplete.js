/**
 * Google Places Autocomplete for Checkout Address
 * Provides address autocomplete and auto-fills city, state, zip
 */

(function() {
  'use strict';

  var autocomplete = null;
  var placesService = null;

  /**
   * Initialize Google Places Autocomplete
   */
  function initPlacesAutocomplete() {
    var addressInput = document.getElementById('address');
    if (!addressInput) {
      console.warn('Address input not found');
      return;
    }

    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
      console.warn('Google Maps Places API not loaded');
      // Try to load it
      loadGooglePlacesAPI();
      return;
    }

    // Create autocomplete
    autocomplete = new google.maps.places.Autocomplete(addressInput, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address', 'geometry']
    });

    // Create places service for getting place details
    placesService = new google.maps.places.PlacesService(document.createElement('div'));

    // Listen for place selection
    autocomplete.addListener('place_changed', function() {
      handlePlaceSelect();
    });
  }

  /**
   * Load Google Places API
   */
  function loadGooglePlacesAPI() {
    // Check if script is already loading
    if (window.googlePlacesLoading) {
      return;
    }

    // Check if API key is configured
    var config = window.AGROVERSE_CONFIG || {};
    var apiKey = config.googlePlacesApiKey;

    if (!apiKey || apiKey.includes('YOUR_')) {
      console.warn('Google Places API key not configured. Address autocomplete will not work.');
      return;
    }

    window.googlePlacesLoading = true;

    // Load Google Maps API with Places library
    // Add loading=async to prevent gen_204 calls and reduce CORS issues
    var script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + apiKey + '&libraries=places&callback=initCheckoutPlacesAutocomplete&loading=async';
    script.async = true;
    script.defer = true;
    script.onerror = function() {
      console.warn('Failed to load Google Maps API. Check API key configuration and domain restrictions.');
      window.googlePlacesLoading = false;
    };
    document.head.appendChild(script);
  }

  /**
   * Handle place selection from autocomplete
   */
  function handlePlaceSelect() {
    if (!autocomplete) return;

    var place = autocomplete.getPlace();
    if (!place || !place.address_components) {
      return;
    }

    // Parse address components
    var addressComponents = place.address_components;
    var city = '';
    var state = '';
    var zip = '';
    var country = 'US';

    for (var i = 0; i < addressComponents.length; i++) {
      var component = addressComponents[i];
      var types = component.types;

      if (types.indexOf('locality') !== -1) {
        city = component.long_name;
      }

      if (types.indexOf('administrative_area_level_1') !== -1) {
        state = component.short_name; // Use short name for state (e.g., "CA")
      }

      if (types.indexOf('postal_code') !== -1) {
        zip = component.long_name;
      }

      if (types.indexOf('country') !== -1) {
        country = component.short_name;
      }
    }

    // Auto-fill form fields
    var form = document.getElementById('checkout-form');
    if (form) {
      var cityInput = form.querySelector('[name="city"]');
      if (cityInput && city) {
        cityInput.value = city;
      }

      var stateInput = form.querySelector('[name="state"]');
      if (stateInput && state) {
        stateInput.value = state;
      }

      var zipInput = form.querySelector('[name="zip"]');
      if (zipInput && zip) {
        zipInput.value = zip;
      }

      var countryInput = form.querySelector('[name="country"]');
      if (countryInput && country) {
        countryInput.value = country;
      }
    }

    // Trigger shipping calculation after address is auto-filled
    // Wait a bit for all fields to be populated
    setTimeout(function() {
      if (window.CheckoutShippingCalculator && window.CheckoutShippingCalculator.calculate) {
        var address = window.CheckoutShippingCalculator.getAddress();
        if (address && address.address && address.city && address.state && address.zip) {
          window.CheckoutShippingCalculator.calculate(address);
        }
      }
    }, 500);
  }

  /**
   * Initialize when ready
   */
  function init() {
    // Try to initialize immediately if Google Maps is already loaded
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      initPlacesAutocomplete();
    } else {
      // Otherwise, try to load it
      loadGooglePlacesAPI();
    }
  }

  // Make init function globally available for callback
  window.initCheckoutPlacesAutocomplete = function() {
    window.googlePlacesLoading = false;
    initPlacesAutocomplete();
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

