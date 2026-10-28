// Small UI pieces of the home page and the player space.
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Award, X } from 'lucide-react'
import { Field } from '../../../ui'
import { useT } from '../../../i18n'
import { createTeam } from '../../../lib/actions'
import { cx } from '../../../lib/util'
import type { Team } from '../../../lib/types'

/* ---------- toast ---------- */

export interface ToastMsg { text: string; to?: string; href?: string; action?: string; onAction?: () => void }

/** A small confirmation that sits above the mobile tab bar. */
export function useToast() {
  const [msg, setMsg] = useState<ToastMsg | null>(null)
  const timer = useRef<number>()
  const toast = useCallback((m: ToastMsg) => {
    setMsg(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 5000)
  }, [])
  const node = (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8" aria-live="polite">
      {msg && (
        <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-night-800 px-4 py-3 text-sm text-cream shadow-lift">
          <span className="min-w-0 flex-1">{msg.text}</span>
          {msg.to && msg.action && <Link to={msg.to} className="shrink-0 font-semibold text-sun-300 underline underline-offset-4" onClick={() => setMsg(null)}>{msg.action}</Link>}
          {msg.href && msg.action && <a href={msg.href} className="shrink-0 font-semibold text-sun-300 underline underline-offset-4">{msg.action}</a>}
          {msg.onAction && msg.action && <button type="button" className="min-h-[36px] shrink-0 font-semibold text-sun-300 underline underline-offset-4" onClick={() => { msg.onAction?.(); setMsg(null) }}>{msg.action}</button>}
        </div>
      )}
    </div>
  )
  return { toast, toastNode: node }
}

/* ---------- level up ---------- */

export function LevelUpBanner({ level, onClose }: { level: number | null; onClose: () => void }) {
  const { t } = useT('player')
  if (level === null) return null
  return (
    <div className="fixed inset-x-0 top-16 z-50 flex justify-center px-4 lg:top-6" role="status">
      <div className="flex max-w-md items-center gap-3 rounded-[14px] border border-line bg-paper px-4 py-3 shadow-lift">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-night-800 text-sun-300"><Award size={20} strokeWidth={1.75} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">{t('levelUp.title', { n: level + 1 })}</div>
          <div className="text-sm text-ink-soft">{t('levelUp.body', { name: t(`levels.${level}.name`) })}</div>
        </div>
        <button type="button" className="btn-ghost btn-sm h-11 w-11 shrink-0 justify-center p-0" onClick={onClose} aria-label={t('common:actions.close')}><X size={18} /></button>
      </div>
    </div>
  )
}

/* ---------- create a team ---------- */

const AGES = ['U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'U21', 'Seniors', 'Pro']
const FORMATS: Team['format'][] = [5, 7, 8, 9, 11]

/** One small form: the first step for a coach without a team. */
export function CreateTeamCard({ compact = false, senior = false, className }: { compact?: boolean; senior?: boolean; className?: string }) {
  const { t } = useT('player')
  const [name, setName] = useState('')
  const [age, setAge] = useState('U13')
  const [format, setFormat] = useState<Team['format']>(11)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(!compact)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try { await createTeam({ name: name.trim(), ageGroup: age, format }) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className={cx('rounded-[22px] border border-line bg-paper p-5 sm:p-6', className)}>
      <div className="min-w-0">
        <h2 className="text-[20px] text-ink">{senior ? t('perf.team.title') : compact ? t('team.playerTitle') : t('team.title')}</h2>
        <p className="mt-1 max-w-xl text-[14.5px] text-ink-muted">{senior ? t('perf.team.body') : compact ? t('team.playerBody') : t('team.body')}</p>
      </div>
      {open ? (
        <>
          <div className="mt-4 grid gap-x-3 sm:grid-cols-[2fr_1fr_1fr]">
            <Field label={t('team.name')} htmlFor="pt-name"><input id="pt-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('team.namePh')} required /></Field>
            <Field label={t('team.age')} htmlFor="pt-age"><select id="pt-age" className="input" value={age} onChange={(e) => setAge(e.target.value)}>{AGES.map((a) => <option key={a} value={a}>{a === 'Pro' ? t('team.pro') : a}</option>)}</select></Field>
            <Field label={t('team.format')} htmlFor="pt-format"><select id="pt-format" className="input" value={format} onChange={(e) => setFormat(Number(e.target.value) as Team['format'])}>{FORMATS.map((f) => <option key={f} value={f}>{f} {t('common:app.vs')} {f}</option>)}</select></Field>
          </div>
          <button type="submit" className="btn-primary min-h-[44px]" disabled={!name.trim() || busy}>{t('team.create')}</button>
        </>
      ) : (
        <button type="button" className="btn-outline btn-sm mt-3 min-h-[44px]" onClick={() => setOpen(true)}>{t('team.open')}</button>
      )}
    </form>
  )
}

/* ---------- match-week labels ---------- */

/** "MD-3, durée" (common:md) as its code and its name, so the code can sit in a tag and the name in the text. */
export function mdParts(t: (k: string) => string, md: string) {
  const full = t(`common:md.${md}`)
  const [code, ...rest] = full.split(/\s*[,·]\s*/)
  const name = rest.join(' ')
  return { code: md === 'youth' ? full : code, name: name ? name.charAt(0).toUpperCase() + name.slice(1) : '', full }
}

/* ---------- section heading ---------- */

export function SectionHead({ id, headingId, eyebrow, title, action, children }: { id?: string; headingId?: string; eyebrow?: string; title: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <div id={id} className="mb-5 flex scroll-mt-24 flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13.5px] font-semibold text-forest-600 first-letter:uppercase">{eyebrow}</div>}
        <h2 id={headingId} className="text-[24px] leading-tight text-ink sm:text-[28px]">{title}</h2>
        {children && <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{children}</p>}
      </div>
      {action}
    </div>
  )
}
