// « Matchs entre amis » home: my next games, my groups, create or join a group, the organiser plan.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, MapPin, Plus, Users, Wallet } from 'lucide-react'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { Callout, EmptyState, PageHeader } from '../../ui'
import { useT } from '../../i18n'
import { cx } from '../../lib/util'
import type { PickupGame, PickupGroup, PickupPlayer } from '../../lib/types'
import { fmtMoney, gameOver, gameState, joinByCode, type PickupRsvpX } from '../../lib/pickup'
import { seedPickup } from '../../lib/seedPickup'
import { DateTile, dayName, hhmmOf, PlanCard, SW, useNow } from './components/kit'
import { CreateGroupModal } from './components/forms'

const PENDING_KEY = 'njangi.pickup.pendingCode'

interface HomeData { groups: PickupGroup[]; players: PickupPlayer[]; games: PickupGame[]; rsvps: PickupRsvpX[] }

export default function PickupHome() {
  const { t, lang } = useT('pickup')
  const { profile } = useSession()
  const nav = useNavigate()
  useDocumentTitle(t('title'))
  const now = useNow()
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const data = useLiveQuery(async () => {
    const [groups, players, games, rsvps] = await Promise.all([db.pickupGroups.toArray(), db.pickupPlayers.toArray(), db.pickupGames.toArray(), db.pickupRsvps.toArray()])
    return { groups, players, games, rsvps: rsvps as PickupRsvpX[] } as HomeData
  }, [], undefined as HomeData | undefined)

  const view = useMemo(() => {
    if (!data) return null
    const me = data.players.filter((p) => p.isMe)
    const myIds = new Set(me.map((p) => p.id))
    const myGroups = data.groups.filter((g) => me.some((p) => p.groupId === g.id))
      .sort((a, b) => Number(myIds.has(b.adminIds[0])) - Number(myIds.has(a.adminIds[0])) || a.name.localeCompare(b.name))
    const hosted = myGroups.filter((g) => g.adminIds[0] && myIds.has(g.adminIds[0])).length
    const upcoming = data.games.filter((g) => g.status === 'open' && !gameOver(g, now)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    const mine = upcoming.map((g) => {
      const st = gameState(g, data.rsvps)
      const r = data.rsvps.find((x) => x.gameId === g.id && myIds.has(x.playerId) && !x.guestOf && x.status !== 'out')
      return { game: g, st, rsvp: r, group: data.groups.find((x) => x.id === g.groupId)! }
    }).filter((x) => x.rsvp && x.group)
    return { me, myIds, myGroups, hosted, upcoming, mine }
  }, [data, now])

  if (!data || !view) return <div className="grid min-h-[40vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>

  const loadExample = async () => { setLoading(true); await seedPickup(lang); setLoading(false) }
  const header = (
    <PageHeader title={t('title')} subtitle={t('home.subtitle')}
      actions={<button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={18} strokeWidth={SW} aria-hidden="true" />{t('home.create')}</button>} />
  )

  return (
    <div data-tour="pickup-home">
      {header}
      <PendingInvite onJoined={(id) => nav(`/app/pickup/${id}`)} name={profile?.name ?? ''} />
      {view.myGroups.length === 0 ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-6">
            <EmptyState icon={<Users strokeWidth={SW} />} title={t('home.emptyTitle')} body={t('home.emptyBody')}
              action={<>
                <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={17} strokeWidth={SW} aria-hidden="true" />{t('home.create')}</button>
                <button type="button" className="btn-outline" onClick={loadExample} disabled={loading}>{loading ? t('home.loading') : t('home.example')}</button>
              </>} />
            <JoinByCode name={profile?.name ?? ''} />
          </div>
          <aside className="space-y-6"><PlanCard /><HonestNote /></aside>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0 space-y-10">
            <section aria-labelledby="next-h">
              <h2 id="next-h" className="mb-3 text-[20px] text-ink sm:text-[22px]">{t('home.nextTitle')}</h2>
              {view.mine.length ? (
                <div className="space-y-3">
                  {view.mine.map((x, i) => <NextGameCard key={x.game.id} {...x} rsvp={x.rsvp!} tour={i === 0} />)}
                </div>
              ) : (
                <p className="rounded-card border border-dashed border-line bg-paper/60 px-4 py-5 text-[14.5px] text-ink-muted" data-tour="pickup-game">{t('home.noNext')}</p>
              )}
            </section>
            <section aria-labelledby="groups-h">
              <h2 id="groups-h" className="mb-3 text-[20px] text-ink sm:text-[22px]">{t('home.groupsTitle')}</h2>
              <ul className="card divide-y divide-line overflow-hidden">
                {view.myGroups.map((g) => {
                  const meP = view.me.find((p) => p.groupId === g.id)!
                  const count = data.players.filter((p) => p.groupId === g.id).length
                  const next = view.upcoming.find((x) => x.groupId === g.id)
                  const role = g.adminIds[0] === meP.id ? 'host' : g.adminIds.includes(meP.id) ? 'coadmin' : 'player'
                  return (
                    <li key={g.id}>
                      <Link to={`/app/pickup/${g.id}`} className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-sand/50">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest-50 font-display text-[15px] text-forest-700" aria-hidden="true">{g.perSide}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[16px] font-semibold leading-snug text-ink">{g.name}</span>
                            <span className={cx('rounded-full px-2 py-[2px] text-[11.5px] font-semibold', role === 'player' ? 'bg-sand text-ink-soft' : 'bg-forest-50 text-forest-700')}>{t(`role.${role}`)}</span>
                          </div>
                          <div className="mt-0.5 truncate text-[13px] text-ink-muted">
                            {[t('group.vs', { n: g.perSide }), g.defaultDay !== undefined ? `${dayName(g.defaultDay, lang)}${g.defaultTime ? ` ${g.defaultTime}` : ''}` : '', t('group.members', { count })].filter(Boolean).join(', ')}
                          </div>
                          {next && <div className="mt-1 text-[13px] text-forest-700">{t('home.groupNext', { date: dateShort(next.date, lang), time: next.time, n: gameState(next, data.rsvps).spotsLeft })}</div>}
                        </div>
                        <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
            <JoinByCode name={profile?.name ?? ''} />
          </div>
          <aside className="space-y-6"><PlanCard /><HonestNote /></aside>
        </div>
      )}
      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} hostedCount={view.hosted} />
    </div>
  )
}

function dateShort(iso: string, lang: 'fr' | 'en') {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

function NextGameCard({ game, group, st, rsvp, tour }: { game: PickupGame; group: PickupGroup; st: ReturnType<typeof gameState>; rsvp: PickupRsvpX; tour: boolean }) {
  const { t, lang } = useT('pickup')
  const pos = st.waitlist.findIndex((r) => r.id === rsvp.id) + 1
  const status = rsvp.pending ? 'pending' : rsvp.offerUntil ? 'offered' : rsvp.status === 'waitlist' ? 'waitlist' : 'going'
  const taken = st.going.length
  return (
    <Link to={`/app/pickup/match/${game.id}`} data-tour={tour ? 'pickup-game' : undefined}
      className="group block rounded-panel bg-forest-600 p-4 text-cream transition-colors hover:bg-forest-700 sm:p-5">
      <div className="flex items-start gap-4">
        <DateTile iso={game.date} dark />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-cream/75">{group.name}</div>
          <div className="mt-0.5 font-display text-[22px] leading-tight sm:text-[24px]">{t('home.kickoff', { time: game.time })}</div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-cream/85">
            <span className="inline-flex items-center gap-1.5"><MapPin size={15} strokeWidth={SW} aria-hidden="true" />{group.venue}</span>
            <span className="inline-flex items-center gap-1.5"><Wallet size={15} strokeWidth={SW} aria-hidden="true" />{game.fee ? fmtMoney(game.fee, group.currency, lang) : t('common.free')}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-3.5 text-[13.5px]">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cx('rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold', status === 'going' ? 'bg-white text-forest-700' : status === 'offered' ? 'bg-sun-500 text-ink' : 'bg-white/15 text-cream')}>
            {status === 'waitlist' ? t('status.waitlistPos', { n: pos }) : status === 'offered' ? t('status.offeredUntil', { time: hhmmOf(rsvp.offerUntil!) }) : t(`status.${status}`)}
          </span>
          <span className="num text-cream/85">{t('home.spots', { taken, cap: game.cap })}{st.waitlist.length ? `, ${t('home.waiting', { count: st.waitlist.length })}` : ''}</span>
        </span>
        <span className="inline-flex items-center gap-1 font-semibold">{t('home.open')}<ChevronRight size={16} aria-hidden="true" /></span>
      </div>
    </Link>
  )
}

function JoinByCode({ name }: { name: string }) {
  const { t } = useT('pickup')
  const nav = useNavigate()
  const [code, setCode] = useState('')
  const [err, setErr] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(false)
    const id = await joinByCode(code, { name: name || t('common.me') })
    if (id) nav(`/app/pickup/${id}`)
    else setErr(true)
  }
  return (
    <section aria-labelledby="join-h">
      <h2 id="join-h" className="mb-1 text-[18px] text-ink">{t('home.joinTitle')}</h2>
      <p className="mb-3 text-[14px] text-ink-muted">{t('home.joinBody')}</p>
      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="pk-code" className="sr-only">{t('home.joinLabel')}</label>
        <input id="pk-code" className="input max-w-[220px] font-semibold uppercase tracking-[0.08em]" value={code} maxLength={12} autoComplete="off" autoCapitalize="characters"
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(false) }} placeholder="ABCD23" />
        <button type="submit" className="btn-outline shrink-0" disabled={code.trim().length < 4}>{t('home.joinCta')}</button>
      </form>
      {err && <p className="mt-2 text-[13.5px] leading-snug text-clay-700" role="alert">{t('home.joinNotFound')}</p>}
    </section>
  )
}

/** An invite opened before the profile existed (from /rejoindre/:code): offer to finish joining here. */
function PendingInvite({ onJoined, name }: { onJoined: (id: string) => void; name: string }) {
  const { t } = useT('pickup')
  const [code, setCode] = useState<string | null>(null)
  useEffect(() => { try { setCode(localStorage.getItem(PENDING_KEY)) } catch { /* storage unavailable */ } }, [])
  const group = useLiveQuery(async () => (code ? (await db.pickupGroups.where('inviteCode').equals(code).first()) ?? null : null), [code], null as PickupGroup | null)
  if (!code || !group) return null
  const done = () => { try { localStorage.removeItem(PENDING_KEY) } catch { /* storage unavailable */ } setCode(null) }
  return (
    <div className="mb-6">
      <Callout title={t('home.pendingTitle', { name: group.name })}>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn-primary btn-sm" onClick={async () => { const id = await joinByCode(code, { name: name || t('common.me') }); done(); if (id) onJoined(id) }}>{t('join.cta')}</button>
          <button type="button" className="btn-ghost btn-sm" onClick={done}>{t('common.dismiss')}</button>
        </div>
      </Callout>
    </div>
  )
}

function HonestNote() {
  const { t } = useT('pickup')
  return <Callout tone="terra" title={t('home.honestTitle')}>{t('home.honestBody')}</Callout>
}
