// The paid AI reading of a match, in the video studio. Honest about what it is:
// frames read every few seconds, estimates to check, moments to watch again. Never a replacement for coding.
import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, FileVideo, KeyRound, Play, Sparkles, Square } from 'lucide-react'
import { db } from '../../../lib/db'
import { useT } from '../../../i18n'
import { AI_ANALYSIS } from '../../../lib/config'
import { cx } from '../../../lib/util'
import type { AiAnalysis, VideoProject } from '../../../lib/types'
import { aiStats, clock, frameTimes, runAi, saveCode, savedCode, type AiError } from './ai'

const pct = (v: number | null | undefined) => (v == null ? '-' : `${Math.round(v * 100)} %`)

export function AiPanel({ project, src, duration, onSeek, onPickFile }: {
  project: VideoProject
  /** object URL of the match file opened on this device, or null */
  src: string | null
  duration: number
  onSeek: (t: number) => void
  onPickFile: () => void
}) {
  const { t, lang } = useT('analysis')
  const [code, setCode] = useState(savedCode)
  const [interval, setIntervalS] = useState<number>(project.ai?.interval ?? AI_ANALYSIS.defaultInterval)
  const [consent, setConsent] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<AiError | 'stopped' | 'video' | null>(null)
  const stopper = useRef<AbortController | null>(null)
  const ai = project.ai
  const stats = useMemo(() => (ai ? aiStats(ai.frames) : null), [ai])
  const from = project.kickoff1 ?? 0
  const to = duration || project.duration || 0
  const count = to > from ? frameTimes(from, to, interval).length : 0
  const minutes = Math.max(1, Math.round((count / 12) * 0.35))
  const partial = ai && !ai.doneAt && ai.frames.length > 0
  const ready = !!(project.ourColor?.trim() && project.theirColor?.trim() && project.attackRight1 !== undefined && code.trim() && consent && src && to > from)
  const price = `${AI_ANALYSIS.usdPerMatch.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'USD' })}`

  const set = (patch: Partial<VideoProject>) => db.videos.update(project.id, patch)
  const start = async () => {
    if (!src || !ready) return
    saveCode(code.trim())
    const ctrl = new AbortController()
    stopper.current = ctrl
    setRunning(true); setError(null)
    const fresh = await db.videos.get(project.id)
    const r = await runAi({
      project: fresh ?? project, src, code: code.trim(), lang: lang === 'en' ? 'en' : 'fr', interval, from, to, signal: ctrl.signal,
      save: async (a: AiAnalysis) => { await db.videos.update(project.id, { ai: a }) },
      onProgress: (done, total) => setProgress({ done, total }),
    })
    setRunning(false)
    if (!r.ok) setError(r.error)
  }

  return (
    <section className="card card-pad" aria-labelledby="ai-h">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sun-50 text-sun-700"><Sparkles size={19} strokeWidth={1.75} /></span>
        <div className="min-w-0 flex-1">
          <h2 id="ai-h" className="font-display text-lg font-semibold text-ink">{t('ai.title')}</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">{t('ai.subtitle', { price })}</p>
        </div>
      </div>

      {stats && ai && ai.frames.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            <Stat label={t('ai.possession')} value={pct(stats.possessionUs)} />
            <Stat label={t('ai.restOk')} value={pct(stats.restOk)} />
            <Stat label={t('ai.behindAvg')} value={stats.behindAvg == null ? '-' : stats.behindAvg.toFixed(1)} />
            <Stat label={t('ai.readable')} value={`${stats.readable} / ${stats.frames}`} />
          </div>
          {stats.territory && (
            <div>
              <div className="mb-1 text-[12.5px] font-semibold text-ink-muted">{t('ai.territory')}</div>
              <div className="flex h-7 overflow-hidden rounded-lg text-[11.5px] font-semibold">
                {(['def', 'mid', 'att'] as const).map((k, i) => (
                  <div key={k} className={cx('grid place-items-center text-white', ['bg-clay-500', 'bg-ink-faint', 'bg-forest-600'][i])} style={{ width: `${Math.max(8, stats.territory![k] * 100)}%` }} title={t(`ai.third.${k}`)}>{Math.round(stats.territory![k] * 100)}%</div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[11.5px] text-ink-faint"><span>{t('ai.third.def')}</span><span>{t('ai.third.mid')}</span><span>{t('ai.third.att')}</span></div>
            </div>
          )}
          {stats.block && <p className="text-[13px] text-ink-soft">{t('ai.block', { high: pct(stats.block.high), mid: pct(stats.block.mid), low: pct(stats.block.low) })}</p>}
          {ai.summary && <p className="rounded-xl bg-sand/60 p-3 text-[14px] leading-relaxed text-ink-soft">{ai.summary}</p>}
          {stats.moments.length > 0 && (
            <div>
              <div className="mb-1 text-[12.5px] font-semibold text-ink-muted">{t('ai.moments')}</div>
              <ul className="-mx-1 max-h-60 divide-y divide-line/70 overflow-y-auto">
                {stats.moments.map((m) => (
                  <li key={m.t}>
                    <button type="button" onClick={() => onSeek(m.t)} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left hover:bg-sand">
                      <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums text-ink-muted">{clock(m.t)}</span>
                      <span className="min-w-0 flex-1 text-[13.5px] text-ink">{m.note || (m.phase === 'us' && m.behind != null && m.behind <= 3 ? t('ai.fewBehind', { n: m.behind }) : t('ai.worth'))}</span>
                      <Play size={14} className="shrink-0 text-ink-faint" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[12px] leading-relaxed text-ink-faint">{t('ai.honest')}</p>
        </div>
      )}

      {running ? (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[13px] font-semibold text-ink-soft">
            <span>{t('ai.running')}</span>
            <span className="tabular-nums">{progress ? `${progress.done} / ${progress.total}` : ''}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-sun-500 transition-all" style={{ width: progress ? `${(progress.done / Math.max(1, progress.total)) * 100}%` : '2%' }} /></div>
          <p className="mt-2 text-[12.5px] text-ink-muted">{t('ai.keepOpen')}</p>
          <button type="button" className="btn-outline btn-sm mt-3" onClick={() => stopper.current?.abort()}><Square size={14} />{t('ai.stop')}</button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          {!src && (
            <div className="rounded-xl bg-sand/60 p-3 text-[13px] text-ink-soft">
              <p>{project.source === 'youtube' || project.source === 'facebook' ? t('ai.needFileLink') : t('ai.needFile')}</p>
              <button type="button" className="btn-outline btn-sm mt-2" onClick={onPickFile}><FileVideo size={15} />{t('ai.openFile')}</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12.5px] font-semibold text-ink-muted">{t('ai.ourColor')}
              <input className="input mt-1" value={project.ourColor ?? ''} onChange={(e) => set({ ourColor: e.target.value })} placeholder={t('ai.ourColorPh')} />
            </label>
            <label className="text-[12.5px] font-semibold text-ink-muted">{t('ai.theirColor')}
              <input className="input mt-1" value={project.theirColor ?? ''} onChange={(e) => set({ theirColor: e.target.value })} placeholder={t('ai.theirColorPh')} />
            </label>
          </div>
          <div>
            <div className="text-[12.5px] font-semibold text-ink-muted">{t('ai.direction')}</div>
            <div className="mt-1 flex gap-1.5" role="group" aria-label={t('ai.direction')}>
              <button type="button" aria-pressed={project.attackRight1 === false} onClick={() => set({ attackRight1: false })} className={cx('chip min-h-[40px] flex-1 cursor-pointer justify-center', project.attackRight1 === false && 'chip-on')}><ArrowLeft size={15} />{t('ai.left')}</button>
              <button type="button" aria-pressed={project.attackRight1 === true} onClick={() => set({ attackRight1: true })} className={cx('chip min-h-[40px] flex-1 cursor-pointer justify-center', project.attackRight1 === true && 'chip-on')}>{t('ai.right')}<ArrowRight size={15} /></button>
            </div>
            <p className="mt-1 text-[12px] text-ink-faint">{t('ai.directionHint')}</p>
          </div>
          <div>
            <div className="text-[12.5px] font-semibold text-ink-muted">{t('ai.density')}</div>
            <div className="mt-1 flex gap-1.5" role="group" aria-label={t('ai.density')}>
              {AI_ANALYSIS.intervals.map((s) => (
                <button key={s} type="button" aria-pressed={interval === s} onClick={() => setIntervalS(s)} className={cx('chip min-h-[40px] flex-1 cursor-pointer justify-center', interval === s && 'chip-on')}>{t('ai.every', { s })}</button>
              ))}
            </div>
            {count > 0 && <p className="mt-1 text-[12px] text-ink-faint">{t('ai.estimate', { count, minutes })}</p>}
          </div>
          <label className="block text-[12.5px] font-semibold text-ink-muted">{t('ai.code')}
            <span className="relative mt-1 block">
              <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
              <input className="input pl-9" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('ai.codePh')} autoComplete="off" spellCheck={false} />
            </span>
            <span className="mt-1 block text-[12px] font-normal text-ink-faint">{t('ai.codeHint', { price })}</span>
          </label>
          <label className="flex items-start gap-2.5 text-[13px] text-ink-soft">
            <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-forest-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>{t('ai.consent')}</span>
          </label>
          {error && <p className="rounded-xl bg-clay-50 px-3 py-2 text-[13px] text-clay-700" role="alert">{t(`ai.error.${error}`)}</p>}
          <button type="button" className="btn-sun w-full justify-center" disabled={!ready} onClick={start}>
            <Sparkles size={17} />{partial ? t('ai.resume', { done: ai!.frames.length }) : ai?.doneAt ? t('ai.again') : t('ai.start')}
          </button>
        </div>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-sand/60 px-3 py-2">
      <div className="text-[11.5px] font-semibold text-ink-muted">{label}</div>
      <div className="font-display text-[20px] font-semibold tabular-nums text-ink">{value}</div>
    </div>
  )
}
