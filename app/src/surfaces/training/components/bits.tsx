// Small UI pieces shared by the training pages.
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Crown, X } from 'lucide-react'
import { Badge, Modal } from '../../../ui'
import { useT } from '../../../i18n'
import { GATES } from '../../../lib/config'
import { cx } from '../../../lib/util'
import type { Intention, MD, Session } from '../../../lib/types'
import { INTENSITY_COLOR, INTENSITY_FACTOR, MD_CHIP, blockIntensity, blockTitle, type Intensity } from './helpers'

/* ---------- badges ---------- */

export function MdBadge({ md, className }: { md: MD; className?: string }) {
  const { t } = useT('training')
  return (
    <span title={t(`mdName.${md}`)} className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums', MD_CHIP[md] ?? 'bg-sand text-ink-soft', className)}>
      {md === 'youth' ? t('common:md.youth') : md}
    </span>
  )
}

const REFLEXES: Intention[] = ['reprendre', 'regarder-devant']
export function IntentionBadge({ i }: { i: Intention }) {
  const { t } = useT('training')
  return (
    <span title={t(`common:intentionsHint.${i}`)} className="inline-flex">
      <Badge tone={REFLEXES.includes(i) ? 'neutral' : 'forest'}>{t(`common:intentions.${i}`)}</Badge>
    </span>
  )
}
export function IntentionBadges({ list, max = 3 }: { list: Intention[]; max?: number }) {
  const shown = list.slice(0, max)
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((i) => <IntentionBadge key={i} i={i} />)}
      {list.length > max && <Badge>+{list.length - max}</Badge>}
    </span>
  )
}

/** Four little bars: how hard the drill is. Colour plus a text label, never colour alone. */
export function IntensityMeter({ level, showLabel = true }: { level: Intensity; showLabel?: boolean }) {
  const { t } = useT('training')
  const n = INTENSITY_FACTOR[level]
  return (
    <span className="inline-flex items-center gap-1.5" title={`${t('intensity')}${t('colon')}${t(`common:intensity.${level}`)}`}>
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        {[1, 2, 3, 4].map((k) => (
          <span key={k} className="w-[4px] rounded-[1px]" style={{ height: 4 + k * 2.5, background: k <= n ? INTENSITY_COLOR[level] : '#DCE2D8' }} />
        ))}
      </span>
      <span className={showLabel ? 'text-xs text-ink-muted' : 'sr-only'}>{t(`common:intensity.${level}`)}</span>
    </span>
  )
}

/* ---------- diagrams ---------- */

/** Placeholder used when a block has no diagram (free block or drill not written yet). */
export function NoDiagram({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cx('grid aspect-[4/3] w-full place-items-center rounded-xl border border-dashed border-line bg-sand/60 px-2 text-center text-[12px] font-semibold text-ink-faint', className)}>
      {label}
    </div>
  )
}

/* ---------- session intensity profile ---------- */

/** One column per block: width = minutes, height = intensity. The shape of the session at a glance. */
export function IntensityProfile({ session, height = 56, labels = false, interactive = false }: { session: Session; height?: number; labels?: boolean; interactive?: boolean }) {
  const { t, lang } = useT('training')
  const [hover, setHover] = useState<number | null>(null)
  const total = session.blocks.reduce((a, b) => a + (Number(b.minutes) || 0), 0)
  if (!session.blocks.length || !total) return <div className="rounded-md bg-sand" style={{ height: Math.max(6, height / 4) }} aria-hidden="true" />
  return (
    <div className="relative">
      <div className="flex items-end gap-[2px]" style={{ height }} role={interactive ? 'list' : undefined} aria-hidden={interactive ? undefined : true}>
        {session.blocks.map((b, i) => {
          const lvl = blockIntensity(b, session.md)
          const f = INTENSITY_FACTOR[lvl]
          const label = `${i + 1}. ${blockTitle(b, lang)}${t('colon')}${b.minutes} min, ${t(`common:intensity.${lvl}`)}`
          return (
            <div key={b.id} role={interactive ? 'listitem' : undefined} tabIndex={interactive ? 0 : undefined} aria-label={interactive ? label : undefined}
              onPointerEnter={() => interactive && setHover(i)} onPointerLeave={() => interactive && setHover(null)} onFocus={() => interactive && setHover(i)} onBlur={() => interactive && setHover(null)}
              className="relative flex h-full min-w-[6px] flex-col justify-end rounded-t-[4px] focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500" style={{ flexGrow: Number(b.minutes) || 1, flexBasis: 0 }}>
              <div className={cx('w-full rounded-t-[4px] transition-opacity', hover !== null && hover !== i && 'opacity-60')} style={{ height: `${(f / 4) * 100}%`, background: INTENSITY_COLOR[lvl] }} />
            </div>
          )
        })}
      </div>
      {labels && (
        <div className="mt-1 flex gap-[2px]" aria-hidden="true">
          {session.blocks.map((b, i) => <div key={b.id} className="min-w-[6px] truncate text-center text-[10px] font-semibold text-ink-faint" style={{ flexGrow: Number(b.minutes) || 1, flexBasis: 0 }}>{i + 1}</div>)}
        </div>
      )}
      {interactive && hover !== null && session.blocks[hover] && (
        <div className="pointer-events-none absolute -top-2 left-1/2 z-10 w-max max-w-[240px] -translate-x-1/2 -translate-y-full rounded-lg bg-night-800 px-2.5 py-1.5 text-xs text-cream shadow-lift">
          <div className="font-semibold">{session.blocks[hover].minutes} min, {t(`common:intensity.${blockIntensity(session.blocks[hover], session.md)}`).toLowerCase()}</div>
          <div className="truncate text-cream/75">{hover + 1}. {blockTitle(session.blocks[hover], lang)}</div>
        </div>
      )}
    </div>
  )
}

export function IntensityLegend() {
  const { t } = useT('training')
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-muted">
      {(Object.keys(INTENSITY_COLOR) as Intensity[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: INTENSITY_COLOR[k] }} />{t(`common:intensity.${k}`)} ×{INTENSITY_FACTOR[k]}</span>
      ))}
    </div>
  )
}

/* ---------- feedback ---------- */

export interface ToastMsg { text: string; to?: string; action?: string }
export function useToast() {
  const { t } = useT('training')
  const [msg, setMsg] = useState<ToastMsg | null>(null)
  useEffect(() => { if (!msg) return; const id = setTimeout(() => setMsg(null), 4500); return () => clearTimeout(id) }, [msg])
  const node = msg ? (
    <div className="no-print fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-6" role="status" aria-live="polite">
      <div className="flex max-w-md items-center gap-3 rounded-2xl bg-night-800 px-4 py-3 text-sm text-cream shadow-lift">
        <span>{msg.text}</span>
        {msg.to && <Link to={msg.to} className="shrink-0 font-semibold text-sun-300 underline underline-offset-4">{msg.action}</Link>}
        <button type="button" onClick={() => setMsg(null)} className="-mr-1 rounded-lg p-1 text-cream/70 hover:text-cream" aria-label={t('common:actions.close')}><X size={16} /></button>
      </div>
    </div>
  ) : null
  return { toast: setMsg, toastNode: node }
}

export function ConfirmModal({ open, title, body, confirm, danger, onConfirm, onClose }: { open: boolean; title: string; body: ReactNode; confirm: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  const { t } = useT('training')
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button><button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose() }}>{confirm}</button></>}>
      <div className="text-[15px] text-ink-soft">{body}</div>
    </Modal>
  )
}

/** Gentle upgrade card for the free plan (never shown on paid plans or the demo). */
export function UpgradeCard({ compact = false }: { compact?: boolean }) {
  const { t } = useT('training')
  return (
    <div className="rounded-2xl border border-sun-300 bg-sun-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sun-500 text-ink"><Crown size={20} /></div>
        <div className="min-w-0">
          <h3 className="font-display text-lg text-ink">{t('upgrade.title', { n: GATES.sessionsFree })}</h3>
          <p className="mt-1 text-sm text-ink-soft">{t('upgrade.body')}</p>
          {!compact && <p className="mt-1 text-sm text-ink-muted">{t('upgrade.free')}</p>}
          <Link to="/app/premium" className="btn-sun btn-sm mt-3">{t('upgrade.cta')}</Link>
        </div>
      </div>
    </div>
  )
}
