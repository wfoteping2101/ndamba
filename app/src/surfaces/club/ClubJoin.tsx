// /rejoindre-club/:code: the page an invitation link opens. Club data lives on the club's device until
// accounts exist, so on another device the page says so plainly instead of pretending to join.
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { Building2, ShieldCheck } from 'lucide-react'
import { db } from '../../lib/db'
import { useT } from '../../i18n'
import type { Club, Member } from '../../lib/types'

export default function ClubJoin() {
  const { code = '' } = useParams()
  const { t } = useT('club')
  const data = useLiveQuery(async () => {
    const [club, member] = await Promise.all([db.club.get('club'), db.members.get(`mb_${code.trim()}`)])
    const teams = member ? await db.teams.bulkGet(member.teamIds) : []
    return { club: club ?? null, member: member ?? null, teams: teams.filter(Boolean).map((x) => x!.name) }
  }, [code], undefined as undefined | { club: Club | null; member: Member | null; teams: string[] })
  if (!data) return <div className="min-h-[50vh]" />
  const { club, member, teams } = data
  return (
    <div className="container-page max-w-xl py-14">
      <div className="card card-pad text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-forest-600 text-cream"><Building2 size={26} strokeWidth={1.75} /></span>
        {club && member ? (
          <>
            <h1 className="mt-4 font-display text-[26px] font-semibold text-ink">{t('join.title', { club: club.name })}</h1>
            <p className="mt-2 text-[15px] text-ink-soft">{t('join.for', { name: member.name, role: t(`roles.${member.role}`).toLowerCase() })}</p>
            {teams.length > 0 && <p className="mt-1 text-[14px] text-ink-muted">{teams.join(', ')}</p>}
            <p className="mt-4 rounded-xl bg-sand/60 px-4 py-3 text-left text-[13.5px] leading-relaxed text-ink-soft"><ShieldCheck size={15} className="mr-1.5 inline -mt-0.5 text-forest-700" aria-hidden="true" />{t('join.honest')}</p>
            <Link to="/app/club/membres" className="btn-primary mt-5 inline-flex">{t('join.open')}</Link>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-display text-[24px] font-semibold text-ink">{t('join.unknownTitle')}</h1>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">{t('join.unknown')}</p>
            <Link to="/" className="btn-outline mt-5 inline-flex">{t('join.home')}</Link>
          </>
        )}
      </div>
    </div>
  )
}
