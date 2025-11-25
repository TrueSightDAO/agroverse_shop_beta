/**
 * Agroverse Newsletter System
 * Free email marketing solution using Google App Script + Google Sheets
 * Tracks opens and clicks without monthly subscription costs
 * 
 * SETUP:
 * 1. Import agroverse_subscribe_form.csv into a Google Sheet
 * 2. Create a new Google App Script project
 * 3. Copy this code into the script
 * 4. Set Script Properties:
 *    - SUBSCRIBER_SHEET_ID - Google Sheet ID with subscriber list
 *    - SUBSCRIBER_SHEET_NAME - Sheet name (default: "Subscribers")
 *    - TRACKING_SHEET_ID - Google Sheet ID for tracking (can be same as subscriber sheet)
 *    - TRACKING_SHEET_NAME - Sheet name for tracking (default: "Email Tracking")
 * 5. Deploy as Web App for tracking endpoints
 * 6. Use sendNewsletter() function to send emails
 */

// ===== Configuration =====
function getNewsletterConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    subscriberSheetId: props.getProperty('SUBSCRIBER_SHEET_ID') || '',
    subscriberSheetName: props.getProperty('SUBSCRIBER_SHEET_NAME') || 'Subscribers',
    trackingSheetId: props.getProperty('TRACKING_SHEET_ID') || props.getProperty('SUBSCRIBER_SHEET_ID') || '',
    trackingSheetName: props.getProperty('TRACKING_SHEET_NAME') || 'Email Tracking',
    webAppUrl: props.getProperty('WEB_APP_URL') || '' // Set after deploying as Web App
  };
}

// ===== Tracking Endpoints (Deploy as Web App) =====

/**
 * Track email opens (1x1 pixel image)
 * GET /exec?action=trackOpen&email=xxx&campaign=xxx
 */
function doGet(e) {
  var action = e.parameter.action;
  
  if (action === 'trackOpen') {
    return trackEmailOpen(e.parameter);
  } else if (action === 'trackClick') {
    return trackEmailClick(e.parameter);
  }
  
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Track email opens via tracking pixel
 */
function trackEmailOpen(params) {
  try {
    var email = params.email || '';
    var campaign = params.campaign || 'newsletter';
    var timestamp = new Date().toISOString();
    
    // Log the open
    logEmailEvent({
      email: email,
      campaign: campaign,
      event: 'open',
      timestamp: timestamp,
      userAgent: params.ua || ''
    });
    
    // Return 1x1 transparent GIF
    var gifData = Utilities.base64Decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    return ContentService.createBlob(gifData, 'image/gif').setName('pixel.gif');
  } catch (error) {
    Logger.log('Error tracking open: ' + error.toString());
    // Still return pixel even on error
    var gifData = Utilities.base64Decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    return ContentService.createBlob(gifData, 'image/gif').setName('pixel.gif');
  }
}

/**
 * Track email clicks and redirect
 * GET /exec?action=trackClick&email=xxx&campaign=xxx&url=xxx
 */
function trackEmailClick(params) {
  try {
    var email = params.email || '';
    var campaign = params.campaign || 'newsletter';
    var originalUrl = params.url || '';
    var timestamp = new Date().toISOString();
    
    // Log the click
    logEmailEvent({
      email: email,
      campaign: campaign,
      event: 'click',
      timestamp: timestamp,
      url: originalUrl,
      userAgent: params.ua || ''
    });
    
    // Redirect to original URL
    if (originalUrl) {
      return HtmlService.createHtmlOutput(
        '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=' + 
        originalUrl + '"></head><body>Redirecting...</body></html>'
      );
    }
    
    return ContentService.createTextOutput('OK');
  } catch (error) {
    Logger.log('Error tracking click: ' + error.toString());
    // Still redirect even on error
    if (params.url) {
      return HtmlService.createHtmlOutput(
        '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=' + 
        params.url + '"></head><body>Redirecting...</body></html>'
      );
    }
    return ContentService.createTextOutput('OK');
  }
}

/**
 * Log email event to Google Sheet
 */
function logEmailEvent(eventData) {
  try {
    var CONFIG = getNewsletterConfig();
    if (!CONFIG.trackingSheetId) {
      Logger.log('Tracking sheet ID not configured');
      return;
    }
    
    var sheet = SpreadsheetApp.openById(CONFIG.trackingSheetId);
    var trackingSheet = sheet.getSheetByName(CONFIG.trackingSheetName);
    
    // Create tracking sheet if it doesn't exist
    if (!trackingSheet) {
      trackingSheet = sheet.insertSheet(CONFIG.trackingSheetName);
      trackingSheet.appendRow(['Timestamp', 'Email', 'Campaign', 'Event', 'URL', 'User Agent']);
    }
    
    // Append event data
    trackingSheet.appendRow([
      eventData.timestamp || new Date().toISOString(),
      eventData.email || '',
      eventData.campaign || '',
      eventData.event || '',
      eventData.url || '',
      eventData.userAgent || ''
    ]);
  } catch (error) {
    Logger.log('Error logging event: ' + error.toString());
  }
}

// ===== Email Sending =====

/**
 * Send newsletter to all subscribers
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @param {string} textBody - Plain text email body (optional)
 * @param {string} campaign - Campaign name for tracking
 */
function sendNewsletter(subject, htmlBody, textBody, campaign) {
  campaign = campaign || 'newsletter_' + new Date().getTime();
  var CONFIG = getNewsletterConfig();
  
  if (!CONFIG.subscriberSheetId) {
    throw new Error('SUBSCRIBER_SHEET_ID not configured');
  }
  
  var sheet = SpreadsheetApp.openById(CONFIG.subscriberSheetId);
  var subscriberSheet = sheet.getSheetByName(CONFIG.subscriberSheetName);
  
  if (!subscriberSheet) {
    throw new Error('Subscriber sheet not found: ' + CONFIG.subscriberSheetName);
  }
  
  var data = subscriberSheet.getDataRange().getValues();
  var headers = data[0];
  
  // Find email column (look for "Email" or "email" in headers)
  var emailColIndex = -1;
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].toString().toLowerCase().includes('email')) {
      emailColIndex = i;
      break;
    }
  }
  
  if (emailColIndex === -1) {
    throw new Error('Email column not found in subscriber sheet');
  }
  
  // Get Web App URL for tracking (must be set after deployment)
  var webAppUrl = CONFIG.webAppUrl;
  if (!webAppUrl) {
    Logger.log('WARNING: WEB_APP_URL not set. Tracking will not work. Deploy as Web App first and set the URL.');
  }
  
  var sentCount = 0;
  var errorCount = 0;
  
  // Process each subscriber (skip header row)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var email = row[emailColIndex];
    
    // Skip if email is empty or invalid
    if (!email || !email.toString().includes('@')) {
      continue;
    }
    
    email = email.toString().trim();
    
    try {
      // Add tracking pixel and wrap links
      var trackedHtmlBody = addTrackingToEmail(htmlBody, email, campaign, webAppUrl);
      var trackedTextBody = textBody || htmlBody.replace(/<[^>]+>/g, ''); // Strip HTML for text version
      
      // Send email
      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: trackedHtmlBody,
        body: trackedTextBody
      });
      
      sentCount++;
      Logger.log('Sent to: ' + email);
      
      // Rate limiting: Gmail has daily limits (100-500 emails/day for free accounts)
      // Add small delay to avoid hitting limits
      Utilities.sleep(100); // 100ms delay between emails
      
    } catch (error) {
      errorCount++;
      Logger.log('Error sending to ' + email + ': ' + error.toString());
    }
  }
  
  Logger.log('Newsletter sent: ' + sentCount + ' successful, ' + errorCount + ' errors');
  return {
    sent: sentCount,
    errors: errorCount
  };
}

/**
 * Add tracking pixel and wrap links in email HTML
 */
function addTrackingToEmail(htmlBody, email, campaign, webAppUrl) {
  if (!webAppUrl) {
    return htmlBody; // No tracking if URL not configured
  }
  
  // Encode email and campaign for URL
  var encodedEmail = encodeURIComponent(email);
  var encodedCampaign = encodeURIComponent(campaign);
  
  // Add tracking pixel at the end of body
  var trackingPixel = '<img src="' + webAppUrl + 
    '?action=trackOpen&email=' + encodedEmail + 
    '&campaign=' + encodedCampaign + 
    '" width="1" height="1" style="display:none;" alt="" />';
  
  // Wrap all links with tracking
  var trackedHtml = htmlBody.replace(
    /<a\s+([^>]*href=["\'])([^"\']+)(["\'][^>]*)>/gi,
    function(match, before, url, after) {
      // Skip if already a tracking link or mailto: link
      if (url.indexOf(webAppUrl) !== -1 || url.indexOf('mailto:') === 0) {
        return match;
      }
      
      // Create tracking URL
      var trackedUrl = webAppUrl + 
        '?action=trackClick&email=' + encodedEmail + 
        '&campaign=' + encodedCampaign + 
        '&url=' + encodeURIComponent(url);
      
      return '<a ' + before + trackedUrl + after + '>';
    }
  );
  
  // Add tracking pixel before closing body tag, or at end if no body tag
  if (trackedHtml.indexOf('</body>') !== -1) {
    trackedHtml = trackedHtml.replace('</body>', trackingPixel + '</body>');
  } else {
    trackedHtml = trackedHtml + trackingPixel;
  }
  
  return trackedHtml;
}

// ===== Analytics Functions =====

/**
 * Get campaign statistics
 * @param {string} campaign - Campaign name
 */
function getCampaignStats(campaign) {
  var CONFIG = getNewsletterConfig();
  var sheet = SpreadsheetApp.openById(CONFIG.trackingSheetId);
  var trackingSheet = sheet.getSheetByName(CONFIG.trackingSheetName);
  
  if (!trackingSheet) {
    return { sent: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0 };
  }
  
  var data = trackingSheet.getDataRange().getValues();
  var campaignData = data.filter(function(row) {
    return row[2] === campaign; // Campaign column
  });
  
  var opened = campaignData.filter(function(row) {
    return row[3] === 'open'; // Event column
  }).length;
  
  var clicked = campaignData.filter(function(row) {
    return row[3] === 'click'; // Event column
  }).length;
  
  var uniqueEmails = {};
  campaignData.forEach(function(row) {
    if (row[1]) uniqueEmails[row[1]] = true; // Email column
  });
  var sent = Object.keys(uniqueEmails).length;
  
  return {
    sent: sent,
    opened: opened,
    clicked: clicked,
    openRate: sent > 0 ? (opened / sent * 100).toFixed(2) + '%' : '0%',
    clickRate: sent > 0 ? (clicked / sent * 100).toFixed(2) + '%' : '0%'
  };
}

/**
 * Test function - send test email to yourself
 */
function testNewsletter() {
  var testEmail = Session.getActiveUser().getEmail();
  var subject = 'Test Newsletter - Agroverse';
  var htmlBody = '<h1>Test Newsletter</h1><p>This is a test email.</p><p><a href="https://www.agroverse.shop">Visit Agroverse</a></p>';
  
  var CONFIG = getNewsletterConfig();
  var trackedHtml = addTrackingToEmail(htmlBody, testEmail, 'test', CONFIG.webAppUrl);
  
  MailApp.sendEmail({
    to: testEmail,
    subject: subject,
    htmlBody: trackedHtml,
    body: 'Test Newsletter\n\nThis is a test email.\n\nVisit Agroverse: https://www.agroverse.shop'
  });
  
  Logger.log('Test email sent to: ' + testEmail);
}


