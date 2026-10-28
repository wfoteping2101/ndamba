// Side panels of the Parcours: objectives of the cycle, match contribution (young players) or season
// performance (17 and over), and the big moments.
import { useMemo, useState } from 'react'
import { ChevronDown, Plus, Star, Target, Trophy } from 'lucide-react'
import { useT } from '../../../../i18n'
import { cx, daysBetween, fmtDate, todayISO } from '../../../../lib/util'
import {
  buildTimeline, levelsAt, MAX_ACTIVE_OBJECTIVES, obsSkillTones, SUB_ACTIONS, type JourneyData, type JourneyItem, type Season, type SeasonSummary, type Stage,
} from '../../../../lib/journey'
import type { Objective } from '../../../../lib/types'
import { CardHead, LevelPips, fmtDec, fmtMinutes, fmtPct } from './bits'

/* ---------------- objectives ---------------- */

export function ObjectivesCard({ data, stage, viewer, onAdd, onOpen }: { data: JourneyData; stage: Stage; viewer: 'coach' | 'player'; onAdd: () => void; onOpen: (o: Objective) => void }) {
  const { t, lang } = useT('journey')
  const [past, setPast] = useState(false)
  const today = todayISO()
  const active = data.objectives.filter((o) => o.status === 'active').sort((a, b) => a.review.localeCompare(b.review))
  const done = data.objectives.filter((o) => o.status !== 'active').sort((a, b) => (b.reviewedAt ?? b.review).localeCompare(a.reviewedAt ?? a.review))
  const levelsNow = levelsAt(data.evaluations, today)
  return (
    <section className="card card-pad" aria-labelledby="obj-h">
      <CardHead id="obj-h" icon={<Target size={18} strokeWidth={1.75} className="text-forest-600" />} title={t('objectives.title')} hint={t('objectives.hint', { n: MAX_ACTIVE_OBJECTIVES })}
        action={active.length > 0 && active.length < MAX_ACTIVE_OBJECTIVES ? <button type="button" className="btn-outline btn-sm min-h-[40px]" onClick={onAdd}><Plus size={15} />{t('objectives.add')}</button> : undefined} />
      {active.length === 0 ? (
        <div className="rounded-xl bg-sand/60 px-3 py-3 text-sm text-ink-muted">
          {viewer === 'coach' ? t('objectives.emptyCoach') : t('objectives.emptyPlayer')}
          <div className="mt-2"><button type="button" className="btn-primary btn-sm min-h-[40px]" onClick={onAdd}><Plus size={15} />{t('objectives.add')}</button></div>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {active.map((o) => {
            const startLvl = o.skill ? levelsAt(data.evaluations, o.start)[o.skill] : undefined
            const nowLvl = o.skill ? levelsNow[o.skill] : undefined
            const since = data.lines.filter((l) => l.match.date >= o.start && l.minutes > 0)
            const actions = o.sub ? since.reduce((a, l) => a + SUB_ACTIONS[o.sub!].reduce((s, c) => s + l.counts[c], 0), 0) : 0
            const ev = data.observations.filter((x) => x.date >= o.start).flatMap((x) => obsSkillTones(x)).filter(([k]) => k === o.skill)
            const plus = ev.filter(([, tone]) => tone === 'plus').length, work = ev.filter(([, tone]) => tone === 'work').length
            const left = daysBetween(today, o.review)
            return (
              <li key={o.id}>
                <button type="button" onClick={() => onOpen(o)} className="w-full rounded-2xl border border-line bg-paper p-3 text-left transition hover:border-forest-300">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[11.5px] font-semibold text-forest-700">{o.skill ? t(`common:skills.${o.skill}`) : t('objectives.subLink', { name: t(`analysis:sub.${o.sub}.name`) })}</span>
                    {o.by === 'player' && <span className="rounded-full bg-sand px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">{viewer === 'player' ? t('objectives.byMe') : t('objectives.byPlayer')}</span>}
                    <span className={cx('ml-auto text-[11.5px] font-semibold', left < 0 ? 'text-clay-600' : 'text-ink-muted')}>
                      {left < 0 ? t('objectives.reviewDue') : left === 0 ? t('objectives.reviewToday') : t('objectives.reviewIn', { count: left, date: fmtDate(o.review, lang, { day: 'numeric', month: 'short' }) })}
                    </span>
                  </span>
                  <span className="mt-1.5 block font-display text-[16px] font-semibold leading-snug text-ink">{o.title}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-muted">
                    {o.skill && nowLvl && (
                      <span className="inline-flex items-center gap-1.5"><LevelPips level={nowLvl} />
                        {startLvl && startLvl !== nowLvl ? t('objectives.levelMoved', { from: startLvl, to: nowLvl }) : t('objectives.levelNow', { n: nowLvl })}</span>
                    )}
                    {o.skill && (plus > 0 || work > 0) && <span>{t('objectives.seen', { plus, work })}</span>}
                    {o.sub && <span>{since.length ? t('objectives.subActions', { count: actions, matches: since.length }) : t('objectives.subNoMatch')}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {active.length >= MAX_ACTIVE_OBJECTIVES && <p className="mt-2 text-xs text-ink-faint">{t('objectives.fullBody')}</p>}
      {done.length > 0 && (
        <div className="mt-3 border-t border-line pt-2">
          <button type="button" className="flex min-h-[40px] w-full items-center justify-between text-left text-[13px] font-semibold text-ink-soft" onClick={() => setPast((v) => !v)} aria-expanded={past}>
            {t('objectives.past', { count: done.length })}<ChevronDown size={16} className={cx('transition', past && 'rotate-180')} />
          </button>
          {past && (
            <ul className="space-y-1.5">
              {done.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => onOpen(o)} className="flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left hover:bg-sand/60">
                    <span className={cx('mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', o.status === 'achieved' ? 'bg-forest-600 text-cream' : o.status === 'partial' ? 'bg-forest-50 text-forest-700' : 'bg-sand text-ink-soft')}>
                      {t(`objectives.status.${o.status}${o.status === 'notyet' && stage === 'adult' ? 'Adult' : ''}`)}
                    </span>
                    <span className="min-w-0 text-[13px] leading-snug text-ink-soft">{o.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

/* ---------------- match contribution / performance ---------------- */

export function MatchPanel({ s, stage, viewer, data }: { s: SeasonSummary; stage: Stage; viewer: 'coach' | 'player'; data: JourneyData }) {
  const { t, lang } = useT('journey')
  const c = s.counts
  const per90 = (n: number) => (s.taggedMinutes > 0 ? (n * 90) / s.taggedMinutes : 0)
  const passes = c.PASS_OK + c.PASS_LOST
  const lines = data.lines.filter((l) => !s.season || (l.match.date >= s.season.start && l.match.date <= s.season.end))
  if (!s.matches.squad) {
    return (
      <section className="card card-pad" aria-labelledby="mp-h">
        <CardHead id="mp-h" icon={<Trophy size={18} className="text-forest-600" />} title={stage === 'adult' ? t('perf.title') : viewer === 'player' ? t('perf.youngTitlePlayer') : t('perf.youngTitle')} />
        <p className="rounded-xl bg-sand/60 px-3 py-3 text-sm text-ink-muted">{t('perf.empty')}</p>
      </section>
    )
  }
  if (stage !== 'adult') {
    const tiles: [string, number | string][] = [
      [t('perf.played'), s.matches.played],
      [t('perf.minutes'), fmtMinutes(s.matches.minutes, lang)],
      [t('perf.progressions'), c.PROG + c.LINE],
      [t('perf.regains'), c.REGAIN5 + c.REGAIN],
      [t('perf.entries'), c.FINAL3 + c.BOX],
      [t('perf.shots'), c.SHOT],
      [t('perf.goals'), c.GOAL],
    ]
    if (stage === 'teen' && passes > 0) tiles.splice(2, 0, [t('perf.passAcc'), fmtPct(c.PASS_OK / passes, lang)])
    return (
      <section className="card card-pad" aria-labelledby="mp-h">
        <CardHead id="mp-h" icon={<Trophy size={18} className="text-forest-600" />} title={viewer === 'player' ? t('perf.youngTitlePlayer') : t('perf.youngTitle')} hint={t('perf.youngHint')} />
        <dl className="grid grid-cols-2 gap-2">
          {tiles.map(([label, v]) => (
            <div key={label} className="rounded-xl bg-sand/60 px-3 py-2">
              <dt className="truncate text-[11.5px] font-medium text-ink-muted">{label}</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        {s.matches.tagged === 0 && <p className="mt-2 text-xs text-ink-faint">{t('perf.untagged')}</p>}
      </section>
    )
  }
  const share = (k: (keyof typeof c)[]) => { const mine = k.reduce((a, x) => a + c[x], 0), all = k.reduce((a, x) => a + s.team[x], 0); return all > 0 ? mine / all : null }
  const rows: [string, string, string?][] = [
    [t('perf.minutes'), fmtMinutes(s.matches.minutes, lang), s.matches.played ? t('perf.avgMin', { n: Math.round(s.matches.minutes / s.matches.played) }) : undefined],
    [t('perf.starts'), t('perf.startsVal', { starts: s.matches.starts, played: s.matches.played })],
    [t('perf.goals'), String(c.GOAL), s.taggedMinutes ? t('perf.per90', { v: fmtDec(per90(c.GOAL), lang, 2) }) : undefined],
    [t('perf.shots'), String(c.SHOT), [t('perf.onTarget', { n: c.SHOT_IN }), s.taggedMinutes ? t('perf.per90', { v: fmtDec(per90(c.SHOT), lang) }) : ''].filter(Boolean).join(', ')],
    [t('perf.passAcc'), passes ? fmtPct(c.PASS_OK / passes, lang) : '-', passes ? t('perf.passesVal', { ok: c.PASS_OK, n: passes }) : undefined],
    [t('perf.progressions'), fmtDec(per90(c.PROG + c.LINE), lang), t('perf.per90Label')],
    [t('perf.entries'), fmtDec(per90(c.FINAL3 + c.BOX), lang), t('perf.per90Label')],
    [t('perf.regain5'), fmtDec(per90(c.REGAIN5), lang), t('perf.per90Label')],
    [t('perf.losses'), fmtDec(per90(c.LOSS + c.PASS_LOST), lang), t('perf.per90Label')],
  ]
  const progShare = share(['PROG', 'LINE'])
  const regShare = share(['REGAIN5'])
  const maxLen = Math.max(1, ...lines.map((l) => 2 * l.match.halfMinutes))
  return (
    <section className="card card-pad" aria-labelledby="mp-h">
      <CardHead id="mp-h" icon={<Trophy size={18} className="text-forest-600" />} title={t('perf.title')} hint={t('perf.hint')} />
      <dl className="divide-y divide-line/70">
        {rows.map(([label, v, sub]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-[13px] text-ink-muted">{label}</dt>
            <dd className="text-right"><span className="font-display text-[17px] font-semibold tabular-nums text-ink">{v}</span>{sub && <span className="block text-[11px] text-ink-faint">{sub}</span>}</dd>
          </div>
        ))}
      </dl>
      {(progShare !== null || regShare !== null) && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {progShare !== null && <ShareTile label={t('perf.shareProg')} v={progShare} />}
          {regShare !== null && <ShareTile label={t('perf.shareRegain')} v={regShare} />}
        </div>
      )}
      <h3 className="mb-1.5 mt-4 font-sans text-xs font-semibold tracking-normal text-ink-muted">{t('perf.minutesByMatch')}</h3>
      <ul className="flex items-end gap-1" aria-label={t('perf.minutesByMatch')}>
        {lines.map((l) => (
          <li key={l.match.id} className="flex min-w-0 flex-1 flex-col items-stretch" title={`${l.match.opponent}: ${l.minutes} min`}>
            <span className="mb-0.5 text-center text-[10.5px] font-semibold tabular-nums text-ink-muted">{l.minutes}</span>
            <span className="flex h-16 flex-col justify-end"><span className={cx('block rounded-t-md', l.minutes ? (l.starter ? 'bg-forest-600' : 'bg-forest-300') : 'bg-line')} style={{ height: `${Math.max(4, (l.minutes / maxLen) * 100)}%` }} /></span>
            <span className="mt-1 truncate text-center text-[10.5px] text-ink-faint">{fmtDate(l.match.date, lang, { day: 'numeric', month: 'short' }).replace('.', '')}</span>
            <span className="sr-only">{l.match.opponent}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 flex gap-3 text-[11px] text-ink-faint"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-forest-600" />{t('perf.legendStart')}</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-forest-300" />{t('perf.legendSub')}</span></p>
      {s.matches.tagged === 0 && <p className="mt-2 text-xs text-ink-faint">{t('perf.untagged')}</p>}
    </section>
  )
}

function ShareTile({ label, v }: { label: string; v: number }) {
  const { lang } = useT('journey')
  return (
    <div className="rounded-xl border border-line px-3 py-2">
      <div className="text-[11.5px] font-medium leading-tight text-ink-muted">{label}</div>
      <div className="mt-0.5 font-display text-xl font-semibold tabular-nums text-forest-700">{fmtPct(v, lang)}</div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-forest-600" style={{ width: `${Math.min(100, v * 100)}%` }} /></div>
    </div>
  )
}

/* ---------------- big moments ---------------- */

export function MilestonesCard({ data, season, stage, viewer, onAdd, onOpen }: { data: JourneyData; season: Season | null; stage: Stage; viewer: 'coach' | 'player'; onAdd: () => void; onOpen: (id: string) => void }) {
  const { t, lang } = useT('journey')
  const items = useMemo(() => buildTimeline(data, season).filter((i): i is Extract<JourneyItem, { kind: 'milestone' | 'derived' }> => i.kind === 'milestone' || i.kind === 'derived'), [data, season])
  return (
    <section className="card card-pad" aria-labelledby="ms-h">
      <CardHead id="ms-h" icon={<Star size={18} className="text-sun-600" />} title={t('milestones.title')}
        action={viewer === 'coach' ? <button type="button" className="btn-ghost btn-sm min-h-[40px]" onClick={onAdd}><Plus size={15} />{t('milestones.add')}</button> : undefined} />
      {items.length === 0 ? <p className="text-sm text-ink-muted">{t('milestones.empty')}</p> : (
        <ul className="space-y-1">
          {items.map((i) => {
            const title = i.kind === 'milestone' ? i.ms.title
              : i.type === 'skill_level' ? t('derived.skill_level', { skill: t(`common:skills.${i.skill}`), level: t(`team:levels.${i.level}`) })
                : t(`derived.${i.type}${stage === 'adult' && i.type !== 'matches_n' ? 'Adult' : ''}`, { opponent: i.match?.opponent ?? '', n: i.n ?? 0 })
            const body = (
              <>
                <Star size={15} className="mt-0.5 shrink-0 fill-sun-500 text-sun-500" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold leading-snug text-ink">{title}</span>
                  <span className="block text-[11.5px] text-ink-muted">{fmtDate(i.date, lang, { day: 'numeric', month: 'long', year: 'numeric' })}{i.kind === 'milestone' ? `, ${t(`milestones.kind.${i.ms.kind}`)}` : ''}</span>
                </span>
              </>
            )
            return (
              <li key={i.id}>
                {i.kind === 'milestone' && viewer === 'coach'
                  ? <button type="button" onClick={() => onOpen(i.ms.id)} className="flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-sand/60">{body}</button>
                  : <div className="flex items-start gap-2.5 px-2 py-2">{body}</div>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
