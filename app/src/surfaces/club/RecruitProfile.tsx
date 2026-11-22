// The recruitment profile of one player (/app/club/joueurs/:id): bio, height, foot, position, highlight clips
// picked from any video of the club, and the season from the coded matches. « Partager le profil » copies the
// public link (/profil/:id), which works on this device until accounts exist.
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ExternalLink, Plus, UserX, X } from 'lucide-react'
import { useT } from '../../i18n'
import { db } from '../../lib/db'
import { POSITIONS } from '../../lib/formations'
import { useDocumentTitle } from '../../lib/hooks'
import type { Clip, Player, VideoProject } from '../../lib/types'
import { cx, fmtClock } from '../../lib/util'
import { EmptyState, Progress } from '../../ui'
import { CopyButton, Switch } from './components/bits'
import { clipKey, completeness, COMPLETENESS, currentSeason, groupBy, playerSeason, publicUrl, resolveClip, useClubData } from './components/data'
import { HighlightReel } from './components/HighlightReel'
import { SeasonNumbers } from './components/SeasonNumbers'
import { setPublic, shortTeam } from './tabs/PlayersTab'

const MAX_CLIPS = 8

export default function RecruitProfile() {
  const { id = '' } = useParams()
  const { t } = useT('club')
  const data = useClubData()
  const player = data.players.find((p) => p.id === id)
  useDocumentTitle(player ? t('recruit.docTitle', { name: player.name }) : t('recruit.title'))
  if (!data.ready) return <div className="grid min-h-[50vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>
  if (!player) return <EmptyState icon={<UserX size={28} />} title={t('recruit.notFound')} body={t('recruit.notFoundBody')} action={<Link to="/app/club/joueurs" className="btn-primary min-h-[44px]">{t('recruit.back')}</Link>} />
  return <Editor key={player.id} player={player} data={data} />
}

function Editor({ player, data }: { player: Player; data: ReturnType<typeof useClubData> }) {
  const { t, lang } = useT('club')
  const team = data.teams.find((tm) => tm.id === player.teamId)
  const eventsByMatch = useMemo(() => groupBy(data.events, (e) => e.matchId), [data.events])
  const season = useMemo(() => playerSeason(player, data.matches, eventsByMatch), [player, data.matches, eventsByMatch])
  const comp = completeness(player, season.coded > 0 && (season.counts.PASS_OK > 0 || Object.values(season.actions).some((v) => v > 0)))
  const r = player.recruit
  const clubOpen = data.club?.publicProfiles ?? false
  const isPublic = !!r?.public && clubOpen
  const [bio, setBio] = useState(r?.bio ?? '')
  const [height, setHeight] = useState(r?.heightCm ? String(r.heightCm) : '')
  const [number, setNumber] = useState(player.number != null ? String(player.number) : '')
  const [birth, setBirth] = useState(player.birthYear ? String(player.birthYear) : '')
  const [saved, setSaved] = useState(false)
  const [picking, setPicking] = useState(false)
  useEffect(() => { if (!saved) return; const h = window.setTimeout(() => setSaved(false), 1600); return () => window.clearTimeout(h) }, [saved])

  const saveRecruit = async (patch: Partial<NonNullable<Player['recruit']>>) => {
    const cur = (await db.players.get(player.id))?.recruit
    await db.players.update(player.id, { recruit: { public: cur?.public ?? false, ...cur, ...patch } })
    setSaved(true)
  }
  const savePlayer = async (patch: Partial<Player>) => { await db.players.update(player.id, patch); setSaved(true) }
  const ids = r?.highlightClipIds ?? []
  const selected = ids.map((k) => resolveClip(k, data.videos)).filter((x): x is { video: VideoProject; clip: Clip } => !!x)
  const toggleClip = (key: string) => saveRecruit({ highlightClipIds: ids.includes(key) ? ids.filter((x) => x !== key) : [...ids, key].slice(0, MAX_CLIPS) })
  const url = publicUrl(player.id)
  const feet = ['R', 'L', 'B'] as const

  return (
    <div>
      <Link to="/app/club/joueurs" className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"><ArrowLeft size={16} />{t('recruit.back')}</Link>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="num grid h-14 w-14 shrink-0 place-items-center rounded-full bg-forest-600 font-display text-[22px] text-white">{player.number ?? '-'}</span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink-muted">{t('recruit.eyebrow')}</p>
            <h1 className="text-balance text-[28px] leading-[1.05] text-ink sm:text-[36px]">{player.name}</h1>
            <p className="mt-1 text-[14.5px] text-ink-muted">{[t(`common:positions.${player.position}`, { defaultValue: player.position }), team ? shortTeam(team, data.club?.name) : ''].filter(Boolean).join(', ')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPublic && <CopyButton text={url} label={t('recruit.share')} done={t('recruit.copied')} className="min-h-[44px]" />}
          <a href={`/profil/${player.id}`} target="_blank" rel="noopener" className="btn-ghost min-h-[44px]"><ExternalLink size={16} />{t('recruit.preview')}</a>
        </div>
      </header>

      <section className="mb-6 flex flex-col gap-3 rounded-card border border-line bg-paper px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink">{t('recruit.public')}</div>
          <p className="mt-0.5 text-[13.5px] leading-snug text-ink-muted">
            {!clubOpen ? t('recruit.clubClosed') : isPublic ? t('recruit.publicOn') : t('recruit.publicOff')}
            {!clubOpen && <>{' '}<Link to="/app/club/joueurs" className="link">{t('recruit.clubLink')}</Link></>}
          </p>
          {isPublic && <p className="mt-1 truncate font-mono text-[12.5px] text-ink-muted">{url}</p>}
        </div>
        <Switch checked={isPublic} disabled={!clubOpen} label={t('recruit.public')} onChange={(v) => setPublic(player, v)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <section aria-labelledby="rp-profile" className="rounded-panel border border-line bg-paper p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="rp-profile" className="text-[19px] leading-tight text-ink">{t('recruit.profile')}</h2>
            <span className={cx('inline-flex items-center gap-1 text-[12.5px] font-semibold text-forest-700 transition-opacity', saved ? 'opacity-100' : 'opacity-0')} aria-live="polite"><Check size={14} />{saved ? t('recruit.saved') : ''}</span>
          </div>
          <label htmlFor="rp-bio" className="label">{t('recruit.bio')}</label>
          <textarea id="rp-bio" className="input min-h-[120px]" value={bio} onChange={(e) => setBio(e.target.value)} onBlur={() => bio !== (r?.bio ?? '') && saveRecruit({ bio: bio.trim() || undefined })} placeholder={t('recruit.bioPh')} maxLength={600} />
          <p className="mb-4 mt-1.5 text-[13px] text-ink-muted">{t('recruit.bioHint', { n: bio.trim().length })}</p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="rp-height" className="label">{t('recruit.height')}</label>
              <input id="rp-height" className="input" inputMode="numeric" value={height} placeholder="175" onChange={(e) => setHeight(e.target.value.replace(/\D/g, '').slice(0, 3))}
                onBlur={() => { const v = Number(height); saveRecruit({ heightCm: v >= 120 && v <= 230 ? v : undefined }) }} />
            </div>
            <div>
              <label htmlFor="rp-number" className="label">{t('recruit.number')}</label>
              <input id="rp-number" className="input" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={() => savePlayer({ number: number ? Number(number) : undefined })} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="rp-birth" className="label">{t('recruit.birthYear')}</label>
              <input id="rp-birth" className="input" inputMode="numeric" value={birth} placeholder="2008" onChange={(e) => setBirth(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onBlur={() => { const v = Number(birth); savePlayer({ birthYear: v > 1950 && v < 2030 ? v : undefined }) }} />
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className="label">{t('recruit.foot')}</legend>
            <div className="flex flex-wrap gap-2">
              {feet.map((f) => (
                <button key={f} type="button" aria-pressed={player.foot === f} onClick={() => savePlayer({ foot: f })}
                  className={cx('chip min-h-[44px] cursor-pointer px-4 text-[14px]', player.foot === f ? 'chip-on' : 'hover:border-ink-faint hover:text-ink')}>{t(`feet.${f}`)}</button>
              ))}
            </div>
          </fieldset>

          <div className="mt-4">
            <label htmlFor="rp-pos" className="label">{t('recruit.position')}</label>
            <select id="rp-pos" className="input" value={player.position} onChange={(e) => savePlayer({ position: e.target.value })}>
              {POSITIONS.map((p) => <option key={p} value={p}>{t(`common:positions.${p}`)}</option>)}
            </select>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <div className="mb-1.5 flex items-center justify-between text-[14px]">
              <span className="font-semibold text-ink">{t('recruit.completeness')}</span>
              <span className="num font-semibold text-ink-muted">{comp.n}/{COMPLETENESS.length}</span>
            </div>
            <Progress value={comp.pct} tone={comp.pct === 100 ? 'forest' : 'sun'} />
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13.5px]">
              {COMPLETENESS.map((k) => (
                <li key={k} className={cx('flex items-center gap-2', comp.done[k] ? 'text-ink-soft' : 'text-ink-muted')}>
                  {comp.done[k] ? <Check size={15} className="shrink-0 text-forest-600" aria-hidden="true" /> : <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-ink-faint" />}
                  <span className={cx(!comp.done[k] && 'font-semibold')}>{t(`completeness.${k}`)}</span>
                  <span className="sr-only">{comp.done[k] ? t('completeness.done') : t('completeness.missing')}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="rp-season">
          <h2 id="rp-season" className="mb-3 text-[19px] leading-tight text-ink">{t('recruit.season', { season: currentSeason().label })}</h2>
          <SeasonNumbers s={season} compact />
        </section>
      </div>

      <section aria-labelledby="rp-clips" className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="rp-clips" className="text-[20px] leading-tight text-ink sm:text-[22px]">{t('recruit.clips')}</h2>
            <p className="mt-1 text-[14px] text-ink-muted">{t('recruit.clipsHint', { n: MAX_CLIPS })}</p>
          </div>
          <button type="button" className="btn-outline min-h-[44px]" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>{picking ? <X size={16} /> : <Plus size={16} />}{picking ? t('recruit.closePicker') : t('recruit.pick')}</button>
        </div>
        {picking && <ClipPicker player={player} videos={data.videos} selected={ids} onToggle={toggleClip} full={ids.length >= MAX_CLIPS} />}
        {selected.length ? <HighlightReel items={selected} /> : !picking && <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-[14.5px] text-ink-muted">{t('recruit.noClips')}</p>}
      </section>
    </div>
  )
}

/** Every clip of every video of the club; the clips where this player appears come first. */
function ClipPicker({ player, videos, selected, onToggle, full }: { player: Player; videos: VideoProject[]; selected: string[]; onToggle: (key: string) => void; full: boolean }) {
  const { t } = useT('club')
  const all = videos.flatMap((v) => (v.clips ?? []).map((c) => ({ v, c, mine: !!c.playerIds?.includes(player.id) })))
  const groups: [string, typeof all][] = [[t('recruit.withPlayer', { name: player.name.split(' ')[0] }), all.filter((x) => x.mine)], [t('recruit.otherClips'), all.filter((x) => !x.mine)]]
  if (!all.length) return <p className="mb-5 rounded-card bg-sand/70 px-4 py-4 text-[14px] text-ink-muted">{t('recruit.noClipsAtAll')} <Link to="/app/analyse/video" className="link">{t('recruit.toVideos')}</Link></p>
  return (
    <div className="mb-6 space-y-5 rounded-card border border-line bg-paper p-4 sm:p-5">
      {groups.filter(([, list]) => list.length).map(([title, list]) => (
        <div key={title}>
          <h3 className="mb-2 text-[14.5px] font-semibold text-ink">{title}</h3>
          <ul className="grid gap-2 md:grid-cols-2">
            {list.map(({ v, c }) => {
              const key = clipKey(v.id, c.id)
              const on = selected.includes(key)
              return (
                <li key={key}>
                  <label className={cx('flex min-h-[52px] cursor-pointer items-start gap-3 rounded-control border px-3 py-2.5 transition-colors', on ? 'border-forest-600 bg-forest-50' : 'border-line hover:border-ink-faint', !on && full && 'cursor-not-allowed opacity-50')}>
                    <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-forest-600" checked={on} disabled={!on && full} onChange={() => onToggle(key)} />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold leading-snug text-ink">{c.title}</span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">{v.title}, {fmtClock(c.start)} ({t('clip.length', { s: Math.max(1, Math.round(c.end - c.start)) })})</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
