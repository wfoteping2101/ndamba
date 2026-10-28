import { BRAND } from './config'
import { useEffect } from 'react'
import { useLiveQuery as useDexieLiveQuery } from 'dexie-react-hooks'

/** Live query with a fallback while loading. */
export function useLiveQuery<T>(fn: () => Promise<T> | T, deps: unknown[], fallback: T): T {
  const v = useDexieLiveQuery(fn, deps)
  return (v === undefined ? fallback : v) as T
}

export function useDocumentTitle(title: string) {
  useEffect(() => { document.title = title ? `${title} | ${BRAND.name}` : `${BRAND.name} | ${BRAND.tagline.fr}` }, [title])
}
