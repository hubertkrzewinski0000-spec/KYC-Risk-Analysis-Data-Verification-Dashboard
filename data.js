/**
 * data.js — KYC Risk Analysis Dashboard
 * =========================================
 * All mock data used throughout the application.
 *
 * BUSINESS CONTEXT
 * ----------------
 * In a production system this file would be replaced by API calls to:
 *  - A case management database (PostgreSQL / MongoDB)
 *  - A real-time watchlist provider (e.g. Refinitiv World-Check, Dow Jones)
 *  - An internal data-quality monitoring service
 *
 * All names, IDs, and figures here are entirely fictional and are used
 * only for demonstration purposes.
 */

const DATA = {

  // ===========================================================================
  // CLIENTS
  // Each object represents one onboarding case in the KYC pipeline.
  //
  // Fields:
  //   id        — internal case reference, format KYC-XXXX
  //   name      — full name as submitted during onboarding
  //   country   — ISO 3166-1 alpha-2 country code of nationality/residence
  //   score     — composite risk score 0–100 computed by the risk engine:
  //                 0–49  → Low     (standard due diligence)
  //                50–74  → Medium  (simplified enhanced due diligence)
  //                75–100 → High    (full Enhanced Due Diligence required)
  //   risk      — derived label: "Low" | "Medium" | "High"
  //   pep       — Politically Exposed Person flag; triggers mandatory EDD
  //               under FATF Recommendation 12 and the EU 5th AML Directive
  //   sanctions — true if a confirmed hit exists on OFAC SDN, EU, UN, or UK list;
  //               these clients MUST be blocked — no discretion allowed by law
  //   status    — current workflow state:
  //                 "Approved"  — passed all checks, onboarded
  //                 "Review"    — sent to compliance analyst queue
  //                 "Blocked"   — frozen, reported to Financial Intelligence Unit
  // ===========================================================================
  clients: [
    { id: "KYC-0041", name: "Andrei Volkov",   country: "RU", score: 88, risk: "High",   pep: true,  sanctions: false, status: "Review"  },
    { id: "KYC-0102", name: "Sara Mehta",       country: "IN", score: 22, risk: "Low",    pep: false, sanctions: false, status: "Approved" },
    { id: "KYC-0217", name: "Jean-Paul Dubois", country: "FR", score: 35, risk: "Low",    pep: false, sanctions: false, status: "Approved" },
    { id: "KYC-0338", name: "Amara Keita",      country: "ML", score: 71, risk: "Medium", pep: true,  sanctions: false, status: "Review"  },
    { id: "KYC-0412", name: "Liu Wei",          country: "HK", score: 55, risk: "Medium", pep: false, sanctions: false, status: "Approved" },
    { id: "KYC-0519", name: "Viktor Zelenko",   country: "UA", score: 64, risk: "Medium", pep: false, sanctions: true,  status: "Blocked" },
    { id: "KYC-0603", name: "Fatima Al-Rashid", country: "AE", score: 48, risk: "Low",    pep: false, sanctions: false, status: "Approved" },
    { id: "KYC-0714", name: "Carlos Restrepo",  country: "CO", score: 79, risk: "High",   pep: false, sanctions: false, status: "Review"  },
    { id: "KYC-0821", name: "Yuki Tanaka",      country: "JP", score: 18, risk: "Low",    pep: false, sanctions: false, status: "Approved" },
    { id: "KYC-0933", name: "Dmitri Petrov",    country: "BY", score: 93, risk: "High",   pep: true,  sanctions: true,  status: "Blocked" },
  ],

  // ===========================================================================
  // DATA CLEANING PIPELINE STEPS
  // Before any KYC check can run, raw client data must be standardised.
  // Poor data quality is the #1 cause of false negatives in sanctions screening:
  // a name typo or non-standard date format can cause a genuine hit to be missed.
  // ===========================================================================
  pipelineSteps: [
    {
      name: "Raw ingestion & deduplication",
      note: "Remove duplicate records by fuzzy name + DOB + nationality hash"
      // WHY: The same customer may apply twice (e.g. after a failed onboarding),
      // or be imported from multiple source systems. Processing duplicates wastes
      // analyst time and can create conflicting risk profiles for the same person.
    },
    {
      name: "Schema normalization",
      note: "Standardize date formats, country codes (ISO 3166), phone E.164"
      // WHY: A DOB of "01/02/1980" is ambiguous — is it Jan 2 or Feb 1?
      // Normalising to ISO 8601 (YYYY-MM-DD) eliminates that ambiguity.
      // Country codes must follow ISO 3166 for watchlist lookups to work correctly.
    },
    {
      name: "Name transliteration & parsing",
      note: "Unicode → Latin, split compound names, handle aliases"
      // WHY: Watchlists are typically stored in ASCII/Latin script. Arabic,
      // Cyrillic, Chinese, and other scripts must be transliterated so that
      // "Дмитрий Петров" can match "Dmitri Petrov" on the OFAC SDN list.
    },
    {
      name: "Address geocoding & validation",
      note: "Parse free-text address → structured, verify against postal databases"
      // WHY: An unverifiable address is a red flag for identity fraud.
      // Structured addresses also enable jurisdiction-based risk scoring
      // (e.g. assigning higher risk to addresses in FATF grey-list countries).
    },
    {
      name: "Document OCR & extraction",
      note: "Extract MRZ, barcode, and face biometric from ID documents"
      // WHY: Machine-Readable Zone (MRZ) data on passports/ID cards is
      // structured and reliable — much more so than manually typed fields.
      // Cross-checking OCR output against submitted data catches forgeries.
    },
    {
      name: "Data completeness scoring",
      note: "Flag missing mandatory fields; route to manual review if score < 80%"
      // WHY: Regulatory frameworks (e.g. EU 5AMLD, FinCEN CDD Rule) specify
      // minimum data collection requirements. Incomplete records cannot be
      // onboarded and must be returned to the customer for completion.
    },
    {
      name: "Enrichment via third-party APIs",
      note: "Augment records from credit bureaus, company registries, adverse media feeds"
      // WHY: The customer's self-reported data is only one data source.
      // Enrichment cross-references it with Companies House, credit bureau
      // data, and adverse media to build a fuller risk picture.
    },
  ],

  // ===========================================================================
  // QUALITY METRICS — success rate of each cleaning stage
  // A percentage below ~85% typically indicates a systemic upstream data issue
  // (e.g. a partner integration sending malformed exports) that needs fixing.
  // ===========================================================================
  qualityMetrics: [
    { label: "Deduplication",      pct: 96, color: "#639922" },
    { label: "Name normalization", pct: 89, color: "#639922" },
    { label: "DOB accuracy",       pct: 94, color: "#639922" },
    { label: "Address validation", pct: 78, color: "#EF9F27" }, // amber = needs attention
    { label: "Document OCR",       pct: 91, color: "#639922" },
    { label: "Completeness score", pct: 85, color: "#639922" },
    { label: "API enrichment",     pct: 72, color: "#EF9F27" }, // amber = third-party API issues
  ],

  // ===========================================================================
  // COMMON DATA ISSUES — most frequently encountered data quality problems
  // Logged here for the operations team to prioritise remediation work.
  // ===========================================================================
  dataIssues: [
    { sev: "amber", text: "Inconsistent name spellings across source systems", count: "342 records" },
    { sev: "amber", text: "Missing or implausible date of birth",              count: "219 records" },
    { sev: "red",   text: "Duplicate national ID across multiple clients",     count: "47 records"  },
    // RED: same national ID on two different client records is a strong
    // indicator of identity fraud and must be escalated immediately.
    { sev: "amber", text: "Non-standard country / jurisdiction codes",         count: "183 records" },
    { sev: "amber", text: "Unverified or undeliverable postal address",        count: "398 records" },
  ],

  // ===========================================================================
  // IDENTITY MATCHING METHODS
  // The matching engine runs all applicable methods and combines their outputs
  // into a single confidence score using a weighted ensemble.
  //
  // status: "ok"   — live and performing well
  //         "warn" — needs tuning or has known edge-case issues
  //         "fail" — not yet deployed / currently under development
  // ===========================================================================
  matchMethods: [
    {
      status: "ok",
      icon: "ti-check",
      title: "Exact deterministic match",
      desc: "National ID, passport number, tax ID — direct equality check across all sources"
      // HIGHEST confidence. A matching document number is near-certain proof of identity.
      // Limitation: requires the customer to provide a valid government-issued document.
    },
    {
      status: "ok",
      icon: "ti-check",
      title: "Phonetic name matching",
      desc: "Soundex, Metaphone, and Jaro-Winkler applied to first/last names to handle transliteration variants"
      // Handles "Mohamed" / "Mohammed" / "Muhammad" variants common in
      // Arabic names, and Cyrillic-to-Latin transliteration inconsistencies.
    },
    {
      status: "warn",
      icon: "ti-alert-circle",
      title: "Probabilistic / ML scoring",
      desc: "Gradient-boosted model outputs a match confidence 0–1 across name, DOB, address, nationality features"
      // Currently generating ~8% false positives on East Asian names where
      // surname comes first — model retraining scheduled for next sprint.
    },
    {
      status: "ok",
      icon: "ti-check",
      title: "Biometric matching",
      desc: "Facial recognition (FaceNet) against live selfie vs. document photo — liveness detection included"
      // Liveness detection prevents spoofing with a printed photograph.
      // Accuracy: 99.2% at FAR < 0.001% on internal test set.
    },
    {
      status: "warn",
      icon: "ti-alert-circle",
      title: "Watchlist fuzzy match",
      desc: "OFAC SDN, UN Consolidated, EU & UK sanctions lists — threshold tunable (default 85% similarity)"
      // Threshold is a trade-off: lower → more hits, more false positives.
      // Currently configured conservatively at 85% to reduce analyst workload;
      // regulatory guidance recommends validating at least at 80% similarity.
    },
    {
      status: "fail",
      icon: "ti-x",
      title: "Graph-based entity resolution",
      desc: "Network of shared addresses, phones, corporate affiliations to detect clusters of linked entities"
      // In development. Will use a graph database (Neo4j) to surface hidden
      // connections between seemingly unrelated clients who share a registered
      // address, phone number, or beneficial ownership chain.
    },
  ],

  // ===========================================================================
  // AML FLAGS — active alerts requiring compliance officer action
  //
  // SEVERITY LEVELS:
  //   red   — immediate escalation required; potential legal obligation to file
  //           a Suspicious Activity Report (SAR) with the FIU within 24–48 h
  //   amber — investigate within 5 business days; may be resolved with
  //           additional documentation from the client
  // ===========================================================================
  amlFlags: [
    {
      sev: "red",
      title: "Sanctions list match — Dmitri Petrov",
      cat: "OFAC SDN",
      detail: "Exact match on full name + DOB against OFAC SDN list"
      // ACTION: Freeze account immediately. File SAR with FinCEN/FIU.
      // No funds movement permitted until legal review is complete.
    },
    {
      sev: "red",
      title: "Duplicate national ID detected",
      cat: "Data integrity",
      detail: "KYC-0519 and KYC-0614 share the same Ukrainian ID number"
      // ACTION: One of these records is likely fraudulent. Both accounts
      // must be suspended and referred to the fraud investigation team.
    },
    {
      sev: "amber",
      title: "PEP — indirect family exposure",
      cat: "PEP screening",
      detail: "Amara Keita shares surname and DOB range with listed political figure"
      // ACTION: Request additional source-of-wealth documentation.
      // PEP relationships extend to immediate family and known close associates.
    },
    {
      sev: "red",
      title: "Adverse media — money laundering",
      cat: "Adverse media",
      detail: "Carlos Restrepo linked to 2023 Bogotá wire-fraud investigation (Reuters)"
      // ACTION: Enhanced Due Diligence required. Cross-reference with
      // transaction history. Consider exiting the relationship.
    },
    {
      sev: "amber",
      title: "High-risk jurisdiction — multiple accounts",
      cat: "Geo risk",
      detail: "Three accounts registered to addresses in Minsk within 30 days"
      // ACTION: Belarus is on the FATF grey list. Cluster of new accounts
      // from the same city could indicate coordinated account creation
      // (a common step in trade-based money laundering schemes).
    },
    {
      sev: "amber",
      title: "Unusual transaction velocity",
      cat: "Behavioural",
      detail: "12 outgoing wires > $50k in 72 hours — exceeds peer group 99th percentile"
      // ACTION: Classic structuring pattern to avoid $10k CTR reporting threshold.
      // However $50k wires are above threshold — may indicate layering phase.
    },
    {
      sev: "amber",
      title: "Shell company UBO unresolved",
      cat: "Ownership",
      detail: "Beneficial owner chain exceeds 4 layers; ultimate owner not identified"
      // ACTION: EU 4AMLD / 5AMLD requires identification of any UBO with
      // ≥25% ownership. Chains > 4 layers are a known obfuscation technique.
    },
  ],

  // ===========================================================================
  // RISK FACTORS — prevalence among the 312 high-risk clients
  // Percentages are not mutually exclusive (one client can have multiple).
  // ===========================================================================
  riskFactors: [
    { label: "Adverse media",      pct: 74, color: "#E24B4A" },
    { label: "PEP exposure",       pct: 58, color: "#EF9F27" },
    { label: "Sanctions hit",      pct: 23, color: "#E24B4A" },
    { label: "High-risk country",  pct: 81, color: "#EF9F27" },
    { label: "Unusual tx pattern", pct: 47, color: "#EF9F27" },
    { label: "Shell co. network",  pct: 31, color: "#E24B4A" },
  ],

  // ===========================================================================
  // JURISDICTIONS — top 5 high-risk countries in the current client portfolio
  // Country risk is derived from FATF list status + Basel AML Index score.
  // ===========================================================================
  jurisdictions: [
    { code: "RU", count: 3, color: "#E24B4A" }, // FATF grey-listed, high Basel AML score
    { code: "BY", count: 2, color: "#E24B4A" }, // EU sanctions regime, FATF grey list
    { code: "CO", count: 1, color: "#EF9F27" }, // Medium risk; drug trafficking exposure
    { code: "ML", count: 1, color: "#EF9F27" }, // FATF grey list
    { code: "HK", count: 1, color: "#EF9F27" }, // Elevated risk post-2020 due to legislative changes
  ],

  // ===========================================================================
  // MONTHLY TREND DATA — used by the Analytics & Charts tab (Chart.js)
  // Covers the last 6 months of onboarding activity.
  // ===========================================================================
  monthlyTrend: {
    labels: ["January", "February", "March", "April", "May", "June"],

    // Total onboarding cases submitted each month
    onboarded: [620, 710, 680, 790, 840, 910],

    // Cases that were flagged for review or blocked
    // A rising ratio vs onboarded may indicate improved detection sensitivity
    // or a shift in the quality of the incoming client population.
    flagged: [38, 45, 41, 55, 62, 71],
  },

  // ===========================================================================
  // MATCH RATE TREND — monthly data match success rate (%)
  // Target: maintain ≥ 90% to meet regulatory data-quality standards.
  // A dip in April was caused by a third-party data-provider outage.
  // ===========================================================================
  matchRateTrend: {
    labels: ["January", "February", "March", "April", "May", "June"],
    rates:  [88.1,       89.4,       90.7,    84.2,    90.0,  91.3],
    // 84.2% in April = below target; root cause: credit bureau API downtime
  },

};
