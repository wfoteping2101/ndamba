// « Mon dernier match »: the team's Indice Njangi, my share in it (from the actions tagged to me),
// my tagged actions minute by minute, and the videos of my matches.
import { Link } from 'react-router-dom'
import { ChartLine, Clapperboard, Radio } from 'lucide-react'
import { useT } from '../../../../i18n'
import { fmtNjangi, njangiLabel, rankSubs } from '../../../../lib/njangi'
import { cx, fmtDate } from '../../../../lib/util'
import type { EventCode } from '../../../../lib/types'
import { fmtPct } from '../../../team/components/journey/bits'
import { eventMinute, type PerfData } from './data'
import { Figure, PerfHead, SubBars } from './bits'

/** The actions worth listing (passes are counted, not listed). */
const LISTED: EventCode[] = ['GOAL', 'SHOT_IN', 'SHOT', 'BOX', 'FINAL3', 'LINE', 'PROG', 'FIX2', 'SWITCH', 'REGAIN5', 'REGAIN', 'LOSS']
const CODE_TONE: Partial<Record<EventCode, string>> = { GOAL: 'bg-sun-500 text-ink', SHOT_IN: 'bg-night-800 text-cream', SHOT: 'bg-sand text-ink', LOSS: 'bg-paper text-ink-muted ring-1 ring-line', REGAIN5: 'bg-forest-600 text-cream', REGAIN: 'bg-forest-50 text-forest-700' }

export function LastMatchCard({ d, full = false }: { d: PerfData; full?: boolean }) {
  const { t, lang } = useT('player')
  const last = d.last
  if (!last) {
    return (
      <section className="h-full rounded-[22px] border border-line bg-paper p-5 sm:p-6" aria-labelledby="lm-h">
        <PerfHead id="lm-h" eyebrow={t('perf.last.eyebrow')} title={t('perf.last.emptyTitle')} hint={t('perf.last.emptyBody')} />
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
    <section className="flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-paper" aria-labelledby="lm-h">
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <PerfHead id="lm-h" eyebrow={t('perf.last.eyebrow')}
          title={t('perf.last.title', { opponent: m.opponent })}
          hint={<><span className={cx('mr-2 inline-flex rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold tabular-nums', result3 === 'win' ? 'bg-forest-600 text-cream' : 'bg-sand text-ink-soft')}>{t(`perf.last.result.${result3}`)} {m.scoreUs}-{m.scoreThem}</span>{[fmtDate(m.date, lang, { day: 'numeric', month: 'long' }), m.home ? t('match.home').toLowerCase() : t('match.away').toLowerCase(), m.competition].filter(Boolean).join(', ')}</>} />
      </div>

      <div className={cx('grid grid-cols-1 gap-7 px-5 pb-5 sm:px-6', full ? 'lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]' : 'md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]')}>
        <div className="min-w-0">
          {result ? (
            <>
              <div className="text-[13px] font-semibold text-ink-muted">{t('perf.last.teamIndice')}</div>
              <div className="mt-1 flex items-end gap-2">
                <span className="font-display text-[56px] leading-[0.9] tabular-nums text-forest-600">{fmtNjangi(result.total, lang)}</span>
                <span className="pb-1 text-[14px] font-semibold text-ink-faint">/ 100</span>
              </div>
              <div className="mb-4 mt-2 text-[14.5px] font-semibold text-ink">{njangiLabel(result.total, lang)}</div>
              <SubBars sub={result.sub} weakest={weakest} />
            </>
          ) : (
            <p className="text-[14.5px] leading-relaxed text-ink-muted">{t('perf.last.untagged')}</p>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-3 text-[13px] font-semibold text-ink-muted">{t('perf.last.myPart')}</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
            <Figure label={t('perf.last.minutes')} value={`${line.minutes}'`} sub={line.starter ? t('perf.last.started') : t('perf.last.cameOn')} />
            <Figure label={t('journey:perf.passAcc')} value={passes ? fmtPct(c.PASS_OK / passes, lang) : null} sub={passes ? t('journey:perf.passesVal', { ok: c.PASS_OK, n: passes }) : undefined} />
            <Figure label={t('perf.last.progressive')} value={prog} sub={progShare !== null ? t('perf.last.shareOfTeam', { v: fmtPct(progShare, lang) }) : undefined} tone="forest" />
            <Figure label={t('journey:perf.regain5')} value={reg} sub={regShare !== null ? t('perf.last.shareOfTeam', { v: fmtPct(regShare, lang) }) : undefined} tone="forest" />
            {full && <Figure label={t('perf.last.entries')} value={c.FINAL3 + c.BOX} sub={t('perf.last.boxEntries', { count: c.BOX })} />}
            {full && <Figure label={t('perf.last.shots')} value={c.SHOT} sub={c.GOAL ? t('perf.last.goals', { count: c.GOAL }) : t('perf.last.onTarget', { count: c.SHOT_IN })} />}
          </dl>
          {line.tagged && !full && (
            <div className="mt-6">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink-muted">{t('perf.last.actions')}</span>
                {!full && actions.length > shown.length && <span className="text-[12.5px] text-ink-muted">{t('perf.last.more', { count: actions.length - shown.length })}</span>}
              </div>
              {shown.length === 0 ? <p className="text-[14px] text-ink-muted">{t('perf.last.noActions')}</p> : (
                <ol className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {shown.map(({ e, min }) => (
                    <li key={e.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1">
                      <span className="w-9 shrink-0 text-right text-[14px] font-semibold tabular-nums text-ink-soft">{min}'</span>
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
        <div className="border-t border-line px-5 py-5 sm:px-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[17px] leading-tight text-ink">{t('perf.last.actions')}</h3>
            <span className="text-[13px] text-ink-muted">{t('perf.last.actionsCount', { count: actions.length })}</span>
          </div>
          {actions.length === 0 ? <p className="text-[13px] text-ink-muted">{t('perf.last.noActions')}</p> : (
            <>
              <ActionTrack actions={actions} length={2 * m.halfMinutes} half={m.halfMinutes} minutes={line.minutes} starter={line.starter} />
              <ol className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
                {actions.map(({ e, min }) => (
                  <li key={e.id} className="flex min-w-0 items-center gap-2 py-0.5">
                    <span className="w-8 shrink-0 text-right text-[13.5px] font-semibold tabular-nums text-ink-soft">{min}'</span>
                    <span className={cx('truncate rounded-full px-2 py-0.5 text-[12px] font-semibold', CODE_TONE[e.code] ?? 'bg-forest-50 text-forest-700')}>{t(`common:events.${e.code}`)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line bg-cream/60 px-5 py-3.5 sm:px-6">
        {result && <Link to={`/app/analyse/rapport/${m.id}`} className="btn-primary btn-sm min-h-[44px] px-4"><ChartLine size={16} strokeWidth={1.75} aria-hidden="true" />{t('perf.last.report')}</Link>}
        {videos.map((v) => <Link key={v.id} to={`/app/analyse/video/${v.id}`} className="btn-outline btn-sm min-h-[44px]"><Clapperboard size={16} aria-hidden="true" /><span className="max-w-[180px] truncate">{v.title}</span></Link>)}
        {videos.length === 0 && <Link to="/app/analyse/video" className="btn-ghost btn-sm min-h-[44px] px-3 text-forest-700"><Clapperboard size={15} strokeWidth={1.75} aria-hidden="true" />{t('perf.last.addVideo')}</Link>}
        {!result && <Link to="/app/analyse" className="btn-ghost btn-sm min-h-[44px] px-3 text-forest-700"><Radio size={15} strokeWidth={1.75} aria-hidden="true" />{t('perf.last.analysis')}</Link>}
      </div>
    </section>
  )
}

/* ---------------- the match as one line: my actions minute by minute ---------------- */

type Kind = 'ball' | 'regain' | 'shot' | 'loss'
const KIND_OF = (c: EventCode): Kind => (c === 'REGAIN5' || c === 'REGAIN' ? 'regain' : c === 'SHOT' || c === 'SHOT_IN' || c === 'GOAL' ? 'shot' : c === 'LOSS' ? 'loss' : 'ball')
const KIND_COLOR: Record<Kind, string> = { ball: '#0B5D3B', regain: '#73B391', shot: '#F5B700', loss: '#94A198' }

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
      <div className="relative mt-0.5 h-4 text-[12px] tabular-nums text-ink-muted" aria-hidden="true">
        <span className="absolute left-0">0'</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(half) }}>{half}'</span>
        <span className="absolute right-0">{length}'</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink-muted" aria-hidden="true">
        {(['ball', 'regain', 'shot', 'loss'] as Kind[]).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />{t(`perf.last.kind.${k}`)}</span>)}
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-forest-100" />{t('perf.last.onPitch')}</span>
      </div>
    </div>
  )
}
