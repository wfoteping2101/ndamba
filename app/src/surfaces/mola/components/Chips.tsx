import { useNavigate } from 'react-router-dom'
import { cx } from '../../../lib/util'
import { chipInfo } from '../store'

/** Suggestion chips: a sentence sent to Mola, or "@/route|Label" that opens a page (those sit on a green fill). */
export default function Chips({ chips, onSend, onNavigate, scroll = false, className, disabled }: {
  chips: string[]; onSend: (text: string) => void; onNavigate?: () => void; scroll?: boolean; className?: string; disabled?: boolean
}) {
  const nav = useNavigate()
  if (!chips.length) return null
  return (
    <div className={cx('flex gap-1.5', scroll ? 'mola-noscroll -mx-1 overflow-x-auto px-1 pb-0.5' : 'flex-wrap', className)}>
      {chips.map((c) => {
        const { label, route } = chipInfo(c)
        return (
          <button key={c} type="button" disabled={disabled}
            onClick={() => { if (route) { onNavigate?.(); if (/^\/(book|downloads)\//.test(route)) window.location.href = route; else nav(route) } else onSend(label) }}
            className={cx('inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-[13.5px] font-medium transition sm:min-h-[38px]',
              route ? 'border-forest-100 bg-forest-50 text-forest-700 hover:border-forest-300' : 'border-line bg-paper text-ink-soft hover:border-forest-300 hover:text-ink',
              disabled && 'opacity-60')}>
            {label}
          </button>
        )
      })}
    </div>
  )
}
