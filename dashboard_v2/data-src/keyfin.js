/**
 * FY2026 cross-REIT comparison snapshot — the "Comparison" (first) sheet of
 * ../Indian_REITs_Key_Financials_FILLED.xlsx, cached values as of the FY2026
 * selector position. Consolidated basis, INR crore. Percentages stored as
 * fractions. Values are page-cited in dashboard_v2/audit/workbook_citations.json
 * (metric × REIT × FY2026); the scripted diff in the audit addendum keeps this
 * file bound to the workbook — edit the workbook, then re-copy, not vice versa.
 */
window.KEYFIN = {
  fy: 'FY2026',
  basis: 'Consolidated',
  cols: ['Embassy', 'Mindspace', 'Brookfield', 'Nexus (Retail)', 'Knowledge / KRT', 'Bagmane*'],
  // fmt: cr = ₹ crore (Indian grouping, 0 dp) · pct = fraction → % (1 dp)
  //      inr2 = ₹ with 2 dp · num1 = plain number, 1 dp
  rows: [
    { metric: 'Revenue from Operations', unit: 'INR cr', fmt: 'cr', v: [4582.356, 3216.346, 2971.144, 2568, 3046.628, 1942.937] },
    { metric: 'Net Operating Income (NOI)', unit: 'INR cr', fmt: 'cr', v: [3760, 2663.6, 2291.299, 1929.64, 2694.076, 1758.976] },
    { metric: 'NOI Margin', unit: '%', fmt: 'pct', v: [0.820538605031997, 0.8281447331848, 0.77118409609228, 0.751417445482866, 0.884281244707263, 0.90531808288174] },
    { metric: 'EBITDA', unit: 'INR cr', fmt: 'cr', v: [3602.234, 2514.56, 2241.8, 1820.73, 2532.579, 1630.093] },
    { metric: 'NDCF', unit: 'INR cr', fmt: 'cr', v: [2400.831, 1528.778, 1506.695, 1279.32, 2101.972, 0] },
    { metric: 'Total Distribution', unit: 'INR cr', fmt: 'cr', v: [2396.275, 1516.356, 1516.178, 1375.77, 2101.919, 0] },
    { metric: 'Distribution per Unit (DPU)', unit: '₹/unit', fmt: 'inr2', v: [25.28, 24.09, 21.4, 9.08, 4.74, 0] },
    { metric: 'Annual Distribution Yield', unit: '%', fmt: 'pct', v: [0.0601475136807043, 0.053652561247216, 0.0668102775436296, 0.0601324503311258, 0.0417474017967236, null] },
    { metric: 'Market Capitalisation', unit: 'INR cr', fmt: 'cr', v: [39839.8167, 29110.466, 24003.71109, 22876.5, 50348.1776, 34000] },
    { metric: 'GAV / AUM', unit: 'INR cr', fmt: 'cr', v: [69943.737, 47634.97, 56528.1, 32240.6, 67411.1, 40263.49] },
    { metric: 'Net Debt', unit: 'INR cr', fmt: 'cr', v: [21404.413, 11758.575, 17455.947, 6161.2, 11732.091, 2744.97] },
    { metric: 'Loan-to-Value (LTV)', unit: '%', fmt: 'pct', v: [0.306023296982259, 0.246847536589191, 0.308801233368891, 0.191100661898352, 0.174037970007907, 0.0681751631564974] },
    { metric: 'GLA', unit: 'Msf', fmt: 'num1', v: [52.5, 39.3, 37.03, 11.9, 46.5, 19.6] },
    { metric: 'Committed Occupancy', unit: '%', fmt: 'pct', v: [0.94, 0.94, 0.9292, 0.97, 0.92, 0.99] },
    { metric: 'WALE', unit: 'years', fmt: 'num1', v: [8.5, 7.1, 6.7, 4.7, 8, 7.4] },
  ],
  // Metrics where a zero means "no distributions yet", rendered as "—".
  dash_zero: ['NDCF', 'Total Distribution', 'Distribution per Unit (DPU)'],
  footnotes: [
    '* Bagmane figures are proforma/combined from its RHP (Trust listed May 2026): revenue / NOI / EBITDA are 9M Apr–Dec 2025, market cap at the ₹100 offer price, occupancy/WALE as of 31 Dec 2025; no FY2026 distributions.',
    'Consolidated basis, FY2026 (year ended 31 Mar 2026). INR crore unless stated. Market caps = units × FY-end NSE close. LTV = net debt / GAV.',
  ],
}
