/**
 * app.js — KYC Risk Analysis Dashboard
 * =========================================
 * Rendering and interaction logic for the dashboard.
 * Pure business-logic functions live in lib/risk.js (imported below)
 * so they can be unit-tested independently of the DOM.
 */

import {
  barColor,
  riskBadgeClass,
  statusBadgeClass,
  filterClients as filterClientsLogic,
  calcRouting,
  countByRisk,
} from "./lib/risk.js";

/* =============================================================================
   HTML HELPERS
============================================================================= */
function progressBar(pct, color) {
  return `<div class="progress-track">
    <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
  </div>`;
}

/* =============================================================================
   TAB 1 — CLIENT RISK TABLE
============================================================================= */
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

function renderClients() {
  const tbody = document.getElementById("client-tbody");
  if (!tbody) return;
  tbody.innerHTML = DATA.clients.map(clientRow).join("");
  updateFilterCount(DATA.clients.length, DATA.clients.length);
}

function filterClients() {
  const query  = document.getElementById("client-search").value.trim().toLowerCase();
  const risk   = document.getElementById("filter-risk").value;
  const status = document.getElementById("filter-status").value;

  const filtered = filterClientsLogic(DATA.clients, { query, risk, status });

  const tbody    = document.getElementById("client-tbody");
  const noResult = document.getElementById("no-results");

  tbody.innerHTML = filtered.map(clientRow).join("");
  noResult.hidden = filtered.length > 0;
  updateFilterCount(filtered.length, DATA.clients.length);
}

function updateFilterCount(shown, total) {
  const el = document.getElementById("filter-count");
  if (!el) return;
  el.textContent = shown === total
    ? `${total} client${total !== 1 ? "s" : ""}`
    : `Showing ${shown} of ${total}`;
}

function exportCSV() {
  const query  = document.getElementById("client-search").value.trim().toLowerCase();
  const risk   = document.getElementById("filter-risk").value;
  const status = document.getElementById("filter-status").value;

  const filtered = filterClientsLogic(DATA.clients, { query, risk, status });

  const headers = ["Client ID","Name","Country","Risk Score","Risk Level","PEP","Sanctions","Status"];
  const rows = filtered.map(c => [
    c.id, `"${c.name}"`, c.country, c.score, c.risk,
    c.pep ? "Yes" : "No", c.sanctions ? "Yes" : "No", c.status,
  ].join(","));

  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `kyc-clients-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderRiskDist() {
  const counts = countByRisk(DATA.clients);
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

function renderKPIs() {
  const total     = 4821;
  const highRisk  = 312;
  const matchRate = 91.3;
  const pending   = 84;

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
   TAB 2 — DATA CLEANING PIPELINE
============================================================================= */
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

function renderQualityMetrics() {
  document.getElementById("quality-metrics").innerHTML = DATA.qualityMetrics.map(m => `
    <div class="progress-row">
      <div class="progress-label">${m.label}</div>
      ${progressBar(m.pct, m.color)}
      <div class="progress-pct">${m.pct}%</div>
    </div>
  `).join("");
}

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
   TAB 3 — IDENTITY MATCHING
============================================================================= */
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

function updateThreshold() {
  const ap = parseInt(document.getElementById("approve-slider").value, 10);
  const rv = parseInt(document.getElementById("review-slider").value, 10);

  document.getElementById("approve-val").textContent = ap;
  document.getElementById("review-val").textContent  = rv;

  const { autoApprove, manualReview, autoReject } = calcRouting(ap, rv);

  document.getElementById("auto-count").textContent   = autoApprove.toLocaleString()  + " clients";
  document.getElementById("review-count").textContent = manualReview.toLocaleString() + " clients";
  document.getElementById("reject-count").textContent = autoReject.toLocaleString()   + " clients";
  document.getElementById("threshold-result").textContent =
    `At these thresholds: ≥${ap}% auto-approve · ${rv}–${ap - 1}% manual · <${rv}% reject.`;
}

/* =============================================================================
   TAB 4 — AML FLAGS & ALERTS
============================================================================= */
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
   TAB 5 — CHARTS
============================================================================= */
const isDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

function chartColors() {
  return {
    text:      isDark() ? "#a8a89e" : "#6b6b66",
    grid:      isDark() ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
    red:       "#E24B4A", amber: "#EF9F27", green: "#639922", blue: "#378ADD",
    redFill:   isDark() ? "rgba(226,75,74,0.15)"  : "rgba(226,75,74,0.10)",
    blueFill:  isDark() ? "rgba(55,138,221,0.15)" : "rgba(55,138,221,0.10)",
    greenFill: isDark() ? "rgba(99,153,34,0.15)"  : "rgba(99,153,34,0.10)",
  };
}

function baseChartOptions(extra = {}) {
  const c = chartColors();
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: c.text, font: { size: 12 }, padding: 16 } },
      tooltip: {
        backgroundColor: isDark() ? "rgba(30,30,28,0.95)" : "rgba(20,20,18,0.92)",
        titleColor: "#f0efe8", bodyColor: "#c8c8c0", padding: 10, cornerRadius: 6,
      },
    },
    ...extra,
  };
}

const chartsInitialised = { donut: false, bar: false, line: false, hbar: false };

function initCharts() {
  if (chartsInitialised.donut) return;
  chartsInitialised.donut = chartsInitialised.bar =
    chartsInitialised.line = chartsInitialised.hbar = true;

  const c = chartColors();
  const riskCounts = countByRisk(DATA.clients);

  // Donut
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
    options: baseChartOptions({ cutout: "62%", plugins: { ...baseChartOptions().plugins, legend: { display: false } } }),
  });

  document.getElementById("donut-legend").innerHTML =
    [["High risk", c.red, riskCounts.High],
     ["Medium risk", c.amber, riskCounts.Medium],
     ["Low risk", c.green, riskCounts.Low]]
    .map(([label, col, count]) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${col}"></span>
        <span>${label}</span>
        <span class="legend-count">${count}</span>
      </div>`).join("");

  // Grouped bar
  new Chart(document.getElementById("chart-bar"), {
    type: "bar",
    data: {
      labels: DATA.monthlyTrend.labels,
      datasets: [
        { label: "Total onboarded", data: DATA.monthlyTrend.onboarded,
          backgroundColor: c.blueFill, borderColor: c.blue, borderWidth: 1.5, borderRadius: 4 },
        { label: "Flagged / blocked", data: DATA.monthlyTrend.flagged,
          backgroundColor: c.redFill,  borderColor: c.red,  borderWidth: 1.5, borderRadius: 4 },
      ],
    },
    options: baseChartOptions({
      scales: {
        x: { ticks: { color: c.text, font: { size: 11 } }, grid: { color: c.grid } },
        y: { ticks: { color: c.text, font: { size: 11 } }, grid: { color: c.grid } },
      },
    }),
  });

  // Line — match rate trend
  new Chart(document.getElementById("chart-line"), {
    type: "line",
    data: {
      labels: DATA.matchRateTrend.labels,
      datasets: [
        { label: "Match rate (%)", data: DATA.matchRateTrend.rates,
          borderColor: c.blue, backgroundColor: c.blueFill, fill: true,
          tension: 0.3, pointRadius: 5, pointHoverRadius: 7,
          pointBackgroundColor: c.blue, borderWidth: 2 },
        { label: "Target (90%)", data: DATA.matchRateTrend.labels.map(() => 90),
          borderColor: c.green, borderWidth: 1.5, borderDash: [6, 4],
          pointRadius: 0, fill: false, tension: 0 },
      ],
    },
    options: baseChartOptions({
      scales: {
        x: { ticks: { color: c.text, font: { size: 11 } }, grid: { color: c.grid } },
        y: {
          min: 80, max: 100,
          ticks: { color: c.text, font: { size: 11 }, callback: v => v + "%" },
          grid: { color: c.grid },
        },
      },
    }),
  });

  // Horizontal bar — risk factor prevalence
  const sorted = [...DATA.riskFactors].sort((a, b) => b.pct - a.pct);
  new Chart(document.getElementById("chart-hbar"), {
    type: "bar",
    data: {
      labels: sorted.map(f => f.label),
      datasets: [{
        label: "Prevalence among high-risk clients (%)",
        data: sorted.map(f => f.pct),
        backgroundColor: sorted.map(f => f.color + "33"),
        borderColor:     sorted.map(f => f.color),
        borderWidth: 1.5, borderRadius: 4,
      }],
    },
    options: baseChartOptions({
      indexAxis: "y",
      plugins: { ...baseChartOptions().plugins, legend: { display: false } },
      scales: {
        x: {
          min: 0, max: 100,
          ticks: { color: c.text, font: { size: 11 }, callback: v => v + "%" },
          grid: { color: c.grid },
        },
        y: { ticks: { color: c.text, font: { size: 12 } }, grid: { display: false } },
      },
    }),
  });
}

/* =============================================================================
   NAVIGATION
============================================================================= */
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

/* Keyboard arrow-key navigation (WAI-ARIA APG roving tabindex pattern) */
document.addEventListener("DOMContentLoaded", () => {
  const tabBar = document.getElementById("tab-bar");
  if (!tabBar) return;
  tabBar.addEventListener("keydown", e => {
    const tabs  = Array.from(tabBar.querySelectorAll(".tab-btn"));
    const index = tabs.indexOf(document.activeElement);
    if (index === -1) return;
    let next = index;
    if      (e.key === "ArrowRight" || e.key === "ArrowDown")  next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft"  || e.key === "ArrowUp")    next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home")  next = 0;
    else if (e.key === "End")   next = tabs.length - 1;
    else return;
    e.preventDefault();
    switchTab(tabs[next].dataset.tab, tabs[next]);
  });
});

/* =============================================================================
   UTILITIES
============================================================================= */
function updateLiveDate() {
  const el = document.getElementById("live-date");
  if (!el) return;
  el.textContent = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

/* =============================================================================
   INIT
============================================================================= */
document.addEventListener("DOMContentLoaded", () => {
  renderKPIs();
  renderClients();
  renderRiskDist();
  renderJurisdictions();
  renderPipelineSteps();
  renderQualityMetrics();
  renderDataIssues();
  renderMatchMethods();
  updateThreshold();
  renderFlags();
  renderRiskFactors();
  updateLiveDate();
  setInterval(updateLiveDate, 30_000);
});
