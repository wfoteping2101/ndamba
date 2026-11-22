// Public invite preview (/rejoindre/:code). The group lives on the organiser's device: when it is on this one,
// the preview shows it and lets the visitor join; otherwise it says honestly how invites work today.
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, MapPin, Users, Wallet } from 'lucide-react'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { useT } from '../../i18n'
import type { PickupGame, PickupGroup, PickupPlayer } from '../../lib/types'
import { fmtMoney, gameOver, gameState, joinByCode, type PickupRsvpX } from '../../lib/pickup'
import { dayName, longDate, SW } from './components/kit'

interface JoinData { group: PickupGroup; players: PickupPlayer[]; next: PickupGame | null; rsvps: PickupRsvpX[] }

export default function PickupJoin() {
  const { code = '' } = useParams()
  const { t, lang } = useT('pickup')
  const { profile } = useSession()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  useDocumentTitle(t('join.docTitle'))
  const data = useLiveQuery(async () => {
    const group = await db.pickupGroups.where('inviteCode').equals(clean).first()
    if (!group) return null
    const [players, games] = await Promise.all([db.pickupPlayers.where('groupId').equals(group.id).toArray(), db.pickupGames.where('groupId').equals(group.id).toArray()])
    const next = games.filter((g) => g.status === 'open' && !gameOver(g)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0] ?? null
    const rsvps = next ? ((await db.pickupRsvps.where('gameId').equals(next.id).toArray()) as PickupRsvpX[]) : []
    return { group, players, next, rsvps } as JoinData
  }, [clean], undefined as JoinData | null | undefined)

  const member = !!data?.players.some((p) => p.isMe)
  const join = async () => {
    if (!profile) {
      try { localStorage.setItem('njangi.pickup.pendingCode', clean) } catch { /* storage unavailable */ }
      nav('/bienvenue')
      return
    }
    setBusy(true)
    const id = await joinByCode(clean, { name: profile.name })
    setBusy(false)
    if (id) nav(`/app/pickup/${id}`)
  }

  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto max-w-xl">
        {data === undefined ? (
          <div className="grid min-h-[30vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>
        ) : data ? (
          <article className="overflow-hidden rounded-panel border border-line bg-paper">
            <div className="bg-forest-600 px-5 py-6 text-cream sm:px-7 sm:py-8">
              <p className="text-[13.5px] font-semibold text-cream/80">{t('join.label')}</p>
              <h1 className="mt-2 text-balance text-[28px] leading-tight text-cream sm:text-[34px]">{data.group.name}</h1>
              <p className="mt-2 inline-flex items-center gap-1.5 text-[14.5px] text-cream/85"><MapPin size={16} strokeWidth={SW} aria-hidden="true" />{[data.group.venue, data.group.city].filter(Boolean).join(', ')}</p>
            </div>
            <div className="px-5 py-5 sm:px-7 sm:py-6">
              <ul className="space-y-2.5 text-[15px] text-ink-soft">
                <li className="flex items-center gap-2.5"><Users size={18} strokeWidth={SW} className="text-forest-600" aria-hidden="true" />{t('join.format', { n: data.group.perSide, count: data.players.length })}</li>
                {data.group.defaultDay !== undefined && <li className="flex items-center gap-2.5"><CalendarDays size={18} strokeWidth={SW} className="text-forest-600" aria-hidden="true" />{t(data.group.defaultTime ? 'group.usual' : 'group.usualNoTime', { day: dayName(data.group.defaultDay, lang), time: data.group.defaultTime })}</li>}
                <li className="flex items-center gap-2.5"><Wallet size={18} strokeWidth={SW} className="text-forest-600" aria-hidden="true" />{data.group.defaultFee ? t('group.feeChip', { fee: fmtMoney(data.group.defaultFee, data.group.currency, lang) }) : t('common.free')}</li>
              </ul>
              {data.next && (() => {
                const st = gameState(data.next, data.rsvps)
                return (
                  <div className="mt-5 rounded-card bg-sand px-4 py-3.5">
                    <div className="text-[13px] font-semibold text-ink-muted">{t('join.next')}</div>
                    <div className="mt-1 text-[16px] font-semibold text-ink">{longDate(data.next.date, lang)}, {data.next.time}</div>
                    <div className="num mt-0.5 text-[14px] text-ink-muted">{t('home.spots', { taken: st.going.length, cap: data.next.cap })}{st.waitlist.length ? `, ${t('home.waiting', { count: st.waitlist.length })}` : ''}</div>
                  </div>
                )
              })()}
              <div className="mt-6 flex flex-wrap gap-2">
                {member
                  ? <Link to={`/app/pickup/${data.group.id}`} className="btn-primary btn-lg">{t('join.open')}</Link>
                  : <button type="button" className="btn-primary btn-lg" onClick={join} disabled={busy}>{profile ? t('join.cta') : t('join.ctaProfile')}</button>}
              </div>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink-muted">{t('join.free')}</p>
            </div>
          </article>
        ) : (
          <article className="rounded-panel border border-line bg-paper px-5 py-7 sm:px-8 sm:py-9">
            <p className="text-[13.5px] font-semibold text-forest-600">{t('join.label')}</p>
            <h1 className="mt-2 text-balance text-[28px] leading-tight text-ink sm:text-[34px]">{t('join.unknownTitle')}</h1>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">{t('join.unknownBody')}</p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-control bg-sand px-3 py-2 text-[14px] text-ink-soft">{t('join.codeIs')} <code className="font-semibold tracking-wide text-ink">{clean}</code></p>
            <p className="mt-4 text-[14px] leading-relaxed text-ink-muted">{t('join.roadmap')}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to={profile ? '/app/pickup' : '/bienvenue'} className="btn-primary">{profile ? t('join.openApp') : t('join.start')}</Link>
              <Link to="/" className="btn-outline">{t('join.discover')}</Link>
            </div>
          </article>
        )}
      </div>
    </div>
  )
}
