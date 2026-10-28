import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronDown, Dumbbell, Pencil, Trash2, UserX } from 'lucide-react'
import { db } from '../../lib/db'
import { useLiveQuery, useDocumentTitle } from '../../lib/hooks'
import { skillAvg } from '../../lib/actions'
import { BRAND } from '../../lib/config'
import type { EventCode, Match, MatchEvent, Player, SkillKey } from '../../lib/types'
import { DRILLS, drillText } from '../../content'
import { Badge, EmptyState } from '../../ui'
import { useT } from '../../i18n'
import { cx, fmtDate } from '../../lib/util'
import { SKILL_KEYS, fmtAvg } from './components/lineup'
import { ConfirmModal, NumberBadge } from './components/bits'
import { PlayerFormModal } from './components/forms'
import { SkillRadar } from './components/SkillRadar'
import { removePlayer } from './components/data'
import { JourneyTeaser } from './components/journey/Entries'
import { recordLevels } from '../../lib/journey'

type Level = 1 | 2 | 3 | 4
const LEVELS: Level[] = [1, 2, 3, 4]
const CONTRIB: EventCode[] = ['PROG', 'LINE', 'REGAIN5', 'FIX2', 'SWITCH', 'FINAL3', 'BOX', 'SHOT', 'REGAIN', 'LOSS']
const levelTone: Record<Level, string> = {
  1: 'border-terra-500 bg-terra-500 text-white',
  2: 'border-sun-500 bg-sun-500 text-night-900',
  3: 'border-forest-500 bg-forest-500 text-cream',
  4: 'border-forest-700 bg-forest-700 text-cream',
}

export default function PlayerDetail() {
  const { id = '' } = useParams()
  const { t, lang } = useT('team')
  const nav = useNavigate()
  const data = useLiveQuery(async () => {
    const player = await db.players.get(id)
    if (!player) return { player: null as Player | null, mates: [] as Player[], events: [] as MatchEvent[], matches: [] as Match[] }
    const [mates, events, matches] = await Promise.all([
      db.players.where('teamId').equals(player.teamId).toArray(),
      db.events.filter((e) => e.playerId === id).toArray(),
      db.matches.where('teamId').equals(player.teamId).toArray(),
    ])
    return { player, mates, events, matches }
  }, [id], undefined as unknown as { player: Player | null; mates: Player[]; events: MatchEvent[]; matches: Match[] })
  const player = data?.player ?? null
  useDocumentTitle(player?.name ?? t('roster.docTitle'))
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [grid, setGrid] = useState(false)

  const teamAvgSkills = useMemo(() => {
    const out: Partial<Record<SkillKey, number>> = {}
    const mates = data?.mates ?? []
    for (const k of SKILL_KEYS) { const v = mates.map((p) => Number(p.skills[k] || 0)).filter(Boolean); if (v.length) out[k] = v.reduce((a, b) => a + b, 0) / v.length }
    return out
  }, [data?.mates])

  if (!data) return <div className="grid min-h-[40vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>
  if (!player) return (
    <div className="mx-auto max-w-lg pt-6">
      <EmptyState icon={<UserX size={32} />} title={t('player.notFoundTitle')} body={t('player.notFoundBody')} action={<Link to="/app/equipe" className="btn-primary">{t('player.back')}</Link>} />
    </div>
  )

  const setLevel = (k: SkillKey, v: Level) => {
    const skills = { ...player.skills }
    if (skills[k] === v) delete skills[k]; else skills[k] = v
    db.players.update(player.id, { skills })
    recordLevels(player, skills) // Parcours: keep the history (today's evaluation)
  }
  const avg = skillAvg(player)
  const ratedCount = SKILL_KEYS.filter((k) => player.skills[k]).length
  const remove = async () => { await removePlayer(player); nav('/app/equipe', { replace: true }) }

  const radarCard = (
    <section className="card card-pad" aria-labelledby="radar-h">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 id="radar-h" className="font-display text-lg font-semibold">{t('player.radarTitle')}</h2>
        <span className="flex items-center gap-1.5 text-[11.5px] text-ink-muted"><span className="inline-block h-0 w-4 border-t-2 border-dashed border-terra-500" />{t('player.radarTeam')}</span>
      </div>
      {ratedCount >= 3 ? <div className="flex justify-center"><SkillRadar skills={player.skills} compare={teamAvgSkills} /></div>
        : <p className="py-8 text-center text-sm text-ink-muted">{t('player.radarEmpty')}</p>}
      <p className="mt-1 text-xs text-ink-faint">{t('player.profileNote')}</p>
    </section>
  )

  return (
    <div>
      <Link to="/app/equipe" className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink"><ArrowLeft size={16} />{t('player.back')}</Link>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <NumberBadge player={player} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-[28px] font-semibold leading-tight text-ink sm:text-[36px]">{player.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge tone="forest">{t(`common:positions.${player.position}`)}</Badge>
              {player.birthYear && <Badge>{t('player.born', { year: player.birthYear })}</Badge>}
              {player.foot && <Badge>{t(`foot.${player.foot}`)}</Badge>}
              {avg > 0 && <Badge tone="sun">{t('player.average')} {fmtAvg(avg, lang)} / 4</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-outline" onClick={() => setEditOpen(true)}><Pencil size={16} />{t('player.edit')}</button>
          <button type="button" className="btn-ghost text-clay-600" onClick={() => setDelOpen(true)} aria-label={t('player.remove')}><Trash2 size={17} /><span className="hidden sm:inline">{t('player.remove')}</span></button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-5">
          <JourneyTeaser playerId={player.id} />
          <div className="lg:hidden">{radarCard}</div>

          <section className="card overflow-hidden" aria-labelledby="skills-h">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2 id="skills-h" className="font-display text-xl font-semibold">{t('player.skillsTitle')}</h2>
                <p className="mt-0.5 max-w-xl text-[13px] text-ink-muted">{t('player.skillsHint')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-ink-faint">{t('player.rated', { n: ratedCount })}</span>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setGrid((g) => !g)} aria-expanded={grid}>
                  {t('player.grid')}<ChevronDown size={15} className={cx('transition', grid && 'rotate-180')} />
                </button>
              </div>
            </div>
            <ol className="divide-y divide-line/70">
              {SKILL_KEYS.map((k, idx) => {
                const v = player.skills[k] as Level | undefined
                return (
                  <li key={k} className="px-4 py-4 sm:px-5">
                    <div className="flex items-baseline gap-2">
                      <span className="w-5 shrink-0 text-xs font-semibold tabular-nums text-ink-faint">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15.5px] font-semibold text-ink">{t(`common:skills.${k}`)}</h3>
                        <p className="text-[12.5px] leading-snug text-ink-muted">{t(`skillDef.${k}`)}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1.5 sm:pl-7" role="radiogroup" aria-label={t(`common:skills.${k}`)}>
                      {LEVELS.map((l) => (
                        <button key={l} type="button" role="radio" aria-checked={v === l} onClick={() => setLevel(k, l)}
                          title={t(`skillDesc.${k}.${l}`)}
                          className={cx('flex min-h-[48px] flex-col items-center justify-center rounded-xl border px-1 py-1.5 transition',
                            v === l ? levelTone[l] : v && l < v ? 'border-forest-100 bg-forest-50 text-forest-700' : 'border-line bg-paper text-ink-muted hover:border-ink-faint')}>
                          <span className="font-display text-lg font-semibold leading-none">{l}</span>
                          <span className="mt-0.5 max-w-full truncate text-[10.5px] font-semibold">{t(`levels.${l}`)}</span>
                        </button>
                      ))}
                    </div>
                    {grid ? (
                      <ul className="mt-3 space-y-1.5 sm:pl-7">
                        {LEVELS.map((l) => (
                          <li key={l} className={cx('flex gap-2 rounded-lg px-2 py-1.5 text-[13px] leading-snug', v === l ? 'bg-forest-50 text-ink' : 'text-ink-muted')}>
                            <span className="w-4 shrink-0 font-semibold tabular-nums">{l}</span><span>{t(`skillDesc.${k}.${l}`)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : v ? (
                      <p className="mt-2 text-[13px] leading-snug text-ink-soft sm:pl-7"><span className="font-semibold text-forest-700">{t('player.levelIs', { level: t(`levels.${v}`) })}</span>{t(`skillDesc.${k}.${v}`)}</p>
                    ) : null}
                  </li>
                )
              })}
            </ol>
            <p className="border-t border-line bg-sand/40 px-4 py-3 text-xs text-ink-muted sm:px-5">{t('player.gridNote')}</p>
          </section>

          <NotesCard player={player} />
        </div>

        <aside className="space-y-5">
          <div className="hidden lg:block">{radarCard}</div>
          <Contribution player={player} events={data.events} matches={data.matches} />
          <SuggestedDrills player={player} />
        </aside>
      </div>

      <PlayerFormModal open={editOpen} onClose={() => setEditOpen(false)} teamId={player.teamId} player={player}
        takenNumbers={data.mates.filter((p) => p.id !== player.id).map((p) => p.number).filter((n): n is number => n !== undefined)} />
      <ConfirmModal open={delOpen} onClose={() => setDelOpen(false)} title={t('roster.deleteTitle')} body={t('roster.deleteBody', { name: player.name })} confirm={t('roster.deleteConfirm')} onConfirm={remove} />
    </div>
  )
}

function NotesCard({ player }: { player: Player }) {
  const { t } = useT('team')
  const [text, setText] = useState(player.notes ?? '')
  const [saved, setSaved] = useState(false)
  const timer = useRef<number>()
  useEffect(() => { setText(player.notes ?? '') }, [player.id])
  const persist = (v: string) => { db.players.update(player.id, { notes: v }); setSaved(true); window.setTimeout(() => setSaved(false), 1500) }
  const onChange = (v: string) => { setText(v); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => persist(v), 700) }
  return (
    <section className="card card-pad">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="pl-notes" className="font-display text-lg font-semibold">{t('player.notes')}</label>
        <span className={cx('text-xs font-semibold text-forest-600 transition-opacity', saved ? 'opacity-100' : 'opacity-0')} aria-live="polite">{saved ? t('player.saved') : ''}</span>
      </div>
      <textarea id="pl-notes" className="input min-h-[120px] leading-6" value={text} onChange={(e) => onChange(e.target.value)}
        onBlur={() => { window.clearTimeout(timer.current); if (text !== (player.notes ?? '')) persist(text) }} placeholder={t('player.notesPh')} />
    </section>
  )
}

function Contribution({ player, events, matches }: { player: Player; events: MatchEvent[]; matches: Match[] }) {
  const { t, lang } = useT('team')
  const counts = useMemo(() => {
    const c: Partial<Record<EventCode, number>> = {}
    for (const e of events) if (e.side === 'us') c[e.code] = (c[e.code] || 0) + 1
    return c
  }, [events])
  const byMatch = useMemo(() => {
    const m = new Map<string, Partial<Record<EventCode, number>>>()
    for (const e of events) { const r = m.get(e.matchId) ?? {}; r[e.code] = (r[e.code] || 0) + 1; m.set(e.matchId, r) }
    return [...m.entries()].map(([mid, c]) => ({ match: matches.find((x) => x.id === mid), c })).filter((r) => r.match).sort((a, b) => b.match!.date.localeCompare(a.match!.date))
  }, [events, matches])
  const starts = matches.filter((m) => m.status === 'done' && m.lineup.some((l) => l.playerId === player.id)).length
  const passes = (counts.PASS_OK || 0) + (counts.PASS_LOST || 0)
  const tiles = CONTRIB.filter((c) => counts[c])
  return (
    <section className="card card-pad" aria-labelledby="contrib-h">
      <h2 id="contrib-h" className="font-display text-lg font-semibold">{t('player.contribTitle')}</h2>
      <p className="mb-3 text-xs text-ink-muted">{t('player.contribHint')}</p>
      {events.length === 0 ? <p className="rounded-xl bg-sand/60 px-3 py-3 text-sm text-ink-muted">{t('player.contribEmpty')}</p> : (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
            <Badge tone="forest">{t('player.taggedMatches', { count: byMatch.length })}</Badge>
            {starts > 0 && <Badge>{t('player.starts', { count: starts })}</Badge>}
          </div>
          {passes > 0 && (
            <div className="mb-3 rounded-xl border border-line p-3">
              <div className="flex items-baseline justify-between"><span className="text-xs font-medium text-ink-muted">{t('player.passAcc')}</span><span className="font-display text-2xl font-semibold tabular-nums text-forest-600">{Math.round(((counts.PASS_OK || 0) / passes) * 100)} %</span></div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-forest-600" style={{ width: `${((counts.PASS_OK || 0) / passes) * 100}%` }} /></div>
              <div className="mt-1 text-[11px] tabular-nums text-ink-faint">{counts.PASS_OK || 0} / {passes}</div>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-2">
            {tiles.map((c) => (
              <div key={c} className={cx('rounded-xl px-3 py-2', c === 'LOSS' ? 'bg-clay-50' : 'bg-sand/60')}>
                <dt className="truncate text-[11.5px] font-medium text-ink-muted">{t(`common:events.${c}`)}</dt>
                <dd className={cx('font-display text-2xl font-semibold tabular-nums', c === 'LOSS' ? 'text-clay-600' : 'text-ink')}>{counts[c]}</dd>
              </div>
            ))}
          </dl>
          {byMatch.length > 0 && (
            <>
              <h3 className="mb-1.5 mt-4 text-xs font-semibold text-ink-muted">{t('player.byMatch')}</h3>
              <ul className="space-y-1">
                {byMatch.map(({ match, c }) => (
                  <li key={match!.id}>
                    <Link to={`/app/matchs/${match!.id}`} className="flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm hover:bg-sand/60">
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">{match!.opponent}</span>
                      <span className="shrink-0 text-[11.5px] tabular-nums text-ink-muted">{fmtDate(match!.date, lang, { day: 'numeric', month: 'short' })}</span>
                      <span className="shrink-0 rounded-md bg-forest-50 px-1.5 text-[11.5px] font-semibold tabular-nums text-forest-700" title={`${t('common:events.PROG')} + ${t('common:events.LINE')}`}>{(c.PROG || 0) + (c.LINE || 0)}</span>
                      <span className="shrink-0 rounded-md bg-sun-50 px-1.5 text-[11.5px] font-semibold tabular-nums text-sun-700" title={t('common:events.REGAIN5')}>{c.REGAIN5 || 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  )
}

function SuggestedDrills({ player }: { player: Player }) {
  const { t, lang } = useT('team')
  const rated = SKILL_KEYS.filter((k) => player.skills[k]).sort((a, b) => Number(player.skills[a]) - Number(player.skills[b]) || SKILL_KEYS.indexOf(a) - SKILL_KEYS.indexOf(b))
  const weakest = rated.filter((k) => Number(player.skills[k]) < 4).slice(0, 2)
  const drills = useMemo(() => {
    if (!weakest.length) return []
    return DRILLS.filter((d) => d.skills?.some((s) => weakest.includes(s)))
      .map((d) => ({ d, score: weakest.filter((w) => d.skills.includes(w)).length * 10 - d.order * 0.01 }))
      .sort((a, b) => b.score - a.score).slice(0, 4).map((x) => x.d)
  }, [weakest.join(',')])
  return (
    <section className="card card-pad" aria-labelledby="drills-h">
      <h2 id="drills-h" className="mb-1 flex items-center gap-2 font-display text-lg font-semibold"><Dumbbell size={18} className="text-terra-500" />{t('player.drillsTitle')}</h2>
      {!weakest.length ? <p className="text-sm text-ink-muted">{t('player.drillsNoRating', { app: BRAND.name })}</p> : (
        <>
          <p className="mb-3 text-[13px] text-ink-muted">
            {weakest.length === 2 ? t('player.drillsFor', { a: t(`common:skills.${weakest[0]}`), b: t(`common:skills.${weakest[1]}`) }) : t('player.drillsForOne', { a: t(`common:skills.${weakest[0]}`) })}
          </p>
          {drills.length === 0 ? (
            <div className="rounded-xl bg-sand/60 px-3 py-3 text-sm text-ink-muted">{t('player.drillsEmpty')}
              <div className="mt-2"><Link to="/app/exercices" className="link inline-flex items-center gap-1"><BookOpen size={14} />{t('player.openLibrary')}</Link></div>
            </div>
          ) : (
            <ul className="space-y-2">
              {drills.map((d) => {
                const txt = drillText(d, lang)
                return (
                  <li key={d.id}>
                    <Link to={`/app/exercices/${d.id}`} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition hover:border-forest-300 hover:bg-forest-50/40">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forest-50 font-display text-sm font-semibold text-forest-700">{d.id}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{txt.title}</span>
                        <span className="block truncate text-[12px] text-ink-muted">{d.skills.filter((s) => weakest.includes(s)).map((s) => t(`common:skills.${s}`)).join(', ')} · {t('player.min', { n: d.minutes })}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
