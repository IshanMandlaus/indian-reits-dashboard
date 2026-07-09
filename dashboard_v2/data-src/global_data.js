// Page 4 — Global REIT markets (researched 7 Jul 2026; figures approximate — sources in AUDIT.md)
window.GLOBAL = {
  asof: "7 Jul 2026",
  // listed REIT market capitalisation & gross real-estate AUM, US$ bn (editable estimates)
  countries: [
    { key:"us", name:"United States", flag:"🇺🇸", mcap:1300, aum:2500, count:"~200 listed equity REITs",
      note:"The original REIT market (1960) — ~$1.3tn listed equity REIT cap; Nareit counts >$2.5tn gross assets held by listed equity REITs alone." },
    { key:"jp", name:"Japan", flag:"🇯🇵", mcap:100, aum:155, count:"~58 J-REITs",
      note:"Asia's largest — J-REITs (2001) hold ≈¥23tn of assets; sponsor-driven model (developers seed assets into their REITs)." },
    { key:"au", name:"Australia", flag:"🇦🇺", mcap:95, aum:110, count:"~45 A-REITs",
      note:"A-REITs (1971, ex-LPTs) — Goodman's global logistics/data-centre platform dominates the index." },
    { key:"sg", name:"Singapore", flag:"🇸🇬", mcap:68, aum:95, count:"~40 S-REITs",
      note:"Regional hub — S-REITs hold assets across Asia (incl. India); Temasek-linked managers (CapitaLand, Mapletree) run the largest trusts." },
    { key:"hk", name:"Hong Kong", flag:"🇭🇰", mcap:27, aum:35, count:"~11 REITs",
      note:"A concentrated market: Link REIT is Asia's largest REIT by market capitalisation and remains the benchmark for the internally-managed model." },
    { key:"cn", name:"China (C-REITs)", flag:"🇨🇳", mcap:28, aum:30, count:"~60+ C-REITs",
      note:"Infrastructure-only public REITs (2021) on SSE/SZSE — market value +85% in 2024, overtook Hong Kong; state-owned sponsors dominate." },
    { key:"in", name:"India", flag:"🇮🇳", mcap:25, aum:63, count:"6 REITs + InvITs",
      note:"Youngest major market (2019) — six office/retail REITs; GAV ≈ ₹5.3 lakh cr. Pages 1–2 cover it in depth." },
  ],
  // top-5 listed REITs per country by market cap (Yahoo tickers for live quotes)
  // 5th field = qs (alt Yahoo query symbol, usually unused/null); 6th field = sponsor/manager (editable estimate/context, not always precise legal sponsor entity)
  top5: {
    us: [ ["Prologis","PLD","Logistics",null,"Internally managed (independent)"], ["American Tower","AMT","Towers",null,"Internally managed (independent)"], ["Equinix","EQIX","Data centres",null,"Internally managed (independent)"], ["Welltower","WELL","Healthcare",null,"Internally managed (independent)"], ["Simon Property","SPG","Malls",null,"Internally managed (Simon family-founded)"] ],
    jp: [ ["Nippon Building Fund","8951.T","Office",null,"Sponsored by Mitsubishi Estate"], ["Japan Real Estate","8952.T","Office",null,"Sponsored by Mitsubishi Estate group"], ["Nippon Prologis REIT","3283.T","Logistics",null,"Sponsored by Prologis"], ["GLP J-REIT","3281.T","Logistics",null,"Sponsored by GLP (Global Logistic Properties)"], ["Japan Metropolitan Fund","8953.T","Retail",null,"Sponsored by Mitsubishi Corp. & UBS"] ],
    au: [ ["Goodman Group","GMG.AX","Industrial/DC",null,"Internally managed (Goodman family/independent)"], ["Scentre Group","SCG.AX","Malls (Westfield)",null,"Internally managed (ex-Westfield Australia/NZ platform)"], ["Stockland","SGP.AX","Diversified",null,"Internally managed (stapled developer-REIT)"], ["Dexus","DXS.AX","Office",null,"Internally managed (independent)"], ["Mirvac","MGR.AX","Diversified",null,"Internally managed (stapled developer-REIT)"] ],
    sg: [ ["CapitaLand Integrated Commercial Trust","C38U.SI","Retail/Office",null,"Temasek-linked — managed by CapitaLand Investment"], ["CapitaLand Ascendas REIT","A17U.SI","Business parks",null,"Temasek-linked — managed by CapitaLand Investment"], ["Mapletree Logistics Trust","M44U.SI","Logistics",null,"Temasek-linked — managed by Mapletree"], ["Mapletree Industrial Trust","ME8U.SI","Industrial/DC",null,"Temasek-linked — managed by Mapletree"], ["Mapletree Pan Asia Commercial","N2IU.SI","Retail/Office",null,"Temasek-linked — managed by Mapletree"] ],
    hk: [ ["Link REIT","0823.HK","Retail/carparks",null,"Internally managed (independent, ex-HK Housing Authority)"], ["Champion REIT","2778.HK","Office/Retail",null,"Sponsored by Great Eagle Holdings"], ["Fortune REIT","0778.HK","Retail",null,"Managed by ARA Asset Management (Link REIT-backed)"], ["Sunlight REIT","0435.HK","Office/Retail",null,"Sponsored by Henderson Land"], ["Prosperity REIT","0808.HK","Office/Industrial",null,"Sponsored by Cheung Kong / CK Asset"] ],
    cn: [ ["China Merchants Shekou Ind. Park REIT","180101.SZ","Business park",null,"Sponsor: China Merchants Shekou (SOE)"], ["CICC GLP Warehouse REIT","508056.SS","Logistics",null,"Sponsor: GLP / CICC (fund manager)"], ["Ping An Guangzhou Guanghe Expressway","180201.SZ","Toll road",null,"Sponsor: Guangzhou Communications Investment (SOE)"], ["CCB Zhongguancun Industrial Park","508099.SS","Business park",null,"Sponsor: CCB Trust / Zhongguancun Development (SOE)"], ["CapitaLand Commercial C-REIT","508091.SS","Retail (first intl-sponsored)",null,"Sponsor: CapitaLand (first intl-sponsored C-REIT)"] ],
    in: [ ["Knowledge Realty Trust","KRT.BO","Office",null,"Sponsored by Blackstone"], ["Embassy REIT","EMBASSY.NS","Office",null,"Sponsored by Embassy Group & Blackstone"], ["Bagmane REIT","BAGMANE.BO","Office",null,"Sponsored by Bagmane Group"], ["Mindspace REIT","MINDSPACE.NS","Office",null,"Sponsored by K Raheja Corp"], ["Brookfield India REIT","BIRET.NS","Office",null,"Sponsored by Brookfield Asset Management"] ],
  },
  // --- EDITABLE ESTIMATES: per-country top-10 listed REITs by market cap (US$ bn), for the c_mcap drill-down pie.
  // First 5 entries match top5[] above (same order/names) so the country panel can read a %-of-market-cap figure by index.
  // "Others" slice in the UI = country.mcap − sum(these) [floored at 0] — captures the long tail of smaller listed REITs.
  mcap_breakdown: {
    us: [ ["Prologis",114], ["American Tower",95], ["Equinix",80], ["Welltower",55], ["Simon Property",50],
          ["Realty Income",45], ["Digital Realty",40], ["Public Storage",48], ["VICI Properties",32], ["AvalonBay Communities",30] ],
    jp: [ ["Nippon Building Fund",6.5], ["Japan Real Estate",5.5], ["Nippon Prologis REIT",6], ["GLP J-REIT",5], ["Japan Metropolitan Fund",3.5],
          ["Daiwa House REIT",4], ["Nomura Real Estate Master Fund",5], ["ORIX JREIT",3], ["Invincible Investment",3], ["Advance Residence Investment",3.5] ],
    au: [ ["Goodman Group",38], ["Scentre Group",13], ["Stockland",8], ["Dexus",6], ["Mirvac",7],
          ["Vicinity Centres",6], ["GPT Group",5], ["Charter Hall Group",4], ["Region Group",2], ["National Storage REIT",2] ],
    sg: [ ["CapitaLand Integrated Commercial Trust",12], ["CapitaLand Ascendas REIT",10], ["Mapletree Logistics Trust",7], ["Mapletree Industrial Trust",6], ["Mapletree Pan Asia Commercial Trust",5],
          ["Keppel DC REIT",4], ["Frasers Centrepoint Trust",3], ["Frasers Logistics & Commercial Trust",3], ["Suntec REIT",3], ["CapitaLand India Trust",2.5] ],
    hk: [ ["Link REIT",12], ["Champion REIT",1.8], ["Fortune REIT",1.0], ["Sunlight REIT",0.5], ["Prosperity REIT",0.4],
          ["Yuexiu REIT",1.2], ["Hui Xian REIT",1.5], ["Spring REIT",0.4], ["Regal REIT",0.5] ],
    cn: [ ["China Merchants Shekou Ind. Park REIT",1.0], ["CICC GLP Warehouse REIT",1.2], ["Ping An Guangzhou Guanghe Expressway",0.9], ["CCB Zhongguancun Industrial Park",0.8], ["CapitaLand Commercial C-REIT",0.7],
          ["Huaxia CCCC REIT",0.9], ["Bosera China Merchants Highway REIT",0.8], ["Hua'an Bailian Consumption REIT",0.6], ["Jiashi Beijing Affordable Housing REIT",0.7], ["China AMC Zhangjiang REIT",0.6] ],
    in: [ ["Knowledge Realty Trust",4.5], ["Embassy REIT",9], ["Bagmane REIT",1.5], ["Mindspace REIT",5.5], ["Brookfield India REIT",3.5] ],
  },
  // --- EDITABLE ESTIMATES: real-estate AUM by sector, US$ bn, for the c_aum drill-down pie. Values are engineered to sum ≈ the country's aum figure above.
  sector_breakdown: {
    us: [ ["Data centres",300], ["Industrial/Logistics",500], ["Retail",375], ["Residential",375], ["Healthcare",250], ["Office",250], ["Self-storage",150], ["Towers",200], ["Other",100] ],
    jp: [ ["Office",62], ["Logistics",31], ["Retail",23.25], ["Residential",23.25], ["Hotel",7.75], ["Other",7.75] ],
    au: [ ["Industrial/Logistics",38.5], ["Retail",27.5], ["Office",22], ["Diversified/Other",16.5], ["Residential",5.5] ],
    sg: [ ["Retail/Office",33.25], ["Logistics",19], ["Industrial/DC",19], ["Hospitality",9.5], ["Business parks",9.5], ["Other",4.75] ],
    hk: [ ["Retail",15.75], ["Office",10.5], ["Industrial",5.25], ["Other",3.5] ],
    cn: [ ["Industrial parks",9], ["Logistics/Warehousing",7.5], ["Toll roads/Expressways",6], ["Affordable housing",3], ["Consumption infra/Retail",3], ["Other",1.5] ],
    in: [ ["Commercial office",49.14], ["Retail/Malls (Nexus)",7.56], ["Other (data centres/residential rental)",6.3] ],
  },
  cases: [
    { tag:"US · GOVERNMENT-TENANT REIT", title:"Easterly Government Properties (NYSE: DEA) — a listed REIT with the U.S. federal government as tenant",
      body:"As of March 2026, Easterly owns 106 properties (~10.7 msf): 93 leased to U.S. federal agencies through the General Services Administration (FBI field offices, VA outpatient facilities, courthouses), 8 to state/local government and 5 to private tenants. The weighted average remaining lease term is 9.4 years against a full-faith-and-credit counterparty, producing bond-like income backed by the government's covenant. Management is publicly advocating GSA leasing reform (longer firm terms) — the model's principal risk is federal lease-renewal policy rather than the economic cycle. A relevant template for how a government-annuity vehicle (compare NHAI's InvITs, page 3) can operate in listed form." },
    { tag:"US · PRIVATE (NON-LISTED) REIT", title:"Blackstone BREIT — the $55bn private REIT and its liquidity lesson",
      body:"BREIT is a perpetual non-listed REIT sold to wealthy individuals at monthly NAV (~$54.9bn across 3.85bn shares, Mar-2026), ~90% in rental housing, logistics and data centres. Because it prices at appraised NAV rather than a market quote, redemptions are gated at 5% of NAV per quarter — the Nov-2022 gating, when withdrawal requests overwhelmed the cap, is the defining case study in private-REIT liquidity risk. Critics still argue its $14.25 NAV marks lag listed peers. Contrast with India's fully-listed model: daily NSE/BSE pricing, no gates." },
    { tag:"CHINA · STATE-SPONSORED C-REITs", title:"C-REITs — the government-directed REIT experiment",
      body:"Launched in 2021, C-REITs are the clearest example of state-directed REITs: eligibility is restricted to infrastructure (toll roads, industrial parks, warehouses, utilities — recently extended to consumer infrastructure such as retail), sponsors are predominantly state-owned enterprises, and issue proceeds must be recycled into new infrastructure investment — the vehicle serves national policy on local-government deleveraging. Market value grew approximately 85% in 2024, overtaking Hong Kong to enter Asia's top three listed real-estate markets. CapitaLand's September 2025 Shanghai listing was the first C-REIT sponsored by an international manager. The public-asset-monetisation logic closely parallels NHAI's InvIT programme (page 3)." },
  ],
  temasek: {
    title:"Temasek — the state investor behind Asia's biggest REIT complex",
    facts:[
      ["Net portfolio value","S$434 bn (~US$324 bn) as of Mar-2025"],
      ["Real-estate arms","CapitaLand Investment (~US$90 bn AUM) + Mapletree (~US$61 bn AUM)"],
      ["Merger watch","CLI × Mapletree combination under study (Nov-2025) → would create a ~US$150 bn manager"],
      ["REITs managed","CICT · CapitaLand Ascendas · CapitaLand China Trust · CapitaLand India Trust · Ascott Trust · MLT · MIT · MPACT"],
      ["India exposure","~US$40 bn (8% of portfolio, up from 6% in 2023) · plans up to US$10 bn more over 3 years"],
    ],
    world:"Temasek is Singapore's sovereign investor (not itself a REIT). Its real-estate reach comes through two wholly/majority-owned managers: CapitaLand Investment (Temasek ~52%) and Mapletree (100%). Between them they manage eight of Singapore's largest listed REITs spanning malls, business parks, logistics and data centres across Asia-Pacific, Europe and the US — and Temasek is studying merging the two into a ~US$150bn giant. C-REIT entry (CapitaLand's Shanghai listing, Sep-2025) extends the platform into mainland China.",
    india:"In India, Temasek's ~US$40bn book (8% of its global portfolio — biggest jump of any geography) spans direct stakes (Haldiram Snacks ~10% for ~US$1bn in 2025, financials, healthcare, digital) and — on the real-estate side — CapitaLand India Trust (SGX: CY6U), which owns IT parks in Bengaluru, Hyderabad, Chennai and Pune (ITPB, ITPH, aVance) and a growing Indian data-centre pipeline, plus CapitaLand's private India logistics/business-park funds. While India's six listed REITs are predominantly Blackstone-anchored, the Temasek ecosystem represents the second significant sovereign-linked investor group in Indian commercial real estate.",
  },
};
