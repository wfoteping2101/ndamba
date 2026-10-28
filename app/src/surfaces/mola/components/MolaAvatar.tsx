import { MolaAvatar as MolaBadge } from '../../../ui/brand'
import { cx } from '../../../lib/util'
import './mola.css'

/** Mola's face: the passing M on the green badge, with a slow ring that speeds up while Mola works. */
export default function MolaAvatar({ size = 36, busy = false, ring = true, className }: { size?: number; busy?: boolean; ring?: boolean; className?: string }) {
  return (
    <span className={cx('relative inline-grid shrink-0 place-items-center rounded-full', className)} style={{ width: size, height: size }} aria-hidden="true">
      {ring && <span className={cx('mola-ring', busy && 'mola-ring-busy')} />}
      <MolaBadge size={size} className="relative" />
    </span>
  )
}

/** The three dots. */
export function TypingDots({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 py-1" role="status" aria-label={label}>
      {[0, 1, 2].map((i) => <span key={i} className="mola-dot h-1.5 w-1.5 rounded-full bg-forest-500" style={{ animationDelay: `${i * 0.15}s` }} />)}
    </span>
  )
}
