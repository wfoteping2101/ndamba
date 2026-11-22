// The player card: nickname, tier, W-D-L, reliability (with its formula), rating, flags, recent games,
// plus the organiser's actions for the member and, opened from a game, for this game.
import { useState, type FormEvent } from 'react'
import { Flag, X } from 'lucide-react'
import { Field, Modal } from '../../../ui'
import { useT } from '../../../i18n'
import { PICKUP } from '../../../lib/config'
import type { PickupGame, PickupPlayer } from '../../../lib/types'
import { cx, fmtDate } from '../../../lib/util'
import {
  checkIn, clearFlags, excuseNoShow, gamePhase, hostId, isSuspended, MAX_COADMINS, MIN_RATINGS, PUNCTUALITY_WEIGHT,
  recentFlags, removeFlag, removeMember, removeRsvp, setLate, TIER_RULES, undoCheckIn, updateGroup, updateMember,
  type PickupRsvpX, type PlayerStats,
} from '../../../lib/pickup'
import { Avatar, dec, hhmmOf, pct, ResultPill, TierBadge, useHostPlan, type GroupData } from './kit'

export function PlayerCardModal({ player, onClose, data, stats, amAdmin, game, rsvp, now }: {
  player: PickupPlayer | null; onClose: () => void; data: GroupData; stats?: PlayerStats; amAdmin: boolean
  game?: PickupGame; rsvp?: PickupRsvpX; now: number
}) {
  const { t, lang } = useT('pickup')
  const host = useHostPlan()
  const [edit, setEdit] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const open = !!player
  if (!player || !stats) return <Modal open={false} onClose={onClose} title=""><span /></Modal>
  const { group } = data
  const isHost = hostId(group) === player.id
  const isCo = !isHost && group.adminIds.includes(player.id)
  const suspended = isSuspended(player)
  const flags = [...player.flags].sort().reverse()
  const recent = recentFlags(player)
  const coCount = group.adminIds.length - 1
  const next = stats.tier === 'gold' ? null : stats.tier === 'silver' ? 'gold' : stats.tier === 'bronze' ? 'silver' : 'bronze'
  const phase = game ? gamePhase(game, now) : null
  const close = () => { setEdit(false); setConfirmRemove(false); onClose() }

  const toggleCo = async () => {
    const ids = isCo ? group.adminIds.filter((x) => x !== player.id) : [...group.adminIds, player.id]
    await updateGroup(group.id, { adminIds: ids })
  }

  return (
    <Modal open={open} onClose={close} title={t('card.title')} wide>
      <div className="flex items-start gap-4">
        <Avatar name={player.nickname} size={56} me={player.isMe} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[22px] leading-tight text-ink">{player.nickname}{player.isMe && <span className="ml-2 align-middle text-[13px] font-semibold text-forest-600">{t('common.you')}</span>}</h3>
          <p className="mt-0.5 text-[14px] text-ink-muted">{player.name}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <TierBadge tier={stats.tier} />
            {isHost && <span className="rounded-full bg-forest-50 px-2.5 py-[3px] text-[12px] font-semibold text-forest-700">{t('role.host')}</span>}
            {isCo && <span className="rounded-full bg-forest-50 px-2.5 py-[3px] text-[12px] font-semibold text-forest-700">{t('role.coadmin')}</span>}
            {suspended && <span className="rounded-full bg-clay-50 px-2.5 py-[3px] text-[12px] font-semibold text-clay-700">{t('flags.suspended')}</span>}
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CardStat label={t('card.played')} value={String(stats.played)} />
        <CardStat label={t('card.wdl')} value={`${stats.w}-${stats.d}-${stats.l}`} />
        <CardStat label={t('card.reliability')} value={stats.reliability === null ? t('card.newShort') : `${stats.reliability}`} unit={stats.reliability === null ? '' : '%'} />
        <CardStat label={t('card.rating')} value={stats.avg === null ? `${stats.ratingCount}/${MIN_RATINGS}` : dec(stats.avg, lang)} unit={stats.avg === null ? '' : '/5'} />
      </dl>

      <section className="mt-5 rounded-card bg-sand/70 px-4 py-3.5 text-[14px] leading-relaxed text-ink-soft">
        <h4 className="mb-1 text-[14.5px] font-semibold text-ink">{t('card.formulaTitle')}</h4>
        <p>{t('card.formula', { att: Math.round((1 - PUNCTUALITY_WEIGHT) * 100), punct: Math.round(PUNCTUALITY_WEIGHT * 100) })}</p>
        {stats.committed > 0 ? (
          <>
            <p className="mt-1">{t('card.attendanceLine', { n: stats.attended, total: stats.committed, pct: pct(stats.attendance, lang) })} {t('card.punctualityLine', { n: stats.onTime, total: stats.attended, pct: pct(stats.punctuality, lang) })}</p>
            <p className="num mt-1 font-semibold text-ink">{`${dec(1 - PUNCTUALITY_WEIGHT, lang)} × ${Math.round((stats.attendance ?? 0) * 100)} + ${dec(PUNCTUALITY_WEIGHT, lang)} × ${Math.round((stats.punctuality ?? 0) * 100)} = ${stats.reliability}`}</p>
          </>
        ) : <p className="mt-1">{t('card.noGames')}</p>}
        <p className="mt-2">{stats.avg === null ? t('card.ratingPending', { n: stats.ratingCount, min: MIN_RATINGS }) : t('card.ratingLine', { avg: dec(stats.avg, lang), count: stats.ratingCount })}</p>
        {next && <p className="mt-1">{t(`card.next.${next}`, { games: TIER_RULES[next].games, avg: dec(TIER_RULES[next].avg, lang) })}</p>}
      </section>

      {game && rsvp && amAdmin && (
        <section className="mt-5">
          <h4 className="mb-2 text-[15px] font-semibold text-ink">{t('card.thisGame')}</h4>
          <p className="mb-3 text-[13.5px] text-ink-muted">
            {rsvp.checkedInAt ? t('card.checkedAt', { time: hhmmOf(rsvp.checkedInAt) }) + (rsvp.late ? `, ${t('status.late')}` : '') + (rsvp.checkinBy === 'admin' ? `, ${t('card.byAdmin')}` : '') : rsvp.noShow ? t('status.noShow') : t(`status.${rsvp.status}`)}
          </p>
          <div className="flex flex-wrap gap-2">
            {rsvp.status === 'going' && !rsvp.checkedInAt && phase !== 'before' && <button type="button" className="btn-primary btn-sm" onClick={() => checkIn(rsvp.id, { by: 'admin' })}>{rsvp.noShow ? t('card.wasThere') : t('card.checkIn')}</button>}
            {rsvp.noShow && <button type="button" className="btn-outline btn-sm" onClick={() => excuseNoShow(rsvp.id)}>{t('card.excuse')}</button>}
            {rsvp.checkedInAt && <button type="button" className="btn-outline btn-sm" onClick={() => setLate(rsvp.id, !rsvp.late)}>{rsvp.late ? t('card.notLate') : t('card.markLate')}</button>}
            {rsvp.checkedInAt && <button type="button" className="btn-ghost btn-sm" onClick={() => undoCheckIn(rsvp.id)}>{t('card.undoCheckIn')}</button>}
            {game.status === 'open' && phase !== 'after' && rsvp.status !== 'out' && <button type="button" className="btn-ghost btn-sm text-clay-700" onClick={async () => { await removeRsvp(rsvp.id); close() }}>{t('card.removeFromGame')}</button>}
          </div>
        </section>
      )}

      {flags.length > 0 && (
        <section className="mt-5">
          <h4 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-ink"><Flag size={16} strokeWidth={1.75} className="text-clay-600" aria-hidden="true" />{t('flags.title', { count: recent.length, max: PICKUP.flagsToSuspend, days: PICKUP.flagDays })}</h4>
          <ul className="flex flex-wrap gap-2">
            {flags.map((f, i) => (
              <li key={`${f}${i}`} className={cx('inline-flex items-center gap-1 rounded-full py-1 pl-3 text-[13px] font-semibold', recent.includes(f) ? 'bg-clay-50 text-clay-700' : 'bg-sand text-ink-muted', amAdmin ? 'pr-1' : 'pr-3')}>
                {fmtDate(f, lang, { day: 'numeric', month: 'short' })}
                {amAdmin && <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/70" onClick={() => removeFlag(player.id, f)} aria-label={t('flags.remove', { date: fmtDate(f, lang, { day: 'numeric', month: 'long' }) })}><X size={14} strokeWidth={1.75} /></button>}
              </li>
            ))}
          </ul>
          {suspended && <p className="mt-2 text-[13.5px] text-clay-700">{t('flags.suspendedBody', { max: PICKUP.flagsToSuspend, days: PICKUP.flagDays })}</p>}
          {amAdmin && <button type="button" className="btn-outline btn-sm mt-3" onClick={() => clearFlags(player.id)}>{suspended ? t('flags.lift') : t('flags.clear')}</button>}
        </section>
      )}

      <section className="mt-5">
        <h4 className="mb-2 text-[15px] font-semibold text-ink">{t('card.recent')}</h4>
        {stats.recent.length ? (
          <ul className="divide-y divide-line rounded-card border border-line">
            {stats.recent.slice(0, 5).map(({ game: g, rsvp: r, result }) => (
              <li key={g.id} className="flex items-center gap-3 px-3 py-2.5 text-[14px]">
                <span className="w-24 shrink-0 text-ink-soft">{fmtDate(g.date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="min-w-0 flex-1 truncate text-ink-muted">{r.noShow ? t('status.noShow') : r.late ? t('status.late') : r.checkedInAt ? t('status.present') : ''}</span>
                {g.score && <span className="num text-ink-soft">{g.score.a}-{g.score.b}</span>}
                <ResultPill r={result} />
              </li>
            ))}
          </ul>
        ) : <p className="text-[14px] text-ink-muted">{t('card.noRecent')}</p>}
      </section>

      {amAdmin && !game && (
        <section className="mt-6 border-t border-line pt-5">
          <h4 className="mb-3 text-[15px] font-semibold text-ink">{t('card.manage')}</h4>
          {edit ? <MemberEdit player={player} onDone={() => setEdit(false)} /> : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-outline btn-sm" onClick={() => setEdit(true)}>{t('card.edit')}</button>
              {!isHost && (host.active
                ? <button type="button" className="btn-outline btn-sm" onClick={toggleCo} disabled={!isCo && coCount >= MAX_COADMINS}>{isCo ? t('card.unmakeCo') : t('card.makeCo')}</button>
                : <span className="self-center text-[13px] text-ink-muted">{t('card.coPlan')}</span>)}
              {!isHost && !player.isMe && (confirmRemove
                ? <><span className="self-center text-[13.5px] text-ink-soft">{t('card.removeConfirm', { name: player.nickname })}</span><button type="button" className="btn-danger btn-sm" onClick={async () => { await removeMember(group, player.id); close() }}>{t('card.removeYes')}</button><button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmRemove(false)}>{t('common.cancel')}</button></>
                : <button type="button" className="btn-ghost btn-sm text-clay-700" onClick={() => setConfirmRemove(true)}>{t('card.remove')}</button>)}
            </div>
          )}
          {!isHost && !isCo && coCount >= MAX_COADMINS && host.active && <p className="mt-2 text-[13px] text-ink-muted">{t('card.coMax', { n: MAX_COADMINS })}</p>}
        </section>
      )}
    </Modal>
  )
}

function CardStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-card border border-line bg-paper px-3 py-2.5">
      <dt className="text-[12.5px] font-semibold text-ink-muted">{label}</dt>
      <dd className="num mt-1 font-display text-[22px] leading-none text-ink">{value}{unit && <span className="ml-0.5 font-sans text-[13px] font-semibold text-ink-muted">{unit}</span>}</dd>
    </div>
  )
}

function MemberEdit({ player, onDone }: { player: PickupPlayer; onDone: () => void }) {
  const { t } = useT('pickup')
  const [v, setV] = useState({ name: player.name, nickname: player.nickname, phone: player.phone ?? '' })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!v.name.trim() || !v.nickname.trim()) return
    await updateMember(player.id, { name: v.name.trim(), nickname: v.nickname.trim(), phone: v.phone.trim() || undefined })
    onDone()
  }
  return (
    <form onSubmit={submit}>
      <div className="grid gap-x-3 sm:grid-cols-3">
        <Field label={t('member.nickname')} htmlFor="pm-nick"><input id="pm-nick" className="input" value={v.nickname} onChange={(e) => setV({ ...v, nickname: e.target.value })} /></Field>
        <Field label={t('member.name')} htmlFor="pm-name"><input id="pm-name" className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label={t('member.phone')} htmlFor="pm-phone"><input id="pm-phone" className="input" type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
      </div>
      <div className="flex gap-2"><button type="submit" className="btn-primary btn-sm">{t('form.save')}</button><button type="button" className="btn-ghost btn-sm" onClick={onDone}>{t('common.cancel')}</button></div>
    </form>
  )
}
