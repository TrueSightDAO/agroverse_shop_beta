/**
 * Import Newsletter Subscribers from CSV to Google Sheet
 * 
 * Usage: node scripts/import-newsletter-subscribers.js
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  spreadsheetId: '1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU',
  sheetName: 'Agroverse News Letter Subscribers',
  csvPath: path.join(__dirname, '../assets/raw/agroverse_subscribe_form.csv'),
  // Try to find service account JSON in multiple locations
  credentialsPaths: [
    path.join(__dirname, '../google-service-account.json'),
    path.join(__dirname, '../../truesight_me/google-service-account.json'),
    path.join(__dirname, '../../market_research/google-service-account.json')
  ]
};

/**
 * Parse CSV file
 */
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Handle CSV with quoted fields that may contain commas
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add last value
    
    // Remove quotes from values
    const cleanValues = values.map(v => v.replace(/^"|"$/g, ''));
    
    if (cleanValues.length > 0 && cleanValues.some(v => v)) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = cleanValues[index] || '';
      });
      data.push(row);
    }
  }
  
  return data;
}

/**
 * Find service account credentials
 */
function findCredentials() {
  for (const credPath of CONFIG.credentialsPaths) {
    if (fs.existsSync(credPath)) {
      console.log(`✅ Found credentials at: ${credPath}`);
      return JSON.parse(fs.readFileSync(credPath, 'utf8'));
    }
  }
  return null;
}

/**
 * Main import function
 */
async function importSubscribers() {
  console.log('🚀 Importing newsletter subscribers to Google Sheet...\n');
  
  // Find credentials
  const credentials = findCredentials();
  if (!credentials) {
    console.error('❌ No Google service account credentials found.');
    console.error('   Searched in:');
    CONFIG.credentialsPaths.forEach(p => console.error(`   - ${p}`));
    return;
  }
  
  // Read and parse CSV
  if (!fs.existsSync(CONFIG.csvPath)) {
    console.error(`❌ CSV file not found: ${CONFIG.csvPath}`);
    return;
  }
  
  const csvContent = fs.readFileSync(CONFIG.csvPath, 'utf-8');
  const subscribers = parseCSV(csvContent);
  
  console.log(`📊 Parsed ${subscribers.length} subscribers from CSV\n`);
  
  // Filter to only confirmed subscribers with valid emails
  const validSubscribers = subscribers.filter(sub => {
    const email = sub.Email || sub.email || '';
    const status = sub.Status || sub.status || '';
    return email && email.includes('@') && status === 'CONFIRMED';
  });
  
  console.log(`✅ Found ${validSubscribers.length} valid confirmed subscribers\n`);
  
  try {
    // Connect to Google Sheets
    const doc = new GoogleSpreadsheet(CONFIG.spreadsheetId, new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }));
    
    await doc.loadInfo();
    console.log(`📄 Connected to spreadsheet: ${doc.title}\n`);
    
    // Get or create the sheet
    let sheet = doc.sheetsByTitle[CONFIG.sheetName];
    if (!sheet) {
      console.log(`📝 Creating sheet: ${CONFIG.sheetName}`);
      sheet = await doc.addSheet({ title: CONFIG.sheetName });
    } else {
      console.log(`📝 Using existing sheet: ${CONFIG.sheetName}`);
    }
    
    // Prepare headers - use Email as primary, include other columns
    const headers = ['Email', 'QR Code', 'Tree Updates', 'Status', 'Created Date', 'Imported Date'];
    
    // Check if sheet has headers
    let existingRows = [];
    let existingEmails = new Set();
    let hasHeaders = false;
    
    try {
      await sheet.loadHeaderRow();
      hasHeaders = sheet.headerValues && sheet.headerValues.length > 0;
    } catch (error) {
      // Sheet is empty, no headers
      hasHeaders = false;
    }
    
    // Set headers if sheet is empty
    if (!hasHeaders) {
      await sheet.setHeaderRow(headers);
      console.log(`✅ Set headers: ${headers.join(', ')}\n`);
    } else {
      // Load existing rows
      existingRows = await sheet.getRows();
      // Try to find email column
      const emailColIndex = sheet.headerValues.findIndex(h => 
        h.toLowerCase().includes('email')
      );
      if (emailColIndex >= 0) {
        existingEmails = new Set(existingRows.map(row => {
          const email = row.get(sheet.headerValues[emailColIndex]);
          return email ? email.toString().trim() : null;
        }).filter(Boolean));
      }
      console.log(`📊 Existing subscribers in sheet: ${existingEmails.size}\n`);
    }
    
    // Prepare rows to add (skip duplicates)
    const rowsToAdd = [];
    const newEmails = [];
    
    validSubscribers.forEach(sub => {
      const email = (sub.Email || sub.email || '').trim();
      if (!email || existingEmails.has(email)) {
        return; // Skip if no email or already exists
      }
      
      rowsToAdd.push([
        email,
        sub['qr_code_tracked'] || sub.qr_code_tracked || '',
        sub['Send me updates on my cacao\'s tree-planting journey'] || 
        sub['Send me updates on my cacaos tree-planting journey'] || '',
        sub.Status || sub.status || 'CONFIRMED',
        sub['Created date'] || sub['Created Date'] || '',
        new Date().toISOString()
      ]);
      
      newEmails.push(email);
      existingEmails.add(email); // Track to avoid duplicates in same batch
    });
    
    if (rowsToAdd.length === 0) {
      console.log('ℹ️  No new subscribers to add (all already exist in sheet)');
      return;
    }
    
    console.log(`📝 Adding ${rowsToAdd.length} new subscribers...\n`);
    
    // Add rows in batches (Google Sheets API limit)
    const batchSize = 100;
    for (let i = 0; i < rowsToAdd.length; i += batchSize) {
      const batch = rowsToAdd.slice(i, i + batchSize);
      await sheet.addRows(batch);
      console.log(`   ✅ Added batch ${Math.floor(i / batchSize) + 1} (${batch.length} rows)`);
    }
    
    console.log(`\n✅ Successfully imported ${rowsToAdd.length} subscribers!`);
    console.log(`\n📧 New emails added:`);
    newEmails.forEach(email => console.log(`   - ${email}`));
    
  } catch (error) {
    console.error('❌ Error importing subscribers:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  importSubscribers().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { importSubscribers };

