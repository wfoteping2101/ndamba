// A chapter of Lionceaux on screen: the 3D stage, the subtitles (the book's words), the walk and
// football controls, the notebook at the end. Saves at every beat; resumes where it stopped.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BookOpen, ChevronRight, Info, Pause, Play, RotateCcw, Settings2, SkipForward } from 'lucide-react'
import { useT } from '../../i18n'
import { useDocumentTitle } from '../../lib/hooks'
import { cx } from '../../lib/util'
import { TOME1_TOC } from '../../content/books.gen'
import { GameFrame, NoWebGL, RoundButton, SettingsSheet, Spinner, TopBar, hasWebGL, useMounted, useStore } from '../shared/ui'
import { Manette, useGamepad, type PadAction, type PadButton } from '../shared/Manette'
import { sfx } from '../shared/audio'
import { tome1Chapter } from '../njangi/links'
import { SCRIPTS, isPlayable } from './chapters'
import { lessonByNo } from './lessons'
import { Notebook } from './Notebook'
import { loadSave, saveBeat } from './progress'
import type { ControlKey } from './story/challenges'
import { StorySession, type ChapterScript } from './story/session'

const SUBS_KEY = 'ndamba.lionceaux.subs'
type Subs = { size: 's' | 'm' | 'l'; auto: boolean }
function loadSubs(): Subs { try { return { size: 'm', auto: true, ...JSON.parse(localStorage.getItem(SUBS_KEY) || '{}') } } catch { return { size: 'm', auto: true } } }

export default function ChapterPlayer() {
  const { n } = useParams()
  const no = Number(n)
  const [params] = useSearchParams()
  const { t } = useT('lionceaux')
  const toc = TOME1_TOC.find((c) => c.no === no)
  useDocumentTitle(toc ? `${t('player.chapter', { n: no })} · ${toc.title}` : t('title'))
  const [ready, setReady] = useState<{ script: ChapterScript; start: number } | null>(null)
  useEffect(() => {
    let on = true
    const load = SCRIPTS[no]
    if (!load) return
    Promise.all([load(), loadSave()]).then(([script, save]) => {
      if (!on) return
      const forced = params.get('scene')
      const resume = save.chapter === String(no) && params.get('debut') === null ? save.beat : 0
      setReady({ script, start: forced !== null ? Number(forced) : resume })
    })
    return () => { on = false }
  }, [no]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!toc || !isPlayable(no)) return (
    <GameFrame className="bg-night-800">
      <TopBar back="/jeux/lionceaux/chapitres" title={t('chapters.title')} />
      <div className="grid h-full place-items-center p-6 text-center"><Link to="/jeux/lionceaux/chapitres" className="btn-sun">{t('player.backToChapters')}</Link></div>
    </GameFrame>
  )
  if (!ready) return <GameFrame className="bg-night-800"><Spinner label={t('player.loading')} /></GameFrame>
  return <Player key={`${no}-${ready.start}`} no={no} title={toc.title} pov={toc.pov ?? ''} script={ready.script} start={ready.start} />
}

function Player({ no, title, pov, script, start }: { no: number; title: string; pov: string; script: ChapterScript; start: number }) {
  const { t } = useT('lionceaux')
  const nav = useNavigate()
  const webgl = useMemo(() => hasWebGL(), [])
  const [subs, setSubs] = useState<Subs>(loadSubs)
  const [settings, setSettings] = useState(false)
  const [bridgeInfo, setBridgeInfo] = useState(false)
  const { ref, inst: s } = useMounted((el) => (webgl ? new StorySession(el, script, { startBeat: start, autoAdvance: subs.auto, onSave: (beat, done) => { void saveBeat(no, beat, done) } }) : null), [webgl])
  const st = useStore(s)
  useEffect(() => { if (s) s.autoAdvance = subs.auto; try { localStorage.setItem(SUBS_KEY, JSON.stringify(subs)) } catch { /* private */ } }, [s, subs])
  // automated tests drive the story through this handle
  useEffect(() => {
    if (!s || !(import.meta.env.DEV || location.search.includes('e2e'))) return
    ;(window as unknown as { __story?: StorySession }).__story = s
    // ?qa: the challenges play themselves and the lines go fast (screenshots, end-to-end tests)
    if (location.search.includes('qa')) { s.autoplay = true; s.readingScale = 0.12 }
    return () => { delete (window as unknown as { __story?: StorySession }).__story }
  }, [s])
  useEffect(() => { if (settings) s?.pause(true) }, [settings, s])
  const lesson = st?.lesson ? lessonByNo(st.lesson) : null
  const nextNo = isPlayable(no + 1) ? no + 1 : null
  const fontSize = subs.size === 's' ? 'text-[15px]' : subs.size === 'l' ? 'text-[20px] sm:text-[22px]' : 'text-[17px] sm:text-[18.5px]'
  const lowered = !!st && (st.stick || st.controls.length > 0)
  const pad = useGamepad()
  const dragX = useRef<number | null>(null)
  // the controller: what each button does in this moment of the chapter
  const buttons: Partial<Record<PadButton, PadAction>> = {}
  if (s && st && !st.paused) {
    const press = (k: ControlKey, action: 'pass' | 'shoot' | 'skill') => ({
      onDown: () => { if (k === 'diveL' || k === 'diveR' || k === 'touch') s.pressControl(k); s.input.touchButton(action, true) },
      onUp: () => s.input.touchButton(action, false),
    })
    for (const k of st.controls) {
      if (k === 'talk') buttons.cross = { label: t('controls.talk'), enabled: !!st.near, primary: true, key: 'J', onDown: () => { sfx('tap'); if (st.near) void s.talk(st.near.id) } }
      else if (k === 'pass' || k === 'touch' || k === 'next') buttons.cross = { label: t(`controls.${k}`), primary: true, key: 'J', ...press(k, 'pass') }
      else if (k === 'shoot') buttons.circle = { label: t('controls.shoot'), key: 'K', ...press(k, 'shoot') }
      else if (k === 'dribble') buttons.square = { label: t('controls.dribble'), key: 'R', primary: !st.controls.includes('pass'), ...press(k, 'skill') }
      else if (k === 'diveL') buttons.square = { label: t('controls.diveL'), ...press(k, 'pass') }
      else if (k === 'diveR') buttons.circle = { label: t('controls.diveR'), ...press(k, 'pass') }
    }
    if (st.stick) buttons.r2 = { label: t('controls.sprint'), key: 'Maj', onDown: () => s.input.touchButton('sprint', true), onUp: () => s.input.touchButton('sprint', false) }
  }
  return (
    <GameFrame>
      <div ref={ref} className="absolute inset-0 touch-none" data-testid="game-canvas" onPointerDown={(e) => { s?.pointer(e.nativeEvent); dragX.current = e.clientX }}
        onPointerMove={(e) => { if (dragX.current !== null && e.buttons) { s?.input.touchLook(e.clientX - dragX.current); dragX.current = e.clientX } }} onPointerUp={() => { dragX.current = null }} />
      {!webgl && <NoWebGL />}
      {webgl && !st && <Spinner label={t('player.loading')} />}
      <TopBar back="/jeux/lionceaux/chapitres" title={<><span className="text-sun-300">{t('player.chapter', { n: no })} </span>{title}</>} sub={pov ? t('chapters.pov', { name: pov }) : undefined}
        right={st && <>
          {st.skippable && <button type="button" onClick={() => { sfx('tap'); s!.skip() }} className="glass inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold hover:bg-white/15"><SkipForward size={17} strokeWidth={1.75} aria-hidden="true" /><span className="hidden sm:inline">{t('player.skip')}</span><span className="sr-only sm:hidden">{t('player.skip')}</span></button>}
          <RoundButton label={st.paused ? t('player.resume') : t('player.pause')} onClick={() => s!.pause(!st.paused)} active={st.paused}>{st.paused ? <Play size={19} strokeWidth={1.75} /> : <Pause size={19} strokeWidth={1.75} />}</RoundButton>
          <RoundButton label={t('menu.settings')} onClick={() => setSettings(true)}><Settings2 size={19} strokeWidth={1.75} /></RoundButton>
        </>} />

      {st && (st.bridge || st.score || st.prompt) && (
        <div className="pointer-events-none absolute inset-x-0 top-[62px] z-20 flex flex-col items-center gap-1.5 px-3 sm:top-[70px]">
          <div className="flex items-center gap-1.5">
            {st.bridge && (
              <button type="button" className="glass pointer-events-auto inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-cream/85" onClick={() => setBridgeInfo((v) => !v)} aria-expanded={bridgeInfo}>
                <Info size={14} strokeWidth={1.75} aria-hidden="true" />{t('player.bridge')}
              </button>
            )}
            {st.score && <span className="glass rounded-full px-3 py-1 text-[15px] font-semibold tabular-nums" aria-label={`${t('player.score')} ${st.score}`}>{st.score}</span>}
          </div>
          {bridgeInfo && st.bridge && <p className="glass max-w-md rounded-[12px] px-3 py-2 text-center text-[13px] text-cream/85">{t('player.bridgeHint')}</p>}
          {st.prompt && <p className="glass-strong max-w-xl rounded-[14px] px-4 py-2 text-center text-[14.5px] font-semibold leading-snug" role="status">{t(st.prompt.key, st.prompt.vars)}</p>}
          {st.hint && <p className="max-w-xl rounded-[12px] bg-sun-500 px-3 py-1.5 text-center text-[13.5px] font-semibold text-ink" role="status">{t(st.hint.key, st.hint.vars)}</p>}
        </div>
      )}

      {st && st.line && (
        <div className={cx('absolute inset-x-0 z-20 flex justify-center px-2 sm:px-4', lowered ? 'bottom-[150px] sm:bottom-[24px]' : 'bottom-0')} style={{ paddingBottom: lowered ? undefined : 'max(env(safe-area-inset-bottom), 12px)' }}>
          <button type="button" onClick={() => s!.advance()} className="glass-strong w-full max-w-3xl rounded-[18px] px-4 py-3 text-left sm:px-5 sm:py-4" aria-live="polite">
            {st.line.name && <span className="block text-[13px] font-semibold" style={{ color: lighten(st.line.color) }}>{st.line.name}{st.line.thought ? ` · ${t('player.thought')}` : ''}</span>}
            <span className={cx('mt-0.5 block leading-snug', fontSize, st.line.thought && 'italic', st.line.narr && 'text-cream/90')}>{st.line.text}</span>
            <span className="mt-1 flex justify-end text-cream/50" aria-hidden="true"><ChevronRight size={16} strokeWidth={1.75} /></span>
          </button>
        </div>
      )}

      {st && !st.paused && (st.stick || st.controls.length > 0) && (
        <Manette stick={st.stick} onMove={(x, y) => s!.input.touchMove(x, y)} buttons={buttons} stickLabel={t('controls.stick')} compact={pad} />
      )}

      {st && st.choices && (
        <div className="absolute inset-x-0 bottom-[22%] z-20 flex flex-wrap justify-center gap-2 px-4">
          {st.choices.map((c) => <button key={c.key} type="button" onClick={() => s!.choose(c.key)} className={cx('min-h-[48px] rounded-full px-5 text-[15px] font-semibold shadow-lg', c.canon ? 'bg-cream text-ink' : 'glass text-cream')}>{t(`choices.${c.key}`)}</button>)}
        </div>
      )}

      {st && st.paused && !settings && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/45 p-4">
          <div className="glass-strong w-full max-w-sm rounded-[20px] p-5 text-cream">
            <p className="text-[18px] font-semibold">{t('player.pause')}</p>
            <div className="mt-4 grid gap-2">
              <button type="button" className="btn-sun justify-center" onClick={() => s!.pause(false)}><Play size={17} strokeWidth={1.75} aria-hidden="true" />{t('player.resume')}</button>
              <button type="button" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-[15px] font-semibold hover:bg-white/15" onClick={() => nav(`/jeux/lionceaux/chapitre/${no}?debut`, { replace: true })}><RotateCcw size={17} strokeWidth={1.75} aria-hidden="true" />{t('player.restart')}</button>
              <a href={tome1Chapter(no)} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-[15px] font-semibold hover:bg-white/15"><BookOpen size={17} strokeWidth={1.75} aria-hidden="true" />{t('player.readChapter')}</a>
              <Link to="/jeux/lionceaux/chapitres" className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-[15px] font-semibold text-cream/80 underline underline-offset-4">{t('player.quit')}</Link>
            </div>
          </div>
        </div>
      )}

      {lesson && s && <Notebook lesson={lesson} onContinue={() => { sfx('page'); s.continueAfterLesson() }} playHref={`/jeux/lionceaux/lecon/${lesson.no}`} />}

      {st && st.done && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/45 p-4">
          <div className="glass-strong w-full max-w-md rounded-[20px] p-6 text-cream">
            <p className="text-[13px] font-semibold text-sun-300">{t('player.chapter', { n: no })}</p>
            <p className="mt-1 text-[22px] font-semibold leading-tight">{t('player.endTitle', { n: no })}</p>
            <p className="mt-1 text-[15px] text-cream/75">{title}</p>
            <div className="mt-5 grid gap-2">
              {nextNo ? <Link to={`/jeux/lionceaux/chapitre/${nextNo}`} className="btn-sun justify-center">{t('player.nextChapter')}</Link> : null}
              <Link to={`/jeux/lionceaux/lecon/${no}`} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white/10 px-4 text-[15px] font-semibold hover:bg-white/15">{t('chapters.lesson', { n: no })}</Link>
              <Link to="/jeux/lionceaux/chapitres" className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white/10 px-4 text-[15px] font-semibold hover:bg-white/15">{t('player.backToChapters')}</Link>
              <a href={tome1Chapter(no)} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold text-cream/80 underline underline-offset-4"><BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />{t('player.readChapter')}</a>
            </div>
          </div>
        </div>
      )}

      <SettingsSheet open={settings} onClose={() => { setSettings(false); s?.pause(false) }}
        subtitles={{ size: subs.size, set: (v) => setSubs((o) => ({ ...o, size: v.size })) }}
        extra={<label className="flex min-h-[44px] items-center justify-between gap-3 text-[15px]">{t('player.auto')}<input type="checkbox" checked={subs.auto} onChange={(e) => setSubs((o) => ({ ...o, auto: e.target.checked }))} className="h-5 w-5 accent-[#0B5D3B]" /></label>} />
      <PlayerKeys s={s} />
    </GameFrame>
  )
}

/** Space, Enter: next line; the session reads the rest through its Input. */
function PlayerKeys({ s }: { s: StorySession | null }) {
  const sRef = useRef(s)
  sRef.current = s
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === 'Enter') sRef.current?.advance() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  return null
}

/** names in their colour, readable on the dark glass */
function lighten(hex: string) {
  const c = parseInt(hex.replace('#', ''), 16)
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255
  const mix = (v: number) => Math.round(v + (255 - v) * 0.45)
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`
}
