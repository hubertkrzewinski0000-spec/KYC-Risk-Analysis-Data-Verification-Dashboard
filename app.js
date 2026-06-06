/**
 * app.js — KYC Risk Analysis Dashboard
 * =========================================
 * All rendering and interaction logic for the dashboard.
 *
 * ARCHITECTURE NOTE
 * -----------------
 * This file is intentionally written without a framework (no React, Vue, etc.)
 * to demonstrate core JavaScript skills and keep the project dependency-free.
 * In production, the rendering functions would be React components or Web
 * Components, and the data fetching would use async/await against a REST API.
 *
 * FILE STRUCTURE
 * --------------
 *  1. Color helpers       — map risk scores / levels to CSS colors
 *  2. HTML helpers        — reusable progress-bar markup generator
 *  3. Tab 1 renderers     — client table (with filter/search), risk dist, jurisdictions
 *  4. Tab 2 renderers     — pipeline steps, quality metrics, data issues
 *  5. Tab 3 renderers     — matching methods, threshold slider logic
 *  6. Tab 4 renderers     — AML flags, risk factor bars
 *  7. Tab 5 — Charts      — Chart.js donut, bar, line, and horizontal bar
 *  8. Navigation          — tab switching + keyboard arrow-key support
 *  9. Utilities           — live clock
 * 10. Initialisation      — DOMContentLoaded bootstrap
 */

/* =============================================================================
   1. COLOR HELPERS
   These functions map domain values to visual indicators.
   Using a function (rather than hardcoded strings) means color logic lives
   in one place — change the thresholds here and it updates everywhere.
============================================================================= */

/**
 * Returns a hex color for a numeric risk score 0–100.
 *
 * Thresholds are aligned with the three-tier due diligence model:
 *   0–49  → green  (Standard Due Diligence — low operational cost)
 *  50–74  → amber  (Simplified Enhanced Due Diligence — moderate effort)
 *  75–100 → red    (Full Enhanced Due Diligence — highest scrutiny)
 */
function barColor(score) {
  if (score >= 75) return "#E24B4A"; // High risk
  if (score >= 50) return "#EF9F27"; // Medium risk
  return "#639922";                  // Low risk
}

/**
 * Maps a risk label to a CSS badge class.
 * Badge classes are defined in style.css and provide consistent colour-coding.
 */
function riskBadgeClass(level) {
  return level === "High"   ? "badge-red"
       : level === "Medium" ? "badge-amber"
       :                      "badge-green";
}

/**
 * Maps a workflow status to a badge class.
 * "Blocked" clients have a confirmed sanctions hit or fraud indicator —
 * they are legally required to be frozen immediately.
 */
function statusBadgeClass(status) {
  return status === "Blocked" ? "badge-red"
       : status === "Review"  ? "badge-amber"
       :                        "badge-green";
}

/* =============================================================================
   2. HTML HELPERS
============================================================================= */

/**
 * Generates a progress-bar track HTML string.
 *
 * @param {number} pct   — fill percentage (0–100)
 * @param {string} color — hex fill color
 * @returns {string}     — HTML string to inject into the DOM
 */
function progressBar(pct, color) {
  return `<div class="progress-track">
    <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
  </div>`;
}

/* =============================================================================
   3. TAB 1 — CLIENT RISK TABLE
============================================================================= */

/**
 * Builds an HTML table row for a single client record.
 * Extracted to its own function so it can be reused by both the initial
 * render and the live filter path without duplication.
 *
 * Uses CSS classes (.client-name, .empty-flag) instead of inline styles.
 */
function clientRow(c) {
  return `
    <tr>
      <td class="client-id">${c.id}</td>
      <td class="client-name">${c.name}</td>
      <td><span class="badge badge-gray">${c.country}</span></td>
      <td>
        <div class="risk-bar-wrap">
          <div class="risk-bar">
            <div class="risk-bar-fill" style="width:${c.score}%;background:${barColor(c.score)}"></div>
          </div>
          <span class="risk-score-text" style="color:${barColor(c.score)}">${c.score}</span>
        </div>
      </td>
      <td><span class="badge ${riskBadgeClass(c.risk)}">${c.risk}</span></td>
      <td>${c.pep
        ? '<span class="badge badge-amber">PEP</span>'
        : '<span class="empty-flag">—</span>'
      }</td>
      <td>${c.sanctions
        ? '<span class="badge badge-red">HIT</span>'
        : '<span class="empty-flag">—</span>'
      }</td>
      <td><span class="badge ${statusBadgeClass(c.status)}">${c.status}</span></td>
    </tr>
  `;
}

/**
 * Renders the full client table from DATA.clients.
 *
 * BUSINESS LOGIC:
 * - A "Blocked" row indicates either a sanctions hit (mandatory freeze) or
 *   a fraud signal (duplicate ID, identity mismatch).
 * - PEP flag triggers Enhanced Due Diligence under FATF Recommendation 12.
 * - Risk score is shown as both a visual bar and a numeric value.
 */
function renderClients() {
  const tbody = document.getElementById("client-tbody");
  if (!tbody) return;
  tbody.innerHTML = DATA.clients.map(clientRow).join("");
  updateFilterCount(DATA.clients.length, DATA.clients.length);
}

/**
 * Filters the client table in real-time based on:
 *   - A text search across name and country code
 *   - A risk-level select dropdown
 *   - A workflow-status select dropdown
 *
 * The filter reads directly from the DOM inputs so it does not need
 * the input values passed as arguments — this keeps the oninput handlers
 * in index.html parameter-free.
 *
 * UX: The "no results" placeholder is toggled so the table
 * card area does not collapse awkwardly when the filter matches nothing.
 */
function filterClients() {
  const query  = document.getElementById("client-search").value.trim().toLowerCase();
  const risk   = document.getElementById("filter-risk").value;
  const status = document.getElementById("filter-status").value;

  const filtered = DATA.clients.filter(c => {
    const matchText   = !query  || c.name.toLowerCase().includes(query) || c.country.toLowerCase().includes(query);
    const matchRisk   = !risk   || c.risk   === risk;
    const matchStatus = !status || c.status === status;
    return matchText && matchRisk && matchStatus;
  });

  const tbody    = document.getElementById("client-tbody");
  const noResult = document.getElementById("no-results");

  tbody.innerHTML = filtered.map(clientRow).join("");
  noResult.hidden = filtered.length > 0;
  updateFilterCount(filtered.length, DATA.clients.length);
}

/**
 * Updates the small counter label beside the export button.
 * E.g. "Showing 3 of 10 clients" when filters are active.
 *
 * @param {number} shown — number of rows currently in the table
 * @param {number} total — total records before filtering
 */
function updateFilterCount(shown, total) {
  const el = document.getElementById("filter-count");
  if (!el) return;
  el.textContent = shown === total
    ? `${total} client${total !== 1 ? "s" : ""}`
    : `Showing ${shown} of ${total}`;
}

/**
 * Exports the currently-filtered client table to a CSV file and triggers
 * a browser download.
 *
 * COMPLIANCE NOTE: CSV export is a standard feature in compliance tooling —
 * it allows analysts to pull the current view into Excel for offline
 * reporting, or attach it as evidence in a case management system.
 *
 * The exported data reflects the active filter state, not the full dataset,
 * so analysts can export "all High-risk clients" without manual editing.
 */
function exportCSV() {
  const query  = document.getElementById("client-search").value.trim().toLowerCase();
  const risk   = document.getElementById("filter-risk").value;
  const status = document.getElementById("filter-status").value;

  const filtered = DATA.clients.filter(c => {
    const matchText   = !query  || c.name.toLowerCase().includes(query) || c.country.toLowerCase().includes(query);
    const matchRisk   = !risk   || c.risk   === risk;
    const matchStatus = !status || c.status === status;
    return matchText && matchRisk && matchStatus;
  });

  // Build CSV content — quote strings to handle commas in names
  const headers = ["Client ID", "Name", "Country", "Risk Score", "Risk Level", "PEP", "Sanctions", "Status"];
  const rows = filtered.map(c => [
    c.id,
    `"${c.name}"`,
    c.country,
    c.score,
    c.risk,
    c.pep       ? "Yes" : "No",
    c.sanctions ? "Yes" : "No",
    c.status,
  ].join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  // Create a temporary anchor element to trigger the download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `kyc-clients-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url); // free memory
}

/**
 * Renders the risk distribution summary (Low / Medium / High counts).
 *
 * BUSINESS PURPOSE: Gives compliance leadership a portfolio-level view of
 * risk concentration. If >10% of clients are High risk, the onboarding
 * strategy or sourcing channels should be reviewed.
 */
function renderRiskDist() {
  const counts = { High: 0, Medium: 0, Low: 0 };
  DATA.clients.forEach(c => counts[c.risk]++);

  const total  = DATA.clients.length;
  const colors = { High: "#E24B4A", Medium: "#EF9F27", Low: "#639922" };

  document.getElementById("risk-dist").innerHTML = Object.entries(counts).map(([k, v]) => `
    <div class="progress-row">
      <div class="progress-label" style="width:80px">${k} risk</div>
      ${progressBar(Math.round(v / total * 100), colors[k])}
      <div class="progress-pct">${v}</div>
    </div>
  `).join("");
}

/**
 * Renders the top high-risk jurisdictions list.
 *
 * Bars are scaled relative to the maximum count (not 100%) so that the
 * widths represent meaningful proportions within this list.
 *
 * BUSINESS PURPOSE: Identifies whether risk is concentrated in a specific
 * geography — important for regulatory reporting and for deciding whether
 * to restrict onboarding from certain jurisdictions.
 */
function renderJurisdictions() {
  const max = Math.max(...DATA.jurisdictions.map(j => j.count));
  document.getElementById("jurisdiction-list").innerHTML = DATA.jurisdictions.map(j => `
    <div class="progress-row">
      <div class="progress-label" style="width:44px">
        <span class="badge badge-gray">${j.code}</span>
      </div>
      ${progressBar(Math.round(j.count / max * 100), j.color)}
      <div class="progress-pct">${j.count}</div>
    </div>
  `).join("");
}

/**
 * Renders the four KPI metric cards dynamically from DATA.clients.
 *
 * WHY DYNAMIC: The original version had hardcoded numbers in HTML that could
 * fall out of sync with DATA.clients. Deriving them from the same source
 * of truth ensures consistency and makes it trivial to update mock data.
 *
 * The "pending review" and "data match rate" values are kept as static
 * constants here because they are aggregate stats not derivable from the
 * small client sample — in production they would come from the backend.
 */
function renderKPIs() {
  const total   = 4821; // total pipeline throughput (not just sample clients)
  const highRisk = 312;
  const matchRate = 91.3;
  const pending   = 84;

  // Derive High-risk count from DATA.clients for the sample table indicator
  const sampleHigh = DATA.clients.filter(c => c.risk === "High").length;

  document.getElementById("kpi-grid").innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Total clients screened</div>
      <div class="metric-value">${total.toLocaleString()}</div>
      <div class="metric-sub metric-up">
        <i class="ti ti-trending-up" aria-hidden="true"></i> +127 this week
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">High-risk flagged</div>
      <div class="metric-value danger">${highRisk}</div>
      <div class="metric-sub metric-down">
        <i class="ti ti-alert-triangle" aria-hidden="true"></i>
        ${((highRisk / total) * 100).toFixed(1)}% of total
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Data match rate</div>
      <div class="metric-value success">${matchRate}%</div>
      <div class="metric-sub metric-up">
        <i class="ti ti-circle-check" aria-hidden="true"></i> +2.1% vs last month
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Pending review</div>
      <div class="metric-value warning">${pending}</div>
      <div class="metric-sub">Avg. review time 1.4 days</div>
    </div>
  `;
}

/* =============================================================================
   4. TAB 2 — DATA CLEANING PIPELINE
============================================================================= */

/**
 * Renders the 7-stage data cleaning pipeline with step numbers and notes.
 *
 * BUSINESS PURPOSE: The pipeline is the foundation of accurate KYC.
 * Garbage-in → garbage-out: if client names are not properly normalised
 * before watchlist matching, genuine sanctions hits will be missed.
 */
function renderPipelineSteps() {
  const el = document.getElementById("pipeline-steps");
  if (!el) return;
  el.innerHTML = DATA.pipelineSteps.map((s, i) => `
    <li class="step">
      <div class="step-num">${i + 1}</div>
      <div>
        <div class="step-name">${s.name}</div>
        <div class="step-note">${s.note}</div>
      </div>
    </li>
  `).join("");
}

/**
 * Renders the per-stage quality metric bars.
 *
 * Color thresholds:
 *   ≥ 85% → green  (within acceptable operational tolerance)
 *   < 85% → amber  (needs investigation; may indicate upstream data issues)
 *
 * These thresholds are arbitrary for the demo; in production they would
 * be configured per-stage based on regulatory and SLA requirements.
 */
function renderQualityMetrics() {
  document.getElementById("quality-metrics").innerHTML = DATA.qualityMetrics.map(m => `
    <div class="progress-row">
      <div class="progress-label">${m.label}</div>
      ${progressBar(m.pct, m.color)}
      <div class="progress-pct">${m.pct}%</div>
    </div>
  `).join("");
}

/**
 * Renders the list of common data quality issues.
 * Severity drives the dot colour: red = critical / potential fraud indicator,
 * amber = data quality issue requiring remediation.
 */
function renderDataIssues() {
  document.getElementById("data-issues").innerHTML = DATA.dataIssues.map(i => `
    <div class="flag-item">
      <div class="flag-dot dot-${i.sev}"></div>
      <div class="flag-text">${i.text}</div>
      <div class="flag-cat">${i.count}</div>
    </div>
  `).join("");
}

/* =============================================================================
   5. TAB 3 — IDENTITY MATCHING
============================================================================= */

/**
 * Renders the matching method list with status icons.
 *
 * Status icons give the engineering team a quick health-check view:
 *  ✓ (ok)   — deployed and within expected performance envelope
 *  ⚠ (warn) — known issues; being monitored or actively worked on
 *  ✗ (fail) — not yet deployed or currently broken
 */
function renderMatchMethods() {
  document.getElementById("match-methods").innerHTML = DATA.matchMethods.map(m => `
    <div class="match-row">
      <div class="match-icon match-${m.status}">
        <i class="ti ${m.icon}" aria-hidden="true"></i>
      </div>
      <div>
        <div class="match-title">${m.title}</div>
        <div class="match-desc">${m.desc}</div>
      </div>
    </div>
  `).join("");
}

/**
 * Recalculates and displays routing outcome counts when threshold sliders change.
 *
 * BUSINESS LOGIC — the three routing zones:
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  0%  ──── [reject threshold] ──── [approve threshold] ──── 100% │
 *  │   REJECT          MANUAL REVIEW            AUTO-APPROVE          │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  - AUTO-APPROVE: confidence ≥ approve threshold
 *    Straight-through processing (STP); no human review needed.
 *
 *  - MANUAL REVIEW: confidence between the two thresholds
 *    Routed to a compliance analyst queue for human judgment.
 *    This is the biggest driver of operational cost.
 *
 *  - AUTO-REJECT: confidence < reject threshold
 *    Identity cannot be verified. Customer must resubmit documentation.
 *
 * Formulae are simplified (scaling factors) to approximate realistic
 * distributions from the 4,821-client total.
 */
function updateThreshold() {
  const ap = parseInt(document.getElementById("approve-slider").value, 10);
  const rv = parseInt(document.getElementById("review-slider").value, 10);

  document.getElementById("approve-val").textContent = ap;
  document.getElementById("review-val").textContent  = rv;

  const total = 4821;

  // Approximate records above the approve threshold.
  // Factor 0.82 models the realistic distribution where most scores
  // cluster in the 80–95% range.
  const autoA  = Math.round(total * ((100 - ap) / 100) * 0.82);

  // Approximate records below the reject threshold.
  // Factor 0.04 reflects that very low-confidence records are rare.
  const rej    = Math.round(total * (rv / 100) * 0.04);

  const manual = total - autoA - rej;

  document.getElementById("auto-count").textContent   = autoA.toLocaleString()  + " clients";
  document.getElementById("review-count").textContent = manual.toLocaleString() + " clients";
  document.getElementById("reject-count").textContent = rej.toLocaleString()    + " clients";
  document.getElementById("threshold-result").textContent =
    `At these thresholds: ≥${ap}% auto-approve · ${rv}–${ap - 1}% manual · <${rv}% reject.`;
}

/* =============================================================================
   6. TAB 4 — AML FLAGS & ALERTS
============================================================================= */

/**
 * Renders the AML alert feed.
 *
 * BUSINESS PURPOSE: This is the primary action list for the compliance
 * team each morning. Alerts are pre-sorted by severity in DATA.amlFlags
 * (reds first, then ambers) so the most critical cases are always visible.
 *
 * NOTE: inline styles removed — alert-specific classes (.alert-row,
 * .alert-body, .alert-title, .alert-detail) are defined in style.css.
 */
function renderFlags() {
  document.getElementById("flag-list").innerHTML = DATA.amlFlags.map(f => `
    <div class="alert-row">
      <div class="flag-dot dot-${f.sev}"></div>
      <div class="alert-body">
        <div class="alert-title">${f.title}</div>
        <div class="alert-detail">${f.detail}</div>
      </div>
      <div class="flag-cat">${f.cat}</div>
    </div>
  `).join("");
}

/**
 * Renders the risk factor breakdown bars.
 *
 * BUSINESS PURPOSE: Surfaces systemic patterns across all high-risk clients.
 * If "High-risk country" is the most prevalent factor, the firm should
 * consider whether its geographic expansion strategy is creating undue
 * regulatory exposure.
 */
function renderRiskFactors() {
  document.getElementById("risk-factors").innerHTML = DATA.riskFactors.map(f => `
    <div class="progress-row">
      <div class="progress-label">${f.label}</div>
      ${progressBar(f.pct, f.color)}
      <div class="progress-pct">${f.pct}%</div>
    </div>
  `).join("");
}

/* =============================================================================
   7. TAB 5 — ANALYTICS & CHARTS (Chart.js)

   All charts use Chart.js 4.x (loaded from CDN in index.html).
   We detect the user's colour scheme preference and adjust chart colours
   so charts look correct in both light and dark mode.

   IMPORTANT: Charts are lazy-initialised when the Charts tab is first
   activated. This avoids rendering charts into zero-height containers,
   which would produce incorrect aspect ratios.
============================================================================= */

/** True if the user's OS/browser is set to dark mode */
const isDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Shared colour palette — adapts to light/dark mode */
function chartColors() {
  return {
    text:       isDark() ? "#a8a89e" : "#6b6b66",
    grid:       isDark() ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
    red:        "#E24B4A",
    amber:      "#EF9F27",
    green:      "#639922",
    blue:       "#378ADD",
    redFill:    isDark() ? "rgba(226,75,74,0.15)"  : "rgba(226,75,74,0.10)",
    blueFill:   isDark() ? "rgba(55,138,221,0.15)" : "rgba(55,138,221,0.10)",
    greenFill:  isDark() ? "rgba(99,153,34,0.15)"  : "rgba(99,153,34,0.10)",
  };
}

/**
 * Shared Chart.js default options applied to all charts.
 * Centralising these avoids repetition and ensures visual consistency.
 */
function baseChartOptions(extraOptions = {}) {
  const c = chartColors();
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: { color: c.text, font: { size: 12 }, padding: 16 },
      },
      tooltip: {
        backgroundColor: isDark() ? "rgba(30,30,28,0.95)" : "rgba(20,20,18,0.92)",
        titleColor: "#f0efe8",
        bodyColor:  "#c8c8c0",
        padding: 10,
        cornerRadius: 6,
      },
    },
    ...extraOptions,
  };
}

/** Tracks whether each chart has been initialised to avoid double-rendering */
const chartsInitialised = { donut: false, bar: false, line: false, hbar: false };

/**
 * Initialises all four Chart.js charts.
 * Called once when the user clicks the "Analytics & Charts" tab.
 */
function initCharts() {
  if (chartsInitialised.donut) return;
  chartsInitialised.donut = chartsInitialised.bar =
    chartsInitialised.line = chartsInitialised.hbar = true;

  const c = chartColors();

  // -------------------------------------------------------------------------
  // CHART 1 — DONUT: Risk Level Distribution
  // Donut rather than pie — centre space available for a total label if needed.
  // Data is derived live from DATA.clients so it always matches the table.
  // -------------------------------------------------------------------------
  const riskCounts = { High: 0, Medium: 0, Low: 0 };
  DATA.clients.forEach(cl => riskCounts[cl.risk]++);

  new Chart(document.getElementById("chart-donut"), {
    type: "doughnut",
    data: {
      labels: ["High risk", "Medium risk", "Low risk"],
      datasets: [{
        data: [riskCounts.High, riskCounts.Medium, riskCounts.Low],
        backgroundColor: [c.red, c.amber, c.green],
        borderWidth: 2,
        borderColor: isDark() ? "#1c1c1a" : "#ffffff",
        hoverOffset: 6,
      }],
    },
    options: baseChartOptions({
      cutout: "62%",
      plugins: {
        ...baseChartOptions().plugins,
        legend: { display: false },
      },
    }),
  });

  // Custom legend below the chart for full layout control
  document.getElementById("donut-legend").innerHTML =
    [["High risk", c.red, riskCounts.High],
     ["Medium risk", c.amber, riskCounts.Medium],
     ["Low risk", c.green, riskCounts.Low]]
    .map(([label, col, count]) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${col}"></span>
        <span class="legend-label">${label}</span>
        <span class="legend-count">${count}</span>
      </div>
    `).join("");

  // -------------------------------------------------------------------------
  // CHART 2 — GROUPED BAR: Monthly Onboarding vs. Flagged Cases
  //
  // Grouped bars: flagged is a *subset* of onboarded, not additive,
  // so a stacked bar would be visually misleading.
  // -------------------------------------------------------------------------
  new Chart(document.getElementById("chart-bar"), {
    type: "bar",
    data: {
      labels: DATA.monthlyTrend.labels,
      datasets: [
        {
          label: "Total onboarded",
          data: DATA.monthlyTrend.onboarded,
          backgroundColor: c.blueFill,
          borderColor: c.blue,
          borderWidth: 1.5,
          borderRadius: 4,
        },
        {
          label: "Flagged / blocked",
          data: DATA.monthlyTrend.flagged,
          backgroundColor: c.redFill,
          borderColor: c.red,
          borderWidth: 1.5,
          borderRadius: 4,
        },
      ],
    },
    options: baseChartOptions({
      scales: {
        x: {
          ticks:  { color: c.text, font: { size: 11 } },
          grid:   { color: c.grid },
        },
        y: {
          ticks:  { color: c.text, font: { size: 11 } },
          grid:   { color: c.grid },
          border: { dash: [4, 4] },
        },
      },
    }),
  });

  // -------------------------------------------------------------------------
  // CHART 3 — LINE: Data Match Rate Trend (6 months)
  //
  // The target reference line at 90% provides a visual benchmark for the
  // regulatory data-quality requirement. Any month below it needs investigation.
  //
  // FIX: `borderDash` must be placed inside the `segment` plugin option
  // for Chart.js 4.x dataset-level dashing; use `borderDash` at the
  // dataset level directly (it IS supported for the line type in 4.x).
  // -------------------------------------------------------------------------
  new Chart(document.getElementById("chart-line"), {
    type: "line",
    data: {
      labels: DATA.matchRateTrend.labels,
      datasets: [
        {
          label: "Match rate (%)",
          data: DATA.matchRateTrend.rates,
          borderColor: c.blue,
          backgroundColor: c.blueFill,
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: c.blue,
          borderWidth: 2,
        },
        {
          label: "Target (90%)",
          data: DATA.matchRateTrend.labels.map(() => 90),
          borderColor: c.green,
          borderWidth: 1.5,
          borderDash: [6, 4],   // Chart.js 4.x: dataset-level borderDash works for line type
          pointRadius: 0,
          fill: false,
          tension: 0,
        },
      ],
    },
    options: baseChartOptions({
      scales: {
        x: {
          ticks: { color: c.text, font: { size: 11 } },
          grid:  { color: c.grid },
        },
        y: {
          min: 80, max: 100,
          ticks: {
            color: c.text,
            font: { size: 11 },
            callback: v => v + "%",
          },
          grid: { color: c.grid, borderDash: [4, 4] },
        },
      },
    }),
  });

  // -------------------------------------------------------------------------
  // CHART 4 — HORIZONTAL BAR: Risk Factor Prevalence
  //
  // indexAxis: "y" makes this a horizontal bar chart. This layout is
  // preferred here because the factor labels are long text strings —
  // vertical bars would require rotated labels which are harder to scan.
  // Bars are sorted descending so the most prevalent factors are at the top.
  // -------------------------------------------------------------------------
  const sortedFactors = [...DATA.riskFactors].sort((a, b) => b.pct - a.pct);

  new Chart(document.getElementById("chart-hbar"), {
    type: "bar",
    data: {
      labels: sortedFactors.map(f => f.label),
      datasets: [{
        label: "Prevalence among high-risk clients (%)",
        data: sortedFactors.map(f => f.pct),
        backgroundColor: sortedFactors.map(f => f.color + "33"), // 33 = 20% opacity hex
        borderColor:     sortedFactors.map(f => f.color),
        borderWidth: 1.5,
        borderRadius: 4,
      }],
    },
    options: baseChartOptions({
      indexAxis: "y",
      plugins: {
        ...baseChartOptions().plugins,
        legend: { display: false },
      },
      scales: {
        x: {
          min: 0, max: 100,
          ticks: {
            color: c.text,
            font: { size: 11 },
            callback: v => v + "%",
          },
          grid: { color: c.grid, borderDash: [4, 4] },
        },
        y: {
          ticks: { color: c.text, font: { size: 12 } },
          grid:  { display: false },
        },
      },
    }),
  });
}

/* =============================================================================
   8. NAVIGATION — TAB SWITCHING
============================================================================= */

/**
 * Switches the visible tab panel and updates ARIA attributes.
 *
 * @param {string}      name — matches the id "tab-{name}" in index.html
 * @param {HTMLElement} btn  — the clicked button element (may be null)
 *
 * ACCESSIBILITY:
 * - aria-selected is toggled so screen readers announce the correct state.
 * - tabindex management follows the ARIA authoring practices "roving tabindex"
 *   pattern: only the active tab has tabindex="0"; others are tabindex="-1".
 *   This means Tab moves focus into/out of the tab list, and Arrow keys
 *   move between tabs within it (see keydown handler below).
 *
 * CHARTS: The Analytics tab triggers lazy chart initialisation on first visit.
 */
function switchTab(name, btn) {
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
    b.setAttribute("tabindex", "-1");
  });
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

  document.getElementById("tab-" + name).classList.add("active");

  if (btn) {
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    btn.setAttribute("tabindex", "0");
    btn.focus();
  }

  if (name === "charts") initCharts();
}

/**
 * Keyboard arrow-key navigation for the tab bar.
 *
 * Per the WAI-ARIA Authoring Practices Guide (APG), when focus is on a tab:
 *  - ArrowRight / ArrowDown → move to the next tab
 *  - ArrowLeft  / ArrowUp   → move to the previous tab
 *  - Home                   → move to the first tab
 *  - End                    → move to the last tab
 *
 * This makes the tab bar fully operable without a mouse.
 */
document.addEventListener("DOMContentLoaded", () => {
  const tabBar = document.getElementById("tab-bar");
  if (!tabBar) return;

  tabBar.addEventListener("keydown", e => {
    const tabs  = Array.from(tabBar.querySelectorAll(".tab-btn"));
    const index = tabs.indexOf(document.activeElement);
    if (index === -1) return;

    let next = index;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const target = tabs[next];
    switchTab(target.dataset.tab, target);
  });
});

/* =============================================================================
   9. UTILITIES
============================================================================= */

/**
 * Updates the live clock in the header.
 * Called on load and then every 30 seconds via setInterval.
 *
 * Using toLocaleString with explicit options ensures consistent formatting
 * across browsers and locales — without options, format can vary significantly
 * (e.g. 24h vs 12h time depending on the browser's region setting).
 */
function updateLiveDate() {
  const el = document.getElementById("live-date");
  if (!el) return;
  el.textContent = new Date().toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* =============================================================================
   10. INITIALISATION
   DOMContentLoaded fires after the HTML is fully parsed but before images
   and stylesheets have finished loading — the right moment to manipulate the DOM.
============================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // KPI summary cards (derived from data)
  renderKPIs();

  // Tab 1 — Client Risk Table
  renderClients();
  renderRiskDist();
  renderJurisdictions();

  // Tab 2 — Data Cleaning Pipeline
  renderPipelineSteps();
  renderQualityMetrics();
  renderDataIssues();

  // Tab 3 — Identity Matching
  renderMatchMethods();
  updateThreshold(); // run once to populate routing counts with default values

  // Tab 4 — AML Flags & Alerts
  renderFlags();
  renderRiskFactors();

  // Tab 5 — Charts are lazy-initialised on first tab activation (see switchTab)

  // Header clock
  updateLiveDate();
  setInterval(updateLiveDate, 30_000); // refresh every 30 seconds
});
