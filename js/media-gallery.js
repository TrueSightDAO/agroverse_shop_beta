(function () {
  function aspectFor(item) {
    return (item && item.aspect === 'portrait') ? 'portrait' : 'landscape';
  }
  function applyAspect(section, wrap, aspect) {
    if (aspect !== 'portrait') return;
    // Preserve the portrait layout used by São Jorge's vertical videos (9:16 frame, centered column)
    section.style.maxWidth = '420px';
    section.style.justifySelf = 'center';
    wrap.style.paddingBottom = '177.77%';
  }
  async function run() {
    var heroEls = document.querySelectorAll('[data-media-slot="hero"]');
    var galleryEls = document.querySelectorAll('[data-media-gallery]');
    var singleEl = document.getElementById('media-gallery');
    if (!heroEls.length && !galleryEls.length && !singleEl) return; // page hasn't opted in — no-op

    var data = null;
    try {
      var res = await fetch('./media.json');
      if (!res.ok) return;
      data = await res.json();
    } catch (e) {
      return; // never break the page over a missing/malformed JSON
    }
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
