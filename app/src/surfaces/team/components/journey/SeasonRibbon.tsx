// The season at a glance, drawn on the dark green plate: four lanes on one time axis
// (milestones and evaluations, matches, sessions, observations). Pure SVG, measured to its box.
import { useMemo } from 'react'
import { useT } from '../../../../i18n'
import { addDays, daysBetween, parseISODate, todayISO } from '../../../../lib/util'
import { attended, buildTimeline, obsTone, type JourneyData, type Season } from '../../../../lib/journey'
import { useWidth } from './bits'

const C = { cream: '#F6F7F2', faint: 'rgba(251,247,238,.16)', grid: 'rgba(251,247,238,.09)', sun: '#F5B700', sun3: '#FFD452', clay: '#E8798A', plus: '#CBE5D6', work: '#DB8D66' }

export function SeasonRibbon({ data, season }: { data: JourneyData; season: Season | null }) {
  const { t, lang } = useT('journey')
  const [ref, width] = useWidth<HTMLDivElement>()
  const today = todayISO()
  const items = useMemo(() => buildTimeline(data, season), [data, season])

  const domain = useMemo(() => {
    const dates = items.map((i) => i.date).sort()
    let start = season ? season.start : dates[0] ?? addDays(today, -60)
    let end = season ? (season.end > today ? addDays(today, 21) : season.end) : addDays(today, 21)
    if (season && end > season.end) end = season.end
    if (daysBetween(start, end) < 70) start = addDays(end, -70)
    return { start, end, days: Math.max(1, daysBetween(start, end)) }
  }, [items, season, today])

  const gutter = width >= 640 ? 92 : 0
  const pad = 8
  const H = 128
  const x = (d: string) => gutter + pad + (daysBetween(domain.start, d) / domain.days) * Math.max(1, width - gutter - 2 * pad)
  const lanes = { top: 18, match: 46, session: 74, obs: 98 }

  // month ticks
  const months = useMemo(() => {
    const out: { iso: string; label: string }[] = []
    const d = parseISODate(domain.start); d.setDate(1)
    const isoOf = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-01`
    if (isoOf(d) < domain.start) d.setMonth(d.getMonth() + 1)
    for (let guard = 0; guard < 36; guard++) {
      const iso = isoOf(d)
      if (iso > domain.end) break
      out.push({ iso, label: d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' }).replace('.', '') })
      d.setMonth(d.getMonth() + 1)
    }
    return out
  }, [domain, lang])

  const marks = data.registers.filter((s) => s.date >= domain.start && s.date <= domain.end)
  const markOf = new Map(data.attendance.map((a) => [a.sessionId, a.status]))
  const lines = data.lines.filter((l) => l.match.date >= domain.start && l.match.date <= domain.end)
  const maxMin = Math.max(1, ...lines.map((l) => 2 * l.match.halfMinutes))
  const obs = data.observations.filter((o) => o.date >= domain.start && o.date <= domain.end)
  const evals = data.evaluations.filter((e) => e.date >= domain.start && e.date <= domain.end)
  const stars = items.filter((i) => i.kind === 'milestone' || i.kind === 'derived')
  // observations on the same day stack upwards
  const obsStack = new Map<string, number>()

  const played = lines.filter((l) => l.minutes > 0).length
  const present = marks.filter((s) => attended(markOf.get(s.id))).length
  const aria = t('ribbon.aria', { sessions: present, marked: marks.length, matches: played, obs: obs.length, evals: evals.length })

  return (
    <figure className="relative">
      <div ref={ref} className="w-full">
        {width > 0 && (
          <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={aria} className="block">
            {gutter > 0 && (['top', 'match', 'session', 'obs'] as const).map((k) => (
              <text key={k} x={0} y={lanes[k] + 3.5} fontSize="11" fill="rgba(251,247,238,.62)" fontFamily="Inter, sans-serif" fontWeight={600}>{t(`ribbon.lane.${k}`)}</text>
            ))}
            {months.map((m) => (
              <g key={m.iso}>
                <line x1={x(m.iso)} x2={x(m.iso)} y1={4} y2={H - 16} stroke={C.grid} />
                <text x={x(m.iso) + 3} y={H - 3} fontSize="10.5" fill="rgba(251,247,238,.6)" fontFamily="Inter, sans-serif">{m.label}</text>
              </g>
            ))}
            {[lanes.match, lanes.session, lanes.obs].map((y) => <line key={y} x1={gutter + pad} x2={width - pad} y1={y} y2={y} stroke={C.faint} strokeWidth={1} />)}

            {/* sessions: one tick per register */}
            {marks.map((s) => {
              const st = markOf.get(s.id)
              const xx = x(s.date)
              if (!st) return <line key={s.id} x1={xx} x2={xx} y1={lanes.session - 2} y2={lanes.session + 2} stroke={C.faint} strokeWidth={2} />
              const color = st === 'present' ? C.cream : st === 'late' ? C.sun3 : st === 'absent' ? C.clay : 'rgba(251,247,238,.35)'
              const h = attended(st) ? 7 : 3
              return <line key={s.id} x1={xx} x2={xx} y1={lanes.session - h} y2={lanes.session + h} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
            })}

            {/* matches: circle size follows minutes, ring when the player stayed on the bench */}
            {lines.map((l) => {
              const xx = x(l.match.date)
              const r = l.minutes > 0 ? 3.5 + (l.minutes / maxMin) * 4 : 3.5
              return (
                <g key={l.match.id}>
                  <circle cx={xx} cy={lanes.match} r={r} fill={l.minutes > 0 ? C.cream : 'none'} stroke={C.cream} strokeWidth={1.5} />
                  {Array.from({ length: Math.min(3, l.counts.GOAL) }).map((_, i) => <circle key={i} cx={xx} cy={lanes.match - r - 4 - i * 5} r={2.2} fill={C.sun} />)}
                  {l.captain && l.minutes > 0 && <text x={xx} y={lanes.match + r + 10} textAnchor="middle" fontSize="8.5" fontWeight={700} fill={C.sun3} fontFamily="Inter, sans-serif">C</text>}
                </g>
              )
            })}

            {/* observations */}
            {obs.map((o) => {
              const n = obsStack.get(o.date) ?? 0
              obsStack.set(o.date, n + 1)
              const tone = obsTone(o)
              const color = tone === 'plus' ? C.plus : tone === 'work' ? C.work : tone === 'mixed' ? C.sun3 : C.faint
              return <circle key={o.id} cx={x(o.date)} cy={lanes.obs + 4 - Math.min(n, 3) * 5} r={2.4} fill={color} />
            })}

            {/* evaluations (diamonds) and milestones (stars) */}
            {evals.map((e) => { const xx = x(e.date), y = lanes.top; return <path key={e.id} d={`M${xx} ${y - 5}L${xx + 5} ${y}L${xx} ${y + 5}L${xx - 5} ${y}Z`} fill="none" stroke={C.sun3} strokeWidth={1.6} /> })}
            {stars.map((s) => <Star key={s.id} cx={x(s.date)} cy={lanes.top} />)}

            {today >= domain.start && today <= domain.end && (
              <g>
                <line x1={x(today)} x2={x(today)} y1={4} y2={H - 16} stroke={C.sun} strokeDasharray="3 3" strokeWidth={1.2} />
                <text x={Math.min(x(today) + 4, width - 70)} y={10} fontSize="10" fontWeight={700} fill={C.sun} fontFamily="Inter, sans-serif">{t('ribbon.today')}</text>
              </g>
            )}
          </svg>
        )}
      </div>
      {items.length === 0 && marks.length === 0 && <p className="-mt-[88px] mb-[52px] px-2 text-center text-[13px] text-cream/80 sm:px-24">{t('ribbon.empty')}</p>}
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-cream/75">
        <Key><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1L11 6L6 11L1 6Z" fill="none" stroke={C.sun3} strokeWidth="1.6" /></svg>{t('ribbon.key.eval')}</Key>
        <Key><svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden="true"><Star cx={0} cy={0} /></svg>{t('ribbon.key.milestone')}</Key>
        <Key><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill={C.cream} /></svg>{t('ribbon.key.match')}</Key>
        <Key><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="2.4" fill={C.sun} /></svg>{t('ribbon.key.goal')}</Key>
        <Key><svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true"><line x1="4" x2="4" y1="1" y2="11" stroke={C.cream} strokeWidth="2.2" strokeLinecap="round" /></svg>{t('ribbon.key.session')}</Key>
        <Key><svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true"><line x1="4" x2="4" y1="4" y2="8" stroke={C.clay} strokeWidth="2.2" strokeLinecap="round" /></svg>{t('ribbon.key.absent')}</Key>
        <Key><svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><circle cx="4" cy="6" r="2.4" fill={C.plus} /><circle cx="12" cy="6" r="2.4" fill={C.work} /></svg>{t('ribbon.key.obs')}</Key>
      </figcaption>
    </figure>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5">{children}</span>
}

function Star({ cx, cy }: { cx: number; cy: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 2.4 : 5.6
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
  return <polygon points={pts} fill={C.sun} />
}
