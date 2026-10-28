import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, CalendarCheck, ChartLine, Check, ChevronDown, ClipboardCopy, Dumbbell, FileQuestion, Goal, ListChecks, Pencil, Play, Printer, Sparkles, Target, ThumbsUp, Video, Wrench,
} from 'lucide-react'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useT } from '../../i18n'
import { BOOKS, BRAND } from '../../lib/config'
import { nextMatch, planWeek } from '../../lib/actions'
import { getDrill, drillText } from '../../content'
import { cx, fmtDate, nowISO, uid, weekStart } from '../../lib/util'
import type { Lang, Match, MatchEvent, Player, Team, VideoProject } from '../../lib/types'
import {
  computeNjangi, EVENT_CODES, fmtNjangi, NJANGI_BANDS, njangiBand, njangiExtras, njangiLabel, rankSubs, subLevel, SUB_KEYS, type NjangiResult, type SubKey,
} from '../../lib/njangi'
import { EmptyState } from '../../ui'
import { buildSummary, type NjangiSummary } from './components/summary'
import { CompareBars, NjangiGauge, SubBar, TimelineChart } from './components/charts'
import { defFor, fmtPct, minuteLabel } from './components/codes'
import { copyText, previousAnalysed, useMedia, useTeamAnalysis } from './components/data'

type Half = 1 | 2 | 3 | 4

export default function MatchReport() {
  const { id = '' } = useParams()
  const { t } = useT('analysis')
  const match = useLiveQuery<Match | null | undefined>(async () => (await db.matches.get(id)) ?? null, [id], undefined)
  useDocumentTitle(t('report.title'))
  if (match === undefined) return <div className="grid min-h-[50vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>
  if (match === null) {
    return <EmptyState icon={<FileQuestion size={32} />} title={t('report.notFound')} body={t('report.notFoundBody')} action={<Link to="/app/analyse" className="btn-primary">{t('live.back')}</Link>} />
  }
  return <Report match={match} />
}

/* ------------------------------------------------------------------ the report */

function Report({ match }: { match: Match }) {
  const { t, lang } = useT('analysis')
  const navigate = useNavigate()
  const team = useLiveQuery<Team | undefined>(() => db.teams.get(match.teamId), [match.teamId], undefined)
  const players = useLiveQuery(() => db.players.where('teamId').equals(match.teamId).toArray(), [match.teamId], [] as Player[])
  const analysis = useTeamAnalysis(match.teamId)
  const events = useMemo(() => analysis.events.get(match.id) ?? [], [analysis, match.id])
  const result = useMemo(() => computeNjangi(events), [events])
  const prev = useMemo(() => previousAnalysed(analysis, match), [analysis, match])
  const oppShots = events.filter((e) => e.side === 'them' && e.code === 'SHOT').length
  const summary = useMemo(() => buildSummary(result, lang, prev?.result ?? null, { oppShots, oppGoals: match.scoreThem }), [result, lang, prev, oppShots, match.scoreThem])
  const halves = useMemo(() => ([1, 2, 3, 4] as Half[]).filter((h) => h <= 2 || events.some((e) => e.half === h)).map((h) => ({ h, r: computeNjangi(events.filter((e) => e.half === h)) })), [events])
  const extras = useMemo(() => njangiExtras(events), [events])
  const [toast, setToast] = useState('')
  const wide = useMedia('(min-width: 1024px)')
  const teamName = team?.name ?? t('live.us')

  if (!analysis.ready) return <div className="grid min-h-[50vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>

  const flash = (s: string) => { setToast(s); window.setTimeout(() => setToast(''), 2200) }
  const copy = async () => { const ok = await copyText(reportText({ match, teamName, result, halves, summary, lang, t })); flash(ok ? t('report.copied') : t('report.copyFail')) }
  const openVideo = async () => {
    const existing = await db.videos.where('matchId').equals(match.id).first()
    if (existing) { navigate(`/app/analyse/video/${existing.id}`); return }
    const v: VideoProject = { id: uid('vp_'), title: `${teamName} ${t('common:app.vs')} ${match.opponent}`, matchId: match.id, tags: [], createdAt: nowISO() }
    await db.videos.put(v)
    navigate(`/app/analyse/video/${v.id}`)
  }

  const header = <ReportHeader match={match} teamName={teamName} events={events} players={players} onCopy={copy} onPrint={() => window.print()} onVideo={openVideo} />

  if (!events.length) {
    return (
      <div>
        {header}
        <EmptyState icon={<ChartLine size={32} />} title={t('report.noTagsTitle')} body={t('report.noTagsBody')}
          action={<div className="flex flex-wrap justify-center gap-2"><Link to={`/app/analyse/live/${match.id}`} className="btn-primary"><Play size={16} />{t('report.startLive')}</Link><button type="button" onClick={openVideo} className="btn-outline"><Video size={16} />{t('report.video')}</button></div>} />
      </div>
    )
  }

  const philosophy = <Philosophy summary={summary} teamName={teamName} />
  const timeline = (
    <section className="card card-pad">
      <h2 className="font-display text-lg font-semibold text-ink">{t('report.timeline')}</h2>
      <p className="mb-4 mt-0.5 text-sm text-ink-muted">{t('report.timelineHint')}</p>
      <TimelineChart events={events} halfMinutes={match.halfMinutes} />
    </section>
  )
  const explain = (
    <section className="card card-pad">
      <h2 className="font-display text-lg font-semibold text-ink">{t('report.explainTitle')}</h2>
      <p className="mb-4 mt-0.5 text-sm text-ink-muted">{t('report.subHint')}</p>
      <div className="divide-y divide-line">{rankSubs(result).map((k) => <SubExplain key={k} k={k} r={result} />)}</div>
      <p className="mt-4 text-xs text-ink-faint">{t('report.source', { book: BOOKS.methode.title[lang] })} <a href={`${BOOKS.methode.href}#ch-32`} className="link no-print">{t('report.readSource')}</a></p>
    </section>
  )
  const contributions = <Contributions events={events} players={players} team={team} />
  const week = <WeekPlan summary={summary} team={team} />
  const keyCounts = <KeyCounts result={result} extras={extras} oppShots={oppShots} events={events} />
  const compare = (
    <section className="card card-pad">
      <h2 className="font-display text-lg font-semibold text-ink">{t('report.compare')}</h2>
      {prev ? (
        <>
          <p className="mb-4 mt-0.5 text-sm text-ink-muted">
            <Link to={`/app/analyse/rapport/${prev.match.id}`} className="link">{t('report.compareWith', { opp: prev.match.opponent, date: fmtDate(prev.match.date, lang, { day: 'numeric', month: 'long' }) })}</Link>
          </p>
          <div className="mb-4 flex items-end gap-4">
            <div><div className="text-xs text-ink-muted">{fmtDate(prev.match.date, lang, { day: 'numeric', month: 'short' })}</div><div className="font-display text-2xl font-semibold tabular-nums text-ink-muted">{fmtNjangi(prev.result.total, lang)}</div></div>
            <div className="pb-1 text-ink-faint">{'>'}</div>
            <div><div className="text-xs text-ink-muted">{fmtDate(match.date, lang, { day: 'numeric', month: 'short' })}</div><div className="font-display text-2xl font-semibold tabular-nums text-forest-600">{fmtNjangi(result.total, lang)}</div></div>
          </div>
          <div className="mb-3 flex gap-4 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-ink-faint" />{t('report.prevShort')}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-forest-600" />{t('report.thisMatch')}</span>
          </div>
          <CompareBars cur={result} prev={prev.result} />
        </>
      ) : <p className="mt-1 text-sm text-ink-muted">{t('report.compareEmpty')}</p>}
    </section>
  )
  const codes = <CodesTable result={result} events={events} />

  return (
    <div className="nj-report">
      <style>{`@media print { .fixed, header.sticky, aside.sticky { display: none !important } main { padding-top: 0 !important; padding-bottom: 0 !important } .nj-report, .nj-report * { -webkit-print-color-adjust: exact; print-color-adjust: exact } .nj-report section { break-inside: avoid } }`}</style>
      {header}

      {/* ---------- Indice ---------- */}
      <section className="card mb-6 overflow-hidden" aria-labelledby="indice-h">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col items-center justify-center border-b border-line px-5 py-6 lg:border-b-0 lg:border-r">
            <h2 id="indice-h" className="eyebrow mb-2">Indice Njangi</h2>
            <NjangiGauge total={result.total} size={236} />
            <BandScale total={result.total} />
            {prev && <DeltaChip cur={result.total} prev={prev.result.total} lang={lang} label={t('report.vsPrev', { opp: prev.match.opponent })} />}
          </div>
          <div className="px-5 py-5 sm:px-6">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-ink">{t('report.subTitle')}</h3>
              <span className="text-xs text-ink-faint">{t('report.per20')}</span>
            </div>
            <div className="space-y-3.5">{SUB_KEYS.map((k) => <SubBar key={k} k={k} value={result.sub[k]} prev={prev?.result.sub[k]} />)}</div>
            {prev && <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted"><span className="inline-block h-3 w-0.5 bg-ink/50" />{t('report.prevMarker')}</p>}
            <HalfTable halves={halves} total={result} />
          </div>
        </div>
      </section>

      {wide ? (
        <>
          <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-start gap-6">
            <div className="min-w-0 space-y-6">{philosophy}{timeline}{explain}</div>
            <div className="min-w-0 space-y-6">{week}{keyCounts}{compare}{codes}</div>
          </div>
          <div className="mt-6">{contributions}</div>
        </>
      ) : (
        <div className="space-y-6">{philosophy}{week}{keyCounts}{timeline}{explain}{compare}{contributions}{codes}</div>
      )}

      {toast && <div role="status" className="no-print fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-night-800 px-4 py-2 text-sm font-semibold text-cream shadow-lift lg:bottom-8">{toast}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ header */

function ReportHeader({ match, teamName, events, players, onCopy, onPrint, onVideo }: {
  match: Match; teamName: string; events: MatchEvent[]; players: Player[]; onCopy: () => void; onPrint: () => void; onVideo: () => void
}) {
  const { t, lang } = useT('analysis')
  const res = match.scoreUs > match.scoreThem ? 'W' : match.scoreUs < match.scoreThem ? 'L' : 'D'
  const goals = events.filter((e) => e.code === 'GOAL').sort((a, b) => a.half - b.half || a.t - b.t)
  const byId = new Map(players.map((p) => [p.id, p]))
  const resTone = res === 'W' ? 'bg-sun-500 text-night-900' : res === 'L' ? 'bg-clay-500 text-white' : 'bg-white/15 text-cream'
  return (
    <div className="mb-6">
      <div className="no-print mb-3 flex items-center justify-between gap-2">
        <Link to="/app/analyse" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"><ArrowLeft size={16} />{t('report.back')}</Link>
        <div className={cx('flex flex-wrap justify-end gap-1.5', !events.length && 'invisible')}>
          <button type="button" onClick={onCopy} className="btn-outline btn-sm min-h-[44px]"><ClipboardCopy size={15} />{t('report.copy')}</button>
          <button type="button" onClick={onPrint} className="btn-outline btn-sm min-h-[44px]"><Printer size={15} />{t('report.print')}</button>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-[24px] bg-forest-600 text-cream shadow-card">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[18px] border-white/[0.05]" aria-hidden="true" />
        <div className="relative px-5 pb-5 pt-5 sm:px-7 sm:pt-6">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sun-300">
            <span>{BRAND.name}</span><span className="text-cream/40">·</span><span>{t('report.title')}</span>
          </div>
          <div className="mt-1 text-[13px] text-cream/75">
            {[match.competition, fmtDate(match.date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), match.home ? t('report.atHome') : t('report.away')].filter(Boolean).join(', ')}
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
            <div className="min-w-0 text-right font-display text-[17px] font-semibold leading-tight sm:text-[26px]">{teamName}</div>
            <div className="flex flex-col items-center">
              <div className="whitespace-nowrap font-display text-[42px] font-semibold leading-none tabular-nums sm:text-[56px]">{match.scoreUs}<span className="mx-1.5 text-cream/40">-</span>{match.scoreThem}</div>
              <span className={cx('mt-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', match.status === 'done' ? resTone : 'bg-white/15 text-cream')}>{match.status === 'done' ? t(`report.result.${res}`) : t(`report.status.${match.status}`)}</span>
            </div>
            <div className="min-w-0 font-display text-[17px] font-semibold leading-tight sm:text-[26px]">{match.opponent}</div>
          </div>
          {goals.length > 0 && (
            <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] text-cream/85">
              {goals.map((g) => {
                const p = g.playerId ? byId.get(g.playerId) : undefined
                return (
                  <li key={g.id} className="inline-flex items-center gap-1.5">
                    <Goal size={13} className={g.side === 'us' ? 'text-sun-300' : 'text-clay-300'} />
                    <span className="tabular-nums">{minuteLabel(g.half, g.t, match.halfMinutes)}</span>
                    <span>{g.side === 'us' ? (p ? p.name : teamName) : match.opponent}</span>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="no-print mt-5 flex flex-wrap gap-2 border-t border-white/15 pt-4">
            <Link to={`/app/analyse/live/${match.id}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[13px] font-semibold hover:bg-white/15"><Pencil size={15} />{t('report.editTags')}</Link>
            <button type="button" onClick={onVideo} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[13px] font-semibold hover:bg-white/15"><Video size={15} />{t('report.video')}</button>
            <Link to={`/app/matchs/${match.id}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[13px] font-semibold hover:bg-white/15"><ListChecks size={15} />{t('report.sheet')}</Link>
            <span className="ml-auto self-center text-[12px] text-cream/60">{t('hub.tags', { n: events.length })}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeltaChip({ cur, prev, lang, label }: { cur: number; prev: number; lang: Lang; label: string }) {
  const d = Math.round((cur - prev) * 10) / 10
  return (
    <span className={cx('mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', d > 0 ? 'bg-forest-50 text-forest-700' : d < 0 ? 'bg-clay-50 text-clay-700' : 'bg-sand text-ink-soft')}>
      <span className="tabular-nums">{d > 0 ? '+' : ''}{fmtNjangi(d, lang)}</span><span className="font-medium opacity-80">{label}</span>
    </span>
  )
}

/** The five reading bands of chapter 32 under the gauge, the current one lit. */
function BandScale({ total }: { total: number }) {
  const { lang } = useT('analysis')
  const bands = NJANGI_BANDS
  const cur = njangiBand(total)
  const tone = ['bg-clay-500', 'bg-terra-500', 'bg-sun-500', 'bg-forest-500', 'bg-forest-600']
  return (
    <div className="mt-4 w-full max-w-[280px]" aria-hidden="true">
      <div className="relative flex h-2 gap-0.5">
        {bands.slice(0, -1).map((b, i) => <span key={b} className={cx('h-full rounded-full', i === cur ? tone[i] : 'bg-sand')} style={{ flexGrow: bands[i + 1] - b, flexBasis: 0 }} />)}
        <span className="absolute -top-1 h-4 w-1 rounded-full bg-ink" style={{ left: `calc(${Math.max(0, Math.min(100, total))}% - 2px)` }} />
      </div>
      <div className="relative mt-1 h-4 text-[10.5px] tabular-nums text-ink-faint">
        {bands.slice(1, -1).map((b) => <span key={b} className="absolute -translate-x-1/2" style={{ left: `${b}%` }}>{b}</span>)}
        <span className="absolute left-0">0</span><span className="absolute right-0">100</span>
      </div>
      <p className="sr-only">{njangiLabel(total, lang)}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ per half */

function HalfTable({ halves, total }: { halves: { h: Half; r: NjangiResult }[]; total: NjangiResult }) {
  const { t, lang } = useT('analysis')
  const f = (v: number) => fmtNjangi(v, lang)
  return (
    <details className="group mt-5 rounded-xl border border-line bg-cream/60">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-semibold text-ink">
        {t('report.byHalf')}<ChevronDown size={16} className="text-ink-muted transition group-open:rotate-180" />
      </summary>
      <div className="overflow-x-auto px-1 pb-2">
        <table className="table-n min-w-[340px]">
          <thead><tr><th></th>{halves.map(({ h }) => <th key={h} className="text-right">{t(`report.halfCol.${h}`)}</th>)}<th className="text-right">{t('report.match')}</th></tr></thead>
          <tbody>
            {SUB_KEYS.map((k) => (
              <tr key={k}><td className="font-medium">{t(`sub.${k}.name`)}</td>{halves.map(({ h, r }) => <td key={h} className="text-right tabular-nums">{f(r.sub[k])}</td>)}<td className="text-right font-semibold tabular-nums">{f(total.sub[k])}</td></tr>
            ))}
            <tr><td className="font-semibold">Indice</td>{halves.map(({ h, r }) => <td key={h} className="text-right font-semibold tabular-nums">{f(r.total)}</td>)}<td className="text-right font-bold tabular-nums text-forest-600">{f(total.total)}</td></tr>
          </tbody>
        </table>
        <p className="px-3 pt-1 text-xs text-ink-faint">{t('report.byHalfHint')}</p>
      </div>
    </details>
  )
}

/* ------------------------------------------------------------------ philosophy */

function Philosophy({ summary, teamName }: { summary: NjangiSummary; teamName: string }) {
  const { t } = useT('analysis')
  return (
    <section className="card overflow-hidden" aria-labelledby="philo-h">
      <div className="border-b border-line bg-sand/50 px-5 py-4 sm:px-6">
        <div className="eyebrow mb-1">{teamName}</div>
        <h2 id="philo-h" className="font-display text-[22px] font-semibold leading-tight text-ink">{t('report.philosophy')}</h2>
      </div>
      <div className="space-y-3 px-5 py-5 sm:px-6">
        {summary.paragraphs.map((p, i) => <p key={i} className={cx('text-[15.5px] leading-7 text-ink-soft', i === 0 && 'first-letter:font-display first-letter:text-[1.6em] first-letter:font-semibold first-letter:text-forest-600')}>{p}</p>)}
      </div>
      <div className="grid gap-0 border-t border-line sm:grid-cols-2">
        <ListBlock icon={<ThumbsUp size={16} />} tone="forest" title={t('report.strengths')} items={summary.strengths} />
        <ListBlock icon={<Wrench size={16} />} tone="clay" title={t('report.corrections')} items={summary.corrections} className="border-t border-line sm:border-l sm:border-t-0" />
      </div>
    </section>
  )
}

function ListBlock({ icon, tone, title, items, className }: { icon: ReactNode; tone: 'forest' | 'clay'; title: string; items: string[]; className?: string }) {
  return (
    <div className={cx('px-5 py-5 sm:px-6', className)}>
      <h3 className={cx('mb-3 flex items-center gap-2 font-sans text-[13px] font-semibold uppercase tracking-[0.12em]', tone === 'forest' ? 'text-forest-600' : 'text-clay-600')}>{icon}{title}</h3>
      <ol className="space-y-3">
        {items.map((s, i) => (
          <li key={i} className="flex gap-3 text-[14.5px] leading-6 text-ink-soft">
            <span className={cx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold', tone === 'forest' ? 'bg-forest-50 text-forest-700' : 'bg-clay-50 text-clay-700')}>{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ------------------------------------------------------------------ sub-indices explained */

function SubExplain({ k, r }: { k: SubKey; r: NjangiResult }) {
  const { t, lang } = useT('analysis')
  const c = r.counts
  const lvl = subLevel(r.sub[k])
  const n = (v: number, d = 3) => v.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: d })
  const vars = { prog: c.PROG, line: c.LINE, passes: r.passes, final3: c.FINAL3, box: c.BOX, poss: r.possessions, fix: c.FIX2, sw: c.SWITCH, r5: c.REGAIN5, losses: r.losses, ok: c.PASS_OK, actions: r.actions, k: n(r.conservation) }
  return (
    <div className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-[15px] font-semibold text-ink">{t(`sub.${k}.name`)}</h3>
        <span className="shrink-0 text-sm tabular-nums"><b className="text-ink">{fmtNjangi(r.sub[k], lang)}</b><span className="text-ink-faint"> / 20</span> <span className={cx('ml-1 text-xs font-semibold', lvl === 0 ? 'text-clay-600' : lvl === 1 ? 'text-terra-600' : 'text-forest-600')}>{t(`level.${lvl}`)}</span></span>
      </div>
      <p className="mt-1 text-[14px] leading-6 text-ink-muted">{t(`sub.${k}.what`)}</p>
      <details className="group mt-1.5">
        <summary className="inline-flex min-h-[32px] cursor-pointer list-none items-center gap-1 text-[13px] font-semibold text-forest-600">{t('report.showFormula')}<ChevronDown size={14} className="transition group-open:rotate-180" /></summary>
        <div className="mt-1 rounded-lg bg-sand/70 px-3 py-2 font-mono text-[12.5px] text-ink-soft">{t(`sub.${k}.how`, vars)} = {fmtNjangi(r.sub[k], lang)}</div>
      </details>
    </div>
  )
}

/* ------------------------------------------------------------------ week plan */

function WeekPlan({ summary, team }: { summary: NjangiSummary; team?: Team }) {
  const { t, lang } = useT('analysis')
  const next = useLiveQuery(() => (team ? nextMatch(team.id) : Promise.resolve(undefined)), [team?.id], undefined as Match | undefined)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<null | { n: number; week: string }>(null)
  const subNames = summary.weakest.map((k) => t(`sub.${k}.name`)).join(', ')
  const plan = async () => {
    if (!next || !team) return
    setBusy(true)
    try {
      const created = await planWeek({ matchDate: next.date, teamId: team.id, ageGroup: team.ageGroup, lang, intention: summary.intention, createdBy: 'user' })
      setDone({ n: created.length, week: weekStart(next.date) })
    } finally { setBusy(false) }
  }
  return (
    <section className="card overflow-hidden" aria-labelledby="week-h">
      <div className="bg-night-800 px-5 py-4 text-cream sm:px-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sun-300">{t('report.nextWeek')}</div>
        <h2 id="week-h" className="mt-0.5 font-display text-[20px] font-semibold">{t('report.objectives')}</h2>
      </div>
      <div className="px-5 py-5 sm:px-6">
        <ul className="space-y-2.5">
          {summary.objectives.map((o, i) => (
            <li key={i} className="flex gap-2.5 text-[14.5px] leading-6 text-ink-soft"><Target size={17} className="mt-0.5 shrink-0 text-terra-500" /><span>{o}</span></li>
          ))}
        </ul>
        <h3 className="mb-1 mt-5 flex items-center gap-2 font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-muted"><Dumbbell size={15} />{t('report.drills')}</h3>
        <p className="mb-3 text-[13px] text-ink-faint">{t('report.drillsHint', { subs: subNames })}</p>
        <div className="grid gap-2">
          {summary.drills.flatMap((d) => d.ids.map((id) => ({ id, sub: d.sub }))).map(({ id, sub }) => <DrillLink key={id} id={id} sub={sub} />)}
        </div>
        <div className="no-print mt-5 border-t border-line pt-4">
          {next ? (
            <>
              <p className="mb-3 text-[13px] text-ink-muted">{t('report.planFor', { opp: next.opponent, date: fmtDate(next.date, lang, { weekday: 'long', day: 'numeric', month: 'long' }), intention: t(`common:intentions.${summary.intention}`) })}</p>
              {done ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-600"><Check size={16} />{done.n ? t('report.planDone', { n: done.n, opp: next.opponent }) : t('report.planNone')}</span>
                  <Link to={`/app/semaine?w=${done.week}`} className="btn-outline btn-sm min-h-[40px]"><CalendarCheck size={15} />{t('report.openWeek')}</Link>
                </div>
              ) : (
                <button type="button" onClick={plan} disabled={busy} className="btn-accent w-full justify-center py-3"><Sparkles size={17} />{t('report.plan')}</button>
              )}
            </>
          ) : (
            <div className="text-[13px] text-ink-muted">{t('report.planNoMatch')} <Link to="/app/matchs/nouveau" className="link">{t('hub.newMatch')}</Link></div>
          )}
        </div>
      </div>
    </section>
  )
}

function DrillLink({ id, sub }: { id: string; sub: SubKey }) {
  const { t, lang } = useT('analysis')
  const d = getDrill(id)
  const text = d ? drillText(d, lang) : null
  return (
    <Link to={`/app/exercices/${id}`} className="group flex items-center gap-3 rounded-xl border border-line bg-paper p-2.5 transition hover:border-forest-300">
      <span className="grid h-11 w-12 shrink-0 place-items-center rounded-lg bg-forest-600 font-display text-[15px] font-semibold text-cream">{id}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">{text?.title ?? t('report.drill', { id })}</span>
        <span className="block truncate text-[12px] text-ink-muted">{t(`sub.${sub}.name`)}{d ? ` · ${t(`common:families.${d.family}`)} · ${d.minutes} ${t('common:misc.minutes')}` : ''}</span>
      </span>
      <span className="hidden shrink-0 text-[12px] font-semibold text-forest-600 opacity-0 transition group-hover:opacity-100 sm:inline">{t('report.openDrill')}</span>
    </Link>
  )
}

/* ------------------------------------------------------------------ key counts */

function KeyCounts({ result, extras, oppShots, events }: { result: NjangiResult; extras: ReturnType<typeof njangiExtras>; oppShots: number; events: MatchEvent[] }) {
  const { t, lang } = useT('analysis')
  const c = result.counts
  const pct = (v: number) => fmtPct(v, lang)
  const oppOn = events.filter((e) => e.side === 'them' && e.code === 'SHOT_IN').length
  const tiles: [string, ReactNode, string?][] = [
    [t('counts.passesTried'), result.passes, `${pct(result.passAccuracy)} ${t('counts.accuracyShort')}`],
    [t('counts.conservation'), pct(result.conservation)],
    [t('counts.progressive'), c.PROG, `${c.LINE} ${t('counts.linesShort')}`],
    [t('counts.final3'), c.FINAL3, `${c.BOX} ${t('counts.boxShort')}`],
    [t('counts.shots'), `${c.SHOT} (${c.SHOT_IN})`, `${c.GOAL} ${t('counts.goalsShort')}`],
    [t('counts.fixations'), c.FIX2, `${c.SWITCH} ${t('counts.switchShort')}`],
    [t('counts.losses'), result.losses, `${c.LOSS} ${t('counts.lossOnBall')}`],
    [t('counts.regain5'), c.REGAIN5, `${pct(result.repriseRate)} ${t('counts.ofLosses')}`],
  ]
  return (
    <section className="card card-pad">
      <h2 className="mb-3 font-display text-lg font-semibold text-ink">{t('report.keyCounts')}</h2>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(([label, v, hint]) => (
          <div key={label} className="rounded-xl bg-cream/70 px-3 py-2.5 ring-1 ring-line/70">
            <div className="truncate text-[12px] font-medium text-ink-muted">{label}</div>
            <div className="mt-0.5 font-display text-[22px] font-semibold leading-tight tabular-nums text-ink">{v}</div>
            {hint && <div className="text-[11.5px] leading-snug text-ink-faint">{hint}</div>}
          </div>
        ))}
      </div>
      <h3 className="mb-1 mt-5 font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{t('report.extras')}</h3>
      <p className="mb-2 text-[12.5px] text-ink-faint">{t('report.extrasHint')}</p>
      <dl className="divide-y divide-line/70 text-[14px]">
        <Row k={t('report.possessionShare')} v={extras.possessionShare == null ? '-' : fmtPct(extras.possessionShare, lang, 1)} />
        <Row k={t('report.fieldTilt')} v={extras.fieldTilt == null ? '-' : fmtPct(extras.fieldTilt, lang, 1)} />
        <Row k={t('report.theirShots')} v={`${oppShots} (${oppOn})`} />
      </dl>
      {(extras.possessionShare == null || extras.fieldTilt == null) && <p className="mt-2 text-[12.5px] text-ink-faint">{t('report.extrasMissing')}</p>}
    </section>
  )
}
const Row = ({ k, v }: { k: string; v: ReactNode }) => <div className="flex items-center justify-between gap-3 py-2"><dt className="text-ink-soft">{k}</dt><dd className="font-semibold tabular-nums text-ink">{v}</dd></div>

/* ------------------------------------------------------------------ players */

function Contributions({ events, players, team }: { events: MatchEvent[]; players: Player[]; team?: Team }) {
  const { t, lang } = useT('analysis')
  const rows = useMemo(() => {
    const by = new Map<string, MatchEvent[]>()
    for (const e of events) if (e.side === 'us' && e.playerId) { const l = by.get(e.playerId); if (l) l.push(e); else by.set(e.playerId, [e]) }
    return [...by.entries()].map(([pid, evs]) => {
      const n = (codes: string[]) => evs.filter((e) => codes.includes(e.code)).length
      const ok = n(['PASS_OK']), lost = n(['PASS_LOST'])
      return { p: players.find((x) => x.id === pid), pid, pass: ok + lost, acc: ok + lost ? ok / (ok + lost) : null, prog: n(['PROG', 'LINE']), danger: n(['FINAL3', 'BOX']), shots: n(['SHOT']), fix: n(['FIX2', 'SWITCH']), losses: n(['PASS_LOST', 'LOSS']), regains: n(['REGAIN', 'REGAIN5']), total: evs.length }
    }).sort((a, b) => b.total - a.total)
  }, [events, players])
  const youth = /U\s?(\d+)/i.exec(team?.ageGroup ?? '')
  const isYouth = youth ? Number(youth[1]) <= 15 : false
  return (
    <section className="card card-pad">
      <h2 className="font-display text-lg font-semibold text-ink">{t('report.players')}</h2>
      <p className="mb-3 mt-0.5 text-sm text-ink-muted">{t('report.playersHint')}</p>
      {isYouth && <p className="mb-3 rounded-xl bg-sun-50 px-3 py-2 text-[13px] text-sun-700">{t('report.youthNote')}</p>}
      {rows.length === 0 ? <p className="text-sm text-ink-muted">{t('report.playersEmpty')}</p> : (
        <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
          <table className="table-n min-w-[620px]">
            <thead>
              <tr>
                <th>{t('report.player')}</th>
                {(['pass', 'acc', 'prog', 'danger', 'shots', 'fix', 'losses', 'regains'] as const).map((k) => <th key={k} className="text-right">{t(`report.col.${k}`)}</th>)}
                <th className="text-right">{t('report.total')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.pid}>
                  <td className="whitespace-nowrap">
                    <span className="mr-2 inline-grid h-7 min-w-[28px] place-items-center rounded-md bg-forest-600 px-1 text-[12px] font-bold tabular-nums text-cream">{r.p?.number ?? '?'}</span>
                    <span className="font-medium text-ink">{r.p?.name ?? '?'}</span>
                  </td>
                  <td className="text-right tabular-nums">{r.pass}</td>
                  <td className="text-right tabular-nums text-ink-muted">{r.acc == null ? '-' : fmtPct(r.acc, lang)}</td>
                  <td className="text-right tabular-nums">{r.prog}</td>
                  <td className="text-right tabular-nums">{r.danger}</td>
                  <td className="text-right tabular-nums">{r.shots}</td>
                  <td className="text-right tabular-nums">{r.fix}</td>
                  <td className="text-right tabular-nums text-clay-600">{r.losses}</td>
                  <td className="text-right tabular-nums text-forest-600">{r.regains}</td>
                  <td className="text-right font-semibold tabular-nums">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ codes */

function CodesTable({ result, events }: { result: NjangiResult; events: MatchEvent[] }) {
  const { t } = useT('analysis')
  const them = useMemo(() => { const m = new Map<string, number>(); for (const e of events) if (e.side === 'them') m.set(e.code, (m.get(e.code) ?? 0) + 1); return m }, [events])
  const anyThem = them.size > 0
  return (
    <section className="card card-pad">
      <details className="group">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2">
          <span><span className="block font-display text-lg font-semibold text-ink">{t('report.codes')}</span><span className="block text-sm text-ink-muted">{t('report.codesHint')}</span></span>
          <ChevronDown size={18} className="shrink-0 text-ink-muted transition group-open:rotate-180" />
        </summary>
        <div className="mt-3">
          <table className="table-n">
            <thead><tr><th>Code</th><th className="text-right">{t('live.us')}</th>{anyThem && <th className="text-right">{t('live.them')}</th>}</tr></thead>
            <tbody>
              {EVENT_CODES.map((c) => {
                const def = defFor(c, 'us')
                return (
                  <tr key={c}>
                    <td><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: def?.color }} /><span className="font-mono text-[12px] text-ink-muted">{c}</span><span className="text-ink-soft">{t(`common:events.${c}`)}</span></span></td>
                    <td className="text-right font-semibold tabular-nums">{result.counts[c]}</td>
                    {anyThem && <td className="text-right tabular-nums text-ink-muted">{them.get(c) ?? 0}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <h3 className="mb-1 mt-4 font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{t('report.bases')}</h3>
          <dl className="divide-y divide-line/70 text-[14px]">
            <Row k="PASSES = PASS_OK + PASS_LOST" v={result.passes} />
            <Row k="PERTES = PASS_LOST + LOSS" v={result.losses} />
            <Row k="POSS = PASS_LOST + LOSS + SHOT" v={result.possessions} />
            <Row k="ACTIONS = PASS_OK + PASS_LOST + LOSS" v={result.actions} />
          </dl>
        </div>
      </details>
    </section>
  )
}

/* ------------------------------------------------------------------ plain text */

function reportText({ match, teamName, result, halves, summary, lang, t }: {
  match: Match; teamName: string; result: NjangiResult; halves: { h: Half; r: NjangiResult }[]; summary: NjangiSummary; lang: Lang; t: (k: string, o?: Record<string, unknown>) => string
}) {
  const f = (v: number) => fmtNjangi(v, lang)
  const lines = [
    `${BRAND.name} · ${t('report.title')}`,
    `${teamName} ${match.scoreUs} - ${match.scoreThem} ${match.opponent}`,
    [match.competition, fmtDate(match.date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })].filter(Boolean).join(', '),
    '',
    t('report.txt.indice', { v: f(result.total), label: njangiLabel(result.total, lang) }),
    ...SUB_KEYS.map((k) => t('report.txt.sub', { name: t(`sub.${k}.name`), v: f(result.sub[k]) })),
    halves.length > 1 ? t('report.txt.halves', { label: t('report.byHalf'), list: halves.map(({ h, r }) => `${t(`report.halfCol.${h}`)} ${f(r.total)}`).join(', ') }) : '',
    '',
    t('report.philosophy').toUpperCase(),
    summary.text,
    '',
    t('report.drills'),
    ...summary.drills.flatMap((d) => d.ids.map((id) => { const dr = getDrill(id); return `- ${id}${dr ? ` ${drillText(dr, lang).title}` : ''} (${t(`sub.${d.sub}.name`)})` })),
    '',
    t('report.source', { book: BOOKS.methode.title[lang] }),
  ]
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n')
}
