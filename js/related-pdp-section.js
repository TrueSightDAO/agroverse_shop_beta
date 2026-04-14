/**
 * Related PDP — reads window.PRODUCTS (products.js), inserts one section before <footer>.
 * Order: same farm first (other SKUs on this farm), then same relatedFamily from other farms, capped at MAX_CARDS.
 * Heading copy: “More [farm]” + optional line “and other similar products from other farms.”
 * Catalog image paths start with / — resolve as ../../ + path from product-page/<slug>/.
 * Retail: pill stock badge (same palette as js/inventory-display.js + home cards) + Add to cart; wholesale: note only.
 * Cards sorted: in stock first (higher count first), then unknown, then out of stock; preserves farm/line order within each tier.
 */
(function () {
  'use strict';

  var LOW_STOCK_THRESHOLD = 5;

  var HEADINGS = {
    'ceremonial-200g': 'Other ceremonial cacao (200g)',
    'bar-81-50g': 'Other single-estate dark chocolate bars',
    'whole-cacao-retail': 'More whole cacao from our farms',
    'bulk-beans-wholesale': 'Related bulk beans & nibs (wholesale)'
  };

  var MAX_CARDS = 6;

  function injectStylesOnce() {
    if (document.getElementById('related-pdp-style')) return;
    var style = document.createElement('style');
    style.id = 'related-pdp-style';
    style.textContent =
      '.related-pdp{' +
      'background:linear-gradient(180deg,#f7f7f7 0%,#fff 40%);' +
      'border-top:1px solid rgba(59,51,51,0.12);' +
      'padding:2rem 1.25rem 2.5rem;' +
      '}' +
      '.related-pdp__inner{max-width:1200px;margin:0 auto;}' +
      '.related-pdp h2{' +
      "font-family:'Playfair Display',Georgia,serif;" +
      'font-size:1.65rem;color:#3b3333;margin:0 0 0.35rem;' +
      '}' +
      '.related-pdp__sub{' +
      'margin:0 0 1rem;font-size:0.95rem;color:#756F63;line-height:1.45;' +
      '}' +
      '.related-pdp__grid{' +
      'display:grid;' +
      'grid-template-columns:repeat(auto-fill,minmax(240px,1fr));' +
      'gap:1rem;' +
      'align-items:stretch;' +
      '}' +
      '.related-pdp__card{' +
      'display:flex;flex-direction:column;' +
      'height:100%;min-height:0;' +
      'background:#fff;border:1px solid rgba(59,51,51,0.12);' +
      'border-radius:12px;overflow:hidden;color:inherit;' +
      'box-shadow:0 2px 8px rgba(0,0,0,0.06);' +
      'transition:transform .2s ease,box-shadow .2s ease;' +
      '}' +
      '.related-pdp__card:hover{' +
      'transform:translateY(-2px);' +
      'box-shadow:0 6px 16px rgba(59,51,51,0.12);' +
      '}' +
      '.related-pdp__card-link{' +
      'text-decoration:none;color:inherit;display:flex;flex-direction:column;flex-shrink:0;' +
      '}' +
      '.related-pdp__card-link:hover .related-pdp__title{text-decoration:underline;}' +
      '.related-pdp__img-wrap{' +
      'aspect-ratio:4/3;width:100%;flex-shrink:0;background:#f0ebe4;overflow:hidden;' +
      '}' +
      '.related-pdp__img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '.related-pdp__body{' +
      'padding:0.85rem 1rem 1rem;display:flex;flex-direction:column;gap:.35rem;flex:1 1 auto;min-height:0;' +
      '}' +
      '.related-pdp__title{' +
      "font-family:'Playfair Display',Georgia,serif;" +
      'font-size:1.05rem;font-weight:700;color:#3b3333;line-height:1.35;' +
      'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;' +
      'padding:0.35rem 1.1rem 0;' +
      'min-height:calc(1.05rem * 1.35 * 3);' +
      '}' +
      '.related-pdp__meta{font-size:.9rem;color:#756F63;line-height:1.4;padding:0 1.1rem;}' +
      '.related-pdp__inv{' +
      'display:block;padding:0 1.1rem;margin:0.25rem 0 0;min-height:1.6em;' +
      '}' +
      '.related-pdp__badge{' +
      'display:inline-block;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;' +
      'color:#fff;line-height:1.2;white-space:nowrap;' +
      '}' +
      '.related-pdp__badge--in{background-color:#4CAF50;}' +
      '.related-pdp__badge--low{background-color:#FF9800;}' +
      '.related-pdp__badge--out{background-color:#f44336;}' +
      '.related-pdp__badge--unknown{background-color:#756F63;}' +
      '.related-pdp__atc{' +
      'width:calc(100% - 2.2rem);margin:0.5rem 1.1rem 1rem;margin-top:auto;' +
      'padding:0.65rem 1rem;font-size:0.95rem;font-weight:700;' +
      'border-radius:6px;border:none;cursor:pointer;' +
      'background:var(--color-primary,#3b3333);color:#fff;' +
      'align-self:stretch;box-sizing:border-box;' +
      '}' +
      '.related-pdp__atc:disabled,.related-pdp__atc.out-of-stock{' +
      'opacity:0.6;cursor:not-allowed;background-color:#999 !important;color:#fff !important;' +
      '}' +
      '.related-pdp__atc:hover:not(:disabled):not(.out-of-stock){background:var(--color-secondary,#4d4d4d);}' +
      '.related-pdp__wholesale-note{' +
      'font-size:0.85rem;color:#756F63;padding:0 1.1rem 0.75rem;margin:0;margin-top:auto;' +
      '}' +
      '@media (max-width:480px){.related-pdp h2{font-size:1.4rem;}}';
    document.head.appendChild(style);
  }

  function pageSlugFromLocation() {
    var path = window.location.pathname.replace(/\/+$/, '');
    path = path.replace(/\/index\.html$/i, '');
    var parts = path.split('/').filter(Boolean);
    var i = parts.lastIndexOf('product-page');
    if (i === -1 || i >= parts.length - 1) return null;
    return decodeURIComponent(parts[i + 1]);
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

  /** Site-root paths in PRODUCTS start with / — resolve from product-page/<slug>/ */
  function assetHref(absPath) {
    if (!absPath) return '';
    if (absPath.charAt(0) === '/') return '../..' + absPath;
    return absPath;
  }

  function pdpHref(slug) {
    return '../' + encodeURI(slug) + '/';
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function metaLine(p) {
    if (p.category === 'wholesale' || !p.price) {
      return 'Wholesale · contact for pricing';
    }
    return '$' + Number(p.price).toFixed(2) + ' USD';
  }

  function isRetailPurchasable(p) {
    return p.category === 'retail' && Number(p.price) > 0;
  }

  /** Matches landing / inventory-display.js semantics for badge copy and colors. */
  function inventoryBadgeHtml(invKnown, inv) {
    if (!invKnown) {
      return '<span class="related-pdp__badge related-pdp__badge--unknown">Check availability</span>';
    }
    var n = parseInt(inv, 10) || 0;
    if (n <= 0) {
      return '<span class="related-pdp__badge related-pdp__badge--out">Out of stock</span>';
    }
    if (n <= LOW_STOCK_THRESHOLD) {
      return (
        '<span class="related-pdp__badge related-pdp__badge--low">Low stock (' +
        escapeHtml(String(n)) +
        ' left)</span>'
      );
    }
    return (
      '<span class="related-pdp__badge related-pdp__badge--in">' +
      escapeHtml(String(n)) +
      ' in stock</span>'
    );
  }

  function sortTier(invKnown, inv) {
    if (invKnown && inv > 0) return 0;
    if (invKnown && inv <= 0) return 2;
    return 1;
  }

  function enrichAndSortCards(cards, map) {
    var enriched = cards.map(function (c, idx) {
      var known = !!(map && Object.prototype.hasOwnProperty.call(map, c.id));
      var inv = known ? parseInt(map[c.id], 10) || 0 : null;
      return { id: c.id, product: c.product, inv: inv, invKnown: known, _idx: idx };
    });
    enriched.sort(function (a, b) {
      var ta = sortTier(a.invKnown, a.inv);
      var tb = sortTier(b.invKnown, b.inv);
      if (ta !== tb) return ta - tb;
      if (ta === 0 && (a.inv || 0) !== (b.inv || 0)) {
        return (b.inv || 0) - (a.inv || 0);
      }
      return a._idx - b._idx;
    });
    return enriched;
  }

  async function fetchInventoryMapOrNull() {
    if (!window.InventoryService || typeof window.InventoryService.fetchAllInventory !== 'function') {
      return null;
    }
    try {
      return await window.InventoryService.fetchAllInventory();
    } catch (e) {
      return null;
    }
  }

  function queryFamilyCards(currentId, family) {
    var list = [];
    for (var id in window.PRODUCTS) {
      if (!Object.prototype.hasOwnProperty.call(window.PRODUCTS, id)) continue;
      if (id === currentId) continue;
      var p = window.PRODUCTS[id];
      if (p.relatedFamily !== family) continue;
      if (!p.productPageSlug) continue;
      list.push({ id: id, product: p });
    }
    list.sort(function (a, b) {
      return (a.product.name || '').localeCompare(b.product.name || '');
    });
    return list;
  }

  function queryFarmCards(currentId, farmName, excludeIds) {
    var exclude = Object.create(null);
    exclude[currentId] = true;
    for (var x = 0; x < excludeIds.length; x++) {
      exclude[excludeIds[x]] = true;
    }
    var out = [];
    for (var fid in window.PRODUCTS) {
      if (!Object.prototype.hasOwnProperty.call(window.PRODUCTS, fid)) continue;
      if (exclude[fid]) continue;
      var fp = window.PRODUCTS[fid];
      if ((fp.farm || '') !== farmName) continue;
      if (!fp.productPageSlug) continue;
      out.push({ id: fid, product: fp });
    }
    out.sort(function (a, b) {
      return (a.product.name || '').localeCompare(b.product.name || '');
    });
    return out;
  }

  /** Same relatedFamily, other farms only (same-farm siblings belong in the farm bucket first). */
  function queryFamilyCardsOtherFarms(currentId, family, farmName) {
    var list = [];
    for (var id in window.PRODUCTS) {
      if (!Object.prototype.hasOwnProperty.call(window.PRODUCTS, id)) continue;
      if (id === currentId) continue;
      var p = window.PRODUCTS[id];
      if (p.relatedFamily !== family) continue;
      if (!p.productPageSlug) continue;
      if (farmName && (p.farm || '') === farmName) continue;
      list.push({ id: id, product: p });
    }
    list.sort(function (a, b) {
      return (a.product.name || '').localeCompare(b.product.name || '');
    });
    return list;
  }

  function mergeFarmThenFamilyOtherFarms(currentId, family, farmName) {
    var farmList = farmName ? queryFarmCards(currentId, farmName, [currentId]) : [];
    var familyOtherList = [];
    if (family) {
      familyOtherList = farmName
        ? queryFamilyCardsOtherFarms(currentId, family, farmName)
        : queryFamilyCards(currentId, family);
    }
    var combined = [];
    var seen = Object.create(null);
    var farmSlotsUsed = 0;
    var familySlotsUsed = 0;

    function pushList(src, track) {
      for (var i = 0; i < src.length && combined.length < MAX_CARDS; i++) {
        var c = src[i];
        if (seen[c.id]) continue;
        seen[c.id] = true;
        combined.push(c);
        if (track === 'farm') farmSlotsUsed++;
        if (track === 'family') familySlotsUsed++;
      }
    }

    pushList(farmList, 'farm');
    pushList(familyOtherList, 'family');

    return {
      cards: combined,
      farmSlotsUsed: farmSlotsUsed,
      familySlotsUsed: familySlotsUsed
    };
  }

  function addToCartButtonHtml(id, p, invKnown, inv) {
    var imgRel = assetHref(p.image);
    var w = p.weight != null ? String(p.weight) : '0';
    var price = Number(p.price).toFixed(2);
    var label = 'Add to Cart — $' + price;
    var oos = invKnown && (parseInt(inv, 10) || 0) <= 0;
    var cls = 'related-pdp__atc add-to-cart-btn' + (oos ? ' out-of-stock' : '');
    return (
      '<button type="button" class="' +
      cls +
      '" ' +
      (oos ? 'disabled ' : '') +
      'data-product-id="' +
      escapeHtml(id) +
      '" data-product-name="' +
      escapeHtml(p.name) +
      '" data-product-price="' +
      escapeHtml(price) +
      '" data-product-image="' +
      escapeHtml(imgRel) +
      '" data-stripe-price-id="" data-product-weight="' +
      escapeHtml(w) +
      '">' +
      (oos ? 'Out of Stock' : escapeHtml(label)) +
      '</button>'
    );
  }

  function cardsGridHtml(enriched) {
    var html = '<div class="related-pdp__grid">';
    for (var j = 0; j < enriched.length; j++) {
      var c = enriched[j];
      var p = c.product;
      var id = c.id;
      var invKnown = c.invKnown;
      var inv = c.inv;
      var href = pdpHref(p.productPageSlug);
      var img = assetHref(p.image);
      html +=
        '<div class="related-pdp__card">' +
        '<a class="related-pdp__card-link" href="' +
        escapeHtml(href) +
        '">' +
        '<div class="related-pdp__img-wrap">' +
        '<img class="related-pdp__img" src="' +
        escapeHtml(img) +
        '" alt="' +
        escapeHtml(p.name) +
        '" loading="lazy"/>' +
        '</div>' +
        '<span class="related-pdp__title">' +
        escapeHtml(p.name) +
        '</span>' +
        '</a>' +
        '<div class="related-pdp__body">' +
        '<span class="related-pdp__meta">' +
        escapeHtml(metaLine(p)) +
        '</span>' +
        '<div class="related-pdp__inv" aria-live="polite">' +
        inventoryBadgeHtml(invKnown, inv) +
        '</div>';

      if (isRetailPurchasable(p)) {
        html += addToCartButtonHtml(id, p, invKnown, inv);
      } else {
        html +=
          '<p class="related-pdp__wholesale-note">Wholesale and details on the product page.</p>';
      }

      html += '</div></div>';
    }
    html += '</div>';
    return html;
  }

  function sectionHtml(heading, headingId, cards, subtitle) {
    var sub =
      subtitle && String(subtitle).trim()
        ? '<p class="related-pdp__sub">' + escapeHtml(subtitle) + '</p>'
        : '';
    return (
      '<section class="related-pdp" aria-labelledby="' +
      escapeHtml(headingId) +
      '">' +
      '<div class="related-pdp__inner">' +
      '<h2 id="' +
      escapeHtml(headingId) +
      '">' +
      escapeHtml(heading) +
      '</h2>' +
      sub +
      cardsGridHtml(cards) +
      '</div></section>'
    );
  }

  async function render() {
    if (!window.PRODUCTS) return;

    var slug = pageSlugFromLocation();
    var resolved = resolveProduct(slug);
    if (!resolved) return;

    var family = resolved.product.relatedFamily;
    var farmName = (resolved.product.farm || '').trim();
    var merged = mergeFarmThenFamilyOtherFarms(resolved.id, family, farmName);
    var cards = merged.cards;

    if (!cards.length) return;

    var map = await fetchInventoryMapOrNull();
    var enriched = enrichAndSortCards(cards, map);

    injectStylesOnce();

    var footer = document.querySelector('footer');
    if (!footer) return;

    var heading;
    var subtitle = '';
    var lineLabel = family ? HEADINGS[family] || 'Similar products' : '';

    if (merged.farmSlotsUsed > 0 && farmName) {
      heading = 'More ' + farmName;
      if (merged.familySlotsUsed > 0) {
        subtitle = 'and other similar products from other farms.';
      }
    } else if (merged.familySlotsUsed > 0 && lineLabel) {
      heading = lineLabel;
    } else {
      heading = farmName ? 'More ' + farmName : 'Related products';
    }

    var block = sectionHtml(heading, 'related-pdp-heading', enriched, subtitle);

    footer.insertAdjacentHTML('beforebegin', block);

    if (typeof window.agroverseRefreshAddToCartButtons === 'function') {
      window.agroverseRefreshAddToCartButtons();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      render();
    });
  } else {
    render();
  }
})();
