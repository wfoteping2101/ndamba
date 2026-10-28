import { MolaAvatar as MolaBadge } from '../../../ui/brand'
import { cx } from '../../../lib/util'
import './mola.css'

/** Mola's face: the passing M on the green badge. A gold hairline at rest; the arc turns while Mola works. */
export default function MolaAvatar({ size = 36, busy = false, ring = true, className }: { size?: number; busy?: boolean; ring?: boolean; className?: string }) {
  return (
    <span className={cx('relative inline-grid shrink-0 place-items-center rounded-full', className)} style={{ width: size, height: size }} aria-hidden="true">
      {(ring || busy) && <span className={cx('mola-ring', busy && 'mola-ring-busy')} />}
      <MolaBadge size={size} className="relative" />
    </span>
  )
}

/** While Mola writes: a quiet line of text (the ring around the badge carries the motion). */
export function TypingDots({ label }: { label: string }) {
  return <span className="text-[14px] italic text-ink-muted" role="status">{label}</span>
}
