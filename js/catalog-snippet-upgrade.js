/**
 * Upgrades farm/shipment "Products from …" grids that use
 * `.items-grid.items-grid--commerce > a.item-card` into `.product-card` snippets
 * aligned with home / related PDP: price row, inventory badges (via inventory-display.js),
 * Add to Cart for retail, wholesale note otherwise.
 *
 * Depends on: window.PRODUCTS (products.js). Load before inventory-display.js.
 */
(function () {
  'use strict';

  function slugFromItemCardHref(href) {
    if (!href) return null;
    var m = String(href).match(/product-page\/([^/?#]+)\//i);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function resolveProduct(slug) {
    if (!slug || !window.PRODUCTS) return null;
    for (var id in window.PRODUCTS) {
      if (!Object.prototype.hasOwnProperty.call(window.PRODUCTS, id)) continue;
      var p = window.PRODUCTS[id];
      var s = p.productPageSlug || id;
      if (s === slug) return { id: id, product: p };
    }
    return null;
  }

  function parseContextFromItemMeta(metaEl) {
    var text = metaEl && metaEl.textContent ? metaEl.textContent.trim() : '';
    var parts = text.split(/\s*[•·]\s*/);
    if (parts.length >= 2) return parts.slice(1).join(' · ');
    return '';
  }

  function isRetailPurchasable(p) {
    return p.category === 'retail' && Number(p.price) > 0;
  }

  function upgradeCommerceGrids() {
    if (!window.PRODUCTS) {
      console.warn('catalog-snippet-upgrade: window.PRODUCTS not found');
      return;
    }

    var grids = document.querySelectorAll('.items-grid.items-grid--commerce');
    for (var g = 0; g < grids.length; g++) {
      var grid = grids[g];
      var anchors = grid.querySelectorAll(':scope > a.item-card[href*="product-page"]');
      for (var i = 0; i < anchors.length; i++) {
        var anchor = anchors[i];
        var slug = slugFromItemCardHref(anchor.getAttribute('href'));
        var resolved = resolveProduct(slug);
        if (!resolved) continue;

        var id = resolved.id;
        var p = resolved.product;
        var img = anchor.querySelector('img.item-card-image, img');
        var h3 = anchor.querySelector('h3');
        var meta = anchor.querySelector('.item-meta');
        var context = parseContextFromItemMeta(meta);
        var pdpHref = anchor.getAttribute('href');

        var card = document.createElement('div');
        card.className = 'product-card catalog-snippet-card';
        card.setAttribute('data-product-id', id);

        var link = document.createElement('a');
        link.className = 'catalog-snippet-card__link';
        link.href = pdpHref;
        if (img) {
          link.appendChild(img.cloneNode(true));
        }
        if (h3) {
          link.appendChild(h3.cloneNode(true));
        }
        card.appendChild(link);

        var body = document.createElement('div');
        body.className = 'product-card-body catalog-snippet-card__body';

        if (context) {
          var ctx = document.createElement('p');
          ctx.className = 'catalog-snippet-card__context';
          ctx.textContent = context;
          body.appendChild(ctx);
        }

        var priceEl = document.createElement('div');
        priceEl.className = 'price';
        if (p.category === 'wholesale' || !Number(p.price)) {
          priceEl.textContent = 'Wholesale';
        } else {
          priceEl.textContent = '$' + Number(p.price).toFixed(2) + ' USD';
        }
        body.appendChild(priceEl);

        var actions = document.createElement('div');
        actions.className = 'product-card-actions catalog-snippet-card__actions';

        if (isRetailPurchasable(p)) {
          var price = Number(p.price).toFixed(2);
          var imgSrc = p.image || '';
          if (imgSrc.charAt(0) === '/') {
            imgSrc = '../..' + imgSrc;
          }
          var w = p.weight != null ? String(p.weight) : '0';
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'add-to-cart-btn';
          btn.setAttribute('data-product-id', id);
          btn.setAttribute('data-product-name', p.name || '');
          btn.setAttribute('data-product-price', price);
          btn.setAttribute('data-product-image', imgSrc);
          btn.setAttribute('data-stripe-price-id', '');
          btn.setAttribute('data-product-weight', w);
          btn.textContent = 'Add to Cart — $' + price;
          actions.appendChild(btn);
        } else {
          var note = document.createElement('p');
          note.className = 'catalog-snippet-card__wholesale-note';
          note.textContent = 'Wholesale and details on the product page.';
          actions.appendChild(note);
        }
        body.appendChild(actions);
        card.appendChild(body);

        anchor.parentNode.replaceChild(card, anchor);
      }
    }
  }

  function run() {
    upgradeCommerceGrids();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
