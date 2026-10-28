import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Check, Clock, Droplets, Eye, Flame, Footprints, Repeat2, Target, Wind, CircleDot } from 'lucide-react'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import { nowISO, todayISO, uid, cx } from '../../../lib/util'
import { Badge } from '../../../ui'
import { challengeText, reached, xpGain, type Challenge, type ChallengeKind } from '../challenges'

export const KIND_ICON: Record<ChallengeKind, ReactNode> = {
  ballon: <CircleDot size={18} />,
  conduite: <Footprints size={18} />,
  mur: <Repeat2 size={18} />,
  yeux: <Eye size={18} />,
  finition: <Target size={18} />,
  physique: <Wind size={18} />,
}
export const KIND_TONE: Record<ChallengeKind, string> = {
  ballon: 'bg-sun-50 text-sun-700',
  conduite: 'bg-terra-50 text-terra-700',
  mur: 'bg-forest-50 text-forest-700',
  yeux: 'bg-[#E9EDF3] text-[#3D4F6B]',
  finition: 'bg-clay-50 text-clay-700',
  physique: 'bg-sand text-ink-soft',
}

interface Props {
  challenge: Challenge
  todayBest?: number
  daily?: boolean
  compact?: boolean
  index?: number
  /** DOM id of the card (for #anchors); defaults to defi-<id>. */
  anchorId?: string
  onLogged?: (xp: number) => void
}

/** One solo challenge: what to do, the target, and a field to write down today's result. */
export default function ChallengeCard({ challenge: c, todayBest, daily = false, compact = false, index, anchorId, onLogged }: Props) {
  const { t, lang } = useT('player')
  const tx = challengeText(c, lang)
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(!compact)
  const [flash, setFlash] = useState<number | null>(null)
  const done = todayBest !== undefined
  const hit = done && reached(c, todayBest!)
  const unit = t(`units.${c.unit}`)
  const inputId = `log-${anchorId ?? c.id}`
  const { hash } = useLocation()
  // a link to this very challenge (#defi-...) opens it
  useEffect(() => { if (hash === `#${anchorId ?? `defi-${c.id}`}`) setOpen(true) }, [hash, anchorId, c.id])

  async function log(e: React.FormEvent) {
    e.preventDefault()
    const v = Number(String(value).replace(',', '.'))
    if (!Number.isFinite(v) || v < 0) return
    const xp = xpGain(c, todayBest, v, daily)
    await db.challenges.put({ id: uid('cl_'), challengeId: c.id, date: todayISO(), value: v, createdAt: nowISO() })
    setValue('')
    setFlash(xp)
    onLogged?.(xp)
    window.setTimeout(() => setFlash(null), 2600)
  }

  return (
    <article id={anchorId ?? `defi-${c.id}`} className={cx('card relative flex scroll-mt-24 flex-col overflow-hidden', hit && 'ring-2 ring-sun-300')}>
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', KIND_TONE[c.kind])}>{KIND_ICON[c.kind]}</span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {index !== undefined && <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-terra-600">{t('challenge.number', { n: index + 1 })}</span>}
            <Badge tone="neutral"><Clock size={11} />{t('challenge.minutes', { n: c.minutes })}</Badge>
            <Badge tone="forest">{t(`common:skills.${c.skill}`)}</Badge>
          </div>
          <h3 className="font-display text-[19px] font-semibold leading-snug text-ink">{tx.title}</h3>
          <p className="mt-1 text-sm text-ink-muted">
            <span className="font-semibold text-ink-soft">{t('challenge.target')}</span> {c.better === 'lower' ? t('challenge.targetLower', { n: c.target, unit }) : t('challenge.targetHigher', { n: c.target, unit })}
          </p>
        </div>
        {done && (
          <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', hit ? 'bg-sun-500 text-ink' : 'bg-forest-600 text-cream')} title={hit ? t('challenge.hit') : t('challenge.done')}>
            <Check size={18} aria-label={hit ? t('challenge.hit') : t('challenge.done')} />
          </span>
        )}
      </div>

      {open && (
        <div className="space-y-3 px-4 pb-1 sm:px-5">
          <p className="text-[15px] leading-6 text-ink-soft">{tx.how}</p>
          <p className="rounded-xl bg-sand/70 px-3 py-2 text-sm text-ink-soft"><span className="font-semibold text-ink">{t('challenge.tip')}</span> {tx.tip}</p>
          <div className="flex flex-wrap gap-1.5">
            {c.gear.length === 0 && <span className="chip">{t('gear.none')}</span>}
            {c.gear.map((g) => <span key={g} className="chip">{t(`gear.${g}`)}</span>)}
            {c.kind === 'physique' && <span className="chip"><Droplets size={12} />{t('gear.water')}</span>}
          </div>
        </div>
      )}

      {!open ? (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-4 pb-4 sm:px-5">
          <span className="text-xs text-ink-muted">{done ? t('challenge.todayBest', { n: todayBest, unit }) : daily ? t('challenge.xpHintDaily') : ''}</span>
          <button type="button" className="btn-outline btn-sm min-h-[44px]" onClick={() => setOpen(true)} aria-expanded={open} aria-controls={`${inputId}-body`}>{t('challenge.howTo')}</button>
        </div>
      ) : (
      <div id={`${inputId}-body`} className="mt-auto px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <form onSubmit={log} className="rounded-2xl border border-line bg-cream/60 p-3">
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-soft">{tx.score}</label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <input id={inputId} type="number" inputMode="decimal" min={0} step="any" className="input h-11 pr-16" value={value} onChange={(e) => setValue(e.target.value)} placeholder={String(c.target)} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">{unit}</span>
            </div>
            <button type="submit" className="btn-primary h-11 shrink-0" disabled={value === ''}>{t('challenge.log')}</button>
          </div>
          <div className="mt-2 flex min-h-[20px] flex-wrap items-center justify-between gap-2 text-xs" aria-live="polite">
            {done ? <span className="text-ink-muted">{t('challenge.todayBest', { n: todayBest, unit })}{hit && <> · <span className="font-semibold text-sun-700">{t('challenge.hit')}</span></>}</span> : <span className="text-ink-faint">{daily ? t('challenge.xpHintDaily') : t('challenge.xpHint')}</span>}
            {flash !== null && <span className="inline-flex items-center gap-1 rounded-full bg-sun-100 px-2 py-0.5 font-semibold text-sun-700"><Flame size={12} />{flash > 0 ? t('challenge.xpWon', { n: flash }) : t('challenge.saved')}</span>}
          </div>
        </form>
        <Link to={`/app/joueur/lecons#lecon-${c.lesson}`} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-forest-600 hover:underline">
          <BookOpen size={14} />{t('challenge.lesson', { n: c.lesson })}
        </Link>
      </div>
      )}
    </article>
  )
}
