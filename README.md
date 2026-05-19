# ILLiad Article Request Helper

Captures article metadata to auto-fill ILLiad request forms. Supports selectable library profiles. Clipboard copy allows for generic list creation.

---

## Features

- **One-click metadata capture** - click the extension icon on any academic article page to extract citation data including title, author, journal, year, volume, issue, pages, DOI, and ISSN
- **Multi-institution support** - select your library from a dropdown; each institution has its own profile controlling which fields get filled
- **Set as Default** - save your preferred library so it's pre-selected every time
- **Copy to clipboard** - copy clean citation data independently of ILLiad for use in spreadsheets, reference lists, or other workflows

> **Note:** Always review filled fields for accuracy and completeness before submitting your ILLiad request. Metadata quality varies by publisher and some fields may need manual correction or additional information.

---

## Supported Institutions

| Institution | ILLiad URL |
|---|---|
| Pittsburg State University (Axe Library) | pittstate.illiad.oclc.org |
| University of Missouri-Kansas City | umkc-illiad-oclc-org.proxy.library.umkc.edu |

Adding support for additional institutions is straightforward - see [Adding a New Institution](#adding-a-new-institution) below.

---

## Installation

This extension is not published on the Chrome Web Store. Install it manually as an unpacked extension.

If you don't have Git installed, click the green **Code** button on the repository page and select **Download ZIP**, then extract the folder before loading it.

### Download the Files

If you have Git installed, clone this repository to your computer. If not, click the green **Code** button at the top of this page and select **Download ZIP**, then extract the folder contents before proceeding.

### Where to Save the Files

Save the extension folder somewhere stable on your computer. Avoid saving it in Downloads or a cloud-synced folder (OneDrive, Dropbox, etc.) - if the files are moved or deleted Chrome will lose track of the extension.

**Windows:**
```
C:\Users\[username]\Documents\ChromeExtensions\illiad-article-request-helper\
```
**Mac / Linux:**
```
~/Documents/ChromeExtensions/illiad-article-request-helper/
```

### Install Steps

This extension works on any operating system that supports Google Chrome (Windows, Mac, Linux).

1. Download or clone this repository and save it to the location above
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the folder containing the extension files

The extension icon will appear in your Chrome toolbar.

> **Note:** Do not move or delete the extension folder after installing. Chrome loads the files directly from that location every time. If you need to move it, remove the extension from `chrome://extensions` first, move the folder, then load it again.

---

## Usage

1. Navigate to an academic article page (e.g. a journal article on a publisher's website)
2. Click the extension icon in the toolbar
3. A new tab opens showing the captured citation data
4. Select your library from the **Library** dropdown (click **Set as Default** to remember it)
5. Open your ILLiad account in another tab and navigate to **New Request - Article**
6. Click **Copy to Open ILLiad Tab** - the extension will fill the form fields automatically
7. **Review all filled fields for accuracy and any fields that may need additional information**
8. Submit your request

To copy citation data to your clipboard without filling an ILLiad form, click **Copy to clipboard**.

---

## File Structure

```
illiad-article-request-helper/
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── profiles/
│   ├── index.json                              # List of available profiles
│   ├── pittsburg-state-university.json
│   └── university-of-missouri-kansas-city.json
├── manifest.json
├── output.html                                 # Citation review and action page
├── output.js                                   # Profile loading and form filling logic
└── service-worker.js                           # Metadata extraction from publisher pages
```

---

## Adding a New Institution

1. **Find the ILLiad URL** - log in to the institution's ILLiad and copy the base URL from your browser (e.g. `https://example.illiad.oclc.org/illiad/`)

2. **Create a profile file** in `profiles/` named with the institution's id (e.g. `example-university.json`):

```json
{
  "id": "example-university",
  "name": "Example University Library",
  "illiadUrl": "https://example.illiad.oclc.org/illiad/",
  "articleForm": {
    "requiredFields": [
      "PhotoArticleTitle",
      "PhotoJournalTitle",
      "PhotoJournalYear",
      "PhotoJournalInclusivePages"
    ],
    "optionalFields": [
      "PhotoArticleAuthor",
      "PhotoJournalVolume",
      "PhotoJournalIssue",
      "ISSN",
      "DOI",
      "Notes",
      "CitedIn"
    ],
    "alwaysPopulate": [
      "PhotoArticleAuthor",
      "DOI",
      "Notes",
      "CitedIn"
    ]
  }
}
```

3. **Add the institution to `profiles/index.json`:**

```json
{
  "profiles": [
    { "id": "pittsburg-state-university", "name": "Pittsburg State University (Axe Library)" },
    { "id": "university-of-missouri-kansas-city", "name": "University of Missouri-Kansas City" },
    { "id": "example-university", "name": "Example University Library" }
  ]
}
```

4. **Add the ILLiad URL to `host_permissions` in `manifest.json`:**

```json
"host_permissions": [
  "*://*/*",
  "*://pittstate.illiad.oclc.org/*",
  "*://umkc-illiad-oclc-org.proxy.library.umkc.edu/*",
  "*://example.illiad.oclc.org/*"
]
```

5. Reload the extension in `chrome://extensions`

### Profile Fields Reference

| Field | Description |
|---|---|
| `requiredFields` | ILLiad form fields the extension will always fill |
| `optionalFields` | Known fields for the form; documented but not auto-filled |
| `alwaysPopulate` | Fields filled whenever data is available, even if not required |

### Common ILLiad Field IDs

| Field ID | Description |
|---|---|
| `PhotoArticleTitle` | Article title |
| `PhotoArticleAuthor` | Article author |
| `PhotoJournalTitle` | Journal/publication title |
| `PhotoJournalYear` | Publication year |
| `PhotoJournalVolume` | Volume number |
| `PhotoJournalIssue` | Issue number |
| `PhotoJournalMonth` | Month/season |
| `PhotoJournalInclusivePages` | Page range |
| `ISSN` | ISSN number |
| `DOI` | DOI number |
| `ESPNumber` | OCLC/WorldCat number |
| `PMID` | PubMed ID |
| `Notes` | Notes field |
| `CitedIn` | Where citation was found |

---

## Privacy

This extension does not collect, transmit, or track any personal data. The only information stored locally on your device is:

- **Your default library selection** - saved in `chrome.storage.local` so your preferred institution is remembered between sessions
- **Citation data** - temporarily held in `chrome.storage.session` while you are working with a request; this is cleared automatically when the browser session ends

No data is sent to any external server. No usage analytics or tracking of any kind is performed.

---

## Disclaimer

This extension is provided as-is, without warranty of any kind. The author is not responsible for any damage, data loss, incorrect form submissions, or missed interlibrary loan requests resulting from the use of this extension. Always review filled fields for accuracy before submitting your request. Use at your own risk.

---

## License

Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) - see [LICENSE](LICENSE) for details.
