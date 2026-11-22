// Shared pieces of the pickup pages: live data, clock, organiser plan, badges and small controls.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, Copy, Lock } from 'lucide-react'
import { db } from '../../../lib/db'
import { useLiveQuery } from '../../../lib/hooks'
import { PICKUP } from '../../../lib/config'
import type { PickupGame, PickupGroup, PickupPlayer, PickupRating, PickupTier } from '../../../lib/types'
import { cx, fcfa, money, parseISODate, fmtDate } from '../../../lib/util'
import { useT } from '../../../i18n'
import {
  hhmm, hostAccess, needsSettle, playerStats, readHostPlan, settleGame, writeHostPlan,
  type HostPlan, type PickupRsvpX, type PlayerStats,
} from '../../../lib/pickup'

export const SW = 1.75

/* ---------------- Clock and data ---------------- */

/** The current time, refreshed every interval (offers, check-in windows). */
export function useNow(intervalMs = 20000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

export interface GroupData { group: PickupGroup; players: PickupPlayer[]; games: PickupGame[]; rsvps: PickupRsvpX[]; ratings: PickupRating[] }

/** Everything of one group, live. undefined while loading, null when the group does not exist. */
export function useGroupData(groupId: string | undefined) {
  return useLiveQuery(async () => {
    if (!groupId) return null
    const group = await db.pickupGroups.get(groupId)
    if (!group) return null
    const [players, games] = await Promise.all([
      db.pickupPlayers.where('groupId').equals(groupId).toArray(),
      db.pickupGames.where('groupId').equals(groupId).toArray(),
    ])
    const ids = games.map((g) => g.id)
    const [rsvps, ratings] = ids.length
      ? await Promise.all([db.pickupRsvps.where('gameId').anyOf(ids).toArray(), db.pickupRatings.where('gameId').anyOf(ids).toArray()])
      : [[], []]
    players.sort((a, b) => a.nickname.localeCompare(b.nickname))
    return { group, players, games, rsvps: rsvps as PickupRsvpX[], ratings } as GroupData
  }, [groupId], undefined as GroupData | null | undefined)
}

/** Stats of every member of the group. */
export function useStats(data: GroupData | null | undefined, now: number) {
  const minute = Math.floor(now / 60000) // the clock only matters at minute scale here
  return useMemo(() => {
    const m = new Map<string, PlayerStats>()
    if (!data) return m
    const at = minute * 60000
    for (const p of data.players) m.set(p.id, playerStats(p.id, data.games, data.rsvps, data.ratings, { now: at }))
    return m
  }, [data, minute])
}

/** After the check-in window: no-shows get their flag, offers close. Runs on the pages that show the games. */
export function useSettle(data: GroupData | null | undefined, now: number) {
  useEffect(() => {
    if (!data) return
    for (const g of data.games) if (needsSettle(g, data.rsvps, now)) void settleGame(g.id, now)
  }, [data, now])
}

/* ---------------- Organiser plan (demonstration) ---------------- */

export function useHostPlan() {
  const [plan, setPlan] = useState<HostPlan>(() => readHostPlan())
  useEffect(() => {
    const f = () => setPlan(readHostPlan())
    window.addEventListener('njangi-pickup-plan', f)
    window.addEventListener('storage', f)
    return () => { window.removeEventListener('njangi-pickup-plan', f); window.removeEventListener('storage', f) }
  }, [])
  const access = hostAccess(plan)
  return { plan, ...access, set: (p: HostPlan) => writeHostPlan(p) }
}

/** Organiser tools behind the plan: shows the tool when the plan or the trial is active, a quiet card otherwise. */
export function PlanGate({ children, what }: { children: ReactNode; what: string }) {
  const { t, lang } = useT('pickup')
  const host = useHostPlan()
  if (host.active) return <>{children}</>
  const expired = host.plan.kind === 'trial'
  return (
    <div className="rounded-card border border-line bg-paper px-5 py-6 text-center sm:px-8">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-forest-50 text-forest-600"><Lock size={19} strokeWidth={SW} aria-hidden="true" /></div>
      <h3 className="text-[17px] text-ink">{t('plan.gateTitle', { what })}</h3>
      <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-muted">
        {expired ? t('plan.gateExpired') : t('plan.gateBody', { days: PICKUP.trialDays, month: money(PICKUP.hostUsdMonth, lang) })}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {!expired && <button type="button" className="btn-primary" onClick={() => host.set({ kind: 'trial', start: new Date().toISOString() })}>{t('plan.startTrial', { days: PICKUP.trialDays })}</button>}
        {expired && <button type="button" className="btn-primary" onClick={() => host.set({ kind: 'month', start: new Date().toISOString() })}>{t('plan.chooseMonth')}</button>}
      </div>
      <p className="mx-auto mt-3 max-w-md text-[12.5px] text-ink-muted">{t('plan.demoNote')}</p>
    </div>
  )
}

/** The organiser plan card: price, trial, what it unlocks, and the honest demonstration note. */
export function PlanCard() {
  const { t, lang } = useT('pickup')
  const host = useHostPlan()
  const kind = host.plan.kind
  const start = (k: HostPlan['kind']) => host.set({ kind: k, start: new Date().toISOString() })
  const items = ['payments', 'season', 'teams', 'coadmins', 'groups'] as const
  return (
    <section className="rounded-panel border border-line bg-paper p-5 sm:p-6" aria-labelledby="plan-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="plan-h" className="text-[19px] text-ink">{t('plan.title')}</h2>
          <p className="mt-1 text-[14px] text-ink-muted">{t('plan.players')}</p>
        </div>
        {host.active && kind === 'trial' && <span className="inline-flex items-center rounded-full bg-forest-50 px-3 py-1 text-[12.5px] font-semibold text-forest-700">{t('plan.trialLeft', { count: host.daysLeft ?? 0 })}</span>}
        {(kind === 'month' || kind === 'year') && <span className="inline-flex items-center rounded-full bg-forest-600 px-3 py-1 text-[12.5px] font-semibold text-white">{t(kind === 'month' ? 'plan.activeMonth' : 'plan.activeYear')}</span>}
        {kind === 'trial' && !host.active && <span className="inline-flex items-center rounded-full bg-sand px-3 py-1 text-[12.5px] font-semibold text-ink-soft">{t('plan.trialOver')}</span>}
      </div>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="num font-display text-[30px] leading-none text-ink">{money(PICKUP.hostUsdMonth, lang)}</span>
        <span className="text-[14px] text-ink-muted">{t('plan.perMonth')}</span>
        <span className="text-[14px] text-ink-muted">{t('plan.orYear', { price: money(PICKUP.hostUsdYear, lang) })}</span>
      </div>
      <p className="mt-1 text-[13px] text-ink-muted">{t('plan.fcfa', { price: fcfa(PICKUP.hostUsdMonth, lang) })}</p>
      <ul className="mt-4 space-y-2">
        {items.map((k) => (
          <li key={k} className="flex gap-2.5 text-[14.5px] leading-snug text-ink-soft">
            <Check size={17} strokeWidth={2} className="mt-0.5 shrink-0 text-forest-600" aria-hidden="true" />
            <span>{t(`plan.unlock.${k}`, { n: PICKUP.freeGroupsPerPlayer })}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        {kind === 'none' && <button type="button" className="btn-primary" onClick={() => start('trial')}>{t('plan.startTrial', { days: PICKUP.trialDays })}</button>}
        {kind === 'trial' && (
          <>
            <button type="button" className="btn-primary" onClick={() => start('month')}>{t('plan.chooseMonth')}</button>
            <button type="button" className="btn-outline" onClick={() => start('year')}>{t('plan.chooseYear')}</button>
          </>
        )}
        {kind !== 'none' && <button type="button" className="btn-ghost" onClick={() => host.set({ kind: 'none' })}>{t(kind === 'trial' ? 'plan.stopTrial' : 'plan.stop')}</button>}
      </div>
      <p className="mt-3 text-[12.5px] leading-snug text-ink-muted">{t('plan.demoNote')}</p>
    </section>
  )
}

/* ---------------- Badges and small pieces ---------------- */

const TIER_DOT: Record<PickupTier, string> = { bronze: '#B87333', silver: '#9AA5A0', gold: '#F5B700' }

export function TierBadge({ tier, className }: { tier: PickupTier | null | undefined; className?: string }) {
  const { t } = useT('pickup')
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12px] font-semibold leading-4',
      tier === 'gold' ? 'bg-sun-100 text-ink' : tier ? 'bg-sand text-ink-soft' : 'border border-line text-ink-muted', className)}>
      {tier && <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: TIER_DOT[tier] }} />}
      {t(`tier.${tier ?? 'none'}`)}
    </span>
  )
}

export function Avatar({ name, size = 40, me = false, guest = false }: { name: string; size?: number; me?: boolean; guest?: boolean }) {
  const parts = name.replace(/[«»"]/g, '').trim().split(/\s+/)
  const ini = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? '')).toUpperCase()
  return (
    <span aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cx('inline-grid shrink-0 place-items-center rounded-full font-display leading-none',
        me ? 'bg-forest-600 text-white' : guest ? 'border border-dashed border-ink-faint bg-paper text-ink-muted' : 'bg-forest-50 text-forest-700')}>
      {ini}
    </span>
  )
}

export function DateTile({ iso, dark = false, className }: { iso: string; dark?: boolean; className?: string }) {
  const { lang } = useT('pickup')
  const d = parseISODate(iso)
  return (
    <div className={cx('flex w-14 shrink-0 flex-col items-center rounded-xl py-1.5 text-center', dark ? 'bg-white/10 text-cream' : 'bg-sand text-ink', className)}>
      <span className={cx('text-[11px] font-semibold', dark ? 'text-cream/75' : 'text-ink-muted')}>{fmtDate(iso, lang, { weekday: 'short' }).replace('.', '')}</span>
      <span className="num font-display text-[22px] leading-none">{d.getDate()}</span>
      <span className={cx('text-[11px] font-medium', dark ? 'text-cream/80' : 'text-ink-muted')}>{fmtDate(iso, lang, { month: 'short' }).replace('.', '')}</span>
    </div>
  )
}

export function ResultPill({ r }: { r: 'W' | 'D' | 'L' | null }) {
  const { t } = useT('pickup')
  if (!r) return null
  const cls = r === 'W' ? 'bg-forest-50 text-forest-700' : r === 'L' ? 'bg-clay-50 text-clay-700' : 'bg-sand text-ink-soft'
  return <span className={cx('inline-flex min-w-[24px] justify-center rounded-full px-2 py-[2px] text-[11.5px] font-semibold', cls)}>{t(`card.res.${r}`)}</span>
}

export function CopyButton({ text, label, className, small = true }: { text: string; label: string; className?: string; small?: boolean }) {
  const { t } = useT('pickup')
  const [done, setDone] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch { /* nothing more to try */ }
      ta.remove()
    }
    setDone(true); window.setTimeout(() => setDone(false), 1800)
  }
  return (
    <button type="button" onClick={copy} className={cx('btn-outline', small && 'btn-sm', className)} aria-live="polite">
      {done ? <Check size={15} strokeWidth={2} aria-hidden="true" /> : <Copy size={15} strokeWidth={SW} aria-hidden="true" />}
      {done ? t('common.copied') : label}
    </button>
  )
}

/** A number with - and + buttons (44 px targets). */
export function Stepper({ value, onChange, min = 0, max = 99, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <button type="button" className="grid h-11 w-11 place-items-center rounded-control border border-line bg-paper text-[20px] text-ink hover:bg-sand disabled:opacity-40" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label} -1`}>-</button>
      <span className="num w-12 text-center font-display text-[28px] leading-none text-ink" aria-live="polite">{value}</span>
      <button type="button" className="grid h-11 w-11 place-items-center rounded-control border border-line bg-paper text-[20px] text-ink hover:bg-sand disabled:opacity-40" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label} +1`}>+</button>
    </div>
  )
}

/* ---------------- Formatting ---------------- */

export const hhmmOf = (iso: string) => hhmm(iso)

export function pct(v: number | null | undefined, lang: 'fr' | 'en') {
  if (v === null || v === undefined) return ''
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { style: 'percent', maximumFractionDigits: 0 }).format(v)
}
export function dec(v: number, lang: 'fr' | 'en', digits = 1) {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)
}
/** Weekday name (0 Sunday .. 6 Saturday). */
export function dayName(dow: number, lang: 'fr' | 'en') {
  return new Date(2026, 0, 4 + dow).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long' })
}
export function longDate(iso: string, lang: 'fr' | 'en') {
  const s = fmtDate(iso, lang, { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
