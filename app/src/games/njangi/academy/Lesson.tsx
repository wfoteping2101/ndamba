// One lesson of the Académie: briefing from the drill sheet, demonstration in 3D, the attempt,
// the evaluation and the book's own coaching lines as feedback. Progress is saved per level.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookOpen, Camera, CheckCircle2, Pause, Play, RotateCcw, Settings2, Star } from 'lucide-react'
import { useT } from '../../../i18n'
import { useDocumentTitle } from '../../../lib/hooks'
import { cx } from '../../../lib/util'
import { fmtNjangi } from '../../../lib/njangi'
import type { Drill, DrillText } from '../../../lib/types'
import type { Level } from '../../engine/sim/types'
import { ActionButton, GameFrame, NoWebGL, Panel, RoundButton, SettingsSheet, Spinner, Stick, TopBar, hasWebGL, isTouch, useMounted, usePanelInsets, useStore } from '../../shared/ui'
import { recordDrill, saveReplay } from '../../shared/save'
import { sfx } from '../../shared/audio'
import { LessonSession, type LessonResult } from '../drills/session'
import { LESSONS_ORDERED, gameplayFor, lessonDrill } from '../drills/catalog'
import type { DrillGameplay } from '../drills/types'
import { sheetUrl } from '../links'

const LEVELS: Level[] = ['facile', 'normal', 'difficile']

export default function Lesson() {
  const { id } = useParams()
  const drill = lessonDrill(id)
  if (!drill) return <NotFound />
  return <LessonScreen key={drill.id} drill={drill} />
}

function NotFound() {
  const { t } = useT('jeux')
  return <GameFrame><TopBar back="/jeux/code-njangi/academie" title={t('academie.title')} /></GameFrame>
}

export interface LessonScreenProps {
  drill: Drill
  /** the small label above the title (the drill's family by default) */
  kicker?: string
  /** rules other than the sheet's own (Défi des dix passes) */
  g?: DrillGameplay
  back?: string
  sheet?: { href: string; label: string }
  /** show the running sequence: passes and players who touched it */
  chain?: boolean
}

export function LessonScreen({ drill, g: given, back = '/jeux/code-njangi/academie', sheet, chain, kicker }: LessonScreenProps) {
  const { t, lang } = useT('jeux')
  const text: DrillText = lang === 'en' ? drill.en : drill.fr
  const g = useMemo(() => given ?? gameplayFor(drill), [drill, given])
  useDocumentTitle(`${drill.id} ${text.title}`)
  const [level, setLevel] = useState<Level>('normal')
  const [control, setControl] = useState<'decisions' | 'carrier'>(g.control)
  const [settings, setSettings] = useState(false)
  const webgl = useMemo(() => hasWebGL(), [])
  const { ref, inst: session, error } = useMounted((el) => (webgl ? new LessonSession(el, drill, g, { level, control }) : null), [drill.id, webgl])
  const st = useStore(session)
  const nav = useNavigate()

  // automated tests drive the lesson through this handle (?e2e in the address, or the dev server)
  useEffect(() => {
    if (!session || !(import.meta.env.DEV || location.search.includes('e2e'))) return
    ;(window as unknown as { __lesson?: LessonSession }).__lesson = session
    return () => { delete (window as unknown as { __lesson?: LessonSession }).__lesson }
  }, [session])
  useEffect(() => { session?.setLevel(level) }, [session, level])
  useEffect(() => { session?.setControl(control) }, [session, control])
  // save the result once
  const [saved, setSaved] = useState<LessonResult | null>(null)
  useEffect(() => {
    const r = st?.result
    if (!r || r === saved) return
    setSaved(r)
    recordDrill(drill.id, { level: r.level, success: r.success, points: r.points, indice: r.indice?.total ?? null, counts: r.counts, mistakes: r.mistakes.map((m) => m.mistake) })
    if (r.replay) saveReplay(drill.id, `${drill.id} ${text.title}`, r.replay)
  }, [st?.result]) // eslint-disable-line react-hooks/exhaustive-deps

  // keep the pitch framed in the part of the screen the panels leave free
  const [panelEl, setPanelEl] = useState<HTMLElement | null>(null)
  usePanelInsets(session?.view.stage, panelEl, !!st && st.phase !== 'play')
  const idx = LESSONS_ORDERED.findIndex((d) => d.id === drill.id)
  const next = LESSONS_ORDERED[idx + 1]
  const touch = isTouch()

  return (
    <GameFrame>
      <div ref={ref} className="absolute inset-0" data-testid="game-canvas" />
      {!webgl && <NoWebGL />}
      {webgl && !st && !error && <Spinner label={t('shell.loading')} />}
      <TopBar back={back} title={<>{!given && <span className="text-sun-300">{drill.id} </span>}{text.title}</>} sub={st ? t(`levels.${st.level}`) : undefined}
        right={st && <>
          <RoundButton label={`${t('shell.camera')} (${t(`shell.cams.${st.camera}`)})`} onClick={() => session!.cycleCamera()}><Camera size={19} strokeWidth={1.75} /></RoundButton>
          {st.phase === 'play' && <RoundButton label={st.paused ? t('shell.resume') : t('shell.pause')} onClick={() => session!.pause(!st.paused)} active={st.paused}>{st.paused ? <Play size={19} strokeWidth={1.75} /> : <Pause size={19} strokeWidth={1.75} />}</RoundButton>}
          <RoundButton label={t('shell.settings')} onClick={() => setSettings(true)}><Settings2 size={19} strokeWidth={1.75} /></RoundButton>
        </>} />

      {st && session && st.phase === 'brief' && (
        <Brief panelRef={setPanelEl} kicker={kicker} sheet={sheet ?? { href: sheetUrl(drill), label: t('academie.sheet') }} drill={drill} text={text} g={g} level={level} setLevel={setLevel} control={control} setControl={setControl}
          onDemo={() => { sfx('tap'); session.startDemo() }} onPlay={() => { sfx('whistle'); session.startPlay() }} />
      )}

      {st && session && st.phase === 'demo' && (
        <div ref={setPanelEl} className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
          <Panel className="w-full max-w-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-sun-300">{st.demoDone ? t('lesson.demoDone') : t('lesson.step', { n: st.demoStep, total: st.demoSteps })}</p>
              <div className="flex gap-1" aria-hidden="true">
                {Array.from({ length: st.demoSteps }, (_, i) => <span key={i} className={cx('h-1.5 w-5 rounded-full', i < st.demoStep || st.demoDone ? 'bg-sun-500' : 'bg-white/20')} />)}
              </div>
            </div>
            {!st.demoDone && <p className="mt-1.5 text-[16px] font-medium" aria-live="polite">{st.demoCaption.map((s) => stepText(t, drill, s)).join(', ')}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-outline-light btn-sm min-h-[44px]" onClick={() => session.startDemo()}><RotateCcw size={16} strokeWidth={1.75} />{t('lesson.replayDemo')}</button>
              <button type="button" className="btn-outline-light btn-sm min-h-[44px]" onClick={() => { session.loop.timeScale = session.loop.timeScale < 1 ? 1 : 0.45 }}>{t('lesson.slow')}</button>
              <button type="button" className="btn-sun btn-sm ml-auto min-h-[44px] px-5" onClick={() => { sfx('whistle'); session.startPlay() }}>{t('lesson.yourTurn')}</button>
            </div>
          </Panel>
        </div>
      )}

      {st && session && st.phase === 'play' && <PlayHud session={session} g={g} touch={touch} control={control} chain={chain} />}

      {st && session && st.phase === 'result' && st.result && (
        <Result r={st.result} drill={drill} text={text} next={given ? undefined : next} back={back}
          onRetry={() => session.startPlay()}
          onNextLevel={(l) => { setLevel(l); session.setLevel(l); session.startPlay() }}
          onNext={() => next && nav(`/jeux/code-njangi/academie/${next.id}`)}
          onBrief={() => session.showBrief()} />
      )}
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </GameFrame>
  )
}

function stepText(t: (k: string, o?: Record<string, unknown>) => string, drill: Drill, s: { kind: string; from: string; to: unknown }) {
  const spec = drill.diagram
  const label = (id: string) => spec.players?.find((p) => p.id === id)?.label ?? drill.diagram2?.players?.find((p) => p.id === id)?.label ?? id.toUpperCase()
  if (s.kind === 'pass' && typeof s.to !== 'string') return t('lesson.kinds.passSpace', { from: label(s.from) })
  return t(`lesson.kinds.${s.kind}`, { from: label(s.from), to: typeof s.to === 'string' ? label(s.to) : '' })
}

function targetText(t: (k: string, o?: Record<string, unknown>) => string, g: DrillGameplay) {
  const tg = g.target
  if (tg.kind === 'attempts') return t('lesson.target.attempts', { success: tg.success, n: tg.attempts })
  return t(`lesson.target.${tg.kind}`, { n: tg.value })
}

function Brief({ panelRef, kicker, sheet, drill, text, g, level, setLevel, control, setControl, onDemo, onPlay }: {
  panelRef: (el: HTMLElement | null) => void
  kicker?: string
  sheet: { href: string; label: string }
  drill: Drill; text: DrillText; g: DrillGameplay; level: Level; setLevel: (l: Level) => void; control: 'decisions' | 'carrier'; setControl: (c: 'decisions' | 'carrier') => void; onDemo: () => void; onPlay: () => void
}) {
  const { t } = useT('jeux')
  const [more, setMore] = useState(false)
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 p-2 sm:inset-y-0 sm:left-0 sm:right-auto sm:flex sm:w-[420px] sm:items-center sm:p-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
      <div ref={panelRef} className="w-full"><Panel className="max-h-[56vh] w-full overflow-y-auto p-4 sm:max-h-[calc(100vh-110px)] sm:p-5">
        <p className="text-[12.5px] font-semibold text-sun-300">{kicker ?? t(`academie.families.${drill.family}`)}</p>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight sm:text-[24px]">{text.title}</h1>
        {text.subtitle && <p className="mt-1 text-[14px] text-cream/65">{text.subtitle}</p>}
        <p className="mt-3 text-[13px] font-semibold text-cream/60">{t('lesson.objective')}</p>
        <p className="mt-0.5 text-[15px] leading-snug">{text.objective}</p>
        <p className="mt-3 text-[13px] font-semibold text-cream/60">{t('lesson.howToScore')}</p>
        <p className="mt-0.5 text-[15px] font-semibold text-sun-300">{targetText(t, g)}</p>
        {(more || text.rules.length <= 2) ? (
          <>
            <p className="mt-3 text-[13px] font-semibold text-cream/60">{t('lesson.rules')}</p>
            <ul className="mt-1 space-y-1 text-[14px] leading-snug text-cream/85">{text.rules.map((r, i) => <li key={i} className="flex gap-2"><span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-cream/50" />{r}</li>)}</ul>
            {g.adaptation && <><p className="mt-3 text-[13px] font-semibold text-cream/60">{t('lesson.adaptation')}</p><p className="mt-0.5 text-[13.5px] text-cream/70">{g.adaptation}</p></>}
          </>
        ) : (
          <button type="button" className="mt-2 min-h-[44px] text-[14px] font-semibold text-cream/80 underline underline-offset-4" onClick={() => setMore(true)}>{t('lesson.rules')}</button>
        )}
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-cream/60">{t('lesson.level')}</p>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t('lesson.level')}>
            {LEVELS.map((l) => (
              <button key={l} type="button" role="radio" aria-checked={level === l} onClick={() => setLevel(l)}
                className={cx('min-h-[44px] rounded-[12px] text-[14px] font-semibold', level === l ? 'bg-cream text-ink' : 'bg-white/10 hover:bg-white/15')}>{t(`levels.${l}`)}</button>
            ))}
          </div>
          <p className="mt-1.5 text-[12.5px] text-cream/55">{t(`levelHint.${level}`)}</p>
        </div>
        {g.mode !== 'pattern' && (
          <div className="mt-3">
            <p className="text-[13px] font-semibold text-cream/60">{t('lesson.control')}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={t('lesson.control')}>
              {(['decisions', 'carrier'] as const).map((c) => (
                <button key={c} type="button" role="radio" aria-checked={control === c} onClick={() => setControl(c)}
                  className={cx('min-h-[44px] rounded-[12px] px-2 text-[14px] font-semibold', control === c ? 'bg-cream text-ink' : 'bg-white/10 hover:bg-white/15')}>{t(`lesson.controls.${c}`)}</button>
              ))}
            </div>
            <p className="mt-1.5 text-[12.5px] text-cream/55">{t(`lesson.controls.${control}Hint`)}</p>
          </div>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn-outline-light flex-1" onClick={onDemo}>{t('lesson.demo')}</button>
          <button type="button" className="btn-sun flex-1" onClick={onPlay}>{t('lesson.play')}</button>
        </div>
        <a href={sheet.href} className="mt-3 inline-flex min-h-[44px] items-center gap-2 text-[14px] font-semibold text-cream/75 hover:text-cream">
          <BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />{sheet.label}
        </a>
      </Panel></div>
    </div>
  )
}

function PlayHud({ session, g, touch, control, chain }: { session: LessonSession; g: DrillGameplay; touch: boolean; control: 'decisions' | 'carrier'; chain?: boolean }) {
  const { t } = useT('jeux')
  const st = useStore(session)!
  const [tip, setTip] = useState(true)
  useEffect(() => { const k = window.setTimeout(() => setTip(false), 6000); return () => window.clearTimeout(k) }, [])
  const tg = g.target
  const hud = tg.kind === 'attempts'
    ? t('lesson.hud.attempts', { n: Math.min(st.attempts + 1, tg.attempts), total: tg.attempts, count: st.successes })
    : t(`lesson.hud.${tg.kind}`, { n: tg.kind === 'points' ? st.points : tg.kind === 'goals' ? session.scorer?.goals ?? 0 : tg.kind === 'sequences' ? session.scorer?.sequences ?? 0 : session.scorer?.regains ?? 0, target: tg.value })
  const carrierMode = control === 'carrier' && g.mode !== 'pattern'
  const hintWho = st.hint ? session.world.get(st.hint)?.label ?? st.hint : null
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-[64px] z-10 flex flex-col items-center gap-2 px-3">
        <div className="glass flex items-center gap-3 rounded-full px-4 py-2" data-testid="hud">
          <span className="text-[14px] font-semibold tabular-nums">{hud}</span>
          {st.timeLeft !== null && <span className="text-[14px] tabular-nums text-cream/70">{Math.ceil(st.timeLeft)} s</span>}
          <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-white/15" aria-hidden="true"><span className="absolute inset-y-0 left-0 rounded-full bg-sun-500 transition-[width]" style={{ width: `${Math.round(st.progress * 100)}%` }} /></span>
        </div>
        {chain && <div className="glass flex items-center gap-3 rounded-full px-4 py-1.5 text-[13.5px] tabular-nums" data-testid="chain">
          <span>{t('dix.passes', { n: st.chainPasses })}</span><span className="text-cream/50">|</span><span>{t('dix.touched', { n: st.chainTouched })}</span>
        </div>}
        {st.banner && <div className={cx('rounded-full px-5 py-2.5 text-[17px] font-semibold shadow-lg', st.banner.tone === 'good' ? 'bg-forest-600 text-white' : 'bg-clay-500 text-white')} role="status">{t(st.banner.key)}</div>}
        {hintWho && <div className="glass rounded-full px-4 py-2 text-[14px]" role="status">{t('lesson.hint', { who: hintWho })}</div>}
      </div>
      <div className="pointer-events-none absolute right-2 top-[118px] z-10 flex w-[min(300px,70vw)] flex-col items-end gap-1.5" aria-live="polite">
        {st.feed.slice(-3).map((f) => (
          <div key={f.id} className={cx('glass animate-[fadein_.25s_ease-out] rounded-[12px] px-3 py-1.5 text-right text-[13px] leading-snug', f.tone === 'good' ? 'text-cream' : 'text-clay-100')}>
            {f.points ? <span className="mr-1.5 font-bold text-sun-300">+{f.points}</span> : null}{t(f.key, f.params)}
          </div>
        ))}
      </div>
      {tip && !touch && <div className="glass pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full px-4 py-2 text-center text-[13.5px] text-cream/85">{t(carrierMode ? 'lesson.tipCarrier' : 'lesson.tipDecisions')}</div>}
      {touch && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 14px)' }}>
          {carrierMode ? <Stick label={t('keys.move')} onMove={(x, y) => session.input.touchMove(x, y)} /> : <div className="glass max-w-[60%] rounded-[14px] px-3 py-2 text-[13px] text-cream/85">{t('keys.tapMate')}</div>}
          <div className="flex items-end gap-2">
            {carrierMode && !st.ourBall && <ActionButton label={t('lesson.switch')} onDown={() => session.input.touchButton('switch', true)} onUp={() => session.input.touchButton('switch', false)} size={56} />}
            {carrierMode && !st.ourBall && <ActionButton label={t('lesson.tackle')} tone="red" onDown={() => session.input.touchButton('tackle', true)} onUp={() => session.input.touchButton('tackle', false)} />}
            {st.ourBall && st.hasGoal && <ActionButton label={t('lesson.shoot')} tone="gold" onDown={() => session.input.touchButton('shoot', true)} onUp={() => session.input.touchButton('shoot', false)} />}
            {st.ourBall && <ActionButton label={t('lesson.through')} size={56} onDown={() => session.input.touchButton('through', true)} onUp={() => session.input.touchButton('through', false)} />}
            {st.ourBall && <ActionButton label={t('lesson.pass')} size={72} onDown={() => session.input.touchButton('pass', true)} onUp={() => session.input.touchButton('pass', false)} />}
          </div>
        </div>
      )}
      {st.paused && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/45">
          <Panel className="w-[min(92vw,360px)] p-5 text-center">
            <p className="text-[20px] font-semibold">{t('shell.pause')}</p>
            <div className="mt-4 grid gap-2">
              <button type="button" className="btn-sun" onClick={() => session.pause(false)}>{t('shell.resume')}</button>
              <button type="button" className="btn-outline-light" onClick={() => { session.pause(false); session.startPlay() }}>{t('lesson.result.retry')}</button>
              <button type="button" className="btn-outline-light" onClick={() => { session.pause(false); session.showBrief() }}>{t('shell.quit')}</button>
            </div>
          </Panel>
        </div>
      )}
    </>
  )
}

function Result({ r, drill, text, next, back, onRetry, onNextLevel, onNext, onBrief }: { r: LessonResult; drill: Drill; text: DrillText; next?: Drill; back: string; onRetry: () => void; onNextLevel: (l: Level) => void; onNext: () => void; onBrief: () => void }) {
  const { t, lang } = useT('jeux')
  const { t: ta } = useT('analysis')
  const li = LEVELS.indexOf(r.level)
  const stars = r.success ? li + 1 : 0
  const nextLevel = r.success && li < 2 ? LEVELS[li + 1] : null
  return (
    <div className="absolute inset-0 z-30 grid place-items-end bg-black/35 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <Panel className="max-h-[88vh] w-full overflow-y-auto rounded-b-none p-5 sm:max-w-lg sm:rounded-[18px] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id="result-title" className="text-[24px] font-semibold leading-tight">{r.success ? t('lesson.result.success') : t('lesson.result.fail')}</p>
            <p className="mt-1 text-[14.5px] text-cream/70">{r.success ? t('lesson.result.successBody', { level: t(`levels.${r.level}`) }) : t('lesson.result.failBody')}</p>
          </div>
          <div className="flex gap-0.5 pt-1" aria-label={`${stars}/3`}>
            {[0, 1, 2].map((i) => <Star key={i} size={22} strokeWidth={1.75} className={i < stars ? 'fill-sun-500 text-sun-500' : 'text-white/25'} aria-hidden="true" />)}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label={t('lesson.result.points')} value={r.points} />
          <Stat label={r.attempts ? t('lesson.result.attempts') : t('lesson.result.goals')} value={r.attempts ? `${r.successes}/${r.attempts}` : r.goals} />
          <Stat label={t('lesson.result.time')} value={`${Math.round(r.time)} s`} />
        </div>
        <div className="mt-4 rounded-[14px] bg-white/[0.06] p-3.5">
          <p className="text-[13px] font-semibold text-cream/65">{t('lesson.result.indice')}</p>
          {r.indice ? (
            <>
              <p className="mt-0.5 text-[30px] font-semibold tabular-nums text-sun-300">{fmtNjangi(r.indice.total, lang)}</p>
              <div className="mt-1 grid grid-cols-5 gap-1 text-center text-[11.5px] text-cream/70">
                {Object.entries(r.indice.sub).map(([k, v]) => <div key={k}><div className="text-[14px] font-semibold tabular-nums text-cream">{fmtNjangi(v, lang)}</div>{ta(`sub.${k}.name`)}</div>)}
              </div>
              <p className="mt-2 text-[12px] text-cream/50">{t('lesson.result.indiceNote')}</p>
            </>
          ) : <p className="mt-1 text-[14px] text-cream/60">{t('lesson.result.indiceTooFew')}</p>}
        </div>
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-cream/65">{t('lesson.result.coaching')}</p>
          {r.mistakes.length === 0 ? (
            <p className="mt-1 flex items-center gap-2 text-[14.5px]"><CheckCircle2 size={18} strokeWidth={1.75} className="text-forest-300" aria-hidden="true" />{t('lesson.result.noMistake')}</p>
          ) : (
            <ul className="mt-1.5 space-y-2.5">
              {r.mistakes.slice(0, 3).map((m) => (
                <li key={m.mistake} className="text-[14px] leading-snug">
                  <p className="font-semibold text-clay-100">{t(`mistake.${m.mistake}`)} <span className="font-normal text-cream/50">{t('lesson.result.times', { n: m.count })}</span></p>
                  {m.coaching !== null && text.coaching[m.coaching] && <p className="mt-0.5 border-l-2 border-sun-500 pl-2.5 text-cream/85">« {text.coaching[m.coaching]} »</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" className="btn-outline-light" onClick={onRetry}><RotateCcw size={16} strokeWidth={1.75} />{t('lesson.result.retry')}</button>
          {nextLevel ? <button type="button" className="btn-sun" onClick={() => onNextLevel(nextLevel)}>{t('lesson.result.nextLevel', { level: t(`levels.${nextLevel}`) })}</button>
            : next ? <button type="button" className="btn-sun" onClick={onNext}>{t('lesson.result.nextDrill')}</button>
              : <button type="button" className="btn-sun" onClick={onBrief}>{t('lesson.demo')}</button>}
          {r.replay && <Link to={`/jeux/code-njangi/analyse?dernier=${drill.id}`} className="btn-outline-light">{t('lesson.result.replay')}</Link>}
          <Link to={back} className="btn-outline-light">{t('shell.back')}</Link>
        </div>
      </Panel>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[12px] bg-white/[0.06] px-3 py-2">
      <p className="text-[12px] text-cream/60">{label}</p>
      <p className="text-[19px] font-semibold tabular-nums">{value}</p>
    </div>
  )
}
