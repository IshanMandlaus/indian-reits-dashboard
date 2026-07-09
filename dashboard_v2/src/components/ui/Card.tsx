import type { ReactNode } from 'react'

type CardProps = {
  title?: ReactNode
  note?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** The v2 panel primitive — replaces v1's flat `.card`. */
export function Card({ title, note, actions, children, className = '', bodyClassName = '' }: CardProps) {
  return (
    <section
      className={
        'rounded-[var(--radius-card)] border border-border/70 bg-surface/90 shadow-[var(--shadow-card)] ' +
        'transition-colors ' +
        className
      }
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[13.5px] font-semibold tracking-tight text-ink">{title}</h3>
            )}
            {note && <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{note}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className={'px-5 pb-4 pt-3 ' + bodyClassName}>{children}</div>
    </section>
  )
}
