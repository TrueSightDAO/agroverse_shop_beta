/**
 * Harvest demotion — the "Past Harvests" section on the landing page.
 *
 * Governor decision (2026-11): sold-out lots are DEMOTED, not hidden.
 *
 * Why not hidden: these are finished harvests (Santa Ana 2023, Sao Jorge 2024, ...)
 * that will never restock. Leaving them in the main grid spends buyable real estate
 * on things nobody can buy — but deleting them would erase the provenance trail
 * (every lot carries a QR code tracing a named farm to San Francisco), and that
 * trail is the actual product. See PURPOSE_AND_MISSION.md.
 *
 * Why not hardcoded: the split is driven by the live inventory snapshot, so a lot
 * drops into Past Harvests the moment it sells out and returns if it is restocked.
 * No HTML edit is needed to maintain this.
 *
 * IMPORTANT: a SKU ABSENT from the snapshot is UNKNOWN and stays in the main grid.
 * Only an explicit 0 (or negative) demotes. Absence must never mean "sold out" —
 * that is the same class of bug fixed in inventory-service.js (PR #364), where an
 * untracked SKU rendered as "Out of stock" and disabled its Add-to-Cart button.
 *
 * Runs after inventory-display.js so it sees the final ordering. Self-contained:
 * plain DOM plus its own fetch, so it does not depend on InventoryService or
 * InventoryDisplay being exported to window.
 */
(function () {
  'use strict';

  var SNAPSHOT_URL =
    'https://raw.githubusercontent.com/TrueSightDAO/agroverse-inventory/main/store-inventory.json';
  var SECTION_ID = 'past-harvests';
  var RUN_DELAY_MS = 400; // let inventory-display finish its own pass first

  /** Resolve a product card's SKU using the same rules as inventory-display.js. */
  function productIdOf(card) {
    var btn = card.querySelector('.add-to-cart-btn, button[data-product-id]');
    var pid =
      btn && (btn.getAttribute('data-product-id') || (btn.dataset && btn.dataset.productId));
    if (!pid) {
      pid = card.getAttribute('data-product-id') || (card.dataset && card.dataset.productId);
    }
    return pid || null;
  }

  /** Create the Past Harvests section immediately after the main products section. */
  function ensureSection(productsSection) {
    var section = document.getElementById(SECTION_ID);
    if (section) return section;

    section = document.createElement('section');
    section.id = SECTION_ID;
    section.className = 'products-section past-harvests-section';
    section.style.cssText =
      'padding: 3.5rem 2rem; background-color: var(--color-bg-light, #f7f4ef); border-top: 1px solid #e8e2d8;';

    var h2 = document.createElement('h2');
    h2.textContent = 'Past Harvests';
    h2.style.cssText =
      'font-family: var(--font-heading, inherit); font-size: 32px; color: var(--color-primary, #3b3333);' +
      ' text-align: center; margin-bottom: 0.5rem;';
    section.appendChild(h2);

    var sub = document.createElement('div');
    sub.className = 'products-subtitle';
    sub.textContent =
      'These lots are sold out. They stay on the site as part of the record \u2014 every one was ' +
      'traced from a named farm to its QR code, and that paper trail is the point.';
    sub.style.cssText =
      'text-align: center; max-width: 740px; margin: 0 auto 2.5rem;' +
      ' color: var(--color-text-light, #6b6459); font-size: 15px; line-height: 1.6;';
    section.appendChild(sub);

    var gallery = document.createElement('div');
    gallery.className = 'product-gallery';
    section.appendChild(gallery);

    productsSection.parentNode.insertBefore(section, productsSection.nextSibling);
    return section;
  }

  /** Visually de-emphasise a sold-out card and disable its CTA. */
  function styleSoldOutCard(card) {
    card.style.opacity = '0.7';
    if (!card.style.position) card.style.position = 'relative';

    // Remove the grid's own inventory badge, now redundant: it reads "Out of stock"
    // while this function adds a "Sold out" pill and relabels the CTA "Sold Out".
    // Verified live 2026-11-07 \u2014 every Past Harvests card was showing BOTH labels.
    // One label says it; three say it louder and look like a rendering bug.
    Array.prototype.forEach.call(card.querySelectorAll('.inventory-badge'), function (b) {
      b.remove();
    });

    var btn = card.querySelector('.add-to-cart-btn, button[data-product-id]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sold Out';
      btn.style.backgroundColor = '#9e9e9e';
      btn.style.cursor = 'not-allowed';
      btn.style.opacity = '1';
      btn.title = 'This harvest is sold out';
    }

    if (!card.querySelector('.past-harvest-badge')) {
      var badge = document.createElement('div');
      badge.className = 'past-harvest-badge';
      badge.textContent = 'Sold out';
      badge.style.cssText =
        'position: absolute; top: 12px; right: 12px; background: #3b3333; color: #fff;' +
        ' font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;' +
        ' padding: 5px 11px; border-radius: 999px; z-index: 2;';
      card.appendChild(badge);
    }
  }

  /**
   * Move every sold-out card into the Past Harvests gallery.
   * @param {Object.<string, number>} inventory - flat SKU -> count map
   */
  function apply(inventory) {
    var productsSection = document.getElementById('products');
    if (!productsSection) return;

    var cards = Array.prototype.slice.call(document.querySelectorAll('.product-card'));
    var soldOut = [];

    cards.forEach(function (card) {
      if (card.closest && card.closest('#' + SECTION_ID)) return;
      var pid = productIdOf(card);
      if (!pid) return;
      // Absence == unknown. Never demote a SKU the snapshot does not mention.
      if (!Object.prototype.hasOwnProperty.call(inventory, pid)) return;
      var n = parseInt(inventory[pid], 10);
      if (isNaN(n)) return;
      if (n <= 0) soldOut.push(card);
    });

    if (soldOut.length === 0) {
      var existing = document.getElementById(SECTION_ID);
      if (existing) existing.remove();
      return;
    }

    var section = ensureSection(productsSection);
    var gallery = section.querySelector('.product-gallery');
    if (!gallery) return;

    soldOut.forEach(function (card) {
      styleSoldOutCard(card);
      gallery.appendChild(card);
    });
  }

  function run() {
    var url = SNAPSHOT_URL + '?t=' + Math.floor(Date.now() / 60000);
    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || typeof data !== 'object') return;
        var map = data.inventory && typeof data.inventory === 'object' ? data.inventory : data;
        if (!map || typeof map !== 'object') return;
        apply(map);
      })
      .catch(function (err) {
        // Never break the storefront: on failure leave the grid exactly as-is.
        console.warn('[past-harvests] skipped:', err);
      });
  }

  function schedule() {
    setTimeout(run, RUN_DELAY_MS);
  }

  if (document.readyState === 'complete') {
    schedule();
  } else {
    window.addEventListener('load', schedule);
  }
})();
