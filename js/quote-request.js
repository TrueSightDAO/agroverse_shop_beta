/**
 * Quote Request Handler
 * Handles wholesale quote request form submissions
 */

(function() {
  'use strict';

  const config = window.AGROVERSE_CONFIG || {};

  /**
   * Validate quote request form
   */
  function validateQuoteForm(formData) {
    const errors = [];

    // Check at least one product selected
    const selectedProducts = formData.products || [];
    if (selectedProducts.length === 0) {
      errors.push('Please select at least one product');
    }

    // Validate business name
    if (!formData.businessName || formData.businessName.trim().length < 2) {
      errors.push('Business name is required');
    }

    // Validate contact name
    if (!formData.contactName || formData.contactName.trim().length < 2) {
      errors.push('Contact name is required');
    }

    // Validate email
    if (!formData.email || !formData.email.includes('@')) {
      errors.push('Valid email address is required');
    }

    // Validate phone
    if (!formData.phone || formData.phone.trim().length < 10) {
      errors.push('Valid phone number is required');
    }

    // Validate shipping address
    if (!formData.shippingAddress || formData.shippingAddress.trim().length < 10) {
      errors.push('Shipping address is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get form data
   */
  function getFormData(form) {
    const formData = new FormData(form);
    const data = {};

    // Get selected products with quantities
    const products = [];
    const checkboxes = form.querySelectorAll('input[name="products[]"]:checked');
    checkboxes.forEach((checkbox) => {
      const quantityInput = form.querySelector(`input[data-product="${checkbox.id}"]`);
      const quantity = quantityInput ? parseInt(quantityInput.value, 10) || 1 : 1;
      
      products.push({
        productId: checkbox.value,
        quantity: quantity
      });
    });

    data.products = products;
    data.businessName = formData.get('businessName') || '';
    data.contactName = formData.get('contactName') || '';
    data.email = formData.get('email') || '';
    data.phone = formData.get('phone') || '';
    data.companyType = formData.get('companyType') || '';
    data.shippingAddress = formData.get('shippingAddress') || '';
    data.expectedFrequency = formData.get('expectedFrequency') || '';
    data.notes = formData.get('notes') || '';

    return data;
  }

  /**
   * Show form errors
   */
  function showErrors(errors) {
    const errorContainer = document.getElementById('quote-errors');
    if (errorContainer) {
      errorContainer.innerHTML = errors.map(err => 
        `<div class="error-message">${err}</div>`
      ).join('');
      errorContainer.style.display = 'block';
    }
  }

  /**
   * Clear form errors
   */
  function clearErrors() {
    const errorContainer = document.getElementById('quote-errors');
    if (errorContainer) {
      errorContainer.innerHTML = '';
      errorContainer.style.display = 'none';
    }
  }

  /**
   * Show loading state
   */
  function setLoading(loading) {
    const submitButton = document.getElementById('quote-submit');
    const form = document.getElementById('quote-request-form');
    
    if (submitButton) {
      submitButton.disabled = loading;
      submitButton.textContent = loading ? 'Submitting...' : 'Submit Quote Request';
    }
    
    if (form) {
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => input.disabled = loading);
    }
  }

  /**
   * Show success message
   */
  function showSuccess() {
    const successDiv = document.getElementById('quote-success');
    const formContainer = document.getElementById('quote-form-container');
    
    if (successDiv) {
      successDiv.style.display = 'block';
    }
    
    if (formContainer) {
      formContainer.style.display = 'none';
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Submit quote request to Google App Script
   */
  async function submitQuoteRequest(quoteData) {
    const scriptUrl = config.googleScriptUrl;
    
    if (!scriptUrl || scriptUrl.includes('YOUR_')) {
      throw new Error('Google App Script URL not configured. Please set AGROVERSE_CONFIG.googleScriptUrl');
    }

    const payload = {
      action: 'submitQuoteRequest',
      quoteData: quoteData,
      environment: config.environment
    };

    try {
      // Use form-encoded POST to avoid CORS issues with Google App Script Web Apps
      var formData = new URLSearchParams();
      formData.append('action', payload.action);
      formData.append('environment', payload.environment);
      formData.append('quoteData', JSON.stringify(payload.quoteData));
      
      var response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to submit quote request');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('Quote request submission error:', error);
      throw error;
    }
  }

  /**
   * Handle form submission
   */
  async function handleQuoteSubmit(event) {
    event.preventDefault();
    clearErrors();

    const form = event.target;
    const formData = getFormData(form);

    // Validate form
    const validation = validateQuoteForm(formData);
    if (!validation.valid) {
      showErrors(validation.errors);
      return;
    }

    // Show loading
    setLoading(true);

    try {
      // Submit quote request
      await submitQuoteRequest(formData);
      
      // Show success
      showSuccess();
    } catch (error) {
      console.error('Quote request error:', error);
      showErrors([error.message || 'Failed to submit quote request. Please try again or contact us directly.']);
      setLoading(false);
    }
  }

  /**
   * Pre-select product if coming from product page
   */
  function preSelectProduct() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    
    if (productId) {
      const checkbox = document.getElementById(`product-${getProductCheckboxId(productId)}`);
      if (checkbox) {
        checkbox.checked = true;
        // Trigger change event to enable quantity input
        checkbox.dispatchEvent(new Event('change'));
        // Set default quantity to 1
        const quantityInput = document.querySelector(`input[data-product="${checkbox.id}"]`);
        if (quantityInput) {
          quantityInput.value = '1';
        }
        // Scroll to product selection
        setTimeout(() => {
          checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }

  /**
   * Map product ID to checkbox ID
   */
  function getProductCheckboxId(productId) {
    const mapping = {
      'organic-criollo-cacao-beans-oscar-farm': '1',
      'organic-hybrid-cacao-beans-jesus-da-deus': '2',
      'organic-criollo-cacao-nibs-oscar-farm': '3',
      'premium-organic-cacao-beans-la-do-sitio': '4'
    };
    return mapping[productId] || null;
  }

  /**
   * Initialize quote request page
   */
  function initQuoteRequest() {
    const form = document.getElementById('quote-request-form');
    if (form) {
      form.addEventListener('submit', handleQuoteSubmit);
    }

    // Pre-select product if specified in URL
    preSelectProduct();

    // Sync quantity inputs with checkboxes
    const checkboxes = form.querySelectorAll('input[name="products[]"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        const quantityInput = form.querySelector(`input[data-product="${this.id}"]`);
        if (quantityInput) {
          quantityInput.disabled = !this.checked;
          if (!this.checked) {
            quantityInput.value = '';
          } else if (!quantityInput.value) {
            quantityInput.value = '1';
          }
        }
      });
    });

    // Initialize disabled state
    checkboxes.forEach(checkbox => {
      const quantityInput = form.querySelector(`input[data-product="${checkbox.id}"]`);
      if (quantityInput) {
        quantityInput.disabled = !checkbox.checked;
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuoteRequest);
  } else {
    initQuoteRequest();
  }

})();

