import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Check, ChevronDown, Clock, Droplets, Eye, Footprints, Repeat2, Target, Wind, CircleDot } from 'lucide-react'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import { nowISO, todayISO, uid, cx } from '../../../lib/util'
import { Badge } from '../../../ui'
import { challengeText, reached, xpGain, type Challenge, type ChallengeKind } from '../challenges'

export const KIND_ICON: Record<ChallengeKind, ReactNode> = {
  ballon: <CircleDot size={18} strokeWidth={1.75} />,
  conduite: <Footprints size={18} strokeWidth={1.75} />,
  mur: <Repeat2 size={18} strokeWidth={1.75} />,
  yeux: <Eye size={18} strokeWidth={1.75} />,
  finition: <Target size={18} strokeWidth={1.75} />,
  physique: <Wind size={18} strokeWidth={1.75} />,
}
/** Three families on the pitch: the ball (green), the eyes (night), the body (red earth). */
export const KIND_TONE: Record<ChallengeKind, string> = {
  ballon: 'bg-forest-50 text-forest-700',
  conduite: 'bg-forest-50 text-forest-700',
  mur: 'bg-forest-50 text-forest-700',
  finition: 'bg-forest-50 text-forest-700',
  yeux: 'bg-night-800 text-cream',
  physique: 'bg-terra-50 text-terra-700',
}

interface Props {
  challenge: Challenge
  todayBest?: number
  daily?: boolean
  compact?: boolean
  /** Kept for older call sites; the three challenges of the day are not a sequence, so no number is shown. */
  index?: number
  /** DOM id of the card (for #anchors); defaults to defi-<id>. */
  anchorId?: string
  onLogged?: (xp: number) => void
  /** "row": a line of the library list that opens in place. */
  variant?: 'card' | 'row'
}

/** One solo challenge: what to do, the target, and a field to write down today's result. */
export default function ChallengeCard({ challenge: c, todayBest, daily = false, compact = false, anchorId, onLogged, variant = 'card' }: Props) {
  const { t, lang } = useT('player')
  const tx = challengeText(c, lang)
  const row = variant === 'row'
  const [open, setOpen] = useState(!compact && !row)
  const done = todayBest !== undefined
  const hit = done && reached(c, todayBest!)
  const unit = t(`units.${c.unit}`)
  const id = anchorId ?? `defi-${c.id}`
  const { hash } = useLocation()
  // a link to this very challenge (#defi-...) opens it
  useEffect(() => { if (hash === `#${id}`) setOpen(true) }, [hash, id])
  const target = c.better === 'lower' ? t('challenge.targetLower', { n: c.target, unit }) : t('challenge.targetHigher', { n: c.target, unit })
  const mark = done && (
    <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full', hit ? 'bg-sun-500 text-ink' : 'bg-forest-600 text-cream')} title={hit ? t('challenge.hit') : t('challenge.done')}>
      <Check size={16} strokeWidth={2.5} aria-label={hit ? t('challenge.hit') : t('challenge.done')} />
    </span>
  )

  if (row) return (
    <li id={id} className="scroll-mt-24">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={`${id}-body`}
        className="flex min-h-[64px] w-full items-center gap-3.5 px-4 py-3 text-left transition hover:bg-cream/70 sm:px-5">
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full', KIND_TONE[c.kind])} aria-hidden="true">{KIND_ICON[c.kind]}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15.5px] font-semibold leading-snug text-ink">{tx.title}</span>
          <span className="block text-[13.5px] text-ink-muted">{t('challenge.rowMeta', { target, minutes: c.minutes, skill: t(`common:skills.${c.skill}`) })}</span>
        </span>
        {mark}
        <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" className={cx('shrink-0 text-ink-faint transition', open && 'rotate-180')} />
      </button>
      {open && <div id={`${id}-body`} className="px-4 pb-5 sm:pl-[74px] sm:pr-5"><Body c={c} tx={tx} todayBest={todayBest} daily={daily} onLogged={onLogged} inputId={`log-${id}`} /></div>}
    </li>
  )

  return (
    <article id={id} className={cx('relative flex scroll-mt-24 flex-col overflow-hidden rounded-[18px] border bg-paper', hit ? 'border-sun-500' : 'border-line')}>
      <div className="flex items-start gap-3.5 p-5">
        <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-full', KIND_TONE[c.kind])} aria-hidden="true">{KIND_ICON[c.kind]}</span>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge><Clock size={11} aria-hidden="true" />{t('challenge.minutes', { n: c.minutes })}</Badge>
            <Badge tone="forest">{t(`common:skills.${c.skill}`)}</Badge>
          </div>
          <h3 className="text-[19px] leading-snug text-ink">{tx.title}</h3>
          <p className="mt-1 text-[14px] text-ink-muted"><span className="font-semibold text-ink-soft">{t('challenge.target')}</span> {target}</p>
        </div>
        {mark}
      </div>
      {open ? (
        <div id={`${id}-body`} className="mt-auto px-5 pb-5"><Body c={c} tx={tx} todayBest={todayBest} daily={daily} onLogged={onLogged} inputId={`log-${id}`} /></div>
      ) : (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-5 pb-5">
          <span className="text-[13px] text-ink-muted">{done ? t('challenge.todayBest', { n: todayBest, unit }) : daily ? t('challenge.xpHintDaily') : ''}</span>
          <button type="button" className="btn-outline btn-sm min-h-[44px] px-4" onClick={() => setOpen(true)} aria-expanded={open} aria-controls={`${id}-body`}>{t('challenge.howTo')}</button>
        </div>
      )}
    </article>
  )
}

/** How to do it, the tip, the gear, then the result to write down. */
function Body({ c, tx, todayBest, daily, onLogged, inputId }: { c: Challenge; tx: ReturnType<typeof challengeText>; todayBest?: number; daily: boolean; onLogged?: (xp: number) => void; inputId: string }) {
  const { t } = useT('player')
  const [value, setValue] = useState('')
  const [flash, setFlash] = useState<number | null>(null)
  const done = todayBest !== undefined
  const hit = done && reached(c, todayBest!)
  const unit = t(`units.${c.unit}`)

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
    <div className="space-y-4">
      <p className="text-[15.5px] leading-relaxed text-ink-soft">{tx.how}</p>
      <p className="border-l-2 border-terra-300 pl-3 text-[14.5px] leading-relaxed text-ink-soft"><span className="font-semibold text-ink">{t('challenge.tip')}</span> {tx.tip}</p>
      <div className="flex flex-wrap gap-1.5">
        {c.gear.length === 0 && <span className="chip">{t('gear.none')}</span>}
        {c.gear.map((g) => <span key={g} className="chip">{t(`gear.${g}`)}</span>)}
        {c.kind === 'physique' && <span className="chip"><Droplets size={12} aria-hidden="true" />{t('gear.water')}</span>}
      </div>
      <form onSubmit={log} className="rounded-[14px] bg-cream p-3.5">
        <label htmlFor={inputId} className="mb-1.5 block text-[14px] font-semibold text-ink-soft">{tx.score}</label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input id={inputId} type="number" inputMode="decimal" min={0} step="any" className="input h-11 pr-16" value={value} onChange={(e) => setValue(e.target.value)} placeholder={String(c.target)} />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-muted">{unit}</span>
          </div>
          <button type="submit" className="btn-primary h-11 shrink-0 px-4" disabled={value === ''}>{t('challenge.log')}</button>
        </div>
        <div className="mt-2 flex min-h-[22px] flex-wrap items-center justify-between gap-2 text-[13px]" aria-live="polite">
          {done ? <span className="text-ink-muted">{t('challenge.todayBest', { n: todayBest, unit })}{hit && <>{', '}<span className="font-semibold text-ink">{t('challenge.hit').toLowerCase()}</span></>}</span> : <span className="text-ink-muted">{daily ? t('challenge.xpHintDaily') : t('challenge.xpHint')}</span>}
          {flash !== null && <span className="rounded-full bg-night-800 px-2.5 py-0.5 font-semibold text-sun-300">{flash > 0 ? t('challenge.xpWon', { n: flash }) : t('challenge.saved')}</span>}
        </div>
      </form>
      <Link to={`/app/joueur/lecons#lecon-${c.lesson}`} className="inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-medium text-forest-600 hover:underline">
        <BookOpen size={15} strokeWidth={1.75} aria-hidden="true" />{t('challenge.lesson', { n: c.lesson })}
      </Link>
    </div>
  )
}
