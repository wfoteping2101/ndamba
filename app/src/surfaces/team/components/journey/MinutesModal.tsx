// Playing time of a played match, player by player. Without a record, starters count the whole match.
import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Modal } from '../../../../ui'
import { useT } from '../../../../i18n'
import { matchLength, minutesOf, saveMinutes } from '../../../../lib/journey'
import type { Match, Player } from '../../../../lib/types'
import { NumberBadge } from '../bits'
import { byNumber } from '../lineup'

export function MinutesModal({ open, onClose, match, players }: { open: boolean; onClose: () => void; match: Match; players: Player[] }) {
  const { t } = useT('journey')
  const full = matchLength(match)
  const byId = new Map(players.map((p) => [p.id, p]))
  const starters = match.lineup.map((l) => l.playerId).filter((id): id is string => !!id && byId.has(id)).map((id) => byId.get(id)!).sort(byNumber)
  const subs = match.subs.filter((id) => byId.has(id)).map((id) => byId.get(id)!).sort(byNumber)
  const [mins, setMins] = useState<Record<string, number>>({})
  useEffect(() => {
    if (!open) return
    const m: Record<string, number> = {}
    for (const p of [...starters, ...subs]) m[p.id] = minutesOf({ ...match, status: 'done' }, p.id)
    setMins(m)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (id: string, v: number) => setMins((cur) => ({ ...cur, [id]: Math.max(0, Math.min(full + 30, Math.round(v))) }))
  const save = async () => { await saveMinutes(match.id, mins); onClose() }
  const row = (p: Player) => (
    <li key={p.id} className="flex items-center gap-2 px-3 py-2">
      <NumberBadge player={p} size="sm" />
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{p.name}</span>
      <button type="button" className="btn-outline h-10 w-10 !px-0" aria-label={t('minutes.less', { name: p.name })} onClick={() => set(p.id, (mins[p.id] ?? 0) - 5)}><Minus size={15} /></button>
      <label className="sr-only" htmlFor={`mn-${p.id}`}>{t('minutes.for', { name: p.name })}</label>
      <input id={`mn-${p.id}`} type="number" inputMode="numeric" min={0} max={full + 30} className="input h-10 w-16 px-1 text-center tabular-nums" value={mins[p.id] ?? 0} onChange={(e) => set(p.id, Number(e.target.value) || 0)} />
      <button type="button" className="btn-outline h-10 w-10 !px-0" aria-label={t('minutes.more', { name: p.name })} onClick={() => set(p.id, (mins[p.id] ?? 0) + 5)}><Plus size={15} /></button>
    </li>
  )
  return (
    <Modal open={open} onClose={onClose} title={t('minutes.title')}
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button><button type="button" className="btn-primary" onClick={save}>{t('minutes.save')}</button></>}>
      <p className="mb-3 text-[13.5px] text-ink-muted">{t('minutes.hint', { n: full })}</p>
      <h3 className="mb-1 text-xs font-semibold text-ink-muted">{t('minutes.starters')}</h3>
      <ul className="mb-4 divide-y divide-line/70 rounded-2xl border border-line">{starters.map(row)}</ul>
      {subs.length > 0 && <>
        <h3 className="mb-1 text-xs font-semibold text-ink-muted">{t('minutes.subs')}</h3>
        <ul className="divide-y divide-line/70 rounded-2xl border border-line">{subs.map(row)}</ul>
      </>}
    </Modal>
  )
}
