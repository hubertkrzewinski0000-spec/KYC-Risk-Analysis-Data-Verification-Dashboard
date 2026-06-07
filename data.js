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
 * DATA INTEGRITY RULE (enforced here and tested in tests/risk.test.js):
 *  Any client with sanctions: true MUST have risk: "High" and score ≥ 75.
 *  A sanctions hit is a mandatory freeze under OFAC, EU, and UN regulations —
 *  there is no such thing as a "Medium risk" sanctions match.
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
  //               these clients MUST be blocked — no discretion allowed by law.
  //               NOTE: sanctions: true always implies risk: "High" (score ≥ 75).
  //   status    — current workflow state:
  //                 "Approved"  — passed all checks, onboarded
  //                 "Review"    — sent to compliance analyst queue
  //                 "Blocked"   — frozen, reported to Financial Intelligence Unit
  // ===========================================================================
  clients: [
    { id: "KYC-0041", name: "Andrei Volkov",   country: "RU", score: 88, risk: "High",   pep: true,  sanctions: false, status: "Review"   },
    { id: "KYC-0102", name: "Sara Mehta",       country: "IN", score: 22, risk: "Low",    pep: false, sanctions: false, status: "Approved"  },
    { id: "KYC-0217", name: "Jean-Paul Dubois", country: "FR", score: 35, risk: "Low",    pep: false, sanctions: false, status: "Approved"  },
    { id: "KYC-0338", name: "Amara Keita",      country: "ML", score: 71, risk: "Medium", pep: true,  sanctions: false, status: "Review"    },
    { id: "KYC-0412", name: "Liu Wei",          country: "HK", score: 55, risk: "Medium", pep: false, sanctions: false, status: "Approved"  },
    // FIX: Viktor Zelenko had sanctions: true but risk: "Medium" and score: 64.
    // A confirmed sanctions hit mandates High risk regardless of the numeric score.
    // Score raised to 82 to reflect the additional risk weight of the sanctions hit.
    // See deriveRiskLevel() in lib/risk.js and the corresponding test case.
    { id: "KYC-0519", name: "Viktor Zelenko",   country: "UA", score: 82, risk: "High",   pep: false, sanctions: true,  status: "Blocked"  },
    { id: "KYC-0603", name: "Fatima Al-Rashid", country: "AE", score: 48, risk: "Low",    pep: false, sanctions: false, status: "Approved"  },
    { id: "KYC-0714", name: "Carlos Restrepo",  country: "CO", score: 79, risk: "High",   pep: false, sanctions: false, status: "Review"    },
    { id: "KYC-0821", name: "Yuki Tanaka",      country: "JP", score: 18, risk: "Low",    pep: false, sanctions: false, status: "Approved"  },
    { id: "KYC-0933", name: "Dmitri Petrov",    country: "BY", score: 93, risk: "High",   pep: true,  sanctions: true,  status: "Blocked"  },
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
    },
    {
      name: "Schema normalization",
      note: "Standardize date formats, country codes (ISO 3166), phone E.164"
    },
    {
      name: "Name transliteration & parsing",
      note: "Unicode → Latin, split compound names, handle aliases"
    },
    {
      name: "Address geocoding & validation",
      note: "Parse free-text address → structured, verify against postal databases"
    },
    {
      name: "Document OCR & extraction",
      note: "Extract MRZ, barcode, and face biometric from ID documents"
    },
    {
      name: "Data completeness scoring",
      note: "Flag missing mandatory fields; route to manual review if score < 80%"
    },
    {
      name: "Enrichment via third-party APIs",
      note: "Augment records from credit bureaus, company registries, adverse media feeds"
    },
  ],

  // ===========================================================================
  // QUALITY METRICS — success rate of each cleaning stage
  // ===========================================================================
  qualityMetrics: [
    { label: "Deduplication",      pct: 96, color: "#639922" },
    { label: "Name normalization", pct: 89, color: "#639922" },
    { label: "DOB accuracy",       pct: 94, color: "#639922" },
    { label: "Address validation", pct: 78, color: "#EF9F27" },
    { label: "Document OCR",       pct: 91, color: "#639922" },
    { label: "Completeness score", pct: 85, color: "#639922" },
    { label: "API enrichment",     pct: 72, color: "#EF9F27" },
  ],

  // ===========================================================================
  // COMMON DATA ISSUES
  // ===========================================================================
  dataIssues: [
    { sev: "amber", text: "Inconsistent name spellings across source systems", count: "342 records" },
    { sev: "amber", text: "Missing or implausible date of birth",              count: "219 records" },
    { sev: "red",   text: "Duplicate national ID across multiple clients",     count: "47 records"  },
    { sev: "amber", text: "Non-standard country / jurisdiction codes",         count: "183 records" },
    { sev: "amber", text: "Unverified or undeliverable postal address",        count: "398 records" },
  ],

  // ===========================================================================
  // IDENTITY MATCHING METHODS
  // ===========================================================================
  matchMethods: [
    {
      status: "ok",
      icon: "ti-check",
      title: "Exact deterministic match",
      desc: "National ID, passport number, tax ID — direct equality check across all sources"
    },
    {
      status: "ok",
      icon: "ti-check",
      title: "Phonetic name matching",
      desc: "Soundex, Metaphone, and Jaro-Winkler applied to first/last names to handle transliteration variants"
    },
    {
      status: "warn",
      icon: "ti-alert-circle",
      title: "Probabilistic / ML scoring",
      desc: "Gradient-boosted model outputs a match confidence 0–1 across name, DOB, address, nationality features"
    },
    {
      status: "ok",
      icon: "ti-check",
      title: "Biometric matching",
      desc: "Facial recognition (FaceNet) against live selfie vs. document photo — liveness detection included"
    },
    {
      status: "warn",
      icon: "ti-alert-circle",
      title: "Watchlist fuzzy match",
      desc: "OFAC SDN, UN Consolidated, EU & UK sanctions lists — threshold tunable (default 85% similarity)"
    },
    {
      status: "fail",
      icon: "ti-x",
      title: "Graph-based entity resolution",
      desc: "Network of shared addresses, phones, corporate affiliations to detect clusters of linked entities"
    },
  ],

  // ===========================================================================
  // AML FLAGS
  // ===========================================================================
  amlFlags: [
    {
      sev: "red",
      title: "Sanctions list match — Dmitri Petrov",
      cat: "OFAC SDN",
      detail: "Exact match on full name + DOB against OFAC SDN list"
    },
    {
      sev: "red",
      title: "Duplicate national ID detected",
      cat: "Data integrity",
      detail: "KYC-0519 and KYC-0614 share the same Ukrainian ID number"
    },
    {
      sev: "amber",
      title: "PEP — indirect family exposure",
      cat: "PEP screening",
      detail: "Amara Keita shares surname and DOB range with listed political figure"
    },
    {
      sev: "red",
      title: "Adverse media — money laundering",
      cat: "Adverse media",
      detail: "Carlos Restrepo linked to 2023 Bogotá wire-fraud investigation (Reuters)"
    },
    {
      sev: "amber",
      title: "High-risk jurisdiction — multiple accounts",
      cat: "Geo risk",
      detail: "Three accounts registered to addresses in Minsk within 30 days"
    },
    {
      sev: "amber",
      title: "Unusual transaction velocity",
      cat: "Behavioural",
      detail: "12 outgoing wires > $50k in 72 hours — exceeds peer group 99th percentile"
    },
    {
      sev: "amber",
      title: "Shell company UBO unresolved",
      cat: "Ownership",
      detail: "Beneficial owner chain exceeds 4 layers; ultimate owner not identified"
    },
  ],

  // ===========================================================================
  // RISK FACTORS
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
  // JURISDICTIONS
  // ===========================================================================
  jurisdictions: [
    { code: "RU", count: 3, color: "#E24B4A" },
    { code: "BY", count: 2, color: "#E24B4A" },
    { code: "CO", count: 1, color: "#EF9F27" },
    { code: "ML", count: 1, color: "#EF9F27" },
    { code: "HK", count: 1, color: "#EF9F27" },
  ],

  // ===========================================================================
  // MONTHLY TREND DATA
  // ===========================================================================
  monthlyTrend: {
    labels:     ["January", "February", "March", "April", "May", "June"],
    onboarded:  [620, 710, 680, 790, 840, 910],
    flagged:    [38,  45,  41,  55,  62,  71],
  },

  // ===========================================================================
  // MATCH RATE TREND
  // Target: ≥ 90%. April dip caused by a third-party data-provider outage.
  // ===========================================================================
  matchRateTrend: {
    labels: ["January", "February", "March", "April", "May", "June"],
    rates:  [88.1,       89.4,       90.7,    84.2,    90.0,  91.3],
  },

};
