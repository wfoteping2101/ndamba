// The highlight clips of a recruitment profile: one player, and the list of clips to pick from.
import { useState } from 'react'
import { Play } from 'lucide-react'
import { useT } from '../../../i18n'
import type { Clip, VideoProject } from '../../../lib/types'
import { cx, fmtClock } from '../../../lib/util'
import { ClipPlayer, clipPlayable } from './ClipPlayer'

export function HighlightReel({ items, dark = false }: { items: { video: VideoProject; clip: Clip }[]; dark?: boolean }) {
  const { t } = useT('club')
  const [i, setI] = useState(0)
  const [started, setStarted] = useState(false)
  if (!items.length) return null
  const cur = items[Math.min(i, items.length - 1)]
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div>
        <ClipPlayer video={cur.video} clip={cur.clip} autoPlay={started} />
        <p className={cx('mt-2 text-[15px] font-semibold', dark ? 'text-cream' : 'text-ink')}>{cur.clip.title}</p>
        {cur.clip.note && <p className={cx('mt-0.5 text-[14px] leading-relaxed', dark ? 'text-cream/70' : 'text-ink-muted')}>{cur.clip.note}</p>}
      </div>
      <ol className="space-y-1.5" aria-label={t('clip.list')}>
        {items.map((it, k) => (
          <li key={`${it.video.id}:${it.clip.id}`}>
            <button type="button" onClick={() => { setI(k); setStarted(true) }} aria-current={k === i ? 'true' : undefined}
              className={cx('flex min-h-[52px] w-full items-center gap-3 rounded-control border px-3 py-2 text-left transition-colors', k === i ? 'border-forest-600 bg-forest-50' : 'border-line bg-paper hover:border-ink-faint')}>
              <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full', k === i ? 'bg-forest-600 text-white' : 'bg-sand text-ink-soft')}><Play size={14} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink">{it.clip.title}</span>
                <span className="block truncate text-[12.5px] text-ink-muted">
                  {t('clip.length', { s: Math.max(1, Math.round(it.clip.end - it.clip.start)) })}, {fmtClock(it.clip.start)}{!clipPlayable(it.video) && `, ${t('clip.notPlayable')}`}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
