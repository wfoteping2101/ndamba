import { useEffect, useId, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useT } from '../../../i18n'
import { NdambaMark } from '../../../ui/brand'

/**
 * The "but du Njangi" (Tome 1, chapter 40): from the keeper, the ball goes through all eleven
 * players and BriBri serves Kaydoudou, who scores. The ball is the Ndamba mark itself: it travels
 * pass by pass and draws its trace in gold, then ends in the net. One orchestrated motion, once,
 * on page load (or on « Rejouer »). With prefers-reduced-motion the finished move is shown still.
 */
const W = 105, H = 68, S = 6 // pitch in metres, px per metre
type Pos = { n: string; x: number; y: number; star?: boolean }
const TEAM: Record<string, Pos> = {
  gk: { n: '1', x: 4.5, y: 34 },
  lcb: { n: '5', x: 18, y: 21 },
  rcb: { n: '4', x: 18, y: 47 },
  rb: { n: '2', x: 35, y: 60 },
  cm6: { n: '6', x: 46, y: 45 },
  cm10: { n: '10', x: 47, y: 23 },
  lb: { n: '3', x: 57, y: 7 },
  lw: { n: '11', x: 73, y: 12 },
  st: { n: '9', x: 82, y: 31 },
  k: { n: '8', x: 72, y: 43, star: true },
  b: { n: '7', x: 90, y: 50, star: true },
}
const PATH = ['gk', 'lcb', 'rcb', 'rb', 'cm6', 'cm10', 'lb', 'lw', 'st', 'k', 'b']
const THEM: [number, number][] = [[58, 30], [60, 44], [64, 20], [76, 24], [80, 40], [86, 18], [88, 56], [94, 36], [70, 54], [52, 14]]

const DELAY = 0.7 // s before the first pass
const STEP = 0.44 // s per pass
const TRAVEL = 0.35 // s the ball is in the air; the rest is the touch
const SHOT = 0.42
const TOTAL = DELAY + (PATH.length - 1) * STEP + SHOT + 0.4
const BALL = 30 // ball diameter in svg units
const GOLD = '#FFD452'
const CHALK = '#F6F7F2'
const r1 = (v: number) => Math.round(v * 10) / 10
const pct = (s: number) => `${r1((s / TOTAL) * 100)}%`

/** A point at `d` metres from p towards q (in svg units). */
function along(p: { x: number; y: number }, q: { x: number; y: number }, d: number) {
  const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy)
  return { x: (p.x + (dx / L) * d) * S, y: (p.y + (dy / L) * d) * S }
}

export default function HeroPitch({ className }: { className?: string }) {
  const { t } = useT('site')
  const id = useId().replace(/:/g, '')
  const [run, setRun] = useState(0)
  const [motion, setMotion] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    setMotion(!mq?.matches)
  }, [])

  const passes = PATH.slice(0, -1).map((a, i) => {
    const p = TEAM[a], q = TEAM[PATH[i + 1]]
    const from = along(p, q, 2.3), to = along(q, p, 2.3)
    const ballFrom = along(p, q, 3.2), ballTo = along(q, p, 3.4)
    return { from, to, ballFrom, ballTo, len: Math.hypot(to.x - from.x, to.y - from.y), start: DELAY + i * STEP }
  })
  const B = TEAM.b
  const goal = { x: (W + 1.05) * S, y: 33.6 * S }
  const shotFrom = along(B, { x: W, y: 33.6 }, 3.2)
  const shotStart = DELAY + passes.length * STEP
  const shotLen = Math.hypot(goal.x - shotFrom.x, goal.y - shotFrom.y)

  // the ball's route: hold at the keeper, then for each pass fly (TRAVEL) and take a touch, then the shot
  const at = (x: number, y: number) => `transform: translate(${r1(x)}px, ${r1(y)}px)`
  let frames = `0% { ${at(passes[0].ballFrom.x, passes[0].ballFrom.y)} }\n`
  passes.forEach((ps, i) => {
    frames += `${pct(ps.start)} { ${at(ps.ballFrom.x, ps.ballFrom.y)} }\n${pct(ps.start + TRAVEL)} { ${at(ps.ballTo.x, ps.ballTo.y)} }\n`
    if (i === passes.length - 1) frames += `${pct(shotStart)} { ${at(shotFrom.x, shotFrom.y)} }\n`
  })
  frames += `${pct(shotStart + SHOT)} { ${at(goal.x, goal.y)} }\n100% { ${at(goal.x, goal.y)} }`

  const k = `${id}-${run}`
  const css = `
@keyframes hp-ball-${k} { ${frames} }
@keyframes hp-draw-${k} { to { stroke-dashoffset: 0 } }
@keyframes hp-in-${k} { to { opacity: 1 } }
.hp-${k} .ball { animation: hp-ball-${k} ${TOTAL.toFixed(2)}s ease-out both }
.hp-${k} .seg { stroke-dasharray: var(--l); stroke-dashoffset: var(--l); animation: hp-draw-${k} var(--t) ease-out var(--d) forwards }
.hp-${k} .touch, .hp-${k} .net { opacity: 0; animation: hp-in-${k} .3s ease-out var(--d) forwards }
@media (prefers-reduced-motion: reduce) {
  .hp-${k} .ball { animation: none; ${at(goal.x, goal.y)} }
  .hp-${k} .seg { animation: none; stroke-dashoffset: 0 }
  .hp-${k} .touch, .hp-${k} .net { animation: none; opacity: 1 }
}`
  const L = { stroke: CHALK, strokeOpacity: 0.26, strokeWidth: 1.6, fill: 'none' }
  const num = { textAnchor: 'middle' as const, fontSize: 12.5, fontWeight: 700, fontFamily: "'Archivo Variable', Archivo, sans-serif" }
  return (
    <figure className={className}>
      <style>{css}</style>
      <svg key={run} viewBox={`-12 -12 ${W * S + 30} ${H * S + 24}`} className={`hp-${k} block h-auto w-full`} role="img" aria-label={t('landing.hero.pitchTitle')}>
        <defs>
          <pattern id={`mow-${k}`} width={(W * S) / 9} height={H * S} patternUnits="userSpaceOnUse">
            <rect width={(W * S) / 18} height={H * S} fill={CHALK} fillOpacity="0.03" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W * S} height={H * S} fill={`url(#mow-${k})`} />
        {/* markings */}
        <g {...L}>
          <rect x="0" y="0" width={W * S} height={H * S} rx="2" />
          <line x1={(W / 2) * S} y1="0" x2={(W / 2) * S} y2={H * S} />
          <circle cx={(W / 2) * S} cy={(H / 2) * S} r={9.15 * S} />
          <rect x="0" y={13.84 * S} width={16.5 * S} height={40.32 * S} />
          <rect x="0" y={24.84 * S} width={5.5 * S} height={18.32 * S} />
          <rect x={(W - 16.5) * S} y={13.84 * S} width={16.5 * S} height={40.32 * S} />
          <rect x={(W - 5.5) * S} y={24.84 * S} width={5.5 * S} height={18.32 * S} />
          <path d={`M ${16.5 * S} ${26.7 * S} A ${9.15 * S} ${9.15 * S} 0 0 1 ${16.5 * S} ${41.3 * S}`} />
          <path d={`M ${(W - 16.5) * S} ${26.7 * S} A ${9.15 * S} ${9.15 * S} 0 0 0 ${(W - 16.5) * S} ${41.3 * S}`} />
        </g>
        <g fill={CHALK} fillOpacity=".3"><circle cx={(W / 2) * S} cy={(H / 2) * S} r="3" /><circle cx={11 * S} cy={(H / 2) * S} r="2.5" /><circle cx={(W - 11) * S} cy={(H / 2) * S} r="2.5" /></g>
        {/* goals: the far net lights up when the ball arrives */}
        <rect x={-2.2 * S} y={30.34 * S} width={2.2 * S} height={7.32 * S} fill="none" stroke={CHALK} strokeOpacity=".45" strokeWidth="2" />
        <rect className="net" style={{ ['--d' as string]: `${(shotStart + SHOT - 0.05).toFixed(2)}s` }} x={W * S} y={30.34 * S} width={2.2 * S} height={7.32 * S} fill={GOLD} fillOpacity=".28" />
        <rect x={W * S} y={30.34 * S} width={2.2 * S} height={7.32 * S} fill="none" stroke={CHALK} strokeOpacity=".55" strokeWidth="2" />
        {/* the opponents: hollow, like cones on a tactics board */}
        {THEM.map(([x, y], i) => <circle key={i} cx={x * S} cy={y * S} r="8.5" fill="none" stroke={CHALK} strokeOpacity=".34" strokeWidth="1.6" />)}
        {/* the gold trace the ball leaves */}
        <g stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" fill="none">
          {passes.map((s, i) => (
            <line key={i} className="seg" x1={s.from.x} y1={s.from.y} x2={s.to.x} y2={s.to.y}
              style={{ ['--l' as string]: `${s.len.toFixed(1)}px`, ['--d' as string]: `${s.start.toFixed(2)}s`, ['--t' as string]: `${TRAVEL}s` }} />
          ))}
          <line className="seg" x1={shotFrom.x} y1={shotFrom.y} x2={goal.x - 6} y2={goal.y} strokeWidth="3.2" strokeDasharray="none"
            style={{ ['--l' as string]: `${shotLen.toFixed(1)}px`, ['--d' as string]: `${shotStart.toFixed(2)}s`, ['--t' as string]: `${SHOT}s` }} />
        </g>
        {/* arrowheads, shown once each pass has arrived */}
        <g fill={GOLD}>
          {passes.map((s, i) => {
            const a = (Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x) * 180) / Math.PI
            return <path key={i} className="touch" d="M -7 -4.6 L 1.5 0 L -7 4.6 Z" transform={`translate(${r1(s.to.x)} ${r1(s.to.y)}) rotate(${r1(a)})`}
              style={{ ['--d' as string]: `${(s.start + TRAVEL * 0.85).toFixed(2)}s` }} />
          })}
        </g>
        {/* our eleven */}
        {PATH.map((key, i) => {
          const p = TEAM[key]
          const touched = i === 0 ? DELAY - 0.2 : passes[i - 1].start + TRAVEL
          return (
            <g key={key}>
              <circle className="touch" cx={p.x * S} cy={p.y * S} r="18" fill="none" stroke={GOLD} strokeOpacity=".5" strokeWidth="1.6"
                style={{ ['--d' as string]: `${touched.toFixed(2)}s` }} />
              <circle cx={p.x * S} cy={p.y * S} r="13" fill={CHALK} stroke={p.star ? GOLD : '#042A1B'} strokeWidth={p.star ? 3 : 2} />
              <text x={p.x * S} y={p.y * S + 4.5} {...num} fill="#063A25">{p.n}</text>
            </g>
          )
        })}
        {/* the ball: the Ndamba mark */}
        <g className="ball" style={{ transform: `translate(${r1(goal.x)}px, ${r1(goal.y)}px)` }}>
          <g transform={`translate(${-BALL / 2} ${-BALL / 2})`}>
            <circle cx={BALL / 2} cy={BALL / 2 + 1.5} r={BALL / 2} fill="#021A10" fillOpacity=".35" />
            <NdambaMark size={BALL} tone="light" />
          </g>
        </g>
      </svg>
      <figcaption className="mt-3 flex items-start justify-between gap-4">
        <span className="text-[13.5px] leading-snug text-cream/60">{t('landing.hero.pitchCaption')}</span>
        {motion && (
          <button type="button" onClick={() => setRun((r) => r + 1)}
            className="-mr-2 -mt-2 inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-semibold text-cream/70 transition-colors hover:bg-white/[0.07] hover:text-cream">
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />{t('landing.hero.replay')}
          </button>
        )}
      </figcaption>
    </figure>
  )
}
