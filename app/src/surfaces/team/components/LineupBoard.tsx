// LineupBoard: the match-day pitch with the starting players at their formation slots.
// Reusable by any surface:
//   import { LineupBoard } from '../team/components/LineupBoard'
//   <LineupBoard format={11} formation="4-3-3" lineup={match.lineup} players={players} captainId={match.captainId} />
// Pass onSlotClick to make the slots tappable (lineup editing). Without it the board is read-only.
import { Plus } from 'lucide-react'
import type { LineupSlot, Player } from '../../../lib/types'
import { formationSlots, type Slot } from '../../../lib/formations'
import { useT } from '../../../i18n'
import { cx } from '../../../lib/util'
import { shortName } from './lineup'

export interface LineupBoardProps {
  format: number
  formation: string
  lineup: LineupSlot[]
  players: Player[]
  captainId?: string
  /** Makes slots tappable. */
  onSlotClick?: (slotId: string) => void
  /** Highlights a slot (the one being edited). */
  activeSlot?: string
  /** vertical: own goal at the bottom, attacking up (best on phones). horizontal: attacking to the right. */
  orientation?: 'vertical' | 'horizontal'
  size?: 'sm' | 'md'
  className?: string
}

const L = 105, W = 68, PAD = 2.5 // metres; the goals sit inside the padding

/** Pitch markings in metres, for a pitch whose length runs along the y axis (vertical) or x axis (horizontal). */
function PitchLines({ orientation }: { orientation: 'vertical' | 'horizontal' }) {
  const v = orientation === 'vertical'
  const vb = v ? `${-PAD} ${-PAD} ${W + 2 * PAD} ${L + 2 * PAD}` : `${-PAD} ${-PAD} ${L + 2 * PAD} ${W + 2 * PAD}`
  // draw everything in vertical coordinates (x across, y along) and rotate for horizontal
  const stripes = Array.from({ length: 12 }, (_, i) => i)
  const sl = L / 12
  const line = 'rgba(251,247,238,0.55)'
  const box = (y0: number, dir: 1 | -1) => {
    const pa = 16.5, ga = 5.5, pw = 40.32, gw = 18.32, spot = 11
    const yPA = y0 + dir * pa, yGA = y0 + dir * ga, ySpot = y0 + dir * spot
    // penalty arc: radius 9.15 from the spot, outside the box
    const dy = pa - spot, dx = Math.sqrt(9.15 * 9.15 - dy * dy)
    const sweep = dir === 1 ? 0 : 1
    return (
      <g>
        <rect x={(W - pw) / 2} y={Math.min(y0, yPA)} width={pw} height={pa} />
        <rect x={(W - gw) / 2} y={Math.min(y0, yGA)} width={gw} height={ga} />
        <circle cx={W / 2} cy={ySpot} r={0.35} fill={line} stroke="none" />
        <path d={`M ${W / 2 - dx} ${yPA} A 9.15 9.15 0 0 ${sweep} ${W / 2 + dx} ${yPA}`} />
        <rect x={(W - 7.32) / 2} y={dir === 1 ? y0 - 1.8 : y0} width={7.32} height={1.8} fill="rgba(251,247,238,0.18)" />
      </g>
    )
  }
  const inner = (
    <>
      {stripes.map((i) => <rect key={i} x={0} y={i * sl} width={W} height={sl} fill={i % 2 ? '#1F4D3A' : '#245841'} stroke="none" />)}
      <g fill="none" stroke={line} strokeWidth={0.32}>
        <rect x={0} y={0} width={W} height={L} />
        <line x1={0} y1={L / 2} x2={W} y2={L / 2} />
        <circle cx={W / 2} cy={L / 2} r={9.15} />
        <circle cx={W / 2} cy={L / 2} r={0.4} fill={line} stroke="none" />
        {box(0, 1)}
        {box(L, -1)}
      </g>
    </>
  )
  return (
    <svg viewBox={vb} className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="none">
      <rect x={-PAD} y={-PAD} width={v ? W + 2 * PAD : L + 2 * PAD} height={v ? L + 2 * PAD : W + 2 * PAD} fill="#1C4635" />
      {v ? inner : <g transform={`translate(0 ${W}) rotate(-90)`}>{inner}</g>}
    </svg>
  )
}

/** Position of a slot on the board, in percent of the board box. */
export function slotPoint(s: Pick<Slot, 'x' | 'y'>, orientation: 'vertical' | 'horizontal') {
  const along = 6 + (s.x / 100) * (L - 10) // metres from our goal line, inset so the keeper's name stays on the pitch
  const across = (s.y / 100) * W // metres from the top touchline (our left when attacking up)
  if (orientation === 'vertical') return { left: ((across + PAD) / (W + 2 * PAD)) * 100, top: ((L - along + PAD) / (L + 2 * PAD)) * 100 }
  return { left: ((along + PAD) / (L + 2 * PAD)) * 100, top: ((across + PAD) / (W + 2 * PAD)) * 100 }
}

export function LineupBoard({ format, formation, lineup, players, captainId, onSlotClick, activeSlot, orientation = 'vertical', size = 'md', className }: LineupBoardProps) {
  const { t } = useT('team')
  const slots = formationSlots(format, formation)
  const byId = new Map(players.map((p) => [p.id, p]))
  const v = orientation === 'vertical'
  const disc = size === 'sm' ? 32 : 42
  return (
    <div
      className={cx('relative w-full select-none overflow-hidden rounded-[22px] shadow-card ring-1 ring-forest-900/20', className)}
      style={{ aspectRatio: v ? `${W + 2 * PAD} / ${L + 2 * PAD}` : `${L + 2 * PAD} / ${W + 2 * PAD}` }}
      role="group"
      aria-label={t('board.aria', { formation })}
    >
      <PitchLines orientation={orientation} />
      {slots.map((s) => {
        const pid = lineup.find((l) => l.slot === s.id)?.playerId
        const p = pid ? byId.get(pid) : undefined
        const pt = slotPoint(s, orientation)
        const gk = s.role === 'GK'
        const pos = t(`common:positions.${s.role}`)
        const active = activeSlot === s.id
        const body = (
          <>
            <span
              className={cx('relative flex items-center justify-center rounded-full font-display font-semibold tabular-nums transition',
                p ? (gk ? 'bg-sun-500 text-night-900' : 'bg-cream text-forest-700') : 'border-2 border-dashed border-cream/60 bg-forest-900/30 text-cream/85',
                p && 'shadow-[0_2px_6px_rgba(0,0,0,.35)]',
                active && 'ring-4 ring-terra-500 ring-offset-2 ring-offset-forest-700',
                onSlotClick && 'group-hover:scale-105')}
              style={{ width: disc, height: disc, fontSize: size === 'sm' ? 14 : 18 }}
            >
              {p ? (p.number ?? '') || shortName(p.name).slice(0, 2).toUpperCase() : (
                <span className="flex flex-col items-center leading-none">
                  {onSlotClick && <Plus size={size === 'sm' ? 12 : 14} strokeWidth={2.5} />}
                  <span className="font-sans text-[10px] font-bold">{t(`posShort.${s.role}`)}</span>
                </span>
              )}
              {p && captainId === p.id && (
                <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-terra-500 font-sans text-[10px] font-bold text-white ring-2 ring-forest-700" title={t('board.captain')}>C</span>
              )}
            </span>
            <span className={cx('mt-1 truncate rounded-md py-[1px] text-center font-semibold leading-tight',
              size === 'sm' ? 'max-w-[64px] px-1 text-[9.5px]' : 'max-w-[78px] px-1.5 text-[11px]', p ? 'bg-night-900/65 text-cream' : 'text-cream/70')}>
              {p ? shortName(p.name) : onSlotClick ? t('board.open') : '\u00a0'}
            </span>
          </>
        )
        const style = { left: `${pt.left}%`, top: `${pt.top}%`, transform: `translate(-50%, -${disc / 2}px)` }
        return onSlotClick ? (
          <button key={s.id} type="button" onClick={() => onSlotClick(s.id)} style={style}
            className="group absolute flex min-h-[44px] min-w-[44px] flex-col items-center rounded-xl focus-visible:outline-offset-4"
            aria-label={p ? t('board.slotFilled', { pos, name: p.name }) : t('board.slotEmpty', { pos })} aria-pressed={active}>
            {body}
          </button>
        ) : (
          <div key={s.id} style={style} className="absolute flex flex-col items-center" aria-label={p ? t('board.slotRead', { pos, name: p.name }) : pos}>
            {body}
          </div>
        )
      })}
    </div>
  )
}

export default LineupBoard
