# One-time update: Apps Script v3 — `web_registration` tab + `Inspirational` tab

Two tabs, two clear destinations:

| Source                | Goes to tab           |
|-----------------------|-----------------------|
| `/register/` (any role) | **`web_registration`**  |
| `/journeys/share/`     | **`Inspirational`**     |

The Google Form's own `Form Responses 1` tab is left alone — the
on-site `/register/` form writes to its own `web_registration` tab,
not into Form Responses 1.

You only need to **edit the deployed Apps Script code once** and click
**Deploy → Manage deployments → New version → Deploy**. The web-app URL
stays the same (no HTML change needed).

## Steps

1. Open the Postcards sheet → **Extensions → Apps Script**.
2. Open `Code.gs`.
3. Replace its entire contents with the block below.
4. Save (Cmd+S).
5. **Deploy → Manage deployments → pencil icon → New version → Deploy**.
6. Wait ~30 seconds, then test by submitting the register page.

```javascript
// ============================================================
// Saarthi · combined backend  (v3)
//   /register/        → web_registration tab  (single tab, all roles)
//   /journeys/share/  → Inspirational tab     (unchanged)
// ============================================================

const SHEET_ID = '1b1TJnsNTMlrbasLFux0VPow3dGCEv5kvBgbRlkXLzNk';

const REGISTER_TAB      = 'web_registration';
const INSPIRATIONAL_TAB = 'Inspirational';

// ---------------- Headers per tab ----------------
const REGISTER_HEADERS = [
  'Timestamp', 'Role',
  'Name', 'Phone',
  'Age', 'Gender', 'Area',
  'Work type', 'Full/Part time', 'When can start',
  'Business type', 'Worker needed', 'Headcount', 'Min salary',
  'Whom hired', 'Their phone',
  'How they want to contribute',
  'Suggestions',
  'Language'
];

const INSPIRATIONAL_HEADERS = [
  'Timestamp', 'Name', 'Contact', 'Role + city', 'Social links',
  'Q1 Growing up + parents', 'Q2 Class 10 self', 'Q3 College + course choice',
  'Q4 Pivotal moment', 'Q5 Career steps', 'Q6 Failures + low moments',
  'Q7 Work life today', 'Q8 Advice to Class 10', 'Q9 Myth to break',
  'Q10 To 15-year-old self', 'Anything else', 'Consent', 'Language', 'User agent'
];

// Bilingual role label shown in the "Role" column of web_registration
const ROLE_LABEL = {
  'register-seeker':    'Job seeker / नौकरी की तलाश में',
  'register-hirer':     'Hirer / काम पर रखना है',
  'register-hired':     'Hired feedback / पहले से रख चुके हैं',
  'register-volunteer': 'Volunteer / स्वयंसेवक'
};

// ---------------- Helpers ----------------
function ensureSheet_(tabName, headers) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) sheet = ss.insertSheet(tabName);
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

function rowForRegister_(data) {
  return [
    new Date(),
    ROLE_LABEL[data.flow] || data.role || '',
    data.name        || '',
    data.phone       || '',
    data.age         || '',  // seeker only
    data.gender      || '',  // seeker only
    data.area        || '',  // seeker / hirer / volunteer
    data.worktype    || '',  // seeker only
    data.duration    || '',  // seeker only
    data.startDate   || '',  // seeker only
    data.business    || '',  // hirer only
    data.need        || '',  // hirer only
    data.count       || '',  // hirer only
    data.salary      || '',  // hirer only
    data.whoHired    || '',  // hired only
    data.whoHiredPhone || '',// hired only
    data.contribution|| '',  // volunteer only
    data.suggestions || '',  // hired / volunteer
    data.lang        || ''
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

    if (data.flow && data.flow.indexOf('register-') === 0) {
      const sheet = ensureSheet_(REGISTER_TAB, REGISTER_HEADERS);
      sheet.appendRow(rowForRegister_(data));
      return ContentService
        .createTextOutput(JSON.stringify({status:'ok', tab:REGISTER_TAB}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default fallback: share-journey
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

function doGet() {
  return ContentService
    .createTextOutput('Saarthi combined endpoint is live (v3 — web_registration + Inspirational).')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

## Verify after redeploy

```bash
curl -s -L 'https://script.google.com/macros/s/AKfycbxOQv7OVtd_s0ITrkZ9YFYScHSCTDQDISexELRRXnvVIthz4KBFTMIKt89K_XvewC5t/exec'
```

Should print:
```
Saarthi combined endpoint is live (v3 — web_registration + Inspirational).
```

(Right now it prints `"Saarthi share-journey endpoint is live."` — that's the original v0.)

## Test plan

1. **Register flow** — open `/register/`, pick any role (e.g. job seeker), fill mandatory fields, submit. The sheet should grow a new tab called `web_registration` (auto-created on first submission) with one row showing your test data.
2. **Try each role** — submit one of each (hirer, hired-feedback, volunteer). All four rows land in the same `web_registration` tab; only the columns relevant to that role are filled.
3. **Share-journey flow** — open `/journeys/share/` and submit a test letter. The row lands in `Inspirational` exactly as before.
4. **Google Form unchanged** — the existing `Form Responses 1` tab keeps receiving rows from the Google Form, untouched by this script.

## Column layout (web_registration)

19 columns. Each role fills only its relevant slice; others stay blank — easy to filter by Role.

| #  | Header                       | Filled by                       |
|----|------------------------------|---------------------------------|
| 1  | Timestamp                    | server-side `new Date()`        |
| 2  | Role                         | all flows                       |
| 3  | Name                         | all flows                       |
| 4  | Phone                        | all flows                       |
| 5  | Age                          | seeker                          |
| 6  | Gender                       | seeker                          |
| 7  | Area                         | seeker / hirer / volunteer      |
| 8  | Work type                    | seeker                          |
| 9  | Full/Part time               | seeker                          |
| 10 | When can start               | seeker                          |
| 11 | Business type                | hirer                           |
| 12 | Worker needed                | hirer                           |
| 13 | Headcount                    | hirer                           |
| 14 | Min salary                   | hirer                           |
| 15 | Whom hired                   | hired feedback                  |
| 16 | Their phone                  | hired feedback                  |
| 17 | How they want to contribute  | volunteer                       |
| 18 | Suggestions                  | hired feedback / volunteer      |
| 19 | Language                     | all (en / hi)                   |
