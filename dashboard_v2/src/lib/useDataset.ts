/**
 * React hook wrapping {@link loadData} — fetch a dataset and track load state.
 *
 *   const { data, loading, error } = useDataset('reit-data')
 *
 * The cache in loadData dedupes concurrent requests across components, so it is
 * safe for several components to call this with the same name.
 */
import { useEffect, useState } from 'react'
import { loadData, type DatasetName, type DatasetTypes } from './data'

export interface DatasetState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useDataset<K extends DatasetName>(name: K): DatasetState<DatasetTypes[K]> {
  const [state, setState] = useState<DatasetState<DatasetTypes[K]>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true
    setState({ data: null, loading: true, error: null })
    loadData(name)
      .then((data) => {
        if (active) setState({ data, loading: false, error: null })
      })
      .catch((error: Error) => {
        if (active) setState({ data: null, loading: false, error })
      })
    return () => {
      active = false
    }
  }, [name])

  return state
}
