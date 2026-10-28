import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import { cx } from '../../../lib/util'

/** The message box: one field with the send button inside. Grows with the text, Enter sends, Shift+Enter makes a new line. */
export default function Composer({ onSend, placeholder, label, sendLabel, autoFocus, multiline = false, disabled, hint, className, id = 'mola-input', prefill }: {
  onSend: (text: string) => void; placeholder: string; label: string; sendLabel: string; autoFocus?: boolean; multiline?: boolean; disabled?: boolean; hint?: string; className?: string; id?: string
  /** Text to put in the box (not sent), e.g. from /app/mola?q=... ; n changes on each new prefill. */
  prefill?: { text: string; n: number }
}) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!prefill) return
    setText(prefill.text)
    const el = ref.current
    if (el) { el.focus({ preventScroll: true }); requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length)) }
  }, [prefill])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, multiline ? 220 : 132)}px`
  }, [text, multiline])
  useEffect(() => { if (autoFocus) ref.current?.focus({ preventScroll: true }) }, [autoFocus])

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const v = text.trim()
    if (!v || disabled) return
    onSend(v)
    setText('')
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !(multiline && !e.metaKey && !e.ctrlKey)) { e.preventDefault(); submit() }
  }
  const ready = !!text.trim() && !disabled
  return (
    <form onSubmit={submit} className={className}>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <div className="flex items-end gap-1.5 rounded-[14px] border border-line bg-white py-1 pl-3.5 pr-1 transition focus-within:border-forest-500 focus-within:ring-2 focus-within:ring-forest-100">
        <textarea id={id} ref={ref} rows={multiline ? 3 : 1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
          placeholder={placeholder} enterKeyHint="send" autoComplete="off"
          className="block max-h-[220px] min-h-[42px] min-w-0 flex-1 resize-none bg-transparent py-[9px] text-[15.5px] leading-6 text-ink placeholder:text-ink-faint focus:outline-none focus-visible:outline-none" />
        <button type="submit" aria-label={sendLabel} disabled={!ready}
          className={cx('mb-[3px] grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] transition', ready ? 'bg-forest-600 text-cream hover:bg-forest-700' : 'bg-sand text-ink-faint')}>
          <ArrowUp size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
      {hint && <p className="mt-1 px-1 text-[12px] text-ink-muted">{hint}</p>}
    </form>
  )
}
