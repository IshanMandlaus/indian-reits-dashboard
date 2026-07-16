/**
 * Data loader for the converted v1 → JSON datasets (public/data/*.json).
 *
 * Each dataset is fetched once and cached (deduped in-flight), so multiple
 * components can request the same dataset without refetching. Large files
 * (annexdata ~1.1 MB, global-live ~730 KB, bench-live ~320 KB) stay out of the
 * JS bundle and are pulled on demand by the routes that need them.
 */
import type {
  ReitData,
  LivePrices,
  ReitStructures,
  Annexures,
  AnnexImages,
  AnnexData,
  ReitLinks,
  ReitValHy,
  BlocksLive,
  Bench,
  BenchLive,
  Invit,
  Global,
  GlobalLive,
  Holdings,
  IndexYields,
  PriceHistory,
} from '../types/data'

/** Basename (without extension) of each file in public/data. */
export type DatasetName =
  | 'reit-data'
  | 'live-prices'
  | 'structures'
  | 'annexures'
  | 'annexdata'
  | 'annex-images'
  | 'links'
  | 'val-hy'
  | 'blocks-live'
  | 'bench'
  | 'bench-live'
  | 'invit'
  | 'global'
  | 'global-live'
  | 'holdings'
  | 'index-yields'
  | 'price-history'

/** Maps each dataset name to the type its JSON deserialises to. */
export interface DatasetTypes {
  'reit-data': ReitData
  'live-prices': LivePrices
  structures: ReitStructures
  annexures: Annexures
  annexdata: AnnexData
  'annex-images': AnnexImages
  links: ReitLinks
  'val-hy': ReitValHy
  'blocks-live': BlocksLive
  bench: Bench
  'bench-live': BenchLive
  invit: Invit
  global: Global
  'global-live': GlobalLive
  holdings: Holdings
  'index-yields': IndexYields
  'price-history': PriceHistory
}

const cache = new Map<DatasetName, Promise<unknown>>()

/** Resolve a data file URL, honouring Vite's configured base path. */
function dataUrl(name: DatasetName): string {
  return `${import.meta.env.BASE_URL}data/${name}.json`
}

/**
 * Fetch and cache one dataset by name, typed by {@link DatasetTypes}.
 * A failed fetch is not cached, so a later call can retry.
 */
export function loadData<K extends DatasetName>(name: K): Promise<DatasetTypes[K]> {
  const existing = cache.get(name)
  if (existing) return existing as Promise<DatasetTypes[K]>

  const promise = fetch(dataUrl(name))
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${name}.json: ${res.status} ${res.statusText}`)
      return res.json() as Promise<DatasetTypes[K]>
    })
    .catch((err) => {
      cache.delete(name)
      throw err
    })

  cache.set(name, promise)
  return promise as Promise<DatasetTypes[K]>
}

/** Drop a cached dataset (e.g. after a live refresh) so the next load refetches. */
export function invalidateData(name?: DatasetName): void {
  if (name) cache.delete(name)
  else cache.clear()
}
