(function() {
  'use strict';

  var EDGAR_BASE = 'https://edgar.truesight.me';
  // Kept in sync with js/config.js's GOOGLE_SCRIPT_URL by hand (this file
  // doesn't load config.js's value for this constant) -- see the comment
  // there re: the 2026-07-17 stale-deployment-ID incident before assuming
  // this URL is still correct.
  var GAS_CHECKOUT = 'https://script.google.com/macros/s/AKfycbwNfYeWKDnWGblvrs0VE-WYvzo8voMSIOdxBkaH7SJlRKJTyU_l_Gn4UIFZkQijUq6J/exec';
  var GH_REPO = 'TrueSightDAO/agroverse-designs';
  var GH_API = 'https://api.github.com/repos/' + GH_REPO + '/contents/designs';
  var GH_RAW = 'https://raw.githubusercontent.com/' + GH_REPO + '/main/designs';

  // agroverse_shop_checkout.gs already branches its Stripe key (test vs live)
  // on this exact value -- js/checkout.js (the main cart) already sends it.
  // white-label.js hit the same GAS endpoint but never passed it, so it
  // silently used the LIVE key on beta and localhost. js/config.js already
  // computes the right value per-hostname (beta.agroverse.shop and
  // localhost/127.0.0.1 -> 'development' -> Stripe test key); this just
  // reads it. Falls back to 'production' (safe default) if config.js
  // somehow isn't loaded, matching the GAS script's own default.
  function gasEnvironment() {
    return (window.AGROVERSE_CONFIG && window.AGROVERSE_CONFIG.environment) || 'production';
  }

  var client = new DaoClient({
    edgarBase: EDGAR_BASE,
    publicKeyKey: 'publicKey',
    privateKeyKey: 'privateKey'
  });

  var selectedDesign = null;

  // ─── EMAIL REGISTRATION/VERIFICATION (bypasses a dao-client parsing bug) ──
  //
  // dao-client@1.1.0-rc.4's parseEmailRegistration() reads body.email_registration
  // (snake_case), but Edgar's actual /dao/submit_contribution response embeds
  // this data as body.emailRegistration (camelCase) -- confirmed live against
  // production (2026-07-16): a real registration + verification with
  // admin+claude@truesight.me activated correctly server-side (Contributors
  // Digital Signatures row flipped to ACTIVE, confirmed by re-clicking the
  // same link and getting {"already_consumed":true}), but the frontend never
  // saw it because result.emailRegistration was always undefined. Every
  // consumer of client.registerEmail()/verifyEmail() has this bug (also
  // affects oracle); this is a local workaround, not a fix to the shared
  // library, because publishing a new dao-client version is a separate,
  // wider-blast-radius change. See CONTEXT_UPDATES.md for the full writeup.
  //
  // client.sign() (not client.submitEvent()) is used deliberately: it's the
  // one public dao-client method that signs without also parsing/consuming
  // the response, so we read Edgar's raw JSON ourselves. Timestamp is
  // injected manually for the same reason as the upload flow (B4) --
  // client.sign() uses the legacy non-Timestamp payload builder.
  function parseEmailRegistrationFixed(body) {
    var er = body && body.emailRegistration;
    if (!er || !er.applicable) return undefined;
    var status = 'not_applicable';
    if (er.ok === true) {
      if (er.activated === true) status = 'activated';
      else if (er.already_consumed === true) status = 'already_consumed';
      else if (er.event === 'EMAIL_REGISTERED') status = 'pending_verification';
    } else if (er.ok === false) {
      if (/different device/i.test(er.error || '')) status = 'pubkey_mismatch';
      else if (/not found|no matching/i.test(er.error || '')) status = 'not_found';
    }
    return { status: status, contributorEmail: er.email, error: er.error };
  }

  async function submitEmailEvent(eventName, fields) {
    var signResult = await client.sign(eventName, Object.assign({ Timestamp: new Date().toISOString() }, fields));
    var formData = new FormData();
    formData.append('text', signResult.shareText);
    var resp = await fetch(EDGAR_BASE + '/dao/submit_contribution', { method: 'POST', body: formData });
    var body = await resp.json().catch(function() { return {}; });
    var er = parseEmailRegistrationFixed(body);
    return {
      ok: body.signature_verification === 'success',
      error: (er && er.error) || body.error,
      emailRegistration: er
    };
  }

  function registerEmailFixed(email) {
    return submitEmailEvent('EMAIL REGISTERED EVENT', { Email: email });
  }

  function verifyEmailFixed(email, vk) {
    return submitEmailEvent('EMAIL VERIFICATION EVENT', { Email: email, 'Verification Key': vk });
  }

  // ─── EMAIL HELPERS ─────────────────────────────────────────────────

  function getEmail() {
    return localStorage.getItem('agroverse_wl_email') || '';
  }

  function setEmail(email) {
    localStorage.setItem('agroverse_wl_email', email);
  }

  async function emailHash() {
    var email = getEmail();
    if (!email) return '';
    var enc = new TextEncoder();
    var hash = await crypto.subtle.digest('SHA-256', enc.encode(email.toLowerCase().trim()));
    return Array.from(new Uint8Array(hash)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // ─── UI HELPERS ────────────────────────────────────────────────────

  function show(id) { var el = document.getElementById(id); if (el) el.style.display = ''; }
  function hide(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; }
  function error(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = ''; }
  }

  // Single owner of #wl-verify-msg. Every writer goes through here, so no
  // caller can leave the element in a shape another caller depends on —
  // that coupling is what made the registration handler crash (B1).
  function verifyMessage(text) {
    document.getElementById('wl-verify-msg').textContent = text;
  }

  // Same element, but with the address emphasised. Built from DOM nodes rather
  // than innerHTML so a hostile address can't inject markup.
  function verifyMessageSentTo(email) {
    var msg = document.getElementById('wl-verify-msg');
    msg.textContent = '';
    var lead = document.createElement('strong');
    lead.textContent = 'Check your inbox.';
    var addr = document.createElement('strong');
    addr.textContent = email;
    msg.appendChild(lead);
    msg.appendChild(document.createTextNode(' We sent a verification link to '));
    msg.appendChild(addr);
    msg.appendChild(document.createTextNode('. Click it to activate your key and reach your designs.'));
    // Verification is tied to the key held by THIS browser -- clicking the
    // link on a different device/browser/profile generates a fresh key that
    // won't match, and verification fails (see verifyFromEmailLink()'s
    // pubkey_mismatch branch). State this up front rather than let people
    // discover it as an unexplained failure.
    var tip = document.createElement('em');
    tip.className = 'wl-verify-tip';
    tip.textContent = 'Open the link on this same device and browser.';
    msg.appendChild(document.createElement('br'));
    msg.appendChild(tip);
  }

  // ─── KEYPAIR ────────────────────────────────────────────────────────

  async function ensureKeypair() {
    if (client.publicKey) return client.publicKey;
    var kp = await client.generateKeyPair();
    return kp.publicKey;
  }

  // ─── AUTH FLOW ─────────────────────────────────────────────────────

  async function initAuth() {
    await ensureKeypair();
    if (client.publicKey && getEmail()) {
      showGallery();
      return;
    }
    show('wl-auth');
    document.getElementById('wl-verify-check').style.display = 'none';
    show('wl-auth-form');
  }

  async function handleAuth() {
    var email = document.getElementById('wl-email').value.trim();
    if (!email || email.indexOf('@') === -1) {
      error('wl-auth-error', 'Please enter a valid email address.');
      return;
    }

    var btn = document.getElementById('wl-auth-btn');
    var btnIdleText = btn.textContent;
    // Keypair generation (first run) plus the Edgar round-trip take a
    // couple of seconds with nothing else on screen but a greyed button --
    // felt like a freeze. Say what's happening immediately, not just "disabled".
    btn.disabled = true;
    btn.textContent = 'Sending…';
    hide('wl-auth-error');

    try {
      await ensureKeypair();
      setEmail(email);

      var result = await registerEmailFixed(email);

      if (!result.ok) {
        error('wl-auth-error', result.error || 'Registration failed. Try again.');
        btn.disabled = false;
        btn.textContent = btnIdleText;
        return;
      }

      var er = result.emailRegistration;
      if (er && er.status === 'activated') {
        showGallery();
        return;
      }

      hide('wl-auth-form');
      verifyMessageSentTo(email);
      show('wl-verify-state');
      document.getElementById('wl-verify-check').style.display = '';
    } catch (e) {
      // Re-show the form: the error element lives outside it, but the retry
      // button lives inside, and a hidden form leaves the user with no way back.
      show('wl-auth-form');
      hide('wl-verify-state');
      error('wl-auth-error', 'Error: ' + e.message);
      btn.disabled = false;
      btn.textContent = btnIdleText;
    }
  }

  document.getElementById('wl-auth-btn').addEventListener('click', handleAuth);
  document.getElementById('wl-email').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); handleAuth(); }
  });

  document.getElementById('wl-verify-check').addEventListener('click', async function() {
    try {
      var result = await registerEmailFixed(getEmail());
      var er = result.emailRegistration;
      if (er && er.status === 'activated') {
        showGallery();
      } else {
        error('wl-verify-error', 'Still pending. Check your inbox and click the verification link.');
      }
    } catch(e) {
      error('wl-verify-error', 'Error: ' + e.message);
    }
  });

  // ─── VERIFY REDIRECT ───────────────────────────────────────────────

  async function verifyFromEmailLink(email, vk) {
    show('wl-auth');
    hide('wl-auth-form');
    show('wl-verify-state');
    document.getElementById('wl-verify-check').style.display = 'none';
    verifyMessage('Verifying your email…');
    setEmail(email);

    try {
      await ensureKeypair();
      var result = await verifyEmailFixed(email, vk);
      var erStatus = result.emailRegistration && result.emailRegistration.status;

      // already_consumed means this exact link was already used successfully
      // (e.g. a double-click, or revisiting the email) -- the key IS active,
      // so treat it the same as activated rather than showing a failure for
      // something that already worked. Matches oracle's handling.
      if (result.ok && (erStatus === 'activated' || erStatus === 'already_consumed')) {
        history.replaceState(null, '', window.location.pathname);
        showGallery();
      } else {
        // Edgar's most common failure here is pubkey_mismatch (the link was
        // opened on a different device/browser than the one that
        // registered -- see verifyMessageSentTo()'s tip) and it already
        // returns a specific, actionable message for that. Surface it
        // instead of a generic string that leaves the real cause a mystery.
        verifyMessage(result.error || 'Verification did not succeed. Try registering again.');
        show('wl-auth-form');
      }
    } catch (e) {
      verifyMessage('Error: ' + e.message + '. Try registering again.');
      show('wl-auth-form');
    }
  }

  // ─── GALLERY (GitHub API directly) ──────────────────────────────────

  async function showGallery() {
    hide('wl-auth');
    hide('wl-verify-state');
    hide('wl-order');
    hide('wl-success');
    // P4: the marketing frame is for anonymous visitors only. A repeat
    // customer reordering shouldn't re-read the pitch under their own app.
    hide('wl-marketing-frame');
    show('wl-gallery');
    await loadGallery();
  }

  // Set right after a successful upload; consumed once by the next
  // loadGallery() to highlight the new card (B9) instead of a toast that's
  // already gone by the time the grid re-renders.
  var highlightDesignIdOnNextLoad = null;

  async function loadGallery() {
    var grid = document.getElementById('wl-gallery-grid');
    var empty = document.getElementById('wl-gallery-empty');
    grid.innerHTML = '';
    hide('wl-gallery-error');

    var eh = await emailHash();
    if (!eh) {
      empty.style.display = '';
      empty.textContent = 'Sign in to see your designs.';
      return;
    }

    try {
      var resp = await fetch(GH_API + '/' + eh);
      if (resp.status === 404) { empty.style.display = ''; openUploadPanel(); return; }
      if (!resp.ok) { error('wl-gallery-error', 'Could not load designs.'); return; }

      var entries = await resp.json();
      if (!Array.isArray(entries)) { empty.style.display = ''; openUploadPanel(); return; }

      var designs = [];
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].name.endsWith('.json')) {
          try {
            var dr = await fetch(entries[i].download_url);
            if (dr.ok) designs.push(await dr.json());
          } catch(e) {}
        }
      }

      designs.sort(function(a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });

      // B7: first-run is the highest-intent moment on the page. Open the
      // drop zone by default instead of hiding it behind a button click.
      if (designs.length === 0) { empty.style.display = ''; openUploadPanel(); return; }
      empty.style.display = 'none';

      for (var j = 0; j < designs.length; j++) {
        var d = designs[j];
        var card = document.createElement('div');
        card.className = 'wl-design-card';
        if (d.design_id && d.design_id === highlightDesignIdOnNextLoad) {
          card.className += ' wl-design-card--new';
        }

        var img = document.createElement('img');
        img.className = 'wl-design-card-img';
        img.src = GH_RAW + '/' + eh + '/' + d.design_id + '.png';
        img.alt = d.filename || 'Design';
        img.loading = 'lazy';

        var info = document.createElement('div');
        info.className = 'wl-design-card-info';

        var name = document.createElement('p');
        name.className = 'wl-design-card-name';
        name.textContent = d.filename || 'Design ' + d.design_id.substring(0, 8);

        var meta = document.createElement('p');
        meta.className = 'wl-design-card-meta';
        var orderCount = (d.orders && d.orders.length) ? d.orders.length : 0;
        meta.textContent = (orderCount ? orderCount + ' past order' + (orderCount > 1 ? 's' : '') : 'No orders yet');

        var btn = document.createElement('button');
        btn.className = 'wl-btn wl-btn-primary';
        btn.textContent = 'Reorder';
        btn.addEventListener('click', (function(design) {
          return function() { showOrder(design); };
        })(d));

        info.appendChild(name);
        info.appendChild(meta);
        info.appendChild(btn);
        card.appendChild(img);
        card.appendChild(info);
        grid.appendChild(card);
      }
      highlightDesignIdOnNextLoad = null;
    } catch(e) {
      error('wl-gallery-error', 'Could not load designs: ' + e.message);
    }
  }

  // ─── UPLOAD (via submit_contribution) ───────────────────────────────

  function validateImageDimensions(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = document.createElement('img');
        img.onload = function() {
          if (img.naturalWidth !== 600 || img.naturalHeight !== 1200) {
            reject('Image must be exactly 600x1200px (2"x4" portrait at 300 DPI). Got ' + img.naturalWidth + 'x' + img.naturalHeight + 'px.');
            return;
          }
          resolve({ dataUrl: img.src, width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = function() { reject('Cannot read image file.'); };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Q5: no branded artboard exists yet. Generates a correctly-dimensioned
  // blank guide client-side (safe-area margin + centreline) so first-run
  // isn't a wall with no way to produce a conforming file. Replace with a
  // designed asset from Gary when one exists.
  function downloadTemplate() {
    var canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 1200;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 1200);
    ctx.strokeStyle = '#c0392b';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 540, 1140); // safe-area margin guide
    ctx.setLineDash([]);
    ctx.fillStyle = '#999999';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('600 x 1200px — 2"x4" at 300 DPI', 300, 600);
    ctx.fillText('keep key art inside the dashed line', 300, 636);
    canvas.toBlob(function(blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'agroverse-white-label-template-600x1200.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
  document.getElementById('wl-download-template').addEventListener('click', downloadTemplate);

  // B7: open-by-default on an empty gallery. Reused by wl-upload-btn's
  // manual toggle so both paths land in the same state.
  function openUploadPanel() {
    document.getElementById('wl-upload-panel').style.display = '';
  }

  document.getElementById('wl-upload-btn').addEventListener('click', function() {
    var panel = document.getElementById('wl-upload-panel');
    panel.style.display = panel.style.display === 'none' ? '' : 'none';
  });

  var dropZone = document.getElementById('wl-drop-zone');
  dropZone.addEventListener('click', function() { document.getElementById('wl-design-file').click(); });
  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    var file = e.dataTransfer.files[0];
    if (file) handleDesignFile(file);
  });

  document.getElementById('wl-design-file').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (file) handleDesignFile(file);
  });

  var pendingDesignFile = null;
  var pendingBadFile = null; // held for the auto-fit escape hatch

  function showPreview(file) {
    pendingDesignFile = file;
    var reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('wl-upload-preview-img').src = e.target.result;
      show('wl-upload-preview');
      dropZone.style.display = 'none';
      hide('wl-upload-recover');
    };
    reader.readAsDataURL(file);
  }

  async function handleDesignFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg') {
      error('wl-upload-error', 'Only PNG and JPEG files are supported.');
      return;
    }
    hide('wl-upload-error');
    try {
      await validateImageDimensions(file);
      showPreview(file);
    } catch (err) {
      // Never a bare rejection with no way forward: offer the template
      // and an auto-fit that actually produces a conforming file.
      pendingBadFile = file;
      document.getElementById('wl-upload-recover-msg').textContent = String(err);
      show('wl-upload-recover');
    }
  }

  // Scales to cover 600x1200 and center-crops the overflow -- the same
  // "cover" fit CSS object-fit:cover would give you, just baked into a real
  // file so it can be uploaded and reproduced on the actual label.
  function autoFitImageToSpec(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = document.createElement('img');
        img.onload = function() {
          var canvas = document.createElement('canvas');
          canvas.width = 600;
          canvas.height = 1200;
          var ctx = canvas.getContext('2d');
          var targetRatio = 600 / 1200;
          var srcRatio = img.naturalWidth / img.naturalHeight;
          var sx, sy, sw, sh;
          if (srcRatio > targetRatio) {
            // source is relatively wider -- crop left/right
            sh = img.naturalHeight;
            sw = sh * targetRatio;
            sx = (img.naturalWidth - sw) / 2;
            sy = 0;
          } else {
            // source is relatively taller -- crop top/bottom
            sw = img.naturalWidth;
            sh = sw / targetRatio;
            sx = 0;
            sy = (img.naturalHeight - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 600, 1200);
          canvas.toBlob(function(blob) {
            if (!blob) { reject('Could not process image.'); return; }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '-autofit.png', { type: 'image/png' }));
          }, 'image/png');
        };
        img.onerror = function() { reject('Cannot read image file.'); };
        img.src = e.target.result;
      };
      reader.onerror = function() { reject('Cannot read image file.'); };
      reader.readAsDataURL(file);
    });
  }

  document.getElementById('wl-upload-autofit').addEventListener('click', async function() {
    if (!pendingBadFile) return;
    try {
      var fitted = await autoFitImageToSpec(pendingBadFile);
      pendingBadFile = null;
      showPreview(fitted);
    } catch (err) {
      document.getElementById('wl-upload-recover-msg').textContent = String(err);
    }
  });

  document.getElementById('wl-upload-recover-cancel').addEventListener('click', function() {
    pendingBadFile = null;
    hide('wl-upload-recover');
  });

  document.getElementById('wl-upload-cancel').addEventListener('click', function() {
    pendingDesignFile = null;
    hide('wl-upload-preview');
    dropZone.style.display = '';
    hide('wl-upload-error');
  });

  document.getElementById('wl-upload-submit').addEventListener('click', async function() {
    if (!pendingDesignFile || !client.publicKey) return;
    var btn = document.getElementById('wl-upload-submit');
    btn.disabled = true;
    hide('wl-upload-error');

    var designId = crypto.randomUUID();
    var filename = pendingDesignFile.name;
    var eh = await emailHash();

    var signResult = await client.sign('DESIGN UPLOAD EVENT', {
      // sign() uses the legacy payload builder (no auto Timestamp — see
      // dao-client/src/payload.ts). Inject it manually: dao.py:369 reads
      // created_at from this field, and loadGallery() below sorts on it.
      // Without it every design's created_at is "" and "newest first" is a
      // no-op (B4). _extract_field() is a plain regex scan for a
      // "- Timestamp: ..." line anywhere in the header, so this doesn't
      // require switching to buildSubmitEvent()/submitEvent() — which
      // can't carry the file attachment this call needs anyway.
      Timestamp: new Date().toISOString(),
      Email: getEmail(),
      'Design ID': designId,
      Filename: filename,
      Dimensions: '2x4in',
      'Destination Design File Location': 'https://github.com/' + GH_REPO + '/blob/main/designs/' + eh + '/' + designId + '.png'
    });

    var formData = new FormData();
    formData.append('text', signResult.shareText);
    formData.append('attachment', pendingDesignFile, filename);

    try {
      var resp = await fetch(EDGAR_BASE + '/dao/submit_contribution', { method: 'POST', body: formData });
      var body = await resp.json().catch(function() { return {}; });
      btn.disabled = false;

      if (body.signature_verification === 'success') {
        pendingDesignFile = null;
        hide('wl-upload-preview');
        dropZone.style.display = '';
        document.getElementById('wl-upload-panel').style.display = 'none';
        // B9: the panel used to just close, indistinguishable from a silent
        // failure. Confirm explicitly, then highlight the new card once the
        // grid reloads (designs sort newest-first since B4).
        show('wl-upload-success');
        setTimeout(function() { hide('wl-upload-success'); }, 4000);
        highlightDesignIdOnNextLoad = designId;
        loadGallery();
      } else {
        error('wl-upload-error', body.error || 'Upload failed. Signature verification: ' + body.signature_verification);
      }
    } catch (e) {
      error('wl-upload-error', 'Network error: ' + e.message);
      btn.disabled = false;
    }
  });

  // ─── ORDER ─────────────────────────────────────────────────────────

  function showOrder(design) {
    selectedDesign = design;
    hide('wl-gallery');
    // E1: no marketing frame above the order form. Defensive -- showGallery()
    // already hides it on the only path that reaches showOrder() today, but
    // this state should never depend on that.
    hide('wl-marketing-frame');
    show('wl-order');
    document.getElementById('wl-order-design-img').src = design.image_url;
    document.getElementById('wl-order-design-name').textContent = design.filename || 'Design ' + design.design_id.substring(0, 8);
    updateOrderSummary();
    updateProduceButton();
  }

  document.getElementById('wl-order-back').addEventListener('click', function() {
    hide('wl-order');
    show('wl-gallery');
    selectedDesign = null;
  });

  // B8: realizing the wrong design is selected previously only offered
  // "Back to Gallery" -- an extra click to then find Upload again.
  document.getElementById('wl-order-different-design').addEventListener('click', async function() {
    selectedDesign = null;
    hide('wl-order');
    await showGallery();
    openUploadPanel();
  });

  document.getElementById('wl-order-qty').addEventListener('change', function() {
    updateOrderSummary();
    invalidateShippingRates();
  });

  // E4: there was no summary before -- "Total" (bars only) excluded
  // shipping, so the number on screen was never the number Stripe would
  // actually charge. Reflects the live shipping selection once one exists.
  function updateOrderSummary() {
    var qty = parseInt(document.getElementById('wl-order-qty').value);
    var barsTotal = qty * 10;
    document.getElementById('wl-order-summary-bars').textContent =
      qty + ' × $10 = ' + barsTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    document.getElementById('wl-order-summary-trees').textContent =
      '🌳 ' + qty + ' tree' + (qty === 1 ? '' : 's') + ' planted';

    var shippingRow = document.getElementById('wl-order-summary-shipping-row');
    var totalEl = document.getElementById('wl-order-summary-total');
    if (selectedShippingRateAmount != null) {
      shippingRow.style.display = '';
      document.getElementById('wl-order-summary-shipping').textContent =
        selectedShippingRateLabel + ' — ' + selectedShippingRateAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      var grandTotal = barsTotal + selectedShippingRateAmount;
      totalEl.textContent = 'Total: ' + grandTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    } else {
      shippingRow.style.display = 'none';
      totalEl.textContent = 'Total: ' + barsTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) + ' + shipping';
    }
  }

  var shippingPolling = null;
  ['wl-ship-address', 'wl-ship-city', 'wl-ship-zip'].forEach(function(id) {
    document.getElementById(id).addEventListener('blur', pollShippingRates);
  });
  document.getElementById('wl-ship-state').addEventListener('change', pollShippingRates);
  var selectedShippingRateId = null;
  var selectedShippingRateAmount = null;
  var selectedShippingRateLabel = null;

  function pollShippingRates() {
    if (shippingPolling) clearTimeout(shippingPolling);
    shippingPolling = setTimeout(calculateShipping, 300);
  }

  // Quantity drives shipping weight (see calculateShipping). A rate quoted
  // before the qty change no longer matches what will actually ship (B3) —
  // clear it immediately so a stale selection can never reach checkout, and
  // re-quote right away if an address is already on file.
  function invalidateShippingRates() {
    selectedShippingRateId = null;
    selectedShippingRateAmount = null;
    selectedShippingRateLabel = null;
    document.getElementById('wl-ship-rates').innerHTML = '';
    updateOrderSummary();
    updateProduceButton();

    var addr = document.getElementById('wl-ship-address').value.trim();
    var city = document.getElementById('wl-ship-city').value.trim();
    var state = document.getElementById('wl-ship-state').value;
    var zip = document.getElementById('wl-ship-zip').value.trim();
    if (addr && city && state && zip) pollShippingRates();
  }

  async function calculateShipping() {
    var addr = document.getElementById('wl-ship-address').value.trim();
    var city = document.getElementById('wl-ship-city').value.trim();
    var state = document.getElementById('wl-ship-state').value;
    var zip = document.getElementById('wl-ship-zip').value.trim();
    if (!addr || !city || !state || !zip) return;

    var qty = parseInt(document.getElementById('wl-order-qty').value);
    var totalWeightOz = (1.76 * qty) + 11.5 + (0.65 * qty);

    try {
      var resp = await fetch(GAS_CHECKOUT + '?' + new URLSearchParams({
        action: 'calculateShippingRates',
        weightOz: totalWeightOz.toFixed(1),
        shippingAddress: JSON.stringify({ address: addr, city: city, state: state, zip: zip, country: 'US' }),
        environment: gasEnvironment()
      }));
      var data = await resp.json().catch(function() { return { status: 'error' }; });
      var ratesDiv = document.getElementById('wl-ship-rates');

      if (data.status === 'success' && data.rates && data.rates.length > 0) {
        ratesDiv.style.display = '';
        ratesDiv.innerHTML = '';
        selectedShippingRateId = null;
        selectedShippingRateAmount = null;
        selectedShippingRateLabel = null;
        for (var i = 0; i < data.rates.length; i++) {
          var rate = data.rates[i];
          var rateAmount = parseFloat(rate.amount);
          var rateLabel = rate.name + ' (' + (rate.deliveryDays || '?') + ')';
          var label = document.createElement('label');
          label.className = 'wl-ship-option';
          var radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = 'wl-ship-rate';
          radio.value = rate.id || ('rate_' + i);
          radio.addEventListener('change', (function(id, amount, lbl) {
            return function() {
              selectedShippingRateId = id;
              selectedShippingRateAmount = amount;
              selectedShippingRateLabel = lbl;
              updateOrderSummary();
              updateProduceButton();
            };
          })(radio.value, rateAmount, rateLabel));
          var span = document.createElement('span');
          span.textContent = rate.name + ' — $' + rateAmount.toFixed(2) + ' (' + (rate.deliveryDays || '?') + ')';
          if (i === 0) radio.checked = true;
          label.appendChild(radio);
          label.appendChild(span);
          ratesDiv.appendChild(label);
          if (i === 0) {
            radio.checked = true;
            selectedShippingRateId = radio.value;
            selectedShippingRateAmount = rateAmount;
            selectedShippingRateLabel = rateLabel;
          }
        }
        updateOrderSummary();
        updateProduceButton();
      } else {
        ratesDiv.style.display = '';
        ratesDiv.innerHTML = '<p class="wl-error">Unable to calculate shipping. Check address and try again.</p>';
        updateProduceButton();
      }
    } catch (e) {
      // B5: this previously failed silently — the button stayed disabled
      // with no indication why, indistinguishable from the page being broken.
      var errDiv = document.getElementById('wl-ship-rates');
      errDiv.style.display = '';
      errDiv.innerHTML = '<p class="wl-error">Could not reach shipping — check your connection and try again.</p>';
      updateProduceButton();
    }
  }

  // B6: a greyed button with no stated reason reads as broken, not as "one
  // more step". Names the blocker instead.
  function updateProduceButton() {
    var hasRate = !!selectedShippingRateId;
    document.getElementById('wl-order-submit').disabled = !hasRate;
    var blocker = document.getElementById('wl-order-blocker');
    if (hasRate) {
      hide('wl-order-blocker');
      return;
    }
    show('wl-order-blocker');
    var addr = document.getElementById('wl-ship-address').value.trim();
    var city = document.getElementById('wl-ship-city').value.trim();
    var state = document.getElementById('wl-ship-state').value;
    var zip = document.getElementById('wl-ship-zip').value.trim();
    blocker.textContent = (addr && city && state && zip)
      ? 'Fetching shipping rates — one moment.'
      : 'Enter a shipping address to see rates and enable checkout.';
  }

  document.getElementById('wl-order-submit').addEventListener('click', async function() {
    if (!selectedDesign || !client.publicKey) return;
    var btn = document.getElementById('wl-order-submit');
    btn.disabled = true;
    hide('wl-order-error');

    var qty = parseInt(document.getElementById('wl-order-qty').value);

    // Record via submit_contribution (GAS handles order processing)
    var result = await client.submitEvent({
      eventType: 'DESIGN ORDER EVENT',
      fields: {
        Email: getEmail(),
        'Design ID': selectedDesign.design_id,
        Quantity: String(qty),
        SKU: 'custom-white-label-chocolate-bar-50g',
        'Unit Price': '10.00'
      }
    });

    if (!result.ok) {
      error('wl-order-error', result.error || 'Order recording failed. Try again.');
      btn.disabled = false;
      return;
    }

    // Build cart for GAS checkout
    var cart = {
      sessionId: 'wl-' + Date.now(),
      items: [{
        productId: 'custom-white-label-chocolate-bar-50g',
        name: 'Custom White-Label Chocolate Bar 50g',
        price: 10.00,
        quantity: qty,
        weight: 1.76,
        image: selectedDesign.image_url
      }]
    };

    var shippingAddress = {
      address: document.getElementById('wl-ship-address').value.trim(),
      city: document.getElementById('wl-ship-city').value.trim(),
      state: document.getElementById('wl-ship-state').value,
      zip: document.getElementById('wl-ship-zip').value.trim(),
      country: 'US'
    };

    var checkoutParams = new URLSearchParams({
      action: 'createCheckoutSession',
      cart: JSON.stringify(cart),
      shippingAddress: JSON.stringify(shippingAddress),
      selectedShippingRateId: selectedShippingRateId,
      designUrl: selectedDesign.image_url,
      designId: selectedDesign.design_id,
      environment: gasEnvironment()
    });

    try {
      var resp = await fetch(GAS_CHECKOUT + '?' + checkoutParams);
      var data = await resp.json().catch(function() { return { status: 'error' }; });
      if (data.status === 'success' && data.checkoutUrl) {
        // F: Stripe's redirect back only carries ?session_id= -- nothing about
        // what was actually bought. Stash it client-side so the receipt isn't
        // "Session ID: cs_test_..." (developer output, not a receipt).
        var etaDate = new Date();
        etaDate.setDate(etaDate.getDate() + 14);
        localStorage.setItem('agroverse_wl_last_order', JSON.stringify({
          designImageUrl: selectedDesign.image_url,
          designName: selectedDesign.filename || ('Design ' + selectedDesign.design_id.substring(0, 8)),
          qty: qty,
          barsTotal: qty * 10,
          shippingAmount: selectedShippingRateAmount,
          total: qty * 10 + (selectedShippingRateAmount || 0),
          eta: etaDate.toISOString(),
          email: getEmail()
        }));
        window.location.href = data.checkoutUrl;
      } else {
        error('wl-order-error', data.error || 'Checkout failed.');
        btn.disabled = false;
      }
    } catch (e) {
      error('wl-order-error', 'Network error: ' + e.message);
      btn.disabled = false;
    }
  });

  // ─── SUCCESS ───────────────────────────────────────────────────────

  document.getElementById('wl-success-back').addEventListener('click', function() {
    hide('wl-success');
    showGallery();
  });

  // F: the highest-anxiety moment in the funnel -- "I just wired $2,000 to a
  // chocolate company." A bare Session ID is developer output, not a
  // receipt. Reads the order details stashed client-side right before the
  // Stripe redirect (see the checkout handler above).
  function showSuccess(sessionId) {
    hide('wl-auth');
    hide('wl-gallery');
    hide('wl-order');
    hide('wl-marketing-frame');
    show('wl-success');

    var order = null;
    try { order = JSON.parse(localStorage.getItem('agroverse_wl_last_order') || 'null'); } catch (e) {}

    if (order) {
      var img = document.getElementById('wl-success-design-img');
      img.src = order.designImageUrl;
      img.style.display = '';

      var total = order.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      var etaStr = order.eta ? new Date(order.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      document.getElementById('wl-success-summary').textContent =
        order.qty + ' bars · ' + total + (etaStr ? ' · Est. delivery ' + etaStr : '');

      document.getElementById('wl-success-trees').textContent = '🌳 You planted ' + order.qty + ' trees.';

      if (order.email) {
        document.getElementById('wl-success-email').textContent = 'Confirmation sent to ' + order.email;
      }

      // Consumed once -- a page refresh on this same URL shouldn't keep
      // re-showing (and eventually staling) the last order's details.
      localStorage.removeItem('agroverse_wl_last_order');
    }

    document.getElementById('wl-success-ref').textContent = 'Order reference: ' + sessionId;
  }

  // ─── INIT ──────────────────────────────────────────────────────────

  // ONE router. These branches were previously two separate IIFEs, and they
  // raced: the first showed #wl-success, then the second ran initAuth(), which
  // for any returning visitor falls through to showGallery() -> hide('wl-success').
  // Every customer arriving back from Stripe therefore saw "No designs yet"
  // instead of their receipt. Branches are mutually exclusive — keep them that
  // way, and keep the receipt first: it outranks anything else we could render.
  (function init() {
    var params = new URLSearchParams(window.location.search);

    var sessionId = params.get('session_id');
    if (sessionId) {
      showSuccess(sessionId);
      return;
    }

    var em = params.get('em');
    var vk = params.get('vk');
    if (em && vk) {
      verifyFromEmailLink(em, vk);
      return;
    }

    initAuth();
  })();
})();
