import type { ReactNode } from 'react'

type Tone = 'pos' | 'neg' | 'neutral' | 'accent' | 'warn'

const TONES: Record<Tone, string> = {
  pos: 'bg-pos/12 text-pos ring-pos/20',
  neg: 'bg-neg/12 text-neg ring-neg/20',
  accent: 'bg-accent/12 text-accent ring-accent/20',
  warn: 'bg-warn/12 text-warn ring-warn/20',
  neutral: 'bg-surface-3 text-muted ring-border',
}

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset tnum ' +
        TONES[tone] +
        ' ' +
        className
      }
    >
      {children}
    </span>
  )
}
