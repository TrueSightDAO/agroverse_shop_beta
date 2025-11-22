/**
 * Checkout Form Storage
 * Saves and loads user information for future checkouts
 */

(function() {
  'use strict';

  var STORAGE_KEY = 'agroverse_checkout_info';

  /**
   * Save user information to localStorage
   */
  function saveUserInfo(formData) {
    try {
      var userInfo = {
        fullName: formData.fullName || '',
        email: formData.email || '',
        phone: formData.phone || '',
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        zip: formData.zip || '',
        country: formData.country || 'US',
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(userInfo));
      return true;
    } catch (error) {
      console.error('Error saving user info:', error);
      return false;
    }
  }

  /**
   * Load saved user information from localStorage
   */
  function loadUserInfo() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      return null;
    } catch (error) {
      console.error('Error loading user info:', error);
      return null;
    }
  }

  /**
   * Populate form with saved user information
   * Always restores saved values on page load
   */
  function populateForm(savedInfo) {
    if (!savedInfo) return;

    var form = document.getElementById('checkout-form');
    if (!form) return;

    // Always restore saved values on page load
    if (savedInfo.fullName) {
      var nameInput = form.querySelector('[name="fullName"]');
      if (nameInput) nameInput.value = savedInfo.fullName;
    }

    if (savedInfo.email) {
      var emailInput = form.querySelector('[name="email"]');
      if (emailInput) emailInput.value = savedInfo.email;
    }

    if (savedInfo.phone) {
      var phoneInput = form.querySelector('[name="phone"]');
      if (phoneInput) phoneInput.value = savedInfo.phone;
    }

    if (savedInfo.address) {
      var addressInput = form.querySelector('[name="address"]');
      if (addressInput) addressInput.value = savedInfo.address;
    }

    if (savedInfo.city) {
      var cityInput = form.querySelector('[name="city"]');
      if (cityInput) cityInput.value = savedInfo.city;
    }

    if (savedInfo.state) {
      var stateInput = form.querySelector('[name="state"]');
      if (stateInput) stateInput.value = savedInfo.state;
    }

    if (savedInfo.zip) {
      var zipInput = form.querySelector('[name="zip"]');
      if (zipInput) zipInput.value = savedInfo.zip;
    }

    if (savedInfo.country) {
      var countryInput = form.querySelector('[name="country"]');
      if (countryInput) countryInput.value = savedInfo.country;
    }
  }

  /**
   * Save form data (debounced to avoid too many writes)
   */
  var saveTimeout = null;
  function saveFormDataDebounced() {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(function() {
      var form = document.getElementById('checkout-form');
      if (form) {
        var formData = {
          fullName: form.querySelector('[name="fullName"]').value,
          email: form.querySelector('[name="email"]').value,
          phone: form.querySelector('[name="phone"]').value,
          address: form.querySelector('[name="address"]').value,
          city: form.querySelector('[name="city"]').value,
          state: form.querySelector('[name="state"]').value,
          zip: form.querySelector('[name="zip"]').value,
          country: form.querySelector('[name="country"]').value || 'US'
        };
        saveUserInfo(formData);
      }
    }, 500); // Save 500ms after user stops typing
  }

  /**
   * Initialize form storage
   */
  function initFormStorage() {
    // Load saved info when page loads
    var savedInfo = loadUserInfo();
    if (savedInfo) {
      populateForm(savedInfo);
    }

    // Save info as user types (debounced)
    var form = document.getElementById('checkout-form');
    if (form) {
      // Get all input fields
      var inputs = form.querySelectorAll('input, select');
      
      // Add event listeners to save on change
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('input', saveFormDataDebounced);
        inputs[i].addEventListener('change', saveFormDataDebounced);
      }

      // Also save when form is submitted
      form.addEventListener('submit', function(event) {
        // Clear timeout and save immediately
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        var formData = {
          fullName: form.querySelector('[name="fullName"]').value,
          email: form.querySelector('[name="email"]').value,
          phone: form.querySelector('[name="phone"]').value,
          address: form.querySelector('[name="address"]').value,
          city: form.querySelector('[name="city"]').value,
          state: form.querySelector('[name="state"]').value,
          zip: form.querySelector('[name="zip"]').value,
          country: form.querySelector('[name="country"]').value || 'US'
        };
        saveUserInfo(formData);
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFormStorage);
  } else {
    initFormStorage();
  }

  // Export for external use
  window.CheckoutFormStorage = {
    save: saveUserInfo,
    load: loadUserInfo,
    populate: populateForm
  };

})();

