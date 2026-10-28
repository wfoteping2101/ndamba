// Small shared pieces of the Parcours (journey), the Observer and the attendance sheet.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useLiveQuery } from '../../../../lib/hooks'
import { loadJourney, type JourneyData, type Level } from '../../../../lib/journey'
import type { ObsTone, SkillKey } from '../../../../lib/types'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'

/** Live journey of one player (undefined while loading, null when the player does not exist). */
export function useJourney(playerId: string | undefined) {
  return useLiveQuery(async () => (playerId ? loadJourney(playerId) : null), [playerId], undefined as JourneyData | null | undefined)
}

export const toneText: Record<ObsTone, string> = { plus: 'text-forest-700', work: 'text-terra-700' }
export const toneChip: Record<ObsTone, string> = { plus: 'border-forest-100 bg-forest-50 text-forest-700', work: 'border-terra-100 bg-terra-50 text-terra-700' }
export const toneSolid: Record<ObsTone, string> = { plus: 'border-forest-600 bg-forest-600 text-cream', work: 'border-terra-500 bg-terra-500 text-white' }

/** Four pips for a level of the chapter 25 grid. */
export function LevelPips({ level, className, light = false }: { level?: number; className?: string; light?: boolean }) {
  return (
    <span className={cx('inline-flex items-end gap-[3px]', className)} aria-hidden="true">
      {[1, 2, 3, 4].map((l) => (
        <span key={l} className={cx('w-[5px] rounded-sm', level && l <= level ? (light ? 'bg-sun-300' : 'bg-forest-600') : light ? 'bg-white/20' : 'bg-line')} style={{ height: 4 + l * 3 }} />
      ))}
    </span>
  )
}

/** A competence as a small chip, coloured by tone when it comes from an observation. */
export function SkillChip({ skill, tone, className }: { skill: SkillKey; tone?: ObsTone; className?: string }) {
  const { t } = useT('journey')
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold', tone ? toneChip[tone] : 'border-line bg-paper text-ink-soft', className)}>
      {tone && <span aria-hidden="true">{tone === 'plus' ? '+' : '·'}</span>}
      {t(`team:skillsShort.${skill}`)}
      {tone && <span className="sr-only">{t(`tone.${tone}`)}</span>}
    </span>
  )
}

/** Rating of an observation, 1 to 5, as dots. */
export function RatingDots({ value, className }: { value: number; className?: string }) {
  const { t } = useT('journey')
  return (
    <span className={cx('inline-flex items-center gap-[3px]', className)} role="img" aria-label={t('observe.ratingAria', { n: value })}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={cx('h-1.5 w-1.5 rounded-full', i <= value ? 'bg-sun-500' : 'bg-line')} />)}
    </span>
  )
}

/** Level badge: the number in a square and the grid name. */
export function LevelTag({ level, className }: { level?: Level; className?: string }) {
  const { t } = useT('journey')
  if (!level) return <span className={cx('text-[12px] text-ink-faint', className)}>{t('team:levels.0')}</span>
  return (
    <span className={cx('inline-flex items-center gap-1.5', className)}>
      <span className="grid h-6 w-6 place-items-center rounded-md bg-forest-600 font-display text-[13px] font-semibold text-cream">{level}</span>
      <span className="text-[12.5px] font-semibold text-ink-soft">{t(`team:levels.${level}`)}</span>
    </span>
  )
}

/** A quoted remark: « like this » in French, “like this” in English. */
export const quote = (text: string, lang: 'fr' | 'en') => (lang === 'fr' ? `« ${text} »` : `“${text}”`)

/** Minutes as "1 234 min". */
export const fmtMinutes = (n: number, lang: 'fr' | 'en') => `${n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')} min`
export const fmtPct = (v: number, lang: 'fr' | 'en') => {
  const n = Math.round(v * 100).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')
  return lang === 'fr' ? `${n} %` : `${n}%`
}
export const fmtDec = (v: number, lang: 'fr' | 'en', digits = 1) => v.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** A tiny toast with an optional action (undo). */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; action?: string; onAction?: () => void; n: number } | null>(null)
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const toast = useCallback((m: { text: string; action?: string; onAction?: () => void }) => {
    window.clearTimeout(timer.current)
    setMsg({ ...m, n: Date.now() })
    timer.current = window.setTimeout(() => setMsg(null), m.action ? 5000 : 2600)
  }, [])
  const node = msg ? (
    <div key={msg.n} role="status" aria-live="polite" className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-[60] flex justify-center px-4 lg:bottom-8">
      <div className="flex max-w-md items-center gap-3 rounded-2xl bg-night-800 py-2.5 pl-4 pr-2 text-sm text-cream shadow-lift">
        <Check size={16} className="shrink-0 text-sun-300" aria-hidden="true" />
        <span className="min-w-0 flex-1">{msg.text}</span>
        {msg.action && <button type="button" className="min-h-[40px] rounded-xl px-3 font-semibold text-sun-300 hover:bg-white/10" onClick={() => { msg.onAction?.(); setMsg(null) }}>{msg.action}</button>}
      </div>
    </div>
  ) : null
  return { toast, toastNode: node }
}

/** Section heading used inside the journey cards. */
export function CardHead({ id, title, hint, action, icon }: { id?: string; title: string; hint?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div className="min-w-0">
        <h2 id={id} className="flex items-center gap-2 font-display text-lg font-semibold text-ink">{icon}{title}</h2>
        {hint && <p className="mt-0.5 text-[13px] text-ink-muted">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export function Spinner() {
  return <div className="grid min-h-[40vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">{children}</Link>
}
