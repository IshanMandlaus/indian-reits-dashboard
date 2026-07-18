/**
 * Parser for NSE unit-holding-pattern XBRL instances (`UHP_<ndsID>_…_WEB.xml`,
 * linked from each row of `/api/corporate-unit-holdings-master`).
 *
 * The instance docs are flat and regular, so no XML library is needed: contexts
 * carry a single `xbrldi:explicitMember` whose local name identifies the
 * category (`CategoryOfUnitHoldingPatternDetailsAxis` members) or the top-5
 * public-unitholder slot, and facts reference them via `contextRef`.
 *
 * What the filing gives us beyond the master endpoint's sponsor/public split:
 *  - Institutions vs Non-institutions totals + per-category percentages.
 *  - Named sponsor-group entities with individual stakes in
 *    `OtherIndianN`/`OtherForeignN` contexts (`NatureOfOther` = entity name).
 *    Mindspace files these unnamed ("Bodies Corporate"/"Trust") — generic rows
 *    are excluded from the entity list but still counted in the side totals.
 *  - Top-5 public unitholders by name. Filers enter the percentage column as a
 *    fraction (0.0451 → 4.51%); if every value in a filing is ≤ 1 we scale ×100.
 */
import type { QuarterDetail, SponsorEntity } from '../../src/types/data.ts'

/** context id → explicit-member local name (one member per context in these files). */
function parseContexts(xml: string): Map<string, string> {
  const out = new Map<string, string>()
  const ctxRe = /<(?:\w+:)?context\s+id="([^"]+)"[\s\S]*?<\/(?:\w+:)?context>/g
  for (let m = ctxRe.exec(xml); m; m = ctxRe.exec(xml)) {
    const member = /<xbrldi:explicitMember[^>]*>([^<]+)</.exec(m[0])
    if (member) out.set(m[1], member[1].trim().split(':').pop() ?? '')
  }
  return out
}

/** member local-name → fact value, for one fact tag (e.g. AsAPercentageOfTotalOutStandingUnits). */
function factsByMember(xml: string, tag: string, ctx: Map<string, string>): Map<string, string> {
  const out = new Map<string, string>()
  const re = new RegExp(`<in-capmkt:${tag}\\s[^>]*contextRef="([^"]+)"[^>]*>([^<]*)<`, 'g')
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    const member = ctx.get(m[1])
    if (member) out.set(member, m[2].trim())
  }
  return out
}

function num(v: string | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

/** Decode the XML entities that show up in filed names, collapse whitespace. */
function cleanText(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#0*39);/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Sponsor-entity rows filed with a generic category instead of an entity name. */
const GENERIC_NATURE =
  /^(bodies corporate|body corporate|trusts?|individuals?|huf|related parties|foreign nationals?|alternative investment fund|nbfcs?|na|n\.a\.?|-)\b/i

/** Sum the given members' percentages. */
function sum(pct: Map<string, string>, members: string[]): number {
  let t = 0
  for (const m of members) t += num(pct.get(m))
  return Math.round(t * 100) / 100
}

/**
 * Per-REIT sponsor-group labels. Within the sponsor category the filing splits
 * Indian vs Foreign holdings, and for every listed REIT each side maps 1:1 to a
 * sponsor group (KRT: Sattva = Indian, Blackstone = Foreign; Embassy history:
 * Embassy Sponsor = Indian, Blackstone = Foreign; …). Sides at 0% are dropped,
 * so e.g. Embassy quarters after Blackstone's exit show one group.
 */
export interface SponsorGroupLabels {
  indian?: string
  foreign?: string
}

export function parseUhpXbrl(xml: string, groupLabels: SponsorGroupLabels): QuarterDetail | null {
  const ctx = parseContexts(xml)
  const pct = factsByMember(xml, 'AsAPercentageOfTotalOutStandingUnits', ctx)
  if (!pct.has('PublicHoldingMember') || !pct.has('UnitHoldingOfSponsorAndSponsorGroupMember')) {
    return null
  }
  const nature = factsByMember(xml, 'NatureOfOther', ctx)
  const holderNames = factsByMember(xml, 'NameOfTheUnitHolder', ctx)
  const holderPcts = factsByMember(xml, 'PercentageOfHolding', ctx)

  const detail: QuarterDetail = {
    inst: num(pct.get('InstitutionsMember')),
    noninst: num(pct.get('NonInstitutionsMember')),
    cats: {
      mf: num(pct.get('MutualFundsInstitutionsMember')),
      fpi: num(pct.get('ForeignPortfolioInvestorsInstitutionsMember')),
      ins: num(pct.get('InsuranceCompaniesInstitutionsMember')),
      pf: num(pct.get('ProvidentOrPensionFundsInstitutionsMember')),
      banks: num(pct.get('FinancialInstitutionsOrBanksInstitutionsMember')),
      inst_other: sum(pct, [
        'OtherInstitutionsMember',
        'VentureCapitalFundsInstitutionsMember',
        'ForeignVentureCapitalInvestorsInstitutionsMember',
        'CentralGovernmentOrStateGovernmentsMember',
      ]),
      retail: num(pct.get('IndividualsNonInstitutionsMember')),
      corp: num(pct.get('BodyCorporatesMember')),
      nri: num(pct.get('NonResidentIndiansMember')),
      trusts: num(pct.get('TrustsMember')),
      // `OtherNonInstitutionsMember` is a SUBTOTAL (corp + NRI + trusts +
      // clearing + other-other) — only its residual leaf goes here.
      noninst_other: sum(pct, [
        'OtherNonInstitutionsOtherMember',
        'NBFCsRegisteredWithRBINonInstitutionsMember',
        'ClearingsMember',
        'CentralGovernmentOrStateGovernmentsOrPresidentOfIndiaNonInstitutionsMember',
      ]),
    },
  }

  // Named sponsor entities (as filed; generic/zero rows excluded).
  const sponsors: SponsorEntity[] = []
  for (const [member, name] of nature) {
    if (!/^Other(Indian|Foreign)\d+Member$/.test(member)) continue
    const p = num(pct.get(member))
    const clean = cleanText(name)
    if (p <= 0 || !clean || GENERIC_NATURE.test(clean)) continue
    // Filers append "Sponsor" / "Sponsor Group" / "Body Corporate" to the name — strip it.
    sponsors.push({
      name: clean.replace(/\s*(Sponsor(\s+Group)?|Body Corporate)$/i, ''),
      pct: p,
    })
  }
  // Nexus files the same entity name on two rows — merge duplicates.
  const byName = new Map<string, SponsorEntity>()
  for (const e of sponsors) {
    const prev = byName.get(e.name.toUpperCase())
    if (prev) prev.pct = Math.round((prev.pct + e.pct) * 100) / 100
    else byName.set(e.name.toUpperCase(), e)
  }
  const merged = [...byName.values()].sort((a, b) => b.pct - a.pct)
  if (merged.length) detail.sponsors = merged

  // Sponsor-group rollup from the Indian/Foreign side totals within the
  // sponsor category (exact — no dependence on entity naming).
  const sponsorTotal = num(pct.get('UnitHoldingOfSponsorAndSponsorGroupMember'))
  const indian = num(pct.get('IndianMember'))
  const foreign = num(pct.get('ForeignMember'))
  const groups: { label: string; pct: number }[] = []
  if (indian > 0) groups.push({ label: groupLabels.indian ?? 'Other sponsor group', pct: indian })
  if (foreign > 0) groups.push({ label: groupLabels.foreign ?? 'Other sponsor group', pct: foreign })
  // Filing rounding can leave a residual vs the category total — keep it visible.
  const residual = Math.round((sponsorTotal - indian - foreign) * 100) / 100
  if (residual >= 0.01) groups.push({ label: 'Other sponsor group', pct: residual })
  groups.sort((a, b) => b.pct - a.pct)
  if (groups.length) detail.groups = groups

  // Top-5 public unitholders, `UnitHoldersOtherThanSponsorOfTheREITINVITNMember`.
  // Some filers (Brookfield) list a sponsor entity here despite the axis name —
  // drop rows whose name matches a sponsor-group entity.
  const sponsorNames = new Set(sponsors.map((e) => e.name.toUpperCase()))
  const top: { name: string; pct: number }[] = []
  for (const [member, name] of holderNames) {
    if (!/^UnitHoldersOtherThanSponsorOfTheREITINVIT\d+Member$/.test(member)) continue
    const p = Number(holderPcts.get(member))
    const clean = cleanText(name)
    if (!clean || !Number.isFinite(p) || p <= 0) continue
    if (sponsorNames.has(clean.replace(/\s*(Sponsor(\s+Group)?|Body Corporate)$/i, '').toUpperCase()))
      continue
    top.push({ name: clean, pct: p })
  }
  if (top.length) {
    // Percentage column is filed as a fraction of 1 in practice — scale when
    // every value is ≤ 1 (a real sub-1% top-5 across the board is implausible
    // only alongside a larger holder, which would break the ≤ 1 condition).
    if (Math.max(...top.map((t) => t.pct)) <= 1) {
      for (const t of top) t.pct *= 100
    }
    top.sort((a, b) => b.pct - a.pct)
    detail.top = top.map((t) => ({ name: t.name, pct: Math.round(t.pct * 100) / 100 }))
  }

  return detail
}
