// Plays one highlight clip from its start to its end: a <video> for a video hosted by Ndamba, the YouTube
// player with start and end for a YouTube link. A Facebook clip opens on Facebook; a clip of a file kept on
// a coach's device cannot be played elsewhere, and the player says so.
import { useEffect, useRef, useState } from 'react'
import { ExternalLink, FileVideo, RotateCcw } from 'lucide-react'
import { useT } from '../../../i18n'
import type { Clip, VideoProject } from '../../../lib/types'
import { fmtClock } from '../../../lib/util'

const youtubeId = (url?: string) => {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1, 12) || null
    return u.searchParams.get('v') || (u.pathname.match(/\/(embed|shorts|live)\/([\w-]{11})/)?.[2] ?? null)
  } catch { return null }
}

export const clipPlayable = (v: VideoProject) => (v.source === 'hosted' && !!v.url) || (v.source === 'youtube' && !!youtubeId(v.url))

export function ClipPlayer({ video, clip, autoPlay = false }: { video: VideoProject; clip: Clip; autoPlay?: boolean }) {
  const { t } = useT('club')
  const ref = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState(false)
  const [ended, setEnded] = useState(false)
  useEffect(() => { setError(false); setEnded(false) }, [video.id, clip.id])

  if (video.source === 'hosted' && video.url) {
    const restart = () => { const el = ref.current; if (!el) return; el.currentTime = clip.start; setEnded(false); el.play().catch(() => undefined) }
    if (error) return <Unavailable text={t('clip.gone')} />
    return (
      <div className="relative overflow-hidden rounded-card bg-night-900">
        <video key={`${video.id}:${clip.id}`} ref={ref} src={video.url} controls playsInline preload="metadata" className="aspect-video w-full bg-night-900"
          onLoadedMetadata={(e) => { e.currentTarget.currentTime = clip.start; if (autoPlay) e.currentTarget.play().catch(() => undefined) }}
          onTimeUpdate={(e) => { const el = e.currentTarget; if (el.currentTime >= clip.end) { el.pause(); el.currentTime = clip.end; setEnded(true) } else if (el.currentTime < clip.start - 0.5) el.currentTime = clip.start }}
          onPlay={() => setEnded(false)} onError={() => setError(true)} />
        {ended && (
          <button type="button" onClick={restart} className="absolute inset-0 grid place-items-center bg-night-900/55 text-cream">
            <span className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-night-800 px-4 text-[14px] font-semibold"><RotateCcw size={16} />{t('clip.replay')}</span>
          </button>
        )}
      </div>
    )
  }
  const yt = video.source === 'youtube' ? youtubeId(video.url) : null
  if (yt) {
    const src = `https://www.youtube-nocookie.com/embed/${yt}?start=${Math.floor(clip.start)}&end=${Math.ceil(clip.end)}&rel=0&modestbranding=1${autoPlay ? '&autoplay=1' : ''}`
    return (
      <div className="overflow-hidden rounded-card bg-night-900">
        <iframe key={`${video.id}:${clip.id}`} src={src} title={clip.title} className="aspect-video w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
      </div>
    )
  }
  if (video.source === 'facebook' && video.url) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-card bg-night-800 px-6 text-center text-cream">
        <p className="max-w-sm text-[14px] text-cream/80">{t('clip.facebook', { from: fmtClock(clip.start), to: fmtClock(clip.end) })}</p>
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="btn-outline-light min-h-[44px]"><ExternalLink size={16} />{t('clip.openFacebook')}</a>
      </div>
    )
  }
  return <Unavailable text={t('clip.onDevice')} />
}

function Unavailable({ text }: { text: string }) {
  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-card bg-night-800 px-6 text-center text-cream">
      <FileVideo size={26} strokeWidth={1.75} className="text-cream/60" aria-hidden="true" />
      <p className="max-w-sm text-[14px] leading-relaxed text-cream/80">{text}</p>
    </div>
  )
}
