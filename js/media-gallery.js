(function () {
  // Fetch-first media source: a publisher (farm-media-daemon) reconciles raw
  // uploads into galleries/<collection>.json in the machine-owned
  // farm_media_manifests repo (Contents-API writes; the raw host is CORS-open).
  // We try that published file first, then transparently fall back to the
  // hand-authored ./media.json so no page ever regresses. Same fetch-first +
  // fallback idiom as js/inventory-service.js.
  var PUBLISHED_BASE =
    'https://raw.githubusercontent.com/TrueSightDAO/farm_media_manifests/main/galleries/';

  function collectionSlug() {
    var parts = window.location.pathname.split('/').filter(function (p) {
      return p && p !== 'index.html';
    });
    return parts.length ? parts[parts.length - 1] : '';
  }

  async function fetchJson(url) {
    try {
      var res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null; // never break the page over a missing/malformed JSON
    }
  }

  function itemKey(item) {
    if (!item) return '';
    if (item.type === 'youtube' && item.videoId) return 'youtube:' + item.videoId;
    if (item.type === 'image' && item.src) return 'image:' + item.src;
    return '';
  }

  function indexByKey(list) {
    var map = {};
    if (!Array.isArray(list)) return map;
    list.forEach(function (item) {
      var k = itemKey(item);
      if (k) map[k] = item;
    });
    return map;
  }

  // Published membership wins (so "uploaded => published" holds by construction),
  // but each entry is enriched with the hand-authored local fields (caption /
  // section / alt / fallback / aspect) matched by id/src. Hero and farmer stay
  // local-first: the publisher emits no farmer slot and a filename-only hero alt.
  function mergeData(local, published) {
    if (!local && !published) return null;
    local = local || {};
    published = published || {};

    var out = {};
    out.hero = local.hero || published.hero;
    if (local.farmer) out.farmer = local.farmer;

    var localGallery = Array.isArray(local.gallery) ? local.gallery : [];
    var pubGallery = Array.isArray(published.gallery) ? published.gallery : [];
    var base = pubGallery.length ? pubGallery : localGallery;
    var localIndex = indexByKey(localGallery);
    out.gallery = base.map(function (item) {
      var match = localIndex[itemKey(item)];
      if (!match) return item;
      var merged = {};
      Object.keys(item).forEach(function (k) {
        merged[k] = item[k];
      });
      Object.keys(match).forEach(function (k) {
        merged[k] = match[k];
      });
      return merged;
    });
    return out;
  }

  function aspectFor(item) {
    return item && item.aspect === 'portrait' ? 'portrait' : 'landscape';
  }
  function applyAspect(section, wrap, aspect) {
    if (aspect !== 'portrait') return;
    // Preserve the portrait layout used by Sao Jorge's vertical videos (9:16 frame, centered column)
    section.style.maxWidth = '420px';
    section.style.justifySelf = 'center';
    wrap.style.paddingBottom = '177.77%';
  }

  async function run() {
    var heroEls = document.querySelectorAll('[data-media-slot="hero"]');
    var galleryEls = document.querySelectorAll('[data-media-gallery]');
    var singleEl = document.getElementById('media-gallery');
    if (!heroEls.length && !galleryEls.length && !singleEl) return; // page hasn't opted in - no-op

    var local = await fetchJson('./media.json');
    var slug = collectionSlug();
    var published = slug
      ? await fetchJson(
          PUBLISHED_BASE +
            encodeURIComponent(slug) +
            '.json?t=' +
            Math.floor(Date.now() / 60000)
        )
      : null;
    var data = mergeData(local, published);
    if (!data) return;

    // Farmer slot: distinct profile photo (agl8 pattern) - filled only if data.farmer exists
    var farmerEls = document.querySelectorAll('[data-media-slot="farmer"]');
    if (data.farmer && data.farmer.src) {
      farmerEls.forEach(function (el) {
        el.src = data.farmer.src;
        el.alt = data.farmer.alt || '';
        var fFallback = data.farmer.fallback || '../../assets/images/hero/cacao-circles-alt.jpg';
        el.onerror = function () { el.src = fFallback; el.onerror = null; };
      });
    }

    // Hero: fill every matching slot (fixes today's copy-paste-per-slot duplication)
    if (data.hero && data.hero.src) {
      heroEls.forEach(function (el) {
        el.src = data.hero.src;
        el.alt = data.hero.alt || '';
        var fallback = data.hero.fallback || '../../assets/images/hero/cacao-circles-alt.jpg';
        el.onerror = function () { el.src = fallback; el.onerror = null; };
      });
    }

    function buildItem(item) {
      var section = document.createElement('div');
      section.className = 'farm-video-section';
      if (item.title) {
        var h3 = document.createElement('h3');
        h3.textContent = item.title;
        section.appendChild(h3);
      }
      var wrap = document.createElement('div');
      wrap.className = 'farm-video-container';
      if (item.type === 'youtube' && item.videoId) {
        var iframe = document.createElement('iframe');
        iframe.className = 'farm-video';
        iframe.src = 'https://www.youtube.com/embed/' + item.videoId + '?rel=0';
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.allowFullscreen = true;
        wrap.appendChild(iframe);
      } else if (item.type === 'image' && item.src) {
        var img = document.createElement('img');
        img.className = 'farm-video';
        img.loading = 'lazy';
        img.src = item.src;
        img.alt = item.alt || '';
        if (item.fallback) {
          img.onerror = function () { img.src = item.fallback; img.onerror = null; };
        }
        wrap.appendChild(img);
      } else {
        return null; // skip malformed entries rather than fail the whole gallery
      }
      applyAspect(section, wrap, aspectFor(item));
      section.appendChild(wrap);
      if (item.caption) {
        var p = document.createElement('p');
        p.textContent = item.caption;
        section.appendChild(p);
      }
      return section;
    }

    // Multi-container pages: each [data-media-gallery] container gets only items with a matching "section"
    if (galleryEls.length) {
      galleryEls.forEach(function (el) {
        var sectionName = el.getAttribute('data-media-gallery');
        if (Array.isArray(data.gallery)) {
          data.gallery.forEach(function (item) {
            if ((item.section || '') !== sectionName) return;
            var node = buildItem(item);
            if (node) el.appendChild(node);
          });
        }
      });
    }

    // Single-container pages (legacy + vivi-style): #media-gallery gets every item
    if (singleEl && Array.isArray(data.gallery)) {
      data.gallery.forEach(function (item) {
        if (item.section) return; // sectioned items belong to their own container
        var node = buildItem(item);
        if (node) singleEl.appendChild(node);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
