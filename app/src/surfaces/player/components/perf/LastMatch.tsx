// « Mon dernier match »: the team's Indice Njangi, my share in it (from the actions tagged to me),
// my tagged actions minute by minute, and the videos of my matches.
import { Link } from 'react-router-dom'
import { ChartLine, ChevronRight, Clapperboard, Radio } from 'lucide-react'
import { useT } from '../../../../i18n'
import { fmtNjangi, njangiLabel, rankSubs } from '../../../../lib/njangi'
import { cx, fmtDate } from '../../../../lib/util'
import type { EventCode } from '../../../../lib/types'
import { fmtPct } from '../../../team/components/journey/bits'
import { eventMinute, type PerfData } from './data'
import { Figure, PerfHead, SubBars } from './bits'

/** The actions worth listing (passes are counted, not listed). */
const LISTED: EventCode[] = ['GOAL', 'SHOT_IN', 'SHOT', 'BOX', 'FINAL3', 'LINE', 'PROG', 'FIX2', 'SWITCH', 'REGAIN5', 'REGAIN', 'LOSS']
const CODE_TONE: Partial<Record<EventCode, string>> = { GOAL: 'bg-sun-500 text-ink', SHOT_IN: 'bg-sun-100 text-sun-700', SHOT: 'bg-sun-50 text-sun-700', LOSS: 'bg-sand text-ink-soft', REGAIN5: 'bg-forest-600 text-cream', REGAIN: 'bg-forest-50 text-forest-700' }

export function LastMatchCard({ d, full = false }: { d: PerfData; full?: boolean }) {
  const { t, lang } = useT('player')
  const last = d.last
  if (!last) {
    return (
      <section className="card card-pad h-full" aria-labelledby="lm-h">
        <PerfHead id="lm-h" icon={<ChartLine />} eyebrow={t('perf.last.eyebrow')} title={t('perf.last.emptyTitle')} hint={t('perf.last.emptyBody')} />
      </section>
    )
  }
  const { line, result } = last
  const m = line.match
  const c = line.counts, team = line.team
  const passes = c.PASS_OK + c.PASS_LOST
  const share = (codes: EventCode[]) => { const a = codes.reduce((s, k) => s + c[k], 0), b = codes.reduce((s, k) => s + team[k], 0); return b > 0 ? a / b : null }
  const prog = c.PROG + c.LINE, progShare = share(['PROG', 'LINE'])
  const reg = c.REGAIN5, regShare = share(['REGAIN5'])
  const mine = d.me ? last.events.filter((e) => e.side === 'us' && e.playerId === d.me!.id && LISTED.includes(e.code)) : []
  const actions = mine.map((e) => ({ e, min: eventMinute(e, m.halfMinutes) })).sort((a, b) => a.min - b.min || LISTED.indexOf(a.e.code) - LISTED.indexOf(b.e.code))
  const shown = full ? actions : actions.filter((a) => a.e.code !== 'PROG').slice(0, 6)
  const videos = d.videos.filter((v) => v.matchId === m.id)
  const result3 = m.scoreUs > m.scoreThem ? 'win' : m.scoreUs < m.scoreThem ? 'loss' : 'draw'
  const weakest = result ? rankSubs(result)[0] : undefined

  return (
    <section className="card flex h-full flex-col overflow-hidden" aria-labelledby="lm-h">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <PerfHead id="lm-h" icon={<ChartLine />} eyebrow={t('perf.last.eyebrow')}
          title={t('perf.last.title', { opponent: m.opponent })}
          hint={<><span className={cx('mr-1.5 inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums', result3 === 'win' ? 'bg-forest-50 text-forest-700' : result3 === 'loss' ? 'bg-terra-50 text-terra-700' : 'bg-sand text-ink-soft')}>{t(`perf.last.result.${result3}`)} {m.scoreUs}-{m.scoreThem}</span>{[fmtDate(m.date, lang, { day: 'numeric', month: 'long' }), m.home ? t('match.home') : t('match.away'), m.competition].filter(Boolean).join(' · ')}</>} />
      </div>

      <div className={cx('grid grid-cols-1 gap-5 px-4 pb-4 sm:px-5', full ? 'lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]' : 'md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]')}>
        <div className="min-w-0">
          {result ? (
            <>
              <div className="text-[12px] font-semibold text-ink-muted">{t('perf.last.teamIndice')}</div>
              <div className="mt-0.5 flex items-end gap-2">
                <span className="font-display text-[48px] font-semibold leading-none tabular-nums text-forest-600">{fmtNjangi(result.total, lang)}</span>
                <span className="pb-1 text-sm font-semibold text-ink-faint">/ 100</span>
              </div>
              <div className="mb-3 mt-1 text-[13.5px] font-semibold text-ink">{njangiLabel(result.total, lang)}</div>
              <SubBars sub={result.sub} weakest={weakest} />
            </>
          ) : (
            <p className="rounded-xl bg-sand/60 px-3 py-3 text-sm text-ink-muted">{t('perf.last.untagged')}</p>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-2 text-[12px] font-semibold text-ink-muted">{t('perf.last.myPart')}</div>
          <dl className="grid grid-cols-2 gap-2">
            <Figure label={t('perf.last.minutes')} value={`${line.minutes}'`} sub={line.starter ? t('perf.last.started') : t('perf.last.cameOn')} />
            <Figure label={t('journey:perf.passAcc')} value={passes ? fmtPct(c.PASS_OK / passes, lang) : '·'} sub={passes ? t('journey:perf.passesVal', { ok: c.PASS_OK, n: passes }) : undefined} />
            <Figure label={t('perf.last.progressive')} value={prog} sub={progShare !== null ? t('perf.last.shareOfTeam', { v: fmtPct(progShare, lang) }) : undefined} tone="forest" />
            <Figure label={t('journey:perf.regain5')} value={reg} sub={regShare !== null ? t('perf.last.shareOfTeam', { v: fmtPct(regShare, lang) }) : undefined} tone="forest" />
            {full && <Figure label={t('perf.last.entries')} value={c.FINAL3 + c.BOX} sub={t('perf.last.boxEntries', { count: c.BOX })} />}
            {full && <Figure label={t('perf.last.shots')} value={c.SHOT} sub={c.GOAL ? t('perf.last.goals', { count: c.GOAL }) : t('perf.last.onTarget', { count: c.SHOT_IN })} />}
          </dl>
          {line.tagged && !full && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-semibold text-ink-muted">{t('perf.last.actions')}</span>
                {!full && actions.length > shown.length && <span className="text-[11.5px] text-ink-faint">{t('perf.last.more', { count: actions.length - shown.length })}</span>}
              </div>
              {shown.length === 0 ? <p className="text-[13px] text-ink-muted">{t('perf.last.noActions')}</p> : (
                <ol className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {shown.map(({ e, min }) => (
                    <li key={e.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1">
                      <span className="w-9 shrink-0 text-right font-display text-[14px] font-semibold tabular-nums text-ink-soft">{min}'</span>
                      <span className={cx('rounded-full px-2 py-0.5 text-[12px] font-semibold', CODE_TONE[e.code] ?? 'bg-forest-50 text-forest-700')}>{t(`common:events.${e.code}`)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>

      {full && line.tagged && (
        <div className="border-t border-line/70 px-4 py-4 sm:px-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[14px] font-semibold text-ink">{t('perf.last.actions')}</h3>
            <span className="text-[12px] text-ink-muted">{t('perf.last.actionsCount', { count: actions.length })}</span>
          </div>
          {actions.length === 0 ? <p className="text-[13px] text-ink-muted">{t('perf.last.noActions')}</p> : (
            <>
              <ActionTrack actions={actions} length={2 * m.halfMinutes} half={m.halfMinutes} minutes={line.minutes} starter={line.starter} />
              <ol className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
                {actions.map(({ e, min }) => (
                  <li key={e.id} className="flex min-w-0 items-center gap-2 py-0.5">
                    <span className="w-8 shrink-0 text-right font-display text-[13.5px] font-semibold tabular-nums text-ink-soft">{min}'</span>
                    <span className={cx('truncate rounded-full px-2 py-0.5 text-[12px] font-semibold', CODE_TONE[e.code] ?? 'bg-forest-50 text-forest-700')}>{t(`common:events.${e.code}`)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line/70 bg-cream/50 px-4 py-3 sm:px-5">
        {result && <Link to={`/app/analyse/rapport/${m.id}`} className="btn-primary btn-sm min-h-[44px]"><ChartLine size={16} aria-hidden="true" />{t('perf.last.report')}</Link>}
        {videos.map((v) => <Link key={v.id} to={`/app/analyse/video/${v.id}`} className="btn-outline btn-sm min-h-[44px]"><Clapperboard size={16} aria-hidden="true" /><span className="max-w-[180px] truncate">{v.title}</span></Link>)}
        {videos.length === 0 && <Link to="/app/analyse/video" className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[13px] font-semibold text-forest-700 hover:underline"><Clapperboard size={15} aria-hidden="true" />{t('perf.last.addVideo')}<ChevronRight size={14} aria-hidden="true" /></Link>}
        {!result && <Link to="/app/analyse" className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[13px] font-semibold text-forest-700 hover:underline"><Radio size={15} aria-hidden="true" />{t('perf.last.analysis')}</Link>}
      </div>
    </section>
  )
}

/* ---------------- the match as one line: my actions minute by minute ---------------- */

type Kind = 'ball' | 'regain' | 'shot' | 'loss'
const KIND_OF = (c: EventCode): Kind => (c === 'REGAIN5' || c === 'REGAIN' ? 'regain' : c === 'SHOT' || c === 'SHOT_IN' || c === 'GOAL' ? 'shot' : c === 'LOSS' ? 'loss' : 'ball')
const KIND_COLOR: Record<Kind, string> = { ball: '#0B5D3B', regain: '#3D4F6B', shot: '#F5B700', loss: '#BF5A2E' }

function ActionTrack({ actions, length, half, minutes, starter }: { actions: { e: { id: string; code: EventCode }; min: number }[]; length: number; half: number; minutes: number; starter: boolean }) {
  const { t } = useT('player')
  const pct = (m: number) => `${Math.min(100, Math.max(0, (m / length) * 100))}%`
  const lane = new Map<number, number>()
  const on = starter ? [0, minutes] : [length - minutes, length]
  return (
    <div>
      <div className="relative h-[58px]" role="img" aria-label={t('perf.last.trackAria', { count: actions.length, minutes })}>
        <div className="absolute inset-x-0 top-[26px] h-1.5 rounded-full bg-sand" />
        <div className="absolute top-[26px] h-1.5 rounded-full bg-forest-100" style={{ left: pct(on[0]), width: `calc(${pct(on[1])} - ${pct(on[0])})` }} />
        <div className="absolute top-[14px] h-[30px] w-px bg-line" style={{ left: pct(half) }} />
        {actions.map(({ e, min }) => {
          const k = lane.get(min) ?? 0
          lane.set(min, k + 1)
          const up = k % 2 === 0
          const step = Math.floor(k / 2)
          return <span key={e.id} title={`${min}' ${t(`common:events.${e.code}`)}`} className="absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-2 ring-paper"
            style={{ left: pct(min - 0.5), top: up ? 12 - step * 9 : 36 + step * 9, background: KIND_COLOR[KIND_OF(e.code)] }} />
        })}
      </div>
      <div className="relative mt-0.5 h-4 text-[11px] tabular-nums text-ink-faint" aria-hidden="true">
        <span className="absolute left-0">0'</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(half) }}>{half}'</span>
        <span className="absolute right-0">{length}'</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-muted" aria-hidden="true">
        {(['ball', 'regain', 'shot', 'loss'] as Kind[]).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />{t(`perf.last.kind.${k}`)}</span>)}
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-forest-100" />{t('perf.last.onPitch')}</span>
      </div>
    </div>
  )
}
