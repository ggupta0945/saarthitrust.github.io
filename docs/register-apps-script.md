# One-time update: Apps Script v4 — `web_registration` mirrors Form Responses 1 headers

`/register/` submissions go to a new tab **`web_registration`** that uses
the **same 33 columns** as your existing `Form Responses 1` tab. Each
role only fills its own slice of those columns — others stay blank —
so you can copy/paste or query data between the two tabs without column
mismatch.

| Source                     | Tab                  |
|----------------------------|----------------------|
| `/register/` (any role)    | **`web_registration`** |
| `/journeys/share/`         | **`Inspirational`**    |
| Google Form (unchanged)    | `Form Responses 1`   |

You only need to **edit the deployed Apps Script code once** and click
**Deploy → Manage deployments → New version → Deploy**. The web-app URL
stays the same (no HTML change needed).

## Steps

1. Open the Postcards sheet → **Extensions → Apps Script**.
2. Open `Code.gs`.
3. Replace its entire contents with the block below.
4. Save (Cmd+S).
5. **Deploy → Manage deployments → pencil icon → New version → Deploy**.
6. Wait ~30 seconds, then submit a test row from `/register/`.

```javascript
// ============================================================
// Saarthi · combined backend  (v4)
//   /register/        → web_registration tab (mirrors Form Responses 1 columns)
//   /journeys/share/  → Inspirational tab    (unchanged)
// ============================================================

const SHEET_ID = '1b1TJnsNTMlrbasLFux0VPow3dGCEv5kvBgbRlkXLzNk';

const REGISTER_TAB      = 'web_registration';
const INSPIRATIONAL_TAB = 'Inspirational';

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

// Bilingual labels for the "How would you like to use Saarthi today?" column.
// Match the four options users see in the role picker on the Google Form.
const ROLE_LABEL = {
  'register-seeker':    'I am looking for a job / मैं नौकरी की तलाश में हूँ',
  'register-hirer':     'I want to hire someone / मुझे किसी को काम पर रखना है',
  'register-hired':     'I have already hired through Saarthi / मैं पहले ही सारथी के ज़रिए किसी को काम पर रख चुका हूँ',
  'register-volunteer': "Be Someone's Saarthi / किसी के सारथी बनें"
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

function doGet() {
  return ContentService
    .createTextOutput('Saarthi combined endpoint is live (v4 — web_registration matches Form Responses 1 columns).')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

## Verify after redeploy

```bash
curl -s -L 'https://script.google.com/macros/s/AKfycbxOQv7OVtd_s0ITrkZ9YFYScHSCTDQDISexELRRXnvVIthz4KBFTMIKt89K_XvewC5t/exec'
```

Should print:
```
Saarthi combined endpoint is live (v4 — web_registration matches Form Responses 1 columns).
```

## Column-fill map by role

Each role only writes to its slice of the 33-column row; everything else stays blank.

| Col # | Header                                                                          | seeker | hirer | hired | volunteer |
|-------|---------------------------------------------------------------------------------|:------:|:-----:|:-----:|:---------:|
| 1     | Timestamp                                                                       | ✓      | ✓     | ✓     | ✓         |
| 2     | Full Name / पूरा नाम                                                          | ✓      |       |       |           |
| 3     | Age / उम्र                                                                    | ✓      |       |       |           |
| 4     | Gender                                                                          | ✓      |       |       |           |
| 5     | Phone Number (WhatsApp)                                                         | ✓      |       |       |           |
| 6     | Village/Area Name                                                               | ✓      |       |       |           |
| 7     | What type of work are you looking for?                                          | ✓      |       |       |           |
| 8     | Preferred Job Location                                                          |        |       |       |           |
| 9     | Full/Part time                                                                  | ✓      |       |       |           |
| 10    | When can you start                                                              | ✓      |       |       |           |
| 11    | How would you like to use Saarthi today? *(role label)*                         | ✓      | ✓     | ✓     | ✓         |
| 12    | Whom did you hire?                                                              |        |       | ✓     |           |
| 13    | Contact number of the person hired                                              |        |       | ✓     |           |
| 14    | Any suggestions to improve Saarthi? *(hired feedback)*                          |        |       | ✓     |           |
| 15    | whatsapp_sent_jobgiver                                                          |        |       |       |           |
| 16    | Your Name *(hirer)*                                                             |        | ✓     |       |           |
| 17    | Business type                                                                   |        | ✓     |       |           |
| 18    | Area *(hirer)*                                                                  |        | ✓     |       |           |
| 19    | What kind of worker                                                             |        | ✓     |       |           |
| 20    | Your contact number *(hirer)*                                                   |        | ✓     |       |           |
| 21    | How many people                                                                 |        | ✓     |       |           |
| 22    | Min Salary                                                                      |        | ✓     |       |           |
| 23    | Your Name *(hired feedback self)*                                               |        |       | ✓     |           |
| 24    | Your contact number *(hired feedback self)*                                     |        |       | ✓     |           |
| 25    | Your Name *(volunteer)*                                                         |        |       |       | ✓         |
| 26    | Phone Number *(volunteer)*                                                      |        |       |       | ✓         |
| 27    | How would you like to contribute?                                               |        |       |       | ✓         |
| 28    | Any Suggestions ?                                                               |        |       |       | ✓         |
| 29    | Area *(volunteer)*                                                              |        |       |       | ✓         |
| 30    | Column 25                                                                       |        |       |       |           |
| 31    | Would you like to receive contact details                                       |        |       |       |           |
| 32    | Where are you looking to hire                                                   |        |       |       |           |
| 33    | status                                                                          |        |       |       |           |
