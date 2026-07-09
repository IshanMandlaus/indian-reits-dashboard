/**
 * Create a raw Chart.js instance bound to a canvas and rebuild it when deps
 * change (destroying the previous one). Raw Chart.js — not react-chartjs-2 — so
 * the domestic charts can reproduce v1's custom plugins, zoom/pan, and range-bar
 * rescaling exactly. Exposes the live instance via `chartRef` for the range bar.
 */
import { useEffect, useRef } from 'react'
import { Chart, type ChartConfiguration } from 'chart.js'
import type { ChartWithRange } from '../../lib/chartSetup'

export function useChartCanvas(build: () => ChartConfiguration, deps: unknown[]) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<ChartWithRange | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cfg = build() as ChartConfiguration & { _xmin?: number; _xmax?: number }
    const chart = new Chart(canvas, cfg) as ChartWithRange
    // Carry the original x-range (stashed on the config) onto the instance so the
    // range bar / zoom rescaling can restore it.
    chart._xmin = cfg._xmin
    chart._xmax = cfg._xmax
    chartRef.current = chart
    return () => {
      chart.destroy()
      chartRef.current = null
    }
    // build is recreated each render; deps declare the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { canvasRef, chartRef }
}
