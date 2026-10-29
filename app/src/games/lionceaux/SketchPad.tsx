// BriBri's notebook page (chapter 5, the night he decides): a squared maths page, a line of three
// circles drawn across (the comb of defenders), a circle for him in front. The polite arrow draws
// itself along the line and loses itself at the edge of the page; the player draws the useful one,
// from his circle, between two circles without touching them, to the other side. The two words
// written on the page are the book's (« polie », « Utile. »).
import { useEffect, useRef, useState } from 'react'
import { useT } from '../../i18n'

import { H, LINE, ME, POLITE, R, USEFUL, W, isUseful, type P } from './sketch'

export function SketchPad({ phase, onDrawn }: { phase: 'polite' | 'draw' | 'arrow' | 'done'; onDrawn: (ok: boolean) => void }) {
  const { t } = useT('lionceaux')
  const svg = useRef<SVGSVGElement>(null)
  const [stroke, setStroke] = useState<P[] | null>(null)
  const [kept, setKept] = useState<P[] | null>(null)
  const [fading, setFading] = useState(false)
  const drawing = useRef(false)
  useEffect(() => { if (phase !== 'draw') drawing.current = false }, [phase])

  const toPage = (e: React.PointerEvent): P => {
    const r = svg.current!.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
  }
  const done = phase === 'done'
  const arrow = phase === 'arrow' || done
  const useful = kept ? 'M' + kept.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L') : USEFUL
  const end = kept ? kept[kept.length - 1] : ([30, 15] as P)

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center pt-[64px] sm:items-center sm:pt-0">
      <div className="pointer-events-auto w-[min(78vw,340px)] rotate-[-1.2deg] rounded-[6px] shadow-[0_18px_50px_rgba(0,0,0,0.45)]" style={{ background: '#f6f1e3' }}>
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full touch-none select-none" role="img" aria-label={t('sketch.label')}
          onPointerDown={(e) => { if (phase !== 'draw') return; (e.target as Element).setPointerCapture?.(e.pointerId); drawing.current = true; setFading(false); setStroke([toPage(e)]) }}
          onPointerMove={(e) => { if (!drawing.current) return; const p = toPage(e); setStroke((s) => (s && Math.hypot(p[0] - s[s.length - 1][0], p[1] - s[s.length - 1][1]) > 0.8 ? [...s, p] : s)) }}
          onPointerUp={() => {
            if (!drawing.current) return
            drawing.current = false
            const pts = stroke ?? []
            if (isUseful(pts)) { setKept(pts); setStroke(null); onDrawn(true) } else { setFading(true); onDrawn(false); window.setTimeout(() => { setStroke(null); setFading(false) }, 450) }
          }}>
          {/* the squares of a maths exercise book, and its red margin */}
          <defs>
            <pattern id="sq" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M4 0H0V4" fill="none" stroke="#9fb6d6" strokeWidth="0.18" /></pattern>
          </defs>
          <rect width={W} height={H} fill="url(#sq)" />
          <line x1="12" y1="0" x2="12" y2={H} stroke="#d77a7a" strokeWidth="0.35" />
          {/* pencil */}
          <g fill="none" stroke="#3b3a38" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
            {LINE.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={R} strokeDasharray={i === 1 ? '0' : undefined} />)}
            <circle cx={ME[0]} cy={ME[1]} r={6} />
            <path d={POLITE} pathLength={1} strokeDasharray="1" style={{ animation: 'sketch-draw 2.6s ease-in-out both' }} />
          </g>
          <text x="74" y="83" fontSize="6" fill="#3b3a38" fontStyle="italic" fontFamily="Archivo, system-ui, sans-serif" style={{ animation: 'sketch-word 0.8s 2.3s ease-out both' }}>polie</text>
          {stroke && <polyline points={stroke.map((p) => p.join(',')).join(' ')} fill="none" stroke="#1f1e1c" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.4s' }} />}
          {arrow && <path d={useful} fill="none" stroke="#1f1e1c" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset="0" style={{ animation: kept ? undefined : 'sketch-draw 1.1s ease-out both' }} />}
          {done && <text x={Math.min(84, end[0] + 4)} y={Math.max(10, end[1] + 2)} fontSize="8.5" fontWeight="700" fill="#141312" fontFamily="Archivo, system-ui, sans-serif" style={{ animation: 'sketch-word 0.5s 0.1s ease-out both' }}>Utile.</text>}
          {phase === 'draw' && !stroke && <circle cx={ME[0]} cy={ME[1]} r="9" fill="none" stroke="#F5B700" strokeWidth="0.8" style={{ animation: 'sketch-pulse 1.4s ease-in-out infinite' }} />}
        </svg>
      </div>
      <style>{`
        @keyframes sketch-draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
        @keyframes sketch-word { from { opacity: 0; transform: translateY(2px) } to { opacity: 1; transform: none } }
        @keyframes sketch-pulse { 0%, 100% { opacity: 0.25 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { svg * { animation: none !important; transition: none !important } }
      `}</style>
    </div>
  )
}
