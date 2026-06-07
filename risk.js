/**
 * lib/risk.js — Pure business-logic functions for KYC risk scoring.
 *
 * This module contains NO DOM references and NO side effects.
 * It can be imported in both the browser (via app.js) and in Node.js tests.
 *
 * DESIGN PRINCIPLE: separating pure logic from rendering functions is the
 * single most impactful change for testability. Every function here is a
 * pure function: same input → same output, no external state.
 */

/**
 * Returns a hex colour for a numeric risk score 0–100.
 *
 * Thresholds align with the FATF three-tier due diligence model:
 *   0–49  → green  (Standard Due Diligence)
 *  50–74  → amber  (Simplified Enhanced Due Diligence)
 *  75–100 → red    (Full Enhanced Due Diligence)
 *
 * @param {number} score
 * @returns {string} hex colour
 */
export function barColor(score) {
  if (score >= 75) return "#E24B4A";
  if (score >= 50) return "#EF9F27";
  return "#639922";
}

/**
 * Maps a risk label to a CSS badge class.
 *
 * @param {"High"|"Medium"|"Low"} level
 * @returns {string} CSS class name
 */
export function riskBadgeClass(level) {
  return level === "High"   ? "badge-red"
       : level === "Medium" ? "badge-amber"
       :                      "badge-green";
}

/**
 * Maps a workflow status to a CSS badge class.
 *
 * @param {"Blocked"|"Review"|"Approved"} status
 * @returns {string} CSS class name
 */
export function statusBadgeClass(status) {
  return status === "Blocked" ? "badge-red"
       : status === "Review"  ? "badge-amber"
       :                        "badge-green";
}

/**
 * Derives the risk label from a numeric score.
 * This is the canonical mapping — it must match the thresholds in barColor().
 *
 * COMPLIANCE NOTE: Any client with a sanctions hit MUST be High risk regardless
 * of their numeric score — a sanctions hit is a mandatory freeze under OFAC/EU/UN.
 *
 * @param {number}  score
 * @param {boolean} [sanctionsHit=false]
 * @returns {"High"|"Medium"|"Low"}
 */
export function deriveRiskLevel(score, sanctionsHit = false) {
  if (sanctionsHit) return "High";
  if (score >= 75)  return "High";
  if (score >= 50)  return "Medium";
  return "Low";
}

/**
 * Derives the mandatory workflow status for a client.
 *
 * Rules (in priority order):
 *  1. Sanctions hit → Blocked  (no discretion; legal obligation)
 *  2. High risk     → Review   (Enhanced Due Diligence required)
 *  3. Medium risk   → Review   (Simplified EDD; analyst confirms)
 *  4. Low risk      → Approved (Standard Due Diligence; straight-through)
 *
 * @param {object} client — must have .score, .sanctions, .risk
 * @returns {"Blocked"|"Review"|"Approved"}
 */
export function deriveStatus(client) {
  if (client.sanctions)           return "Blocked";
  if (client.risk === "High")     return "Review";
  if (client.risk === "Medium")   return "Review";
  return "Approved";
}

/**
 * Calculates the three routing outcome counts for a given pair of thresholds.
 *
 * Routing zones (see app.js for the full business-logic diagram):
 *  - Auto-approve: confidence ≥ approveThreshold
 *  - Manual review: rejectThreshold ≤ confidence < approveThreshold
 *  - Auto-reject: confidence < rejectThreshold
 *
 * The scaling factors (0.82, 0.04) model a realistic confidence-score
 * distribution where most records cluster in the 80–95% range.
 *
 * @param {number} approveThreshold — percentage (70–99)
 * @param {number} rejectThreshold  — percentage (30–89)
 * @param {number} [total=4821]
 * @returns {{ autoApprove: number, manualReview: number, autoReject: number }}
 */
export function calcRouting(approveThreshold, rejectThreshold, total = 4821) {
  const autoApprove  = Math.round(total * ((100 - approveThreshold) / 100) * 0.82);
  const autoReject   = Math.round(total * (rejectThreshold / 100) * 0.04);
  const manualReview = total - autoApprove - autoReject;
  return { autoApprove, manualReview, autoReject };
}

/**
 * Counts clients per risk tier from an array of client records.
 *
 * @param {Array<{risk: string}>} clients
 * @returns {{ High: number, Medium: number, Low: number }}
 */
export function countByRisk(clients) {
  return clients.reduce(
    (acc, c) => { acc[c.risk] = (acc[c.risk] || 0) + 1; return acc; },
    { High: 0, Medium: 0, Low: 0 }
  );
}

/**
 * Filters a client array by optional text query, risk level, and status.
 * All parameters are optional — omitting them returns the full list.
 *
 * @param {Array}  clients
 * @param {object} filters
 * @param {string} [filters.query]  — searched against name and country (case-insensitive)
 * @param {string} [filters.risk]   — exact match: "High" | "Medium" | "Low"
 * @param {string} [filters.status] — exact match: "Approved" | "Review" | "Blocked"
 * @returns {Array} filtered subset
 */
export function filterClients(clients, { query = "", risk = "", status = "" } = {}) {
  const q = query.trim().toLowerCase();
  return clients.filter(c => {
    const matchText   = !q      || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
    const matchRisk   = !risk   || c.risk   === risk;
    const matchStatus = !status || c.status === status;
    return matchText && matchRisk && matchStatus;
  });
}
