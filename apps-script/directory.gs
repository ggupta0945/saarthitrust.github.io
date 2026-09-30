// ============================================================
// Saarthi · combined backend  (v5)
//   /register/         → web_registration tab (mirrors Form Responses 1 columns)
//   /register/ provider→ services_registration tab (moderated directory)
//   /journeys/share/   → Inspirational tab    (unchanged)
//   GET ?fn=providers  → JSON feed of APPROVED providers for /directory/
//
// WHAT CHANGED FROM v4 (all additive — nothing existing was altered):
//   1. SERVICES_TAB / SERVICES_HEADERS / TRADE_MAP / CITY_MAP constants
//   2. mapByContains_() and rowForProvider_() helpers
//   3. doPost: a `register-provider` branch placed BEFORE the generic
//      `register-` branch. v4 let provider submissions fall into
//      rowForRegister_(), whose switch has no provider case — so every
//      field except Timestamp and the role label was dropped. (That is
//      the blank 9/10/2026 row in the sheet; safe to delete it.)
//   4. doGet: now answers ?fn=providers with JSON. Without params it
//      still returns the plain-text "endpoint is live" message.
//
// HOW TO DEPLOY
//   1. Open the sheet → Extensions → Apps Script
//   2. Select all the existing code and paste this file over it
//   3. Deploy → Manage deployments → pencil icon → Version: New version
//      → Deploy.  The /exec URL does not change, so register/index.html
//      needs no edit.
//   4. Copy the /exec URL into directory/index.html as
//        var REMOTE_URL = '<that URL>?fn=providers';
//
// MODERATION WORKFLOW
//   - New provider rows land in services_registration with Approved BLANK.
//     Blank is never published — nothing goes public on its own.
//   - WhatsApp the person, confirm the number works and they still consent.
//   - Type `yes` in Approved and e.g. 2026-09 in VerifiedOn.
//     They appear on /directory/ on the next page load.
//   - To remove someone later: clear the Approved cell. That is the whole
//     un-publish step.
// ============================================================

const SHEET_ID = '1b1TJnsNTMlrbasLFux0VPow3dGCEv5kvBgbRlkXLzNk';

const REGISTER_TAB      = 'web_registration';
const INSPIRATIONAL_TAB = 'Inspirational';
const SERVICES_TAB      = 'services_registration';

// 33 columns — matches Form Responses 1 exactly, in the same order.
// Each role fills only its own positional slice; others stay blank.
const REGISTER_HEADERS = [
  'Timestamp',                                                                                                  //  0
  'Full Name / पूरा नाम',                                                                                       //  1  (seeker)
  'Age / उम्र',                                                                                                //  2  (seeker)
  'What is your gender? / आपका लिंग क्या है?',                                                                  //  3  (seeker)
  'Phone Number (WhatsApp) / फोन नंबर (WhatsApp वाला)',                                                         //  4  (seeker)
  'Village/Area Name / गांव या क्षेत्र का नाम',                                                                  //  5  (seeker)
  'What type of work are you looking for? / आप किस प्रकार की नौकरी ढूंढ रहे हैं?',                              //  6  (seeker)
  'Preferred Job Location / आपकी पसंदीदा नौकरी का स्थान',                                                        //  7  (not asked on /register/)
  'Are you looking for full-time or part-time work? / आप फुल टाइम या पार्ट टाइम काम ढूंढ रहे हैं?',              //  8  (seeker)
  'When can you start working? / आप काम कब से शुरू कर सकते हैं?',                                              //  9  (seeker)
  'How would you like to use Saarthi today? / आप सारथी प्लेटफ़ॉर्म का उपयोग किस उद्देश्य से कर रहे हैं?**',     // 10  (role label)
  'Whom did you hire? / आपने किसे रखा था? (name)',                                                            // 11  (hired)
  'Contact number of the person hired / जिनको आपने काम पर रखा है, उनका संपर्क नंबर (यदि उपलब्ध हो)',           // 12  (hired)
  'Any suggestions to improve Saarthi? / सारथी को बेहतर बनाने के लिए आपके सुझाव [हम आपकी ईमानदार राय की सराहना करेंगे]', // 13 (hired)
  'whatsapp_sent_jobgiver',                                                                                    // 14  (admin column, blank)
  'Your Name / आपका नाम',                                                                                      // 15  (hirer)
  'Business type / व्यवसाय का प्रकार (shop, home, warehouse, etc.)',                                            // 16  (hirer)
  'Area / क्षेत्र (Please specify city/ area)',                                                                 // 17  (hirer)
  'What kind of worker do you need? आपको किस प्रकार का कर्मचारी चाहिए?',                                       // 18  (hirer)
  'Your contact number / फोन नंबर ',                                                                            // 19  (hirer)
  'How many people you are looking to hire? / आप कितने लोगों को काम पर रखना चाहते हैं?',                         // 20  (hirer)
  'Min Salary or payment offered / न्यूनतम वेतन या भुगतान कितना देंगे?',                                         // 21  (hirer)
  'Your Name / आपका नाम',                                                                                      // 22  (hired self-name)
  'Your contact number / फोन नंबर ',                                                                            // 23  (hired self-phone)
  'Your Name / आपका नाम',                                                                                      // 24  (volunteer)
  'Phone Number (WhatsApp) / फोन नंबर ',                                                                       // 25  (volunteer)
  'How would you like to contribute? / आप कैसे योगदान देना चाहेंगे?',                                          // 26  (volunteer)
  'Any Suggestions ? ',                                                                                        // 27  (volunteer)
  'Area / क्षेत्र (Please specify city/ area)',                                                                 // 28  (volunteer)
  'Column 25',                                                                                                 // 29  (legacy placeholder, blank)
  'Would you like to reciece contact details of people via whatsapp',                                          // 30  (not asked on /register/, blank)
  'Where are you looking to hire / Area ?',                                                                    // 31  (not asked, blank)
  'status'                                                                                                     // 32  (admin column, blank)
];

const INSPIRATIONAL_HEADERS = [
  'Timestamp', 'Name', 'Contact', 'Role + city', 'Social links',
  'Q1 Growing up + parents', 'Q2 Class 10 self', 'Q3 College + course choice',
  'Q4 Pivotal moment', 'Q5 Career steps', 'Q6 Failures + low moments',
  'Q7 Work life today', 'Q8 Advice to Class 10', 'Q9 Myth to break',
  'Q10 To 15-year-old self', 'Anything else', 'Consent', 'Language', 'User agent'
];

// services_registration tab. Approved and VerifiedOn are filled in BY HAND
// by the team.
// Approved blank = pending = not on the website.
const SERVICES_HEADERS = [
  'Timestamp',    //  0
  'Name',         //  1
  'Phone',        //  2
  'Trade',        //  3
  'City',         //  4
  'Note',         //  5
  'Consent',      //  6  ('yes' — the tick box on the form
  'Lang',         //  7
  'Approved',     //  8  ← type yes here to publish; clear it to un-publish
  'VerifiedOn'    //  9  ← e.g. 2026-09, shown on the card's verified badge
];

// Bilingual labels for the "How would you like to use Saarthi today?" column.
// Match the four options users see in the role picker on the Google Form.
const ROLE_LABEL = {
  'register-seeker':    'I am looking for a job / मैं नौकरी की तलाश में हूँ',
  'register-hirer':     'I want to hire someone / मुझे किसी को काम पर रखना है',
  'register-hired':     'I have already hired through Saarthi / मैं पहले ही सारथी के ज़रिए किसी को काम पर रख चुका हूँ',
  'register-volunteer': "Be Someone's Saarthi / किसी के सारथी बनें"
};

// The register form submits bilingual display strings ("प्लंबर / Plumber").
// /directory/ filters on short ids. These map one to the other.
const TRADE_MAP = {
  'Electrician': 'electrician',
  'Plumber':     'plumber',
  'Mason':       'mason',
  'Carpenter':   'carpenter',
  'Painter':     'painter',
  'Welder':      'welder',
  'AC':          'ac-repair',   // "AC-फ्रिज मरम्मत / AC & fridge repair"
  'Driver':      'driver',
  'Tailor':      'tailor',
  'Labour':      'labour'
};

const CITY_MAP = {
  'Bhawani Mandi': 'bhawani-mandi',
  'Sunel':         'sunel',
  'Pirawa':        'pirawa',
  'Jhalawar':      'jhalawar',
  'Kota':          'kota',
  'Rajgarh':       'rajgarh',
  'Jirapur':       'jirapur',
  'Pachor':        'pachor',
  'Khilchipur':    'khilchipur',
  'Biaora':        'biaora'
};

// ---------------- Helpers ----------------
function ensureSheet_(tabName, headers) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  // Headers are written only at tab-creation time, so the user can tweak
  // them later (renames, reorders) without the script overwriting them.
  return sheet;
}

// Turn a bilingual display string into the short id /directory/ filters on.
// Unmapped values (someone picked "Other" and typed their own trade or town)
// are returned as clean text: they show under "All" with a generic icon
// rather than being filed under the wrong filter chip.
function mapByContains_(map, text) {
  text = String(text || '');
  for (const key in map) {
    if (text.indexOf(key) !== -1) return map[key];
  }
  return text
    .replace(/^\s*अन्य\s*\/\s*/, '')
    .replace(/^\s*Other\s*:\s*/i, '')
    .trim();
}

function rowForRegister_(data) {
  const N = REGISTER_HEADERS.length;
  const row = new Array(N).fill('');
  row[0] = new Date();                                  // Timestamp
  row[10] = ROLE_LABEL[data.flow] || data.role || '';   // "How would you like to use Saarthi today?"

  switch (data.flow) {
    case 'register-seeker':
      row[1] = data.name      || '';   // Full Name
      row[2] = data.age       || '';   // Age
      row[3] = data.gender    || '';   // Gender
      row[4] = data.phone     || '';   // Phone (WhatsApp)
      row[5] = data.area      || '';   // Village/Area Name
      row[6] = data.worktype  || '';   // Work type
      // row[7] Preferred Job Location — not asked on /register/
      row[8] = data.duration  || '';   // Full/Part time
      row[9] = data.startDate || '';   // When can you start
      break;

    case 'register-hirer':
      row[15] = data.name     || '';   // Your Name (hirer)
      row[16] = data.business || '';   // Business type
      row[17] = data.area     || '';   // Area
      row[18] = data.need     || '';   // What kind of worker
      row[19] = data.phone    || '';   // Your contact number
      row[20] = data.count    || '';   // How many people
      row[21] = data.salary   || '';   // Min Salary
      break;

    case 'register-hired':
      row[11] = data.whoHired      || '';   // Whom did you hire?
      row[12] = data.whoHiredPhone || '';   // Contact number of the person hired
      row[13] = data.suggestions   || '';   // Any suggestions to improve Saarthi?
      row[22] = data.name          || '';   // Your Name (hired-feedback)
      row[23] = data.phone         || '';   // Your contact number
      break;

    case 'register-volunteer':
      row[24] = data.name         || '';   // Your Name (volunteer)
      row[25] = data.phone        || '';   // Phone Number (WhatsApp)
      row[26] = data.contribution || '';   // How would you like to contribute?
      row[27] = data.suggestions  || '';   // Any Suggestions ?
      row[28] = data.area         || '';   // Area
      break;
  }
  return row;
}

// Provider rows do NOT fit the 33-column Form mirror (no trade, consent or
// approval columns exist there), so they get their own tab.
function rowForProvider_(data) {
  return [
    new Date(),                        // Timestamp
    data.name || '',                   // Name
    "'" + (data.phone || ''),          // Phone — leading ' keeps it text, not a number
    data.trade || '',                  // Trade  (bilingual string as submitted)
    data.area || '',                   // City   (bilingual string as submitted)
    data.note || '',                   // Note   (one line shown on the card)
    data.consent || '',                // Consent — 'yes' from the tick box
    data.lang || '',                   // Lang
    '',                                // Approved   — BLANK on purpose: pending
    ''                                 // VerifiedOn — filled when the team verifies
  ];
}

function rowForInspirational_(data) {
  return [
    new Date(),
    data.name || '', data.contact || '', data.role || '', data.socials || '',
    data.q1 || '', data.q2 || '', data.q3 || '', data.q4 || '', data.q5 || '',
    data.q6 || '', data.q7 || '', data.q8 || '', data.q9 || '', data.q10 || '',
    data.anything || '',
    data.consent ? 'Yes' : 'No',
    data.lang || '',
    (data.userAgent || '')
  ];
}

// ---------------- Web-app endpoints ----------------
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');

    // services_registration first — must come BEFORE the generic
    // 'register-' test below, which would otherwise swallow it and drop
    // every provider field (the v4 bug).
    if (data.flow === 'register-provider') {
      const sheet = ensureSheet_(SERVICES_TAB, SERVICES_HEADERS);
      sheet.appendRow(rowForProvider_(data));
      return ContentService
        .createTextOutput(JSON.stringify({status:'ok', tab:SERVICES_TAB}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.flow && data.flow.indexOf('register-') === 0) {
      const sheet = ensureSheet_(REGISTER_TAB, REGISTER_HEADERS);
      sheet.appendRow(rowForRegister_(data));
      return ContentService
        .createTextOutput(JSON.stringify({status:'ok', tab:REGISTER_TAB}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default: share-journey
    const sheet = ensureSheet_(INSPIRATIONAL_TAB, INSPIRATIONAL_HEADERS);
    sheet.appendRow(rowForInspirational_(data));
    return ContentService
      .createTextOutput(JSON.stringify({status:'ok', tab:INSPIRATIONAL_TAB}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({status:'error', message:String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GET ?fn=providers → the JSON /directory/ reads.
// Only rows the team marked Approved are ever included.
function doGet(e) {
  if (!e || !e.parameter || e.parameter.fn !== 'providers') {
    return ContentService
      .createTextOutput('Saarthi combined endpoint is live (v5 — web_registration + services_registration feed).')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const people = [];
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SERVICES_TAB);

    if (sheet && sheet.getLastRow() > 1) {
      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, SERVICES_HEADERS.length).getValues();

      rows.forEach(function (r, i) {
        // 1. Must be explicitly approved by a human.
        const approved = String(r[8] || '').trim().toLowerCase();
        if (['yes', 'y', 'true', 'haan', 'हाँ', 'ok'].indexOf(approved) === -1) return;

        // 2. Must have a usable 10-digit Indian mobile number.
        const phone = String(r[2] || '').replace(/\D/g, '').slice(-10);
        if (phone.length !== 10) return;

        // 3. VerifiedOn may be a real Date cell — render it as YYYY-MM.
        let verified = r[9];
        if (verified instanceof Date) {
          verified = verified.getFullYear() + '-' + ('0' + (verified.getMonth() + 1)).slice(-2);
        }

        people.push({
          id:       'sheet-' + (i + 2),   // sheet row number, so ids stay stable
          name:     String(r[1] || ''),
          category: mapByContains_(TRADE_MAP, r[3]),
          city:     mapByContains_(CITY_MAP, r[4]),
          phone:    phone,
          verified: String(verified || ''),
          note:     String(r[5] || '')
        });
      });
    }
  } catch (err) {
    // Never 500 the website. An empty feed just means /directory/ falls
    // back to whatever is in services/data.json.
    return ContentService
      .createTextOutput(JSON.stringify({version:1, source:'sheet', error:String(err), people:[]}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({version:1, source:'sheet', people:people}))
    .setMimeType(ContentService.MimeType.JSON);
}

function backfillRegisterHeaders() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(REGISTER_TAB);
  if (!sheet) { Logger.log('web_registration tab not found'); return; }
  // If row 1 already contains a data row (no headers yet), push it down
  if (sheet.getRange(1, 1).getValue() !== '') {
    sheet.insertRowBefore(1);
  }
  sheet.getRange(1, 1, 1, REGISTER_HEADERS.length).setValues([REGISTER_HEADERS]);
  sheet.getRange(1, 1, 1, REGISTER_HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  Logger.log('✓ Headers written: ' + REGISTER_HEADERS.length + ' columns');
}
