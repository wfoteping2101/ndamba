// The game page: kick-off, spots, waitlist and the 15-minute offer, join and leave, guests, tier requests,
// check-in (time window, location, organiser override), teams on a pitch, the score, payments and peer ratings.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, MapPin, UserPlus, Users, Wallet } from 'lucide-react'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { EmptyState, Field, MolaDock, Modal, Tabs } from '../../ui'
import { useT } from '../../i18n'
import { PICKUP } from '../../lib/config'
import type { PickupGame as Game } from '../../lib/types'
import { cx, fmtDate } from '../../lib/util'
import {
  addGuest, approveRequest, cancelGame, checkIn, checkinWindow, confirmOffer, deadlinePassed, declineRequest, distanceM,
  fmtMoney, gamePhase, gameState, hhmm, hostId, isAdmin, isSuspended, leaveGame, needsOffer, offerNext, passOffer, reopenGame, rsvpGoing,
  setScore, strengthOf, type PickupRsvpX, type RsvpResult,
} from '../../lib/pickup'
import { Avatar, hhmmOf, longDate, PlanGate, Stepper, SW, TierBadge, useGroupData, useHostPlan, useNow, useSettle, useStats } from './components/kit'
import { TeamsBoard } from './components/TeamsBoard'
import { PaymentsPanel, RatingsPanel } from './components/GameTabs'
import { PlayerCardModal } from './components/PlayerCard'

type Tab = 'players' | 'teams' | 'pay' | 'ratings'

export default function PickupGame() {
  const { id = '' } = useParams()
  const { t, lang } = useT('pickup')
  const row = useLiveQuery(async () => (await db.pickupGames.get(id)) ?? null, [id], undefined as Game | null | undefined)
  const data = useGroupData(row?.groupId)
  const now = useNow(15000)
  useSettle(data, now)
  const stats = useStats(data, now)
  const host = useHostPlan()
  const [tab, setTab] = useState<Tab>('players')
  const [msg, setMsg] = useState<string | null>(null)
  const [geoMsg, setGeoMsg] = useState<string | null>(null)
  const [cardId, setCardId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [guestOpen, setGuestOpen] = useState(false)
  const [scoreEdit, setScoreEdit] = useState(false)
  const game = data?.games.find((g) => g.id === id) ?? row ?? undefined
  // a free spot never stays silent while people wait
  useEffect(() => {
    if (data && game && needsOffer(game, data.rsvps, now)) void offerNext(game.id, now)
  }, [data, game, now])
  useDocumentTitle(game && data ? `${data.group.name}, ${fmtDate(game.date, lang, { day: 'numeric', month: 'short' })}` : t('title'))

  const derived = useMemo(() => {
    if (!data || !game) return null
    const { group, players, rsvps } = data
    const byId = new Map(players.map((p) => [p.id, p]))
    const me = players.find((p) => p.isMe)
    const st = gameState(game, rsvps)
    const gameRsvps = rsvps.filter((r) => r.gameId === game.id)
    const myRsvp = me ? gameRsvps.find((r) => r.playerId === me.id && !r.guestOf) : undefined
    const guestById = new Map(gameRsvps.filter((r) => r.guestOf).map((r) => [r.playerId, r]))
    const labelOf = (pid: string) => byId.get(pid)?.nickname ?? guestById.get(pid)?.guestName ?? '?'
    return { group, players, byId, me, st, gameRsvps, myRsvp, labelOf, amAdmin: isAdmin(group, me?.id) }
  }, [data, game])

  if (row === undefined || (row && data === undefined)) return <div className="grid min-h-[40vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>
  if (!row || !game || !data || !derived) return (
    <div className="mx-auto max-w-lg pt-6">
      <EmptyState icon={<Users strokeWidth={SW} />} title={t('game.notFound')} body={t('game.notFoundBody')} action={<Link to="/app/pickup" className="btn-primary">{t('common.back')}</Link>} />
    </div>
  )

  const { group, byId, me, st, gameRsvps, myRsvp, labelOf, amAdmin } = derived
  const phase = gamePhase(game, now)
  const w = checkinWindow(game)
  const open = game.status === 'open'
  const closed = deadlinePassed(game, now)
  const myStats = me ? stats.get(me.id) : undefined
  const suspended = me ? isSuspended(me) : false
  const waitPos = myRsvp ? st.waitlist.findIndex((r) => r.id === myRsvp.id) + 1 : 0
  const going = st.going
  const playing = going.filter((r) => !r.noShow).map((r) => r.playerId)
  const subOf = (r: PickupRsvpX) => (r.guestOf ? t('players.guestOf', { name: byId.get(r.guestOf)?.nickname ?? '' }) : byId.get(r.playerId)?.name ?? '')
  const strength = (pid: string) => strengthOf(stats.get(pid))
  const hostName = byId.get(hostId(group))?.nickname ?? ''
  const say = (k: RsvpResult | string) => setMsg(t(`msg.${k}`))

  const join = async () => { if (me) say(await rsvpGoing(game.id, me.id, { tier: myStats?.tier ?? null })) }
  const leave = async () => { if (me) { await leaveGame(game.id, me.id); say(myRsvp?.pending ? 'requestCancelled' : myRsvp?.status === 'waitlist' ? 'leftWaitlist' : 'left') } }

  const selfCheckIn = () => {
    if (!myRsvp) return
    setGeoMsg(null)
    if (group.lat === undefined || group.lng === undefined) { void checkIn(myRsvp.id, { by: 'self' }); return }
    if (!('geolocation' in navigator)) { setGeoMsg(t('checkin.noGeo')); return }
    setGeoMsg(t('checkin.locating'))
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const d = distanceM(p.coords.latitude, p.coords.longitude, group.lat!, group.lng!)
        if (d <= PICKUP.checkinRadiusM) { void checkIn(myRsvp.id, { by: 'self', distanceM: d }); setGeoMsg(t('checkin.okAt', { dist: fmtDist(d, lang) })) }
        else setGeoMsg(t('checkin.far', { dist: fmtDist(d, lang), max: PICKUP.checkinRadiusM }))
      },
      () => setGeoMsg(t('checkin.geoError')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'players', label: t('game.tabs.players', { count: going.length }) },
    { id: 'teams', label: t('game.tabs.teams') },
    { id: 'pay', label: t('game.tabs.pay') },
    ...(group.ratingsOn ? [{ id: 'ratings' as Tab, label: t('game.tabs.ratings') }] : []),
  ]
  const card = cardId ? byId.get(cardId) ?? null : null
  const cardRsvp = card ? gameRsvps.find((r) => r.playerId === card.id && !r.guestOf) : undefined

  return (
    <div>
      <Link to={`/app/pickup/${group.id}`} className="mb-4 inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-semibold text-forest-700 hover:text-forest-800"><ArrowLeft size={17} strokeWidth={SW} aria-hidden="true" />{group.name}</Link>

      {/* the hero: when, where, spots, and my action */}
      <section className="overflow-hidden rounded-panel bg-forest-600 text-cream" aria-labelledby="game-h">
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            {game.status === 'cancelled' && <span className="rounded-full bg-clay-500 px-2.5 py-0.5 text-[12.5px] font-semibold text-white">{t('game.cancelled')}</span>}
            {game.status === 'played' && <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[12.5px] font-semibold">{t('game.played')}</span>}
            {open && phase === 'checkin' && <span className="rounded-full bg-sun-500 px-2.5 py-0.5 text-[12.5px] font-semibold text-ink">{t('checkin.openBadge', { time: hhmm(new Date(w.closes)) })}</span>}
            {open && phase === 'after' && <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[12.5px] font-semibold">{t('game.toScore')}</span>}
          </div>
          <h1 id="game-h" className="mt-2 text-[28px] leading-[1.1] text-cream sm:text-[38px]">{longDate(game.date, lang)}<span className="text-cream/70">, </span>{game.time}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] text-cream/85">
            <span className="inline-flex items-center gap-1.5"><MapPin size={16} strokeWidth={SW} aria-hidden="true" />{[group.venue, group.city].filter(Boolean).join(', ')}</span>
            <span className="inline-flex items-center gap-1.5"><Wallet size={16} strokeWidth={SW} aria-hidden="true" />{game.fee ? fmtMoney(game.fee, group.currency, lang) : t('common.free')}</span>
            <span className="inline-flex items-center gap-1.5"><Users size={16} strokeWidth={SW} aria-hidden="true" />{t('group.vs', { n: Math.max(1, Math.round(game.cap / 2)) })}</span>
          </div>
          {game.note && <p className="mt-3 max-w-2xl text-[14.5px] text-cream/90">{game.note}</p>}

          {game.status === 'played' && game.score ? (
            <div className="mt-6 flex items-center gap-4">
              <span className="text-[14px] text-cream/80">{t('teams.a')}</span>
              <span className="num font-display text-[44px] leading-none">{game.score.a}<span className="px-2 text-cream/50">-</span>{game.score.b}</span>
              <span className="text-[14px] text-cream/80">{t('teams.b')}</span>
            </div>
          ) : (
            <dl className="mt-6 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-card bg-white/10 px-4 py-3">
                <dt className="text-[13px] text-cream/75">{t('game.spotsLabel')}</dt>
                <dd className="num mt-1 font-display text-[30px] leading-none">{st.spotsLeft}<span className="ml-1 font-sans text-[14px] font-semibold text-cream/70">{t('game.ofCap', { cap: game.cap })}</span></dd>
              </div>
              <div className="rounded-card bg-white/10 px-4 py-3">
                <dt className="text-[13px] text-cream/75">{t('game.waitLabel')}</dt>
                <dd className="num mt-1 font-display text-[30px] leading-none">{st.waitlist.length}</dd>
              </div>
            </dl>
          )}
          {open && phase === 'before' && game.rsvpDeadline && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] text-cream/80"><Clock size={15} strokeWidth={SW} aria-hidden="true" />
              {closed ? t('game.rsvpClosed') : t('game.rsvpUntil', { date: fmtDate(localDate(game.rsvpDeadline), lang, { weekday: 'short', day: 'numeric', month: 'short' }), time: hhmmOf(game.rsvpDeadline) })}
            </p>
          )}

          {/* my status and action */}
          {me && open && phase !== 'after' && (
            <div className="mt-6 border-t border-white/15 pt-5">
              {suspended && !myRsvp ? (
                <p className="max-w-xl text-[14.5px] text-cream">{t('me.suspended', { max: PICKUP.flagsToSuspend, days: PICKUP.flagDays })}</p>
              ) : !myRsvp || myRsvp.status === 'out' ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className="btn-sun btn-lg" onClick={join} disabled={closed || suspended}>
                    {group.minTier && !tierOk(myStats?.tier, group.minTier) ? t('me.request') : st.spotsLeft > 0 && st.waitlist.length === 0 ? t('me.join') : t('me.joinWaitlist')}
                  </button>
                  {group.minTier && !tierOk(myStats?.tier, group.minTier) && <span className="max-w-sm text-[13.5px] text-cream/85">{t('me.belowTier', { tier: t(`tier.${group.minTier}`) })}</span>}
                </div>
              ) : myRsvp.pending ? (
                <div className="flex flex-wrap items-center gap-3"><span className="text-[15px] font-semibold">{t('me.pending')}</span><button type="button" className="btn-outline-light" onClick={leave}>{t('me.cancelRequest')}</button></div>
              ) : myRsvp.offerUntil ? (
                <div>
                  <p className="text-[15.5px] font-semibold">{t('me.offered', { time: hhmmOf(myRsvp.offerUntil) })}</p>
                  <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-sun btn-lg" onClick={() => confirmOffer(myRsvp.id).then(() => say('going'))}>{t('me.takeSpot')}</button><button type="button" className="btn-outline-light" onClick={() => passOffer(myRsvp.id)}>{t('me.passSpot')}</button></div>
                </div>
              ) : myRsvp.status === 'waitlist' ? (
                <div className="flex flex-wrap items-center gap-3"><span className="text-[15px] font-semibold">{t('me.waitlist', { n: waitPos })}</span><button type="button" className="btn-outline-light" onClick={leave}>{t('me.leaveWaitlist')}</button></div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[13.5px] font-semibold text-forest-700">{t('me.going')}</span>
                    {phase === 'checkin' && !myRsvp.checkedInAt && <button type="button" className="btn-sun btn-lg" onClick={selfCheckIn}>{t('checkin.here')}</button>}
                    {myRsvp.checkedInAt && <span className="text-[14.5px] font-semibold">{t('checkin.done', { time: hhmmOf(myRsvp.checkedInAt) })}{myRsvp.late ? `, ${t('status.late')}` : ''}</span>}
                    {phase === 'before' && <button type="button" className="btn-outline-light" onClick={leave}>{t('me.leave')}</button>}
                    {group.allowGuests && phase === 'before' && <button type="button" className="btn-outline-light" onClick={() => setGuestOpen(true)}><UserPlus size={17} strokeWidth={SW} aria-hidden="true" />{t('me.guest')}</button>}
                  </div>
                  {phase === 'before' && <p className="mt-3 text-[13.5px] text-cream/80">{t('checkin.opensAt', { time: hhmm(new Date(w.opens)), m: PICKUP.checkinRadiusM })}</p>}
                  {geoMsg && <p className="mt-3 text-[14px] text-cream" role="status">{geoMsg}</p>}
                </div>
              )}
              {msg && <p className="mt-3 text-[14px] text-cream" role="status">{msg}</p>}
            </div>
          )}
          {!me && <p className="mt-5 text-[14px] text-cream/85">{t('game.notMember')}</p>}
        </div>
      </section>

      {/* organiser bar */}
      {amAdmin && (
        <div className="mt-4 space-y-3">
          {open && st.offered.map((r) => {
            const expired = r.offerUntil! < new Date(now).toISOString()
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-sun-300 bg-sun-50 px-4 py-3">
                <p className="text-[14.5px] text-ink">{expired ? t('offer.expired', { name: labelOf(r.playerId), time: hhmmOf(r.offerUntil!) }) : t('offer.until', { name: labelOf(r.playerId), time: hhmmOf(r.offerUntil!) })}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary btn-sm" onClick={() => confirmOffer(r.id)}>{t('offer.confirm')}</button>
                  <button type="button" className="btn-outline btn-sm" onClick={() => passOffer(r.id)}>{t('offer.pass')}</button>
                </div>
              </div>
            )
          })}
          {open && st.pending.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-paper px-4 py-3">
              <p className="flex flex-wrap items-center gap-2 text-[14.5px] text-ink">{t('request.line', { name: labelOf(r.playerId), min: t(`tier.${group.minTier ?? 'bronze'}`) })}<TierBadge tier={stats.get(r.playerId)?.tier} /></p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary btn-sm" onClick={() => approveRequest(r.id)}>{t('request.approve')}</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => declineRequest(r.id)}>{t('request.decline')}</button>
              </div>
            </div>
          ))}
          {open && phase === 'checkin' && <p className="rounded-card bg-forest-50 px-4 py-3 text-[14px] text-forest-800">{t('checkin.adminLine', { count: going.filter((r) => r.checkedInAt).length, total: going.length, time: hhmm(new Date(w.closes)) })}</p>}
          {open && phase === 'after' && <p className="rounded-card bg-sand px-4 py-3 text-[14px] text-ink-soft">{t('game.afterLine')}</p>}
        </div>
      )}

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6 mt-6" />

      {tab === 'players' && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
          <section className="min-w-0" aria-labelledby="going-h">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 id="going-h" className="text-[20px] text-ink">{t('players.going', { n: going.length, cap: game.cap })}</h2>
              {amAdmin && open && phase !== 'after' && <button type="button" className="btn-outline btn-sm" onClick={() => setAddOpen(true)}><UserPlus size={16} strokeWidth={SW} aria-hidden="true" />{t('players.add')}</button>}
            </div>
            {going.length ? (
              <ul className="card divide-y divide-line overflow-hidden">
                {going.map((r) => {
                  const p = byId.get(r.playerId)
                  const status = r.noShow ? 'noShow' : r.checkedInAt ? (r.late ? 'late' : 'present') : phase === 'before' ? null : 'notYet'
                  return (
                    <li key={r.id} className="flex items-center gap-2 pr-2 sm:pr-3">
                      <button type="button" disabled={!p} onClick={() => p && setCardId(p.id)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left transition-colors enabled:hover:bg-sand/50 sm:px-4">
                        <Avatar name={labelOf(r.playerId)} me={p?.isMe} guest={!!r.guestOf} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="truncate text-[15.5px] font-semibold text-ink">{labelOf(r.playerId)}</span>
                            {p && <TierBadge tier={stats.get(p.id)?.tier} />}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-ink-muted">
                            <span className="truncate">{subOf(r)}</span>
                            {status && <span className={cx('font-semibold', status === 'noShow' ? 'text-clay-700' : status === 'late' ? 'text-ink-soft' : status === 'present' ? 'text-forest-700' : 'text-ink-muted')}>
                              {status === 'present' || status === 'late' ? `${t(`status.${status}`)} ${hhmmOf(r.checkedInAt!)}` : t(`status.${status}`)}
                            </span>}
                          </div>
                        </div>
                      </button>
                      {amAdmin && open && phase !== 'before' && !r.checkedInAt && (
                        <button type="button" className="btn-outline btn-sm shrink-0" onClick={() => checkIn(r.id, { by: 'admin' })}>{r.noShow ? t('card.wasThere') : t('players.checkIn')}</button>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : <p className="rounded-card border border-dashed border-line bg-paper/60 px-4 py-5 text-[14.5px] text-ink-muted">{t('players.none')}</p>}
          </section>
          <aside className="min-w-0 space-y-6">
            <section aria-labelledby="wait-h">
              <h2 id="wait-h" className="mb-3 text-[18px] text-ink">{t('players.waitlist', { count: st.waitlist.length })}</h2>
              {st.waitlist.length ? (
                <ol className="card divide-y divide-line overflow-hidden">
                  {st.waitlist.map((r, i) => (
                    <li key={r.id} className={cx('flex items-center gap-3 px-3 py-2.5 sm:px-4', r.offerUntil && 'bg-sun-50')}>
                      <span className="num w-5 shrink-0 text-center font-display text-[17px] text-ink-muted">{i + 1}</span>
                      <button type="button" disabled={!byId.get(r.playerId)} onClick={() => setCardId(r.playerId)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-[15px] font-semibold text-ink">{labelOf(r.playerId)}</span>
                        <span className="block truncate text-[12.5px] text-ink-muted">{r.offerUntil ? t('status.offeredUntil', { time: hhmmOf(r.offerUntil) }) : r.guestOf ? subOf(r) : t('players.since', { date: fmtDate(localDate(r.joinedAt), lang, { weekday: 'short', day: 'numeric', month: 'short' }), time: hhmmOf(r.joinedAt) })}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-[14px] text-ink-muted">{t('players.noWaitlist')}</p>}
              <p className="mt-2 text-[13px] leading-snug text-ink-muted">{t('players.waitRule', { m: PICKUP.waitlistMinutes })}</p>
            </section>
            {st.out.length > 0 && (
              <section>
                <h2 className="mb-1 text-[15px] font-semibold text-ink-soft">{t('players.out')}</h2>
                <p className="text-[14px] text-ink-muted">{st.out.map((r) => labelOf(r.playerId)).join(', ')}</p>
              </section>
            )}
          </aside>
        </div>
      )}

      {tab === 'teams' && (
        <div className="space-y-6">
          <MolaDock hide />
          {game.status === 'cancelled' ? <p className="text-[14.5px] text-ink-muted">{t('game.cancelledBody')}</p> : (
            <>
              {amAdmin && !host.active && <PlanGate what={t('plan.what.teams')}><span /></PlanGate>}
              {amAdmin && host.active
                ? <TeamsBoard game={game} ids={playing} labelOf={labelOf} strengthOf={strength} editable />
                : game.teams ? <TeamsBoard game={game} ids={playing} labelOf={labelOf} strengthOf={strength} editable={false} />
                  : !amAdmin && <p className="rounded-card border border-dashed border-line bg-paper/60 px-4 py-5 text-[14.5px] text-ink-muted">{t('teams.notYet')}</p>}
              <ScoreBox game={game} amAdmin={amAdmin} now={now} editing={scoreEdit} setEditing={setScoreEdit} />
            </>
          )}
        </div>
      )}

      {tab === 'pay' && <PaymentsPanel game={game} group={group} going={going} labelOf={(r) => labelOf(r.playerId)} subOf={subOf} me={me} hostName={hostName} amAdmin={amAdmin} />}
      {tab === 'ratings' && <RatingsPanel game={game} rsvps={gameRsvps} ratings={data.ratings} me={me} labelOf={labelOf} />}

      {amAdmin && (
        <div className="mt-10 border-t border-line pt-5">
          {open && phase === 'before' && <button type="button" className="btn-ghost text-clay-700" onClick={() => cancelGame(game.id)}>{t('game.cancel')}</button>}
          {game.status === 'cancelled' && <button type="button" className="btn-outline" onClick={() => reopenGame(game.id)}>{t('game.reopen')}</button>}
        </div>
      )}

      <AddPlayerModal open={addOpen} onClose={() => setAddOpen(false)} gameId={game.id} members={data.players.filter((p) => !gameRsvps.some((r) => r.playerId === p.id && r.status !== 'out'))} goingMembers={data.players.filter((p) => gameRsvps.some((r) => r.playerId === p.id && r.status === 'going'))} allowGuests={group.allowGuests} onDone={say} />
      <GuestModal open={guestOpen} onClose={() => setGuestOpen(false)} onSubmit={async (name) => { if (me) say((await addGuest(game.id, me.id, name)) === 'going' ? 'guestGoing' : 'guestWaitlist') }} />
      <PlayerCardModal player={card} onClose={() => setCardId(null)} data={data} stats={card ? stats.get(card.id) : undefined} amAdmin={amAdmin} game={game} rsvp={cardRsvp} now={now} />
    </div>
  )
}

const tierOk = (tier: import('../../lib/types').PickupTier | null | undefined, min: import('../../lib/types').PickupTier) => {
  const rank = { bronze: 1, silver: 2, gold: 3 } as const
  return (tier ? rank[tier] : 0) >= rank[min]
}
function localDate(isoInstant: string) {
  const d = new Date(isoInstant)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function fmtDist(m: number, lang: 'fr' | 'en') {
  if (m < 1000) return `${m} m`
  return `${new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 }).format(m / 1000)} km`
}

function ScoreBox({ game, amAdmin, now, editing, setEditing }: { game: Game; amAdmin: boolean; now: number; editing: boolean; setEditing: (v: boolean) => void }) {
  const { t } = useT('pickup')
  const [a, setA] = useState(game.score?.a ?? 0)
  const [b, setB] = useState(game.score?.b ?? 0)
  const started = now >= checkinWindow(game).kickoff
  if (!amAdmin) return null
  if (game.status === 'played' && game.score && !editing) return (
    <section className="card card-pad flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-[13px] font-semibold text-ink-muted">{t('score.final')}</div><div className="num mt-1 font-display text-[30px] leading-none text-ink">{t('teams.a')} {game.score.a} - {game.score.b} {t('teams.b')}</div></div>
      <button type="button" className="btn-outline" onClick={() => { setA(game.score!.a); setB(game.score!.b); setEditing(true) }}>{t('score.edit')}</button>
    </section>
  )
  if (!started) return <p className="text-[14px] text-ink-muted">{t('score.afterKickoff')}</p>
  return (
    <section className="card card-pad">
      <h3 className="mb-4 text-[17px] text-ink">{t('score.title')}</h3>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div><div className="mb-1.5 text-[13.5px] font-semibold text-ink-soft">{t('teams.a')}</div><Stepper value={a} onChange={setA} label={t('teams.a')} /></div>
        <div><div className="mb-1.5 text-[13.5px] font-semibold text-ink-soft">{t('teams.b')}</div><Stepper value={b} onChange={setB} label={t('teams.b')} /></div>
      </div>
      {!game.teams && <p className="mt-3 text-[13.5px] text-ink-muted">{t('score.noTeams')}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={async () => { await setScore(game.id, { a, b }); setEditing(false) }}>{t('score.save')}</button>
        {editing && <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</button>}
      </div>
    </section>
  )
}

function AddPlayerModal({ open, onClose, gameId, members, goingMembers, allowGuests, onDone }: {
  open: boolean; onClose: () => void; gameId: string; members: import('../../lib/types').PickupPlayer[]; goingMembers: import('../../lib/types').PickupPlayer[]; allowGuests: boolean; onDone: (k: string) => void
}) {
  const { t } = useT('pickup')
  const [q, setQ] = useState('')
  const [guest, setGuest] = useState({ name: '', by: '' })
  const list = members.filter((p) => !q || `${p.nickname} ${p.name}`.toLowerCase().includes(q.toLowerCase()))
  const add = async (pid: string) => { onDone(`admin.${await rsvpGoing(gameId, pid, { byAdmin: true })}`) }
  const addG = async (e: FormEvent) => {
    e.preventDefault()
    if (!guest.name.trim() || !guest.by) return
    onDone((await addGuest(gameId, guest.by, guest.name)) === 'going' ? 'guestGoing' : 'guestWaitlist')
    setGuest({ name: '', by: '' })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={t('players.addTitle')}>
      <p className="mb-3 text-[14px] text-ink-muted">{t('players.addBody')}</p>
      <label htmlFor="ap-q" className="sr-only">{t('players.search')}</label>
      <input id="ap-q" className="input mb-3" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('players.search')} />
      {list.length ? (
        <ul className="divide-y divide-line rounded-card border border-line">
          {list.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <Avatar name={p.nickname} size={34} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold text-ink">{p.nickname}</span><span className="block truncate text-[12.5px] text-ink-muted">{p.name}</span></span>
              <button type="button" className="btn-primary btn-sm" onClick={() => add(p.id)}>{t('players.addOne')}</button>
            </li>
          ))}
        </ul>
      ) : <p className="text-[14px] text-ink-muted">{t('players.allIn')}</p>}
      {allowGuests && goingMembers.length > 0 && (
        <form onSubmit={addG} className="mt-6 border-t border-line pt-4">
          <h3 className="mb-3 text-[16px] text-ink">{t('players.guestTitle')}</h3>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Field label={t('guest.name')} htmlFor="ag-name"><input id="ag-name" className="input" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} /></Field>
            <Field label={t('guest.by')} htmlFor="ag-by">
              <select id="ag-by" className="input" value={guest.by} onChange={(e) => setGuest({ ...guest, by: e.target.value })}>
                <option value="">{t('guest.pick')}</option>
                {goingMembers.map((p) => <option key={p.id} value={p.id}>{p.nickname}</option>)}
              </select>
            </Field>
          </div>
          <button type="submit" className="btn-outline" disabled={!guest.name.trim() || !guest.by}>{t('guest.add')}</button>
        </form>
      )}
    </Modal>
  )
}

function GuestModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (name: string) => Promise<void> }) {
  const { t } = useT('pickup')
  const [name, setName] = useState('')
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!name.trim()) return; await onSubmit(name); setName(''); onClose() }
  return (
    <Modal open={open} onClose={onClose} title={t('guest.title')}
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>{t('common.cancel')}</button><button type="submit" form="pk-guest" className="btn-primary" disabled={!name.trim()}>{t('guest.add')}</button></>}>
      <form id="pk-guest" onSubmit={submit}>
        <p className="mb-4 text-[14px] text-ink-muted">{t('guest.body')}</p>
        <Field label={t('guest.name')} htmlFor="pg-name"><input id="pg-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      </form>
    </Modal>
  )
}
