/**
 * Section 8 — how the trust holds its assets. Every REIT renders a static
 * diagram PNG exported from "Indian REIT Structures.pptx" (public/img/
 * structure_<key>.png); per-REIT notes come from structures JSON (Embassy's
 * are hard-coded, carried over from v1).
 */
import type { ReitData, ReitKey, ReitStructures } from '../../types/data'

const NOTES: Partial<Record<ReitKey, string>> = {
  embassy:
    'Blackstone (former sponsor) fully exited in Dec 2023; Embassy Group (sponsor) holds 8% of units and the public holds 92%. SPVs are held 100% by the REIT via equity + shareholder debt unless a badge shows otherwise: GLSP (GolfLinks Software Park) is a 50:50 JV, and MPPL holds 80% of Embassy Energy (EEPL) with the REIT holding the other 20% directly.',
}

export function Structure({ D, k, structures }: { D: ReitData; k: ReitKey; structures: ReitStructures | null }) {
  const note = NOTES[k] ?? structures?.[k]?.notes
  return (
    <div>
      <img
        src={`${import.meta.env.BASE_URL}img/structure_${k}.png`}
        alt={`${D.meta[k].name} structure`}
        className="block h-auto w-full rounded-lg"
      />
      {note && (
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
          <b className="text-ink">Notes.</b> {note}
        </p>
      )}
    </div>
  )
}
