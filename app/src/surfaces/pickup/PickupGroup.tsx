// A pickup group: its games, its members (tier, W-D-L, reliability, flags), the season summary for organisers, settings.
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, ChevronRight, Download, Flag, MapPin, Share2, UserPlus, Users } from 'lucide-react'
import { useDocumentTitle } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { EmptyState, Field, Modal, Segmented, Stat, Tabs } from '../../ui'
import { useT } from '../../i18n'
import { addDays, cx, download, todayISO } from '../../lib/util'
import type { PickupGame } from '../../lib/types'
import {
  addMember, deleteGroup, fmtMoney, gameOver, gameState, hostId, isAdmin, isSuspended, joinByCode, recentFlags,
  removeMember, seasonSummary, toCSV, type PlayerStats,
} from '../../lib/pickup'
import { Avatar, DateTile, dayName, pct, PlanGate, ResultPill, SW, TierBadge, useGroupData, useNow, useSettle, useStats, type GroupData } from './components/kit'
import { GroupForm, InviteBox, NewGameModal } from './components/forms'
import { PlayerCardModal } from './components/PlayerCard'

type Tab = 'games' | 'members' | 'season' | 'settings'

export default function PickupGroup() {
  const { id = '' } = useParams()
  const { t, lang } = useT('pickup')
  const data = useGroupData(id)
  const now = useNow()
  useSettle(data, now)
  const stats = useStats(data, now)
  useDocumentTitle(data?.group.name ?? t('title'))
  const [tab, setTab] = useState<Tab>('games')
  const [newGame, setNewGame] = useState(false)
  const [invite, setInvite] = useState(false)
  const [cardId, setCardId] = useState<string | null>(null)

  if (data === undefined) return <div className="grid min-h-[40vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>
  if (data === null) return (
    <div className="mx-auto max-w-lg pt-6">
      <EmptyState icon={<Users strokeWidth={SW} />} title={t('group.notFound')} body={t('group.notFoundBody')} action={<Link to="/app/pickup" className="btn-primary">{t('common.back')}</Link>} />
    </div>
  )

  const { group, players } = data
  const me = players.find((p) => p.isMe)
  const amAdmin = isAdmin(group, me?.id)
  const tabs: { id: Tab; label: string }[] = [
    { id: 'games', label: t('group.tabs.games') },
    { id: 'members', label: t('group.tabs.members', { count: players.length }) },
    ...(amAdmin ? [{ id: 'season' as Tab, label: t('group.tabs.season') }] : []),
    { id: 'settings', label: amAdmin ? t('group.tabs.settings') : t('group.tabs.about') },
  ]
  const card = cardId ? players.find((p) => p.id === cardId) ?? null : null

  return (
    <div>
      <Link to="/app/pickup" className="mb-4 inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-semibold text-forest-700 hover:text-forest-800"><ArrowLeft size={17} strokeWidth={SW} aria-hidden="true" />{t('title')}</Link>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-balance text-[28px] leading-tight text-ink sm:text-[38px]">{group.name}</h1>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[15px] text-ink-muted"><MapPin size={16} strokeWidth={SW} aria-hidden="true" />{[group.venue, group.city].filter(Boolean).join(', ')}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="chip">{t('group.vs', { n: group.perSide })}</span>
            {group.defaultDay !== undefined && <span className="chip">{t(group.defaultTime ? 'group.usual' : 'group.usualNoTime', { day: dayName(group.defaultDay, lang), time: group.defaultTime })}</span>}
            <span className="chip">{group.defaultFee ? t('group.feeChip', { fee: fmtMoney(group.defaultFee, group.currency, lang) }) : t('common.free')}</span>
            {group.minTier && <span className="chip">{t('group.minTierChip', { tier: t(`tier.${group.minTier}`) })}</span>}
            {amAdmin && <span className="chip border-forest-300 text-forest-700">{t(hostId(group) === me?.id ? 'role.host' : 'role.coadmin')}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" className="btn-outline" onClick={() => setInvite(true)}><Share2 size={17} strokeWidth={SW} aria-hidden="true" />{t('group.invite')}</button>
          {amAdmin && <button type="button" className="btn-primary" onClick={() => setNewGame(true)}><CalendarPlus size={17} strokeWidth={SW} aria-hidden="true" />{t('group.newGame')}</button>}
        </div>
      </header>

      {!me && <NotMember code={group.inviteCode} />}

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />
      {tab === 'games' && <GamesTab data={data} now={now} meId={me?.id} amAdmin={amAdmin} onNew={() => setNewGame(true)} />}
      {tab === 'members' && <MembersTab data={data} stats={stats} amAdmin={amAdmin} onOpen={setCardId} />}
      {tab === 'season' && amAdmin && <PlanGate what={t('plan.what.season')}><SeasonTab data={data} now={now} /></PlanGate>}
      {tab === 'settings' && <SettingsTab data={data} amAdmin={amAdmin} meId={me?.id} />}

      <NewGameModal open={newGame} onClose={() => setNewGame(false)} group={group} />
      <Modal open={invite} onClose={() => setInvite(false)} title={t('invite.title')}><InviteBox group={group} /></Modal>
      <PlayerCardModal player={card} onClose={() => setCardId(null)} data={data} stats={card ? stats.get(card.id) : undefined} amAdmin={amAdmin} now={now} />
    </div>
  )
}

function NotMember({ code }: { code: string }) {
  const { t } = useT('pickup')
  const { profile } = useSession()
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card bg-sun-50 px-4 py-3.5">
      <p className="text-[14.5px] text-ink-soft">{t('group.notMember')}</p>
      <button type="button" className="btn-primary btn-sm" onClick={() => joinByCode(code, { name: profile?.name || t('common.me') })}>{t('join.cta')}</button>
    </div>
  )
}

/* ---------------- Games ---------------- */

function GamesTab({ data, now, meId, amAdmin, onNew }: { data: GroupData; now: number; meId?: string; amAdmin: boolean; onNew: () => void }) {
  const { t } = useT('pickup')
  const key = (g: PickupGame) => g.date + g.time
  const upcoming = data.games.filter((g) => g.status === 'open' && !gameOver(g, now)).sort((a, b) => key(a).localeCompare(key(b)))
  const past = data.games.filter((g) => !(g.status === 'open' && !gameOver(g, now))).sort((a, b) => key(b).localeCompare(key(a)))
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <section aria-labelledby="up-h" className="min-w-0">
        <h2 id="up-h" className="mb-3 text-[20px] text-ink">{t('group.upcoming')}</h2>
        {upcoming.length ? (
          <ul className="card divide-y divide-line overflow-hidden">{upcoming.map((g) => <li key={g.id}><GameRow game={g} data={data} meId={meId} now={now} /></li>)}</ul>
        ) : (
          <div className="rounded-card border border-dashed border-line bg-paper/60 px-4 py-5 text-[14.5px] text-ink-muted">
            {t('group.noUpcoming')}
            {amAdmin && <div className="mt-3"><button type="button" className="btn-primary btn-sm" onClick={onNew}>{t('group.newGame')}</button></div>}
          </div>
        )}
      </section>
      <section aria-labelledby="past-h" className="min-w-0">
        <h2 id="past-h" className="mb-3 text-[20px] text-ink">{t('group.past')}</h2>
        {past.length ? (
          <ul className="card divide-y divide-line overflow-hidden">{past.map((g) => <li key={g.id}><GameRow game={g} data={data} meId={meId} now={now} /></li>)}</ul>
        ) : <p className="rounded-card border border-dashed border-line bg-paper/60 px-4 py-5 text-[14.5px] text-ink-muted">{t('group.noPast')}</p>}
      </section>
    </div>
  )
}

function GameRow({ game, data, meId, now }: { game: PickupGame; data: GroupData; meId?: string; now: number }) {
  const { t } = useT('pickup')
  const st = gameState(game, data.rsvps)
  const mine = meId ? data.rsvps.find((r) => r.gameId === game.id && r.playerId === meId) : undefined
  const over = gameOver(game, now) || game.status !== 'open'
  const attended = data.rsvps.filter((r) => r.gameId === game.id && r.status === 'going' && r.checkedInAt).length
  const myRes = meId && game.score && game.teams ? (game.teams.a.includes(meId) ? (game.score.a > game.score.b ? 'W' : game.score.a < game.score.b ? 'L' : 'D') : game.teams.b.includes(meId) ? (game.score.b > game.score.a ? 'W' : game.score.b < game.score.a ? 'L' : 'D') : null) : null
  return (
    <Link to={`/app/pickup/match/${game.id}`} className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-sand/50 sm:px-4">
      <DateTile iso={game.date} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[16px] font-semibold text-ink">{game.time}</span>
          {game.status === 'cancelled' && <span className="rounded-full bg-clay-50 px-2 py-[2px] text-[11.5px] font-semibold text-clay-700">{t('game.cancelled')}</span>}
          {game.status === 'open' && over && <span className="rounded-full bg-sun-100 px-2 py-[2px] text-[11.5px] font-semibold text-ink">{t('game.toScore')}</span>}
          {!over && mine && mine.status !== 'out' && <span className="rounded-full bg-forest-50 px-2 py-[2px] text-[11.5px] font-semibold text-forest-700">{mine.pending ? t('status.pending') : mine.offerUntil ? t('status.offered') : t(`status.${mine.status}`)}</span>}
        </div>
        <div className="num mt-0.5 truncate text-[13px] text-ink-muted">
          {over
            ? t('group.attended', { n: attended, total: st.going.length })
            : `${t('home.spots', { taken: st.going.length, cap: game.cap })}${st.waitlist.length ? `, ${t('home.waiting', { count: st.waitlist.length })}` : ''}`}
        </div>
      </div>
      {game.score ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="num font-display text-[22px] leading-none text-ink">{game.score.a}<span className="px-1 text-ink-faint">-</span>{game.score.b}</span>
          <ResultPill r={myRes} />
        </div>
      ) : <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden="true" />}
    </Link>
  )
}

/* ---------------- Members ---------------- */

function MembersTab({ data, stats, amAdmin, onOpen }: { data: GroupData; stats: Map<string, PlayerStats>; amAdmin: boolean; onOpen: (id: string) => void }) {
  const { t } = useT('pickup')
  const [add, setAdd] = useState(false)
  const { group } = data
  const order = [...data.players].sort((a, b) => (stats.get(b.id)?.played ?? 0) - (stats.get(a.id)?.played ?? 0) || a.nickname.localeCompare(b.nickname))
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[14px] text-ink-muted">{t('members.intro')}</p>
        {amAdmin && <button type="button" className="btn-outline" onClick={() => setAdd(true)}><UserPlus size={17} strokeWidth={SW} aria-hidden="true" />{t('members.add')}</button>}
      </div>
      <ul className="card divide-y divide-line overflow-hidden">
        {order.map((p) => {
          const s = stats.get(p.id)
          const flags = recentFlags(p).length
          const susp = isSuspended(p)
          const role = hostId(group) === p.id ? 'host' : group.adminIds.includes(p.id) ? 'coadmin' : null
          return (
            <li key={p.id}>
              <button type="button" onClick={() => onOpen(p.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-sand/50 sm:px-4">
                <Avatar name={p.nickname} me={p.isMe} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[15.5px] font-semibold text-ink">{p.nickname}</span>
                    <TierBadge tier={s?.tier} />
                    {role && <span className="rounded-full bg-forest-50 px-2 py-[2px] text-[11.5px] font-semibold text-forest-700">{t(`role.${role}`)}</span>}
                    {p.isMe && <span className="text-[12.5px] font-semibold text-forest-600">{t('common.you')}</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-ink-muted">
                    <span className="truncate">{p.name}</span>
                    {s && <span className="num">{t('members.wdl', { w: s.w, d: s.d, l: s.l })}</span>}
                    {(flags > 0 || susp) && (
                      <span className={cx('inline-flex items-center gap-1 font-semibold', susp ? 'text-clay-700' : 'text-clay-600')}>
                        <Flag size={13} strokeWidth={SW} aria-hidden="true" />{susp ? t('flags.suspended') : t('flags.count', { count: flags })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="num font-display text-[20px] leading-none text-ink">{s?.reliability ?? ''}{s?.reliability !== null && s?.reliability !== undefined ? <span className="text-[13px] font-sans font-semibold text-ink-muted">%</span> : <span className="text-[12.5px] font-sans font-semibold text-ink-muted">{t('card.newShort')}</span>}</div>
                  <div className="mt-1 text-[11.5px] font-semibold text-ink-muted">{t('card.reliability')}</div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
      <AddMemberModal open={add} onClose={() => setAdd(false)} groupId={group.id} />
    </div>
  )
}

function AddMemberModal({ open, onClose, groupId }: { open: boolean; onClose: () => void; groupId: string }) {
  const { t } = useT('pickup')
  const [v, setV] = useState({ name: '', nickname: '', phone: '' })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!v.name.trim()) return
    await addMember(groupId, v)
    setV({ name: '', nickname: '', phone: '' })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={t('members.addTitle')}
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button><button type="submit" form="pk-add-member" className="btn-primary" disabled={!v.name.trim()}>{t('members.addCta')}</button></>}>
      <form id="pk-add-member" onSubmit={submit}>
        <Field label={t('member.name')} htmlFor="am-name"><input id="am-name" className="input" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder={t('member.namePh')} /></Field>
        <Field label={t('member.nickname')} htmlFor="am-nick" hint={t('member.nicknameHint')}><input id="am-nick" className="input" value={v.nickname} onChange={(e) => setV({ ...v, nickname: e.target.value })} /></Field>
        <Field label={t('member.phone')} htmlFor="am-phone" hint={t('member.phoneHint')}><input id="am-phone" className="input" type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
      </form>
    </Modal>
  )
}

/* ---------------- Season summary (organisers) ---------------- */

function SeasonTab({ data, now }: { data: GroupData; now: number }) {
  const { t, lang } = useT('pickup')
  const [range, setRange] = useState<'30' | '90' | 'all'>('90')
  const since = range === 'all' ? null : addDays(todayISO(), -Number(range))
  const s = useMemo(() => seasonSummary(data.players, data.games, data.rsvps, data.ratings, since, now), [data, since, now])
  const cur = data.group.currency
  const rows = [...s.rows].sort((a, b) => b.stats.committed - a.stats.committed || a.player.nickname.localeCompare(b.player.nickname))
  const exportCsv = () => {
    const head = ['nickname', 'name', 'tier', 'committed', 'attended', 'noShows', 'late', 'attendance', 'reliability', 'guests', 'paid', 'owed'].map((k) => t(`season.col.${k}`))
    const body = rows.map((r) => [
      r.player.nickname, r.player.name, t(`tier.${r.stats.tier ?? 'none'}`), r.stats.committed, r.stats.attended, r.stats.noShows, r.stats.late,
      r.stats.attendance === null ? '' : Math.round(r.stats.attendance * 100), r.stats.reliability ?? '', r.stats.guests, r.paidAmount, r.owed,
    ])
    const name = `${data.group.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase()}-${range === 'all' ? t('season.all').toLowerCase() : range}.csv`
    download(name, toCSV([head, ...body], lang), 'text/csv;charset=utf-8')
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented options={[{ id: '30', label: t('season.d30') }, { id: '90', label: t('season.d90') }, { id: 'all', label: t('season.all') }]} value={range} onChange={setRange} />
        <button type="button" className="btn-outline" onClick={exportCsv}><Download size={17} strokeWidth={SW} aria-hidden="true" />{t('season.csv')}</button>
      </div>
      <p className="mb-4 text-[14px] text-ink-muted">{t('season.games', { count: s.gamesPlayed })}</p>
      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t('season.attendance')} value={s.attendanceRate === null ? '0' : pct(s.attendanceRate, lang)} tone="sun" />
        <Stat label={t('season.noShows')} value={s.totals.noShows} tone={s.totals.noShows ? 'clay' : undefined} />
        <Stat label={t('season.late')} value={s.totals.late} />
        <Stat label={t('season.guests')} value={s.totals.guests} />
        <Stat label={t('season.paid')} value={<span className="whitespace-nowrap text-[20px] sm:text-[21px]">{fmtMoney(s.totals.paid, cur, lang)}</span>} tone="forest" />
        <Stat label={t('season.owed')} value={<span className="whitespace-nowrap text-[20px] sm:text-[21px]">{fmtMoney(s.totals.owed, cur, lang)}</span>} tone={s.totals.owed ? 'clay' : undefined} />
      </div>
      <div className="card overflow-x-auto">
        <table className="table-n min-w-[760px]">
          <thead>
            <tr>
              <th>{t('season.col.nickname')}</th>
              <th className="num">{t('season.col.committed')}</th>
              <th className="num">{t('season.col.attended')}</th>
              <th className="num">{t('season.col.noShows')}</th>
              <th className="num">{t('season.col.late')}</th>
              <th className="num">{t('season.col.attendance')}</th>
              <th className="num">{t('season.col.guests')}</th>
              <th className="num">{t('season.col.paid')}</th>
              <th className="num">{t('season.col.owed')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.player.id}>
                <td><div className="font-semibold text-ink">{r.player.nickname}</div><div className="text-[12.5px] text-ink-muted">{r.player.name}</div></td>
                <td className="num">{r.stats.committed}</td>
                <td className="num">{r.stats.attended}</td>
                <td className={cx('num', r.stats.noShows && 'font-semibold text-clay-700')}>{r.stats.noShows}</td>
                <td className="num">{r.stats.late}</td>
                <td className="num">{r.stats.attendance === null ? '' : pct(r.stats.attendance, lang)}</td>
                <td className="num">{r.stats.guests}</td>
                <td className="num whitespace-nowrap">{fmtMoney(r.paidAmount, cur, lang)}</td>
                <td className={cx('num whitespace-nowrap', r.owed && 'font-semibold text-clay-700')}>{fmtMoney(r.owed, cur, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[13px] text-ink-muted">{t('season.note')}</p>
    </div>
  )
}

/* ---------------- Settings ---------------- */

function SettingsTab({ data, amAdmin, meId }: { data: GroupData; amAdmin: boolean; meId?: string }) {
  const { t } = useT('pickup')
  const nav = useNavigate()
  const { group, players } = data
  const [saved, setSaved] = useState(false)
  const [confirm, setConfirm] = useState<null | 'delete' | 'leave'>(null)
  const isHost = hostId(group) === meId
  const admins = group.adminIds.map((id) => players.find((p) => p.id === id)).filter(Boolean)
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0">
        {amAdmin ? (
          <section className="card card-pad">
            <h2 className="mb-4 text-[19px] text-ink">{t('settings.title')}</h2>
            <GroupForm key={group.id} group={group} onDone={() => { setSaved(true); window.setTimeout(() => setSaved(false), 2500) }} />
            {saved && <p className="mt-2 text-right text-[13.5px] font-semibold text-forest-700" role="status">{t('settings.saved')}</p>}
          </section>
        ) : (
          <section className="card card-pad">
            <h2 className="mb-3 text-[19px] text-ink">{t('settings.organisers')}</h2>
            <ul className="space-y-2">
              {admins.map((p) => p && <li key={p.id} className="flex items-center gap-3"><Avatar name={p.nickname} size={36} /><span className="font-semibold text-ink">{p.nickname}</span><span className="text-[13px] text-ink-muted">{t(hostId(group) === p.id ? 'role.host' : 'role.coadmin')}</span></li>)}
            </ul>
            <p className="mt-4 text-[14px] text-ink-muted">{t('settings.rules', { guests: group.allowGuests ? t('settings.guestsYes') : t('settings.guestsNo'), ratings: group.ratingsOn ? t('settings.ratingsYes') : t('settings.ratingsNo') })}</p>
          </section>
        )}
      </div>
      <aside className="min-w-0 space-y-6">
        <section className="card card-pad">
          <h2 className="mb-3 text-[18px] text-ink">{t('invite.title')}</h2>
          <InviteBox group={group} />
        </section>
        {amAdmin && (
          <section className="card card-pad">
            <h2 className="mb-1 text-[18px] text-ink">{t('settings.coadmins')}</h2>
            <p className="mb-3 text-[14px] text-ink-muted">{t('settings.coadminsBody')}</p>
            <ul className="flex flex-wrap gap-1.5">
              {admins.map((p) => p && <li key={p.id} className="chip">{p.nickname}{hostId(group) === p.id ? ` (${t('role.host').toLowerCase()})` : ''}</li>)}
            </ul>
          </section>
        )}
        <section className="rounded-card border border-clay-100 bg-paper p-4 sm:p-5">
          {isHost ? (
            confirm === 'delete' ? (
              <div>
                <p className="text-[14.5px] text-ink-soft">{t('settings.deleteConfirm', { name: group.name })}</p>
                <div className="mt-3 flex gap-2"><button type="button" className="btn-danger" onClick={async () => { await deleteGroup(group.id); nav('/app/pickup') }}>{t('settings.deleteYes')}</button><button type="button" className="btn-ghost" onClick={() => setConfirm(null)}>{t('common.cancel')}</button></div>
              </div>
            ) : <button type="button" className="btn-ghost text-clay-700" onClick={() => setConfirm('delete')}>{t('settings.delete')}</button>
          ) : meId ? (
            confirm === 'leave' ? (
              <div>
                <p className="text-[14.5px] text-ink-soft">{t('settings.leaveConfirm')}</p>
                <div className="mt-3 flex gap-2"><button type="button" className="btn-danger" onClick={async () => { await removeMember(group, meId); nav('/app/pickup') }}>{t('settings.leaveYes')}</button><button type="button" className="btn-ghost" onClick={() => setConfirm(null)}>{t('common.cancel')}</button></div>
              </div>
            ) : <button type="button" className="btn-ghost text-clay-700" onClick={() => setConfirm('leave')}>{t('settings.leave')}</button>
          ) : null}
        </section>
      </aside>
    </div>
  )
}
