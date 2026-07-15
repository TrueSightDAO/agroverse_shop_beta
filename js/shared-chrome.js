(function() {
  var path = window.location.pathname;
  var isHomepage = path === '/' || path === '/index.html';

  var homeHref = isHomepage ? '#home' : '/';
  var productsHref = isHomepage ? '#products' : '/#products';
  var contactHref = isHomepage ? '#contact' : '/#contact';

  var navHTML =
    '<header>' +
    '  <nav>' +
    '    <a class="logo" href="' + homeHref + '">' +
    '      <img alt="Agroverse Logo" src="/assets/images/logo/agroverse-logo.jpeg"/>' +
    '    </a>' +
    '    <button aria-expanded="false" aria-label="Toggle navigation menu" class="mobile-menu-toggle">' +
    '      <span class="hamburger-line"></span>' +
    '      <span class="hamburger-line"></span>' +
    '      <span class="hamburger-line"></span>' +
    '    </button>' +
    '    <ul class="nav-links mobile-menu">' +
    '      <li><a href="' + homeHref + '">Home</a></li>' +
    '      <li><a href="' + productsHref + '">Products</a></li>' +
    '      <li><a href="/cacao-journeys/">Cacao Journeys</a></li>' +
'      <li><a href="/blog/">Blog</a></li>' +
'      <li><a href="/white-label/">White Label</a></li>' +
'      <li><a href="' + contactHref + '">Contact</a></li>' +
    '    </ul>' +
    '  </nav>' +
    '</header>';

  var footerHTML =
    '<footer id="contact">' +
    '  <div class="footer-content">' +
    '    <h3 style="font-family: var(--font-heading); font-size: 2rem; margin-bottom: 1rem;">Agroverse</h3>' +
    '    <p>Regenerating Brazil\u2019s forests\u2014one cacao at a time</p>' +
    '    <p>Phone: <a href="tel:4153000019" style="color: white;">415-300-0019</a></p>' +
    '    <ul class="footer-links">' +
    '      <li><a href="/">Home</a></li>' +
    '      <li><a href="/#mission">Mission</a></li>' +
    '      <li><a href="/#products">Products</a></li>' +
    '      <li><a href="/#farmers">Farms</a></li>' +
    '      <li><a href="/#shipments">Shipments</a></li>' +
    '      <li><a href="/blog/">Blog</a></li>' +
    '      <li><a href="/partners/">Partners</a></li>' +
    '      <li><a href="/wholesale/">Wholesale</a></li>' +
'      <li><a href="/white-label/">White Label</a></li>' +
    '      <li><a href="/cacao-journeys/">Cacao Journeys</a></li>' +
    '      <li><a href="/order-history/">Order History</a></li>' +
    '      <li><a href="mailto:community@agroverse.shop">Contact</a></li>' +
    '    </ul>' +
    '    <p style="margin-top: 2rem; opacity: 0.8; font-size: 0.9rem;">\u00a9 2024 Agroverse. All rights reserved.</p>' +
    '  </div>' +
    '</footer>';

  // Inject nav immediately (blocking script, nav placeholder is right above)
  var navPlaceholder = document.getElementById('site-nav');
  if (navPlaceholder) {
    navPlaceholder.outerHTML = navHTML;
  }

  // Footer placeholder may not exist yet — defer until DOM is ready
  function injectFooter() {
    var footerPlaceholder = document.getElementById('site-footer');
    if (footerPlaceholder) {
      footerPlaceholder.outerHTML = footerHTML;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFooter);
  } else {
    injectFooter();
  }
})();
