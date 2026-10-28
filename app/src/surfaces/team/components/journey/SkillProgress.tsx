// Progression per competence over time: ten small step charts and, for the one picked, a larger chart
// with the observations as evidence and the next step of the chapter 25 grid.
import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, LineChart } from 'lucide-react'
import { useT } from '../../../../i18n'
import { addDays, cx, daysBetween, fmtDate, todayISO } from '../../../../lib/util'
import { levelsAt, obsSkillTones, SKILL_KEYS, type JourneyData, type Level, type Season } from '../../../../lib/journey'
import type { SkillKey } from '../../../../lib/types'
import { CardHead, useWidth } from './bits'

interface Pt { date: string; level: Level }

function seriesIn(data: JourneyData, skill: SkillKey, start: string, end: string): Pt[] {
  const pts: Pt[] = []
  const carried = levelsAt(data.evaluations, addDays(start, -1))[skill]
  if (carried) pts.push({ date: start, level: carried })
  for (const e of data.evaluations) {
    const v = e.skills[skill]
    if (!v || e.date < start || e.date > end) continue
    if (pts.length && pts[pts.length - 1].date === e.date) pts[pts.length - 1] = { date: e.date, level: v }
    else pts.push({ date: e.date, level: v })
  }
  return pts
}

function stepPath(pts: Pt[], x: (d: string) => number, y: (l: number) => number, end: string) {
  if (!pts.length) return ''
  let d = `M${x(pts[0].date).toFixed(1)} ${y(pts[0].level).toFixed(1)}`
  for (let i = 1; i < pts.length; i++) d += `H${x(pts[i].date).toFixed(1)}V${y(pts[i].level).toFixed(1)}`
  d += `H${x(end).toFixed(1)}`
  return d
}

export function SkillProgress({ data, season, viewer }: { data: JourneyData; season: Season | null; viewer: 'coach' | 'player' }) {
  const { t, lang } = useT('journey')
  const today = todayISO()
  const domain = useMemo(() => {
    const first = data.evaluations[0]?.date ?? today
    const start = season ? season.start : first
    const end = season && season.end < today ? season.end : today
    return { start: start > end ? addDays(end, -30) : start, end }
  }, [data.evaluations, season, today])
  const series = useMemo(() => Object.fromEntries(SKILL_KEYS.map((k) => [k, seriesIn(data, k, domain.start, domain.end)])) as Record<SkillKey, Pt[]>, [data, domain])
  const evidence = useMemo(() => {
    const out: Record<string, { date: string; tone: 'plus' | 'work' }[]> = {}
    for (const o of data.observations) {
      if (o.date < domain.start || o.date > domain.end) continue
      for (const [k, tone] of obsSkillTones(o)) (out[k] ??= []).push({ date: o.date, tone })
    }
    return out
  }, [data.observations, domain])
  const rated = SKILL_KEYS.filter((k) => series[k].length)
  const [pick, setPick] = useState<SkillKey | null>(null)
  const sel = pick ?? rated[0] ?? null

  if (!data.evaluations.length) {
    return (
      <section className="card card-pad" aria-labelledby="sp-h">
        <CardHead id="sp-h" icon={<LineChart size={18} className="text-forest-600" />} title={t('skills.title')} />
        <p className="rounded-xl bg-sand/60 px-3 py-3 text-sm text-ink-muted">{viewer === 'coach' ? t('skills.emptyCoach') : t('skills.emptyPlayer')}</p>
      </section>
    )
  }

  return (
    <section className="card card-pad" aria-labelledby="sp-h">
      <CardHead id="sp-h" icon={<LineChart size={18} className="text-forest-600" />} title={t('skills.title')}
        hint={t('skills.hint', { from: fmtDate(domain.start, lang, { day: 'numeric', month: 'long', year: 'numeric' }).replace(/^1 /, lang === 'fr' ? '1er ' : '1 ') })} />
      {sel && <Detail skill={sel} pts={series[sel]} evidence={evidence[sel] ?? []} domain={domain} />}
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-5">
        {SKILL_KEYS.map((k) => {
          const pts = series[k]
          const now = pts[pts.length - 1]?.level
          const start = pts[0]?.level
          const delta = now && start ? now - start : 0
          const ev = evidence[k] ?? []
          return (
            <li key={k}>
              <button type="button" onClick={() => setPick(k)} aria-pressed={sel === k} disabled={!pts.length}
                className={cx('flex h-full min-h-[96px] w-full flex-col rounded-xl border p-2.5 text-left transition', sel === k ? 'border-forest-600 bg-forest-50/70 ring-1 ring-forest-600' : 'border-line bg-paper hover:border-forest-300', !pts.length && 'opacity-60')}>
                <span className="flex items-baseline justify-between gap-1">
                  <span className="truncate text-[12.5px] font-semibold text-ink">{t(`team:skillsShort.${k}`)}</span>
                  <span className="font-display text-lg font-semibold leading-none text-forest-700">{now ?? '·'}</span>
                </span>
                <Spark pts={pts} domain={domain} />
                <span className="mt-auto flex items-center gap-2 text-[11px] font-semibold tabular-nums">
                  {delta > 0 && <span className="inline-flex items-center text-forest-700"><ArrowUpRight size={13} aria-hidden="true" />{t('skills.up', { n: delta })}</span>}
                  {delta < 0 && <span className="inline-flex items-center text-terra-700"><ArrowDownRight size={13} aria-hidden="true" />{t('skills.down', { n: -delta })}</span>}
                  {delta === 0 && pts.length > 0 && <span className="text-ink-faint">{t('skills.same')}</span>}
                  <span className="ml-auto flex items-center gap-1.5 text-ink-muted">
                    {ev.some((e) => e.tone === 'plus') && <span className="inline-flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-forest-500" />{ev.filter((e) => e.tone === 'plus').length}<span className="sr-only">{t('tone.plus')}</span></span>}
                    {ev.some((e) => e.tone === 'work') && <span className="inline-flex items-center gap-0.5"><span className="h-1.5 w-1.5 rounded-full bg-terra-500" />{ev.filter((e) => e.tone === 'work').length}<span className="sr-only">{t('tone.work')}</span></span>}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Spark({ pts, domain }: { pts: Pt[]; domain: { start: string; end: string } }) {
  const W = 120, H = 34
  const days = Math.max(1, daysBetween(domain.start, domain.end))
  const x = (d: string) => 3 + (daysBetween(domain.start, d) / days) * (W - 6)
  const y = (l: number) => H - 4 - ((l - 1) / 3) * (H - 8)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="my-1.5 h-[34px] w-full" preserveAspectRatio="none" aria-hidden="true">
      {[1, 2, 3, 4].map((l) => <line key={l} x1={0} x2={W} y1={y(l)} y2={y(l)} stroke="#EFE7D6" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
      {pts.length > 0 && <path d={stepPath(pts, x, y, domain.end)} fill="none" stroke="#1F4D3A" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
    </svg>
  )
}

function Detail({ skill, pts, evidence, domain }: { skill: SkillKey; pts: Pt[]; evidence: { date: string; tone: 'plus' | 'work' }[]; domain: { start: string; end: string } }) {
  const { t, lang } = useT('journey')
  const [box, bw] = useWidth<HTMLDivElement>()
  const W = Math.max(260, bw), H = W < 480 ? 180 : 200, L = 26, R = 10, T = 12, B = 54
  const days = Math.max(1, daysBetween(domain.start, domain.end))
  const x = (d: string) => L + (daysBetween(domain.start, d) / days) * (W - L - R)
  const y = (l: number) => T + (4 - l) * ((H - T - B) / 3)
  const now = pts[pts.length - 1]?.level
  const months = useMemo(() => {
    const out: string[] = []
    let d = domain.start.slice(0, 8) + '01'
    if (d < domain.start) d = addDays(d, 32).slice(0, 8) + '01'
    for (let i = 0; d <= domain.end && i < 40; i++) { out.push(d); d = addDays(d, 32).slice(0, 8) + '01' }
    const step = Math.ceil(out.length / (W < 480 ? 4 : 7))
    return out.filter((_, i) => i % step === 0)
  }, [domain, W])
  const plus = evidence.filter((e) => e.tone === 'plus'), work = evidence.filter((e) => e.tone === 'work')
  const stack = (list: typeof evidence) => { const m = new Map<string, number>(); return list.map((e) => { const n = m.get(e.date) ?? 0; m.set(e.date, n + 1); return { ...e, n } }) }
  const label = pts.map((p) => `${fmtDate(p.date, lang, { day: 'numeric', month: 'short' })} ${p.level}`).join(', ')
  return (
    <div className="rounded-2xl border border-line bg-cream/50 p-3 sm:p-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[17px] font-semibold text-ink">{t(`common:skills.${skill}`)}</h3>
        {now && <span className="text-[13px] font-semibold text-forest-700">{t('skills.levelNow', { n: now, name: t(`team:levels.${now}`) })}</span>}
      </div>
      <div ref={box} className="w-full">
      {bw > 0 && <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={t('skills.chartAria', { skill: t(`common:skills.${skill}`), points: label, plus: plus.length, work: work.length })}>
        {[1, 2, 3, 4].map((l) => (
          <g key={l}>
            <line x1={L} x2={W - R} y1={y(l)} y2={y(l)} stroke="#E6DDCB" strokeDasharray={l === 4 ? undefined : '3 4'} />
            <text x={L - 8} y={y(l) + 4} textAnchor="end" fontSize="12" fontWeight={700} fill="#66706A" fontFamily="Inter, sans-serif">{l}</text>
          </g>
        ))}
        {months.map((m) => (
          <g key={m}>
            <line x1={x(m)} x2={x(m)} y1={T} y2={H - B + 6} stroke="#EFE7D6" />
            <text x={x(m) + 3} y={H - B + 18} fontSize="11" fill="#9AA39D" fontFamily="Inter, sans-serif">{fmtDate(m, lang, { month: 'short' }).replace('.', '')}</text>
          </g>
        ))}
        {pts.length > 0 && <path d={stepPath(pts, x, y, domain.end)} fill="none" stroke="#1F4D3A" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />}
        {pts.map((p, i) => <circle key={i} cx={x(p.date)} cy={y(p.level)} r={4.5} fill="#FFFDF8" stroke="#1F4D3A" strokeWidth={2.4} />)}
        {/* evidence lanes: strengths seen, then things to work on */}
        <text x={L - 8} y={H - 18} textAnchor="end" fontSize="13" fontWeight={700} fill="#2F6B52" fontFamily="Inter, sans-serif">+</text>
        <text x={L - 8} y={H - 4} textAnchor="end" fontSize="13" fontWeight={700} fill="#A86020" fontFamily="Inter, sans-serif">·</text>
        {stack(plus).map((e, i) => <circle key={`p${i}`} cx={x(e.date) + e.n * 7} cy={H - 22} r={3.6} fill="#2F6B52" />)}
        {stack(work).map((e, i) => <circle key={`w${i}`} cx={x(e.date) + e.n * 7} cy={H - 8} r={3.6} fill="#C5762F" />)}
      </svg>}
      </div>
      <dl className="mt-2 grid gap-2 text-[13px] leading-snug sm:grid-cols-2">
        {now && <div className="rounded-xl bg-paper px-3 py-2"><dt className="text-[11.5px] font-semibold text-ink-muted">{t('skills.seenNow')}</dt><dd className="text-ink-soft">{t(`team:skillDesc.${skill}.${now}`)}</dd></div>}
        {now && now < 4 && <div className="rounded-xl bg-forest-50 px-3 py-2"><dt className="text-[11.5px] font-semibold text-forest-700">{t('skills.nextStep', { n: now + 1 })}</dt><dd className="text-ink-soft">{t(`team:skillDesc.${skill}.${now + 1}`)}</dd></div>}
        {now === 4 && <div className="rounded-xl bg-sun-50 px-3 py-2"><dt className="text-[11.5px] font-semibold text-sun-700">{t('skills.top')}</dt><dd className="text-ink-soft">{t('skills.topBody')}</dd></div>}
      </dl>
      <p className="mt-2 text-[11.5px] text-ink-faint">{t('skills.evidenceNote', { plus: plus.length, work: work.length })}</p>
    </div>
  )
}
