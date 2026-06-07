/**
 * tests/risk.test.js — Unit tests for KYC business logic
 *
 * Runner: Node.js built-in test runner (node:test), available since Node 18.
 * No npm install required — run with:
 *
 *   node --test
 *           or
 *   npm test
 *
 * WHAT IS TESTED:
 *   1. barColor()         — risk score → colour mapping
 *   2. riskBadgeClass()   — risk label → CSS class
 *   3. statusBadgeClass() — workflow status → CSS class
 *   4. deriveRiskLevel()  — score + sanctions flag → risk tier
 *   5. deriveStatus()     — client record → mandatory workflow status
 *   6. calcRouting()      — threshold pair → routing outcome counts
 *   7. countByRisk()      — client array → risk-tier counts
 *   8. filterClients()    — search/filter logic
 *
 * WHY THESE FUNCTIONS:
 *   These are the functions most likely to have a compliance impact if
 *   they break. A bug in barColor() is cosmetic; a bug in deriveRiskLevel()
 *   or deriveStatus() could mean a sanctioned individual passes through.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  barColor,
  riskBadgeClass,
  statusBadgeClass,
  deriveRiskLevel,
  deriveStatus,
  calcRouting,
  countByRisk,
  filterClients,
} from "../lib/risk.js";

/* ============================================================
   1. barColor — risk score colour thresholds
   ============================================================ */
describe("barColor()", () => {
  it("returns red for score 75 (exact boundary — high risk)", () => {
    assert.equal(barColor(75), "#E24B4A");
  });

  it("returns red for score 100 (maximum)", () => {
    assert.equal(barColor(100), "#E24B4A");
  });

  it("returns red for score 88 (typical high-risk client)", () => {
    assert.equal(barColor(88), "#E24B4A");
  });

  it("returns amber for score 74 (just below high boundary)", () => {
    assert.equal(barColor(74), "#EF9F27");
  });

  it("returns amber for score 50 (exact medium boundary)", () => {
    assert.equal(barColor(50), "#EF9F27");
  });

  it("returns amber for score 64 (typical medium-risk client)", () => {
    assert.equal(barColor(64), "#EF9F27");
  });

  it("returns green for score 49 (just below medium boundary)", () => {
    assert.equal(barColor(49), "#639922");
  });

  it("returns green for score 0 (minimum)", () => {
    assert.equal(barColor(0), "#639922");
  });

  it("returns green for score 22 (typical low-risk client)", () => {
    assert.equal(barColor(22), "#639922");
  });
});

/* ============================================================
   2. riskBadgeClass — risk label → CSS class
   ============================================================ */
describe("riskBadgeClass()", () => {
  it("maps High to badge-red", () => {
    assert.equal(riskBadgeClass("High"), "badge-red");
  });

  it("maps Medium to badge-amber", () => {
    assert.equal(riskBadgeClass("Medium"), "badge-amber");
  });

  it("maps Low to badge-green", () => {
    assert.equal(riskBadgeClass("Low"), "badge-green");
  });

  it("maps unknown value to badge-green (safe fallback)", () => {
    assert.equal(riskBadgeClass("Unknown"), "badge-green");
  });
});

/* ============================================================
   3. statusBadgeClass — workflow status → CSS class
   ============================================================ */
describe("statusBadgeClass()", () => {
  it("maps Blocked to badge-red", () => {
    assert.equal(statusBadgeClass("Blocked"), "badge-red");
  });

  it("maps Review to badge-amber", () => {
    assert.equal(statusBadgeClass("Review"), "badge-amber");
  });

  it("maps Approved to badge-green", () => {
    assert.equal(statusBadgeClass("Approved"), "badge-green");
  });
});

/* ============================================================
   4. deriveRiskLevel — score + sanctions → risk tier
   ============================================================ */
describe("deriveRiskLevel()", () => {
  // Boundary tests — these are the most safety-critical
  it("returns High for score 75 (lower high-risk boundary)", () => {
    assert.equal(deriveRiskLevel(75), "High");
  });

  it("returns Medium for score 74 (upper medium boundary)", () => {
    assert.equal(deriveRiskLevel(74), "Medium");
  });

  it("returns Medium for score 50 (lower medium boundary)", () => {
    assert.equal(deriveRiskLevel(50), "Medium");
  });

  it("returns Low for score 49 (upper low boundary)", () => {
    assert.equal(deriveRiskLevel(49), "Low");
  });

  it("returns Low for score 0", () => {
    assert.equal(deriveRiskLevel(0), "Low");
  });

  // COMPLIANCE-CRITICAL: sanctions hit must override the numeric score.
  // A score of 64 would normally be "Medium", but a sanctions hit
  // mandates "High" risk — this is the bug that was in the original data.js.
  it("returns High for score 64 WITH sanctions hit (override)", () => {
    assert.equal(deriveRiskLevel(64, true), "High");
  });

  it("returns High for score 0 WITH sanctions hit (extreme override)", () => {
    assert.equal(deriveRiskLevel(0, true), "High");
  });

  it("returns High for score 93 WITHOUT sanctions hit (score alone sufficient)", () => {
    assert.equal(deriveRiskLevel(93, false), "High");
  });
});

/* ============================================================
   5. deriveStatus — client object → mandatory workflow status
   ============================================================ */
describe("deriveStatus()", () => {
  it("returns Blocked when sanctions hit is present, regardless of risk", () => {
    assert.equal(
      deriveStatus({ score: 64, sanctions: true, risk: "High" }),
      "Blocked"
    );
  });

  it("returns Blocked even if risk was incorrectly set to Medium (sanctions override)", () => {
    // This is exactly the bug from the original data — KYC-0519 Viktor Zelenko
    // had sanctions:true but risk:"Medium". Status should still be Blocked.
    assert.equal(
      deriveStatus({ score: 64, sanctions: true, risk: "Medium" }),
      "Blocked"
    );
  });

  it("returns Review for High risk without sanctions", () => {
    assert.equal(
      deriveStatus({ score: 88, sanctions: false, risk: "High" }),
      "Review"
    );
  });

  it("returns Review for Medium risk without sanctions", () => {
    assert.equal(
      deriveStatus({ score: 55, sanctions: false, risk: "Medium" }),
      "Review"
    );
  });

  it("returns Approved for Low risk without sanctions", () => {
    assert.equal(
      deriveStatus({ score: 22, sanctions: false, risk: "Low" }),
      "Approved"
    );
  });

  it("returns Approved for score 49 (top of Low range)", () => {
    assert.equal(
      deriveStatus({ score: 49, sanctions: false, risk: "Low" }),
      "Approved"
    );
  });
});

/* ============================================================
   6. calcRouting — threshold pair → routing outcome counts
   ============================================================ */
describe("calcRouting()", () => {
  it("returns three keys: autoApprove, manualReview, autoReject", () => {
    const result = calcRouting(90, 60);
    assert.ok("autoApprove"  in result);
    assert.ok("manualReview" in result);
    assert.ok("autoReject"   in result);
  });

  it("all three counts sum to the total (default 4821)", () => {
    const { autoApprove, manualReview, autoReject } = calcRouting(90, 60);
    assert.equal(autoApprove + manualReview + autoReject, 4821);
  });

  it("all three counts sum to the total with a custom total", () => {
    const total = 1000;
    const { autoApprove, manualReview, autoReject } = calcRouting(85, 50, total);
    assert.equal(autoApprove + manualReview + autoReject, total);
  });

  it("raising the approve threshold decreases autoApprove count", () => {
    const low  = calcRouting(80, 60).autoApprove;
    const high = calcRouting(95, 60).autoApprove;
    assert.ok(high < low, `Expected ${high} < ${low}`);
  });

  it("lowering the reject threshold decreases autoReject count", () => {
    const high = calcRouting(90, 70).autoReject;
    const low  = calcRouting(90, 30).autoReject;
    assert.ok(low < high, `Expected ${low} < ${high}`);
  });

  it("returns only non-negative counts", () => {
    const { autoApprove, manualReview, autoReject } = calcRouting(90, 60);
    assert.ok(autoApprove  >= 0);
    assert.ok(manualReview >= 0);
    assert.ok(autoReject   >= 0);
  });
});

/* ============================================================
   7. countByRisk — client array → risk-tier tally
   ============================================================ */
describe("countByRisk()", () => {
  const sample = [
    { risk: "High" },
    { risk: "High" },
    { risk: "Medium" },
    { risk: "Low" },
    { risk: "Low" },
    { risk: "Low" },
  ];

  it("counts High correctly", () => {
    assert.equal(countByRisk(sample).High, 2);
  });

  it("counts Medium correctly", () => {
    assert.equal(countByRisk(sample).Medium, 1);
  });

  it("counts Low correctly", () => {
    assert.equal(countByRisk(sample).Low, 3);
  });

  it("returns zeros for an empty array", () => {
    const result = countByRisk([]);
    assert.equal(result.High,   0);
    assert.equal(result.Medium, 0);
    assert.equal(result.Low,    0);
  });

  it("total count equals input array length", () => {
    const { High, Medium, Low } = countByRisk(sample);
    assert.equal(High + Medium + Low, sample.length);
  });
});

/* ============================================================
   8. filterClients — search and filter logic
   ============================================================ */
describe("filterClients()", () => {
  const clients = [
    { id: "KYC-0041", name: "Andrei Volkov",   country: "RU", risk: "High",   status: "Review"   },
    { id: "KYC-0102", name: "Sara Mehta",       country: "IN", risk: "Low",    status: "Approved" },
    { id: "KYC-0338", name: "Amara Keita",      country: "ML", risk: "Medium", status: "Review"   },
    { id: "KYC-0519", name: "Viktor Zelenko",   country: "UA", risk: "High",   status: "Blocked"  },
    { id: "KYC-0933", name: "Dmitri Petrov",    country: "BY", risk: "High",   status: "Blocked"  },
  ];

  it("returns all clients when no filters are applied", () => {
    assert.equal(filterClients(clients).length, 5);
  });

  it("filters by name (case-insensitive)", () => {
    const result = filterClients(clients, { query: "volkov" });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "KYC-0041");
  });

  it("filters by country code (case-insensitive)", () => {
    const result = filterClients(clients, { query: "by" });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "KYC-0933");
  });

  it("filters by risk level", () => {
    const result = filterClients(clients, { risk: "High" });
    assert.equal(result.length, 3);
    result.forEach(c => assert.equal(c.risk, "High"));
  });

  it("filters by status", () => {
    const result = filterClients(clients, { status: "Blocked" });
    assert.equal(result.length, 2);
    result.forEach(c => assert.equal(c.status, "Blocked"));
  });

  it("combines text query and risk filter (AND logic)", () => {
    // "a" matches many names, but High risk narrows it to Andrei Volkov
    const result = filterClients(clients, { query: "andrei", risk: "High" });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "KYC-0041");
  });

  it("combines risk and status filters", () => {
    const result = filterClients(clients, { risk: "High", status: "Blocked" });
    assert.equal(result.length, 2);
  });

  it("returns empty array when no clients match", () => {
    const result = filterClients(clients, { query: "nonexistent_xyz" });
    assert.equal(result.length, 0);
  });

  it("trims whitespace from the query", () => {
    const result = filterClients(clients, { query: "  sara  " });
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "Sara Mehta");
  });
});
