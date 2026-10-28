import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { cx } from '../../../lib/util'
import { chipInfo } from '../store'

/** Suggestion chips: a sentence sent to Mola, or "@/route|Label" that opens a page. */
export default function Chips({ chips, onSend, onNavigate, scroll = false, className, disabled }: {
  chips: string[]; onSend: (text: string) => void; onNavigate?: () => void; scroll?: boolean; className?: string; disabled?: boolean
}) {
  const nav = useNavigate()
  if (!chips.length) return null
  return (
    <div className={cx('flex gap-2', scroll ? 'mola-noscroll -mx-1 overflow-x-auto px-1 pb-0.5' : 'flex-wrap', className)}>
      {chips.map((c) => {
        const { label, route } = chipInfo(c)
        return (
          <button key={c} type="button" disabled={disabled}
            onClick={() => { if (route) { onNavigate?.(); if (/^\/(book|downloads)\//.test(route)) window.location.href = route; else nav(route) } else onSend(label) }}
            className={cx('inline-flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition sm:min-h-[36px]',
              route ? 'border-forest-300 bg-forest-50 text-forest-700 hover:bg-forest-100' : 'border-line bg-paper text-ink-soft hover:border-forest-300 hover:text-forest-700',
              disabled && 'opacity-60')}>
            {label}{route && <ArrowUpRight size={14} aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
