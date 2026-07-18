/**
 * Annexure modal — opens the valuation-report source for one asset. Three modes
 * (ported from v1 openAnnex):
 *   • image mode   — Embassy cropped data-table images (annex-images)
 *   • page mode    — original report page JPEGs (img/annex/<k>/p<n>.jpg)
 *   • text mode    — parsed text/tables (annexRender) below the page images
 * annexdata (~1.1 MB) and annex-images load lazily the first time the modal opens.
 */
import { useEffect, useState } from 'react'
import type { ReitKey, ReitSpv, ReitLinks, AnnexData, AnnexImages } from '../../types/data'
import { loadData } from '../../lib/data'
import { inr } from '../../lib/format'
import { VALREP } from '../../lib/reit'
import { renderAnnexItems, annexPages } from './annexRender'
import type { Annexures } from '../../types/data'

const BASE = import.meta.env.BASE_URL

export function AnnexModal({
  k,
  asset,
  annexures,
  links,
  onClose,
}: {
  k: ReitKey
  asset: ReitSpv | null
  annexures: Annexures | null
  links: ReitLinks | null
  onClose: () => void
}) {
  const [annexdata, setAnnexdata] = useState<AnnexData | null>(null)
  const [annexImages, setAnnexImages] = useState<AnnexImages | null>(null)

  // Lazy-load the heavy datasets the first time the modal is opened.
  useEffect(() => {
    if (!asset) return
    if (!annexdata) loadData('annexdata').then(setAnnexdata).catch(() => {})
    if (!annexImages) loadData('annex-images').then(setAnnexImages).catch(() => {})
  }, [asset, annexdata, annexImages])

  // Close on Escape.
  useEffect(() => {
    if (!asset) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [asset, onClose])

  if (!asset) return null

  const loading = !annexdata || !annexImages
  const secs = annexdata?.[k]?.[asset.asset] || []
  const imgs = annexImages?.[k]?.[asset.asset] || null
  const pages = annexPages(annexures, k, asset.asset, secs)
  const val = (links?.[k] || []).find((l) => l.type === 'Valuation report' && l.latest)

  const stats: [string, string | null][] = [
    ['Market value', asset.value_cr != null ? inr(asset.value_cr) + ' cr' : null],
    ['Cap rate', asset.cap_rate != null ? (100 * asset.cap_rate).toFixed(2) + '%' : null],
    ['Discount rate', asset.disc_rate != null ? (100 * asset.disc_rate).toFixed(2) + '%' : null],
    ['Market rent', asset.mkt_rent != null ? '₹' + asset.mkt_rent + '/sf/mo' : null],
    ['In-place rent', asset.inplace_rent != null ? '₹' + asset.inplace_rent + '/sf/mo' : null],
    ['Occupancy', asset.occ != null ? (100 * asset.occ).toFixed(0) + '%' : null],
    ['WALE', asset.wale != null ? asset.wale + ' yrs' : null],
    ['Leasable', asset.leasable_msf != null ? asset.leasable_msf + ' msf' : null],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-4xl rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">
              {asset.asset} · {asset.spv || ''}
            </h3>
            {!imgs?.length && (
              <p className="mt-1 text-[11.5px] text-muted">
                Parsed from: {VALREP[k]}
                {pages.length ? ' · pages ' + pages.join(', ') : ''}
                {val && (
                  <>
                    {' · '}
                    <a href={val.url} target="_blank" rel="noopener noreferrer" className="text-accent">
                      open source PDF ↗
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-1 text-[18px] leading-none text-muted transition hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* stats grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-border px-6 py-4 sm:grid-cols-4">
          {stats
            .filter(([, v]) => v != null)
            .map(([l, v]) => (
              <div key={l}>
                <div className="text-[10.5px] uppercase tracking-wide text-subtle">{l}</div>
                <div className="text-[13px] font-semibold text-ink tnum">{v}</div>
              </div>
            ))}
        </div>

        {/* body */}
        <div
          className="annex-content max-h-[65vh] overflow-y-auto px-6 py-4"
          onClick={(e) => {
            const cl = (e.target as HTMLElement).closest('.clamp')
            if (cl) cl.classList.toggle('open')
          }}
        >
          {loading ? (
            <div className="py-12 text-center text-[13px] text-subtle">Loading valuation-report content…</div>
          ) : imgs && imgs.length ? (
            <ImageMode k={k} asset={asset.asset} imgs={imgs} val={val?.url} />
          ) : pages.length ? (
            <>
              <PageImages k={k} asset={asset.asset} pages={pages} />
              {secs.length > 0 && (
                <>
                  <div className="extracthead">Extracted text and tables</div>
                  <div dangerouslySetInnerHTML={{ __html: renderAnnexItems(secs) }} />
                </>
              )}
            </>
          ) : secs.length ? (
            <>
              <div className="extracthead">Extracted text and tables</div>
              <div dangerouslySetInnerHTML={{ __html: renderAnnexItems(secs) }} />
            </>
          ) : (
            <div className="missing">No annexure content parsed for this asset yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function ImageMode({
  k,
  asset,
  imgs,
  val,
}: {
  k: ReitKey
  asset: string
  imgs: NonNullable<AnnexImages[ReitKey]>[string]
  val?: string
}) {
  const pgList = [...new Set(imgs.map((i) => i.page))].sort((a, b) => a - b).join(', ')
  return (
    <>
      <div className="annexnote">
        Data tables snipped directly from the valuation report — annexure cash-flow tables shown first.
      </div>
      <div className="annexpages">
        {imgs.map((im, i) => (
          <div key={i} className="annexpage">
            <div className="pgcap">
              <span>{im.cap || ''}</span>
            </div>
            <img src={BASE + im.src} alt={`${asset} — data table`} loading="lazy" />
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-border pt-3 text-[12px] text-muted">
        Data tables from: {VALREP[k]} · pages {pgList}
        {val && (
          <>
            {' · '}
            <a href={val} target="_blank" rel="noopener noreferrer" className="text-accent">
              open source PDF ↗
            </a>
          </>
        )}
      </div>
    </>
  )
}

function PageImages({ k, asset, pages }: { k: ReitKey; asset: string; pages: number[] }) {
  return (
    <>
      <div className="annexnote">
        Showing the original valuation-report pages for this asset, with statement and asset-description pages first.
        These page images are the source of truth; extracted text below is only for quick scanning.
      </div>
      <div className="annexpages">
        {pages.map((p) => (
          <div key={p} className="annexpage">
            <div className="pgcap">
              <span>Report page {p}</span>
              <span>{asset}</span>
            </div>
            <img
              src={`${BASE}img/annex/${k}/p${p}.jpg`}
              alt={`${asset} valuation report page ${p}`}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </>
  )
}
