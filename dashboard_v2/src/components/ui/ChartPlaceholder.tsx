export function ChartPlaceholder({ height = 260, label = 'Chart' }: { height?: number; label?: string }) {
  return (
    <div
      className="grid place-items-center rounded-lg border border-dashed border-border/70 bg-surface-2/40 text-[11px] font-medium uppercase tracking-wider text-subtle"
      style={{ height }}
    >
      {label} · wiring in progress
    </div>
  )
}
