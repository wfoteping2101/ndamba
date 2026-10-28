// The thread of the journey: everything that happened to one player, most recent first, by month.
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, ClipboardCheck, Crown, Eye, Flag, Star, Target, Trash2, Trophy } from 'lucide-react'
import { db } from '../../../../lib/db'
import { useT } from '../../../../i18n'
import { cx, fmtDate, weekStart } from '../../../../lib/util'
import { buildTimeline, deleteEvaluation, filterOf, saveEvaluation, obsSkillTones, obsTag, type ItemFilter, type JourneyData, type JourneyItem, type Season, type Stage } from '../../../../lib/journey'
import type { AttendanceStatus, EventCode } from '../../../../lib/types'
import { CardHead, RatingDots, SkillChip, fmtMinutes, quote, toneChip, useToast } from './bits'

const FILTERS: ItemFilter[] = ['all', 'milestone', 'evaluation', 'observation', 'match', 'week', 'objective']

export function Timeline({ data, season, stage, viewer }: { data: JourneyData; season: Season | null; stage: Stage; viewer: 'coach' | 'player' }) {
  const { t, lang } = useT('journey')
  const items = useMemo(() => buildTimeline(data, season), [data, season])
  const [filter, setFilter] = useState<ItemFilter>('all')
  const [limit, setLimit] = useState(24)
  const { toast, toastNode } = useToast()
  const counts = useMemo(() => { const c: Partial<Record<ItemFilter, number>> = { all: items.length }; for (const i of items) { const f = filterOf(i); c[f] = (c[f] ?? 0) + 1 } return c }, [items])
  const shown = items.filter((i) => filter === 'all' || filterOf(i) === filter)
  const groups = useMemo(() => {
    const m = new Map<string, JourneyItem[]>()
    for (const i of shown.slice(0, limit)) { const k = i.date.slice(0, 7); m.set(k, [...(m.get(k) ?? []), i]) }
    return [...m.entries()]
  }, [shown, limit])

  const removeObs = async (i: Extract<JourneyItem, { kind: 'observation' }>) => {
    await db.observations.delete(i.obs.id)
    toast({ text: t('timeline.obsDeleted'), action: t('timeline.undo'), onAction: () => { db.observations.put(i.obs) } })
  }
  const removeEval = async (i: Extract<JourneyItem, { kind: 'evaluation' }>) => {
    await deleteEvaluation(i.ev)
    toast({ text: t('timeline.evalDeleted'), action: t('timeline.undo'), onAction: () => { saveEvaluation(i.ev) } })
  }

  return (
    <section className="card overflow-hidden" aria-labelledby="tl-h">
      <div className="border-b border-line px-4 pb-3 pt-4 sm:px-5">
        <CardHead id="tl-h" title={t('timeline.title')} hint={viewer === 'coach' ? t('timeline.hintCoach') : t('timeline.hintPlayer')} />
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t('timeline.filter')}>
          {FILTERS.filter((f) => f === 'all' || counts[f]).map((f) => (
            <button key={f} type="button" onClick={() => { setFilter(f); setLimit(24) }} aria-pressed={filter === f}
              className={cx('chip min-h-[36px] shrink-0 cursor-pointer px-3 text-[12.5px]', filter === f && 'chip-on')}>
              {t(`timeline.filters.${f}`)}<span className={cx('tabular-nums', filter === f ? 'text-cream/75' : 'text-ink-faint')}>{counts[f] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-muted sm:px-5">{viewer === 'coach' ? t('timeline.emptyCoach') : t('timeline.emptyPlayer')}</p>
      ) : (
        <div className="px-4 pb-4 sm:px-5">
          {groups.map(([month, list]) => (
            <div key={month}>
              <h3 className="sticky top-14 z-[1] -mx-4 bg-paper/95 px-4 pb-1 pt-4 font-display text-[15px] font-semibold capitalize text-ink-soft backdrop-blur sm:-mx-5 sm:px-5 lg:top-0">
                {fmtDate(month + '-01', lang, { month: 'long', year: 'numeric' })}
              </h3>
              <ol className="relative ml-[15px] border-l-2 border-line/80">
                {list.map((i) => <Item key={i.id} i={i} stage={stage} viewer={viewer} onRemoveObs={removeObs} onRemoveEval={removeEval} />)}
              </ol>
            </div>
          ))}
          {shown.length > limit && (
            <div className="mt-3 text-center"><button type="button" className="btn-outline btn-sm min-h-[44px]" onClick={() => setLimit((l) => l + 30)}>{t('timeline.more', { count: shown.length - limit })}</button></div>
          )}
        </div>
      )}
      {toastNode}
    </section>
  )
}

function Node({ tone, children }: { tone: 'forest' | 'terra' | 'sun' | 'neutral' | 'mixed'; children: ReactNode }) {
  const cls = tone === 'forest' ? 'bg-forest-600 text-cream' : tone === 'terra' ? 'bg-terra-500 text-white' : tone === 'sun' ? 'bg-sun-500 text-night-900' : tone === 'mixed' ? 'bg-sun-100 text-sun-700' : 'bg-sand text-ink-soft'
  return <span className={cx('absolute -left-[17px] top-3 grid h-8 w-8 place-items-center rounded-full ring-4 ring-paper [&>svg]:h-4 [&>svg]:w-4', cls)} aria-hidden="true">{children}</span>
}

function Row({ node, date, title, meta, children, action }: { node: ReactNode; date: string; title: ReactNode; meta?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const { lang } = useT('journey')
  return (
    <li className="relative pb-1 pl-6 pt-2.5">
      {node}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-medium text-ink-faint">{fmtDate(date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}{meta ? <span className="text-ink-muted">, {meta}</span> : null}</div>
          <div className="text-[14.5px] font-semibold leading-snug text-ink">{title}</div>
          {children && <div className="mt-1.5">{children}</div>}
        </div>
        {action}
      </div>
    </li>
  )
}

function Del({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-faint transition hover:bg-clay-50 hover:text-clay-600"><Trash2 size={16} /></button>
}

const STATUS_DOT: Record<AttendanceStatus, string> = { present: 'bg-forest-600', late: 'bg-sun-500', absent: 'bg-clay-500', excused: 'bg-ink-faint', injured: 'bg-ink-faint' }

function Item({ i, stage, viewer, onRemoveObs, onRemoveEval }: {
  i: JourneyItem; stage: Stage; viewer: 'coach' | 'player'
  onRemoveObs: (i: Extract<JourneyItem, { kind: 'observation' }>) => void
  onRemoveEval: (i: Extract<JourneyItem, { kind: 'evaluation' }>) => void
}) {
  const { t, lang } = useT('journey')
  const coach = viewer === 'coach'
  switch (i.kind) {
    case 'evaluation': {
      const ups = i.changes.filter((c) => c.from && c.to > c.from)
      return (
        <Row node={<Node tone="forest"><ClipboardCheck /></Node>} date={i.date} meta={i.ev.by === 'player' ? t('timeline.byPlayer') : undefined}
          title={i.first ? t('timeline.evalFirst') : ups.length ? t('timeline.evalUp', { count: ups.length }) : t('timeline.eval')}
          action={coach ? <Del label={t('timeline.deleteEval')} onClick={() => onRemoveEval(i)} /> : undefined}>
          {!i.first && i.changes.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {i.changes.map((c) => (
                <li key={c.skill} className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold', !c.from || c.to > c.from ? 'bg-forest-50 text-forest-700' : 'bg-terra-50 text-terra-700')}>
                  {t(`team:skillsShort.${c.skill}`)}<span className="tabular-nums">{c.from ?? '·'}</span><ArrowRight size={11} aria-label={t('timeline.to')} /><span className="tabular-nums">{c.to}</span>
                </li>
              ))}
            </ul>
          )}
          {i.first && <p className="text-[13px] text-ink-muted">{t('timeline.evalFirstBody', { n: Object.keys(i.ev.skills).length })}</p>}
          {!i.first && i.changes.length === 0 && <p className="text-[13px] text-ink-muted">{t('timeline.evalSame')}</p>}
          {i.ev.note && <p className="mt-1.5 text-[13.5px] italic leading-snug text-ink-soft">{quote(i.ev.note, lang)}</p>}
        </Row>
      )
    }
    case 'observation': {
      const o = i.obs
      const tones = obsSkillTones({ skills: o.skills, tags: [] })
      const p = tones.filter(([, x]) => x === 'plus').length + o.tags.filter((id) => obsTag(id)?.tone === 'plus').length
      const w = tones.filter(([, x]) => x === 'work').length + o.tags.filter((id) => obsTag(id)?.tone === 'work').length
      const tone = p && w ? 'mixed' : w ? 'terra' : p ? 'forest' : 'neutral'
      const where = i.match ? t('timeline.obsMatch', { opponent: i.match.opponent }) + (o.minute ? `, ${t('timeline.minute', { n: o.minute })}` : '')
        : i.session ? t('timeline.obsSession', { title: i.session.title }) : t('timeline.obsFree')
      const hideRating = viewer === 'player' && stage === 'kid'
      return (
        <Row node={<Node tone={tone}><Eye /></Node>} date={i.date} meta={o.time ? t('timeline.at', { time: o.time }) : undefined}
          title={where} action={coach ? <Del label={t('timeline.deleteObs')} onClick={() => onRemoveObs(i)} /> : undefined}>
          <div className="flex flex-wrap items-center gap-1.5">
            {tones.map(([k, x]) => <SkillChip key={k} skill={k} tone={x} />)}
            {o.tags.map((id) => { const tg = obsTag(id); return tg ? <span key={id} className={cx('rounded-full border px-2 py-0.5 text-[11.5px] font-medium', toneChip[tg.tone])}>{t(`tags.${id}`)}</span> : null })}
            {o.rating && !hideRating && <RatingDots value={o.rating} className="ml-1" />}
          </div>
          {o.note && <p className="mt-1.5 text-[13.5px] italic leading-snug text-ink-soft">{quote(o.note, lang)}</p>}
          {o.by === 'player' && <p className="mt-1 text-[11.5px] text-ink-faint">{t('timeline.byPlayer')}</p>}
        </Row>
      )
    }
    case 'match': {
      const l = i.line
      const m = l.match
      const res = m.scoreUs > m.scoreThem ? 'W' : m.scoreUs < m.scoreThem ? 'L' : 'D'
      const role = l.minutes <= 0 ? (stage === 'kid' ? t('timeline.inGroup') : t('timeline.bench')) : l.starter ? t('timeline.starter') : t('timeline.subOn')
      const c = l.counts
      const chips: [string, number][] = stage === 'adult'
        ? [[t('stats.passes', { ok: c.PASS_OK, n: c.PASS_OK + c.PASS_LOST }), c.PASS_OK + c.PASS_LOST], [t('stats.prog', { count: c.PROG + c.LINE }), c.PROG + c.LINE], [t('stats.regain', { count: c.REGAIN5 + c.REGAIN }), c.REGAIN5 + c.REGAIN], [t('stats.shots', { count: c.SHOT }), c.SHOT], [t('stats.losses', { count: c.LOSS + c.PASS_LOST }), c.LOSS + c.PASS_LOST]]
        : [[t('stats.prog', { count: c.PROG + c.LINE }), c.PROG + c.LINE], [t('stats.regain', { count: c.REGAIN5 + c.REGAIN }), c.REGAIN5 + c.REGAIN], [t('stats.final3', { count: c.FINAL3 + c.BOX }), c.FINAL3 + c.BOX], [t('stats.shots', { count: c.SHOT }), c.SHOT]]
      const title = (
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span>{t('timeline.vs', { opponent: m.opponent })}</span>
          <span className={cx('rounded-md px-1.5 text-[12px] font-bold tabular-nums', res === 'W' ? 'bg-sun-100 text-sun-700' : res === 'L' ? 'bg-clay-50 text-clay-700' : 'bg-sand text-ink-soft')}>{m.scoreUs}-{m.scoreThem}</span>
        </span>
      )
      return (
        <Row node={<Node tone={l.minutes > 0 ? 'forest' : 'neutral'}><Trophy /></Node>} date={i.date} meta={m.competition} title={coach ? <Link to={`/app/matchs/${m.id}`} className="hover:underline">{title}</Link> : title}>
          <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
            <span className="font-semibold text-ink-soft">{role}{l.minutes > 0 ? `, ${fmtMinutes(l.minutes, lang)}` : ''}</span>
            {l.captain && l.minutes > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-terra-50 px-2 py-0.5 text-[11.5px] font-semibold text-terra-700"><Crown size={12} aria-hidden="true" />{t('timeline.captain')}</span>}
            {c.GOAL > 0 && <span className="rounded-full bg-sun-500 px-2 py-0.5 text-[11.5px] font-bold text-night-900">{t('stats.goals', { count: c.GOAL })}</span>}
          </div>
          {l.tagged && l.minutes > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {chips.filter(([, n]) => n > 0).map(([label]) => <li key={label} className="rounded-full bg-sand/70 px-2 py-0.5 text-[11.5px] font-medium text-ink-soft">{label}</li>)}
            </ul>
          )}
        </Row>
      )
    }
    case 'week': {
      const present = i.marks.filter((m) => m.status === 'present' || m.status === 'late').length
      return (
        <Row node={<Node tone="neutral"><CalendarCheck /></Node>} date={i.date}
          title={t('timeline.week', { date: fmtDate(weekStart(i.marks[0].session.date), lang, { day: 'numeric', month: 'short' }) })}>
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
            <span className="font-semibold text-ink-soft">{t('timeline.weekCount', { n: present, count: i.marks.length })}</span>
            <span className="flex flex-wrap gap-1">
              {i.marks.map((m) => (
                <span key={m.session.id} title={`${fmtDate(m.session.date, lang, { weekday: 'long' })}: ${m.status ? t(`attendance.status.${m.status}`) : t('attendance.unmarked')}`}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-1.5 py-0.5 text-[11px]">
                  <span className={cx('h-2 w-2 rounded-full', m.status ? STATUS_DOT[m.status] : 'border border-ink-faint')} />{fmtDate(m.session.date, lang, { weekday: 'short' }).replace('.', '')}
                  <span className="sr-only">{m.status ? t(`attendance.status.${m.status}`) : t('attendance.unmarked')}</span>
                </span>
              ))}
            </span>
          </div>
        </Row>
      )
    }
    case 'objective': {
      const o = i.obj
      const link = o.skill ? t(`common:skills.${o.skill}`) : o.sub ? t('objectives.subLink', { name: t(`analysis:sub.${o.sub}.name`) }) : ''
      if (i.phase === 'set') return (
        <Row node={<Node tone="sun"><Target /></Node>} date={i.date} meta={o.by === 'player' ? t('timeline.byPlayer') : undefined} title={t('timeline.objSet', { title: o.title })}>
          <p className="text-[12.5px] text-ink-muted">{link}{link ? ', ' : ''}{t('objectives.reviewOn', { date: fmtDate(o.review, lang, { day: 'numeric', month: 'long' }) })}</p>
        </Row>
      )
      return (
        <Row node={<Node tone={o.status === 'achieved' ? 'sun' : 'neutral'}><Flag /></Node>} date={i.date} title={t('timeline.objReview', { title: o.title })}>
          <span className={cx('inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-semibold', o.status === 'achieved' ? 'bg-sun-100 text-sun-700' : o.status === 'partial' ? 'bg-forest-50 text-forest-700' : 'bg-sand text-ink-soft')}>{t(`objectives.status.${o.status}${o.status === 'notyet' && stage === 'adult' ? 'Adult' : ''}`)}</span>
          {o.reviewNote && <p className="mt-1.5 text-[13.5px] italic leading-snug text-ink-soft">{quote(o.reviewNote, lang)}</p>}
        </Row>
      )
    }
    case 'milestone':
      return (
        <Row node={<Node tone="sun"><Star /></Node>} date={i.date} meta={t(`milestones.kind.${i.ms.kind}`)} title={i.ms.title}>
          {i.ms.note && <p className="text-[13.5px] leading-snug text-ink-soft">{i.ms.note}</p>}
        </Row>
      )
    case 'derived': {
      const title = i.type === 'skill_level' ? t('derived.skill_level', { skill: t(`common:skills.${i.skill}`), level: t(`team:levels.${i.level}`) })
        : t(`derived.${i.type}${stage === 'adult' && i.type !== 'matches_n' ? 'Adult' : ''}`, { opponent: i.match?.opponent ?? '', n: i.n ?? 0 })
      return <Row node={<Node tone="sun"><Star /></Node>} date={i.date} title={title} />
    }
  }
}

/** Positive contribution codes shown to younger players (no losses, no percentages). */
export const YOUNG_CODES: EventCode[] = ['PROG', 'LINE', 'REGAIN5', 'REGAIN', 'FINAL3', 'BOX', 'SHOT', 'GOAL']
