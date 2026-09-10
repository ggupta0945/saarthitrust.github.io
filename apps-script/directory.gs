/**
 * Saarthi Trust — register-form storage + services-directory feed
 * ================================================================
 *
 * What this does
 *   doPost : receives every /register/ submission (all five flows) and
 *            appends it to a tab in this spreadsheet. Provider
 *            submissions ("register-provider") go to the "Providers"
 *            tab with an Approved column your team controls.
 *   doGet  : ?fn=providers returns approved providers as JSON in
 *            exactly the shape /services/ already reads. The services
 *            page fetches this, so approving a row in the Sheet is all
 *            it takes for a person to appear on the site.
 *
 * SETUP for the EXISTING Saarthi responses spreadsheet (~5 minutes)
 * (the one already receiving website registrations — docs.google.com/
 *  spreadsheets/d/1b1TJnsNTMlrbasLFux0VPow3dGCEv5kvBgbRlkXLzNk)
 *
 *   KNOWN ISSUE this fixes: a provider test submission already reached
 *   the sheet (row dated 9/10/2026) with ONLY "provider" recorded and
 *   every other field blank. Your current script forwards submissions to
 *   the Google Form, and that Form has no provider questions — so name,
 *   phone, trade and city are silently dropped. Step 2b below is the fix.
 *
 *   1. Open the spreadsheet → Extensions → Apps Script (your existing
 *      project — the one deployed at the ENDPOINT URL in register/index.html).
 *   2a. Paste in, from this file: PROVIDERS_TAB, TRADE_MAP, CITY_MAP,
 *       mapByContains, saveProviderRow, and doGet. (If your script already
 *       has a doGet, merge the ?fn=providers branch into it instead.)
 *   2b. In your EXISTING doPost, right after it parses the JSON body, add:
 *
 *         if (d.flow === 'register-provider') {
 *           saveProviderRow(d);
 *           return ContentService.createTextOutput('{"ok":true}')
 *             .setMimeType(ContentService.MimeType.JSON);
 *         }
 *
 *       Do NOT replace your doPost — the other four flows must keep
 *       going to the Google Form exactly as they do today.
 *   3. Deploy → Manage deployments → edit (pencil) → Version: New version
 *      → Deploy. The SAME /exec URL keeps working; register page untouched.
 *   4. In services/index.html set REMOTE_URL to
 *      '<your existing /exec URL>?fn=providers'.
 *   5. Delete that blank 9/10/2026 provider test row from the sheet.
 *
 * (Starting fresh instead? This file also works standalone: paste all of
 *  it into a new sheet's Apps Script, deploy as Web app (Execute as: Me,
 *  Access: Anyone), point ENDPOINT and REMOTE_URL at the new URL.)
 *
 * MODERATION WORKFLOW
 *   - New provider rows arrive with Approved = "" (pending, NOT public).
 *   - WhatsApp the person, confirm number + consent.
 *   - Type "yes" in the Approved column and today's date in VerifiedOn
 *     (e.g. 2026-09). Within a minute the person is live on /services/.
 *   - To remove someone later: clear the Approved cell. Done.
 */

var PROVIDERS_TAB = 'Providers';

/* Display strings from the register form → ids used by /services/ filters */
var TRADE_MAP = {
  'Electrician': 'electrician',
  'Plumber': 'plumber',
  'Mason': 'mason',
  'Carpenter': 'carpenter',
  'Painter': 'painter',
  'Welder': 'welder',
  'AC & fridge repair': 'ac-repair',
  'Driver': 'driver',
  'Tailor': 'tailor',
  'Labour': 'labour'
};

var CITY_MAP = {
  'Bhawani Mandi': 'bhawani-mandi',
  'Sunel': 'sunel',
  'Pirawa': 'pirawa',
  'Jhalawar': 'jhalawar',
  'Kota': 'kota',
  'Rajgarh': 'rajgarh',
  'Jirapur': 'jirapur',
  'Pachor': 'pachor',
  'Khilchipur': 'khilchipur',
  'Biaora': 'biaora'
};

function mapByContains(map, text) {
  text = String(text || '');
  for (var key in map) {
    if (text.indexOf(key) !== -1) return map[key];
  }
  // Unmapped — someone picked "Other" and typed their own trade/town.
  // Strip the "अन्य / Other:" wrapper so the card reads cleanly. The value
  // stays unmapped on purpose: it shows under "All" with a generic icon
  // rather than being filed under the wrong filter chip.
  return text
    .replace(/^\s*अन्य\s*\/\s*/, '')
    .replace(/^\s*Other\s*:\s*/i, '')
    .trim();
}

/* ------------------------------------------------------------------ */
/* saveProviderRow — writes one provider submission to the Providers tab.
   Self-contained: paste this whole function into your existing script.   */
/* ------------------------------------------------------------------ */
function saveProviderRow(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(PROVIDERS_TAB) || ss.insertSheet(PROVIDERS_TAB);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Timestamp', 'Name', 'Phone', 'Trade', 'City', 'Note',
                  'Consent', 'Lang', 'Approved', 'VerifiedOn']);
    sh.setFrozenRows(1);
  }
  sh.appendRow([
    d.submittedAt || new Date().toISOString(),
    d.name || '',
    "'" + (d.phone || ''),   // leading apostrophe keeps the number as text
    d.trade || '',
    d.area || '',
    d.note || '',
    d.consent || '',
    d.lang || '',
    '',                      // Approved  — blank = pending, never published
    ''                       // VerifiedOn — fill as e.g. 2026-09 when you verify
  ]);
}

/* ------------------------------------------------------------------ */
/* doPost — store every register-form submission                       */
/*                                                                     */
/* MERGING INTO YOUR EXISTING SCRIPT: don't replace your doPost. Just  */
/* add these three lines immediately after it parses the JSON body:    */
/*                                                                     */
/*     if (d.flow === 'register-provider') {                           */
/*       saveProviderRow(d);                                           */
/*       return ContentService.createTextOutput('{"ok":true}')         */
/*         .setMimeType(ContentService.MimeType.JSON);                 */
/*     }                                                               */
/*                                                                     */
/* (use whatever variable your script parsed the body into). That one  */
/* early return is what stops provider submissions from falling into   */
/* the Google-Form forwarding path, which has no provider fields and   */
/* silently drops them.                                                */
/* ------------------------------------------------------------------ */
function doPost(e) {
  var out = { ok: false };
  try {
    var d = JSON.parse(e.postData.contents);

    if (d.flow === 'register-provider') {
      saveProviderRow(d);
    } else {
      // Every other flow: one tab per flow, generic key/value storage
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var tab = (d.flow || 'other').replace(/[^a-z0-9-]/gi, '');
      var sh2 = ss.getSheetByName(tab) || ss.insertSheet(tab);
      if (sh2.getLastRow() === 0) {
        sh2.appendRow(['Timestamp', 'JSON']);
        sh2.setFrozenRows(1);
      }
      sh2.appendRow([d.submittedAt || new Date().toISOString(), JSON.stringify(d)]);
    }
    out.ok = true;
  } catch (err) {
    out.error = String(err);
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* doGet — JSON feed of APPROVED providers for /services/              */
/* ------------------------------------------------------------------ */
function doGet(e) {
  if (!e || !e.parameter || e.parameter.fn !== 'providers') {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, hint: 'use ?fn=providers' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var people = [];
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROVIDERS_TAB);
  if (sh && sh.getLastRow() > 1) {
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();
    rows.forEach(function (r, i) {
      var approved = String(r[8] || '').trim().toLowerCase();
      if (['yes', 'y', 'true', 'haan', 'हाँ', 'ok'].indexOf(approved) === -1) return; // pending rows are never published
      var phone = String(r[2] || '').replace(/\D/g, '').slice(-10);
      if (phone.length !== 10) return;
      var verified = r[9];
      if (verified instanceof Date) {
        verified = verified.getFullYear() + '-' + ('0' + (verified.getMonth() + 1)).slice(-2);
      }
      people.push({
        id: 'sheet-' + (i + 2),
        name: String(r[1] || ''),
        category: mapByContains(TRADE_MAP, r[3]),
        city: mapByContains(CITY_MAP, r[4]),
        phone: phone,
        verified: String(verified || ''),
        note: String(r[5] || '')
      });
    });
  }

  return ContentService.createTextOutput(JSON.stringify({ version: 1, source: 'sheet', people: people }))
    .setMimeType(ContentService.MimeType.JSON);
}
