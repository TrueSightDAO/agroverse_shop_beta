# Agroverse Newsletter System

A **free** email marketing solution using Google App Script + Google Sheets. Tracks opens and clicks without monthly subscription costs.

## Features

✅ **Free** - No monthly subscription fees  
✅ **Open Tracking** - Track when emails are opened (via 1x1 pixel)  
✅ **Click Tracking** - Track when links are clicked  
✅ **Analytics** - View stats in Google Sheets  
✅ **HTML Emails** - Support for rich HTML content  
✅ **Rate Limiting** - Built-in delays to respect Gmail limits  

## Setup Instructions

### Step 1: Import Subscriber List

1. Open Google Sheets
2. Create a new spreadsheet or use existing one
3. Import `assets/raw/agroverse_subscribe_form.csv`
4. Note the **Sheet ID** from the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
5. Note the **Sheet name** (tab name at bottom)

### Step 2: Create Google App Script

1. Go to [Google App Script](https://script.google.com)
2. Create new project
3. Copy code from `google-app-script/agroverse_newsletter.gs`
4. Save project

### Step 3: Configure Script Properties

1. In Google App Script, click **Project Settings** (gear icon)
2. Scroll to **Script properties**
3. Add these properties:

| Property | Value | Description |
|----------|-------|-------------|
| `SUBSCRIBER_SHEET_ID` | `1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU` | Google Sheet ID with subscriber list |
| `SUBSCRIBER_SHEET_NAME` | `Subscribers` | Name of the sheet tab with subscribers |
| `TRACKING_SHEET_ID` | `1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU` | Google Sheet ID for tracking (can be same) |
| `TRACKING_SHEET_NAME` | `Email Tracking` | Name of the sheet tab for tracking data |

### Step 4: Deploy as Web App (for Tracking)

1. Click **Deploy** → **New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Click **Deploy**
6. **Copy the Web App URL** (looks like: `https://script.google.com/macros/s/.../exec`)
7. Add as Script Property:
   - Property: `WEB_APP_URL`
   - Value: Your Web App URL

### Step 5: Test

1. In Google App Script editor, run `testNewsletter()` function
2. Check your email - you should receive a test email
3. Open the email and click the link
4. Check the "Email Tracking" sheet - you should see open and click events

## Usage

### Send Newsletter

```javascript
// In Google App Script editor, create a function:

function sendMonthlyNewsletter() {
  var subject = 'Agroverse Monthly Update - January 2025';
  var htmlBody = `
    <h1>Hello from Agroverse!</h1>
    <p>We're excited to share our latest updates...</p>
    <p><a href="https://www.agroverse.shop">Visit our shop</a></p>
    <p><a href="https://www.agroverse.shop/blog">Read our blog</a></p>
  `;
  var textBody = 'Hello from Agroverse! We're excited to share our latest updates...';
  var campaign = 'monthly_newsletter_jan_2025';
  
  sendNewsletter(subject, htmlBody, textBody, campaign);
}
```

### View Campaign Statistics

```javascript
// In Google App Script editor:

function viewStats() {
  var stats = getCampaignStats('monthly_newsletter_jan_2025');
  Logger.log('Sent: ' + stats.sent);
  Logger.log('Opened: ' + stats.opened);
  Logger.log('Clicked: ' + stats.clicked);
  Logger.log('Open Rate: ' + stats.openRate);
  Logger.log('Click Rate: ' + stats.clickRate);
}
```

## How Tracking Works

### Open Tracking
- Adds a 1x1 transparent pixel image to each email
- When email is opened, image loads from your Google App Script
- Script logs the open event to Google Sheets

### Click Tracking
- All links in email are wrapped with tracking URLs
- When user clicks, they go through your Google App Script first
- Script logs the click event, then redirects to original URL

## Google Sheets Structure

### Subscribers Sheet
Columns:
- Email (required)
- Other columns from CSV (optional)

### Email Tracking Sheet (auto-created)
Columns:
- Timestamp
- Email
- Campaign
- Event (open/click)
- URL (for clicks)
- User Agent

## Gmail Limits

**Free Gmail/Google Workspace accounts:**
- 100-500 emails per day (varies by account)
- Built-in rate limiting (100ms delay between emails)

**For larger lists:**
- Consider Google Workspace (higher limits)
- Or split sends across multiple days
- Or use scheduled triggers

## Scheduled Sends

Set up time-driven trigger to send newsletters automatically:

1. In Google App Script, click **Triggers** (clock icon)
2. Click **Add Trigger**
3. Configure:
   - Function: `sendMonthlyNewsletter` (or your function)
   - Event source: **Time-driven**
   - Type: **Month timer**
   - Day of month: `1` (or your choice)
   - Time: `9:00 AM` (or your choice)

## Analytics & Reporting

### View in Google Sheets
- Open the "Email Tracking" sheet
- Filter by campaign name
- See all opens and clicks with timestamps

### Calculate Metrics
- **Open Rate**: Opens / Sent × 100
- **Click Rate**: Clicks / Sent × 100
- **Click-Through Rate**: Clicks / Opens × 100

### Export Data
- Export to CSV for analysis
- Create charts in Google Sheets
- Share with team members

## Advantages Over Paid Services

✅ **No Monthly Cost** - Completely free  
✅ **No Subscriber Limits** - Send to as many as Gmail allows  
✅ **Full Data Ownership** - All data in your Google Sheets  
✅ **Customizable** - Full control over tracking and analytics  
✅ **Integrated** - Works with existing Google infrastructure  

## Limitations

⚠️ **Gmail Daily Limits** - 100-500 emails/day (free accounts)  
⚠️ **No Advanced Features** - No A/B testing, automation workflows, etc.  
⚠️ **Manual Setup** - Requires some technical knowledge  
⚠️ **Basic Analytics** - Simple tracking, not as detailed as MailChimp/SendGrid  

## Best Practices

1. **Test First** - Always test with `testNewsletter()` before sending to all subscribers
2. **Segment Lists** - Create separate sheets for different subscriber groups
3. **Monitor Limits** - Track daily sends to avoid hitting Gmail limits
4. **Clean Lists** - Remove invalid/bounced emails regularly
5. **Respect Privacy** - Include unsubscribe links in emails
6. **Track Campaigns** - Use unique campaign names for each send

## Unsubscribe Handling

Add unsubscribe link to emails:
```html
<p><a href="mailto:unsubscribe@agroverse.shop?subject=Unsubscribe">Unsubscribe</a></p>
```

Or create a Google Form for unsubscribes and update subscriber sheet accordingly.

---

**Cost**: $0/month  
**Setup Time**: ~30 minutes  
**Maintenance**: Minimal (just send emails when needed)

