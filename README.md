# KYC Risk Analysis & Data Verification Dashboard

A portfolio project demonstrating a compliance-grade **Know Your Customer (KYC)** risk analysis interface with data cleaning and identity matching capabilities. Built entirely with vanilla HTML, CSS, and JavaScript — no framework dependencies.

## Live Demo

Open `index.html` directly in a browser, or serve the folder with any static server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Features

### Client Risk Table
- Tabular view of screened clients with risk scores (0–100)
- Color-coded risk levels: Low / Medium / High
- PEP (Politically Exposed Person) and sanctions flags
- Per-client approval status: Approved / Review / Blocked
- Risk distribution chart and top high-risk jurisdiction breakdown

### Data Cleaning Pipeline
- 7-stage pipeline: ingestion → normalization → name parsing → address validation → OCR → completeness scoring → API enrichment
- Quality metric bars per stage (deduplication rate, DOB accuracy, OCR success, etc.)
- Common data issue log with severity indicators and record counts

### Identity Matching
- Six matching strategies: deterministic, phonetic (Soundex / Jaro-Winkler), probabilistic ML, biometric (FaceNet), watchlist fuzzy match, graph-based entity resolution
- Interactive confidence threshold sliders
- Real-time routing outcome calculation (auto-approve / manual review / reject)

### AML Flags & Alerts
- Active alert feed: sanctions hits, duplicate IDs, adverse media, PEP exposure, unusual transaction velocity, unresolved UBO chains
- Risk factor breakdown with weighted bars (adverse media, PEP, sanctions, geo-risk, behavioural, ownership)

## Technology

| Layer       | Choice                                      |
|-------------|---------------------------------------------|
| Markup      | Semantic HTML5                              |
| Styling     | Vanilla CSS (custom properties, dark mode)  |
| Logic       | Vanilla JavaScript ES2020 (no build step)   |
| Icons       | Tabler Icons webfont (CDN)                  |
| Data        | Static mock data in `data.js`               |

## File Structure

```
kyc-risk-dashboard/
├── index.html   — page structure and tab layout
├── style.css    — full design system (light + dark mode)
├── data.js      — all mock KYC data (clients, flags, metrics)
├── app.js       — rendering functions and interaction logic
└── README.md    — this file
```

## Concepts Demonstrated

- **KYC / AML compliance** — risk scoring, PEP screening, sanctions list matching, adverse media analysis
- **Data quality engineering** — deduplication, schema normalization, completeness scoring, OCR pipelines
- **Identity resolution** — deterministic vs. probabilistic matching, biometric verification, entity graphs
- **UI/UX for compliance tools** — tabular data presentation, threshold tuning, severity-coded alerts
- **Dark mode** — full `prefers-color-scheme` support via CSS custom properties
- **Accessibility** — semantic HTML, ARIA roles, screen-reader labels

## Extending the Project

Possible next steps to demonstrate full-stack skills:

- Connect a real watchlist API (e.g. OpenSanctions, Dow Jones)
- Add a Node.js / Python backend with a SQLite or PostgreSQL database
- Implement CSV upload and real-time data cleaning
- Add Chart.js or D3 for richer visualisations (score histograms, time-series alerts)
- Write Jest unit tests for matching threshold logic

---

*Portfolio project — all client data is fictional and generated for demonstration purposes only.*
