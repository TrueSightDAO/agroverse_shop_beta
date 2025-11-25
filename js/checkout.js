/**
 * Checkout Process
 * Handles checkout form and Stripe session creation
 */

(function() {
  'use strict';

  const config = window.AGROVERSE_CONFIG || {};

  /**
   * Validate shipping address form
   */
  function validateShippingForm(formData) {
    const errors = [];
    const fieldErrors = {}; // Track which fields have errors

    if (!formData.fullName || formData.fullName.trim().length < 2) {
      errors.push('Full name is required');
      fieldErrors.fullName = true;
    }

    if (!formData.email || !formData.email.includes('@')) {
      errors.push('Valid email is required');
      fieldErrors.email = true;
    }

    if (!formData.phone || formData.phone.trim().length < 10) {
      errors.push('Valid phone number is required');
      fieldErrors.phone = true;
    }

    if (!formData.address || formData.address.trim().length < 5) {
      errors.push('Street address is required');
      fieldErrors.address = true;
    }

    if (!formData.city || formData.city.trim().length < 2) {
      errors.push('City is required');
      fieldErrors.city = true;
    }

    if (!formData.state || formData.state.trim().length < 2) {
      errors.push('State is required');
      fieldErrors.state = true;
    }

    if (!formData.zip || !/^\d{5}(-\d{4})?$/.test(formData.zip)) {
      errors.push('Valid ZIP code is required');
      fieldErrors.zip = true;
    }

    if (!formData.country) {
      errors.push('Country is required');
      fieldErrors.country = true;
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      fieldErrors: fieldErrors
    };
  }

  /**
   * Get form data
   */
  function getFormData(form) {
    var nameInput = form.querySelector('[name="fullName"]');
    var emailInput = form.querySelector('[name="email"]');
    var phoneInput = form.querySelector('[name="phone"]');
    var addressInput = form.querySelector('[name="address"]');
    var cityInput = form.querySelector('[name="city"]');
    var stateInput = form.querySelector('[name="state"]');
    var zipInput = form.querySelector('[name="zip"]');
    var countryInput = form.querySelector('[name="country"]');

    return {
      fullName: nameInput ? nameInput.value : '',
      email: emailInput ? emailInput.value : '',
      phone: phoneInput ? phoneInput.value : '',
      address: addressInput ? addressInput.value : '',
      city: cityInput ? cityInput.value : '',
      state: stateInput ? stateInput.value : '',
      zip: zipInput ? zipInput.value : '',
      country: countryInput ? countryInput.value : 'US'
    };
  }

  /**
   * Show form errors and highlight invalid fields
   */
  function showErrors(errors, fieldErrors) {
    const errorContainer = document.getElementById('checkout-errors');
    if (errorContainer) {
      errorContainer.innerHTML = errors.map(err => 
        `<div class="error-message">${err}</div>`
      ).join('');
      errorContainer.style.display = 'block';
      
      // Scroll error container into view so user can see it
      errorContainer.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
      
      // Also scroll the submit button into view as a fallback
      const submitButton = document.getElementById('checkout-submit');
      if (submitButton) {
        setTimeout(function() {
          submitButton.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 100);
      }
    }
    
    // Highlight invalid fields
    if (fieldErrors) {
      highlightInvalidFields(fieldErrors);
    }
  }
  
  /**
   * Highlight invalid form fields
   */
  function highlightInvalidFields(fieldErrors) {
    // First, clear all error states
    clearFieldErrors();
    
    // Add error class to invalid fields
    const fieldMap = {
      fullName: 'fullName',
      email: 'email',
      phone: 'phone',
      address: 'address',
      city: 'city',
      state: 'state',
      zip: 'zip',
      country: 'country'
    };
    
    for (const fieldName in fieldErrors) {
      if (fieldErrors[fieldName]) {
        const fieldId = fieldMap[fieldName];
        if (fieldId) {
          const field = document.getElementById(fieldId);
          if (field) {
            field.classList.add('error');
            // Scroll to first invalid field
            if (Object.keys(fieldErrors).indexOf(fieldName) === 0) {
              setTimeout(function() {
                field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                field.focus();
              }, 300);
            }
          }
        }
      }
    }
  }
  
  /**
   * Clear error highlighting from all fields
   */
  function clearFieldErrors() {
    const form = document.getElementById('checkout-form');
    if (form) {
      const fields = form.querySelectorAll('input, select');
      fields.forEach(function(field) {
        field.classList.remove('error');
      });
    }
  }

  /**
   * Clear form errors and field highlighting
   */
  function clearErrors() {
    const errorContainer = document.getElementById('checkout-errors');
    if (errorContainer) {
      errorContainer.innerHTML = '';
      errorContainer.style.display = 'none';
    }
    clearFieldErrors();
  }

  /**
   * Show loading state
   */
  function setLoading(loading) {
    const submitButton = document.getElementById('checkout-submit');
    const form = document.getElementById('checkout-form');
    
    if (submitButton) {
      submitButton.disabled = loading;
      submitButton.textContent = loading ? 'Processing...' : 'Continue to Payment';
    }
    
    if (form) {
      const inputs = form.querySelectorAll('input, select');
      inputs.forEach(input => input.disabled = loading);
    }
  }

  /**
   * Create Stripe checkout session via Google App Script
   */
  async function createCheckoutSession(cart, shippingAddress) {
    const scriptUrl = config.googleScriptUrl;
    
    if (!scriptUrl || scriptUrl.includes('YOUR_')) {
      throw new Error('Google App Script URL not configured. Please set AGROVERSE_CONFIG.googleScriptUrl');
    }

    // Update cart weights before checkout (fixes legacy cart items with weight: 0)
    if (window.Cart && window.Cart.updateWeights) {
      window.Cart.updateWeights();
      // Get updated cart with weights
      cart = window.Cart.getCart();
    }

    // Get selected shipping rate if available
    var selectedShippingRate = null;
    if (window.CheckoutShippingCalculator && window.CheckoutShippingCalculator.getSelectedRate) {
      selectedShippingRate = window.CheckoutShippingCalculator.getSelectedRate();
    }

    // Build URL with query parameters (GET request - simpler and no CORS preflight)
    var params = new URLSearchParams();
    params.append('action', 'createCheckoutSession');
    params.append('environment', config.environment || 'production');
    params.append('cart', JSON.stringify(cart));
    if (shippingAddress) {
      params.append('shippingAddress', JSON.stringify(shippingAddress));
    }
    if (selectedShippingRate && selectedShippingRate.id) {
      params.append('selectedShippingRateId', selectedShippingRate.id);
    }

    try {
      // Use GET request - simpler and no CORS preflight issues
      var response = await fetch(scriptUrl + '?' + params.toString(), {
        method: 'GET'
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to create checkout session');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.checkoutUrl) {
        throw new Error('No checkout URL received');
      }

      return data.checkoutUrl;
    } catch (error) {
      console.error('Checkout session creation error:', error);
      throw error;
    }
  }

  /**
   * Handle form submission
   */
  async function handleCheckoutSubmit(event) {
    event.preventDefault();
    clearErrors();

    const form = event.target;
    const formData = getFormData(form);

    // Validate form
    const validation = validateShippingForm(formData);
    if (!validation.valid) {
      showErrors(validation.errors, validation.fieldErrors);
      return;
    }

    // Check cart
    const cart = window.Cart.getCart();
    if (!cart.items || cart.items.length === 0) {
      showErrors(['Your cart is empty']);
      return;
    }

    // Check if shipping option is selected
    var selectedShippingRate = null;
    if (window.CheckoutShippingCalculator && window.CheckoutShippingCalculator.getSelectedRate) {
      selectedShippingRate = window.CheckoutShippingCalculator.getSelectedRate();
    }
    
    if (!selectedShippingRate) {
      showErrors(['Please select a shipping option before continuing']);
      // Scroll to shipping options
      var shippingSection = document.getElementById('shipping-rates');
      if (shippingSection) {
        shippingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Show loading
    setLoading(true);

    try {
      // Save form data to localStorage before redirecting
      if (window.CheckoutFormStorage && window.CheckoutFormStorage.save) {
        window.CheckoutFormStorage.save(formData);
      }

      // Create checkout session
      var checkoutUrl = await createCheckoutSession(cart, formData);
      
      // Redirect to Stripe
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      showErrors([error.message || 'Failed to process checkout. Please try again.']);
      setLoading(false);
    }
  }

  /**
   * Initialize checkout page
   */
  function initCheckout() {
    const form = document.getElementById('checkout-form');
    if (form) {
      form.addEventListener('submit', handleCheckoutSubmit);
      
      // Clear field errors when user starts typing
      const fields = form.querySelectorAll('input, select');
      fields.forEach(function(field) {
        field.addEventListener('input', function() {
          if (this.classList.contains('error')) {
            this.classList.remove('error');
            // Clear error messages if all fields are valid
            const hasErrors = Array.from(fields).some(function(f) {
              return f.classList.contains('error');
            });
            if (!hasErrors) {
              clearErrors();
            }
          }
        });
        field.addEventListener('change', function() {
          if (this.classList.contains('error')) {
            this.classList.remove('error');
            // Clear error messages if all fields are valid
            const hasErrors = Array.from(fields).some(function(f) {
              return f.classList.contains('error');
            });
            if (!hasErrors) {
              clearErrors();
            }
          }
        });
      });
    }

    // Update cart display on page load
    updateCartDisplay();
  }

  /**
   * Update cart display on checkout page
   * Note: This function only READS the cart, it never modifies it
   */
  function updateCartDisplay() {
    console.log('updateCartDisplay called');
    
    // Wait for Cart to be available
    if (!window.Cart) {
      console.warn('Cart not available yet, retrying...');
      setTimeout(updateCartDisplay, 100);
      return;
    }

    // Get cart - this is read-only, we never modify the cart on checkout page
    var cart = window.Cart.getCart();
    console.log('Cart retrieved:', cart);
    
    // Ensure we have a valid cart structure
    if (!cart || !cart.items) {
      console.warn('Invalid cart structure');
      cart = { items: [] };
    }
    
    var cartItemsContainer = document.getElementById('checkout-cart-items');
    var cartSubtotal = document.getElementById('checkout-subtotal');

    if (!cartItemsContainer) {
      console.warn('Cart items container not found');
      return;
    }

    if (!cart) {
      console.warn('Cart is null');
      cartItemsContainer.innerHTML = '<p style="color: var(--color-text-light);">Unable to load cart. Please refresh the page.</p>';
      return;
    }

    if (!cart.items || cart.items.length === 0) {
      console.log('Cart is empty');
      cartItemsContainer.innerHTML = '<p style="color: var(--color-text-light);">Your cart is empty. <a href="../index.html">Continue shopping</a></p>';
      if (cartSubtotal) {
        cartSubtotal.textContent = '$0.00';
      }
      return;
    }

    console.log('Cart has', cart.items.length, 'items');

    // Render cart items
    console.log('Rendering cart items:', cart.items);
    cartItemsContainer.innerHTML = cart.items.map(item => {
      // Fix image path - handle both absolute and relative paths
      var imageSrc = item.image || '';
      if (imageSrc && !imageSrc.startsWith('http') && !imageSrc.startsWith('/')) {
        // Relative path - ensure it's correct from checkout page
        if (!imageSrc.startsWith('../')) {
          imageSrc = '../' + imageSrc;
        }
      } else if (!imageSrc) {
        imageSrc = '../assets/images/hero/cacao-circles.jpg';
      }
      
      var itemTotal = (item.price || 0) * (item.quantity || 1);
      var itemName = item.name || 'Product';
      var itemQuantity = item.quantity || 1;
      
      return '<div class="checkout-cart-item">' +
        '<img src="' + imageSrc + '" alt="' + itemName + '" class="checkout-cart-item-image" onerror="this.onerror=null; this.src=\'../assets/images/hero/cacao-circles.jpg\';">' +
        '<div class="checkout-cart-item-details">' +
          '<div class="checkout-cart-item-name">' + itemName + '</div>' +
          '<div class="checkout-cart-item-quantity">Quantity: ' + itemQuantity + '</div>' +
        '</div>' +
        '<div class="checkout-cart-item-price">$' + itemTotal.toFixed(2) + '</div>' +
      '</div>';
    }).join('');

    // Update subtotal
    if (cartSubtotal) {
      var subtotal = window.Cart.getSubtotal();
      cartSubtotal.textContent = '$' + subtotal.toFixed(2);
    }

    // Shipping rates will be calculated by checkout-shipping-calculator.js
    // when user enters their address
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCheckout);
  } else {
    initCheckout();
  }

  // Export for external use
  window.Checkout = {
    validateShippingForm: validateShippingForm,
    createCheckoutSession: createCheckoutSession,
    updateCartDisplay: updateCartDisplay
  };

})();

