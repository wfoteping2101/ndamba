// Choosing where a match video lives: a YouTube or Facebook link (recommended: nothing is stored by Ndamba),
// a file on this device (filmed with the phone, or copied from a camera), or, when the caller allows it
// (prop `hosting`), « Envoyer sur Ndamba (payant) »: the paid upload (see surfaces/gear/components/HostedUpload).
// Used when creating a video and in the studio.
import { useState } from 'react'
import { CheckCircle2, CloudUpload, FileVideo, Link2, RefreshCw } from 'lucide-react'
import { useT } from '../../../i18n'
import { VIDEO_HOSTING } from '../../../lib/config'
import { cx, money } from '../../../lib/util'
import type { Hosting, VideoProject, VideoSource } from '../../../lib/types'
import { parseVideoLink } from './videoSource'
import { HostedUpload } from '../../gear/components/HostedUpload'
import { fmtDuration, fmtSize } from '../../gear/hosting'

/** For a hosted video: url is an object URL of this browser session (demonstration), with the file's name, duration and hosting. */
export interface SourceValue { source: VideoSource; url: string; fileName?: string; duration?: number; hosting?: Hosting }

type Mode = 'link' | 'file' | 'hosted'
const modeOf = (v: SourceValue): Mode => (v.source === 'file' ? 'file' : v.source === 'hosted' ? 'hosted' : 'link')

/**
 * hosting: show the third choice, the paid upload. onHosted: called once the (demonstration) upload is done,
 * so the caller can create the video right away; without it, the value is ready and sourceValid() turns true.
 */
export function SourcePicker({ value, onChange, hosting = false, onHosted }: { value: SourceValue; onChange: (v: SourceValue) => void; hosting?: boolean; onHosted?: (v: SourceValue) => void }) {
  const { t } = useT('analysis')
  const g = useT('gear')
  // a hosted video opened where the paid upload is not offered (the studio's « change video »): start from a link
  const mode: Mode = !hosting && modeOf(value) === 'hosted' ? 'link' : modeOf(value)
  const link = mode === 'link'
  const url = value.source === 'hosted' && link ? '' : value.url
  const parsed = link ? parseVideoLink(url) : null
  const [touched, setTouched] = useState(false)
  const choices: [Mode, typeof Link2][] = hosting ? [['link', Link2], ['file', FileVideo], ['hosted', CloudUpload]] : [['link', Link2], ['file', FileVideo]]
  const choose = (k: Mode) => {
    if (k === mode) return
    if (k === 'link') onChange({ source: parsed?.source ?? 'youtube', url: '' })
    else if (k === 'file') onChange({ source: 'file', url: '' })
    else onChange({ source: 'hosted', url: '' })
  }
  const uploaded = mode === 'hosted' && !!value.url && !!value.hosting
  return (
    <div>
      <div className={cx('grid gap-2', hosting ? 'sm:grid-cols-3' : 'grid-cols-2')} role="radiogroup" aria-label={t('src.label')} data-tour="upload-choice">
        {choices.map(([k, Icon]) => {
          const on = k === mode
          return (
            <button key={k} type="button" role="radio" aria-checked={on} onClick={() => choose(k)}
              className={cx('flex min-h-[64px] flex-col items-start gap-1 rounded-control border px-3 py-2.5 text-left transition', on ? 'border-forest-600 bg-forest-50' : 'border-line bg-paper hover:border-ink-faint')}>
              <span className="inline-flex flex-wrap items-center gap-1.5 text-[14px] font-semibold text-ink"><Icon size={16} />{k === 'hosted' ? g.t('upload.choice') : t(`src.${k}`)}</span>
              <span className="text-[12px] leading-snug text-ink-muted">{k === 'hosted' ? g.t('upload.choiceHint', { price: money(VIDEO_HOSTING.pass.usd, g.lang) }) : t(`src.${k}Hint`)}</span>
            </button>
          )
        })}
      </div>
      {link && (
        <div className="mt-3">
          <label htmlFor="nj-vlink" className="text-[13px] font-semibold text-ink-soft">{t('src.url')}</label>
          <input id="nj-vlink" className="input mt-1" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://youtu.be/..." value={url}
            onChange={(e) => { const p = parseVideoLink(e.target.value); onChange({ source: p?.source ?? 'youtube', url: e.target.value }) }} onBlur={() => setTouched(true)} />
          {url && !parsed && touched && <p className="mt-1 text-[12.5px] text-clay-600">{t('src.badUrl')}</p>}
          {parsed && <p className="mt-1 text-[12.5px] text-forest-700">{t(parsed.source === 'youtube' ? 'src.okYoutube' : 'src.okFacebook')}</p>}
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12.5px] leading-snug text-ink-muted">
            <li>{t('src.tip1')}</li>
            <li>{t('src.tip2')}</li>
            <li>{t('src.tip3')}</li>
          </ul>
        </div>
      )}
      {mode === 'file' && <p className="mt-3 text-[12.5px] leading-snug text-ink-muted">{t('src.fileNote')}</p>}
      {mode === 'hosted' && (uploaded ? (
        <div className="mt-3 flex items-start gap-3 rounded-control border border-forest-300 bg-forest-50 px-3 py-2.5">
          <CheckCircle2 size={19} strokeWidth={1.75} className="mt-0.5 shrink-0 text-forest-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold text-ink">{value.fileName}</div>
            <div className="text-[12.5px] text-ink-muted">{[value.hosting?.sizeMB ? fmtSize(value.hosting.sizeMB, g.lang) : '', value.duration ? fmtDuration(value.duration, g.lang) : '', g.t('upload.demo')].filter(Boolean).join(', ')}</div>
          </div>
          <button type="button" className="btn-ghost btn-sm min-h-[40px] shrink-0" onClick={() => onChange({ source: 'hosted', url: '' })}><RefreshCw size={15} />{g.t('upload.change')}</button>
        </div>
      ) : (
        <HostedUpload onDone={(r) => { const v: SourceValue = { source: 'hosted', url: r.url, fileName: r.fileName, duration: r.duration, hosting: r.hosting }; onChange(v); onHosted?.(v) }} />
      ))}
    </div>
  )
}

export const sourceValid = (v: SourceValue) => v.source === 'file' || (v.source === 'hosted' ? !!v.url && !!v.hosting : !!parseVideoLink(v.url))

/** What to write on a video project for a chosen source (a link, a file, or a hosted upload). */
export function sourcePatch(v: SourceValue): Partial<VideoProject> {
  if (v.source === 'file') return { source: 'file', url: undefined, hosting: undefined }
  if (v.source === 'hosted') return { source: 'hosted', url: v.url, fileName: v.fileName, duration: v.duration, hosting: v.hosting }
  const p = parseVideoLink(v.url)
  return { source: p?.source ?? 'youtube', url: p?.url ?? v.url.trim(), fileName: undefined, hosting: undefined }
}
