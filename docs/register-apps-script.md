# One-time update: Apps Script v2 — also mirrors to "Form Responses 1"

The `/register/` page POSTs each submission to the same Apps Script web
app that already serves `/journeys/share/`. This **v2** of the script
does two things in one POST:

1. Writes a row in the **role-specific tab** (`JobSeekers` / `Employers` /
   `HiredFeedback` / `Volunteers`), each with a clean per-role column
   layout. Tabs are auto-created on the first submission.
2. **Also mirrors** the same submission into the existing
   **`Form Responses 1`** tab — using the same 27-column layout that
   the linked Google Form uses, so registrations from this site appear
   alongside Google-Form registrations in one consolidated view.

The `Inspirational` tab from `/journeys/share/` keeps working unchanged.

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
// Saarthi · combined backend  (v2 — mirrors to Form Responses 1)
//   /journeys/share/  → Inspirational tab     (legacy share-journey)
//   /register/        → JobSeekers / Employers / HiredFeedback /
//                       Volunteers (role-specific)
//                    AND mirrored into Form Responses 1 (consolidated)
// ============================================================

const SHEET_ID = '1b1TJnsNTMlrbasLFux0VPow3dGCEv5kvBgbRlkXLzNk';
const FORM_RESPONSES_TAB = 'Form Responses 1';

// ---------------- Per-flow column layouts for role-specific tabs ----------------
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

const FLOW_TO_TAB = {
  'register-seeker':    'JobSeekers',
  'register-hirer':     'Employers',
  'register-hired':     'HiredFeedback',
  'register-volunteer': 'Volunteers'
};

// ---------------- Column layout of Form Responses 1 ----------------
// 27 columns, mirroring the Google Form's question order. Indices are
// 0-based here; the appendRow API consumes them as positional values.
// If your Google Form has been edited and columns are now in a different
// order, run logFormResponsesHeaders() once from the Apps Script editor
// to see the actual headers, then adjust FR1_COLS below to match.
const FR1_COLS = {
  // section 1 — role
  timestamp:        0,   // auto: column A
  role:             1,   // "How would you like to use Saarthi today?"
  // section 2 — job seeker
  seeker_name:      2,
  seeker_age:       3,
  seeker_gender:    4,
  seeker_phone:     5,
  seeker_area:      6,
  seeker_worktype:  7,
  seeker_duration:  8,
  seeker_start:     9,
  // section 3 — job provider
  hirer_name:       10,
  hirer_phone:      11,
  hirer_business:   12,
  hirer_area:       13,
  hirer_need:       14,
  hirer_count:      15,
  hirer_salary:     16,
  // section 4 — hired feedback
  hired_name:       17,
  hired_phone:      18,
  hired_who:        19,
  hired_who_phone:  20,
  hired_suggestions:21,
  // section 5 — volunteer
  vol_name:         22,
  vol_phone:        23,
  vol_area:         24,
  vol_contribution: 25,
  vol_suggestions:  26
};
const FR1_WIDTH = 27;

const ROLE_LABEL = {
  'register-seeker':    'I am looking for a job / मैं नौकरी की तलाश में हूँ',
  'register-hirer':     'I want to hire someone / मुझे किसी को काम पर रखना है',
  'register-hired':     'I have already hired through Saarthi / मैं पहले ही सारथी के ज़रिए किसी को काम पर रख चुका हूँ',
  'register-volunteer': "Be Someone's Saarthi / किसी के सारथी बनें"
};

// ---------------- Helpers ----------------
function ensureSheet_(tabName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) sheet = ss.insertSheet(tabName);
  const headers = TABS[tabName];
  if (!headers) return sheet;   // tabs we don't manage (like Form Responses 1)
  const lastCol = Math.max(1, sheet.getLastColumn());
  const existing = sheet.getLastRow() === 0
    ? []
    : sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let needs = existing.length === 0;
  for (let i = 0; i < headers.length && !needs; i++) {
    if (existing[i] !== headers[i]) needs = true;
  }
  if (needs) {
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
      return [ts, data.name || '', data.age || '', data.gender || '', data.phone || '',
        data.area || '', data.worktype || '', data.duration || '', data.startDate || '',
        data.lang || ''];
    case 'Employers':
      return [ts, data.name || '', data.phone || '', data.business || '',
        data.area || '', data.need || '', data.count || '', data.salary || '',
        data.lang || ''];
    case 'HiredFeedback':
      return [ts, data.name || '', data.phone || '',
        data.whoHired || '', data.whoHiredPhone || '', data.suggestions || '',
        data.lang || ''];
    case 'Volunteers':
      return [ts, data.name || '', data.phone || '', data.area || '',
        data.contribution || '', data.suggestions || '',
        data.lang || ''];
  }
  return [];
}

// Build the 27-column row to mirror into Form Responses 1
function rowForFormResponses_(data) {
  const row = new Array(FR1_WIDTH).fill('');
  row[FR1_COLS.timestamp] = new Date();
  row[FR1_COLS.role] = ROLE_LABEL[data.flow] || data.role || '';
  switch (data.flow) {
    case 'register-seeker':
      row[FR1_COLS.seeker_name]     = data.name || '';
      row[FR1_COLS.seeker_age]      = data.age || '';
      row[FR1_COLS.seeker_gender]   = data.gender || '';
      row[FR1_COLS.seeker_phone]    = data.phone || '';
      row[FR1_COLS.seeker_area]     = data.area || '';
      row[FR1_COLS.seeker_worktype] = data.worktype || '';
      row[FR1_COLS.seeker_duration] = data.duration || '';
      row[FR1_COLS.seeker_start]    = data.startDate || '';
      break;
    case 'register-hirer':
      row[FR1_COLS.hirer_name]      = data.name || '';
      row[FR1_COLS.hirer_phone]     = data.phone || '';
      row[FR1_COLS.hirer_business]  = data.business || '';
      row[FR1_COLS.hirer_area]      = data.area || '';
      row[FR1_COLS.hirer_need]      = data.need || '';
      row[FR1_COLS.hirer_count]     = data.count || '';
      row[FR1_COLS.hirer_salary]    = data.salary || '';
      break;
    case 'register-hired':
      row[FR1_COLS.hired_name]       = data.name || '';
      row[FR1_COLS.hired_phone]      = data.phone || '';
      row[FR1_COLS.hired_who]        = data.whoHired || '';
      row[FR1_COLS.hired_who_phone]  = data.whoHiredPhone || '';
      row[FR1_COLS.hired_suggestions] = data.suggestions || '';
      break;
    case 'register-volunteer':
      row[FR1_COLS.vol_name]         = data.name || '';
      row[FR1_COLS.vol_phone]        = data.phone || '';
      row[FR1_COLS.vol_area]         = data.area || '';
      row[FR1_COLS.vol_contribution] = data.contribution || '';
      row[FR1_COLS.vol_suggestions]  = data.suggestions || '';
      break;
  }
  return row;
}

function mirrorToFormResponses_(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(FORM_RESPONSES_TAB);
  if (!sheet) {
    console.warn('"' + FORM_RESPONSES_TAB + '" tab not found — skipping mirror.');
    return;
  }
  sheet.appendRow(rowForFormResponses_(data));
}

// Helper: run from the Apps Script editor (▶ Run → logFormResponsesHeaders)
// to print the actual headers in Form Responses 1, so you can adjust
// FR1_COLS above if your Google Form has been re-ordered.
function logFormResponsesHeaders() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(FORM_RESPONSES_TAB);
  if (!sheet) { console.log('No "' + FORM_RESPONSES_TAB + '" tab found.'); return; }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  headers.forEach((h, i) => console.log('[' + i + '] "' + h + '"'));
}

// ---------------- Web-app endpoints ----------------
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');

    // 1. Write to the role-specific tab (or Inspirational for share-journey)
    const tabName = FLOW_TO_TAB[data.flow] || 'Inspirational';
    const sheet = ensureSheet_(tabName);
    sheet.appendRow(rowFor_(tabName, data));

    // 2. For /register/ submissions, also mirror to Form Responses 1
    if (data.flow && data.flow.indexOf('register-') === 0) {
      try {
        mirrorToFormResponses_(data);
      } catch (mirrorErr) {
        // Don't fail the whole request if mirror fails; just log.
        console.warn('Mirror to Form Responses 1 failed:', mirrorErr);
      }
    }

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
    .createTextOutput('Saarthi combined endpoint is live (v2 — mirrors to Form Responses 1).')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

## How to verify after redeploy

1. **`doGet` check** — run in terminal:
   ```bash
   curl -s -L 'https://script.google.com/macros/s/AKfycbxOQv7OVtd_s0ITrkZ9YFYScHSCTDQDISexELRRXnvVIthz4KBFTMIKt89K_XvewC5t/exec'
   ```
   Should print: `Saarthi combined endpoint is live (v2 — mirrors to Form Responses 1).`

2. **Submit a test row** from `/register/` (pick any role, fill mandatory fields, submit).

3. Open the sheet — you should see:
   - One new row in the role-specific tab (`JobSeekers` / `Employers` / etc.)
   - One mirror row in `Form Responses 1` with the same data

## If the columns in Form Responses 1 don't match

If your Google Form has been edited / questions reordered, my best-guess `FR1_COLS` might place values in the wrong columns. To check:

1. In the Apps Script editor, pick the function `logFormResponsesHeaders` from the dropdown next to ▶ Run.
2. Click **▶ Run** → first time it'll ask for permissions; allow them.
3. Open **Execution log** (View → Logs) — you'll see your actual column headers like:
   ```
   [0] "Timestamp"
   [1] "How would you like to use Saarthi today?"
   [2] "Full Name / पूरा नाम"
   ...
   ```
4. If any column index differs from `FR1_COLS`, edit the mapping at the top of the script and **Deploy → New version → Deploy** again.

## Tab routing summary

| Source                     | `flow` value           | Role-specific tab | Mirror to FR1?     |
|----------------------------|------------------------|-------------------|--------------------|
| `/journeys/share/`         | (none)                 | `Inspirational`   | no                 |
| `/register/` seeker        | `register-seeker`      | `JobSeekers`      | yes                |
| `/register/` hirer         | `register-hirer`       | `Employers`       | yes                |
| `/register/` hired-feedback| `register-hired`       | `HiredFeedback`   | yes                |
| `/register/` volunteer     | `register-volunteer`   | `Volunteers`      | yes                |
