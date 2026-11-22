// A match file opened on this device stays readable while the app is open: the studio and the
// video session (Presenter) share it, so the coach does not pick the file again between the two.
// Nothing is stored: a reload of the page forgets it, and the file is asked for again.

const cache = new Map<string, { url: string; name: string }>()

export function rememberFile(projectId: string, file: File): { url: string; name: string } {
  const old = cache.get(projectId)
  if (old) URL.revokeObjectURL(old.url)
  const entry = { url: URL.createObjectURL(file), name: file.name }
  cache.set(projectId, entry)
  return entry
}

export const cachedFile = (projectId: string) => cache.get(projectId) ?? null
