// The public recruitment profile (/profil/:id, site layout). It reads this device's data and shows only a
// profile the club made public. Until accounts exist, the link works on this device only, and the page says so.
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useT } from '../../i18n'
import { useDocumentTitle } from '../../lib/hooks'
import type { Clip, VideoProject } from '../../lib/types'
import { todayISO } from '../../lib/util'
import { EmptyState } from '../../ui'
import { Crest } from './components/bits'
import { consentOk } from './components/consent'
import { currentSeason, groupBy, playerSeason, resolveClip, useClubData } from './components/data'
import { HighlightReel } from './components/HighlightReel'
import { SeasonNumbers } from './components/SeasonNumbers'
import { shortTeam } from './tabs/PlayersTab'

export default function PublicProfile() {
  const { id = '' } = useParams()
  const { t } = useT('club')
  const data = useClubData()
  const player = data.players.find((p) => p.id === id)
  const visible = !!player && !!player.recruit?.public && !!data.club?.publicProfiles && consentOk(player)
  useDocumentTitle(visible && player ? t('public.docTitle', { name: player.name }) : t('public.title'))
  const eventsByMatch = useMemo(() => groupBy(data.events, (e) => e.matchId), [data.events])
  const season = useMemo(() => (player ? playerSeason(player, data.matches, eventsByMatch) : null), [player, data.matches, eventsByMatch])

  if (!data.ready) return <div className="grid min-h-[50vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>
  if (!player || !visible || !season) {
    return (
      <div className="container-page py-14">
        <div className="mx-auto max-w-xl">
          <EmptyState icon={<Lock size={26} />} title={t('public.hiddenTitle')} body={t('public.hiddenBody')}
            action={<Link to="/" className="btn-outline min-h-[44px]">{t('public.home')}</Link>} />
        </div>
      </div>
    )
  }

  const club = data.club!
  const team = data.teams.find((tm) => tm.id === player.teamId)
  const r = player.recruit!
  // only clips a visitor can play: a file kept on the club's device stays private
  const clips = (r.highlightClipIds ?? []).map((k) => resolveClip(k, data.videos)).filter((x): x is { video: VideoProject; clip: Clip } => !!x && x.video.source !== 'file' && !!x.video.url)
  const age = player.birthYear ? Number(todayISO().slice(0, 4)) - player.birthYear : null
  const facts: [string, string][] = [
    [t('public.position'), t(`common:positions.${player.position}`, { defaultValue: player.position })],
    ...(age ? [[t('public.born'), t('public.bornValue', { y: player.birthYear, age })] as [string, string]] : []),
    ...(player.foot ? [[t('public.foot'), t(`feet.${player.foot}`)] as [string, string]] : []),
    ...(r.heightCm ? [[t('public.height'), t('public.heightValue', { cm: r.heightCm })] as [string, string]] : []),
    ...(player.number != null ? [[t('public.number'), String(player.number)] as [string, string]] : []),
  ]

  return (
    <div className="container-page pb-10 pt-8 sm:pt-12">
      <article className="mx-auto max-w-4xl">
        <header className="overflow-hidden rounded-panel bg-night-800 text-cream surface-dark">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
            <Crest name={club.name} colors={club.colors} size={64} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-cream/70">{t('public.eyebrow', { club: club.name })}</p>
              <h1 className="mt-1 text-balance text-[32px] leading-[1.03] text-cream sm:text-[46px]">{player.name}</h1>
              <p className="mt-2 text-[15px] text-cream/75">{[team ? shortTeam(team, club.name) : '', [club.city, club.country].filter(Boolean).join(', ')].filter(Boolean).join('. ')}</p>
            </div>
          </div>
          <dl className="flex flex-wrap border-t border-white/10">
            {facts.map(([k, v]) => (
              <div key={k} className="min-w-[50%] flex-1 border-b border-r border-white/10 px-5 py-3.5 sm:min-w-[9rem] sm:border-b-0 sm:px-6">
                <dt className="text-[12.5px] font-semibold text-cream/60">{k}</dt>
                <dd className="mt-0.5 text-[15px] font-semibold text-cream">{v}</dd>
              </div>
            ))}
          </dl>
        </header>

        {r.bio && <p className="mx-auto mt-8 max-w-3xl text-[17px] leading-relaxed text-ink-soft">{r.bio}</p>}

        {clips.length > 0 && (
          <section aria-labelledby="pp-clips" className="mt-10">
            <h2 id="pp-clips" className="mb-4 text-[22px] leading-tight text-ink sm:text-[26px]">{t('public.clips')}</h2>
            <HighlightReel items={clips} />
          </section>
        )}

        <section aria-labelledby="pp-season" className="mt-10">
          <h2 id="pp-season" className="mb-1 text-[22px] leading-tight text-ink sm:text-[26px]">{t('public.season', { season: currentSeason().label })}</h2>
          <p className="mb-4 text-[14px] text-ink-muted">{t('public.seasonHint')}</p>
          <SeasonNumbers s={season} />
        </section>

        {club.gameModel && (
          <section aria-labelledby="pp-model" className="mt-10 border-t border-line pt-8">
            <h2 id="pp-model" className="text-[18px] leading-tight text-ink">{t('public.model', { club: club.name })}</h2>
            <p className="mt-2 max-w-3xl text-[15.5px] italic leading-relaxed text-ink-soft">{club.gameModel}</p>
          </section>
        )}

        <p className="mt-10 rounded-card bg-sand px-4 py-3.5 text-[13.5px] leading-relaxed text-ink-muted">{t('public.deviceNote')}</p>
      </article>
    </div>
  )
}
