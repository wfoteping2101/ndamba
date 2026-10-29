// The story save: one automatic slot (the chapter and beat to resume), the chapters finished.
import { useEffect, useState } from 'react'
import { getStory, putStory, type StorySave } from '../shared/save'

export const SLOT = 'auto'

export function emptySave(): StorySave { return { slot: SLOT, chapter: '', beat: 0, at: 0, done: [], flags: {} } }

export async function loadSave(): Promise<StorySave> { return (await getStory(SLOT)) ?? emptySave() }

/** Record where the player is; `finished` marks the chapter done (and clears the resume point). */
export async function saveBeat(chapter: number, beat: number, finished: boolean) {
  const s = await loadSave()
  const done = new Set(s.done)
  if (finished) done.add(`ch${chapter}`)
  await putStory({ ...s, chapter: finished ? '' : String(chapter), beat: finished ? 0 : beat, at: Date.now(), done: [...done] })
}

export function useSave() {
  const [save, setSave] = useState<StorySave | null>(null)
  useEffect(() => { let on = true; loadSave().then((s) => { if (on) setSave(s) }); return () => { on = false } }, [])
  return save
}
