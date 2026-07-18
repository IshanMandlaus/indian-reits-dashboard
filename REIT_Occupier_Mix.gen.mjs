// Generates REIT_Occupier_Mix_<REIT>.svg (5 files) + REIT_Occupier_Mix.csv + REIT_Top_Tenants.csv —
// occupier / rental mix by sector (share of gross rentals) for each of the 5 REITs, with a
// key-stats band and a top-tenants table where the REIT discloses one.
// Sources: FY2025-26 annual-report occupier pages (~/Downloads occupier PDFs), plus
//   KRT/KRT-AnnualReport-FY2025-26.pdf pp.8-9 (portfolio sector mix + top-10 tenants),
//   Nexus/earnings_presentation_q4_fy26_v1.pdf p.50 (misfiled Embassy Q4 FY26 deck: top-5 occupiers),
//   Brookfield/BIRET_Q4_FY_2026_Investor_Presentation p.16 (10-sector split + top-10 tenants).
// Word-friendly print style: white bg, black text, no gridlines, border around figure.
import { writeFileSync } from "node:fs";

const CHARTS = [
  {
    key: "Embassy",
    color: "#2563eb", // blue-600
    title: "Embassy REIT — occupier mix by industry (FY26)",
    subtitle: "% of Gross Rental Obligations as of March 31, 2026",
    stats: [
      ["275+", "marquee occupiers"],
      [">70%", "GCC & tech share of occupier base"],
      ["25.1%", "of rentals from top 5 occupiers"],
      ["8%", "IT services share (25% at listing)"],
      ["6 of 20", "largest global cos. are occupiers"],
    ],
    rows: [
      ["Technology", 29],
      ["Financial Services", 26],
      ["Research, Consulting & Analytics", 10],
      ["Retail", 7],
      ["Co-working", 7],
      ["Healthcare", 6],
      ["Telecom", 3],
      ["Others", 12],
    ],
    tenantsTitle: "Top 5 occupiers (% of gross rentals)",
    tenants: [
      ["JP Morgan", "Financial Services", "6.2%"],
      ["IBM India", "Technology", "5.9%"],
      ["ANSR", "Consulting", "4.9%"],
      ["Major Australian Bank", "Financial Services", "4.5%"],
      ["Fortune 500 Retail Major", "Retail", "3.6%"],
    ],
    notes: [
      "Occupiers #6-10 (annual report, % not disclosed on the page): WeWork India, a large US bank, NTT Data, a global healthcare co., Cognizant.",
      "“Largest global cos.” = top 20 by market capitalisation as of Mar 31, 2026. Actual legal entity names of occupiers may differ.",
      "Sources: Embassy REIT Annual Report FY2025-26 occupier page (industry mix, basis: gross rental obligations) and Q4 FY2026 Earnings Materials p.50 (top-5 occupiers, key stats).",
    ],
  },
  {
    key: "Mindspace",
    color: "#0d9488", // teal-600
    title: "Mindspace REIT — tenant mix by sector (FY26)",
    subtitle: "% of Gross Contracted Rentals as of March 31, 2026",
    stats: [
      ["72%", "of rentals from foreign MNCs"],
      ["51.7%", "of rentals from GCCs"],
      ["40%", "from Fortune 500 companies"],
      ["13 yrs", "avg. tenure of top 10 tenants"],
      ["34", "occupiers in multiple parks"],
    ],
    rows: [
      ["Technology (Health Tech, Dev. & Processes)", 37.4],
      ["Financial Services", 16.8],
      ["Engineering & Manufacturing", 10.1],
      ["Telecom & Media", 9.7],
      ["Flexible workspace", 8.6],
      ["Manufacturing & Processes", 6.9],
      ["Professional services", 5.3],
      ["Healthcare & Pharma", 2.2],
      ["E-commerce", 1.0],
      ["Others", 2.0],
    ],
    notes: [
      "Mindspace does not name individual tenants or their rental shares in the annual-report tenant-portfolio page.",
      "Fortune 500 share per the Fortune Global 500 list of 2025. Foreign-MNC share is % of gross contracted rentals as of March 31, 2026.",
      "Source: Mindspace REIT Annual Report FY2025-26, “Who Anchor Our Growth” tenant portfolio page (Diversified Tenant Mix, % of GCR; Tenant Profile Snapshot).",
    ],
  },
  {
    key: "Brookfield",
    color: "#4f46e5", // indigo-600
    title: "Brookfield India REIT — tenant mix by sector (FY26)",
    subtitle: "% of gross contracted rentals as of March 31, 2026",
    stats: [
      ["76%", "multinational tenants"],
      ["32%", "Fortune 500 companies"],
      ["71%", "existing occupiers"],
      ["30%", "of rentals from top 10 tenants"],
      ["313", "office tenants (58 added FY26)"],
    ],
    rows: [
      ["BFSI", 22],
      ["Technology Services", 20],
      ["Consulting", 13],
      ["Technology Products", 8],
      ["Retail and F&B", 5],
      ["Telecom", 5],
      ["Industrials and Logistics", 4],
      ["Healthcare", 4],
      ["Real Estate and Infrastructure", 2],
      ["Others", 17],
    ],
    tenantsTitle: "Top 10 tenants (% of gross contracted rentals)",
    tenants: [
      ["Tata Consultancy Services", "Technology Services", "5%"],
      ["Accenture", "Consulting", "5%"],
      ["Bharti Airtel", "Telecom", "3%"],
      ["A Global Financial Institution", "BFSI", "3%"],
      ["Capgemini", "Technology Services", "3%"],
      ["A Global Consulting Firm", "Consulting", "3%"],
      ["Cognizant", "Technology Services", "2%"],
      ["Morgan Stanley", "BFSI", "2%"],
      ["CoWrks", "Co-working", "2%"],
      ["Global Financial Services Firm", "BFSI", "2%"],
    ],
    notes: [
      "As of March 31, 2026, without the impact of the 360One-Ecoworld transaction completed in Q1 FY2027. “A Global Financial Institution” includes managed office solution through CoWrks.",
      "FY26 leasing: 4.05 mn sf gross at avg. ₹108/sf and 9.8-yr avg. term; 2.95 mn sf new leasing at ₹101/sf; 18% avg. re-leasing spread.",
      "Sources: BIRET Q4 FY2026 Investor Presentation p.16 (sector split, top-10 tenants) and Annual Report FY2025-26 occupier page (tenant-quality stats, leasing).",
    ],
  },
  {
    key: "KRT",
    color: "#059669", // emerald-600
    title: "Knowledge Realty Trust — sectoral tenant mix (FY26)",
    subtitle: "Portfolio share, % by Gross Rents as of March 31, 2026",
    stats: [
      ["74%", "of gross rents from MNCs"],
      ["45%", "of gross rents from GCCs"],
      ["38%", "Fortune 500 companies"],
      ["475+", "tenants across 20+ sectors"],
      ["28%", "of gross rents from top 10"],
    ],
    rows: [
      ["Technology", 35],
      ["Banking, Financial Services and Insurance", 24],
      ["Engineering and Manufacturing", 7],
      ["Pharma and Healthcare", 7],
      ["Research, Consulting and Analytics", 6],
      ["Co-working", 4],
      ["Infrastructure, Real Estate and Logistics", 4],
      ["Media", 3],
      ["FMCG and Retail", 3],
      ["Telecom", 2],
      ["Others", 5],
    ],
    tenantsTitle: "Top 10 tenants (% by gross rents)",
    tenants: [
      ["Cisco", "", "5%"],
      ["Google", "", "5%"],
      ["J.P. Morgan Services", "", "4%"],
      ["ServiceNow", "", "2%"],
      ["JioStar", "", "2%"],
      ["Indian Digital Payments Giant", "", "2%"],
      ["Amazon", "", "2%"],
      ["Novartis", "", "2%"],
      ["The Cigna Group", "", "2%"],
      ["Big 4 Accounting Firm", "", "2%"],
    ],
    notes: [
      "FY26 leasing (occupier report p.18): 3.5 mn sf gross (2.3 new + 1.2 renewals) at 26% avg. spread and 5% premium to market rent on new leasing; leasing mix MNCs 66% / Domestic 34%.",
      "Tenant sectors are not stated alongside the top-10 chart; some tenant names are anonymised by KRT.",
      "Source: KRT Annual Report FY2025-26, “Our Occupiers” pp.8-9 (Sectoral Tenant Mix, Tenant Share and Top 10 Tenants, all % by gross rents).",
    ],
  },
  {
    key: "Nexus",
    color: "#9333ea", // purple-600
    title: "Nexus Select Trust — rental mix by trade category (FY26)",
    subtitle: "Trade category share of gross rentals (%)",
    stats: [
      ["45%", "of gross rentals expire FY27-30"],
      ["~1.2 mn sf", "avg. annual lease expiry FY27-30"],
      ["~20%", "avg. mark-to-market potential"],
    ],
    rows: [
      ["Apparel & Accessories", 42],
      ["Food & Beverages (F&B)", 12],
      ["Footwear & Fitness", 9],
      ["FEC and Multiplex", 9],
      ["Departmental Store", 7],
      ["Beauty & Personal Care", 7],
      ["Electronics", 4],
      ["Hypermarket", 3],
      ["Jewellery", 2],
      ["Homeware", 2],
      ["Others", 3],
    ],
    notes: [
      "Nexus is a retail portfolio, so its mix is by trade category (not office occupier sectors) and it does not name tenants or their rental shares on this page.",
      "Lease expiry (% of gross rentals): FY27 11%, FY28 14%, FY29 11%, FY30 9% — with ≈ 20% embedded mark-to-market upside on expiring space.",
      "Source: Nexus Select Trust Annual Report 2025-26, p.218 (Rental Contribution by Trade Category; Lease Expiry Profile). “Others” includes kids, luggage, homeware and temporary kiosks.",
    ],
  },
];

const ink = "#000000", surface = "#ffffff";
const F = `system-ui,-apple-system,'Segoe UI',sans-serif`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)) + "%";

// wrap text into lines of <= n chars on word boundaries
function wrap(text, n) {
  const words = text.split(" "), lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > n) { lines.push(cur.trim()); cur = w; }
    else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

const W = 1120, ML = 48; // canvas width, left margin

for (const ch of CHARTS) {
  // sort descending, "Others" pinned last
  const rows = [...ch.rows].sort((a, b) =>
    (a[0] === "Others") - (b[0] === "Others") || b[1] - a[1]);

  const out = [];
  const add = (s) => out.push(s);
  let y = 0; // vertical cursor; svg element emitted last (height known only at the end)

  // title + subtitle
  add(`<text x="${ML}" y="46" font-size="26" font-weight="700" fill="${ink}">${esc(ch.title)}</text>`);
  add(`<text x="${ML}" y="76" font-size="17" fill="${ink}">${esc(ch.subtitle)}</text>`);
  y = 100;

  // ---- key-stats band: value + caption per column, rules above and below ----
  const nStats = ch.stats.length;
  const statW = (W - 2 * ML) / nStats;
  add(`<line x1="${ML}" y1="${y}" x2="${W - ML}" y2="${y}" stroke="${ink}" stroke-width="1"/>`);
  let statBottom = y;
  ch.stats.forEach(([v, label], i) => {
    const x = ML + i * statW;
    add(`<text x="${x}" y="${y + 36}" font-size="26" font-weight="700" fill="${ink}">${esc(v)}</text>`);
    wrap(label, 24).forEach((ln, j) => {
      add(`<text x="${x}" y="${y + 58 + j * 17}" font-size="13.5" fill="${ink}">${esc(ln)}</text>`);
      statBottom = Math.max(statBottom, y + 58 + j * 17);
    });
  });
  y = statBottom + 14;
  add(`<line x1="${ML}" y1="${y}" x2="${W - ML}" y2="${y}" stroke="${ink}" stroke-width="1"/>`);
  y += 28;

  // ---- sector-mix bars ----
  const ROW_H = 40, BAR_H = 24, PLOT_L = 400, PLOT_R = 1020;
  const maxV = Math.max(...rows.map((r) => r[1]));
  const X = (v) => PLOT_L + (v / maxV) * (PLOT_R - PLOT_L);
  const plotT = y, plotB = y + rows.length * ROW_H;
  add(`<line x1="${PLOT_L}" y1="${plotT - 4}" x2="${PLOT_L}" y2="${plotB}" stroke="${ink}" stroke-width="1.2"/>`);
  rows.forEach(([label, v], i) => {
    const by = plotT + i * ROW_H + (ROW_H - BAR_H) / 2;
    const x1 = X(v);
    add(`<text x="${PLOT_L - 12}" y="${(by + BAR_H / 2 + 5).toFixed(1)}" font-size="16" fill="${ink}" text-anchor="end">${esc(label)}</text>`);
    add(`<rect x="${PLOT_L}" y="${by.toFixed(1)}" width="${(x1 - PLOT_L).toFixed(1)}" height="${BAR_H}" fill="${ch.color}"/>`);
    add(`<text x="${(x1 + 10).toFixed(1)}" y="${(by + BAR_H / 2 + 5).toFixed(1)}" font-size="15.5" font-weight="700" fill="${ink}" font-variant-numeric="tabular-nums">${fmt(v)}</text>`);
  });
  y = plotB + 36;

  // ---- top-tenants table (two columns of rows to keep the figure compact) ----
  if (ch.tenants) {
    add(`<text x="${ML}" y="${y}" font-size="18" font-weight="700" fill="${ink}">${esc(ch.tenantsTitle)}</text>`);
    y += 12;
    const T_ROW = 28;
    const half = Math.ceil(ch.tenants.length / 2);
    const colW = (W - 2 * ML - 40) / 2;
    const hasSector = ch.tenants.some((t) => t[1]);
    for (let c = 0; c < 2; c++) {
      const items = ch.tenants.slice(c * half, (c + 1) * half);
      const x0 = ML + c * (colW + 40);
      items.forEach(([name, sector, pctv], i) => {
        const ty = y + (i + 1) * T_ROW;
        add(`<line x1="${x0}" y1="${ty + 8}" x2="${x0 + colW}" y2="${ty + 8}" stroke="${ink}" stroke-width="0.4"/>`);
        add(`<text x="${x0}" y="${ty}" font-size="15" fill="${ink}" font-weight="600">${esc(name)}</text>`);
        if (hasSector && sector)
          add(`<text x="${x0 + colW - 70}" y="${ty}" font-size="13.5" fill="${ink}" text-anchor="end">${esc(sector)}</text>`);
        add(`<text x="${x0 + colW}" y="${ty}" font-size="15" font-weight="700" fill="${ink}" text-anchor="end" font-variant-numeric="tabular-nums">${esc(pctv)}</text>`);
      });
    }
    y += half * T_ROW + 34;
  }

  // ---- footnotes ----
  const noteLines = ch.notes.flatMap((n) => wrap(n, 132));
  noteLines.forEach((n, i) => add(`<text x="${ML}" y="${y + i * 19}" font-size="13.5" fill="${ink}">${esc(n)}</text>`));
  y += noteLines.length * 19 + 16;

  const H = Math.round(y);
  const head = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${F}">`,
    `<rect width="${W}" height="${H}" fill="${surface}"/>`,
    `<rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="none" stroke="${ink}" stroke-width="1.5"/>`,
  ];
  writeFileSync(`REIT_Occupier_Mix_${ch.key}.svg`, head.concat(out, "</svg>").join("\n"));
  console.log(`REIT_Occupier_Mix_${ch.key}.svg`, `(${rows.length} sectors, ${ch.tenants?.length ?? 0} tenants, H=${H})`);
}

// ---- CSVs ----
const csv = [["reit", "basis", "sector", "share_pct"]];
for (const ch of CHARTS)
  for (const [label, v] of ch.rows) csv.push([ch.key, ch.subtitle.replaceAll(",", ";"), `"${label}"`, v]);
writeFileSync("REIT_Occupier_Mix.csv", csv.map((r) => r.join(",")).join("\n"));

const tcsv = [["reit", "tenant", "sector", "share_of_rentals"]];
for (const ch of CHARTS)
  for (const [name, sector, pctv] of ch.tenants ?? []) tcsv.push([ch.key, `"${name}"`, `"${sector}"`, pctv]);
writeFileSync("REIT_Top_Tenants.csv", tcsv.map((r) => r.join(",")).join("\n"));
console.log("REIT_Occupier_Mix.csv + REIT_Top_Tenants.csv written");
