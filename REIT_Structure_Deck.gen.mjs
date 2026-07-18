// Generates "Indian REIT Structures.pptx" (~/Downloads) — one slide per Indian REIT,
// replicating the Canva "Embassy Reit Structure.pptx" design: dark bg, header band,
// sponsor/unitholder pills, Trustee-REIT-Manager row, connector lines, SPV card grid.
// All photos/logos are embedded GRAY PLACEHOLDER images (right-click → Change Picture
// in PowerPoint to swap in real ones). Entity data mirrors dashboard_v2/data-src/structures.js
// (unitholding as of Mar 2026); KRT expanded to the full SPV chart from the
// FY2025-26 annual report pp. 38-39 (KRT/REIT Structure - KRT.pdf).
//
// Run: node REIT_Structure_Deck.gen.mjs   (needs pptxgenjs — see PPTXGEN_DIR below)

import { createRequire } from "node:module";
import { deflateSync } from "node:zlib";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

// pptxgenjs lives outside the repo (kept out of dashboard_v2's deps on purpose).
// Falls back to a local ./node_modules if you've installed it here.
const PPTXGEN_DIRS = [
  "/private/tmp/claude-501/-Users-ishan-Downloads-INDIAN-REITS/393bc35e-e0d5-4533-ac14-8c26c08f302c/scratchpad",
  new URL(".", import.meta.url).pathname,
];
const base = PPTXGEN_DIRS.find((d) => existsSync(`${d}/node_modules/pptxgenjs`));
if (!base) { console.error("pptxgenjs not found — npm install pptxgenjs --prefix <dir> and add <dir> to PPTXGEN_DIRS"); process.exit(1); }
const require = createRequire(`${base}/x.js`);
const PptxGenJS = require("pptxgenjs");

// ---------- tiny solid-colour PNG (so placeholders are real, replaceable pictures) ----------
const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
function solidPng(w, h, r, g, b) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3)]);
  for (let x = 0; x < w; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b; }
  const raw = Buffer.concat(Array(h).fill(row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const PH_RECT = "image/png;base64," + solidPng(300, 200, 0x3b, 0x39, 0x3e).toString("base64"); // photo slot
const PH_CIRC = "image/png;base64," + solidPng(200, 200, 0xd8, 0xd6, 0xdb).toString("base64"); // logo slot (light, sits on white pills)
const PH_CIRC_DK = "image/png;base64," + solidPng(200, 200, 0x4a, 0x48, 0x4f).toString("base64"); // logo slot on dark REIT card

// ---------- palette (from the Canva original) ----------
const C = {
  bg: "1E1C1F", rule: "F2F1F4", white: "FFFFFF",
  title: "1E1C1F", sub: "6E6C72",
  pink: "F2A9A2", pinkTitle: "2A1512", pinkSub: "8E3B32",
  line: "8A888E", label: "F2F1F4",
  name: "FFFFFF", asset: "A6A4AA", badge: "2B9BE8",
  foot: "8A888E",
};
const FONT = "Arial";

// ---------- data (mirrors dashboard_v2/data-src/structures.js; stakes Mar 2026) ----------
const REITS = [
  {
    key: "embassy", name: "Embassy Office Parks REIT",
    sponsors: [
      { name: "Blackstone Group", sub1: "Former Sponsor", sub2: "Exited Dec 2023", pink: true },
      { name: "Embassy Group", sub1: "Sponsor", sub2: "Holds 8% of Units" },
    ],
    public: "Holds ~92% of Units",
    trustee: "Axis Trustee Services Ltd", manager: "Embassy Office Parks Management Services Pvt Ltd (EOPMSPL)",
    cols: 4,
    spvs: [
      { name: "Manyata Promoters Pvt Ltd (MPPL)", asset: "Embassy Manyata" },
      { name: "Vikas Telecom Pvt Ltd / Sarla Infra", asset: "Embassy TechVillage" },
      { name: "GolfLinks Software Park Pvt Ltd (GLSP)", asset: "Embassy GolfLinks (incl. Pinehurst)", badge: "50%" },
      { name: "Quadron Business Park Pvt Ltd", asset: "Embassy Quadron · Embassy One & Four Seasons" },
      { name: "Embassy Construction Pvt Ltd", asset: "Embassy Business Hub" },
      { name: "Indian Express Newspapers (Mumbai) Pvt Ltd", asset: "Express Towers" },
      { name: "Vikhroli Corporate Park Pvt Ltd", asset: "Embassy 247" },
      { name: "Earnest Towers Pvt Ltd", asset: "First International Financial Centre (FIFC)" },
      { name: "Embassy Pune TechZone Pvt Ltd", asset: "Embassy TechZone" },
      { name: "Qubix Business Park Pvt Ltd", asset: "Embassy Qubix" },
      { name: "Oxygen Business Park Pvt Ltd", asset: "Embassy Oxygen" },
      { name: "Galaxy Square Pvt Ltd", asset: "Embassy Galaxy" },
      { name: "ESNP Property Builders & Developers Pvt Ltd", asset: "Embassy Splendid TechZone" },
      { name: "Umbel Properties Pvt Ltd", asset: "Hilton at Embassy GolfLinks" },
      { name: "Embassy Energy Pvt Ltd (EEPL)", asset: "Embassy Energy (Solar Park)", badge: "20%" },
    ],
    foot: "MPPL holds 80% of Embassy Energy (REIT 20% direct) · GLSP is a 50:50 JV · unitholding as of Mar 2026",
  },
  {
    key: "mindspace", name: "Mindspace Business Parks REIT",
    sponsors: [{ name: "K Raheja Corp", sub1: "Sponsor (backed by Blackstone)", sub2: "Holds 67% of Units" }],
    public: "Holds ~33% of Units",
    trustee: "Axis Trustee Services Ltd", manager: "K Raheja Corp Investment Managers Pvt Ltd",
    cols: 4,
    spvs: [
      { name: "Sundew Properties Ltd", asset: "Mindspace Madhapur (Sundew)", badge: "89%" },
      { name: "K. Raheja IT Park (Hyderabad) Ltd (KRIT)", asset: "Mindspace Madhapur (KRIT)", badge: "89%" },
      { name: "Intime Properties Ltd", asset: "Mindspace Madhapur (Intime)", badge: "89%" },
      { name: "Mindspace Business Parks Pvt Ltd (MBPPL)", asset: "Mindspace Airoli West · Pocharam · The Square Nagar Road · Commerzone Yerwada · Commerzone Porur" },
      { name: "Gigaplex Estates Pvt Ltd", asset: "Mindspace Airoli East" },
      { name: "Avacado Properties & Trading (India) Pvt Ltd", asset: "Paradigm Mindspace Malad · The Square BKC" },
      { name: "KRC Infrastructure & Projects Pvt Ltd", asset: "Gera Commerzone Kharadi · Pune IT Building Kalyani Nagar" },
      { name: "Sustain Properties Pvt Ltd", asset: "Commerzone Raidurg" },
      { name: "Horizonview Properties Pvt Ltd → Mack Soft Tech Pvt Ltd", asset: "The Square, 110 Financial District", badge: "holdco chain" },
      { name: "Other (Worli / Avenue 98 entities)", asset: "The Square / Ascent Worli · The Square Avenue 98" },
    ],
    foot: "11% in the three Madhapur SPVs held by TSIIC (Telangana State) · unitholding as of Mar 2026",
  },
  {
    key: "brookfield", name: "Brookfield India Real Estate Trust",
    sponsors: [{ name: "Brookfield Asset Management", sub1: "Sponsor", sub2: "Holds 19% of Units" }],
    public: "Holds ~81% of Units",
    trustee: "Axis Trustee Services Ltd", manager: "Brookprop Management Services Pvt Ltd",
    cols: 4,
    spvs: [
      { name: "Candor Kolkata One Hi-Tech Structures Pvt Ltd", asset: "Candor TechSpace G2 (Gurugram) · K1 (Kolkata)" },
      { name: "Shantiniketan Properties Pvt Ltd", asset: "Candor TechSpace N1 (Noida)" },
      { name: "Seaview Developers Pvt Ltd", asset: "Candor TechSpace N2 (Noida)" },
      { name: "Festus Properties Pvt Ltd", asset: "Kensington / Downtown Powai SEZ (Mumbai)" },
      { name: "Ariiga Ecoworld Business Parks Pvt Ltd", asset: "Ecoworld (Bengaluru)" },
      { name: "Kairos Properties Pvt Ltd", asset: "Downtown Powai — Commercial/IT (Mumbai)", badge: "50% · GIC 50%" },
      { name: "Candor Gurgaon One Realty Projects Pvt Ltd", asset: "Candor TechSpace G1 (Gurugram)", badge: "50% · GIC 50%" },
      { name: "Rostrum Realty Pvt Ltd (holding co)", asset: "Airtel Center (Gurugram) · Pavilion Mall (Ludhiana)", badge: "50% · Bharti 50%" },
      { name: "Aspen Buildtech Pvt Ltd", asset: "Worldmark 1 (New Delhi)", badge: "via Rostrum" },
      { name: "Oak Infrastructure Developers Pvt Ltd", asset: "Worldmark 2 & 3 (New Delhi)", badge: "via Rostrum" },
      { name: "Arnon Builders & Developers Pvt Ltd", asset: "Worldmark Gurugram", badge: "via Rostrum" },
    ],
    foot: "Rostrum Realty (Bharti JV) holds the North Commercial Portfolio · Candor India Office Parks is the operational service provider · unitholding as of Mar 2026",
  },
  {
    key: "nexus", name: "Nexus Select Trust",
    sponsors: [{ name: "Blackstone", sub1: "Sponsor Group", sub2: "Holds 22% of Units" }],
    public: "Holds ~78% of Units",
    trustee: "Axis Trustee Services Ltd", manager: "Nexus Select Mall Management Pvt Ltd",
    cols: 4,
    spvs: [
      { name: "SIPL", asset: "Nexus Select Citywalk (Delhi) · Nexus Seawoods (Navi Mumbai) · Nexus MBD (Ludhiana)" },
      { name: "CSJIPL", asset: "Nexus Elante Complex (Chandigarh)" },
      { name: "EDPL", asset: "Nexus Amritsar · Nexus Ahmedabad One" },
      { name: "NHRPL", asset: "Nexus Koramangala (Bengaluru) · Nexus Hyderabad" },
      { name: "NNMCPL", asset: "Nexus Indore Central" },
      { name: "SRPL", asset: "Nexus Esplanade (Bhubaneswar)" },
      { name: "NWPL", asset: "Nexus Whitefield Complex (Bengaluru)" },
      { name: "CPPL", asset: "Nexus Westend Complex (Pune)" },
      { name: "DIPL", asset: "Westend Icon Offices (Pune)" },
      { name: "NMRPL (Mysuru)", asset: "Nexus Centre City (Mysuru)" },
      { name: "NMRPL (Mangaluru)", asset: "Fiza by Nexus (Mangaluru)" },
      { name: "NSRPL", asset: "Nexus Shantiniketan (Bengaluru)" },
      { name: "NJRPL", asset: "Nexus Celebration (Udaipur)" },
      { name: "VPPL", asset: "Nexus Vijaya Complex (Chennai) · Nexus Vega City (Bengaluru)" },
      { name: "MSPL", asset: "Karnataka Solar Park" },
      { name: "ITIPL", asset: "Treasure Island (Indore)", badge: "50% · JV 50%" },
    ],
    foot: "Most SPVs held ~100% (99.45% in select cases) · NSRPL entitled to 64.9% economic interest in ITIPL per SAA · unitholding as of Mar 2026",
  },
  {
    key: "krt", name: "Knowledge Realty Trust",
    sponsors: [
      { name: "Blackstone", sub1: "Sponsor Group", sub2: "Holds 47% of Units" },
      { name: "Sattva Group", sub1: "Sponsor Group", sub2: "Holds 32% of Units" },
    ],
    public: "Holds ~21% of Units",
    trustee: "Axis Trustee Services Ltd", manager: "Knowledge Realty Office Management Services Pvt Ltd (KROMSPL)",
    cols: 5, compact: true,
    spvs: [
      { name: "DRPL", asset: "Sattva Knowledge City" },
      { name: "WRPL", asset: "Sattva Knowledge Park" },
      { name: "SKCPL", asset: "Sattva Knowledge Capital (0.6 msf)" },
      { name: "DIPL", asset: "Sattva Knowledge Capital (1.7 msf)" },
      { name: "DHRPL", asset: "Sattva Knowledge Court" },
      { name: "OBRPL", asset: "One BKC" },
      { name: "OICPL", asset: "One International Center & One Unity Center" },
      { name: "OWCPL", asset: "One World Center" },
      { name: "PBPL", asset: "Prima Bay" },
      { name: "CGDPL", asset: "Cessna Business Park" },
      { name: "EBPPL", asset: "Exora Business Park" },
      { name: "STPL", asset: "Sattva Softzone · Spectrum · Touchstone · Magnificia II · Supreme" },
      { name: "GVTPL", asset: "Sattva Global City" },
      { name: "SHPL", asset: "Sattva Horizon" },
      { name: "HRPL", asset: "Sattva Cosmo Lavelle" },
      { name: "DHPL", asset: "Sattva Endeavour" },
      { name: "QITPL", asset: "Sattva Infozone" },
      { name: "DBRPL", asset: "Sattva Eminence" },
      { name: "SGNPL", asset: "Sattva Tech Point" },
      { name: "JRPL", asset: "Sattva South Avenue" },
      { name: "OQRPL", asset: "One Qube" },
      { name: "PBPPL", asset: "One Trade Tower" },
      { name: "PABPPL", asset: "Fintech One" },
      { name: "KOBPPL", asset: "Kosmo One" },
      { name: "SDPL", asset: "Sattva Premia" },
      { name: "DEPL", asset: "Sattva Magnificia I", badge: "50% + 50% DHRPL" },
      { name: "OBSEPL", asset: "One BKC Solar", badge: "via OBRPL" },
      { name: "PBSEPL", asset: "Prima Bay Solar", badge: "via PBPL" },
      { name: "SRPPL", asset: "Karnataka Solar-I", badge: "DHRPL 72.5% + SPVs" },
      { name: "NDPL", asset: "Karnataka Solar-II", badge: "74% + SPVs 26%" },
    ],
    foot: "Full chart per Annual Report FY2025-26 pp. 38-39 · CAM entities: BSPOMSPL (Mumbai), SIMPL (Hyderabad), SPMPL (Bengaluru-I), PSBPPL (Bengaluru-II) · holdcos: DNPPL, DORVPL, DERPL, DORPL (under DRPL), OUCPL (under OICPL) · unitholding as of Mar 2026",
  },
  {
    key: "bagmane", name: "Bagmane Prime Office REIT",
    sponsors: [{ name: "Bagmane Group", sub1: "Sponsor (backed by CPP Investments)", sub2: "Holds 83% of Units" }],
    public: "Holds ~17% of Units",
    trustee: "Axis Trustee Services Ltd", manager: "Bagmane Realty Investment Manager Pvt Ltd",
    cols: 4,
    gridHeader: "Bagmane Developers Pvt Ltd & portfolio companies — 100% held by the Trust",
    spvs: [
      { name: "Bagmane World Technology Centre", asset: "Bengaluru" },
      { name: "Bagmane Constellation Business Park", asset: "Bengaluru" },
      { name: "Bagmane Rio Business Park", asset: "Bengaluru" },
      { name: "Luxor @ Bagmane Capital", asset: "Bengaluru" },
      { name: "Bagmane Tech Park", asset: "Bengaluru" },
      { name: "Bagmane Cosmos Business Park", asset: "Bengaluru" },
      { name: "UC Hotels @ BWTC", asset: "Hospitality" },
      { name: "Solar assets", asset: "Karnataka" },
    ],
    foot: "From the RHP (May 2026 IPO) — portfolio companies acquired by the Trust at IPO completion · unitholding as of Mar 2026",
  },
];

// ---------- deck ----------
const W = 10.6667, H = 8; // matches the Canva original (9753600 x 7315200 EMU)
const pres = new PptxGenJS();
pres.defineLayout({ name: "CANVA43", width: W, height: H });
pres.layout = "CANVA43";

const MX = 0.38; // side margin

function pill(s, x, y, w, h, o) {
  s.addShape("roundRect", { x, y, w, h, rectRadius: h / 2, fill: { color: o.pink ? C.pink : C.white }, line: { type: "none" } });
  const d = h - 0.26;
  s.addImage({ data: o.dark ? PH_CIRC_DK : PH_CIRC, x: x + 0.14, y: y + 0.13, w: d, h: d, rounding: true });
  const runs = [{ text: o.title, options: { fontSize: o.fs || 12, bold: true, color: o.pink ? C.pinkTitle : C.title, breakLine: true } }];
  if (o.sub1) runs.push({ text: o.sub1, options: { fontSize: 8.5, color: o.pink ? C.pinkSub : C.sub, breakLine: !!o.sub2 } });
  if (o.sub2) runs.push({ text: o.sub2, options: { fontSize: 8.5, color: o.pink ? C.pinkSub : C.sub } });
  s.addText(runs, { x: x + 0.14 + d + 0.08, y, w: w - d - 0.36, h, align: "left", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.12 });
}

function connector(s, xs, yTop, busY, dropX, dropBottom, label) {
  for (const x of xs) s.addShape("line", { x, y: yTop, w: 0, h: busY - yTop, line: { color: C.line, width: 0.75 } });
  const lo = Math.min(...xs, dropX), hi = Math.max(...xs, dropX);
  if (hi > lo) s.addShape("line", { x: lo, y: busY, w: hi - lo, h: 0, line: { color: C.line, width: 0.75 } });
  s.addShape("line", { x: dropX, y: busY, w: 0, h: dropBottom - busY, line: { color: C.line, width: 0.75, endArrowType: "triangle" } });
  s.addText(label, { x: dropX + 0.09, y: busY + (dropBottom - busY) / 2 - 0.12, w: 3.6, h: 0.24, fontSize: 9.5, bold: true, color: C.label, fontFace: FONT, align: "left", valign: "middle", margin: 0 });
}

for (const R of REITS) {
  const s = pres.addSlide();
  s.background = { color: C.bg };

  // header band
  s.addShape("line", { x: MX, y: 0.30, w: W - 2 * MX, h: 0, line: { color: C.rule, width: 1.5 } });
  s.addText("REIT Structure", { x: MX + 0.18, y: 0.34, w: 4.4, h: 0.5, fontSize: 21, bold: true, color: C.white, fontFace: FONT, valign: "middle", margin: 0 });
  s.addText(R.name, { x: W - MX - 6.6, y: 0.34, w: 6.42, h: 0.5, fontSize: 21, bold: true, color: C.white, fontFace: FONT, align: "right", valign: "middle", margin: 0 });
  s.addShape("line", { x: MX, y: 0.90, w: W - 2 * MX, h: 0, line: { color: C.rule, width: 1.5 } });

  // ---- top row: sponsors + public unitholders ----
  const tops = [...R.sponsors.map((sp) => ({ title: sp.name, sub1: sp.sub1, sub2: sp.sub2, pink: sp.pink })),
                { title: "Unitholders", sub1: "Public", sub2: R.public }];
  const tw = tops.length === 3 ? 2.98 : 3.3, th = 0.8, tgap = 0.42;
  const totW = tops.length * tw + (tops.length - 1) * tgap;
  let tx = (W - totW) / 2;
  const ty = 1.12, stubXs = [];
  for (const t of tops) { pill(s, tx, ty, tw, th, { ...t, fs: 12.5 }); stubXs.push(tx + tw / 2); tx += tw + tgap; }

  // ---- middle row: trustee / REIT / manager ----
  const my = 2.66, mh = 0.8, mgap = 0.34;
  const mw = [2.9, 2.62, 3.7]; // trustee, REIT, manager (manager names run long)
  const mTotal = mw[0] + mw[1] + mw[2] + 2 * mgap;
  const mx0 = (W - mTotal) / 2;
  const mxs = [mx0, mx0 + mw[0] + mgap, mx0 + mw[0] + mgap + mw[1] + mgap];
  connector(s, stubXs, ty + th, (ty + th + my) / 2 + 0.06, mxs[1] + mw[1] / 2, my, "Unit holding in the trust");
  pill(s, mxs[0], my, mw[0], mh, { title: "Axis Trustee Services Ltd.", sub1: "Trustee", fs: 11 });
  pill(s, mxs[1], my, mw[1], mh, { title: R.name.replace(" REIT", "").replace(" Trust", ""), sub1: R.name.includes("Trust") && !R.name.includes("REIT") ? "Trust" : "REIT", fs: 11.5 });
  pill(s, mxs[2], my, mw[2], mh, { title: R.manager, sub1: "Manager", fs: R.manager.length > 45 ? 9 : 10.5 });

  // ---- SPV grid ----
  const compact = !!R.compact;
  const gTop0 = 4.18;
  let gTop = gTop0;
  if (R.gridHeader) {
    s.addText(R.gridHeader, { x: MX, y: gTop - 0.06, w: W - 2 * MX, h: 0.26, fontSize: 10.5, bold: true, color: C.asset, fontFace: FONT, align: "center", valign: "middle", margin: 0 });
    gTop += 0.30;
  }
  connector(s, [mxs[0] + mw[0] / 2, mxs[2] + mw[2] / 2], my + mh, (my + mh + gTop0) / 2 - 0.04, mxs[1] + mw[1] / 2, gTop0 - 0.12, "Equity + shareholder debt — 100% unless badged");

  const cols = R.cols, n = R.spvs.length, rows = Math.ceil(n / cols);
  const cgap = compact ? 0.16 : 0.22, rgap = compact ? 0.10 : 0.16;
  const gridW = W - 2 * MX;
  const cw = (gridW - (cols - 1) * cgap) / cols;
  const footH = 0.34;
  const availH = H - footH - gTop - 0.06;
  const ch = Math.min(compact ? 0.62 : rows <= 2 ? 1.25 : 0.92, (availH - (rows - 1) * rgap) / rows);
  const imgW = compact ? 0.52 : ch > 1 ? 1.15 : 0.88;

  R.spvs.forEach((v, i) => {
    const r = Math.floor(i / cols);
    const inRow = r === rows - 1 ? n - (rows - 1) * cols : cols;
    const rowW = inRow * cw + (inRow - 1) * cgap;
    const x = (W - rowW) / 2 + (i - r * cols) * (cw + cgap);
    const y = gTop + r * (ch + rgap);
    s.addImage({ data: PH_RECT, x, y, w: imgW, h: ch });
    const nameFs = compact ? 8 : v.name.length > 38 ? 8.5 : 9.5;
    const assetFs = compact ? 6.5 : 7.5;
    const runs = [
      { text: v.name, options: { fontSize: nameFs, bold: true, color: C.name, breakLine: true } },
      { text: v.asset, options: { fontSize: assetFs, color: C.asset } },
    ];
    const hasBadge = !!v.badge;
    s.addText(runs, { x: x + imgW + 0.07, y, w: cw - imgW - 0.09, h: ch - (hasBadge ? (compact ? 0.16 : 0.20) : 0), align: "left", valign: "middle", fontFace: FONT, margin: 0, lineSpacingMultiple: 1.05 });
    if (hasBadge) {
      const bw = 0.16 + v.badge.length * 0.052;
      s.addShape("roundRect", { x: x + cw - bw, y: y + ch - 0.19, w: bw, h: 0.17, rectRadius: 0.085, fill: { color: C.badge }, line: { type: "none" } });
      s.addText(v.badge, { x: x + cw - bw, y: y + ch - 0.19, w: bw, h: 0.17, fontSize: 6.5, bold: true, color: C.white, fontFace: FONT, align: "center", valign: "middle", margin: 0 });
    }
  });

  // footnote
  s.addText(R.foot, { x: MX, y: H - 0.30, w: W - 2 * MX, h: 0.24, fontSize: 6.8, italic: true, color: C.foot, fontFace: FONT, align: "left", valign: "middle", margin: 0 });
}

const OUT = `${homedir()}/Downloads/Indian REIT Structures.pptx`;
await pres.writeFile({ fileName: OUT });
console.log("wrote", OUT);
