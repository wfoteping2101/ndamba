// Choosing where a match video lives: a YouTube or Facebook link (recommended: nothing is stored by Ndamba),
// or a file on this device (filmed with the phone, or copied from a camera). Used when creating a video and in the studio.
import { useState } from 'react'
import { FileVideo, Link2 } from 'lucide-react'
import { useT } from '../../../i18n'
import { cx } from '../../../lib/util'
import type { VideoSource } from '../../../lib/types'
import { parseVideoLink } from './videoSource'

export interface SourceValue { source: VideoSource; url: string }

export function SourcePicker({ value, onChange }: { value: SourceValue; onChange: (v: SourceValue) => void }) {
  const { t } = useT('analysis')
  const link = value.source !== 'file'
  const parsed = link ? parseVideoLink(value.url) : null
  const [touched, setTouched] = useState(false)
  return (
    <div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('src.label')}>
        {([['link', Link2], ['file', FileVideo]] as const).map(([k, Icon]) => {
          const on = k === 'link' ? link : !link
          return (
            <button key={k} type="button" role="radio" aria-checked={on} onClick={() => onChange(k === 'link' ? { source: parsed?.source ?? 'youtube', url: value.url } : { source: 'file', url: '' })}
              className={cx('flex min-h-[64px] flex-col items-start gap-1 rounded-control border px-3 py-2.5 text-left transition', on ? 'border-forest-600 bg-forest-50' : 'border-line bg-paper hover:border-ink-faint')}>
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink"><Icon size={16} />{t(`src.${k}`)}</span>
              <span className="text-[12px] leading-snug text-ink-muted">{t(`src.${k}Hint`)}</span>
            </button>
          )
        })}
      </div>
      {link && (
        <div className="mt-3">
          <label htmlFor="nj-vlink" className="text-[13px] font-semibold text-ink-soft">{t('src.url')}</label>
          <input id="nj-vlink" className="input mt-1" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://youtu.be/..." value={value.url}
            onChange={(e) => { const p = parseVideoLink(e.target.value); onChange({ source: p?.source ?? 'youtube', url: e.target.value }) }} onBlur={() => setTouched(true)} />
          {value.url && !parsed && touched && <p className="mt-1 text-[12.5px] text-clay-600">{t('src.badUrl')}</p>}
          {parsed && <p className="mt-1 text-[12.5px] text-forest-700">{t(parsed.source === 'youtube' ? 'src.okYoutube' : 'src.okFacebook')}</p>}
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12.5px] leading-snug text-ink-muted">
            <li>{t('src.tip1')}</li>
            <li>{t('src.tip2')}</li>
            <li>{t('src.tip3')}</li>
          </ul>
        </div>
      )}
      {!link && <p className="mt-3 text-[12.5px] leading-snug text-ink-muted">{t('src.fileNote')}</p>}
    </div>
  )
}

export const sourceValid = (v: SourceValue) => v.source === 'file' || !!parseVideoLink(v.url)
