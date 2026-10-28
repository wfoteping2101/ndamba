import { useId } from 'react'
import { cx } from '../../../lib/util'

/** A thin wax-print (pagne) band: the signature strip of Njangi. Decorative. */
export default function PagneBand({ height = 12, className }: { height?: number; className?: string }) {
  const id = useId().replace(/:/g, '')
  const h = height
  const u = h * 4 // unit width
  return (
    <svg className={cx('block w-full', className)} height={h} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`pg-${id}`} width={u * 2} height={h} patternUnits="userSpaceOnUse">
          <rect width={u * 0.5} height={h} fill="#C5762F" />
          <rect x={u * 0.5} width={u * 0.5} height={h} fill="#1F4D3A" />
          <polygon points={`${u * 0.75},${h * 0.12} ${u * 0.97},${h / 2} ${u * 0.75},${h * 0.88} ${u * 0.53},${h / 2}`} fill="#E3A92B" />
          <rect x={u} width={u * 0.25} height={h} fill="#B8432F" />
          <rect x={u * 1.25} width={u * 0.5} height={h} fill="#E3A92B" />
          <polygon points={`${u * 1.25},${h} ${u * 1.5},0 ${u * 1.75},${h}`} fill="#C5762F" opacity="0.55" />
          <rect x={u * 1.75} width={u * 0.25} height={h} fill="#FBF7EE" />
        </pattern>
      </defs>
      <rect width="100%" height={h} fill={`url(#pg-${id})`} />
    </svg>
  )
}
