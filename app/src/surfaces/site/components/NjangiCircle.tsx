import { useId } from 'react'
import { useT } from '../../../i18n'

/**
 * The njangi as a picture: six players in a circle. The ball travels from one to the next
 * (each touch fills one part of the pot in the middle), then leaves for the goal.
 * Pure CSS animation; with prefers-reduced-motion the full, still picture is shown.
 */
const CX = 150, CY = 150, R = 96
const ANGLES = [-60, -120, 180, 120, 60, 0] // order of the touches (screen degrees)
const P = ANGLES.map((a) => [CX + R * Math.cos((a * Math.PI) / 180), CY + R * Math.sin((a * Math.PI) / 180)] as const)
const GOAL = [336, 150] as const
const DUR = 9 // seconds
// keyframe percentages: arrive at each player, hold, travel
const ARRIVE = [3, 17, 31, 45, 59, 73]
const HOLD = [10, 24, 38, 52, 66, 80]
const SHOT = 86
const r1 = (v: number) => Math.round(v * 10) / 10

function css(id: string) {
  const at = (p: readonly [number, number]) => `transform: translate(${r1(p[0])}px, ${r1(p[1])}px)`
  let ball = `@keyframes nj-ball-${id} {\n0% { ${at(P[0])}; opacity: 0 }\n`
  P.forEach((p, i) => { ball += `${ARRIVE[i]}% { ${at(p)}; opacity: 1 }\n${HOLD[i]}% { ${at(p)}; opacity: 1 }\n` })
  ball += `${SHOT}% { ${at(GOAL)}; opacity: 1 }\n92% { ${at(GOAL)}; opacity: 1 }\n96% { ${at(GOAL)}; opacity: 0 }\n100% { ${at(P[0])}; opacity: 0 } }\n`
  // each segment of the pot lights at its touch and stays lit until the shot
  let segs = ''
  ARRIVE.forEach((a, i) => {
    segs += `@keyframes nj-seg${i}-${id} { 0%, ${a - 0.5}% { opacity: .14 } ${a + 1}%, ${SHOT}% { opacity: 1 } ${SHOT + 4}%, 100% { opacity: .14 } }\n`
    segs += `.nj-${id} .seg${i} { animation: nj-seg${i}-${id} ${DUR}s linear infinite }\n`
    segs += `@keyframes nj-touch${i}-${id} { 0%, ${a - 1}% { transform: scale(1); opacity: 0 } ${a}% { transform: scale(1); opacity: .9 } ${a + 9}% { transform: scale(1.9); opacity: 0 } 100% { opacity: 0 } }\n`
    segs += `.nj-${id} .touch${i} { transform-box: fill-box; transform-origin: center; animation: nj-touch${i}-${id} ${DUR}s ease-out infinite }\n`
  })
  const goalFlash = `@keyframes nj-goal-${id} { 0%, ${SHOT - 1}% { opacity: 0 } ${SHOT}% { opacity: 1 } 95% { opacity: 1 } 99%, 100% { opacity: 0 } }\n.nj-${id} .goalflash { animation: nj-goal-${id} ${DUR}s linear infinite }\n`
  const potGlow = `@keyframes nj-pot-${id} { 0%, ${SHOT - 1}% { opacity: 0 } ${SHOT}% { opacity: .9 } 95% { opacity: 0 } 100% { opacity: 0 } }\n.nj-${id} .potglow { animation: nj-pot-${id} ${DUR}s ease-out infinite }\n`
  const ballRule = `.nj-${id} .ball { animation: nj-ball-${id} ${DUR}s ease-in-out infinite }\n`
  const reduced = `@media (prefers-reduced-motion: reduce) {
.nj-${id} .ball, .nj-${id} .goalflash, .nj-${id} .potglow, ${ARRIVE.map((_, i) => `.nj-${id} .seg${i}, .nj-${id} .touch${i}`).join(', ')} { animation: none !important }
.nj-${id} .ball { transform: translate(${r1(P[5][0])}px, ${r1(P[5][1])}px); opacity: 1 }
${ARRIVE.map((_, i) => `.nj-${id} .seg${i}`).join(', ')} { opacity: 1 }
.nj-${id} .touchring { opacity: 0 }
.nj-${id} .goalflash { opacity: 0 }
.nj-${id} .shotline { stroke-opacity: .9 }
}\n`
  return ball + segs + goalFlash + potGlow + ballRule + reduced
}

/** Arc between two angles on a circle, for one sixth of the pot. */
function arc(r: number, a0: number, a1: number) {
  const p = (a: number) => `${r1(CX + r * Math.cos((a * Math.PI) / 180))} ${r1(CY + r * Math.sin((a * Math.PI) / 180))}`
  return `M ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}`
}

export default function NjangiCircle({ className }: { className?: string }) {
  const { t } = useT('site')
  const id = useId().replace(/:/g, '')
  return (
    <figure className={className}>
      <style>{css(id)}</style>
      <svg viewBox="0 0 360 300" className={`nj-${id} block h-auto w-full`} role="img" aria-label={t('landing.njangi.figTitle')}>
        {/* ground */}
        <circle cx={CX} cy={CY} r={R + 34} fill="#ECEFE8" />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#D3DAD0" strokeWidth="1.5" strokeDasharray="3 6" />
        {/* the pass lines (the route of the pot) */}
        <g stroke="#0B5D3B" strokeOpacity=".28" strokeWidth="1.6" strokeDasharray="5 5" fill="none">
          {P.slice(0, 5).map((p, i) => <line key={i} x1={p[0]} y1={p[1]} x2={P[i + 1][0]} y2={P[i + 1][1]} />)}
        </g>
        <line className="shotline" x1={P[5][0] + 12} y1={P[5][1]} x2={GOAL[0] - 10} y2={GOAL[1]} stroke="#BF5A2E" strokeOpacity=".45" strokeWidth="2" strokeDasharray="6 5" />
        {/* the goal */}
        <g>
          <rect className="goalflash" x={GOAL[0] - 4} y={GOAL[1] - 30} width="22" height="60" rx="4" fill="#F5B700" opacity="0" />
          <path d={`M ${GOAL[0] + 14} ${GOAL[1] - 26} H ${GOAL[0]} V ${GOAL[1] + 26} H ${GOAL[0] + 14}`} fill="none" stroke="#12211A" strokeWidth="3" strokeLinejoin="round" />
          <g stroke="#12211A" strokeOpacity=".25" strokeWidth="1"><path d={`M ${GOAL[0] + 5} ${GOAL[1] - 26} V ${GOAL[1] + 26} M ${GOAL[0] + 10} ${GOAL[1] - 26} V ${GOAL[1] + 26} M ${GOAL[0]} ${GOAL[1] - 13} H ${GOAL[0] + 14} M ${GOAL[0]} ${GOAL[1]} H ${GOAL[0] + 14} M ${GOAL[0]} ${GOAL[1] + 13} H ${GOAL[0] + 14}`} /></g>
          <text x={GOAL[0] + 7} y={GOAL[1] + 46} textAnchor="middle" fontSize="11" fontWeight="600" fill="#5D6C63" fontFamily="'Archivo Variable', Archivo, sans-serif">{t('landing.njangi.goal')}</text>
        </g>
        {/* the pot in the middle: six parts, one per touch */}
        <circle className="potglow" cx={CX} cy={CY} r="46" fill="#F5B700" opacity="0" />
        <circle cx={CX} cy={CY} r="34" fill="#FFFFFF" stroke="#DCE2D8" />
        {ANGLES.map((a, i) => (
          <path key={i} className={`seg${i}`} d={arc(40, a - 27, a + 27)} stroke={['#0B5D3B', '#13804F', '#73B391', '#0B5D3B', '#13804F', '#F5B700'][i]} strokeWidth="9" strokeLinecap="round" fill="none" opacity=".14" />
        ))}
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize="13" fontStyle="italic" fontWeight="650" fill="#12211A" fontFamily="'Archivo Variable', Archivo, sans-serif">{t('landing.njangi.pot')}</text>
        {/* the six players */}
        {P.map((p, i) => (
          <g key={i}>
            <circle className={`touch${i} touchring`} cx={p[0]} cy={p[1]} r="15" fill="none" stroke="#F5B700" strokeWidth="3" opacity="0" />
            <circle cx={p[0]} cy={p[1]} r="15" fill="#0B5D3B" stroke="#F6F7F2" strokeWidth="2.5" />
            <text x={p[0]} y={p[1] + 4.5} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#F6F7F2" fontFamily="'Archivo Variable', Archivo, sans-serif">{i + 1}</text>
          </g>
        ))}
        {/* the ball */}
        <g className="ball" style={{ transform: `translate(${r1(P[5][0])}px, ${r1(P[5][1])}px)` }}>
          <g transform="translate(9 -12)">
            <circle r="7.5" fill="#FFFFFF" stroke="#12211A" strokeWidth="1.6" />
            <path d="M -2.6 -2.2 L 2.6 -2.2 L 3.8 2 L 0 4.4 L -3.8 2 Z" fill="#12211A" />
          </g>
        </g>
      </svg>
      <figcaption className="mt-3 text-center text-[13.5px] text-ink-muted">{t('landing.njangi.figCaption')}</figcaption>
    </figure>
  )
}
