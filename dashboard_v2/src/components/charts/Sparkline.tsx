/**
 * Tiny gradient-filled sparkline drawn on a raw 2D canvas (ported from v1's
 * snapshot-card sparkline). Green when the series ends up over its start, red
 * when down. DPR-aware so it stays crisp. Used by the Market snapshot cards.
 */
import { useEffect, useRef } from 'react'

export function Sparkline({
  points,
  height = 46,
  className = '',
}: {
  points: number[]
  height?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv || points.length < 2) return
    const dpr = window.devicePixelRatio || 1
    const W = cv.clientWidth || 300
    const H = height
    cv.width = W * dpr
    cv.height = H * dpr
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    const mn = Math.min(...points)
    const mx = Math.max(...points)
    const pad = 3
    const X = (i: number) => (i / (points.length - 1)) * (W - 2)
    const Y = (v: number) => H - pad - ((v - mn) / (mx - mn || 1)) * (H - 2 * pad)
    const up = points[points.length - 1] >= points[0]
    const col = up ? '#34d399' : '#f87171'
    ctx.beginPath()
    ctx.moveTo(X(0), Y(points[0]))
    for (let i = 1; i < points.length; i++) ctx.lineTo(X(i), Y(points[i]))
    ctx.strokeStyle = col
    ctx.lineWidth = 1.4
    ctx.stroke()
    // fill under the line
    ctx.lineTo(X(points.length - 1), H)
    ctx.lineTo(X(0), H)
    ctx.closePath()
    const gr = ctx.createLinearGradient(0, 0, 0, H)
    gr.addColorStop(0, col + '44')
    gr.addColorStop(1, col + '00')
    ctx.fillStyle = gr
    ctx.fill()
    // end dot
    ctx.beginPath()
    ctx.arc(X(points.length - 1), Y(points[points.length - 1]), 2.4, 0, 7)
    ctx.fillStyle = col
    ctx.fill()
  }, [points, height])

  return <canvas ref={ref} className={'block w-full ' + className} style={{ height }} />
}
