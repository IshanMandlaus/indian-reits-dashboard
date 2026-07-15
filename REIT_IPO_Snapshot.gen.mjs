// Generates REIT_IPO_Snapshot.svg + .csv — a grouped bar chart of all 6 Indian REITs at IPO.
// Per REIT: bar 1 = market cap at IPO (issue price x total post-issue units), with % of units
// sold in the IPO and sponsor stake at IPO stacked above it; bar 2 = GAV (AUM) at IPO.
// All figures from the final offer documents / RHPs — page cites in REIT_IPO_Snapshot_sources/.
// Word-friendly output: white bg, black text, no horizontal gridlines, border around chart + notes.
import { writeFileSync } from "node:fs";

// price ₹/unit, units mn (post-issue), offer ₹cr (fresh+OFS), sponsor % (sponsor+group, post-issue), gav ₹cr
const REITS = [
  { name: "Embassy",    ipoNote: "IPO Apr 2019", price: 300, units_mn: 771.67,  offer_cr: 4750, sponsor_pct: 70.3, gav_cr: 31480 },
  { name: "Mindspace",  ipoNote: "IPO Aug 2020", price: 275, units_mn: 593.02,  offer_cr: 4500, sponsor_pct: 63.2, gav_cr: 23680 },
  { name: "Brookfield", ipoNote: "IPO Feb 2021", price: 275, units_mn: 302.80,  offer_cr: 3800, sponsor_pct: 54.4, gav_cr: 11410 },
  { name: "Nexus",      ipoNote: "IPO May 2023", price: 100, units_mn: 1515.0,  offer_cr: 3200, sponsor_pct: 43.1, gav_cr: 23499 },
  { name: "KRT",        ipoNote: "IPO Aug 2025", price: 100, units_mn: 4434.4,  offer_cr: 4800, sponsor_pct: 78.5, gav_cr: 62000 },
  { name: "Bagmane",    ipoNote: "IPO May 2026", price: 100, units_mn: 3400.0,  offer_cr: 3405, sponsor_pct: 82.8, gav_cr: 40260 },
];

// derive market cap (₹cr) and % of units sold in the IPO
for (const r of REITS) {
  r.mktcap_cr = Math.round((r.price * r.units_mn) / 10); // ₹cr = ₹/unit x mn units / 10
  r.pct_sold = (r.offer_cr / r.mktcap_cr) * 100;
}

// ---- layout ----
// Print sizing: Word shrinks the canvas to its 6.5in column (×~0.56) — text is
// ~1.5× the original draft so ticks/labels print at ≈9-10px.
const W = 1120, H = 800;
const PLOT_L = 96, PLOT_R = 1080, PLOT_T = 172, PLOT_B = 560;
const plotW = PLOT_R - PLOT_L;
const AXIS_MAX = 70000;
const TICKS = [0, 10000, 20000, 30000, 40000, 50000, 60000, 70000];
const Y = (v) => PLOT_B - (v / AXIS_MAX) * (PLOT_B - PLOT_T);

const groupW = plotW / REITS.length;
const BAR_W = 50, BAR_GAP = 12;               // two bars per group
const PAIR_W = BAR_W * 2 + BAR_GAP;
const C_MKT = "#2a78d6", C_GAV = "#eda100";   // series colors (blue = market cap, amber = GAV)
const ink = "#000000", surface = "#ffffff", axis = "#000000";
const F = `system-ui,-apple-system,'Segoe UI',sans-serif`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const inr = (v) => Math.round(v).toLocaleString("en-IN");
const pct = (v) => v.toFixed(1) + "%";

let out = [];
const add = (s) => out.push(s);

add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${F}">`);
add(`<rect width="${W}" height="${H}" fill="${surface}"/>`);
// border around the whole figure (chart + notes)
add(`<rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="none" stroke="${ink}" stroke-width="1.5"/>`);

// title + subtitle (wrapped for the print font size)
add(`<text x="${PLOT_L}" y="42" font-size="26" font-weight="700" fill="${ink}">Indian REITs at IPO — market capitalisation vs gross asset value</text>`);
add(`<text x="${PLOT_L}" y="70" font-size="17" fill="${ink}">From the final offer documents / RHPs · market cap = issue price × total post-issue units</text>`);
add(`<text x="${PLOT_L}" y="92" font-size="17" fill="${ink}">GAV = portfolio gross asset value at the offer-document valuation date</text>`);

// legend
const legend = [
  { c: C_MKT, t: "Market cap at IPO (₹ cr)" },
  { c: C_GAV, t: "GAV / AUM at IPO (₹ cr)" },
];
let lx = PLOT_L;
for (const it of legend) {
  add(`<rect x="${lx}" y="108" width="18" height="14" fill="${it.c}"/>`);
  add(`<text x="${lx + 26}" y="120" font-size="17" fill="${ink}">${esc(it.t)}</text>`);
  lx += 26 + 9.6 * it.t.length + 34;
}

// y axis: labels + left tick marks only (NO horizontal gridlines)
add(`<line x1="${PLOT_L}" y1="${PLOT_T}" x2="${PLOT_L}" y2="${PLOT_B}" stroke="${axis}" stroke-width="1.2"/>`);
add(`<text x="${PLOT_L}" y="${PLOT_T - 12}" font-size="16" fill="${ink}" font-weight="600">₹ crore</text>`);
for (const v of TICKS) {
  const y = Y(v);
  add(`<line x1="${PLOT_L - 5}" y1="${y}" x2="${PLOT_L}" y2="${y}" stroke="${axis}" stroke-width="1"/>`);
  add(`<text x="${PLOT_L - 9}" y="${y + 5}" font-size="15" fill="${ink}" text-anchor="end" font-variant-numeric="tabular-nums">${v.toLocaleString("en-IN")}</text>`);
}
// baseline (x axis)
add(`<line x1="${PLOT_L}" y1="${PLOT_B}" x2="${PLOT_R}" y2="${PLOT_B}" stroke="${axis}" stroke-width="1.2"/>`);

// bars per REIT
REITS.forEach((r, i) => {
  const cx = PLOT_L + (i + 0.5) * groupW;
  const xMkt = cx - PAIR_W / 2;
  const xGav = xMkt + BAR_W + BAR_GAP;

  // GAV bar
  const yGav = Y(r.gav_cr);
  add(`<rect x="${xGav.toFixed(1)}" y="${yGav.toFixed(1)}" width="${BAR_W}" height="${(PLOT_B - yGav).toFixed(1)}" fill="${C_GAV}"/>`);
  add(`<text x="${(xGav + BAR_W / 2).toFixed(1)}" y="${(yGav - 9).toFixed(1)}" font-size="15" fill="${ink}" text-anchor="middle" font-weight="600" font-variant-numeric="tabular-nums">${inr(r.gav_cr)}</text>`);

  // Market cap bar
  const yMkt = Y(r.mktcap_cr);
  const mcx = xMkt + BAR_W / 2;
  add(`<rect x="${xMkt.toFixed(1)}" y="${yMkt.toFixed(1)}" width="${BAR_W}" height="${(PLOT_B - yMkt).toFixed(1)}" fill="${C_MKT}"/>`);
  add(`<text x="${mcx.toFixed(1)}" y="${(yMkt - 9).toFixed(1)}" font-size="15" fill="${ink}" text-anchor="middle" font-weight="600" font-variant-numeric="tabular-nums">${inr(r.mktcap_cr)}</text>`);
  // Sold / Sponsor sit in a lane above BOTH bar-value labels, centred on the
  // group — at print size they collided with the GAV value when the two bars
  // were close in height (Bagmane)
  const laneY = Math.min(yMkt, yGav);
  add(`<text x="${cx.toFixed(1)}" y="${(laneY - 34).toFixed(1)}" font-size="14.5" fill="${ink}" text-anchor="middle">Sold <tspan font-weight="700">${pct(r.pct_sold)}</tspan></text>`);
  add(`<text x="${cx.toFixed(1)}" y="${(laneY - 54).toFixed(1)}" font-size="14.5" fill="${ink}" text-anchor="middle">Sponsor <tspan font-weight="700">${pct(r.sponsor_pct)}</tspan></text>`);

  // x labels
  add(`<text x="${cx.toFixed(1)}" y="${PLOT_B + 26}" font-size="18" fill="${ink}" text-anchor="middle" font-weight="700">${esc(r.name)}</text>`);
  add(`<text x="${cx.toFixed(1)}" y="${PLOT_B + 47}" font-size="14.5" fill="${ink}" text-anchor="middle">${esc(r.ipoNote)}</text>`);
});

// footnotes (re-wrapped for the 14px print size)
const notes = [
  "Each REIT shows two bars: market cap at IPO (issue price × total units outstanding immediately after the issue) and GAV / AUM at IPO.",
  "“Sold” = the IPO offer (fresh + OFS) as a % of post-issue units; “Sponsor” = units held by the Sponsor and Sponsor Group post-listing.",
  "Sources: final offer documents / RHPs (page-cited in REIT_IPO_Snapshot_sources/). Embassy, Brookfield, KRT were all-fresh issues (no OFS).",
  "GAV at IPO from the offer-document valuation (Embassy Dec 2018, Mindspace Mar 2020, Brookfield Sep 2020, Nexus Dec 2022, KRT Mar 2025, Bagmane Dec 2025).",
  "Mindspace sponsor % (63.2%) is derived from the RHP lock-in schedule (the RHP prints only a pre-Offer 85.31% combined figure). KRT sponsor %",
  "(78.5%) is the sponsor + sponsor-group holding on the post-issue base; the KRT RHP states 88.0% on its smaller pre-issue base. Bagmane listed May 2026.",
];
notes.forEach((n, i) => add(`<text x="${PLOT_L}" y="${PLOT_B + 76 + i * 20}" font-size="14" fill="${ink}">${esc(n)}</text>`));

add(`</svg>`);
writeFileSync(process.argv[2] ?? "REIT_IPO_Snapshot.svg", out.join("\n"));

// ---- CSV ----
const rows = [["reit", "ipo", "issue_price_inr", "total_units_mn", "market_cap_inr_cr", "fresh_plus_ofs_offer_inr_cr", "pct_units_sold", "sponsor_stake_pct_post_issue", "gav_inr_cr"]];
for (const r of REITS)
  rows.push([r.name, r.ipoNote.replace("IPO ", ""), r.price, r.units_mn, r.mktcap_cr, r.offer_cr, r.pct_sold.toFixed(2), r.sponsor_pct, r.gav_cr]);
writeFileSync(process.argv[3] ?? "REIT_IPO_Snapshot.csv", rows.map((r) => r.join(",")).join("\n"));
console.log("written", rows.length - 1, "REITs");
