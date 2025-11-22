/**
 * File: google-app-script/agroverse_shop_checkout.gs
 * Repository: https://github.com/TrueSightDAO/agroverse_shop
 * 
 * Description: Handles Stripe checkout session creation, order polling, and order management
 * for the Agroverse Shop e-commerce platform. Integrates with Google Sheets for order storage
 * and automated tracking email notifications.
 * 
 * Deployment URL: https://script.google.com/macros/s/AKfycbyefqjQnWegrXR9y18HyJMxSM2wWCyucsK5qdh5isJICVhonssajEpT4Dt3hq3A7PTA/exec
 * 
 * SETUP INSTRUCTIONS:
 * 1. Set up Script Properties (Project Settings > Script Properties):
 *    - STRIPE_TEST_SECRET_KEY (test mode secret key)
 *    - STRIPE_LIVE_SECRET_KEY (live mode secret key)
 *    - GOOGLE_SHEET_ID (ID of your Google Sheet)
 *    - GOOGLE_SHEET_NAME (optional, defaults to "Stripe Social Media Checkout ID")
 *    - EASYPOST_API_KEY (optional, for real shipping rate calculation via EasyPost)
 *    - ORIGIN_ADDRESS_LINE1 (warehouse/store street address)
 *    - ORIGIN_ADDRESS_CITY (warehouse/store city)
 *    - ORIGIN_ADDRESS_STATE (warehouse/store state, e.g., "CA")
 *    - ORIGIN_ADDRESS_POSTAL_CODE (warehouse/store ZIP code)
 *    - ORIGIN_ADDRESS_COUNTRY (warehouse/store country, default: "US")
 *    - BASE_BOX_WEIGHT_OZ (base box weight in ounces, default: 11.5)
 *    - PER_ITEM_PACKAGING_OZ (per-item packaging weight in ounces, default: 0.65)
 * 2. Deploy as Web App:
 *    - Click Deploy > New deployment > Web app
 *    - Set "Execute as: Me" and "Who has access: Anyone"
 *    - Copy the Web App URL to js/config.js
 * 3. Set up Time-Driven Trigger for polling:
 *    - Click Triggers (clock icon) > Add Trigger
 *    - Function: syncStripeOrders
 *    - Event source: Time-driven
 *    - Type: Minutes timer
 *    - Interval: Every 5-15 minutes
 * 
 * Endpoints:
 * - POST /exec?action=createCheckoutSession - Create Stripe checkout session
 * - POST /exec?action=submitQuoteRequest - Submit wholesale quote request
 * - POST /exec?action=calculateShippingRates - Calculate shipping rates (for checkout page display)
 * - GET /exec?action=getOrderStatus&sessionId=cs_xxx - Get order status
 * - POST /exec (with stripe-signature header) - Handle Stripe webhook (optional)
 */

// ===== Configuration =====
// Configuration is loaded from Script Properties
// Supports both development and production with a single deployment
function getConfig(environment) {
  var props = PropertiesService.getScriptProperties();
  var env = environment || 'production';
  var isDev = env === 'development';
  
  var stripeSecretKey = isDev 
    ? props.getProperty('STRIPE_TEST_SECRET_KEY') 
    : props.getProperty('STRIPE_LIVE_SECRET_KEY');
  
  // Validate that we have a secret key (starts with "sk_") not a publishable key (starts with "pk_")
  if (stripeSecretKey) {
    if (stripeSecretKey.indexOf('pk_') === 0) {
      Logger.log('ERROR: ' + (isDev ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_LIVE_SECRET_KEY') + ' appears to be a publishable key (starts with pk_). Please use a secret key (starts with sk_).');
      stripeSecretKey = null; // Clear invalid key
    } else if (stripeSecretKey.indexOf('sk_') !== 0) {
      Logger.log('WARNING: ' + (isDev ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_LIVE_SECRET_KEY') + ' does not start with "sk_". Please verify it is a secret key.');
    }
  }
  
  return {
    stripeSecretKey: stripeSecretKey,
    // Webhook secrets are optional - only needed if using webhooks instead of polling
    stripeWebhookSecret: isDev
      ? props.getProperty('STRIPE_TEST_WEBHOOK_SECRET')
      : props.getProperty('STRIPE_LIVE_WEBHOOK_SECRET'),
    sheetId: props.getProperty('GOOGLE_SHEET_ID'),
    sheetName: props.getProperty('GOOGLE_SHEET_NAME') || 'Stripe Social Media Checkout ID',
    environment: env
  };
}

/**
 * Handles POST requests to this web app.
 * 
 * Expected actions:
 * - createCheckoutSession: Create Stripe checkout session
 * - submitQuoteRequest: Submit wholesale quote request
 * - Webhook: Handle Stripe webhook (if stripe-signature header present)
 * 
 * @param {Object} e Event object containing postData and parameters.
 * @return {ContentService.TextOutput} JSON response with results or error.
 */
function doPost(e) {
  try {
    // Handle Stripe webhook (OPTIONAL - only if using webhooks instead of polling)
    if (e.parameter && e.parameter['stripe-signature']) {
      return handleStripeWebhook(e);
    }

    // Parse payload - support both JSON and form-encoded
    var data = {};
    var action;
    
    if (e.postData && e.postData.contents) {
      try {
        // Try JSON first
        var jsonData = JSON.parse(e.postData.contents);
        data = jsonData;
        action = jsonData.action;
      } catch (jsonError) {
        // If not JSON, try form-encoded
        // Form-encoded data comes as e.parameter
        data = e.parameter || {};
        action = data.action;
        
        // Parse JSON strings from form-encoded fields
        if (data.cart) {
          try {
            data.cart = JSON.parse(data.cart);
          } catch (e) {}
        }
        if (data.shippingAddress) {
          try {
            data.shippingAddress = JSON.parse(data.shippingAddress);
          } catch (e) {}
        }
        if (data.quoteData) {
          try {
            data.quoteData = JSON.parse(data.quoteData);
          } catch (e) {}
        }
        // selectedShippingRateId is a simple string, no need to parse
      }
    } else {
      // Use URL parameters if no POST data (GET request)
      data = e.parameter || {};
      action = data.action;
    }
    
    if (!action) {
      return createCORSResponse({
        status: 'error',
        error: 'Missing action parameter'
      });
    }

    if (action === 'createCheckoutSession') {
      return createCheckoutSession(data);
    }

    if (action === 'submitQuoteRequest') {
      return submitQuoteRequest(data);
    }

    if (action === 'calculateShippingRates') {
      return calculateShippingRates(data);
    }

    return createCORSResponse({
      status: 'error',
      error: 'Invalid action'
    });
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return createCORSResponse({
      status: 'error',
      error: error.toString()
    });
  }
}

/**
 * Create JSON response
 * Note: CORS is handled automatically by Google App Script Web App deployment settings
 * Make sure to deploy with "Who has access: Anyone" for CORS to work
 * 
 * @param {Object} data Data to return as JSON
 * @return {ContentService.TextOutput} JSON response
 */
function createCORSResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles GET requests to this web app.
 * 
 * Expected query parameters:
 * - action=getOrderStatus&sessionId=cs_xxx - Get order status by Stripe session ID
 * - action=calculateShippingRates&cart={...}&shippingAddress={...}&environment=development - Calculate shipping rates
 * 
 * @param {Object} e Event object containing parameters.
 * @return {ContentService.TextOutput} JSON response with results or error.
 */
function doGet(e) {
  try {
    var action = e.parameter.action;

    if (action === 'getOrderStatus') {
      var sessionId = e.parameter.sessionId;
      if (!sessionId) {
        return createCORSResponse({
          status: 'error',
          error: 'sessionId parameter is required'
        });
      }
      return getOrderStatus(sessionId);
    }

    if (action === 'calculateShippingRates') {
      // Parse weight and shippingAddress from URL parameters (simplified payload)
      var weightOz = parseFloat(e.parameter.weightOz);
      var shippingAddress = null;
      var environment = e.parameter.environment || 'production';
      
      if (!weightOz || weightOz <= 0) {
        return createCORSResponse({
          status: 'error',
          error: 'weightOz parameter is required and must be greater than 0'
        });
      }
      
      if (e.parameter.shippingAddress) {
        try {
          shippingAddress = JSON.parse(e.parameter.shippingAddress);
        } catch (parseError) {
          Logger.log('Warning: Invalid shippingAddress JSON: ' + parseError.toString());
        }
      }
      
      // Call simplified calculateShippingRates function
      return calculateShippingRatesSimple(weightOz, shippingAddress, environment);
    }

    if (action === 'createCheckoutSession') {
      // Parse cart, shippingAddress, and selectedShippingRateId from URL parameters
      var cart = null;
      var shippingAddress = null;
      var selectedShippingRateId = null;
      var environment = e.parameter.environment || 'production';
      
      if (e.parameter.cart) {
        try {
          cart = JSON.parse(e.parameter.cart);
        } catch (parseError) {
          return createCORSResponse({
            status: 'error',
            error: 'Invalid cart JSON: ' + parseError.toString()
          });
        }
      } else {
        return createCORSResponse({
          status: 'error',
          error: 'cart parameter is required'
        });
      }
      
      if (e.parameter.shippingAddress) {
        try {
          shippingAddress = JSON.parse(e.parameter.shippingAddress);
        } catch (parseError) {
          Logger.log('Warning: Invalid shippingAddress JSON: ' + parseError.toString());
        }
      }
      
      if (e.parameter.selectedShippingRateId) {
        selectedShippingRateId = e.parameter.selectedShippingRateId;
      }
      
      // Call the same createCheckoutSession function used by POST
      return createCheckoutSession({
        cart: cart,
        shippingAddress: shippingAddress,
        selectedShippingRateId: selectedShippingRateId,
        environment: environment
      });
    }

    return createCORSResponse({
      status: 'error',
      error: 'Invalid action. Use: action=getOrderStatus&sessionId=cs_xxx or action=calculateShippingRates&cart={...}&shippingAddress={...}'
    });
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return createCORSResponse({
      status: 'error',
      error: error.toString()
    });
  }
}

/**
 * Create Stripe Checkout Session
 * 
 * @param {Object} data Request data containing cart, shippingAddress, and environment
 * @return {ContentService.TextOutput} JSON response with checkout URL or error
 */
function createCheckoutSession(data) {
  try {
    var cart = data.cart;
    var shippingAddress = data.shippingAddress;
    var environment = data.environment || 'production';
    
    // Get environment-specific configuration
    var CONFIG = getConfig(environment);

    if (!cart || !cart.items || cart.items.length === 0) {
      return createCORSResponse({
        status: 'error',
        error: 'Cart is empty'
      });
    }
    
    // Validate Stripe key is configured
    if (!CONFIG.stripeSecretKey) {
      var keyType = environment === 'development' ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_LIVE_SECRET_KEY';
      return createCORSResponse({
        status: 'error',
        error: 'Stripe ' + environment + ' secret key not configured. Please set ' + keyType + ' in Script Properties.'
      });
    }

    // Build line items for Stripe using price_data (like sentiment_importer)
    // This creates products dynamically without needing pre-created Price IDs
    var lineItems = [];
    for (var i = 0; i < cart.items.length; i++) {
      var item = cart.items[i];
      
      // Validate price
      var priceAmount = parseFloat(item.price) || 0;
      if (priceAmount <= 0) {
        return createCORSResponse({
          status: 'error',
          error: 'Invalid price for product: ' + (item.name || item.productId) + '. Price must be greater than 0.'
        });
      }
      
      // Convert price to cents
      var unitAmount = Math.round(priceAmount * 100);
      
      // Build product image URL (if relative, make it absolute)
      // Stripe requires absolute HTTPS URLs for images (even in test mode)
      var imageUrl = item.image || '';
      
      // Log original image value for debugging
      Logger.log('Processing image for product: ' + item.name);
      Logger.log('  Original image value: ' + (imageUrl || '(empty)'));
      Logger.log('  Product ID: ' + (item.productId || 'N/A'));
      
      if (imageUrl) {
        // Make relative URLs absolute based on environment
        // For localhost development, use beta.agroverse.shop so Stripe can access images
        // Stripe requires publicly accessible HTTPS URLs for images
        var baseUrl;
        if (environment === 'development') {
          // Local development - use beta.agroverse.shop for images (Stripe can't access localhost)
          baseUrl = 'https://beta.agroverse.shop';
        } else {
          // Production - use main domain
          baseUrl = 'https://www.agroverse.shop';
        }
        
        // Ensure image path starts with /
        // Handle both '/assets/...' and 'assets/...' formats
        var imagePath = imageUrl.indexOf('/') === 0 ? imageUrl : '/' + imageUrl;
        imageUrl = baseUrl + imagePath;
        
        // Ensure HTTPS (Stripe requirement - all image URLs must be HTTPS)
        if (imageUrl.indexOf('http://') === 0) {
          imageUrl = imageUrl.replace('http://', 'https://');
        }
        
        // Validate URL format
        if (imageUrl.indexOf('https://') !== 0) {
          Logger.log('  ERROR: Invalid image URL format: ' + imageUrl);
          imageUrl = ''; // Clear invalid URL
        } else {
          Logger.log('  Final image URL: ' + imageUrl);
        }
      } else {
        Logger.log('  WARNING: No image URL for product: ' + item.name + ' (productId: ' + (item.productId || 'N/A') + ')');
        Logger.log('  Cart item data: ' + JSON.stringify({
          productId: item.productId,
          name: item.name,
          hasImage: !!item.image,
          imageValue: item.image
        }));
      }
      
      // Build line item with price_data (dynamic product creation)
      var productData = {
        name: item.name || 'Product',
        description: item.name || 'Product'
      };
      
      // Only include images if we have a valid image URL
      // Stripe will ignore empty arrays, so we only add the field if there's an image
      if (imageUrl) {
        productData.images = [imageUrl];
        Logger.log('  Adding image to Stripe product: ' + imageUrl);
      } else {
        Logger.log('  WARNING: No image URL for product "' + item.name + '" - images array will be empty');
      }
      
      var lineItem = {
        quantity: parseInt(item.quantity) || 1,
        price_data: {
          currency: 'usd',
          unit_amount: unitAmount,
          product_data: productData
        }
      };
      
      lineItems.push(lineItem);
      Logger.log('  Line item created for: ' + item.name + ' (quantity: ' + lineItem.quantity + ', price: $' + (unitAmount / 100).toFixed(2) + ')');
    }

    // Determine success and cancel URLs based on environment
    var baseUrl = environment === 'development' 
      ? 'http://127.0.0.1:8000' 
      : 'https://www.agroverse.shop';

    var successUrl = baseUrl + '/order-status?session_id={CHECKOUT_SESSION_ID}';
    var cancelUrl = baseUrl + '/checkout';

    // Calculate package weight (product weights + packaging)
    // Note: Product weights should be in cart.items[].weight (in ounces)
    var totalWeightOz = calculatePackageWeight(cart);
    
    // Calculate shipping rates via EasyPost only (no fallback)
    var shippingOptions = [];
    if (totalWeightOz > 0) {
      shippingOptions = calculateShippingRatesViaEasyPost(totalWeightOz, shippingAddress);
    }
    
    // Return error if no shipping rates available (don't use fallback)
    if (shippingOptions.length === 0) {
      return createCORSResponse({
        status: 'error',
        error: 'Unable to calculate shipping rates. Please ensure EasyPost API is configured and address is valid.'
      });
    }

    // Create Stripe checkout session
    var payload = {
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      shipping_address_collection: {
        allowed_countries: ['US']
      },
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true
      },
      metadata: {
        cartSessionId: cart.sessionId || '',
        environment: environment,
        source: 'agroverse_shop'
      }
    };

    // Add shipping options if we have them
    if (shippingOptions && shippingOptions.length > 0) {
      payload.shipping_options = shippingOptions;
      
      // If user selected a specific shipping rate, pre-select it
      var selectedShippingRateId = data.selectedShippingRateId;
      if (selectedShippingRateId) {
        // Find the matching shipping rate in our options
        // Note: The selectedShippingRateId from frontend is like "rate_0", "rate_1"
        // We need to map it to the actual Stripe shipping rate ID
        // For now, we'll use the index to find the matching option
        var rateIndex = null;
        if (selectedShippingRateId.indexOf('rate_') === 0) {
          rateIndex = parseInt(selectedShippingRateId.replace('rate_', ''));
          if (!isNaN(rateIndex) && rateIndex >= 0 && rateIndex < shippingOptions.length) {
            // Pre-select the shipping rate by using shipping_rate instead of shipping_options
            // But we still include shipping_options so user can change it in Stripe
            // Actually, Stripe doesn't support pre-selection via API, so we'll just
            // include all options and let Stripe show them. The user's selection
            // on our page is for their awareness, but Stripe will still show options.
            // We could potentially use shipping_rate (singular) to force a specific one,
            // but that would prevent users from changing it in Stripe.
            // For now, we'll pass all options and let Stripe handle the selection.
          }
        }
      }
    }

    // Note: We keep shipping_address_collection enabled so Stripe can show shipping options
    // The address collected on our form is used for metadata, but Stripe will collect
    // the shipping address during checkout to calculate/display shipping rates properly

    // Log payload for debugging (especially line items with images)
    Logger.log('Creating Stripe checkout session with ' + lineItems.length + ' line items');
    for (var li = 0; li < lineItems.length; li++) {
      var liItem = lineItems[li];
      Logger.log('  Line item ' + (li + 1) + ': ' + (liItem.price_data.product_data.name || 'Unknown'));
      if (liItem.price_data.product_data.images && liItem.price_data.product_data.images.length > 0) {
        Logger.log('    Image: ' + liItem.price_data.product_data.images[0]);
      } else {
        Logger.log('    Image: (none)');
      }
    }
    
    var formData = buildFormData(payload);
    Logger.log('Form data length: ' + formData.length + ' characters');
    Logger.log('Form data preview (first 500 chars): ' + formData.substring(0, 500));
    
    var response = UrlFetchApp.fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + CONFIG.stripeSecretKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      payload: formData,
      muteHttpExceptions: true // Get full error messages
    });
    
    // Check for errors
    var responseText = response.getContentText();
    if (response.getResponseCode() !== 200) {
      Logger.log('Stripe API Error Response: ' + responseText);
      var errorData = JSON.parse(responseText);
      throw new Error('Stripe API error: ' + (errorData.error ? errorData.error.message : responseText));
    }

    var session = JSON.parse(responseText);

    if (session.error) {
      return createCORSResponse({
        status: 'error',
        error: session.error.message
      });
    }

    return createCORSResponse({
      status: 'success',
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    Logger.log('Error creating checkout session: ' + error.toString());
    return createCORSResponse({
      status: 'error',
      error: error.toString()
    });
  }
}

/**
 * Handle Stripe webhook (OPTIONAL - not required if using polling)
 * 
 * NOTE: This function is kept for backward compatibility but is not required
 * if you're using the polling approach (syncStripeOrders).
 * 
 * If you want to use webhooks instead of polling:
 * 1. Set up webhook endpoint in Stripe Dashboard
 * 2. Point it to your Google App Script Web App URL
 * 3. Implement proper signature verification
 * 4. This function will then be called automatically
 */
function handleStripeWebhook(e) {
  try {
    var signature = e.parameter['stripe-signature'];
    var payload = e.postData.contents;

    // TODO: Implement webhook signature verification if using webhooks
    // For now, we use polling (syncStripeOrders) instead

    var event = JSON.parse(payload);

    if (event.type === 'checkout.session.completed') {
      var session = event.data.object;
      // Get environment from session metadata or default to production
      var environment = session.metadata && session.metadata.environment ? session.metadata.environment : 'production';
      
      // Retrieve full session with line items for accurate order data
      var CONFIG = getConfig(environment);
      var fullSession = retrieveStripeSession(session.id, CONFIG.stripeSecretKey);
      
      // Use full session if available, otherwise use the session from webhook
      var sessionToSave = fullSession || session;
      saveOrderToSheet(sessionToSave, environment);
    }

    return createCORSResponse({
      received: true
    });
  } catch (error) {
    Logger.log('Error handling webhook: ' + error.toString());
    return createCORSResponse({
      error: error.toString()
    });
  }
}

/**
 * Calculate shipping rates (simplified - just weight and address)
 * Returns shipping rates without creating a checkout session
 * 
 * @param {Number} weightOz Total package weight in ounces
 * @param {Object} shippingAddress Customer shipping address (optional)
 * @param {String} environment Environment (development/production)
 * @return {ContentService.TextOutput} JSON response with shipping rates or error
 */
function calculateShippingRatesSimple(weightOz, shippingAddress, environment) {
  try {
    if (!weightOz || weightOz <= 0) {
      return createCORSResponse({
        status: 'error',
        error: 'Invalid weight: ' + weightOz + ' oz'
      });
    }
    
    // Calculate shipping rates via EasyPost only (no fallback)
    var shippingOptions = calculateShippingRatesViaEasyPost(weightOz, shippingAddress);
    
    // Return error if no shipping rates available (don't use fallback)
    if (shippingOptions.length === 0) {
      return createCORSResponse({
        status: 'error',
        error: 'Unable to calculate shipping rates. Please ensure EasyPost API is configured and address is valid. Check Google App Script logs for details.'
      });
    }
    
    // Format rates for display (convert to dollars, add delivery info)
    var formattedRates = [];
    for (var j = 0; j < shippingOptions.length; j++) {
      var rate = shippingOptions[j];
      var amountCents = rate.shipping_rate_data.fixed_amount.amount || 0;
      var amountDollars = (amountCents / 100).toFixed(2);
      var displayName = rate.shipping_rate_data.display_name || 'Shipping';
      var deliveryEstimate = rate.shipping_rate_data.delivery_estimate || {};
      var minDays = deliveryEstimate.minimum ? deliveryEstimate.minimum.value : 3;
      var maxDays = deliveryEstimate.maximum ? deliveryEstimate.maximum.value : 7;
      
      formattedRates.push({
        id: 'rate_' + j,
        name: displayName,
        amount: parseFloat(amountDollars),
        amountCents: amountCents,
        deliveryDays: minDays + '-' + maxDays + ' business days'
      });
    }
    
    return createCORSResponse({
      status: 'success',
      rates: formattedRates,
      totalWeightOz: weightOz
    });
  } catch (error) {
    Logger.log('Error calculating shipping rates: ' + error.toString());
    return createCORSResponse({
      status: 'error',
      error: error.toString()
    });
  }
}

/**
 * Calculate shipping rates (legacy - for backward compatibility with POST requests)
 * Returns shipping rates without creating a checkout session
 * 
 * @param {Object} data Request data containing cart, shippingAddress, and environment
 * @return {ContentService.TextOutput} JSON response with shipping rates or error
 */
function calculateShippingRates(data) {
  try {
    var cart = data.cart;
    var shippingAddress = data.shippingAddress;
    var environment = data.environment || 'production';
    
    if (!cart || !cart.items || cart.items.length === 0) {
      return createCORSResponse({
        status: 'error',
        error: 'Cart is empty'
      });
    }
    
    // Calculate package weight
    var totalWeightOz = calculatePackageWeight(cart);
    
    // Check if products have weights
    var hasProductWeights = false;
    for (var w = 0; w < cart.items.length; w++) {
      if (cart.items[w].weight && parseFloat(cart.items[w].weight) > 0) {
        hasProductWeights = true;
        break;
      }
    }
    
    if (!hasProductWeights) {
      return createCORSResponse({
        status: 'error',
        error: 'Products are missing weight information. Please refresh the checkout page to update cart weights, or clear your cart and re-add items.'
      });
    }
    
    // Use simplified function
    return calculateShippingRatesSimple(totalWeightOz, shippingAddress, environment);
  } catch (error) {
    Logger.log('Error calculating shipping rates: ' + error.toString());
    return createCORSResponse({
      status: 'error',
      error: error.toString()
    });
  }
}

/**
 * Calculate total package weight
 * Includes product weights + base box weight + per-item packaging
 * Similar to sentiment_importer implementation
 * 
 * @param {Object} cart Cart object with items
 * @return {Number} Total weight in ounces
 */
function calculatePackageWeight(cart) {
  var props = PropertiesService.getScriptProperties();
  
  // Base box weight (fixed, regardless of items)
  // Default: 11.5 oz (can be overridden via Script Properties)
  var baseBoxWeight = parseFloat(props.getProperty('BASE_BOX_WEIGHT_OZ')) || 11.5;
  
  // Per-item packaging weight (bubble wrap, padding per item)
  // Default: 0.65 oz (can be overridden via Script Properties)
  var perItemWeight = parseFloat(props.getProperty('PER_ITEM_PACKAGING_OZ')) || 0.65;
  
  // Calculate product weight
  var productWeightOz = 0;
  var totalQuantity = 0;
  
  for (var i = 0; i < cart.items.length; i++) {
    var item = cart.items[i];
    var itemWeight = parseFloat(item.weight) || 0; // Product weight in ounces
    
    // If weight is missing (0), log a warning but continue
    // Note: Frontend should include weights, but this handles legacy cart items
    if (itemWeight <= 0) {
      Logger.log('WARNING: Product ' + (item.productId || item.name) + ' has no weight. Using 0 for this item.');
    }
    
    var quantity = parseInt(item.quantity) || 1;
    productWeightOz += itemWeight * quantity;
    totalQuantity += quantity;
  }
  
  // Package weight = base box + per-item packaging
  var packageWeightOz = baseBoxWeight + (perItemWeight * totalQuantity);
  
  // Total weight = product weight + package weight
  var totalWeightOz = productWeightOz + packageWeightOz;
  
  return totalWeightOz;
}

/**
 * Calculate shipping rates via EasyPost API
 * Similar to sentiment_importer ShippingCalculatorService
 * 
 * @param {Number} weightOz Package weight in ounces
 * @param {Object} shippingAddress Customer shipping address (optional, uses default if not provided)
 * @return {Array} Array of shipping rate objects for Stripe
 */
function calculateShippingRatesViaEasyPost(weightOz, shippingAddress) {
  try {
    var props = PropertiesService.getScriptProperties();
    var easypostApiKey = props.getProperty('EASYPOST_API_KEY');
    
    if (!easypostApiKey) {
      Logger.log('ERROR: EasyPost API key not configured. Set EASYPOST_API_KEY in Script Properties.');
      return [];
    }
    
    if (weightOz <= 0) {
      Logger.log('ERROR: Invalid weight for EasyPost calculation: ' + weightOz + ' oz. Products may be missing weight data.');
      return [];
    }
    
    // Get origin address from Script Properties with hardcoded defaults
    // Similar to sentiment_importer: ENV.fetch('KEY', 'default')
    var originAddress = {
      street1: props.getProperty('ORIGIN_ADDRESS_LINE1') || '1423 Hayes St',
      street2: props.getProperty('ORIGIN_ADDRESS_LINE2') || '',
      city: props.getProperty('ORIGIN_ADDRESS_CITY') || 'San Francisco',
      state: props.getProperty('ORIGIN_ADDRESS_STATE') || 'CA',
      zip: props.getProperty('ORIGIN_ADDRESS_POSTAL_CODE') || '94117',
      country: props.getProperty('ORIGIN_ADDRESS_COUNTRY') || 'US'
    };
    
    Logger.log('Origin address: ' + originAddress.street1 + ', ' + originAddress.city + ', ' + originAddress.state + ' ' + originAddress.zip);
    
    // Use customer address if provided, otherwise use default (center of US)
    var destinationAddress;
    if (shippingAddress && shippingAddress.address) {
      destinationAddress = {
        street1: shippingAddress.address || '',
        city: shippingAddress.city || '',
        state: shippingAddress.state || '',
        zip: shippingAddress.zip || '',
        country: shippingAddress.country || 'US'
      };
    } else {
      // Default destination for initial rate calculation
      destinationAddress = {
        street1: '1600 Pennsylvania Avenue NW',
        city: 'Washington',
        state: 'DC',
        zip: '20500',
        country: 'US'
      };
    }
    
    // Create shipment with parcel included directly (no need for separate parcel creation)
    var shipmentPayload = {
      to_address: destinationAddress,
      from_address: originAddress,
      parcel: {
        weight: weightOz,
        length: 10, // Default dimensions
        width: 10,
        height: 10
      }
    };
    
    Logger.log('Creating shipment with payload: ' + JSON.stringify(shipmentPayload));
    
    var shipmentResponse = UrlFetchApp.fetch('https://api.easypost.com/v2/shipments', {
      method: 'post',
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(easypostApiKey + ':'),
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({ shipment: shipmentPayload }),
      muteHttpExceptions: true
    });
    
    var shipmentResponseCode = shipmentResponse.getResponseCode();
    var shipmentResponseText = shipmentResponse.getContentText();
    
    Logger.log('EasyPost shipment API response code: ' + shipmentResponseCode);
    Logger.log('EasyPost shipment API response (first 500 chars): ' + shipmentResponseText.substring(0, 500));
    
    if (shipmentResponseCode !== 201) {
      Logger.log('ERROR: EasyPost shipment creation failed (code ' + shipmentResponseCode + '): ' + shipmentResponseText);
      return [];
    }
    
    var shipmentData;
    try {
      shipmentData = JSON.parse(shipmentResponseText);
      Logger.log('Shipment response keys: ' + Object.keys(shipmentData).join(', '));
    } catch (parseError) {
      Logger.log('ERROR: Failed to parse EasyPost shipment response: ' + parseError.toString());
      Logger.log('Response text: ' + shipmentResponseText);
      return [];
    }
    
    // Check for error in response
    if (shipmentData.error) {
      Logger.log('ERROR: EasyPost API error: ' + JSON.stringify(shipmentData.error));
      return [];
    }
    
    // EasyPost returns shipment data directly at root level (not nested under 'shipment')
    // Handle both formats: shipmentData.shipment (nested) or shipmentData (root)
    var shipment = shipmentData.shipment || shipmentData;
    if (!shipment || !shipment.rates) {
      Logger.log('ERROR: No shipment object or rates in response. Response keys: ' + Object.keys(shipmentData).join(', '));
      Logger.log('Response structure (first 1000 chars): ' + JSON.stringify(shipmentData).substring(0, 1000));
      return [];
    }
    
    var rates = shipment.rates || [];
    
    Logger.log('EasyPost returned ' + rates.length + ' total rates');
    
    // Filter for USPS rates only
    var uspsRates = [];
    for (var i = 0; i < rates.length; i++) {
      if (rates[i].carrier === 'USPS') {
        uspsRates.push(rates[i]);
      }
    }
    
    Logger.log('Found ' + uspsRates.length + ' USPS rates');
    
    if (uspsRates.length === 0) {
      Logger.log('WARNING: No USPS rates found. Available carriers: ' + rates.map(function(r) { return r.carrier; }).join(', '));
    }
    
    // Convert to Stripe shipping rate format
    var shippingOptions = [];
    for (var j = 0; j < uspsRates.length; j++) {
      var rate = uspsRates[j];
      var rateValue = parseFloat(rate.rate || rate.price || 0);
      var serviceName = rate.service || 'Standard';
      
      shippingOptions.push({
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: {
            amount: Math.round(rateValue * 100), // Convert to cents
            currency: 'usd'
          },
          display_name: serviceName + ' - USPS',
          delivery_estimate: estimateFromService(serviceName)
        }
      });
    }
    
    // Sort by price (cheapest first)
    shippingOptions.sort(function(a, b) {
      var amountA = a.shipping_rate_data.fixed_amount.amount || Infinity;
      var amountB = b.shipping_rate_data.fixed_amount.amount || Infinity;
      return amountA - amountB;
    });
    
    Logger.log('Returning ' + shippingOptions.length + ' shipping options from EasyPost');
    return shippingOptions;
  } catch (error) {
    Logger.log('ERROR: Exception in calculateShippingRatesViaEasyPost: ' + error.toString());
    Logger.log('Stack trace: ' + (error.stack || 'N/A'));
    return [];
  }
}

/**
 * Estimate delivery time from USPS service name
 * 
 * @param {String} serviceName USPS service name
 * @return {Object} Delivery estimate object
 */
function estimateFromService(serviceName) {
  var service = serviceName.toLowerCase();
  
  if (service.indexOf('priority mail express') !== -1) {
    return { minimum: { unit: 'business_day', value: 1 }, maximum: { unit: 'business_day', value: 2 } };
  } else if (service.indexOf('priority mail') !== -1) {
    return { minimum: { unit: 'business_day', value: 2 }, maximum: { unit: 'business_day', value: 3 } };
  } else if (service.indexOf('first-class') !== -1) {
    return { minimum: { unit: 'business_day', value: 3 }, maximum: { unit: 'business_day', value: 5 } };
  } else if (service.indexOf('parcel select') !== -1) {
    return { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 7 } };
  } else {
    return { minimum: { unit: 'business_day', value: 3 }, maximum: { unit: 'business_day', value: 7 } };
  }
}

/**
 * Build shipping rates based on order total (FALLBACK)
 * Similar to sentiment_importer implementation
 * 
 * @param {Number} orderTotalCents Order total in cents
 * @return {Array} Array of shipping rate objects for Stripe
 */
function buildShippingRates(orderTotalCents) {
  var currency = 'usd';
  var rates = [];
  
  // Standard shipping: $5.00 (500 cents)
  rates.push({
    shipping_rate_data: {
      type: 'fixed_amount',
      fixed_amount: {
        amount: 500, // $5.00 in cents
        currency: currency
      },
      display_name: 'Standard Shipping',
      delivery_estimate: {
        minimum: { unit: 'business_day', value: 3 },
        maximum: { unit: 'business_day', value: 7 }
      }
    }
  });
  
  // Express shipping
  rates.push({
    shipping_rate_data: {
      type: 'fixed_amount',
      fixed_amount: {
        amount: 1500, // $15.00 in cents
        currency: currency
      },
      display_name: 'Express Shipping',
      delivery_estimate: {
        minimum: { unit: 'business_day', value: 1 },
        maximum: { unit: 'business_day', value: 3 }
      }
    }
  });
  
  // Sort by price (cheapest first) - Stripe will auto-select the first option
  rates.sort(function(a, b) {
    var amountA = a.shipping_rate_data.fixed_amount.amount || Infinity;
    var amountB = b.shipping_rate_data.fixed_amount.amount || Infinity;
    return amountA - amountB;
  });
  
  return rates;
}

/**
 * Save order to Google Sheet
 * Matches existing "Stripe Social Media Checkout ID" sheet structure
 * Columns: Timestamp | Customer Name | Stripe Session ID | Wix Order Number | Wix Order ID | Items Purchased | Total Quantity | Amount | Currency
 */
function saveOrderToSheet(session, environment) {
  try {
    // Get config - use environment if provided, otherwise default to production
    var CONFIG = getConfig(environment || 'production');
    var sheet = SpreadsheetApp.openById(CONFIG.sheetId).getSheetByName(CONFIG.sheetName);
    
    // Check if order already exists (idempotency) - check by Stripe Session ID
    var existingRow = findOrderRowBySessionId(sheet, session.id);
    if (existingRow > 0) {
      Logger.log('Order already exists: ' + session.id);
      return;
    }

    // Extract order data
    var customerName = (session.customer_details && session.customer_details.name) || 
                        (session.shipping_details && session.shipping_details.name) || 
                        session.customer_email || 
                        'Unknown';
    var customerEmail = (session.customer_details && session.customer_details.email) || session.customer_email || '';
    
    // Get line items from session
    // Note: In checkout.session.completed webhook, we need to retrieve line items separately
    var lineItems = (session.line_items && session.line_items.data) || [];
    
    // Calculate totals
    var totalQuantity = 0;
    var totalAmount = 0;
    var itemsList = [];
    
    if (lineItems && lineItems.length > 0) {
      for (var i = 0; i < lineItems.length; i++) {
        var item = lineItems[i];
        var quantity = item.quantity || 1;
        var amount = (item.amount_total || 0) / 100; // Convert from cents
        totalQuantity += quantity;
        totalAmount += amount;
        itemsList.push((item.description || 'Product') + ' (x' + quantity + ')');
      }
    } else {
      // Fallback if line items not available
      totalQuantity = 1;
      totalAmount = (session.amount_total || 0) / 100;
      itemsList.push('Product');
    }

    // Format items purchased as comma-separated list
    var itemsPurchased = itemsList.join(', ');

    // Get currency
    var currency = (session.currency && session.currency.toUpperCase()) || 'USD';

    // Map to existing sheet structure:
    // Timestamp | Customer Name | Stripe Session ID | Wix Order Number | Wix Order ID | Items Purchased | Total Quantity | Amount | Currency
    var row = [
      new Date().toISOString(), // Timestamp
      customerName, // Customer Name
      session.id, // Stripe Session ID
      '', // Wix Order Number (empty - not using Wix)
      '', // Wix Order ID (empty - not using Wix)
      itemsPurchased, // Items Purchased
      totalQuantity, // Total Quantity
      totalAmount, // Amount
      currency // Currency
    ];

    sheet.appendRow(row);
    Logger.log('Order saved: ' + session.id);
  } catch (error) {
    Logger.log('Error saving order: ' + error.toString());
    throw error;
  }
}

/**
 * Get order status - pull from Stripe first, then augment with Google Sheet data
 * This ensures we always have the most complete order information
 */
function getOrderStatus(sessionId) {
  try {
    // Try both environments (development and production)
    var environments = ['development', 'production'];
    var stripeSession = null;
    var foundEnvironment = null;
    
    // First, try to fetch from Stripe (primary source of truth)
    Logger.log('Looking for session: ' + sessionId);
    Logger.log('Trying environments: ' + environments.join(', '));
    
    for (var envIdx = 0; envIdx < environments.length; envIdx++) {
      var env = environments[envIdx];
      var CONFIG = getConfig(env);
      
      Logger.log('Checking ' + env + ' environment...');
      
      if (!CONFIG.stripeSecretKey) {
        Logger.log('  Skipping ' + env + ' - Stripe key not configured');
        continue; // Skip if Stripe key not configured for this environment
      }
      
      Logger.log('  Stripe key configured (length: ' + CONFIG.stripeSecretKey.length + ')');
      
      try {
        // Try to retrieve session from Stripe
        stripeSession = retrieveStripeSession(sessionId, CONFIG.stripeSecretKey);
        
        if (stripeSession) {
          Logger.log('  ✓ Found session in ' + env + ' environment');
          Logger.log('  Session ID: ' + stripeSession.id);
          Logger.log('  Payment Status: ' + (stripeSession.payment_status || 'N/A'));
          foundEnvironment = env;
          break; // Found it, stop searching
        } else {
          Logger.log('  ✗ Session not found in ' + env + ' environment');
        }
      } catch (stripeError) {
        Logger.log('  ✗ Error fetching from Stripe (' + env + '): ' + stripeError.toString());
        Logger.log('  Stack: ' + stripeError.stack);
        continue;
      }
    }
    
    // If not found in Stripe, return error with more details
    if (!stripeSession) {
      Logger.log('Order not found in Stripe: ' + sessionId);
      Logger.log('Searched in environments: ' + environments.join(', '));
      return createCORSResponse({
        status: 'error',
        error: 'Order not found. Please verify the order number is correct.'
      });
    }
    
    // Extract order data from Stripe session
    var customerName = (stripeSession.customer_details && stripeSession.customer_details.name) || 
                        (stripeSession.shipping_details && stripeSession.shipping_details.name) || 
                        stripeSession.customer_email || 
                        'Unknown';
    
    var customerEmail = (stripeSession.customer_details && stripeSession.customer_details.email) || 
                        stripeSession.customer_email || '';
    
    // Get line items
    var lineItems = (stripeSession.line_items && stripeSession.line_items.data) || [];
    var items = [];
    var totalQuantity = 0;
    var totalAmount = 0;
    
    for (var i = 0; i < lineItems.length; i++) {
      var item = lineItems[i];
      var quantity = item.quantity || 1;
      var amount = (item.amount_total || 0) / 100; // Convert from cents
      var description = item.description || 'Product';
      
      // Extract product image from Stripe line item
      // Images are in item.price.product.images array
      var productImage = null;
      if (item.price && item.price.product && item.price.product.images && item.price.product.images.length > 0) {
        productImage = item.price.product.images[0]; // Use first image
      }
      
      items.push({
        name: description,
        quantity: quantity,
        price: amount / quantity, // Price per item
        image: productImage || null // Product image URL
      });
      
      totalQuantity += quantity;
      totalAmount += amount;
    }
    
    // If no line items, use session totals
    if (items.length === 0) {
      totalAmount = (stripeSession.amount_total || 0) / 100;
      totalQuantity = 1;
      items.push({
        name: 'Product',
        quantity: 1,
        price: totalAmount
      });
    }
    
    // Extract shipping address from Stripe
    // Check multiple possible locations for shipping address
    var shippingAddress = null;
    
    // Log available shipping-related fields for debugging
    Logger.log('Checking for shipping address in session: ' + sessionId);
    Logger.log('  shipping_details exists: ' + !!stripeSession.shipping_details);
    Logger.log('  shipping exists: ' + !!stripeSession.shipping);
    Logger.log('  payment_status: ' + (stripeSession.payment_status || 'N/A'));
    
    // Try shipping_details first (most common for checkout sessions)
    if (stripeSession.shipping_details && stripeSession.shipping_details.address) {
      var shipping = stripeSession.shipping_details;
      shippingAddress = {
        fullName: shipping.name || customerName || '',
        address: shipping.address.line1 + (shipping.address.line2 ? ', ' + shipping.address.line2 : ''),
        city: shipping.address.city || '',
        state: shipping.address.state || '',
        zip: shipping.address.postal_code || '',
        country: shipping.address.country || 'US'
      };
      Logger.log('  ✓ Found shipping address in shipping_details');
    } 
    // Try shipping field (alternative location)
    else if (stripeSession.shipping && stripeSession.shipping.address) {
      var shipping = stripeSession.shipping;
      shippingAddress = {
        fullName: shipping.name || customerName || '',
        address: shipping.address.line1 + (shipping.address.line2 ? ', ' + shipping.address.line2 : ''),
        city: shipping.address.city || '',
        state: shipping.address.state || '',
        zip: shipping.address.postal_code || '',
        country: shipping.address.country || 'US'
      };
      Logger.log('  ✓ Found shipping address in shipping field');
    }
    // Try customer_details.shipping (sometimes used)
    else if (stripeSession.customer_details && stripeSession.customer_details.shipping && stripeSession.customer_details.shipping.address) {
      var shipping = stripeSession.customer_details.shipping;
      shippingAddress = {
        fullName: shipping.name || customerName || '',
        address: shipping.address.line1 + (shipping.address.line2 ? ', ' + shipping.address.line2 : ''),
        city: shipping.address.city || '',
        state: shipping.address.state || '',
        zip: shipping.address.postal_code || '',
        country: shipping.address.country || 'US'
      };
      Logger.log('  ✓ Found shipping address in customer_details.shipping');
    }
    else {
      Logger.log('  ✗ No shipping address found in session');
      Logger.log('  Session keys: ' + Object.keys(stripeSession).join(', '));
      if (stripeSession.shipping_details) {
        Logger.log('  shipping_details keys: ' + Object.keys(stripeSession.shipping_details).join(', '));
      }
    }
    
    // Now try to augment with Google Sheet data (tracking number, status updates, etc.)
    var sheetData = null;
    var trackingNumber = null;
    var orderStatus = 'Placed'; // Default status
    
    try {
      var CONFIG_SHEET = getConfig(foundEnvironment);
      var sheet = SpreadsheetApp.openById(CONFIG_SHEET.sheetId).getSheetByName(CONFIG_SHEET.sheetName);
      var row = findOrderRowBySessionId(sheet, sessionId);
      
      if (row > 0) {
        // Order found in sheet - get additional data
        var data = sheet.getRange(row, 1, 1, 9).getValues()[0];
        sheetData = {
          timestamp: data[0],
          customerName: data[1],
          wixOrderNumber: data[3] || '',
          wixOrderId: data[4] || ''
        };
        
        // Check if there's a tracking number column (if sheet has been extended)
        // For now, tracking numbers would need to be added manually to the sheet
        // and we'd need to know which column they're in
        // This is a placeholder for future enhancement
      }
    } catch (sheetError) {
      Logger.log('Error checking sheet for additional data: ' + sheetError.toString());
      // Continue without sheet data - Stripe data is sufficient
    }
    
    // If order is paid and not yet in sheet, save it (idempotent - won't duplicate)
    if (stripeSession.payment_status === 'paid') {
      try {
        saveOrderToSheet(stripeSession, foundEnvironment);
      } catch (saveError) {
        Logger.log('Error saving order to sheet (non-critical): ' + saveError.toString());
        // Continue - order data from Stripe is still valid
      }
    }
    
    // Determine order status based on payment status
    if (stripeSession.payment_status === 'paid') {
      orderStatus = 'Placed';
    } else if (stripeSession.payment_status === 'unpaid') {
      orderStatus = 'Pending';
    }
    
    // Format order for frontend
    var order = {
      sessionId: stripeSession.id,
      date: new Date(stripeSession.created * 1000).toISOString(), // Convert Unix timestamp to ISO string
      status: orderStatus,
      customerName: customerName,
      customerEmail: customerEmail,
      items: items,
      amount: totalAmount,
      currency: (stripeSession.currency && stripeSession.currency.toUpperCase()) || 'USD',
      shippingAddress: shippingAddress,
      trackingNumber: trackingNumber, // Will be added manually by admin to Google Sheet
      paymentStatus: stripeSession.payment_status || 'unknown'
    };
    
    return createCORSResponse({
      status: 'success',
      order: order
    });
  } catch (error) {
    Logger.log('Error getting order status: ' + error.toString());
    return createCORSResponse({
      status: 'error',
      error: error.toString()
    });
  }
}

/**
 * Parse items purchased string into array of item objects
 * Format: "Product Name (x2), Another Product (x1)"
 */
function parseItemsPurchased(itemsPurchased, totalAmount, totalQuantity) {
  if (!itemsPurchased) {
    return [];
  }
  
  var items = [];
  var itemStrings = itemsPurchased.split(',');
  
  for (var i = 0; i < itemStrings.length; i++) {
    var itemStr = itemStrings[i].trim();
    // Parse format: "Product Name (x2)"
    var match = itemStr.match(/^(.+?)\s*\(x(\d+)\)$/);
    
    if (match) {
      var name = match[1].trim();
      var quantity = parseInt(match[2]) || 1;
      // Estimate price per item (divide total by quantity)
      var price = totalQuantity > 0 ? (totalAmount / totalQuantity) : 0;
      
      items.push({
        name: name,
        quantity: quantity,
        price: price
      });
    } else {
      // Fallback: treat entire string as product name
      var price = totalQuantity > 0 ? (totalAmount / totalQuantity) : 0;
      items.push({
        name: itemStr,
        quantity: 1,
        price: price
      });
    }
  }
  
  return items;
}

/**
 * Retrieve full Stripe session with line items
 */
function retrieveStripeSession(sessionId, stripeSecretKey) {
  try {
    // Expand line_items to get complete product data
    // Note: shipping_details cannot be expanded, but it's included by default in checkout sessions
    var url = 'https://api.stripe.com/v1/checkout/sessions/' + sessionId + '?expand[]=line_items.data';
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + stripeSecretKey
      },
      muteHttpExceptions: true // Get full error response
    });

    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode !== 200) {
      Logger.log('Stripe API error (code ' + responseCode + '): ' + responseText);
      var errorData;
      try {
        errorData = JSON.parse(responseText);
        if (errorData.error && errorData.error.message) {
          Logger.log('Stripe error message: ' + errorData.error.message);
        }
      } catch (parseError) {
        Logger.log('Could not parse error response');
      }
      return null;
    }

    var session = JSON.parse(responseText);
    
    // Check if response contains an error
    if (session.error) {
      Logger.log('Stripe session error: ' + JSON.stringify(session.error));
      return null;
    }
    
    // Validate session has required fields
    if (!session.id) {
      Logger.log('Warning: Session response missing id field');
      return null;
    }
    
    return session;
  } catch (error) {
    Logger.log('Error retrieving Stripe session: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return null;
  }
}

/**
 * Find order row by Stripe Session ID
 * Matches existing sheet structure where Session ID is in column C (index 2)
 */
function findOrderRowBySessionId(sheet, sessionId) {
  var data = sheet.getDataRange().getValues();
  // Skip header row (index 0)
  for (var i = 1; i < data.length; i++) {
    // Stripe Session ID is in column C (index 2)
    if (data[i][2] === sessionId) {
      return i + 1; // Return 1-based row number
    }
  }
  return 0;
}

/**
 * Find order row by session ID (legacy function for backward compatibility)
 */
function findOrderRow(sheet, sessionId) {
  return findOrderRowBySessionId(sheet, sessionId);
}

/**
 * Poll Stripe for completed checkout sessions and update Google Sheet
 * This replaces webhooks - runs periodically via time-driven trigger
 * 
 * SETUP: Create a time-driven trigger to run this function every 5-15 minutes
 * 1. Go to Triggers (clock icon) in Google App Script
 * 2. Add Trigger
 * 3. Function: syncStripeOrders
 * 4. Event source: Time-driven
 * 5. Type: Minutes timer
 * 6. Interval: Every 5 minutes (or 10-15 minutes)
 */
function syncStripeOrders() {
  try {
    // Check both environments
    syncStripeOrdersForEnvironment('production');
    syncStripeOrdersForEnvironment('development');
  } catch (error) {
    Logger.log('Error in syncStripeOrders: ' + error.toString());
  }
}

/**
 * Sync orders for a specific environment
 */
function syncStripeOrdersForEnvironment(environment) {
  try {
    var CONFIG = getConfig(environment);
    
    if (!CONFIG.stripeSecretKey) {
      Logger.log('Skipping ' + environment + ' - Stripe key not configured');
      return;
    }

    var sheet = SpreadsheetApp.openById(CONFIG.sheetId).getSheetByName(CONFIG.sheetName);
    if (!sheet) {
      Logger.log('Sheet not found: ' + CONFIG.sheetName);
      return;
    }

    // Get all existing session IDs from sheet (for idempotency)
    var existingSessionIds = getExistingSessionIds(sheet);

    // Poll Stripe for completed checkout sessions from the last hour
    // Adjust time range as needed (e.g., last 24 hours for less frequent polling)
    var oneHourAgo = Math.floor(Date.now() / 1000) - (60 * 60); // Unix timestamp
    
    var sessions = retrieveCompletedSessions(CONFIG.stripeSecretKey, oneHourAgo);
    
    var newOrdersCount = 0;
    
    for (var i = 0; i < sessions.length; i++) {
      var session = sessions[i];
      // Skip if already in sheet
      if (existingSessionIds.has(session.id)) {
        continue;
      }

      // Retrieve full session with line items
      var fullSession = retrieveStripeSession(session.id, CONFIG.stripeSecretKey);
      if (fullSession) {
        saveOrderToSheet(fullSession, environment);
        newOrdersCount++;
      }
    }

    if (newOrdersCount > 0) {
      Logger.log('Synced ' + newOrdersCount + ' new orders from ' + environment + ' environment');
    }
  } catch (error) {
    Logger.log('Error syncing ' + environment + ' orders: ' + error.toString());
  }
}

/**
 * Retrieve completed checkout sessions from Stripe
 */
function retrieveCompletedSessions(stripeSecretKey, createdAfter) {
  try {
    // Stripe API: List checkout sessions
    // Filter by status=complete and created timestamp
    var params = [
      'limit=100', // Max 100 per request
      'status=complete',
      'created>=' + createdAfter
    ].join('&');

    var url = 'https://api.stripe.com/v1/checkout/sessions?' + params;
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + stripeSecretKey
      }
    });

    var data = JSON.parse(response.getContentText());
    return data.data || [];
  } catch (error) {
    Logger.log('Error retrieving completed sessions: ' + error.toString());
    return [];
  }
}

/**
 * Get all existing session IDs from the sheet
 */
function getExistingSessionIds(sheet) {
  var sessionIds = {};
  var data = sheet.getDataRange().getValues();
  
  // Skip header row, check column C (index 2) for Stripe Session ID
  for (var i = 1; i < data.length; i++) {
    var sessionId = data[i][2]; // Column C
    if (sessionId && sessionId.trim) {
      sessionIds[sessionId.trim()] = true;
    }
  }
  
  // Return object with has() method for compatibility
  return {
    has: function(id) {
      return sessionIds.hasOwnProperty(id);
    }
  };
}

/**
 * Send tracking emails (scheduled function)
 * Set up a time-driven trigger to run this function periodically
 */
function sendTrackingEmails() {
  try {
    // Default to production for scheduled emails (can be enhanced to check both)
    var CONFIG = getConfig('production');
    var sheet = SpreadsheetApp.openById(CONFIG.sheetId).getSheetByName(CONFIG.sheetName);
    var data = sheet.getDataRange().getValues();

    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var sessionId = row[0];
      var email = row[1];
      var status = row[3];
      var trackingNumber = row[6];
      var emailSent = row[7];

      // Check if tracking number exists and email not sent
      if (trackingNumber && trackingNumber.trim() && emailSent !== 'Yes') {
        sendTrackingEmail(email, sessionId, trackingNumber, status);
        
        // Mark email as sent
        sheet.getRange(i + 1, 8).setValue('Yes');
        sheet.getRange(i + 1, 9).setValue(new Date().toISOString());
      }
    }
  } catch (error) {
    Logger.log('Error sending tracking emails: ' + error.toString());
  }
}

/**
 * Send tracking email to customer
 */
function sendTrackingEmail(email, sessionId, trackingNumber, status) {
  try {
    var trackingUrl = getTrackingUrl(trackingNumber);
    
    var subject = 'Your Agroverse Order Has Shipped!';
    var body = 'Hello,\n\n' +
      'Your order (' + sessionId + ') has been shipped!\n\n' +
      'Tracking Number: ' + trackingNumber + '\n' +
      (trackingUrl ? 'Track your package: ' + trackingUrl + '\n' : '') +
      '\nStatus: ' + status + '\n\n' +
      'Thank you for your purchase!\n\n' +
      'Best regards,\n' +
      'Agroverse Team';

    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body
    });

    Logger.log('Tracking email sent to: ' + email);
  } catch (error) {
    Logger.log('Error sending email: ' + error.toString());
  }
}

/**
 * Get tracking URL based on tracking number format
 */
function getTrackingUrl(trackingNumber) {
  var trimmed = trackingNumber.trim().toUpperCase();

  // USPS
  if (/^\d+[A-Z]{2}\d+US$/.test(trimmed)) {
    return 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' + trimmed;
  }

  // UPS
  if (trimmed.indexOf('1Z') === 0) {
    return 'https://www.ups.com/track?tracknum=' + trimmed;
  }

  // FedEx
  if (/^\d{12}$/.test(trimmed)) {
    return 'https://www.fedex.com/fedextrack/?trknbr=' + trimmed;
  }

  // Default: USPS
  return 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' + trimmed;
}

/**
 * Submit quote request
 */
function submitQuoteRequest(data) {
  try {
    var quoteData = data.quoteData;
    var environment = data.environment || 'production';
    var CONFIG = getConfig(environment);
    var sheet = SpreadsheetApp.openById(CONFIG.sheetId);
    
    // Get or create "Quote Requests" sheet
    var quoteSheet = sheet.getSheetByName('Quote Requests');
    if (!quoteSheet) {
      quoteSheet = sheet.insertSheet('Quote Requests');
      // Add headers
      quoteSheet.appendRow([
        'Date',
        'Business Name',
        'Contact Name',
        'Email',
        'Phone',
        'Company Type',
        'Shipping Address',
        'Expected Frequency',
        'Products (JSON)',
        'Notes',
        'Status',
        'Quote Provided',
        'Quote Amount',
        'Last Updated'
      ]);
    }

    // Format products
    var productsJson = JSON.stringify(quoteData.products || []);

    // Add row to sheet
    var row = [
      new Date().toISOString(), // Date
      quoteData.businessName || '',
      quoteData.contactName || '',
      quoteData.email || '',
      quoteData.phone || '',
      quoteData.companyType || '',
      quoteData.shippingAddress || '',
      quoteData.expectedFrequency || '',
      productsJson, // Products
      quoteData.notes || '',
      'Pending', // Status
      'No', // Quote Provided
      '', // Quote Amount
      new Date().toISOString() // Last Updated
    ];

    quoteSheet.appendRow(row);

    // Send email notification to admin
    try {
      var subject = 'New Wholesale Quote Request - ' + quoteData.businessName;
      
      // Build products list
      var productsList = [];
      var products = quoteData.products || [];
      for (var p = 0; p < products.length; p++) {
        var product = products[p];
        productsList.push('- ' + product.productId + ': ' + product.quantity + ' kg');
      }
      
      var body = 'New wholesale quote request received:\n\n' +
        'Business: ' + quoteData.businessName + '\n' +
        'Contact: ' + quoteData.contactName + '\n' +
        'Email: ' + quoteData.email + '\n' +
        'Phone: ' + quoteData.phone + '\n' +
        'Company Type: ' + (quoteData.companyType || 'Not specified') + '\n\n' +
        'Products Requested:\n' + productsList.join('\n') + '\n\n' +
        'Shipping Address:\n' + quoteData.shippingAddress + '\n\n' +
        'Expected Frequency: ' + (quoteData.expectedFrequency || 'Not specified') + '\n\n' +
        'Notes:\n' + (quoteData.notes || 'None') + '\n\n' +
        '---\n' +
        'View in Google Sheet: https://docs.google.com/spreadsheets/d/' + CONFIG.sheetId;

      MailApp.sendEmail({
        to: Session.getActiveUser().getEmail(), // Admin email
        subject: subject,
        body: body
      });
    } catch (emailError) {
      Logger.log('Error sending email notification: ' + emailError.toString());
      // Don't fail the request if email fails
    }

    Logger.log('Quote request saved: ' + quoteData.email);

    return createCORSResponse({
      status: 'success',
      message: 'Quote request submitted successfully'
    });
  } catch (error) {
    Logger.log('Error submitting quote request: ' + error.toString());
    return createCORSResponse({
      error: error.toString()
    });
  }
}

// Legacy CONFIG for backward compatibility (will use production by default)
// This is only used if getConfig() isn't called first
var CONFIG = getConfig('production');

/**
 * Helper: Build form data for Stripe API
 * Converts object to URL-encoded form data
 */
/**
 * Build form-encoded data for Stripe API
 * Handles nested objects and arrays using bracket notation
 * 
 * @param {Object} data Data object to encode
 * @param {string} prefix Prefix for nested keys (used recursively)
 * @return {string} Form-encoded string
 */
function buildFormData(data, prefix) {
  var params = [];
  prefix = prefix || '';
  
  for (var key in data) {
    if (data.hasOwnProperty(key) && data[key] !== undefined && data[key] !== null) {
      var value = data[key];
      var fullKey = prefix ? prefix + '[' + key + ']' : key;
      
      if (Array.isArray(value)) {
        // Handle arrays: 
        // - Arrays of objects use indexed brackets: key[0][field]=value
        // - Arrays of primitives use empty brackets: key[]=value
        for (var i = 0; i < value.length; i++) {
          if (typeof value[i] === 'object' && value[i] !== null) {
            // Object in array - use indexed brackets for Stripe API
            var nestedParams = buildFormData(value[i], fullKey + '[' + i + ']');
            if (nestedParams) {
              params.push(nestedParams);
            }
          } else {
            // Simple value in array - use empty brackets for Stripe API
            params.push(fullKey + '[]=' + encodeURIComponent(String(value[i])));
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects: recurse with bracket notation
        var nestedParams = buildFormData(value, fullKey);
        if (nestedParams) {
          params.push(nestedParams);
        }
      } else {
        // Simple value
        params.push(fullKey + '=' + encodeURIComponent(String(value)));
      }
    }
  }
  return params.join('&');
}

/**
 * Test function to verify EasyPost API integration
 * Run this function from the Google App Script editor to test EasyPost
 * 
 * Usage: Run testEasyPostShipping() from the script editor
 */
function testEasyPostShipping() {
  Logger.log('=== Testing EasyPost Shipping Calculation ===');
  
  // Test parameters
  var testWeightOz = 19.2; // 1 item (7.05 oz) + base box (11.5 oz) + packaging (0.65 oz)
  var testShippingAddress = {
    address: '1327 Columbus Avenue',
    city: 'San Francisco',
    state: 'CA',
    zip: '94133',
    country: 'US'
  };
  
  Logger.log('Test weight: ' + testWeightOz + ' oz');
  Logger.log('Test address: ' + JSON.stringify(testShippingAddress));
  
  // Check Script Properties
  var props = PropertiesService.getScriptProperties();
  var easypostApiKey = props.getProperty('EASYPOST_API_KEY');
  
  // Get origin address (with hardcoded defaults)
  var originLine1 = props.getProperty('ORIGIN_ADDRESS_LINE1') || '1423 Hayes St';
  var originLine2 = props.getProperty('ORIGIN_ADDRESS_LINE2') || '';
  var originCity = props.getProperty('ORIGIN_ADDRESS_CITY') || 'San Francisco';
  var originState = props.getProperty('ORIGIN_ADDRESS_STATE') || 'CA';
  var originZip = props.getProperty('ORIGIN_ADDRESS_POSTAL_CODE') || '94117';
  var originCountry = props.getProperty('ORIGIN_ADDRESS_COUNTRY') || 'US';
  
  Logger.log('EasyPost API Key configured: ' + (easypostApiKey ? 'YES (length: ' + easypostApiKey.length + ')' : 'NO'));
  Logger.log('Origin address: ' + originLine1 + ', ' + originCity + ', ' + originState + ' ' + originZip);
  Logger.log('  (Using defaults if not set in Script Properties)');
  
  if (!easypostApiKey) {
    Logger.log('ERROR: EASYPOST_API_KEY not set in Script Properties');
    return;
  }
  
  // Call EasyPost function
  Logger.log('\n--- Calling calculateShippingRatesViaEasyPost ---');
  var shippingOptions = calculateShippingRatesViaEasyPost(testWeightOz, testShippingAddress);
  
  Logger.log('\n--- Results ---');
  Logger.log('Number of shipping options returned: ' + shippingOptions.length);
  
  if (shippingOptions.length === 0) {
    Logger.log('ERROR: No shipping options returned. Check logs above for EasyPost API errors.');
  } else {
    Logger.log('SUCCESS: Shipping options found!');
    for (var i = 0; i < shippingOptions.length; i++) {
      var option = shippingOptions[i];
      var rateData = option.shipping_rate_data;
      var amount = rateData.fixed_amount.amount / 100;
      var name = rateData.display_name;
      Logger.log('  Option ' + (i + 1) + ': ' + name + ' - $' + amount.toFixed(2));
    }
  }
  
  Logger.log('\n=== Test Complete ===');
  return shippingOptions;
}

/**
 * Test function with minimal parameters (just weight, no address)
 */
function testEasyPostMinimal() {
  Logger.log('=== Testing EasyPost with Minimal Parameters ===');
  
  var testWeightOz = 19.2;
  Logger.log('Test weight: ' + testWeightOz + ' oz');
  Logger.log('No shipping address provided (will use default)');
  
  var shippingOptions = calculateShippingRatesViaEasyPost(testWeightOz, null);
  
  Logger.log('Results: ' + shippingOptions.length + ' options');
  return shippingOptions;
}

/**
 * Test function to pull order details from Stripe by session ID
 * 
 * Usage:
 * 1. Replace 'YOUR_STRIPE_SESSION_ID' below with your actual Stripe session ID
 * 2. Or call: testGetOrderStatus('cs_test_xxxxx')
 * 3. Run from the Google App Script editor
 * 4. Check the Execution log for detailed output
 * 
 * @param {String} sessionId (optional) Stripe checkout session ID (e.g., 'cs_test_xxxxx')
 * @return {Object} Order details object
 */
function testGetOrderStatus(sessionId) {
  // Default test session ID - replace with your actual session ID
  var testSessionId = sessionId || 'cs_test_a1TWwFuLbhfyXHroNy3OCAzPEWctusgYf3gBzAF8RbXxN4FIbMQF76Xh57';
  
  Logger.log('=== Testing Order Status Retrieval ===');
  Logger.log('Stripe Session ID: ' + testSessionId);
  Logger.log('');
  
  // Try both environments
  var environments = ['development', 'production'];
  var foundSession = null;
  var foundEnvironment = null;
  
  Logger.log('--- Step 1: Fetching from Stripe ---');
  for (var i = 0; i < environments.length; i++) {
    var env = environments[i];
    var CONFIG = getConfig(env);
    
    if (!CONFIG.stripeSecretKey) {
      Logger.log('Skipping ' + env + ' - Stripe key not configured');
      continue;
    }
    
    Logger.log('Trying ' + env + ' environment...');
    
    try {
      var stripeSession = retrieveStripeSession(testSessionId, CONFIG.stripeSecretKey);
      
      if (stripeSession) {
        foundSession = stripeSession;
        foundEnvironment = env;
        Logger.log('✓ Found session in ' + env + ' environment');
        Logger.log('  Payment Status: ' + (stripeSession.payment_status || 'N/A'));
        Logger.log('  Created: ' + new Date(stripeSession.created * 1000).toISOString());
        Logger.log('  Amount Total: $' + ((stripeSession.amount_total || 0) / 100).toFixed(2));
        Logger.log('  Currency: ' + (stripeSession.currency || 'N/A'));
        break;
      }
    } catch (error) {
      Logger.log('  ✗ Error in ' + env + ': ' + error.toString());
      continue;
    }
  }
  
  if (!foundSession) {
    Logger.log('✗ ERROR: Session not found in either environment');
    Logger.log('  Make sure the session ID is correct and the Stripe keys are configured');
    return null;
  }
  
  Logger.log('');
  Logger.log('--- Step 2: Extracting Order Details ---');
  
  // Extract customer info
  var customerName = (foundSession.customer_details && foundSession.customer_details.name) || 
                      (foundSession.shipping_details && foundSession.shipping_details.name) || 
                      foundSession.customer_email || 
                      'Unknown';
  var customerEmail = (foundSession.customer_details && foundSession.customer_details.email) || 
                      foundSession.customer_email || '';
  
  Logger.log('Customer Name: ' + customerName);
  Logger.log('Customer Email: ' + customerEmail);
  
  // Extract line items
  var lineItems = (foundSession.line_items && foundSession.line_items.data) || [];
  Logger.log('Line Items Count: ' + lineItems.length);
  
  var items = [];
  var totalQuantity = 0;
  var totalAmount = 0;
  
  for (var j = 0; j < lineItems.length; j++) {
    var item = lineItems[j];
    var quantity = item.quantity || 1;
    var amount = (item.amount_total || 0) / 100;
    var description = item.description || 'Product';
    
    // Extract product image from Stripe line item
    var productImage = null;
    if (item.price && item.price.product) {
      Logger.log('  Item ' + (j + 1) + ' - Product Data:');
      Logger.log('    Product ID: ' + (item.price.product.id || 'N/A'));
      Logger.log('    Product Name: ' + (item.price.product.name || 'N/A'));
      
      if (item.price.product.images && item.price.product.images.length > 0) {
        productImage = item.price.product.images[0];
        Logger.log('    ✓ Product Image Found: ' + productImage);
        Logger.log('    Image URL: ' + productImage);
        Logger.log('    Total Images: ' + item.price.product.images.length);
        if (item.price.product.images.length > 1) {
          Logger.log('    Additional Images:');
          for (var imgIdx = 1; imgIdx < item.price.product.images.length; imgIdx++) {
            Logger.log('      - ' + item.price.product.images[imgIdx]);
          }
        }
      } else {
        Logger.log('    ✗ No product images found');
        Logger.log('    Product object keys: ' + Object.keys(item.price.product || {}).join(', '));
      }
    } else {
      Logger.log('  Item ' + (j + 1) + ' - WARNING: No price.product data');
      Logger.log('    Item keys: ' + Object.keys(item).join(', '));
      if (item.price) {
        Logger.log('    Price keys: ' + Object.keys(item.price).join(', '));
      }
    }
    
    Logger.log('  Item ' + (j + 1) + ': ' + description);
    Logger.log('    Quantity: ' + quantity);
    Logger.log('    Amount: $' + amount.toFixed(2));
    Logger.log('    Image URL: ' + (productImage || '(none)'));
    
    items.push({
      name: description,
      quantity: quantity,
      price: amount / quantity,
      image: productImage || null
    });
    
    totalQuantity += quantity;
    totalAmount += amount;
  }
  
  if (items.length === 0) {
    totalAmount = (foundSession.amount_total || 0) / 100;
    totalQuantity = 1;
    items.push({
      name: 'Product',
      quantity: 1,
      price: totalAmount
    });
    Logger.log('  No line items found, using session total: $' + totalAmount.toFixed(2));
  }
  
  Logger.log('Total Quantity: ' + totalQuantity);
  Logger.log('Total Amount: $' + totalAmount.toFixed(2));
  
  // Extract shipping address
  var shippingAddress = null;
  if (foundSession.shipping_details && foundSession.shipping_details.address) {
    var shipping = foundSession.shipping_details;
    shippingAddress = {
      fullName: shipping.name || customerName || '',
      address: shipping.address.line1 + (shipping.address.line2 ? ', ' + shipping.address.line2 : ''),
      city: shipping.address.city || '',
      state: shipping.address.state || '',
      zip: shipping.address.postal_code || '',
      country: shipping.address.country || 'US'
    };
    
    Logger.log('');
    Logger.log('Shipping Address:');
    Logger.log('  Name: ' + shippingAddress.fullName);
    Logger.log('  Address: ' + shippingAddress.address);
    Logger.log('  ' + shippingAddress.city + ', ' + shippingAddress.state + ' ' + shippingAddress.zip);
    Logger.log('  Country: ' + shippingAddress.country);
  } else {
    Logger.log('No shipping address found');
  }
  
  Logger.log('');
  Logger.log('--- Step 3: Checking Google Sheet ---');
  
  // Check if order exists in sheet
  try {
    var CONFIG_SHEET = getConfig(foundEnvironment);
    var sheet = SpreadsheetApp.openById(CONFIG_SHEET.sheetId).getSheetByName(CONFIG_SHEET.sheetName);
    var row = findOrderRowBySessionId(sheet, testSessionId);
    
    if (row > 0) {
      Logger.log('✓ Order found in Google Sheet (row ' + row + ')');
      var data = sheet.getRange(row, 1, 1, 9).getValues()[0];
      Logger.log('  Timestamp: ' + data[0]);
      Logger.log('  Customer Name: ' + data[1]);
      Logger.log('  Items: ' + data[5]);
      Logger.log('  Total: $' + data[7]);
    } else {
      Logger.log('✗ Order NOT found in Google Sheet');
      Logger.log('  (This is normal if the order was just placed and polling hasn\'t run yet)');
    }
  } catch (sheetError) {
    Logger.log('✗ Error checking sheet: ' + sheetError.toString());
  }
  
  Logger.log('');
  Logger.log('--- Step 4: Testing getOrderStatus Function ---');
  
  // Test the actual getOrderStatus function
  try {
    var orderStatusResult = getOrderStatus(testSessionId);
    var orderStatusText = orderStatusResult.getContentText();
    var orderStatusData = JSON.parse(orderStatusText);
    
    if (orderStatusData.status === 'success') {
      Logger.log('✓ getOrderStatus returned success');
      Logger.log('  Order Status: ' + (orderStatusData.order.status || 'N/A'));
      Logger.log('  Items Count: ' + (orderStatusData.order.items ? orderStatusData.order.items.length : 0));
    } else {
      Logger.log('✗ getOrderStatus returned error: ' + (orderStatusData.error || 'Unknown'));
    }
  } catch (testError) {
    Logger.log('✗ Error testing getOrderStatus: ' + testError.toString());
  }
  
  Logger.log('');
  Logger.log('=== Test Complete ===');
  Logger.log('');
  Logger.log('--- Step 5: Product Images Summary ---');
  var itemsWithImages = 0;
  var itemsWithoutImages = 0;
  for (var imgCheck = 0; imgCheck < items.length; imgCheck++) {
    if (items[imgCheck].image) {
      itemsWithImages++;
      Logger.log('  ✓ Item "' + items[imgCheck].name + '" has image: ' + items[imgCheck].image);
    } else {
      itemsWithoutImages++;
      Logger.log('  ✗ Item "' + items[imgCheck].name + '" has NO image');
    }
  }
  Logger.log('  Items with images: ' + itemsWithImages + ' / ' + items.length);
  Logger.log('  Items without images: ' + itemsWithoutImages + ' / ' + items.length);
  
  Logger.log('');
  Logger.log('=== Summary ===');
  Logger.log('  Session ID: ' + testSessionId);
  Logger.log('  Environment: ' + foundEnvironment);
  Logger.log('  Payment Status: ' + (foundSession.payment_status || 'N/A'));
  Logger.log('  Customer: ' + customerName + ' (' + customerEmail + ')');
  Logger.log('  Total: $' + totalAmount.toFixed(2) + ' ' + (foundSession.currency || 'USD').toUpperCase());
  Logger.log('  Items: ' + totalQuantity);
  Logger.log('  Items with Images: ' + itemsWithImages + ' / ' + items.length);
  
  // Return formatted order object
  return {
    sessionId: foundSession.id,
    environment: foundEnvironment,
    paymentStatus: foundSession.payment_status,
    customerName: customerName,
    customerEmail: customerEmail,
    items: items,
    totalAmount: totalAmount,
    currency: foundSession.currency || 'USD',
    shippingAddress: shippingAddress,
    created: new Date(foundSession.created * 1000).toISOString()
  };
}

