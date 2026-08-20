(function () {
  async function run() {
    var heroEls = document.querySelectorAll('[data-media-slot="hero"]');
    var galleryEl = document.getElementById('media-gallery');
    if (!heroEls.length && !galleryEl) return; // page hasn't opted in — no-op

    var data = null;
    try {
      var res = await fetch('./media.json');
      if (!res.ok) return;
      data = await res.json();
    } catch (e) {
      return; // never break the page over a missing/malformed JSON
    }
    if (!data) return;

    // Hero: fill every matching slot (fixes today's copy-paste-per-slot duplication)
    if (data.hero && data.hero.src) {
      heroEls.forEach(function (el) {
        el.src = data.hero.src;
        el.alt = data.hero.alt || '';
        var fallback = data.hero.fallback || '../../assets/images/hero/cacao-circles-alt.jpg';
        el.onerror = function () { el.src = fallback; el.onerror = null; };
      });
    }

    // Gallery: build each item fresh, reusing existing CSS classes (no new CSS)
    if (galleryEl && Array.isArray(data.gallery)) {
      data.gallery.forEach(function (item) {
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
          wrap.appendChild(img);
        } else {
          return; // skip malformed entries rather than fail the whole gallery
        }
        section.appendChild(wrap);
        if (item.caption) {
          var p = document.createElement('p');
          p.textContent = item.caption;
          section.appendChild(p);
        }
        galleryEl.appendChild(section);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
