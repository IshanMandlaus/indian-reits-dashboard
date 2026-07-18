// Generates REIT_AUM_MSF_History.svg + .csv from the extracted series.
// pts: [asof, gav ₹bn, msf_total_headline, msf_completed, msf_uc, msf_future, assets, label]
import { writeFileSync } from "node:fs";

const SERIES = {
  Embassy: {
    color: "#2a78d6",
    ipoNote: "IPO Apr 2019",
    pts: [
      ["Dec 2018", 314.8, 32.7, 24.8, 2.5, 5.4, 11, "IPO"],
      ["Jun 2019", 316.1, 32.7, 24.8, 1.4, null, 11, "Q1FY20"], ["Sep 2019", 321.1, 32.7, 24.8, 1.4, null, 11, "Q2FY20"],
      ["Dec 2019", 321.1, 33.3, 24.8, 2.6, null, 11, "Q3FY20"], ["Mar 2020", 331.7, 33.3, 26.2, 2.6, null, 11, "Q4FY20"],
      ["Jun 2020", 331.7, 33.3, 26.2, 2.7, null, 11, "Q1FY21"], ["Sep 2020", 337.0, 33.3, 26.2, 2.7, null, 11, "Q2FY21"],
      ["Dec 2020", 445.0, 42.4, 32.3, 5.7, null, 12, "Q3FY21"], ["Mar 2021", 466.0, 42.4, 32.3, 5.7, null, 12, "Q4FY21"],
      ["Jun 2021", 466.0, 42.4, 32.3, 5.7, null, 12, "Q1FY22"], ["Sep 2021", 475.0, 42.4, 32.3, 5.7, null, 12, "Q2FY22"],
      ["Dec 2021", 475.0, 42.6, 33.6, 4.6, null, 12, "Q3FY22"], ["Mar 2022", 494.0, 42.8, 33.8, 4.6, null, 12, "Q4FY22"],
      ["Jun 2022", 494.0, 42.8, 33.8, 4.6, null, 12, "Q1FY23"], ["Sep 2022", 508.4, 43.2, 33.4, 7.1, 2.7, 12, "Q2FY23"],
      ["Dec 2022", 508.4, 43.6, 34.3, 6.6, 2.8, 12, "Q3FY23"], ["Mar 2023", 507.9, 45.0, 34.3, 7.9, 2.8, 13, "Q4FY23"],
      ["Jun 2023", 507.9, 45.0, 34.3, 7.9, 2.8, 13, "Q1FY24"], ["Sep 2023", 527.0, 45.3, 35.3, 7.1, 2.8, 13, "Q2FY24"],
      ["Dec 2023", 527.0, 45.4, 35.8, 6.9, 2.8, 13, "Q3FY24"], ["Mar 2024", 555.0, 45.4, 36.5, 6.1, 2.8, 13, "Q4FY24"],
      ["Jun 2024", 555.0, 51.0, 37.7, 8.6, 4.8, 14, "Q1FY25"], ["Sep 2024", 591.0, 51.1, 38.4, 8.0, 4.8, 14, "Q2FY25"],
      ["Dec 2024", 591.0, 51.1, 38.9, 7.4, 4.8, 14, "Q3FY25"], ["Mar 2025", 612.0, 51.1, 40.3, 6.1, 4.8, 14, "Q4FY25"],
      ["Jun 2025", 612.0, 51.2, 40.4, 6.1, 4.8, 14, "Q1FY26"], ["Sep 2025", 639.8, 51.0, 40.9, 7.2, 2.8, 14, "Q2FY26"],
      ["Dec 2025", 639.8, 51.6, 41.1, 7.6, 2.8, 14, "Q3FY26"], ["Mar 2026", 705.4, 52.6, 43.6, null, null, 14, "Q4FY26"],
    ],
  },
  Mindspace: {
    color: "#1baf7a",
    ipoNote: "IPO Aug 2020",
    pts: [
      ["Mar 2020", 236.8, 29.5, 23.0, 2.8, 3.6, 10, "IPO"],
      ["Sep 2020", 240.1, 29.5, 23.9, 2.0, 3.6, 10, "Q2FY21"], ["Dec 2020", 240.1, 29.5, 23.9, 2.0, 3.6, 10, "Q3FY21"],
      ["Mar 2021", 246.2, 30.2, 23.9, 2.1, 4.3, 10, "Q4FY21"], ["Jun 2021", 246.2, 31.2, 23.8, 1.8, 5.6, 10, "Q1FY22"],
      ["Sep 2021", 257.0, 31.3, 23.9, 1.8, 5.6, 10, "Q2FY22"], ["Dec 2021", 257.0, 31.3, 24.2, 1.8, 5.3, 10, "Q3FY22"],
      ["Mar 2022", 264.0, 31.8, 24.2, 3.0, 4.6, 10, "Q4FY22"], ["Jun 2022", 264.0, 31.8, 24.4, 2.8, 4.6, 10, "Q1FY23"],
      ["Sep 2022", 272.8, 31.9, 24.9, 2.4, 4.6, 10, "Q2FY23"], ["Dec 2022", 273.0, 32.0, 25.6, 1.8, 4.6, 10, "Q3FY23"],
      ["Mar 2023", 280.3, 32.0, 25.8, 2.5, 3.7, 10, "Q4FY23"], ["Jun 2023", 280.0, 32.1, 25.9, 2.5, 3.7, 10, "Q1FY24"],
      ["Sep 2023", 286.7, 32.3, 26.1, 2.9, 3.3, 10, "Q2FY24"], ["Dec 2023", 287.0, 33.1, 26.2, 4.4, 2.5, 10, "Q3FY24"],
      ["Mar 2024", 298.7, 33.2, 26.3, 4.4, 2.5, 10, "Q4FY24"], ["Jun 2024", 298.7, 33.6, 26.3, 4.4, 2.8, 10, "Q1FY25"],
      ["Sep 2024", 313.5, 34.7, 26.4, 4.4, 3.9, 10, "Q2FY25"], ["Dec 2024", 313.5, 34.8, 26.8, null, null, 10, "Q3FY25"],
      ["Mar 2025", 366.5, 37.1, 30.0, null, null, 11, "Q4FY25"], ["Jun 2025", 372.1, 38.1, 30.2, null, null, 12, "Q1FY26"],
      ["Sep 2025", 410.2, 38.2, 31.0, null, null, 12, "Q2FY26"], ["Dec 2025", 441.3, 39.0, 31.2, null, null, 15, "Q3FY26"],
      ["Mar 2026", 476.0, 39.3, 32.0, null, null, 15, "Q4FY26"],
    ],
  },
  Brookfield: {
    color: "#eda100",
    ipoNote: "IPO Feb 2021",
    pts: [
      ["Sep 2020", 114.1, 14.0, 10.3, 0.1, 3.7, 4, "IPO"],
      ["Mar 2021", 115, 14.0, 10.3, null, 3.7, 4, "Q4FY21"], ["Jun 2021", 115, 14.0, 10.3, null, 3.7, 4, "Q1FY22"],
      ["Sep 2021", 117, 14.0, 10.3, null, 3.7, 4, "Q2FY22"], ["Dec 2021", 156, 18.6, 13.9, null, 4.7, 5, "Q3FY22"],
      ["Mar 2022", 160, 18.6, 14.1, null, 4.6, 5, "Q4FY22"], ["Jun 2022", 160, 18.6, 14.2, null, 4.4, 5, "Q1FY23"],
      ["Sep 2022", 164, 18.7, 14.3, null, 4.4, 5, "Q2FY23"], ["Dec 2022", 164, 18.7, 14.3, 0.6, 3.8, 5, "Q3FY23"],
      ["Mar 2023", 164, 18.7, 14.3, 0.6, 3.8, 5, "Q4FY23"], ["Jun 2023", null, 18.7, 14.3, null, null, 5, "Q1FY24"],
      ["Sep 2023", 285, 25.3, 20.7, 0.7, 3.9, 6, "Q2FY24"], ["Dec 2023", null, 25.4, 20.7, 0.7, 3.9, 6, "Q3FY24"],
      ["Mar 2024", 292, 25.5, 20.9, null, 4.6, null, "Q4FY24"], ["Jun 2024", 357, 28.8, 24.2, null, 4.6, null, "Q1FY25"],
      ["Sep 2024", 368, 28.9, 24.3, null, 4.6, null, "Q2FY25"], ["Dec 2024", 368, 28.9, 24.3, null, 4.6, null, "Q3FY25"],
      ["Mar 2025", 380, 29.0, 24.5, null, 4.5, null, "Q4FY25"], ["Jun 2025", 380, 29.0, 24.5, null, 4.5, 11, "Q1FY26"],
      ["Sep 2025", 396, 29.1, 24.6, null, 4.5, null, "Q2FY26"], ["Dec 2025", null, 37.0, 32.4, null, 4.6, null, "Q3FY26"],
      ["Mar 2026", 565, 37.1, 32.5, null, 4.6, null, "Q4FY26"],
    ],
  },
  Nexus: {
    color: "#008300",
    ipoNote: "IPO May 2023",
    pts: [
      ["Dec 2022", 234.99, 9.9, 9.9, 0, 0, 17, "IPO"],
      ["Jun 2023", 234.99, 9.9, 9.9, 0, 0, 17, "Q1FY24"], ["Sep 2023", 243.53, 9.9, 9.9, 0, 0, 17, "Q2FY24"],
      ["Dec 2023", 243.53, 9.9, 9.9, 0, 0, 17, "Q3FY24"], ["Mar 2024", 253.93, 9.9, 9.9, 0, 0, 17, "Q4FY24"],
      ["Jun 2024", 253.93, 9.9, 9.9, 0, 0, 17, "Q1FY25"], ["Sep 2024", 258.36, 9.9, 9.9, 0, 0, 17, "Q2FY25"],
      ["Dec 2024", 258.36, 9.9, 9.9, 0, 0, 17, "Q3FY25"], ["Mar 2025", 275.0, 10.4, 10.4, 0, 0, 18, "Q4FY25"],
      ["Jun 2025", null, 10.6, 10.6, 0, 0, 19, "Q1FY26"], ["Sep 2025", 292.53, 10.6, 10.6, 0, 0, 19, "Q2FY26"],
      ["Dec 2025", null, null, null, null, null, null, "Q3FY26"], ["Mar 2026", 305.58, 10.7, 10.7, 0, 0, 19, "Q4FY26"],
    ],
  },
  KRT: {
    color: "#4a3aa7",
    ipoNote: "IPO Aug 2025",
    pts: [
      ["Mar 2025", 620.0, 46.3, 37.1, 1.2, 8.0, 29, "IPO"],
      ["Sep 2025", 645.5, 46.3, 37.2, 1.1, 8.0, 29, "Q2FY26"], ["Dec 2025", 645.5, 46.4, 37.2, null, null, 29, "Q3FY26"],
      ["Mar 2026", 674.1, 46.5, 37.2, 1.2, 8.0, 29, "Q4FY26"],
    ],
  },
  Bagmane: {
    color: "#e34948",
    ipoNote: "IPO May 2026",
    pts: [["Dec 2025", 402.6, 19.6, 16.6, 1.0, 2.0, 6, "IPO"]],
  },
};

const MONTH = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const t = (asof) => { const [m, y] = asof.split(" "); return +y + MONTH[m] / 12; };

// ---- layout ----
// Print sizing: Word shrinks the canvas to its 6.5in column (×~0.5), so text is
// sized ~1.5× the original draft (ticks 16px ≈ 8px printed) with the collision
// metrics scaled to match.
const W = 1240, H = 1290;
const PLOT_L = 72, PLOT_R = 1030;
const T0 = t("Dec 2018") - 0.12, T1 = t("Mar 2026") + 0.12;
const X = (asof) => PLOT_L + ((t(asof) - T0) / (T1 - T0)) * (PLOT_R - PLOT_L);

// derive msf = completed + UC (carry last disclosed UC where a deck prints only a combined dev bucket)
for (const s of Object.values(SERIES)) {
  let carriedUc = 0;
  for (const q of s.pts) {
    if (q[4] != null) carriedUc = q[4];
    q[8] = q[3] != null ? +(q[3] + carriedUc).toFixed(1) : null; // msf completed+UC
    q[9] = q[3] != null && q[4] == null; // carried flag
    q[10] = q[1] != null ? Math.round(q[1] * 100) : null; // GAV in ₹ cr
  }
}

const panels = {
  gav: { top: 168, bot: 464, max: 75000, ticks: [0, 15000, 30000, 45000, 60000, 75000], title: "AUM — gross asset value (₹ cr)", idx: 10, fmt: (v) => Math.round(v).toLocaleString("en-IN"), minStep: 0.05 },
  msf: { top: 544, bot: 792, max: 55, ticks: [0, 10, 20, 30, 40, 50], title: "Total portfolio area — completed + UC + future development combined (msf)", idx: 2, fmt: (v) => v.toFixed(1), minStep: 1.0 },
  tot: { top: 872, bot: 1120, max: 55, ticks: [0, 10, 20, 30, 40, 50], title: "Portfolio area — completed / operational only (msf)", idx: 3, fmt: (v) => v.toFixed(1), minStep: 1.0 },
};
const Y = (p, v) => p.bot - (v / p.max) * (p.bot - p.top);

const ink = "#0b0b0b", ink2 = "#000000", muted = "#000000", grid = "#e1e0d9", axis = "#c3c2b7", surface = "#ffffff";
const F = `system-ui,-apple-system,'Segoe UI',sans-serif`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
let out = [];
const add = (s) => out.push(s);

add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${F}">`);
add(`<rect width="${W}" height="${H}" fill="${surface}"/>`);
add(`<rect x="6.5" y="6.5" width="${W - 13}" height="${H - 13}" fill="none" stroke="${ink}" stroke-width="1"/>`);

// title + legend (legend wraps to two rows at print font size)
add(`<text x="${PLOT_L}" y="38" font-size="25" font-weight="600" fill="${ink}">Indian REITs — AUM (GAV) and portfolio area, IPO to latest disclosure</text>`);
add(`<text x="${PLOT_L}" y="64" font-size="17" fill="${ink2}">From final offer documents and quarterly filings · valuations are semi-annual (Mar / Sep) · latest: Mar 2026 (Q4 FY26)</text>`);
let lx = PLOT_L, lrow = 0;
for (const [name, s] of Object.entries(SERIES)) {
  const entryW = 28 + 9.2 * (name.length + s.ipoNote.length + 3) + 30;
  if (lx + entryW > W - 40) { lx = PLOT_L; lrow++; }
  const ly = 92 + lrow * 27;
  add(`<line x1="${lx}" y1="${ly - 5}" x2="${lx + 20}" y2="${ly - 5}" stroke="${s.color}" stroke-width="4" stroke-linecap="round"/>`);
  add(`<text x="${lx + 28}" y="${ly}" font-size="17" fill="${ink2}">${name} <tspan fill="${muted}" font-size="15">(${s.ipoNote})</tspan></text>`);
  lx += entryW;
}

// x ticks: Mar of each year
const xticks = [];
for (let y = 2019; y <= 2026; y++) xticks.push(`Mar ${y}`);

for (const key of ["gav", "msf", "tot"]) {
  const p = panels[key];
  add(`<text x="${PLOT_L}" y="${p.top - 16}" font-size="19" font-weight="600" fill="${ink}">${p.title}</text>`);
  for (const v of p.ticks) {
    const y = Y(p, v);
    if (v === 0) add(`<line x1="${PLOT_L}" y1="${y}" x2="${PLOT_R}" y2="${y}" stroke="${axis}" stroke-width="1"/>`);
    add(`<text x="${PLOT_L - 8}" y="${y + 5}" font-size="16" fill="${muted}" text-anchor="end" font-variant-numeric="tabular-nums">${v.toLocaleString()}</text>`);
  }
  for (const xt of xticks) {
    const x = X(xt);
    add(`<line x1="${x}" y1="${p.bot}" x2="${x}" y2="${p.bot + 4}" stroke="${axis}" stroke-width="1"/>`);
    const [m, yy] = xt.split(" ");
    add(`<text x="${x}" y="${p.bot + 22}" font-size="16" fill="${muted}" text-anchor="middle">${m} ’${yy.slice(2)}</text>`);
  }

  const endLabels = [];
  const seriesPts = [];
  let si = 0;
  for (const [name, s] of Object.entries(SERIES)) {
    const pts = s.pts.filter((q) => q[p.idx] != null).map((q) => [X(q[0]), Y(p, q[p.idx]), q[p.idx]]);
    if (!pts.length) continue;
    seriesPts.push({ name, color: s.color, pts, above: si % 2 === 0 });
    if (pts.length > 1) {
      const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
      add(`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`);
    }
    for (const [x, y] of pts)
      add(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.3" fill="${s.color}" stroke="${surface}" stroke-width="1.4"/>`);
    const [x0, y0] = pts[0];
    add(`<rect x="-4.4" y="-4.4" width="8.8" height="8.8" transform="translate(${x0.toFixed(1)},${y0.toFixed(1)}) rotate(45)" fill="${s.color}" stroke="${surface}" stroke-width="2"/>`);
    const [xe, ye, ve] = pts[pts.length - 1];
    if (pts.length > 1) add(`<circle cx="${xe.toFixed(1)}" cy="${ye.toFixed(1)}" r="4" fill="${s.color}" stroke="${surface}" stroke-width="2"/>`);
    endLabels.push({ name, x: xe, y: ye, origY: ye, text: `${name} ${p.fmt(ve)}`, lone: pts.length === 1 });
    si++;
  }

  // end labels first — their boxes join the collision set
  const placed = []; // {x: center, y: center, w}
  endLabels.sort((a, b) => a.y - b.y);
  for (let i = 1; i < endLabels.length; i++)
    if (endLabels[i].y - endLabels[i - 1].y < 22) endLabels[i].y = endLabels[i - 1].y + 22;
  for (const l of endLabels) {
    const w = 9.6 * l.text.length;
    if (l.lone) {
      add(`<text x="${l.x}" y="${l.y + 30}" font-size="16" font-weight="600" fill="${ink2}" text-anchor="middle">${esc(l.text)}</text>`);
      placed.push({ x: l.x, y: l.y + 26, w });
      placed.push({ x: l.x, y: l.origY, w: 16 }); // the lone diamond itself
    } else {
      if (l.y !== l.origY)
        add(`<line x1="${l.x + 5}" y1="${l.origY}" x2="${l.x + 10}" y2="${l.y}" stroke="${grid}" stroke-width="1"/>`);
      add(`<text x="${l.x + 12}" y="${l.y + 5}" font-size="16" fill="${ink2}"><tspan font-weight="600">${esc(l.text.split(" ")[0])}</tspan> ${esc(l.text.split(" ").slice(1).join(" "))}</text>`);
      placed.push({ x: l.x + 12 + w / 2, y: l.y, w });
    }
  }

  // value labels only at IPO and material jumps (collision-avoided: try near/far, above/below; else drop)
  const collides = (x, y, w) => placed.some((b) => Math.abs(b.x - x) < (b.w + w) / 2 + 4 && Math.abs(b.y - y) < 16);
  for (const sp of seriesPts) {
    if (sp.pts.length < 2) continue;
    for (let i = 0; i < sp.pts.length - 1; i++) {
      const jump = i > 0 && (key === "gav"
        ? sp.pts[i][2] - sp.pts[i - 1][2] >= 0.05 * sp.pts[i - 1][2]
        : Math.abs(sp.pts[i][2] - sp.pts[i - 1][2]) >= 1.0);
      if (!(i === 0 || jump)) continue;
      const text = p.fmt(sp.pts[i][2]);
      const w = 8.2 * text.length;
      const cands = sp.above ? [-16, 19, -31, 34] : [19, -16, 34, -31];
      let dy = null;
      for (const c of cands) if (!collides(sp.pts[i][0], sp.pts[i][1] + c, w)) { dy = c; break; }
      if (dy == null) continue;
      const ly = sp.pts[i][1] + dy;
      add(`<text x="${sp.pts[i][0].toFixed(1)}" y="${(ly + 4).toFixed(1)}" font-size="13" fill="${ink2}" text-anchor="middle" font-variant-numeric="tabular-nums">${text}</text>`);
      placed.push({ x: sp.pts[i][0], y: ly, w });
    }
  }
}

// footnotes (re-wrapped for the 15px print size)
const notes = [
  "◆ = IPO baseline (offer-document valuation date; Bagmane listed May 2026 — first post-listing portfolio disclosure not yet published).",
  "Middle panel = headline total portfolio incl. future development (Brookfield stopped printing a total from FY25 — total there = operating +",
  "dev potential). Bottom panel = completed / operational area only (UC and future development excluded). Nexus is 100%-completed retail.",
  "Values label IPO and material jumps only; full quarterly split in the CSV. GAV in Jun / Dec quarters carries the preceding Mar / Sep valuation.",
  "Gaps where a deck printed no aggregate GAV (Brookfield Q1/Q3 FY24, Q3 FY26; Nexus Q1/Q3 FY26) are bridged.",
];
notes.forEach((n, i) => add(`<text x="${PLOT_L}" y="${H - 128 + i * 21}" font-size="15" fill="${muted}">${esc(n)}</text>`));
add(`</svg>`);

writeFileSync(process.argv[2] ?? "REIT_AUM_MSF_History.svg", out.join("\n"));

// ---- CSV ----
const rows = [["reit", "point", "as_of", "gav_inr_cr", "msf_completed", "msf_under_construction", "msf_completed_plus_uc", "uc_is_carried", "msf_future_dev", "msf_total_headline", "assets"]];
for (const [name, s] of Object.entries(SERIES))
  for (const [asof, , total, comp, uc, fut, assets, label, compUc, carried, gavCr] of s.pts)
    rows.push([name, label, asof, gavCr ?? "", comp ?? "", uc ?? "", compUc ?? "", compUc != null && carried ? 1 : "", fut ?? "", total ?? "", assets ?? ""]);
writeFileSync(process.argv[3] ?? "REIT_AUM_MSF_History.csv", rows.map((r) => r.join(",")).join("\n"));
console.log("written", rows.length - 1, "rows");
