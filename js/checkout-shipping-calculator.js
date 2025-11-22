/**
 * Checkout Shipping Calculator
 * Calculates and displays shipping rates on checkout page
 */

(function() {
  'use strict';

  var config = window.AGROVERSE_CONFIG || {};
  var shippingRatesCache = null;
  var lastAddressHash = null;

  /**
   * Calculate shipping rates based on cart and address
   */
  function calculateShippingRates(shippingAddress) {
    // Update cart weights before calculating (fixes legacy cart items)
    if (window.Cart && window.Cart.updateWeights) {
      window.Cart.updateWeights();
    }
    
    var cart = window.Cart ? window.Cart.getCart() : null;
    if (!cart || !cart.items || cart.items.length === 0) {
      return;
    }

    // Check if address is complete
    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.zip) {
      updateShippingDisplay(null, 'Enter your complete address above to see shipping options');
      return;
    }

    // Create address hash to avoid unnecessary API calls
    var addressHash = shippingAddress.address + shippingAddress.city + 
                     shippingAddress.state + shippingAddress.zip;
    
    if (addressHash === lastAddressHash && shippingRatesCache) {
      updateShippingDisplay(shippingRatesCache);
      return;
    }

    // Show loading
    updateShippingDisplay(null, 'Calculating shipping...');

    // Prepare request
    var scriptUrl = config.googleScriptUrl;
    if (!scriptUrl || scriptUrl.includes('YOUR_')) {
      updateShippingDisplay(null, 'Shipping calculator not configured');
      return;
    }

    // Calculate total weight from cart
    var totalWeightOz = 0;
    for (var i = 0; i < cart.items.length; i++) {
      var item = cart.items[i];
      var itemWeight = parseFloat(item.weight) || 0;
      var quantity = parseInt(item.quantity) || 1;
      totalWeightOz += itemWeight * quantity;
    }
    
    // Add base box weight and per-item packaging (matching Google App Script calculation)
    var baseBoxWeight = 11.5; // Base box weight in oz
    var perItemWeight = 0.65; // Per-item packaging in oz
    var totalQuantity = 0;
    for (var j = 0; j < cart.items.length; j++) {
      totalQuantity += parseInt(cart.items[j].quantity) || 1;
    }
    var packageWeightOz = baseBoxWeight + (perItemWeight * totalQuantity);
    totalWeightOz += packageWeightOz;

    // Build URL with query parameters (GET request) - simplified payload
    var params = new URLSearchParams();
    params.append('action', 'calculateShippingRates');
    params.append('environment', config.environment || 'production');
    params.append('weightOz', totalWeightOz.toFixed(2));
    if (shippingAddress) {
      params.append('shippingAddress', JSON.stringify(shippingAddress));
    }
    
    // Use GET request - simpler and no CORS preflight
    fetch(scriptUrl + '?' + params.toString(), {
      method: 'GET'
    })
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      if (data.status === 'success' && data.rates && data.rates.length > 0) {
        shippingRatesCache = data.rates;
        lastAddressHash = addressHash;
        updateShippingDisplay(data.rates);
      } else {
        updateShippingDisplay(null, data.error || 'Unable to calculate shipping rates');
      }
    })
    .catch(function(error) {
      console.error('Error calculating shipping:', error);
      updateShippingDisplay(null, 'Error calculating shipping. Please try again.');
    });
  }

  /**
   * Update checkout submit button state
   */
  function updateSubmitButtonState(enabled, message) {
    var submitButton = document.getElementById('checkout-submit');
    var submitNote = document.getElementById('checkout-submit-note');
    
    if (submitButton) {
      submitButton.disabled = !enabled;
      if (enabled) {
        submitButton.style.opacity = '1';
        submitButton.style.cursor = 'pointer';
      } else {
        submitButton.style.opacity = '0.6';
        submitButton.style.cursor = 'not-allowed';
      }
    }
    
    if (submitNote) {
      submitNote.textContent = message || (enabled ? '' : 'Please select a shipping option above to continue');
      submitNote.style.display = enabled ? 'none' : 'block';
    }
  }

  /**
   * Update shipping display on page with selectable options
   */
  function updateShippingDisplay(rates, message) {
    var shippingEstimate = document.getElementById('shipping-estimate');
    var shippingRatesContainer = document.getElementById('shipping-rates');

    if (!shippingEstimate || !shippingRatesContainer) {
      return;
    }

    if (message) {
      shippingEstimate.textContent = message;
      shippingRatesContainer.innerHTML = '';
      // Clear selected shipping option and disable submit button
      if (window.CheckoutShippingCalculator) {
        window.CheckoutShippingCalculator.setSelectedRate(null);
      }
      updateSubmitButtonState(false, 'Please enter your address to see shipping options');
      return;
    }

    if (!rates || rates.length === 0) {
      shippingEstimate.textContent = 'No shipping options available';
      shippingRatesContainer.innerHTML = '';
      // Clear selected shipping option and disable submit button
      if (window.CheckoutShippingCalculator) {
        window.CheckoutShippingCalculator.setSelectedRate(null);
      }
      updateSubmitButtonState(false, 'No shipping options available. Please contact us for assistance.');
      return;
    }

    // Find cheapest rate (default selection)
    var cheapestRate = rates[0];
    for (var i = 1; i < rates.length; i++) {
      if (rates[i].amount < cheapestRate.amount) {
        cheapestRate = rates[i];
      }
    }

    // Update estimate text
    shippingEstimate.textContent = 'Select shipping option:';
    shippingEstimate.style.color = '';
    shippingEstimate.style.fontWeight = '';

    // Display selectable shipping options as radio buttons
    var ratesHtml = '<div class="shipping-options" style="margin-top: 0.75rem;">';
    for (var j = 0; j < rates.length; j++) {
      var rate = rates[j];
      var isCheapest = rate.id === cheapestRate.id;
      var isChecked = isCheapest ? ' checked' : '';
      var optionClass = isCheapest ? ' shipping-option-selected' : '';
      
      ratesHtml += '<label class="shipping-option' + optionClass + '" data-rate-id="' + rate.id + '">' +
        '<input type="radio" name="shipping-option" value="' + rate.id + '"' + isChecked + 
        ' data-rate-amount="' + rate.amount + '" data-rate-name="' + rate.name + '">' +
        '<div class="shipping-option-details">' +
          '<div class="shipping-option-name">' + rate.name + '</div>' +
          '<div class="shipping-option-info">' +
            '<span class="shipping-option-price">$' + rate.amount.toFixed(2) + '</span>' +
            '<span class="shipping-option-delivery">' + rate.deliveryDays + '</span>' +
          '</div>' +
        '</div>' +
      '</label>';
    }
    ratesHtml += '</div>';
    
    shippingRatesContainer.innerHTML = ratesHtml;

    // Set default selection (cheapest)
    if (window.CheckoutShippingCalculator) {
      window.CheckoutShippingCalculator.setSelectedRate(cheapestRate);
    }
    
    // Enable submit button since we have rates and a default selection
    updateSubmitButtonState(true);

    // Add event listeners to radio buttons
    var radioButtons = shippingRatesContainer.querySelectorAll('input[type="radio"]');
    for (var k = 0; k < radioButtons.length; k++) {
      radioButtons[k].addEventListener('change', function() {
        var selectedId = this.value;
        var selectedRate = null;
        for (var m = 0; m < rates.length; m++) {
          if (rates[m].id === selectedId) {
            selectedRate = rates[m];
            break;
          }
        }
        if (selectedRate && window.CheckoutShippingCalculator) {
          window.CheckoutShippingCalculator.setSelectedRate(selectedRate);
        }
        
        // Update visual selection
        var labels = shippingRatesContainer.querySelectorAll('.shipping-option');
        for (var n = 0; n < labels.length; n++) {
          labels[n].classList.remove('shipping-option-selected');
        }
        if (this.closest('.shipping-option')) {
          this.closest('.shipping-option').classList.add('shipping-option-selected');
        }
        
        // Ensure submit button is enabled when option is selected
        updateSubmitButtonState(true);
      });
    }
  }

  /**
   * Get shipping address from form
   */
  function getShippingAddressFromForm() {
    var form = document.getElementById('checkout-form');
    if (!form) {
      return null;
    }

    var addressInput = form.querySelector('[name="address"]');
    var cityInput = form.querySelector('[name="city"]');
    var stateInput = form.querySelector('[name="state"]');
    var zipInput = form.querySelector('[name="zip"]');
    var countryInput = form.querySelector('[name="country"]');

    if (!addressInput || !cityInput || !stateInput || !zipInput) {
      return null;
    }

    return {
      address: addressInput.value.trim(),
      city: cityInput.value.trim(),
      state: stateInput.value.trim(),
      zip: zipInput.value.trim(),
      country: countryInput ? (countryInput.value || 'US') : 'US'
    };
  }

  /**
   * Initialize shipping calculator
   */
  function initShippingCalculator() {
    var form = document.getElementById('checkout-form');
    if (!form) {
      return;
    }

    // Listen for address changes
    var addressInputs = form.querySelectorAll('[name="address"], [name="city"], [name="state"], [name="zip"]');
    for (var i = 0; i < addressInputs.length; i++) {
      addressInputs[i].addEventListener('blur', function() {
        var address = getShippingAddressFromForm();
        if (address && address.address && address.city && address.state && address.zip) {
          // Debounce - wait a bit after user stops typing
          setTimeout(function() {
            calculateShippingRates(address);
          }, 500);
        }
      });

      addressInputs[i].addEventListener('input', function() {
        // Clear cache when address changes
        lastAddressHash = null;
        shippingRatesCache = null;
      });
    }

    // Also check on page load if address is already filled (from saved data)
    setTimeout(function() {
      var address = getShippingAddressFromForm();
      if (address && address.address && address.city && address.state && address.zip) {
        calculateShippingRates(address);
      }
    }, 1000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShippingCalculator);
  } else {
    initShippingCalculator();
  }
  
  // Initialize submit button as disabled
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      updateSubmitButtonState(false, 'Please enter your address to see shipping options');
    });
  } else {
    updateSubmitButtonState(false, 'Please enter your address to see shipping options');
  }

  // Store selected shipping rate
  var selectedShippingRate = null;

  /**
   * Set the selected shipping rate
   */
  function setSelectedRate(rate) {
    selectedShippingRate = rate;
    // Trigger custom event for other scripts to listen
    var event = new CustomEvent('shippingRateSelected', {
      detail: { rate: rate }
    });
    document.dispatchEvent(event);
  }

  /**
   * Get the selected shipping rate
   */
  function getSelectedRate() {
    return selectedShippingRate;
  }

  // Export for external use
  window.CheckoutShippingCalculator = {
    calculate: calculateShippingRates,
    getAddress: getShippingAddressFromForm,
    setSelectedRate: setSelectedRate,
    getSelectedRate: getSelectedRate,
    updateSubmitButton: updateSubmitButtonState
  };

})();

