// Aperçu: the club card (crest, presentation, the game model shared by every team), the key numbers
// of the season, and what each team needs next.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Pencil } from 'lucide-react'
import { useT } from '../../../i18n'
import { PLANS } from '../../../lib/config'
import { fmtNjangi } from '../../../lib/njangi'
import type { MatchEvent, Plan } from '../../../lib/types'
import { fmtDate, money } from '../../../lib/util'
import { currentSeason, teamSeason, type ClubData, type TeamSeason } from '../components/data'
import { Crest } from '../components/bits'
import { useOpenTeam } from '../components/useOpenTeam'

export function Overview({ data, eventsByMatch, plan, onEdit }: { data: ClubData; eventsByMatch: Map<string, MatchEvent[]>; plan?: Plan; onEdit: () => void }) {
  const { t, lang } = useT('club')
  const club = data.club!
  const season = currentSeason()
  const seasons = useMemo(() => data.teams.map((tm) => teamSeason(tm, data, eventsByMatch, season)), [data, eventsByMatch, season.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const coded = seasons.reduce((a, s) => a + s.coded.length, 0)
  const active = data.members.filter((m) => m.status === 'active').length
  const invited = data.members.length - active
  const codedVideos = data.videos.filter((v) => v.tags.some((x) => x.code !== 'NOTE') || (v.matchId && (eventsByMatch.get(v.matchId) ?? []).some((e) => e.videoT != null))).length
  const clubPrice = PLANS.find((p) => p.id === 'club')?.usdMonth ?? 49
  const onClubPlan = plan === 'club' || plan === 'federation'

  const numbers: [string, number, string][] = [
    [t('overview.teams'), data.teams.length, t('overview.teamsHint', { count: data.players.length })],
    [t('overview.members'), data.members.length, invited ? t('overview.invitedHint', { count: invited }) : t('overview.activeHint', { count: active })],
    [t('overview.videos'), data.videos.length, t('overview.videosHint', { count: codedVideos })],
    [t('overview.coded'), coded, t('overview.codedHint', { season: season.label })],
  ]

  return (
    <div>
      <section data-tour="club-overview" className="overflow-hidden rounded-panel border border-line bg-paper">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-0">
          <div className="lg:pr-10">
            <div className="flex items-center gap-4">
              <Crest name={club.name} colors={club.colors} size={44} />
              <div className="min-w-0">
                <h2 className="text-[20px] leading-tight text-ink sm:text-[22px]">{t('overview.identity')}</h2>
                <div className="mt-1 flex items-center gap-2 text-[13px] text-ink-muted">
                  <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: club.colors.primary }} /><span aria-hidden="true" className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: club.colors.secondary }} /></span>
                  {t('overview.colors')}
                </div>
              </div>
            </div>
            {club.about && <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink-soft">{club.about}</p>}
          </div>
          <div className="border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[16px] leading-tight text-ink">{t('overview.model')}</h3>
              <button type="button" onClick={onEdit} className="btn-ghost btn-sm -mr-2 min-h-[40px]"><Pencil size={15} />{t('overview.editModel')}</button>
            </div>
            {club.gameModel
              ? <p className="mt-2 max-w-2xl text-[15.5px] italic leading-relaxed text-ink">{club.gameModel}</p>
              : <p className="mt-2 text-[14.5px] text-ink-muted">{t('overview.modelEmpty')}</p>}
            <p className="mt-3 text-[13px] text-ink-muted">{t('overview.modelShared')}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t border-line bg-cream/60 sm:grid-cols-4">
          {numbers.map(([label, value, hint], i) => (
            <div key={label} className={`border-line px-4 py-4 sm:px-6 sm:py-5 ${i % 2 === 0 ? 'border-r' : i < 3 ? 'sm:border-r' : ''} ${i < 2 ? 'border-b sm:border-b-0' : ''}`}>
              <dt className="text-[13px] font-semibold leading-snug text-ink-muted">{label}</dt>
              <dd className="mt-2">
                <span className="num block font-display text-[32px] leading-none text-ink sm:text-[38px]">{value}</span>
                <span className="mt-1.5 block text-[12.5px] leading-snug text-ink-muted">{hint}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {!onClubPlan && (
        <p className="mt-4 text-[13.5px] leading-relaxed text-ink-muted">
          {t('overview.planNote', { plan: t(`common:plans.${plan ?? 'free'}`), price: money(clubPrice, lang) })}{' '}
          <Link to="/app/premium" className="link">{t('overview.planLink')}</Link>
        </p>
      )}

      <section className="mt-10" aria-labelledby="club-needs">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 id="club-needs" className="text-[20px] leading-tight text-ink sm:text-[22px]">{t('overview.needsTitle')}</h2>
          <Link to="/app/club/equipes" className="link shrink-0 whitespace-nowrap text-[14px]">{t('overview.allTeams')}</Link>
        </div>
        {seasons.length === 0 ? (
          <p className="rounded-card border border-line bg-paper px-4 py-5 text-[14.5px] text-ink-muted">{t('overview.noTeams')}</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
            {seasons.map((s) => <NeedRow key={s.team.id} s={s} lang={lang} />)}
          </ul>
        )}
      </section>
    </div>
  )
}

function NeedRow({ s, lang }: { s: TeamSeason; lang: 'fr' | 'en' }) {
  const { t } = useT('club')
  const open = useOpenTeam()
  const { team } = s
  let main: string, to: string
  if (s.players.length === 0) { main = t('needs.players'); to = '/app/equipe' }
  else if (!s.result) { main = t('needs.code'); to = '/app/analyse' }
  else if (s.weakest) { main = t('needs.weak', { sub: t(`subs.${s.weakest}`), v: fmtNjangi(s.result.sub[s.weakest], lang) }); to = '/app/semaine' }
  else { main = t('needs.none'); to = '/app/equipe' }
  const next = s.next ? t('needs.next', { date: fmtDate(s.next.date, lang, { weekday: 'short', day: 'numeric', month: 'short' }), opponent: s.next.opponent }) : t('needs.noNext')
  return (
    <li>
      <button type="button" onClick={() => open(team.id, to)} className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-sand/50 sm:gap-4 sm:px-5">
        <span aria-hidden="true" className="h-9 w-9 shrink-0 rounded-full ring-2 ring-paper" style={{ background: `linear-gradient(135deg, ${team.colors?.primary || '#0B5D3B'} 50%, ${team.colors?.secondary || '#F5B700'} 50%)` }} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[15.5px] font-semibold text-ink">{team.name}</span>
            {s.result && <span className="num text-[13px] font-semibold text-forest-700">{t('needs.indice', { v: fmtNjangi(s.result.total, lang) })}</span>}
          </span>
          <span className="mt-0.5 block text-[14px] leading-snug text-ink-soft">{main}</span>
          <span className="mt-0.5 block text-[13px] text-ink-muted">{next}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-faint transition group-hover:translate-x-0.5" aria-hidden="true" />
      </button>
    </li>
  )
}
