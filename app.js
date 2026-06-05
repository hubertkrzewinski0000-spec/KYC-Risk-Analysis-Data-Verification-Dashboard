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
 * 1. Color helpers       — map risk scores / levels to CSS colors
 * 2. HTML helpers        — reusable progress-bar markup generator
 * 3. Tab 1 renderers     — client table, risk distribution, jurisdictions
 * 4. Tab 2 renderers     — pipeline steps, quality metrics, data issues
 * 5. Tab 3 renderers     — matching methods, threshold slider logic
 * 6. Tab 4 renderers     — AML flags, risk factor bars
 * 7. Tab 5 — Charts      — Chart.js donut, bar, line, and horizontal bar
 * 8. Navigation          — tab switching
 * 9. Utilities           — live clock
 * 10. Initialisation     — DOMContentLoaded bootstrap
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
 *
 * The track uses a CSS border + background approach (no box-shadow) so it
 * renders cleanly in both light and dark mode without colour inversion issues.
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
 * Renders the full client table from DATA.clients.
 *
 * Each row is built by string interpolation rather than DOM manipulation
 * because setting innerHTML once is faster than calling appendChild() for
 * every cell — the browser only performs one reflow instead of N.
 *
 * BUSINESS LOGIC:
 * - A "Blocked" row indicates either a sanctions hit (mandatory freeze) or
 *   a fraud signal (duplicate ID, identity mismatch).
 * - PEP flag triggers Enhanced Due Diligence under FATF Recommendation 12.
 * - Risk score is shown as both a visual bar and a numeric value so the
 *   analyst can see the exact score without hovering.
 */
function renderClients() {
  const tbody = document.getElementById("client-tbody");
  if (!tbody) return;

  tbody.innerHTML = DATA.clients.map(c => `
    <tr>
      <td class="client-id">${c.id}</td>
      <td style="font-weight:500">${c.name}</td>
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
        : '<span style="color:var(--text-muted);font-size:12px">—</span>'
      }</td>
      <td>${c.sanctions
        ? '<span class="badge badge-red">HIT</span>'
        : '<span style="color:var(--text-muted);font-size:12px">—</span>'
      }</td>
      <td><span class="badge ${statusBadgeClass(c.status)}">${c.status}</span></td>
    </tr>
  `).join("");
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
  DATA.clients.forEach(c => counts[c.risk]++); // tally by risk tier

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
 * widths represent meaningful proportions within this list rather than
 * misleadingly small absolute percentages.
 *
 * BUSINESS PURPOSE: Identifies whether risk is concentrated in a specific
 * geography — important for regulatory reporting (e.g. FATF country reports)
 * and for deciding whether to restrict onboarding from certain jurisdictions.
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
 *    Setting this too low creates legal liability.
 *
 *  - MANUAL REVIEW: confidence between the two thresholds
 *    Routed to a compliance analyst queue for human judgment.
 *    This is the biggest driver of operational cost.
 *
 *  - AUTO-REJECT: confidence < reject threshold
 *    Identity cannot be verified. Customer is asked to resubmit
 *    better-quality documents before the case is reconsidered.
 *
 * The formulae here are intentionally simplified (using scaling factors)
 * to approximate realistic distributions from the 4,821 total clients.
 * In a real system, these numbers would come from the matching engine directly.
 */
function updateThreshold() {
  const ap = parseInt(document.getElementById("approve-slider").value, 10);
  const rv = parseInt(document.getElementById("review-slider").value, 10);

  // Update displayed slider values
  document.getElementById("approve-val").textContent = ap;
  document.getElementById("review-val").textContent  = rv;

  const total  = 4821;

  // Approximate the number of records above the approve threshold.
  // The factor 0.82 accounts for the realistic distribution of confidence
  // scores — most records cluster in the 80–95% range.
  const autoA  = Math.round(total * ((100 - ap) / 100) * 0.82);

  // Approximate records below the reject threshold.
  // The factor 0.04 reflects that very low-confidence records are rare —
  // most failures are in the ambiguous middle zone.
  const rej    = Math.round(total * (rv / 100) * 0.04);

  // Everything remaining goes to manual review queue
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
 * (reds first, then ambers) so the most critical cases are always visible
 * at the top without scrolling.
 */
function renderFlags() {
  document.getElementById("flag-list").innerHTML = DATA.amlFlags.map(f => `
    <div class="flag-item">
      <div class="flag-dot dot-${f.sev}" style="margin-top:5px"></div>
      <div style="flex:1">
        <div class="flag-text" style="font-weight:500">${f.title}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${f.detail}</div>
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
   accordingly so charts look correct in both light and dark mode.

   IMPORTANT: Charts are only initialised when the Charts tab is first
   activated (lazy initialisation). This avoids rendering charts into
   zero-height containers, which would produce incorrect aspect ratios.
============================================================================= */

/** True if the user's OS/browser is set to dark mode */
const isDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Shared colour palette — adapts to light/dark mode */
function chartColors() {
  return {
    text:       isDark() ? "#a8a89e" : "#6b6b66",  // axis labels, legend text
    grid:       isDark() ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", // grid lines
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
        // Legend text colour must match the current colour scheme
        labels: { color: c.text, font: { size: 12 }, padding: 16 },
      },
      tooltip: {
        // Tooltips use semi-transparent dark background regardless of mode
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
 *
 * We use Chart.js's canvas-based rendering because:
 *  - It produces crisp output on high-DPI screens (devicePixelRatio scaling)
 *  - It handles animation automatically
 *  - It is accessible via keyboard and screen readers with proper ARIA labels
 */
function initCharts() {
  // Guard: only initialise once (re-clicking the tab should not create duplicate charts)
  if (chartsInitialised.donut) return;
  chartsInitialised.donut = chartsInitialised.bar =
    chartsInitialised.line = chartsInitialised.hbar = true;

  const c = chartColors();

  // -------------------------------------------------------------------------
  // CHART 1 — DONUT: Risk Level Distribution
  //
  // A donut chart is appropriate here because we are showing part-to-whole
  // proportions. A pie chart would also work, but the donut's centre space
  // provides room for a total count label if needed in future.
  //
  // Data is derived live from DATA.clients so it always matches the table.
  // -------------------------------------------------------------------------
  const riskCounts = { High: 0, Medium: 0, Low: 0 };
  DATA.clients.forEach(c => riskCounts[c.risk]++);

  new Chart(document.getElementById("chart-donut"), {
    type: "doughnut",
    data: {
      labels: ["High risk", "Medium risk", "Low risk"],
      datasets: [{
        data: [riskCounts.High, riskCounts.Medium, riskCounts.Low],
        backgroundColor: [c.red, c.amber, c.green],
        borderWidth: 2,
        // Border colour matches the card background for a "floating segment" look
        borderColor: isDark() ? "#1c1c1a" : "#ffffff",
        hoverOffset: 6,
      }],
    },
    options: baseChartOptions({
      cutout: "62%", // controls the hole size — 62% gives a balanced donut
      plugins: {
        ...baseChartOptions().plugins,
        legend: {
          display: false, // We render a custom legend below the chart (see donut-legend)
        },
      },
    }),
  });

  // Custom legend — gives us full control over layout and colours
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
  // Grouped bars allow direct comparison between two related series
  // (total volume and flagged volume) for the same time period.
  // A stacked bar would be misleading here because flagged cases are a
  // subset of onboarded cases, not an additive value.
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
          borderRadius: 4,    // rounded bar tops for a modern aesthetic
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
          border: { dash: [4, 4] }, // dashed horizontal gridlines reduce visual noise
        },
      },
    }),
  });

  // -------------------------------------------------------------------------
  // CHART 3 — LINE: Data Match Rate Trend (6 months)
  //
  // A line chart is the natural choice for time-series data because it
  // emphasises continuity and makes trends (rising, falling, sudden dips)
  // immediately visible.
  //
  // The target line at 90% provides a visual reference for the regulatory
  // data-quality requirement — any month below this line needs investigation.
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
          fill: true,        // area fill under the line aids readability
          tension: 0.3,      // slight curve (0 = sharp angles, 1 = very rounded)
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: c.blue,
          borderWidth: 2,
        },
        {
          // Target threshold line — rendered as a dashed constant at 90%
          label: "Target (90%)",
          data: DATA.matchRateTrend.labels.map(() => 90),
          borderColor: c.green,
          borderWidth: 1.5,
          borderDash: [6, 4],  // dashed style distinguishes it from the main series
          pointRadius: 0,       // no data points on a reference line
          fill: false,
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
          min: 80, max: 100,   // narrow the y-axis range to amplify meaningful variance
          ticks: {
            color: c.text,
            font: { size: 11 },
            callback: v => v + "%",  // append % symbol to axis labels
          },
          grid: { color: c.grid, borderDash: [4, 4] },
        },
      },
    }),
  });

  // -------------------------------------------------------------------------
  // CHART 4 — HORIZONTAL BAR: Risk Factor Prevalence
  //
  // A horizontal bar layout is used (indexAxis: "y") because the factor
  // labels are long text strings — a vertical bar chart would require
  // rotated labels which are harder to read.
  //
  // Bars are sorted descending by prevalence (highest at top) so the
  // most significant risk factors are immediately visible.
  // -------------------------------------------------------------------------

  // Sort factors descending so the chart reads top-to-bottom: most → least common
  const sortedFactors = [...DATA.riskFactors].sort((a, b) => b.pct - a.pct);

  new Chart(document.getElementById("chart-hbar"), {
    type: "bar",
    data: {
      labels: sortedFactors.map(f => f.label),
      datasets: [{
        label: "Prevalence among high-risk clients (%)",
        data: sortedFactors.map(f => f.pct),
        // Each bar gets its own colour derived from the factor's severity color in DATA
        backgroundColor: sortedFactors.map(f => f.color + "33"), // 33 = 20% opacity hex
        borderColor:     sortedFactors.map(f => f.color),
        borderWidth: 1.5,
        borderRadius: 4,
      }],
    },
    options: baseChartOptions({
      indexAxis: "y",  // THIS makes it a horizontal bar chart
      plugins: {
        ...baseChartOptions().plugins,
        legend: { display: false }, // label is self-explanatory; legend adds clutter
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
          grid:  { display: false }, // no vertical gridlines on horizontal bar charts
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
 * @param {string} name — matches the id "tab-{name}" in index.html
 * @param {HTMLElement} btn — the clicked button element
 *
 * ACCESSIBILITY: aria-selected is updated so screen readers announce
 * the correct tab state. The role="tablist" / role="tab" / role="tabpanel"
 * structure in the HTML allows screen reader users to navigate tabs with
 * arrow keys in conformant browsers.
 *
 * CHARTS: The Analytics tab triggers lazy chart initialisation on first visit.
 */
function switchTab(name, btn) {
  // Deactivate all tabs
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
  });
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

  // Activate the selected tab
  document.getElementById("tab-" + name).classList.add("active");
  if (btn) {
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
  }

  // Lazy-init charts only when the charts tab is first opened
  // (Chart.js cannot render into a hidden/zero-height container correctly)
  if (name === "charts") initCharts();
}

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
