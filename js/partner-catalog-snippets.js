/**
 * Partner PDP: load partners-inventory.json (raw GitHub) for this slug and render
 * product snippets. Online-shippable retail SKUs get Add to Cart; venue-only SKUs
 * show pickup copy (no cart).
 *
 * Depends on: window.PRODUCTS (products.js), InventoryService + InventoryDisplay
 * (optional but recommended), add-to-cart.js for cart buttons.
 */
(function () {
  'use strict';

  /** Prefer GitHub raw; jsDelivr often resolves new files on `main` faster. */
  var SNAPSHOT_URLS = [
    'https://raw.githubusercontent.com/TrueSightDAO/agroverse-inventory/main/partners-inventory.json',
    'https://cdn.jsdelivr.net/gh/TrueSightDAO/agroverse-inventory@main/partners-inventory.json'
  ];

  function partnerSlugFromPath() {
    var m = String(window.location.pathname || '').match(/\/partners\/([^/]+)\/?/i);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function resolveProduct(productId) {
    if (!productId || !window.PRODUCTS) return null;
    if (Object.prototype.hasOwnProperty.call(window.PRODUCTS, productId)) {
      return window.PRODUCTS[productId];
    }
    return null;
  }

  function normalizeImg(src) {
    if (!src) return '';
    var s = String(src).trim();
    if (/^https?:\/\//i.test(s)) return s;
    if (s.indexOf('//') === 0) return 'https:' + s;
    if (s.charAt(0) === '/') {
      var host = typeof window !== 'undefined' && window.location && window.location.hostname;
      var isLocal =
        host === '127.0.0.1' ||
        host === 'localhost' ||
        host === '0.0.0.0' ||
        (host && String(host).endsWith('.local'));
      // Local static servers often lack /assets at ../../; use production host for root-relative paths.
      if (isLocal) return 'https://www.agroverse.shop' + s;
      return '../..' + s;
    }
    return s;
  }

  /** Prefer snapshot / absolute URLs so local dev (e.g. 127.0.0.1) is not stuck on ../../assets 404s. */
  function snippetImageSrc(item, product) {
    var fromItem = item && item.imagePath ? String(item.imagePath).trim() : '';
    var fromProd = product && product.image ? String(product.image).trim() : '';
    if (/^https?:\/\//i.test(fromItem)) return fromItem;
    if (/^https?:\/\//i.test(fromProd)) return fromProd;
    if (fromItem) return fromItem;
    if (fromProd) return fromProd;
    return '';
  }

  function pdpHref(product) {
    if (!product || !product.productPageSlug) return '../../index.html#products';
    return '../../product-page/' + product.productPageSlug + '/index.html';
  }

  function pdpHrefForItem(item, product) {
    if (product && product.productPageSlug) return pdpHref(product);
    if (item && item.productId) {
      return '../../product-page/' + encodeURIComponent(item.productId) + '/index.html';
    }
    return '../../index.html#products';
  }

  function isRetailPurchasable(product) {
    return (
      product &&
      String(product.category || '').toLowerCase() === 'retail' &&
      Number(product.price) > 0
    );
  }

  function formatPrice(product, item) {
    if (product && Number(product.price) > 0) {
      return '$' + Number(product.price).toFixed(2) + ' USD';
    }
    if (item && item.priceUsd) return String(item.priceUsd);
    return '';
  }

  function venueUnits(item) {
    var raw = item.venueInventory != null ? item.venueInventory : item.inventory;
    var n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  }

  function appendVenuePillAfterPrice(body, item, muted) {
    var n = venueUnits(item);
    if (n <= 0) return;
    var pill = document.createElement('div');
    pill.className =
      'partner-venue-inventory-pill' + (muted ? ' partner-venue-inventory-pill--muted' : '');
    pill.textContent =
      'Roughly ' + String(n) + ' on the shelf here — staff can confirm what’s for sale.';
    var priceEl = body.querySelector('.price');
    if (priceEl && priceEl.nextSibling) {
      body.insertBefore(pill, priceEl.nextSibling);
    } else {
      body.appendChild(pill);
    }
  }

  function buildOnlineCard(item, product) {
    var card = document.createElement('div');
    card.className = 'product-card catalog-snippet-card';
    card.setAttribute('data-product-id', item.productId);

    var link = document.createElement('a');
    link.className = 'catalog-snippet-card__link';
    link.href = pdpHrefForItem(item, product);
    var img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.src = normalizeImg(snippetImageSrc(item, product));
    link.appendChild(img);

    var h3 = document.createElement('h3');
    h3.textContent = (product && product.name) || (item && item.productName) || item.productId;
    link.appendChild(h3);
    card.appendChild(link);

    var body = document.createElement('div');
    body.className = 'product-card-body catalog-snippet-card__body';

    var ctx = document.createElement('p');
    ctx.className = 'catalog-snippet-card__context';
    var v = venueUnits(item);
    if (v > 0) {
      ctx.textContent =
        'Order from agroverse.shop when we have warehouse stock — and say hello at this partner for what’s on the shelf.';
    } else {
      ctx.textContent =
        'We’ll ship this from agroverse.shop when it’s in stock online; ask on site what they have for sale.';
    }
    body.appendChild(ctx);

    var priceEl = document.createElement('div');
    priceEl.className = 'price';
    priceEl.textContent = formatPrice(product, item);
    body.appendChild(priceEl);

    appendVenuePillAfterPrice(body, item, true);

    var actions = document.createElement('div');
    actions.className = 'product-card-actions catalog-snippet-card__actions';

    var price = Number(product.price).toFixed(2);
    var imgSrc = normalizeImg(product.image || '');
    var w = product.weight != null ? String(product.weight) : '0';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'add-to-cart-btn';
    btn.setAttribute('data-product-id', item.productId);
    btn.setAttribute('data-product-name', product.name || '');
    btn.setAttribute('data-product-price', price);
    btn.setAttribute('data-product-image', imgSrc);
    btn.setAttribute('data-stripe-price-id', '');
    btn.setAttribute('data-product-weight', w);
    btn.textContent = 'Add to Cart — $' + price;
    actions.appendChild(btn);
    body.appendChild(actions);
    card.appendChild(body);
    return card;
  }

  function buildVenueOnlyCard(item, product) {
    var card = document.createElement('div');
    card.className = 'product-card catalog-snippet-card partner-venue-only-card';

    var link = document.createElement('a');
    link.className = 'catalog-snippet-card__link';
    link.href = pdpHrefForItem(item, product);
    var img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.src = normalizeImg(snippetImageSrc(item, product));
    link.appendChild(img);

    var h3 = document.createElement('h3');
    h3.textContent = (product && product.name) || (item && item.productName) || item.productId;
    link.appendChild(h3);
    card.appendChild(link);

    var body = document.createElement('div');
    body.className = 'product-card-body catalog-snippet-card__body';

    var ctx = document.createElement('p');
    ctx.className = 'catalog-snippet-card__context';
    ctx.textContent =
      'This one is meant to be part of your visit — stop in, talk with the team, and take it home from the counter.';
    body.appendChild(ctx);

    var priceEl = document.createElement('div');
    priceEl.className = 'price';
    priceEl.textContent = formatPrice(product, item);
    body.appendChild(priceEl);

    var pill = document.createElement('div');
    pill.className = 'partner-venue-inventory-pill';
    var v = venueUnits(item);
    pill.textContent =
      v > 0
        ? 'Roughly ' + String(v) + ' on the shelf — staff can confirm what’s for sale.'
        : 'Ask in store what they have for sale.';
    body.appendChild(pill);

    var actions = document.createElement('div');
    actions.className = 'product-card-actions catalog-snippet-card__actions';
    var view = document.createElement('a');
    view.className = 'partner-view-pdp-link';
    view.href = pdpHrefForItem(item, product);
    view.textContent = 'View product details';
    actions.appendChild(view);
    body.appendChild(actions);
    card.appendChild(body);
    return card;
  }

  async function run() {
    var slug = partnerSlugFromPath();
    if (!slug) return;

    var story = document.querySelector('.partner-story');
    if (!story) return;

    var data = null;
    try {
      var bust = '?t=' + encodeURIComponent(String(Math.floor(Date.now() / 60000)));
      for (var u = 0; u < SNAPSHOT_URLS.length; u++) {
        var res = await fetch(SNAPSHOT_URLS[u] + bust);
        if (res.ok) {
          data = await res.json();
          break;
        }
      }
      if (!data) return;
    } catch (e) {
      return;
    }

    var block = data && data.partners && data.partners[slug];
    if (!block || !block.items || !block.items.length) return;

    var section = document.createElement('section');
    section.className = 'content-section partner-inventory-section';
    section.setAttribute('data-partner-inventory', '1');

    var h2 = document.createElement('h2');
    h2.textContent = 'When you visit';
    section.appendChild(h2);

    var lede = document.createElement('p');
    lede.className = 'partner-inventory-lede';
    lede.textContent =
      'We route cacao to partners we love visiting ourselves. Use this list as a compass for what might be on shelf — say hello, see what they have for sale, and let the stop be part of the ritual. When agroverse.shop can also ship a cacao, you’ll see Add to cart; when it can’t, the welcome mat is here.';
    section.appendChild(lede);

    var grid = document.createElement('div');
    grid.className = 'items-grid items-grid--commerce partner-inventory-grid';

    for (var i = 0; i < block.items.length; i++) {
      var item = block.items[i];
      var product = resolveProduct(item.productId);
      var online = item.availableOnline === true;
      var retail = isRetailPurchasable(product);

      var card = null;
      if (online && retail) {
        card = buildOnlineCard(item, product);
      } else {
        card = buildVenueOnlyCard(item, product);
      }
      if (card) grid.appendChild(card);
    }

    section.appendChild(grid);
    // Place inventory after venue media when a gallery exists: story → place → shelf reads
    // better than story → shelf → photos (commerce before you’ve “been there”).
    var root =
      (story.closest && story.closest('section.content-section')) || story.parentElement;
    var gallery = root && root.querySelector('.partner-gallery');
    var anchorEl = gallery || story;
    anchorEl.insertAdjacentElement('afterend', section);

    if (window.InventoryDisplay && window.InventoryDisplay.initProductCards) {
      window.InventoryDisplay.initProductCards();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
