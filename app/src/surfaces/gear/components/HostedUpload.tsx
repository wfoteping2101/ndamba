// « Envoyer sur Ndamba (payant) »: choose a plan, choose the file (size and duration read in the browser),
// see the price and what is included, then « Envoyer (démonstration) ». Payments and storage are not connected
// yet: the upload is simulated with a progress bar, nothing is sent and nothing is billed, and the video plays
// from this device for this browser session.
import { useEffect, useRef, useState } from 'react'
import { Check, CloudUpload, FileVideo, LoaderCircle, RefreshCw } from 'lucide-react'
import { useT } from '../../../i18n'
import { VIDEO_HOSTING } from '../../../lib/config'
import { db } from '../../../lib/db'
import { useLiveQuery } from '../../../lib/hooks'
import type { Hosting, VideoProject } from '../../../lib/types'
import { cx, fcfa, fmtDate, money } from '../../../lib/util'
import { clubSecondsThisMonth, fmtDuration, fmtSize, limitError, makeHosting, readVideoMeta, type FileMeta, type HostPlan } from '../hosting'

export interface HostedResult { url: string; fileName: string; duration?: number; hosting: Hosting }

export function HostedUpload({ onDone }: { onDone: (r: HostedResult) => void }) {
  const { t, lang } = useT('gear')
  const videos = useLiveQuery(() => db.videos.toArray(), [], [] as VideoProject[])
  const [plan, setPlan] = useState<HostPlan>('pass')
  const [meta, setMeta] = useState<FileMeta | null>(null)
  const [reading, setReading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current) }, [])

  const used = clubSecondsThisMonth(videos)
  const error = meta ? limitError(plan, meta, used) : null
  const P = VIDEO_HOSTING
  const pick = async (file?: File | null) => {
    if (!file) return
    setReading(true)
    try { setMeta(await readVideoMeta(file)) } finally { setReading(false) }
  }
  const send = () => {
    if (!meta || error) return
    const total = Math.min(4200, 1600 + meta.sizeMB / 2) // a few seconds: it is a demonstration
    const start = performance.now()
    setProgress(0)
    timer.current = window.setInterval(() => {
      const p = Math.min(100, Math.round(((performance.now() - start) / total) * 100))
      setProgress(p)
      if (p >= 100) {
        if (timer.current) window.clearInterval(timer.current)
        timer.current = null
        onDone({ url: URL.createObjectURL(meta.file), fileName: meta.name, duration: meta.duration ?? undefined, hosting: makeHosting(plan, meta.sizeMB) })
      }
    }, 80)
  }
  const expires = makeHosting(plan, 0).expiresAt!.slice(0, 10)
  const uploading = progress !== null

  return (
    <div className="mt-3 space-y-4">
      <div className="rounded-card bg-sand/70 px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">
        <p><span className="font-semibold text-ink">{t('upload.whyFreeTitle')}</span> {t('upload.whyFree')}</p>
        <p className="mt-1.5"><span className="font-semibold text-ink">{t('upload.addsTitle')}</span> {t('upload.adds')}</p>
      </div>

      <fieldset disabled={uploading}>
        <legend className="mb-1.5 text-[14px] font-semibold text-ink-soft">{t('upload.planLabel')}</legend>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t('upload.planLabel')}>
          {(['pass', 'club'] as const).map((k) => {
            const on = plan === k
            return (
              <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setPlan(k)}
                className={cx('flex min-h-[64px] flex-col items-start rounded-control border px-3 py-2.5 text-left transition', on ? 'border-forest-600 bg-forest-50' : 'border-line bg-paper hover:border-ink-faint')}>
                <span className="text-[14.5px] font-semibold text-ink">{t(`plans.${k}.name`)}</span>
                <span className="num text-[14px] font-semibold text-forest-700">{k === 'pass' ? t('plans.pass.price', { price: money(P.pass.usd, lang) }) : t('plans.club.perMonth', { price: money(P.club.usdMonth, lang) })}</span>
                <span className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">
                  {k === 'pass' ? t('plans.pass.short', { h: P.pass.maxHours, gb: P.pass.maxGB, m: P.pass.months }) : t('plans.club.short', { h: P.club.hoursPerMonth, m: P.club.months })}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div>
        <input ref={input} type="file" accept="video/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
        {!meta ? (
          <button type="button" className="btn-outline min-h-[52px] w-full" onClick={() => input.current?.click()} disabled={reading}>
            {reading ? <LoaderCircle size={17} className="motion-safe:animate-spin" /> : <FileVideo size={17} />}{reading ? t('upload.reading') : t('upload.pickFile')}
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-control border border-line bg-paper px-3 py-2.5">
            <FileVideo size={20} strokeWidth={1.75} className="shrink-0 text-forest-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold text-ink">{meta.name}</div>
              <div className="text-[12.5px] text-ink-muted">{[fmtSize(meta.sizeMB, lang), meta.duration ? fmtDuration(meta.duration, lang) : t('upload.noDuration')].join(', ')}</div>
            </div>
            {!uploading && <button type="button" className="btn-ghost btn-sm min-h-[40px] shrink-0" onClick={() => input.current?.click()}><RefreshCw size={15} />{t('upload.change')}</button>}
          </div>
        )}
        {error && <p className="mt-2 text-[13px] leading-snug text-clay-600" role="alert">{t(`upload.errors.${error}`, { h: P.pass.maxHours, gb: P.pass.maxGB, month: P.club.hoursPerMonth })}</p>}
      </div>

      {meta && !error && (
        <div className="rounded-card border border-line bg-paper px-4 py-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[14px] font-semibold text-ink">{plan === 'pass' ? t('upload.payPass') : t('upload.payClub')}</span>
            <span className="num font-display text-[24px] leading-none text-ink">{plan === 'pass' ? money(P.pass.usd, lang) : money(P.club.usdMonth, lang)}</span>
          </div>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            {plan === 'pass' ? t('upload.approx', { v: fcfa(P.pass.usd, lang) }) : t('upload.clubUse', { used: fmtDuration(used + (meta.duration ?? 0), lang), total: P.club.hoursPerMonth, v: fcfa(P.club.usdMonth, lang) })}
          </p>
          <ul className="mt-3 space-y-1.5 text-[13.5px] text-ink-soft">
            {[t('upload.inc.kept', { date: fmtDate(expires, lang, { day: 'numeric', month: 'long', year: 'numeric' }) }), t('upload.inc.everywhere'), t('upload.inc.ai'), t(plan === 'pass' ? 'upload.inc.onePass' : 'upload.inc.allTeams')].map((x) => (
              <li key={x} className="flex items-start gap-2"><Check size={15} strokeWidth={2.2} className="mt-0.5 shrink-0 text-forest-600" aria-hidden="true" />{x}</li>
            ))}
          </ul>
        </div>
      )}

      {meta && !error && (
        <div>
          {uploading ? (
            <div aria-live="polite">
              <div className="mb-1.5 flex justify-between text-[13.5px]"><span className="font-semibold text-ink">{progress! < 100 ? t('upload.sending') : t('upload.sent')}</span><span className="num text-ink-muted">{progress}%</span></div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={progress!} aria-valuemin={0} aria-valuemax={100} aria-label={t('upload.sending')}>
                <div className="h-full rounded-full bg-forest-600" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <button type="button" className="btn-primary min-h-[48px] w-full" onClick={send}><CloudUpload size={18} />{t('upload.send')}</button>
          )}
          <p className="mt-2 text-center text-[12.5px] font-semibold text-ink-muted">{t('upload.demo')}</p>
        </div>
      )}
    </div>
  )
}
