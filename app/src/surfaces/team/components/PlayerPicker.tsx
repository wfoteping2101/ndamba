// Bottom sheet to choose who plays in a slot of the lineup board.
import { Check, CircleSlash } from 'lucide-react'
import type { LineupSlot, Player } from '../../../lib/types'
import { formationSlots } from '../../../lib/formations'
import { skillAvg } from '../../../lib/actions'
import { Modal } from '../../../ui'
import { useT } from '../../../i18n'
import { cx } from '../../../lib/util'
import { fitScore, isSuggested } from './lineup'
import { AvgBar, NumberBadge } from './bits'

export function PlayerPicker({ open, onClose, slotId, format, formation, lineup, subs, players, onPick }: {
  open: boolean; onClose: () => void; slotId?: string; format: number; formation: string
  lineup: LineupSlot[]; subs: string[]; players: Player[]; onPick: (playerId: string | undefined) => void
}) {
  const { t } = useT('team')
  const slots = formationSlots(format, formation)
  const slot = slots.find((s) => s.id === slotId)
  if (!slot) return null
  const pos = t(`common:positions.${slot.role}`)
  const current = lineup.find((l) => l.slot === slot.id)?.playerId
  const ranked = [...players].sort((a, b) => fitScore(b, slot.role) - fitScore(a, slot.role) || skillAvg(b) - skillAvg(a))
  const suggested = ranked.filter((p) => isSuggested(p, slot.role))
  const others = ranked.filter((p) => !isSuggested(p, slot.role))
  const statusOf = (p: Player) => {
    const s = lineup.find((l) => l.playerId === p.id)
    if (s) { const sl = slots.find((x) => x.id === s.slot); return { kind: 'starter' as const, text: s.slot === slot.id ? t('picker.current') : t('picker.starter', { pos: t(`posShort.${sl?.role ?? 'CM'}`) }) } }
    if (subs.includes(p.id)) return { kind: 'sub' as const, text: t('picker.sub') }
    return { kind: 'out' as const, text: t('picker.out') }
  }
  const row = (p: Player) => {
    const st = statusOf(p)
    const isCur = p.id === current
    return (
      <li key={p.id}>
        <button type="button" onClick={() => { onPick(p.id); onClose() }} aria-pressed={isCur}
          className={cx('flex min-h-[56px] w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition', isCur ? 'bg-forest-50 ring-1 ring-forest-300' : 'hover:bg-sand/70')}>
          <NumberBadge player={p} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-ink">{p.name}</span>
            <span className="flex items-center gap-2 text-[12px] text-ink-muted">
              <span>{t(`common:positions.${p.position}`)}</span>
              <span className={cx('rounded px-1.5 py-px text-[10.5px] font-semibold', st.kind === 'starter' ? 'bg-forest-50 text-forest-700' : st.kind === 'sub' ? 'bg-sun-50 text-sun-700' : 'bg-sand text-ink-muted')}>{st.text}</span>
            </span>
          </span>
          <AvgBar value={skillAvg(p)} className="hidden min-[360px]:inline-flex" />
          {isCur && <Check size={18} className="shrink-0 text-forest-600" />}
        </button>
      </li>
    )
  }
  return (
    <Modal open={open} onClose={onClose} title={t('picker.title', { pos })}
      footer={current ? (
        <button type="button" className="btn-ghost mr-auto text-clay-600" onClick={() => { onPick(undefined); onClose() }}>
          <CircleSlash size={17} />{t('picker.clear')}
        </button>
      ) : undefined}>
      {players.length === 0 ? <p className="py-4 text-sm text-ink-muted">{t('picker.noPlayers')}</p> : (
        <div className="-mx-2">
          {suggested.length > 0 && <>
            <h3 className="mb-1 px-2 font-sans text-[13px] font-semibold tracking-normal text-forest-700">{t('picker.suggested')}</h3>
            <ul className="mb-3 space-y-0.5">{suggested.map(row)}</ul>
          </>}
          {others.length > 0 && <>
            <h3 className="mb-1 px-2 text-xs font-semibold text-ink-muted">{t('picker.others')}</h3>
            <ul className="mb-3 space-y-0.5">{others.map(row)}</ul>
          </>}
        </div>
      )}
    </Modal>
  )
}
