import { useId } from 'react'
import { useT } from '../../../i18n'

/**
 * The "but du Njangi" (Tome 1, chapter 40): from the keeper, the ball goes through all eleven
 * players and BriBri serves Kaydoudou, who scores. Ten passes drawn once on page load.
 */
const W = 105, H = 68, S = 6 // px per metre
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
const STEP = 0.32 // seconds per pass

export default function HeroPitch({ className }: { className?: string }) {
  const { t } = useT('site')
  const id = useId().replace(/:/g, '')
  const segs = PATH.slice(0, -1).map((a, i) => {
    const p = TEAM[a], q = TEAM[PATH[i + 1]]
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy)
    const sh = 2.1 / d // shorten each end by about 2 m (the player disc)
    return { x1: (p.x + dx * sh) * S, y1: (p.y + dy * sh) * S, x2: (q.x - dx * sh) * S, y2: (q.y - dy * sh) * S, mx: ((p.x + q.x) / 2) * S, my: ((p.y + q.y) / 2) * S, len: (d - 4.2) * S }
  })
  const B = TEAM.b
  const shot = { x1: (B.x + 2.2) * S, y1: (B.y - 1.4) * S, x2: (W - 0.6) * S, y2: 36.4 * S }
  const shotLen = Math.hypot(shot.x2 - shot.x1, shot.y2 - shot.y1)
  const css = `
.hp-${id} .seg { stroke-dasharray: var(--l); stroke-dashoffset: var(--l); animation: hp-draw-${id} ${STEP}s ease-out forwards; animation-delay: var(--d) }
.hp-${id} .num, .hp-${id} .touch { opacity: 0; animation: hp-in-${id} .25s ease-out forwards; animation-delay: var(--d) }
.hp-${id} .net { opacity: 0; animation: hp-in-${id} .5s ease-out forwards; animation-delay: ${(segs.length + 1) * STEP + 0.3}s }
@keyframes hp-draw-${id} { to { stroke-dashoffset: 0 } }
@keyframes hp-in-${id} { to { opacity: 1 } }
@media (prefers-reduced-motion: reduce) {
  .hp-${id} .seg { animation: none; stroke-dashoffset: 0 }
  .hp-${id} .num, .hp-${id} .touch, .hp-${id} .net { animation: none; opacity: 1 }
}`
  const L = { stroke: '#FBF7EE', strokeOpacity: 0.28, strokeWidth: 1.6, fill: 'none' }
  return (
    <figure className={className}>
      <style>{css}</style>
      <svg viewBox={`-10 -10 ${W * S + 20} ${H * S + 20}`} className={`hp-${id} block h-auto w-full`} role="img" aria-label={t('landing.hero.pitchTitle')}>
        <defs>
          <pattern id={`mow-${id}`} width={W * S / 9} height={H * S} patternUnits="userSpaceOnUse">
            <rect width={W * S / 18} height={H * S} fill="#FBF7EE" fillOpacity="0.025" />
          </pattern>
          <marker id={`ah-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#F0C760" /></marker>
          <marker id={`ahs-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#E0A56B" /></marker>
        </defs>
        <rect x="0" y="0" width={W * S} height={H * S} fill={`url(#mow-${id})`} />
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
        <g fill="#FBF7EE" fillOpacity=".35"><circle cx={(W / 2) * S} cy={(H / 2) * S} r="3" /><circle cx={11 * S} cy={(H / 2) * S} r="2.5" /><circle cx={(W - 11) * S} cy={(H / 2) * S} r="2.5" /></g>
        {/* goals */}
        <rect x={-2.2 * S} y={30.34 * S} width={2.2 * S} height={7.32 * S} fill="none" stroke="#FBF7EE" strokeOpacity=".5" strokeWidth="2" />
        <rect className="net" x={W * S} y={30.34 * S} width={2.2 * S} height={7.32 * S} fill="#E3A92B" fillOpacity=".55" stroke="#F0C760" strokeWidth="2" />
        <rect x={W * S} y={30.34 * S} width={2.2 * S} height={7.32 * S} fill="none" stroke="#FBF7EE" strokeOpacity=".5" strokeWidth="2" />
        {/* opponents */}
        {THEM.map(([x, y], i) => <circle key={i} cx={x * S} cy={y * S} r="9" fill="#B8432F" fillOpacity=".55" stroke="#0B2116" strokeOpacity=".4" strokeWidth="1.5" />)}
        {/* the passes */}
        <g stroke="#F0C760" strokeWidth="3" strokeLinecap="round" fill="none">
          {segs.map((s, i) => (
            <line key={i} className="seg" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} markerEnd={`url(#ah-${id})`}
              style={{ ['--l' as string]: `${s.len.toFixed(1)}px`, ['--d' as string]: `${(0.5 + i * STEP).toFixed(2)}s` }} />
          ))}
          <line className="seg" x1={shot.x1} y1={shot.y1} x2={shot.x2} y2={shot.y2} stroke="#E0A56B" strokeWidth="3.4" strokeDasharray="none" markerEnd={`url(#ahs-${id})`}
            style={{ ['--l' as string]: `${shotLen.toFixed(1)}px`, ['--d' as string]: `${(0.5 + segs.length * STEP).toFixed(2)}s` }} />
        </g>
        {/* pass numbers */}
        {segs.map((s, i) => (
          <g key={i} className="num" style={{ ['--d' as string]: `${(0.5 + i * STEP + STEP * 0.6).toFixed(2)}s` }}>
            <circle cx={s.mx} cy={s.my} r="9.5" fill="#0B2116" stroke="#F0C760" strokeWidth="1.4" />
            <text x={s.mx} y={s.my + 3.6} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#F0C760" fontFamily="Inter, sans-serif">{i + 1}</text>
          </g>
        ))}
        {/* our eleven */}
        {PATH.map((k, i) => {
          const p = TEAM[k]
          return (
            <g key={k}>
              <circle className="touch" cx={p.x * S} cy={p.y * S} r="19" fill="none" stroke="#F0C760" strokeOpacity=".55" strokeWidth="2"
                style={{ ['--d' as string]: `${(0.5 + Math.max(0, i - 1) * STEP + (i ? STEP : 0)).toFixed(2)}s` }} />
              <circle cx={p.x * S} cy={p.y * S} r="13" fill={p.star ? '#F0C760' : '#FBF7EE'} stroke="#0B2116" strokeWidth="2" />
              <text x={p.x * S} y={p.y * S + 4.6} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#11301F" fontFamily="Inter, sans-serif">{p.n}</text>
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-3 text-sm text-cream/60">{t('landing.hero.pitchCaption')}</figcaption>
    </figure>
  )
}
