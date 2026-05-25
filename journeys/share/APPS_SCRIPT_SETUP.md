# One-time setup: wire the share-journey form to your Google Sheet

The `/journeys/share/` page POSTs each submission to a Google Apps Script
"web app" which appends a row to the **Inspirational** tab of your
Postcards sheet. You need to do this setup once — about 5 minutes.

## Step 1 — Add the "Inspirational" tab to your sheet

1. Open your Postcards sheet:
   <https://docs.google.com/spreadsheets/d/1b1TJnsNTMlrbasLFux0VPow3dGCEv5kvBgbRlkXLzNk/edit>
2. At the bottom, click the **+** to add a new sheet tab.
3. Rename it exactly to **`Inspirational`** (the Apps Script looks for that name).

You don't need to add column headers yourself — the script will write them on the first submission.

## Step 2 — Open Apps Script for the sheet

1. In the sheet, click **Extensions → Apps Script**.
2. A new tab opens with the Apps Script editor and a file called `Code.gs`.
3. **Delete everything** in `Code.gs`.
4. Paste the entire block below into it:

```javascript
// ============================================================
// Saarthi · Share-your-journey form backend
// Writes each submission into the "Inspirational" tab.
// ============================================================

const SHEET_ID = '1b1TJnsNTMlrbasLFux0VPow3dGCEv5kvBgbRlkXLzNk';
const SHEET_NAME = 'Inspirational';

const HEADERS = [
  'Timestamp', 'Name', 'Contact', 'Role + city',
  'Q1 Growing up + parents',
  'Q2 Class 10 self',
  'Q3 College + course choice',
  'Q4 Pivotal moment',
  'Q5 Career steps',
  'Q6 Failures + low moments',
  'Q7 Work life today',
  'Q8 Advice to Class 10',
  'Q9 Myth to break',
  'Q10 To 15-year-old self',
  'Anything else',
  'Consent',
  'Language',
  'User agent'
];

function ensureSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  // Write headers if the sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    const sheet = ensureSheet_();
    const data = JSON.parse(e.postData.contents || '{}');
    const userAgent = (e.parameter && e.parameter.ua) || '';
    const row = [
      new Date(),
      data.name || '',
      data.contact || '',
      data.role || '',
      data.q1 || '',
      data.q2 || '',
      data.q3 || '',
      data.q4 || '',
      data.q5 || '',
      data.q6 || '',
      data.q7 || '',
      data.q8 || '',
      data.q9 || '',
      data.q10 || '',
      data.anything || '',
      data.consent ? 'Yes' : 'No',
      data.lang || '',
      userAgent
    ];
    sheet.appendRow(row);
    return ContentService
      .createTextOutput(JSON.stringify({status: 'ok'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({status: 'error', message: String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Saarthi share-journey endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

5. **Save** (Cmd+S / Ctrl+S). When prompted, name the project something like *"Saarthi share-journey"*.

## Step 3 — Deploy as a Web App

1. In the Apps Script editor top-right, click **Deploy → New deployment**.
2. Click the gear icon next to **"Select type"** → choose **Web app**.
3. Fill in:
   - **Description**: `share-journey v1` (or anything)
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone** (yes, that's correct — the form runs in visitors' browsers)
4. Click **Deploy**.
5. Google will ask for permissions:
   - Click **Authorize access**
   - Pick your Google account
   - You'll see a "Google hasn't verified this app" warning — click **Advanced** → **Go to {project name} (unsafe)** → **Allow**.
     This is expected for personal Apps Scripts you author yourself.
6. Google shows a **Web app URL** like:
   `https://script.google.com/macros/s/AKfycby.................../exec`

**Copy that URL.**

## Step 4 — Paste the URL into the form HTML

1. Open `journeys/share/index.html` in this repo.
2. Find this line near the bottom (inside the form-submission `<script>`):

   ```javascript
   var ENDPOINT = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```

3. Replace the placeholder with the URL you copied:

   ```javascript
   var ENDPOINT = 'https://script.google.com/macros/s/AKfycby.................../exec';
   ```

4. Commit + push that change.

## Step 5 — Test

1. Open the form: <https://saarthitrust.org/journeys/share/> (or your localhost preview).
2. Fill in a quick test response and submit.
3. Open the sheet's **Inspirational** tab — you should see a new row appear within a couple of seconds.

If nothing arrives, open your browser DevTools → Network tab → re-submit → check the request to the Apps Script URL. Common issues:
- URL still has the placeholder
- Web app was deployed with "Only myself" instead of "Anyone"
- Apps Script wasn't authorized (re-run the deployment flow)

## Updating the script later

If you change the Apps Script (e.g. add a new column), you need to **redeploy**:

1. **Deploy → Manage deployments**
2. Click the pencil icon next to the existing deployment
3. **Version**: New version
4. Click **Deploy**

The web app URL stays the same — no need to update the HTML again.

---

## What gets stored

| Column                       | Source                          |
|------------------------------|---------------------------------|
| Timestamp                    | Server-side `new Date()`        |
| Name                         | Form field                      |
| Contact                      | Form field (email or phone)     |
| Role + city                  | Form field                      |
| Q1–Q10                       | Each textarea                   |
| Anything else                | Optional textarea               |
| Consent                      | Yes / No (must be Yes to submit) |
| Language                     | `en` or `hi` — which UI they used |
| User agent                   | Browser string (for debugging)  |

Note: voice-dictation transcripts land in the question textareas — they're indistinguishable from typed answers in the sheet. That's intentional; you don't need to know whether they typed or dictated.
