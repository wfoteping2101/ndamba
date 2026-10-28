import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import { cx } from '../../../lib/util'

/** The message box: grows with the text, Enter sends, Shift+Enter makes a new line. */
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
  return (
    <form onSubmit={submit} className={cx('flex items-end gap-2', className)}>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <div className="min-w-0 flex-1">
        <textarea id={id} ref={ref} rows={multiline ? 3 : 1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
          placeholder={placeholder} enterKeyHint="send" autoComplete="off"
          className="block max-h-[220px] min-h-[46px] w-full resize-none rounded-2xl border border-line bg-white px-4 py-[11px] text-[15px] leading-6 text-ink placeholder:text-ink-faint focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-100" />
        {hint && <p className="mt-1 px-1 text-[11px] text-ink-faint">{hint}</p>}
      </div>
      <button type="submit" aria-label={sendLabel} disabled={!text.trim() || disabled}
        className={cx('mb-px grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full transition', text.trim() && !disabled ? 'bg-forest-600 text-cream hover:bg-forest-700' : 'bg-sand text-ink-faint')}>
        <SendHorizontal size={19} aria-hidden="true" />
      </button>
    </form>
  )
}
