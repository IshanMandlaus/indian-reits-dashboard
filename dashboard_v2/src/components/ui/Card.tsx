import { useRef, type ReactNode } from 'react'
import { exportChartSvg, exportPanelSvg } from '../../lib/svgExport'

type CardProps = {
  title?: ReactNode
  note?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /**
   * Add a "↓ SVG" button that exports the card body as a white-background SVG.
   * `chart` captures the Chart.js canvas(es) light-themed on white; `panel`
   * re-themes and serialises the whole DOM body (e.g. a snapshot-card grid).
   */
  exportable?: 'chart' | 'panel'
  /** Base filename for the export (defaults to the title). */
  exportName?: string
  /**
   * Data as-of line stamped under the title in the exported SVG (e.g.
   * "Live prices to 10 Jul 2026 10:28"). Pass it for live-data charts — the
   * download otherwise loses the date context shown in the card note.
   */
  exportAsof?: string | null
  /**
   * Panel exports only: reflow the body at this width (px) instead of capturing
   * at on-screen width. Use for wide DOM tables — Word shrinks anything wider
   * than its ~624px text column, so on-screen-width captures print unreadably.
   */
  exportWidth?: number
  /** Set false to omit the card note from the exported SVG footnote. */
  exportNote?: boolean
}

/** The v2 panel primitive — replaces v1's flat `.card`. */
export function Card({
  title,
  note,
  actions,
  children,
  className = '',
  bodyClassName = '',
  exportable,
  exportName,
  exportAsof,
  exportWidth,
  exportNote = true,
}: CardProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLParagraphElement>(null)

  const doExport = () => {
    const node = bodyRef.current
    if (!node) return
    const name = exportName || (typeof title === 'string' ? title : 'chart')
    const meta = {
      title: typeof title === 'string' ? title : undefined,
      asof: exportAsof || undefined,
      // rendered textContent so JSX notes flatten to plain text for the SVG footnote
      note: (exportNote && noteRef.current?.textContent) || undefined,
    }
    if (exportable === 'panel')
      exportPanelSvg(node, name, meta, exportWidth ? { width: exportWidth } : undefined).catch(() => {})
    else exportChartSvg(node, name, meta)
  }

  const exportBtn = exportable ? (
    <button
      onClick={doExport}
      title="Download as SVG (white background)"
      className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-subtle transition hover:border-accent hover:text-accent"
    >
      ↓ SVG
    </button>
  ) : null

  return (
    <section
      className={
        'rounded-[var(--radius-card)] border border-border/70 bg-surface/90 shadow-[var(--shadow-card)] ' +
        'transition-colors ' +
        className
      }
    >
      {(title || actions || exportBtn) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[13.5px] font-semibold tracking-tight text-ink">{title}</h3>
            )}
            {note && (
              <p ref={noteRef} className="mt-1 text-[11.5px] leading-relaxed text-muted">
                {note}
              </p>
            )}
          </div>
          {(actions || exportBtn) && (
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              {exportBtn}
            </div>
          )}
        </header>
      )}
      <div ref={bodyRef} className={'px-5 pb-4 pt-3 ' + bodyClassName}>
        {children}
      </div>
    </section>
  )
}
