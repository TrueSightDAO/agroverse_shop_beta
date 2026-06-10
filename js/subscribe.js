/**
 * Subscribe Engine
 * Data-driven subscription flow. Resolves the SKU from the catalog,
 * renders quantity picker + address form, calls the GAS action,
 * and redirects to Stripe Checkout.
 *
 * URL parameter: ?slug=<subscriptionSlug>  (e.g. ?slug=chocolate-bar)
 * The thin wrapper pages (/subscribe/chocolate-bar/) pass this.
 */

(function() {
  'use strict';

  var config = window.AGROVERSE_CONFIG || {};
  var currentProduct = null;

  /**
   * Get the subscription slug from the URL query string.
   */
  function getSubscriptionSlug() {
    var params = new URLSearchParams(window.location.search);
    return params.get('slug');
  }

  /**
   * Resolve the product from the catalog by subscription slug.
   */
  function resolveProduct() {
    var slug = getSubscriptionSlug();
    if (!slug) {
      return null;
    }
    if (window.getProductBySubscriptionSlug) {
      return window.getProductBySubscriptionSlug(slug);
    }
    return null;
  }

  /**
   * Render the product card at the top of the subscribe page.
   */
  function renderProductCard(product) {
    var container = document.getElementById('subscribe-product-card');
    if (!container) return;

    var imageUrl = product.image || '';
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
      imageUrl = '../' + imageUrl;
    }

    container.innerHTML =
      '<img src="' + (imageUrl || '../assets/images/hero/cacao-circles.jpg') + '" alt="' + escapeHtml(product.name) + '" onerror="this.onerror=null; this.src=\'../assets/images/hero/cacao-circles.jpg\';">' +
      '<div class="product-info">' +
        '<div class="product-name">' + escapeHtml(product.name) + '</div>' +
        '<div class="product-price">$' + product.price.toFixed(2) + ' <span>per bar</span></div>' +
      '</div>';
  }

  /**
   * Render quantity preset buttons.
   */
  function renderQuantityPresets(product) {
    var container = document.getElementById('quantity-presets');
    if (!container) return;

    var presets = [3, 6, 12];
    var html = '';
    for (var i = 0; i < presets.length; i++) {
      var qty = presets[i];
      if (qty >= product.minQty && qty <= product.maxQty) {
        var active = (qty === product.defaultQty) ? ' active' : '';
        html += '<button type="button" class="quantity-preset' + active + '" data-qty="' + qty + '">' + qty + ' bars</button>';
      }
    }
    container.innerHTML = html;

    // Attach click handlers
    var buttons = container.querySelectorAll('.quantity-preset');
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].addEventListener('click', function() {
        var qty = parseInt(this.getAttribute('data-qty'), 10);
        setQuantity(qty);
      });
    }
  }

  /**
   * Set the quantity input value and update UI.
   */
  function setQuantity(qty) {
    var input = document.getElementById('subscribe-quantity');
    if (!input) return;

    if (!currentProduct) return;
    qty = Math.max(currentProduct.minQty, Math.min(currentProduct.maxQty, qty));
    input.value = qty;
    updateSummary();
    updatePresetActive(qty);
    updateStepperButtons(qty);
  }

  /**
   * Update which preset button is active.
   */
  function updatePresetActive(qty) {
    var presets = document.querySelectorAll('.quantity-preset');
    for (var i = 0; i < presets.length; i++) {
      var presetQty = parseInt(presets[i].getAttribute('data-qty'), 10);
      if (presetQty === qty) {
        presets[i].classList.add('active');
      } else {
        presets[i].classList.remove('active');
      }
    }
  }

  /**
   * Enable/disable stepper buttons based on bounds.
   */
  function updateStepperButtons(qty) {
    var decBtn = document.getElementById('qty-decrease');
    var incBtn = document.getElementById('qty-increase');
    if (!currentProduct) return;
    if (decBtn) decBtn.disabled = (qty <= currentProduct.minQty);
    if (incBtn) incBtn.disabled = (qty >= currentProduct.maxQty);
  }

  /**
   * Update the subscription summary (quantity, subtotal, shipping, total).
   */
  function updateSummary() {
    var input = document.getElementById('subscribe-quantity');
    if (!input || !currentProduct) return;

    var qty = parseInt(input.value, 10) || currentProduct.defaultQty;
    qty = Math.max(currentProduct.minQty, Math.min(currentProduct.maxQty, qty));

    var unitPrice = currentProduct.price;
    var subtotal = qty * unitPrice;

    var qtyEl = document.getElementById('summary-quantity');
    var unitEl = document.getElementById('summary-unit-price');
    var subEl = document.getElementById('summary-subtotal');
    var shipEl = document.getElementById('summary-shipping');
    var totalEl = document.getElementById('summary-total');

    if (qtyEl) qtyEl.textContent = qty + (qty === 1 ? ' bar' : ' bars');
    if (unitEl) unitEl.textContent = '$' + unitPrice.toFixed(2);
    if (subEl) subEl.textContent = '$' + subtotal.toFixed(2);

    // Update total with shipping if selected
    var shippingAmount = _selectedShippingRate ? _selectedShippingRate.amount : 0;
    if (shipEl) {
      if (_selectedShippingRate) {
        shipEl.textContent = '$' + shippingAmount.toFixed(2);
      } else {
        shipEl.textContent = 'Select below';
      }
    }
    if (totalEl) {
      if (_selectedShippingRate) {
        totalEl.textContent = '$' + (subtotal + shippingAmount).toFixed(2) + '/mo';
      } else {
        totalEl.textContent = 'Select shipping';
      }
    }
  }

  /**
   * Validate the subscribe form.
   */
  function validateForm(formData) {
    var errors = [];
    var fieldErrors = {};

    if (!formData.fullName || formData.fullName.trim().length < 2) {
      errors.push('Full name is required');
      fieldErrors.fullName = true;
    }
    if (!formData.email || formData.email.indexOf('@') === -1) {
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

    return { valid: errors.length === 0, errors: errors, fieldErrors: fieldErrors };
  }

  /**
   * Get form data from the subscribe form.
   */
  function getFormData() {
    var form = document.getElementById('subscribe-form');
    if (!form) return null;

    return {
      fullName: getFieldValue(form, 'fullName'),
      email: getFieldValue(form, 'email'),
      phone: getFieldValue(form, 'phone'),
      address: getFieldValue(form, 'address'),
      city: getFieldValue(form, 'city'),
      state: getFieldValue(form, 'state'),
      zip: getFieldValue(form, 'zip'),
      country: getFieldValue(form, 'country') || 'US'
    };
  }

  function getFieldValue(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value : '';
  }

  /**
   * Show form errors.
   */
  function showErrors(errors, fieldErrors) {
    var container = document.getElementById('subscribe-errors');
    if (container) {
      container.innerHTML = errors.map(function(err) {
        return '<div class="error-message">' + escapeHtml(err) + '</div>';
      }).join('');
    }

    // Highlight invalid fields
    if (fieldErrors) {
      var form = document.getElementById('subscribe-form');
      if (form) {
        var fields = form.querySelectorAll('input, select');
        for (var i = 0; i < fields.length; i++) {
          var name = fields[i].getAttribute('name');
          if (name && fieldErrors[name]) {
            fields[i].classList.add('error');
          } else {
            fields[i].classList.remove('error');
          }
        }
      }
    }
  }

  function clearErrors() {
    var container = document.getElementById('subscribe-errors');
    if (container) {
      container.innerHTML = '';
    }
    var form = document.getElementById('subscribe-form');
    if (form) {
      var fields = form.querySelectorAll('input, select');
      for (var i = 0; i < fields.length; i++) {
        fields[i].classList.remove('error');
      }
    }
  }

  /**
   * Set loading state on the submit button.
   */
  function setLoading(loading) {
    var btn = document.getElementById('subscribe-submit');
    var form = document.getElementById('subscribe-form');
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading ? 'Processing...' : 'Subscribe Now';
    }
    if (form) {
      var inputs = form.querySelectorAll('input, select, button');
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].id !== 'qty-decrease' && inputs[i].id !== 'qty-increase') {
          inputs[i].disabled = loading;
        }
      }
    }
  }

  // --- Shipping calculation (mirrors checkout-shipping-calculator.js) ---
  var _selectedShippingRate = null;
  var _shippingRatesCache = null;
  var _lastAddressHash = null;

  /**
   * Calculate shipping rates for the subscribe page.
   */
  function calculateShipping() {
    var form = document.getElementById('subscribe-form');
    if (!form || !currentProduct) return;

    var address = form.querySelector('[name="address"]').value.trim();
    var city = form.querySelector('[name="city"]').value.trim();
    var state = form.querySelector('[name="state"]').value.trim();
    var zip = form.querySelector('[name="zip"]').value.trim();

    if (!address || !city || !state || !zip) {
      updateShippingDisplay(null, 'Enter your complete address to see shipping options');
      return;
    }

    var addressHash = address + city + state + zip;
    if (addressHash === _lastAddressHash && _shippingRatesCache) {
      updateShippingDisplay(_shippingRatesCache);
      return;
    }

    updateShippingDisplay(null, 'Calculating shipping...');

    var scriptUrl = config.googleScriptUrl;
    var importerOrigin = config.shippingRatesApiOrigin;
    var tryImporter = importerOrigin && String(importerOrigin).indexOf('YOUR_') === -1;

    // Calculate weight: product weight * quantity + packaging
    var qty = parseInt(document.getElementById('subscribe-quantity').value, 10) || currentProduct.defaultQty;
    var totalWeightOz = (parseFloat(currentProduct.weight) || 1.76) * qty;
    var packageWeightOz = 11.5 + (0.65 * qty); // box + per-item packaging
    totalWeightOz += packageWeightOz;

    var shippingAddress = { address: address, city: city, state: state, zip: zip, country: 'US' };

    function fetchFromImporter(origin) {
      var p = new URLSearchParams();
      p.append('weightOz', totalWeightOz.toFixed(2));
      p.append('environment', config.environment || 'production');
      p.append('shippingAddress', JSON.stringify(shippingAddress));
      var url = String(origin).replace(/\/?$/, '') + '/agroverse_shop/shipping_rates?' + p.toString();
      return fetch(url, { method: 'GET' }).then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }

    function fetchFromGas(url) {
      var p = new URLSearchParams();
      p.append('action', 'calculateShippingRates');
      p.append('environment', config.environment || 'production');
      p.append('weightOz', totalWeightOz.toFixed(2));
      p.append('shippingAddress', JSON.stringify(shippingAddress));
      return fetch(url + '?' + p.toString(), { method: 'GET' }).then(function(r) {
        return r.json();
      });
    }

    var importerPromise = tryImporter
      ? fetchFromImporter(importerOrigin).catch(function(e) {
          console.warn('Shipping rates (Edgar) failed, falling back to GAS:', e);
          return null;
        })
      : Promise.resolve(null);

    importerPromise.then(function(data) {
      if (data && data.status === 'success' && data.rates && data.rates.length > 0) {
        _shippingRatesCache = data.rates;
        _lastAddressHash = addressHash;
        updateShippingDisplay(data.rates);
        return null;
      }
      if (!scriptUrl || scriptUrl.includes('YOUR_')) {
        updateShippingDisplay(null, (data && data.error) ? data.error : 'Shipping calculator not configured');
        return null;
      }
      return fetchFromGas(scriptUrl);
    }).then(function(gasData) {
      if (!gasData) return;
      if (gasData.status === 'success' && gasData.rates && gasData.rates.length > 0) {
        _shippingRatesCache = gasData.rates;
        _lastAddressHash = addressHash;
        updateShippingDisplay(gasData.rates);
      } else {
        updateShippingDisplay(null, gasData.error || 'Unable to calculate shipping rates');
      }
    }).catch(function(error) {
      console.error('Error calculating shipping:', error);
      updateShippingDisplay(null, 'Error calculating shipping. Please try again.');
    });
  }

  /**
   * Update the shipping display with rates or a message.
   */
  function updateShippingDisplay(rates, message) {
    var container = document.getElementById('subscribe-shipping-rates');
    var shipEl = document.getElementById('summary-shipping');
    var totalEl = document.getElementById('summary-total');
    var submitBtn = document.getElementById('subscribe-submit');

    if (message) {
      if (container) container.innerHTML = '<div style="color: var(--color-text-light); font-size: 14px; padding: 0.5rem 0;">' + escapeHtml(message) + '</div>';
      _selectedShippingRate = null;
      if (submitBtn) submitBtn.disabled = true;
      if (shipEl) shipEl.textContent = message === 'Calculating shipping...' ? 'Calculating...' : 'Select below';
      if (totalEl) totalEl.textContent = 'Select shipping';
      return;
    }

    if (!rates || rates.length === 0) {
      if (container) container.innerHTML = '<div style="color: #c33; font-size: 14px; padding: 0.5rem 0;">No shipping options available. Please contact us.</div>';
      _selectedShippingRate = null;
      if (submitBtn) submitBtn.disabled = true;
      if (shipEl) shipEl.textContent = 'Unavailable';
      if (totalEl) totalEl.textContent = 'Select shipping';
      return;
    }

    // Find cheapest rate for default selection
    var cheapest = rates[0];
    for (var i = 1; i < rates.length; i++) {
      if (rates[i].amount < cheapest.amount) cheapest = rates[i];
    }
    _selectedShippingRate = cheapest;
    if (submitBtn) submitBtn.disabled = false;

    var html = '<div class="shipping-options" style="margin-top: 0.5rem;">';
    for (var j = 0; j < rates.length; j++) {
      var r = rates[j];
      var checked = r.id === cheapest.id ? ' checked' : '';
      var selected = r.id === cheapest.id ? ' shipping-option-selected' : '';
      html += '<label class="shipping-option' + selected + '" data-rate-id="' + r.id + '" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer; transition: border-color 0.2s;">' +
        '<input type="radio" name="subscribe-shipping-option" value="' + r.id + '"' + checked + ' data-rate-amount="' + r.amount + '" data-rate-name="' + escapeHtml(r.name) + '" style="flex-shrink: 0;">' +
        '<div style="flex: 1;">' +
          '<div style="font-weight: 600; font-size: 15px;">' + escapeHtml(r.name) + '</div>' +
          '<div style="font-size: 14px; color: var(--color-text-light);">' + escapeHtml(r.deliveryDays || '') + '</div>' +
        '</div>' +
        '<div style="font-weight: 700; font-size: 16px;">$' + r.amount.toFixed(2) + '</div>' +
      '</label>';
    }
    html += '</div>';
    if (container) container.innerHTML = html;

    // Attach change listeners
    var radios = container.querySelectorAll('input[type="radio"]');
    for (var k = 0; k < radios.length; k++) {
      radios[k].addEventListener('change', function() {
        var selectedId = this.value;
        for (var m = 0; m < rates.length; m++) {
          if (rates[m].id === selectedId) {
            _selectedShippingRate = rates[m];
            break;
          }
        }
        // Update visual
        var labels = container.querySelectorAll('.shipping-option');
        for (var n = 0; n < labels.length; n++) {
          labels[n].style.borderColor = '#ddd';
        }
        if (this.closest('.shipping-option')) {
          this.closest('.shipping-option').style.borderColor = 'var(--color-primary)';
        }
        updateSummary();
        var btn = document.getElementById('subscribe-submit');
        if (btn) btn.disabled = false;
      });
    }

    updateSummary();
  }

  /**
   * Call the GAS createSubscriptionCheckoutSession action.
   */
  async function createSubscriptionSession(product, quantity, shippingAddress) {
    var scriptUrl = config.googleScriptUrl;
    if (!scriptUrl || scriptUrl.indexOf('YOUR_') !== -1) {
      throw new Error('Google App Script URL not configured.');
    }

    var params = new URLSearchParams();
    params.append('action', 'createSubscriptionCheckoutSession');
    params.append('environment', config.environment || 'production');
    params.append('sku', product.productId);
    params.append('quantity', quantity.toString());
    params.append('shippingAddress', JSON.stringify(shippingAddress));

    var response = await fetch(scriptUrl + '?' + params.toString(), {
      method: 'GET'
    });

    if (!response.ok) {
      var errorText = await response.text();
      throw new Error(errorText || 'Failed to create subscription session');
    }

    var data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    if (!data.checkoutUrl) {
      throw new Error('No checkout URL received');
    }

    return data.checkoutUrl;
  }

  /**
   * Handle form submission.
   */
  async function handleSubmit(event) {
    event.preventDefault();
    clearErrors();

    if (!currentProduct) {
      showErrors(['Product not found. Please check the URL.']);
      return;
    }

    var formData = getFormData();
    var validation = validateForm(formData);
    if (!validation.valid) {
      showErrors(validation.errors, validation.fieldErrors);
      return;
    }

    var qtyInput = document.getElementById('subscribe-quantity');
    var quantity = parseInt(qtyInput ? qtyInput.value : currentProduct.defaultQty, 10);
    quantity = Math.max(currentProduct.minQty, Math.min(currentProduct.maxQty, quantity));

    setLoading(true);

    try {
      var checkoutUrl = await createSubscriptionSession(currentProduct, quantity, formData);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Subscription error:', error);
      showErrors([error.message || 'Failed to process subscription. Please try again.']);
      setLoading(false);
    }
  }

  /**
   * Simple HTML escaping.
   */
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /**
   * Initialize the subscribe engine.
   */
  function init() {
    // Resolve product
    currentProduct = resolveProduct();

    if (!currentProduct) {
      var container = document.getElementById('subscribe-product-card');
      if (container) {
        container.innerHTML = '<div style="text-align: center; width: 100%; color: #c33; font-weight: 600;">Product not found. Please check the subscription link.</div>';
      }
      var btn = document.getElementById('subscribe-submit');
      if (btn) btn.disabled = true;
      return;
    }

    // Render UI
    renderProductCard(currentProduct);
    renderQuantityPresets(currentProduct);

    // Set default quantity
    var qtyInput = document.getElementById('subscribe-quantity');
    if (qtyInput) {
      qtyInput.value = currentProduct.defaultQty;
      qtyInput.min = currentProduct.minQty;
      qtyInput.max = currentProduct.maxQty;
    }

    updateSummary();
    updateStepperButtons(currentProduct.defaultQty);

    // Stepper buttons
    var decBtn = document.getElementById('qty-decrease');
    var incBtn = document.getElementById('qty-increase');

    if (decBtn) {
      decBtn.addEventListener('click', function() {
        var input = document.getElementById('subscribe-quantity');
        if (input) {
          var qty = parseInt(input.value, 10) || currentProduct.defaultQty;
          setQuantity(qty - 1);
        }
      });
    }

    if (incBtn) {
      incBtn.addEventListener('click', function() {
        var input = document.getElementById('subscribe-quantity');
        if (input) {
          var qty = parseInt(input.value, 10) || currentProduct.defaultQty;
          setQuantity(qty + 1);
        }
      });
    }

    // Manual quantity input
    if (qtyInput) {
      qtyInput.addEventListener('input', function() {
        var qty = parseInt(this.value, 10);
        if (!isNaN(qty)) {
          updateSummary();
          updatePresetActive(qty);
          updateStepperButtons(qty);
        }
      });

      qtyInput.addEventListener('blur', function() {
        var qty = parseInt(this.value, 10);
        if (isNaN(qty) || qty < currentProduct.minQty) {
          setQuantity(currentProduct.defaultQty);
        } else {
          setQuantity(qty);
        }
      });
    }

    // Form submit
    var form = document.getElementById('subscribe-form');
    if (form) {
      form.addEventListener('submit', handleSubmit);

      // Clear field errors on input
      var fields = form.querySelectorAll('input, select');
      for (var i = 0; i < fields.length; i++) {
        fields[i].addEventListener('input', function() {
          this.classList.remove('error');
        });
      }

      // Address blur listeners → trigger shipping calculation
      var addressFields = form.querySelectorAll('[name="address"], [name="city"], [name="state"], [name="zip"]');
      for (var j = 0; j < addressFields.length; j++) {
        addressFields[j].addEventListener('blur', function() {
          // Debounce — wait a moment after user leaves the field
          setTimeout(calculateShipping, 500);
        });
        addressFields[j].addEventListener('input', function() {
          // Clear cache when address changes
          _lastAddressHash = null;
          _shippingRatesCache = null;
        });
      }

      // Auto-calculate on page load if address is already filled (from saved data)
      setTimeout(function() {
        var addr = form.querySelector('[name="address"]').value.trim();
        var cty = form.querySelector('[name="city"]').value.trim();
        var ste = form.querySelector('[name="state"]').value.trim();
        var zp = form.querySelector('[name="zip"]').value.trim();
        if (addr && cty && ste && zp) {
          calculateShipping();
        }
      }, 1500);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for testing
  window.SubscribeEngine = {
    resolveProduct: resolveProduct,
    setQuantity: setQuantity,
    getFormData: getFormData,
    validateForm: validateForm
  };

})();
