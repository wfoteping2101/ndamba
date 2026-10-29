// Mode E, Analyse vidéo: the recorded actions of the Académie and the Défi, replayed in 3D.
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Camera, ChevronLeft, ChevronRight, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useT } from '../../../i18n'
import { useDocumentTitle, useLiveQuery } from '../../../lib/hooks'
import { cx } from '../../../lib/util'
import { GameFrame, NoWebGL, Panel, RoundButton, TopBar, hasWebGL, useMounted, useStore } from '../../shared/ui'
import { listReplays, type ReplayRow } from '../../shared/save'
import { AnalyseSession, SPEEDS } from './AnalyseSession'

export default function Analyse() {
  const { t, lang } = useT('jeux')
  useDocumentTitle(t('analyse.title'))
  const rows = useLiveQuery(() => listReplays(), [], null as ReplayRow[] | null)
  const [params] = useSearchParams()
  const [pick, setPick] = useState<number | null>(null)
  useEffect(() => {
    if (!rows || pick !== null) return
    const wanted = params.get('dernier')
    const row = (wanted ? rows.find((r) => r.key === wanted) : null) ?? null
    if (row?.id) setPick(row.id)
  }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps
  const row = rows?.find((r) => r.id === pick) ?? null
  const fmt = (ts: number) => new Date(ts).toLocaleString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  if (!row) return (
    <GameFrame className="overflow-y-auto bg-night-800">
      <TopBar back="/jeux/code-njangi" title={t('analyse.title')} />
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-20 sm:pt-24">
        <p className="max-w-2xl text-[15.5px] leading-relaxed text-cream/75">{t('analyse.intro')}</p>
        {rows && rows.length === 0 && (
          <div className="mt-6 rounded-[18px] border border-white/10 bg-night-700 p-5">
            <p className="text-[16px] font-semibold">{t('analyse.emptyTitle')}</p>
            <p className="mt-1 text-[14.5px] text-cream/70">{t('analyse.emptyBody')}</p>
            <Link to="/jeux/code-njangi/academie" className="btn-sun mt-4">{t('njangi.modes.academie.title')}</Link>
          </div>
        )}
        <ul className="mt-6 grid gap-2">
          {(rows ?? []).map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setPick(r.id!)} className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-night-700 px-4 py-3 text-left hover:bg-night-700/70">
                <span><span className="block text-[15.5px] font-semibold">{r.title}</span><span className="block text-[13px] text-cream/60">{fmt(r.at)}, {Math.round(r.replay.times[r.replay.times.length - 1] ?? 0)} s</span></span>
                <ChevronRight size={18} strokeWidth={1.75} className="text-cream/50" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </GameFrame>
  )
  return <Player row={row} onBack={() => setPick(null)} />
}

function Player({ row, onBack }: { row: ReplayRow; onBack: () => void }) {
  const { t } = useT('jeux')
  const webgl = useMemo(() => hasWebGL(), [])
  const { ref, inst: s } = useMounted((el) => (webgl ? new AnalyseSession(el, row.replay) : null), [row.id, webgl])
  const st = useStore(s)
  useEffect(() => {
    if (!s) return
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); s.toggle() }
      if (e.code === 'ArrowRight') s.stepFrames(e.shiftKey ? 10 : 1)
      if (e.code === 'ArrowLeft') s.stepFrames(e.shiftKey ? -10 : -1)
      if (e.code === 'KeyC') s.cycleCamera()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [s])
  const events = useMemo(() => s?.events() ?? [], [s])
  return (
    <GameFrame>
      <div ref={ref} className="absolute inset-0" data-testid="game-canvas" />
      {!webgl && <NoWebGL />}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-3">
        <div className="pointer-events-auto flex min-w-0 items-center gap-2">
          <button type="button" onClick={onBack} className="glass grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/15" aria-label={t('shell.back')}><ChevronLeft size={22} strokeWidth={1.75} /></button>
          <div className="glass min-w-0 rounded-[14px] px-3 py-1.5"><p className="truncate text-[14px] font-semibold">{row.title}</p><p className="text-[12px] text-cream/60">{t('analyse.title')}</p></div>
        </div>
        {st && <div className="pointer-events-auto"><RoundButton label={`${t('shell.camera')} (${t(`shell.cams.${st.camera}`)})`} onClick={() => s!.cycleCamera()}><Camera size={19} strokeWidth={1.75} /></RoundButton></div>}
      </div>
      {st && s && (
        <div className="absolute inset-x-0 bottom-0 z-20 p-2 sm:p-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}>
          <Panel className="mx-auto max-w-3xl p-3">
            <div className="relative">
              <input type="range" min={0} max={st.duration} step={0.05} value={st.t} onChange={(e) => s.seek(+e.target.value)} aria-label={t('analyse.timeline')} className="h-11 w-full accent-[#F5B700]" />
              <div className="pointer-events-none absolute inset-x-2 top-[34px] h-2" aria-hidden="true">
                {events.map((e, i) => <span key={i} className={cx('absolute h-2 w-0.5 rounded-full', e.type === 'goal' ? 'bg-sun-500' : e.type === 'pass_lost' || e.type === 'loss' ? 'bg-clay-500' : 'bg-white/40')} style={{ left: `${(e.rt / Math.max(0.1, st.duration)) * 100}%` }} />)}
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <RoundButton label={t('analyse.prevEvent')} onClick={() => { const e = [...events].reverse().find((x) => x.rt < st.t - 0.2); s.seek(e ? Math.max(0, e.rt - 1) : 0) }}><SkipBack size={18} strokeWidth={1.75} /></RoundButton>
              <RoundButton label={t('analyse.frameBack')} onClick={() => s.stepFrames(-1)}><ChevronLeft size={18} strokeWidth={1.75} /></RoundButton>
              <RoundButton label={st.playing ? t('shell.pause') : t('analyse.play')} onClick={() => s.toggle()}>{st.playing ? <Pause size={18} strokeWidth={1.75} /> : <Play size={18} strokeWidth={1.75} />}</RoundButton>
              <RoundButton label={t('analyse.frameForward')} onClick={() => s.stepFrames(1)}><ChevronRight size={18} strokeWidth={1.75} /></RoundButton>
              <RoundButton label={t('analyse.nextEvent')} onClick={() => { const e = events.find((x) => x.rt > st.t + 0.2); if (e) s.seek(Math.max(0, e.rt - 1)) }}><SkipForward size={18} strokeWidth={1.75} /></RoundButton>
              <span className="ml-1 text-[13px] tabular-nums text-cream/75">{st.t.toFixed(2)} / {st.duration.toFixed(1)} s</span>
              <div className="ml-auto flex rounded-full bg-white/10 p-0.5" role="radiogroup" aria-label={t('analyse.speed')}>
                {SPEEDS.map((v) => <button key={v} type="button" role="radio" aria-checked={st.speed === v} onClick={() => s.setSpeed(v)} className={cx('min-h-[40px] min-w-[44px] rounded-full px-2 text-[13px] font-semibold', st.speed === v ? 'bg-cream text-ink' : 'text-cream/80')}>{String(v).replace('.', ',')}x</button>)}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(['ball', 'lanes', 'lines', 'path'] as const).map((k) => (
                <button key={k} type="button" aria-pressed={st.layers[k]} onClick={() => s.setLayer(k, !st.layers[k])} className={cx('min-h-[40px] rounded-full px-3 text-[13px] font-semibold', st.layers[k] ? 'bg-cream text-ink' : 'bg-white/10 text-cream/80')}>{t(`analyse.layers.${k}`)}</button>
              ))}
              <p className="w-full text-[12.5px] text-cream/55">{t('analyse.hint')}</p>
            </div>
          </Panel>
        </div>
      )}
    </GameFrame>
  )
}
