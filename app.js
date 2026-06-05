/**
 * app.js — KYC Risk Analysis Dashboard
 * All rendering and interaction logic.
 */

/* ---- Helpers ---- */

function barColor(score) {
  if (score >= 75) return "#E24B4A";
  if (score >= 50) return "#EF9F27";
  return "#639922";
}

function riskBadgeClass(level) {
  return level === "High" ? "badge-red" : level === "Medium" ? "badge-amber" : "badge-green";
}

function statusBadgeClass(status) {
  return status === "Blocked" ? "badge-red" : status === "Review" ? "badge-amber" : "badge-green";
}

function progressBar(pct, color) {
  return `<div class="progress-track">
    <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
  </div>`;
}

/* ---- Render: Client Table ---- */

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

/* ---- Render: Risk Distribution ---- */

function renderRiskDist() {
  const counts = { High: 0, Medium: 0, Low: 0 };
  DATA.clients.forEach(c => counts[c.risk]++);
  const total = DATA.clients.length;
  const colors = { High: "#E24B4A", Medium: "#EF9F27", Low: "#639922" };

  document.getElementById("risk-dist").innerHTML = Object.entries(counts).map(([k, v]) => `
    <div class="progress-row">
      <div class="progress-label" style="width:80px">${k} risk</div>
      ${progressBar(Math.round(v / total * 100), colors[k])}
      <div class="progress-pct">${v}</div>
    </div>
  `).join("");
}

/* ---- Render: Jurisdictions ---- */

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

/* ---- Render: Pipeline Steps ---- */

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

/* ---- Render: Quality Metrics ---- */

function renderQualityMetrics() {
  document.getElementById("quality-metrics").innerHTML = DATA.qualityMetrics.map(m => `
    <div class="progress-row">
      <div class="progress-label">${m.label}</div>
      ${progressBar(m.pct, m.color)}
      <div class="progress-pct">${m.pct}%</div>
    </div>
  `).join("");
}

/* ---- Render: Data Issues ---- */

function renderDataIssues() {
  document.getElementById("data-issues").innerHTML = DATA.dataIssues.map(i => `
    <div class="flag-item">
      <div class="flag-dot dot-${i.sev}"></div>
      <div class="flag-text">${i.text}</div>
      <div class="flag-cat">${i.count}</div>
    </div>
  `).join("");
}

/* ---- Render: Match Methods ---- */

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

/* ---- Render: AML Flags ---- */

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

/* ---- Render: Risk Factors ---- */

function renderRiskFactors() {
  document.getElementById("risk-factors").innerHTML = DATA.riskFactors.map(f => `
    <div class="progress-row">
      <div class="progress-label">${f.label}</div>
      ${progressBar(f.pct, f.color)}
      <div class="progress-pct">${f.pct}%</div>
    </div>
  `).join("");
}

/* ---- Threshold Slider Logic ---- */

function updateThreshold() {
  const ap = parseInt(document.getElementById("approve-slider").value, 10);
  const rv = parseInt(document.getElementById("review-slider").value, 10);

  document.getElementById("approve-val").textContent = ap;
  document.getElementById("review-val").textContent  = rv;

  const total   = 4821;
  const autoA   = Math.round(total * ((100 - ap) / 100) * 0.82);
  const rej     = Math.round(total * (rv / 100) * 0.04);
  const manual  = total - autoA - rej;

  document.getElementById("auto-count").textContent   = autoA.toLocaleString() + " clients";
  document.getElementById("review-count").textContent = manual.toLocaleString() + " clients";
  document.getElementById("reject-count").textContent = rej.toLocaleString() + " clients";
  document.getElementById("threshold-result").textContent =
    `At these thresholds: ≥${ap}% auto-approve · ${rv}–${ap - 1}% manual · <${rv}% reject.`;
}

/* ---- Tab Switching ---- */

function switchTab(name, btn) {
  document.querySelectorAll(".tab-btn").forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
  });
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

  document.getElementById("tab-" + name).classList.add("active");
  if (btn) {
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
  }
}

/* ---- Live Date ---- */

function updateLiveDate() {
  const el = document.getElementById("live-date");
  if (!el) return;
  el.textContent = new Date().toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* ---- Init ---- */

document.addEventListener("DOMContentLoaded", () => {
  renderClients();
  renderRiskDist();
  renderJurisdictions();
  renderPipelineSteps();
  renderQualityMetrics();
  renderDataIssues();
  renderMatchMethods();
  renderFlags();
  renderRiskFactors();
  updateThreshold();
  updateLiveDate();
  setInterval(updateLiveDate, 30_000);
});
