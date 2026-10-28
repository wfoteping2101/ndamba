import { useEffect, useRef, useState } from 'react'
import { Check, CalendarDays, LoaderCircle, RotateCcw, SendHorizontal } from 'lucide-react'
import { MolaMark } from '../../../ui/brand'
import { useT } from '../../../i18n'
import { cx } from '../../../lib/util'

const STEPS = ['a', 'b', 'c', 'd'] as const

/** A scripted Mola conversation: the request types itself, then the steps tick one by one. */
export default function MolaChat({ onOpen }: { onOpen?: () => void }) {
  const { t, lang } = useT('site')
  const request = t('landing.mola.chat.user')
  const ref = useRef<HTMLDivElement>(null)
  const [typed, setTyped] = useState(0) // characters typed
  const [phase, setPhase] = useState(0) // 0 typing, 1 sent, 2 ack, 3..6 steps done, 7 summary
  const [run, setRun] = useState(0)
  const [visible, setVisible] = useState(false)

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // start when the card scrolls into view
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect() } }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // restart when the language changes
  useEffect(() => { setTyped(0); setPhase(0) }, [lang])

  useEffect(() => {
    if (!visible) return
    if (reduced) { setTyped(request.length); setPhase(7); return }
    if (phase === 0) {
      if (typed < request.length) { const id = setTimeout(() => setTyped((n) => n + 1), typed === 0 ? 500 : 34); return () => clearTimeout(id) }
      const id = setTimeout(() => setPhase(1), 450); return () => clearTimeout(id)
    }
    if (phase < 7) { const id = setTimeout(() => setPhase((p) => p + 1), phase === 1 ? 650 : phase === 2 ? 700 : 900); return () => clearTimeout(id) }
  }, [visible, typed, phase, request, reduced, run])

  const replay = () => { setTyped(0); setPhase(0); setRun((r) => r + 1) }
  const working = phase >= 2 && phase < 7

  return (
    <div ref={ref} className="overflow-hidden rounded-[28px] border border-line bg-paper shadow-lift">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-forest-600 text-sun-300"><MolaMark size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[17px] font-semibold leading-tight text-ink">{t('landing.mola.chat.name')}</div>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className={cx('h-1.5 w-1.5 rounded-full', working ? 'bg-sun-500 motion-safe:animate-pulse' : 'bg-ok-500')} />
            {phase >= 7 ? t('landing.mola.chat.statusDone') : t('landing.mola.chat.status')}
          </div>
        </div>
        {phase >= 7 && !reduced && (
          <button type="button" onClick={replay} className="btn-ghost btn-sm min-h-[40px]" aria-label={t('landing.mola.chat.replay')}>
            <RotateCcw size={15} /><span className="hidden sm:inline">{t('landing.mola.chat.replay')}</span>
          </button>
        )}
      </div>

      {/* conversation */}
      <div className="min-h-[360px] space-y-3 bg-cream/60 px-4 py-5 sm:min-h-[380px]" aria-live="polite">
        {phase >= 1 && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-forest-600 px-4 py-2.5 text-[15px] text-cream">{request}</div>
          </div>
        )}
        {phase >= 2 && (
          <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-paper px-4 py-3 shadow-card">
            <p className="text-[15px] text-ink">{t('landing.mola.chat.ack')}</p>
            <ul className="mt-2.5 space-y-2">
              {STEPS.map((s, i) => {
                const done = phase >= 3 + i
                const active = phase === 2 + i && !done
                if (!done && !active) return null
                return (
                  <li key={s} className="flex items-start gap-2.5 text-[14px]">
                    <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full', done ? 'bg-forest-600 text-cream' : 'bg-sand text-ink-muted')}>
                      {done ? <Check size={12} strokeWidth={3} /> : <LoaderCircle size={12} className="motion-safe:animate-spin" />}
                    </span>
                    <span className={done ? 'text-ink-soft' : 'text-ink-muted'}>{t(`landing.mola.chat.steps.${s}`)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        {phase >= 7 && (
          <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-paper px-4 py-3 shadow-card">
            <p className="text-[15px] text-ink">{t('landing.mola.chat.done')}</p>
            <button type="button" onClick={onOpen} className="btn-primary btn-sm mt-2.5 min-h-[40px]"><CalendarDays size={15} />{t('landing.mola.chat.open')}</button>
          </div>
        )}
      </div>

      {/* composer */}
      <div className="flex items-center gap-2 border-t border-line bg-paper px-3 py-3">
        <div className={cx('min-h-[44px] flex-1 truncate rounded-2xl border border-line bg-white px-3.5 py-2.5 text-[15px]', phase === 0 && typed > 0 ? 'text-ink' : 'text-ink-faint')} aria-hidden="true">
          {phase === 0 && typed > 0 ? <>{request.slice(0, typed)}<span className="ml-px inline-block h-4 w-[2px] translate-y-[3px] bg-forest-600 motion-safe:animate-pulse" /></> : t('landing.mola.chat.input')}
        </div>
        <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-full', phase === 0 && typed >= request.length ? 'bg-forest-600 text-cream' : 'bg-sand text-ink-faint')} aria-hidden="true"><SendHorizontal size={18} /></span>
      </div>
    </div>
  )
}
