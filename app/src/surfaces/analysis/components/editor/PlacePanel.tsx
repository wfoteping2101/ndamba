// « Placer sur le terrain »: after a code, one tap on the mini-pitch gives its place (attack always left to right,
// our frame), one tap on a shirt number gives the player, and for a completed pass « Reçue par » gives the receiver.
// Everything is optional: coding the next action, Échap or « Passer » moves on. Digits type a shirt number.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { ArrowRight, Check, Users } from 'lucide-react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import type { Player } from '../../../../lib/types'
import { colorOf, fmtT, labelKey, type Coded, type Roster } from './model'

type Step = 'who' | 'to'

export function PlacePanel({ target, roster, onPlace, onPlayer, onReceiver, onClose }: {
  target: Coded | null
  roster: Roster
  onPlace: (x: number, y: number) => void
  onPlayer: (id: string | undefined) => void
  onReceiver: (id: string | undefined) => void
  onClose: () => void
}) {
  const { t } = useT('editor')
  const [all, setAll] = useState(false)
  const [typed, setTyped] = useState('')
  const [manual, setManual] = useState<Step | null>(null)
  const timer = useRef(0)
  const isPass = target?.code === 'PASS_OK' && target.side === 'us'
  const ours = target ? target.side === 'us' && target.code !== 'NOTE' : false
  const list = all ? [...roster.on, ...roster.others] : roster.on
  // the strip asks « Qui ? » first, then « Reçue par » for a completed pass (a tap on the tabs changes it)
  const auto: Step = isPass && target?.playerId && !target.toPlayerId ? 'to' : 'who'
  const step: Step = isPass && manual ? manual : auto
  useEffect(() => { setManual(null); setTyped('') }, [target?.id])

  const pick = (id: string) => {
    if (!target) return
    if (step === 'to') onReceiver(id === target.toPlayerId ? undefined : id)
    else { onPlayer(id === target.playerId ? undefined : id); if (isPass && manual === 'who') setManual(null) }
  }
  const live = useRef({ target, step, typed, pick, onClose })
  live.current = { target, step, typed, pick, onClose }

  // digits type a shirt number for the strip that is waiting; Enter closes, Échap skips
  useEffect(() => {
    if (!target) return
    const commit = (num: string) => {
      const p = [...roster.on, ...roster.others].find((x) => String(x.number) === num)
      if (p) live.current.pick(p.id)
      setTyped('')
    }
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (!ours) { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); live.current.onClose() } return }
      const d = /^(Digit|Numpad)(\d)$/.exec(e.code)?.[2]
      if (d != null) {
        e.preventDefault(); e.stopImmediatePropagation()
        const next = (live.current.typed + d).slice(-2)
        setTyped(next)
        window.clearTimeout(timer.current)
        if (next.length >= 2) commit(next)
        else timer.current = window.setTimeout(() => commit(next), 650)
        return
      }
      if (e.key === 'Backspace' && live.current.typed) { e.preventDefault(); e.stopImmediatePropagation(); setTyped(''); return }
      if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); if (live.current.typed) { window.clearTimeout(timer.current); commit(live.current.typed) } else live.current.onClose(); return }
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setTyped(''); live.current.onClose() }
    }
    window.addEventListener('keydown', k, true)
    return () => { window.removeEventListener('keydown', k, true); window.clearTimeout(timer.current) }
  }, [target?.id, ours, roster]) // eslint-disable-line react-hooks/exhaustive-deps

  // a code tapped low in the pad: bring the place panel back into view so the tap on the pitch is obvious
  const box = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!target || !box.current) return
    const r = box.current.getBoundingClientRect()
    if (r.top < 70 || r.bottom > window.innerHeight - 20) box.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [target?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (e: RPointerEvent<SVGSVGElement>) => {
    if (!target) return
    const b = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - b.left) / b.width) * 1000) / 10
    const y = Math.round(((e.clientY - b.top) / b.height) * 1000) / 10
    onPlace(Math.max(0.5, Math.min(99.5, x)), Math.max(0.5, Math.min(99.5, y)))
  }
  const color = target ? colorOf(target.code, target.side) : '#F5B700'
  const byId = (id?: string) => (id ? [...roster.on, ...roster.others].find((p) => p.id === id) : undefined)
  const num = (p?: Player) => (p ? String(p.number ?? p.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2)) : '')
  const value = step === 'to' ? target?.toPlayerId : target?.playerId

  return (
    <section ref={box} className={cx('rounded-card border bg-paper p-2.5', target ? 'border-forest-300' : 'border-line')} aria-label={t('place.title')}>
      <div className="flex min-h-[34px] items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink" aria-live="polite">
          {target ? t('place.for', { what: t(labelKey(target.code, target.side)), t: fmtT(target.t) }) : t('place.idle')}
        </span>
        {target && <button type="button" onClick={onClose} className="btn-ghost btn-sm min-h-[34px] px-2">{target.x != null || target.playerId ? <><Check size={15} />{t('place.done')}</> : t('place.skip')}</button>}
      </div>
      <div className={cx('mt-1 grid grid-cols-[minmax(0,46%)_minmax(0,1fr)] gap-2.5 transition-opacity', !target && 'opacity-45')}>
        <div>
          <svg viewBox="0 0 105 68" className={cx('block w-full touch-none rounded-[8px]', target ? 'cursor-crosshair' : 'cursor-default')} onPointerDown={tap} role="img" aria-label={t('place.pitch')}>
            <rect width="105" height="68" fill="#0B5D3B" />
            {[0, 2, 4, 6, 8].map((i) => <rect key={i} x={i * 10.5 + 5.25} width="5.25" height="68" fill="#084B30" opacity=".35" />)}
            <g fill="none" stroke="#F6F7F2" strokeOpacity=".75" strokeWidth=".55">
              <rect x="1" y="1" width="103" height="66" />
              <line x1="52.5" y1="1" x2="52.5" y2="67" />
              <circle cx="52.5" cy="34" r="9.15" />
              <rect x="1" y="13.85" width="16.5" height="40.3" />
              <rect x="87.5" y="13.85" width="16.5" height="40.3" />
              <rect x="1" y="24.84" width="5.5" height="18.32" />
              <rect x="98.5" y="24.84" width="5.5" height="18.32" />
            </g>
            {target?.x != null && target.y != null && (
              <g>
                <circle cx={(target.x / 100) * 105} cy={(target.y / 100) * 68} r="4" fill={color} fillOpacity=".3" />
                <circle cx={(target.x / 100) * 105} cy={(target.y / 100) * 68} r="2.1" fill={color} stroke="#061710" strokeWidth=".6" />
              </g>
            )}
          </svg>
          <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-ink-muted"><span>{t('place.attack')}</span><ArrowRight size={12} aria-hidden="true" /></div>
        </div>
        <div className="min-w-0">
          {ours && target ? (
            <>
              <div className="flex gap-1" role="tablist" aria-label={t('place.who')}>
                {(isPass ? (['who', 'to'] as Step[]) : (['who'] as Step[])).map((s) => {
                  const chosen = byId(s === 'to' ? target.toPlayerId : target.playerId)
                  return (
                    <button key={s} type="button" role="tab" aria-selected={step === s} onClick={() => setManual(s)}
                      className={cx('inline-flex min-h-[30px] min-w-0 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold', step === s ? 'bg-forest-50 text-forest-700 ring-1 ring-forest-300' : 'text-ink-muted hover:bg-sand')}>
                      <span className="truncate">{t(s === 'to' ? 'place.to' : 'place.who')}</span>
                      {chosen && <b className="tabular-nums text-ink">{num(chosen)}</b>}
                    </button>
                  )
                })}
                {typed && <span className="ml-auto self-center rounded-md bg-sun-50 px-1.5 text-[12px] font-bold tabular-nums text-sun-800">{typed}</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label={t(step === 'to' ? 'place.to' : 'place.who')}>
                {(step === 'to' ? list.filter((p) => p.id !== target.playerId) : list).map((p) => (
                  <button key={p.id} type="button" onClick={() => pick(p.id)} aria-pressed={value === p.id} title={p.name}
                    className={cx('grid h-9 min-w-[36px] place-items-center rounded-full border px-1 text-[13px] font-bold tabular-nums transition',
                      value === p.id ? 'border-forest-600 bg-forest-600 text-white' : 'border-line bg-paper text-ink hover:border-ink-faint')}>
                    {num(p)}
                  </button>
                ))}
              </div>
              {roster.others.length > 0 && (
                <button type="button" onClick={() => setAll((v) => !v)} aria-pressed={all} className="mt-1 inline-flex min-h-[32px] items-center gap-1.5 text-[12px] font-semibold text-forest-700">
                  <Users size={13} />{all ? t('place.onlyPitch') : t('place.wholeSquad')}
                </button>
              )}
            </>
          ) : (
            <p className="pt-1 text-[12.5px] leading-snug text-ink-muted">{target ? t('place.them') : t('place.idleBody')}</p>
          )}
        </div>
      </div>
      {target && <p className="mt-1 hidden text-[11.5px] leading-snug text-ink-faint lg:block">{ours ? t('place.keys') : t('place.keysThem')}{ours && roster.inferred ? ` ${t('place.inferred')}.` : ''}</p>}
    </section>
  )
}
