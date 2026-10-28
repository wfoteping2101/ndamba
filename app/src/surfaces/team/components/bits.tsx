// Small visual pieces shared by the team pages.
import { useEffect, useState, type ReactNode } from 'react'
import { Check, Copy, Minus, Plus } from 'lucide-react'
import { Modal } from '../../../ui'
import type { MatchStatus, Player } from '../../../lib/types'
import { useT } from '../../../i18n'
import { cx, fmtDate, parseISODate } from '../../../lib/util'
import { initials, fmtAvg } from './lineup'

/** Shirt-number badge. Keepers wear gold, like on the lineup board (pale gold in lists, full gold on the big plate). */
export function NumberBadge({ player, size = 'md' }: { player: Pick<Player, 'number' | 'name' | 'position'>; size?: 'sm' | 'md' | 'lg' }) {
  const gk = player.position === 'GK'
  const dim = size === 'lg' ? 'h-16 w-16 text-3xl rounded-[14px]' : size === 'sm' ? 'h-8 w-8 text-[13px] rounded-lg' : 'h-10 w-10 text-[17px] rounded-xl'
  const hasNo = player.number !== undefined && player.number !== null
  const tone = size === 'lg' ? (gk ? 'bg-sun-500 text-night-900' : 'bg-forest-600 text-cream') : (gk ? 'bg-sun-100 text-ink' : 'bg-forest-50 text-forest-700')
  return (
    <span aria-hidden="true" className={cx('inline-flex shrink-0 items-center justify-center font-display tabular-nums',
      dim, tone, !hasNo && 'text-[0.7em]')}>
      {hasNo ? player.number : initials(player.name)}
    </span>
  )
}

/** Competence average on the 1 to 4 scale, as a slim bar with the value. */
export function AvgBar({ value, className }: { value: number; className?: string }) {
  const { t, lang } = useT('team')
  if (!value) return <span className={cx('text-[11px] text-ink-faint', className)}>{t('roster.notRated')}</span>
  const pct = Math.max(0, Math.min(100, (value / 4) * 100))
  const tone = value >= 3.25 ? 'bg-forest-600' : value >= 2.5 ? 'bg-forest-500' : value >= 1.75 ? 'bg-forest-300' : 'bg-clay-300'
  return (
    <span className={cx('inline-flex items-center gap-2', className)} role="img" aria-label={t('roster.avgAria', { v: fmtAvg(value, lang) })}>
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-sand">
        <span className={cx('absolute inset-y-0 left-0 rounded-full', tone)} style={{ width: `${pct}%` }} />
        {[25, 50, 75].map((x) => <span key={x} className="absolute inset-y-0 w-px bg-paper" style={{ left: `${x}%` }} />)}
      </span>
      <span className="w-7 text-right text-[13px] font-semibold tabular-nums text-ink-soft">{fmtAvg(value, lang)}</span>
    </span>
  )
}

export function DateBlock({ iso, dark = false }: { iso: string; dark?: boolean }) {
  const { lang } = useT('team')
  const d = parseISODate(iso)
  return (
    <div className={cx('flex w-14 shrink-0 flex-col items-center rounded-xl py-1.5 text-center', dark ? 'bg-white/10 text-cream' : 'bg-sand text-ink')}>
      <span className={cx('text-[11px] font-semibold', dark ? 'text-cream/70' : 'text-ink-muted')}>{fmtDate(iso, lang, { weekday: 'short' }).replace('.', '')}</span>
      <span className="font-display text-2xl leading-none tabular-nums">{d.getDate()}</span>
      <span className={cx('text-[11px] font-medium', dark ? 'text-cream/80' : 'text-ink-muted')}>{fmtDate(iso, lang, { month: 'short' }).replace('.', '')}</span>
    </div>
  )
}

export function StatusBadge({ status, toScore = false, className }: { status: MatchStatus; toScore?: boolean; className?: string }) {
  const { t } = useT('team')
  if (toScore) return <span className={cx('inline-flex items-center gap-1 rounded-full bg-sun-50 px-2 py-0.5 text-[11px] font-semibold text-sun-700', className)}>{t('matches.status.toScore')}</span>
  if (status === 'live') return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full bg-clay-500 px-2 py-0.5 text-[11px] font-semibold text-white', className)}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />{t('matches.status.live')}
    </span>
  )
  if (status === 'done') return <span className={cx('inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-ink-soft', className)}>{t('matches.status.done')}</span>
  return <span className={cx('inline-flex items-center rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-semibold text-forest-700', className)}>{t('matches.status.planned')}</span>
}

const njangiColor = (v: number) => (v < 35 ? '#D7263D' : v < 50 ? '#E8798A' : v < 65 ? '#73B391' : v < 80 ? '#13804F' : '#0B5D3B')

/** Indice Njangi as a small ring (0 to 100). */
export function NjangiDial({ value, size = 48, label }: { value: number; size?: number; label?: string }) {
  const r = 20, c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value)) / 100
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label ?? ''} ${Math.round(value * 10) / 10}/100`.trim()}>
      <svg viewBox="0 0 48 48" width={size} height={size} className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#ECEFE8" strokeWidth="5" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={njangiColor(value)} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
      </svg>
      <span className="absolute font-sans font-semibold tabular-nums text-ink" style={{ fontSize: size >= 60 ? 19 : 15 }}>{Math.round(value)}</span>
    </span>
  )
}

export function ConfirmModal({ open, title, body, confirm, onConfirm, onClose }: { open: boolean; title: string; body: ReactNode; confirm: string; onConfirm: () => void; onClose: () => void }) {
  const { t } = useT('team')
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button><button type="button" className="btn-danger" onClick={onConfirm}>{confirm}</button></>}>
      <p className="text-[15px] text-ink-soft">{body}</p>
    </Modal>
  )
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true } catch {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok
    } catch { return false }
  }
}

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const { t } = useT('team')
  const [done, setDone] = useState(false)
  useEffect(() => { if (!done) return; const id = setTimeout(() => setDone(false), 1800); return () => clearTimeout(id) }, [done])
  return (
    <button type="button" className={cx('btn-outline', className)} onClick={async () => setDone(await copyText(text))} aria-live="polite">
      {done ? <Check size={17} className="text-forest-600" /> : <Copy size={17} />}{done ? t('share.copied') : t('share.copy')}
    </button>
  )
}

/** Accessible stepper for small integers (goals, minutes). */
export function Stepper({ value, onChange, min = 0, max = 99, step = 1, lessLabel, moreLabel, big = false }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; lessLabel: string; moreLabel: string; big?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" className={cx('btn-outline !px-0', big ? 'h-12 w-12 text-xl' : 'h-11 w-11')} aria-label={lessLabel} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}><Minus size={big ? 20 : 17} /></button>
      <span className={cx('min-w-[2.5ch] text-center font-display tabular-nums', big ? 'text-5xl' : 'text-xl')} aria-live="polite">{value}</span>
      <button type="button" className={cx('btn-outline !px-0', big ? 'h-12 w-12 text-xl' : 'h-11 w-11')} aria-label={moreLabel} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}><Plus size={big ? 20 : 17} /></button>
    </div>
  )
}
