// Voice to text with the browser's own speech recognition, when there is one (Chrome on Android, Edge, Safari).
// Nothing is installed and nothing leaves the page unless the browser itself sends audio to its service.
import { useCallback, useEffect, useRef, useState } from 'react'

interface RecResult { isFinal: boolean; 0: { transcript: string } }
interface RecEvent { resultIndex: number; results: ArrayLike<RecResult> }
interface Recognizer {
  lang: string; interimResults: boolean; continuous: boolean
  start(): void; stop(): void; abort(): void
  onresult: ((e: RecEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error?: string }) => void) | null
}
type RecCtor = new () => Recognizer

function getCtor(): RecCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function useDictation(lang: 'fr' | 'en', onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<Recognizer | null>(null)
  const cb = useRef(onFinal)
  cb.current = onFinal
  const supported = !!getCtor()

  const stop = useCallback(() => { try { rec.current?.stop() } catch { /* already stopped */ } }, [])
  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) return
    try { rec.current?.abort() } catch { /* none */ }
    const r = new Ctor()
    r.lang = lang === 'fr' ? 'fr-FR' : 'en-US'
    r.interimResults = true
    r.continuous = true
    r.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        const text = res[0]?.transcript ?? ''
        if (res.isFinal) cb.current(text.trim())
        else live += text
      }
      setInterim(live)
    }
    r.onerror = (e) => { setError(e.error ?? 'error'); setListening(false) }
    r.onend = () => { setListening(false); setInterim('') }
    rec.current = r
    setError(null)
    try { r.start(); setListening(true) } catch { setListening(false) }
  }, [lang])

  useEffect(() => () => { try { rec.current?.abort() } catch { /* none */ } }, [])
  return { supported, listening, interim, error, start, stop }
}
