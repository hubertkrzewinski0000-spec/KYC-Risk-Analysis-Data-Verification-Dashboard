# KYC Risk Analysis & Data Verification Dashboard

A portfolio project demonstrating a compliance-grade **Know Your Customer (KYC)** risk analysis interface with data cleaning, identity matching, and interactive analytics. Built entirely with vanilla HTML, CSS, and JavaScript — no framework dependencies.

## Live Demo

Open `index.html` directly in a browser, or serve the folder with any static server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Features

### Tab 1 — Client Risk Table
- Tabular view of screened clients with composite risk scores (0–100)
- Color-coded risk tiers: Low / Medium / High (aligned with FATF due diligence model)
- PEP (Politically Exposed Person) and sanctions flags per client
- Per-client workflow status: Approved / Review / Blocked
- **Live search** — filter by name or country code in real-time
- **Dropdown filters** — filter by risk level and status independently
- **CSV export** — exports the current filtered view with a date-stamped filename
- Risk distribution summary and top high-risk jurisdiction breakdown

### Tab 2 — Data Cleaning Pipeline
- 7-stage pipeline: raw ingestion → schema normalization → name transliteration → address validation → document OCR → completeness scoring → API enrichment
- Quality metric bars per stage (deduplication rate, DOB accuracy, OCR success rate, etc.)
- Common data issue log with severity indicators and affected record counts

### Tab 3 — Identity Matching
- Six matching strategies: deterministic, phonetic (Soundex / Jaro-Winkler), probabilistic ML, biometric (FaceNet), watchlist fuzzy match, graph-based entity resolution
- Interactive confidence threshold sliders with real-time routing outcome calculation
- Three routing zones explained: auto-approve / manual review / auto-reject

### Tab 4 — AML Flags & Alerts
- Active alert feed with severity (red = immediate SAR filing required, amber = investigate within 5 days)
- Alert categories: sanctions hits, duplicate IDs, adverse media, PEP exposure, unusual transaction velocity, unresolved UBO chains
- Risk factor breakdown bars across all high-risk clients

### Tab 5 — Analytics & Charts *(Chart.js)*
- **Donut chart** — risk-level distribution (Low / Medium / High) with custom legend
- **Grouped bar chart** — monthly onboarding volume vs. flagged/blocked cases (6 months)
- **Line chart** — data match rate trend with 90% regulatory target reference line
- **Horizontal bar chart** — risk factor prevalence across high-risk clients, sorted descending
- All charts adapt to the user's `prefers-color-scheme` (light / dark mode)

## Technology

| Layer       | Choice                                          |
|-------------|-------------------------------------------------|
| Markup      | Semantic HTML5 with ARIA roles                  |
| Styling     | Vanilla CSS (custom properties, dark mode)      |
| Logic       | Vanilla JavaScript ES2020 (no build step)       |
| Charts      | Chart.js 4.x (CDN)                              |
| Icons       | Tabler Icons webfont (CDN)                      |
| Data        | Static mock data in `data.js`                   |

## File Structure

```
kyc-risk-dashboard/
├── index.html   — page structure, tab layout, HTML comments explaining KYC/AML context
├── style.css    — full design system (light + dark mode, toolbar, export button)
├── data.js      — all mock KYC data with inline business-logic comments
├── app.js       — rendering functions, Chart.js charts, filter/search, CSV export
└── README.md    — this file
```

## Changes vs. v1

| Area | Change |
|------|--------|
| KPI cards | Now rendered dynamically from `DATA` — no more hardcoded HTML values |
| Client table | Added search input (name/country), risk-level filter, status filter |
| CSV export | Exports filtered view with ISO date-stamped filename |
| Keyboard nav | Tab bar supports Arrow / Home / End keys (WAI-ARIA APG pattern) |
| Inline styles | Extracted `.client-name`, `.empty-flag`, `.alert-row`, `.alert-title`, `.alert-detail` to CSS |
| Tab 3 HTML | Identity Matching tab panel now fully present in `index.html` |
| Chart.js fix | `borderDash` placement corrected for dataset-level line dashing in 4.x |

## Code Comments & Business Logic

Every function in `app.js` and every data field in `data.js` is documented with comments explaining:
- **What** the code does technically
- **Why** it exists from a compliance/regulatory perspective
- **Which regulation** it relates to (FATF Recommendations, EU 5AMLD, OFAC SDN, FinCEN CDD Rule)

## Concepts Demonstrated

- **KYC / AML compliance** — risk scoring tiers, PEP screening, sanctions list matching, adverse media analysis, SAR filing thresholds
- **Data quality engineering** — deduplication, schema normalization, completeness scoring, OCR pipelines
- **Identity resolution** — deterministic vs. probabilistic matching, biometric verification, entity graphs
- **Data visualisation** — Chart.js donut, bar, line, and horizontal bar charts with dark-mode support
- **UI/UX for compliance tools** — tabular data, threshold tuning, severity-coded alerts, lazy chart initialisation, CSV export
- **Accessibility** — semantic HTML, ARIA roles (`tablist`, `tab`, `tabpanel`), keyboard arrow-key navigation, `focus-visible` outlines

---

*Portfolio project — all client data is entirely fictional and generated for demonstration purposes only.*
