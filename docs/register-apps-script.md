# One-time update: extend the Apps Script to handle the on-site register flow

The `/register/` page POSTs each submission to the same Apps Script web
app that already serves `/journeys/share/`. We just need to extend the
script to route based on the `flow` field in the payload, and write
into four new tabs on the same Postcards sheet:

| Tab               | Triggered by `flow` value |
|-------------------|---------------------------|
| `JobSeekers`      | `register-seeker`         |
| `Employers`       | `register-hirer`          |
| `HiredFeedback`   | `register-hired`          |
| `Volunteers`      | `register-volunteer`      |

(The `Inspirational` tab from the share-journey form keeps working
unchanged — `flow` is undefined for those, so the script falls back
to the original Inspirational path.)

You only need to **edit the deployed Apps Script code once** and click
**Deploy → Manage deployments → New version → Deploy**. The web-app
URL stays the same (no need to change anything on the HTML side).

## Steps

1. Open the Postcards sheet → **Extensions → Apps Script**.
2. Open `Code.gs`.
3. Replace its entire contents with the block below.
4. Save (Cmd+S).
5. **Deploy → Manage deployments → pencil icon → New version → Deploy**.
6. Wait ~30 seconds, then test by submitting the register page.

```javascript
// ============================================================
// Saarthi · combined backend
//   /journeys/share/  → Inspirational tab     (legacy share-journey)
//   /register/        → JobSeekers / Employers / HiredFeedback /
//                       Volunteers tab, based on `flow` field
// ============================================================

const SHEET_ID = '1b1TJnsNTMlrbasLFux0VPow3dGCEv5kvBgbRlkXLzNk';

// ---------------- Headers per tab ----------------
const TABS = {
  'Inspirational': [
    'Timestamp', 'Name', 'Contact', 'Role + city', 'Social links',
    'Q1 Growing up + parents', 'Q2 Class 10 self', 'Q3 College + course choice',
    'Q4 Pivotal moment', 'Q5 Career steps', 'Q6 Failures + low moments',
    'Q7 Work life today', 'Q8 Advice to Class 10', 'Q9 Myth to break',
    'Q10 To 15-year-old self', 'Anything else', 'Consent', 'Language', 'User agent'
  ],
  'JobSeekers': [
    'Timestamp', 'Name', 'Age', 'Gender', 'Phone (WhatsApp)',
    'Area', 'Work type', 'Full/Part time', 'When can start', 'Language'
  ],
  'Employers': [
    'Timestamp', 'Name', 'Phone', 'Business type',
    'Area', 'Worker needed', 'Headcount', 'Min salary', 'Language'
  ],
  'HiredFeedback': [
    'Timestamp', 'Your name', 'Your phone',
    'Whom you hired', 'Their phone', 'Suggestions', 'Language'
  ],
  'Volunteers': [
    'Timestamp', 'Name', 'Phone', 'Area',
    'How they want to contribute', 'Suggestions', 'Language'
  ]
};

// ---------------- Tab routing ----------------
const FLOW_TO_TAB = {
  'register-seeker':    'JobSeekers',
  'register-hirer':     'Employers',
  'register-hired':     'HiredFeedback',
  'register-volunteer': 'Volunteers'
};

function ensureSheet_(tabName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) sheet = ss.insertSheet(tabName);
  const headers = TABS[tabName];
  const lastCol = Math.max(1, sheet.getLastColumn());
  const existing = sheet.getLastRow() === 0
    ? []
    : sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let needsHeaders = existing.length === 0;
  for (let i = 0; i < headers.length && !needsHeaders; i++) {
    if (existing[i] !== headers[i]) needsHeaders = true;
  }
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function rowFor_(tabName, data) {
  const ts = new Date();
  switch (tabName) {
    case 'Inspirational':
      return [
        ts,
        data.name || '', data.contact || '', data.role || '', data.socials || '',
        data.q1 || '', data.q2 || '', data.q3 || '', data.q4 || '', data.q5 || '',
        data.q6 || '', data.q7 || '', data.q8 || '', data.q9 || '', data.q10 || '',
        data.anything || '',
        data.consent ? 'Yes' : 'No',
        data.lang || '',
        (data.userAgent || '')
      ];
    case 'JobSeekers':
      return [
        ts,
        data.name || '', data.age || '', data.gender || '', data.phone || '',
        data.area || '', data.worktype || '', data.duration || '', data.startDate || '',
        data.lang || ''
      ];
    case 'Employers':
      return [
        ts,
        data.name || '', data.phone || '', data.business || '',
        data.area || '', data.need || '', data.count || '', data.salary || '',
        data.lang || ''
      ];
    case 'HiredFeedback':
      return [
        ts,
        data.name || '', data.phone || '',
        data.whoHired || '', data.whoHiredPhone || '', data.suggestions || '',
        data.lang || ''
      ];
    case 'Volunteers':
      return [
        ts,
        data.name || '', data.phone || '', data.area || '',
        data.contribution || '', data.suggestions || '',
        data.lang || ''
      ];
  }
  return [];
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const tabName = FLOW_TO_TAB[data.flow] || 'Inspirational';
    const sheet = ensureSheet_(tabName);
    const row = rowFor_(tabName, data);
    sheet.appendRow(row);
    return ContentService
      .createTextOutput(JSON.stringify({status:'ok', tab:tabName}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({status:'error', message:String(err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Saarthi combined endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

## Test plan after redeploy

1. **Job-seeker flow** — Open `/register/`, pick *I'm looking for a job*, fill in a test row, submit. Open the sheet → a new tab `JobSeekers` appears (or gets a row appended if it already exists).
2. **Hirer flow** — pick *I want to hire*, submit. Check `Employers` tab.
3. **Hired-feedback flow** — pick *I've already hired*, submit. Check `HiredFeedback` tab.
4. **Volunteer flow** — pick *Be someone's Saarthi*, submit. Check `Volunteers` tab.
5. **Old share-journey form** — re-test `/journeys/share/` still writes to `Inspirational` tab unchanged.

If anything errors, open the Apps Script editor → **Executions** tab → click the latest failed run → see the stack trace.
