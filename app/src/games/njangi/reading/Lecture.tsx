// Mode C, Lecture du jeu: « Que prépare ta passe ? » The game freezes on a real situation, the
// player names the intention, then picks the receiver; the geometry of the lanes and the book's
// triggers give the verdict, then the action is played out.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Camera, Check as CheckIcon, ChevronRight, RotateCcw, Settings2, X } from 'lucide-react'
import { useT } from '../../../i18n'
import { useDocumentTitle } from '../../../lib/hooks'
import { cx } from '../../../lib/util'
import { GameFrame, NoWebGL, Panel, RoundButton, SettingsSheet, Spinner, TopBar, hasWebGL, useMounted, usePanelInsets, useStore } from '../../shared/ui'
import { logAttempt } from '../../shared/save'
import { methodeChapter } from '../links'
import { INTENTIONS, type Intention } from './judge'
import { LectureSession } from './LectureSession'

export default function Lecture() {
  const { t, lang } = useT('jeux')
  useDocumentTitle(t('lecture.title'))
  const webgl = useMemo(() => hasWebGL(), [])
  const [base] = useState(() => Math.floor(Date.now() / 86_400_000) % 997)
  const { ref, inst: s, error } = useMounted((el) => (webgl ? new LectureSession(el, base, lang) : null), [webgl])
  const st = useStore(s)
  const [settings, setSettings] = useState(false)
  const [panel, setPanel] = useState<HTMLElement | null>(null)
  usePanelInsets(s?.view.stage, panel, !!st && st.phase !== 'outcome')
  useEffect(() => {
    if (!s || !(import.meta.env.DEV || location.search.includes('e2e'))) return
    ;(window as unknown as { __lecture?: LectureSession }).__lecture = s
  }, [s])
  // keyboard: 1 to 5 for the intentions, then the player numbers, T to shoot, Enter to go on
  useEffect(() => {
    if (!s) return
    const k = (e: KeyboardEvent) => {
      const st2 = s.state
      if (st2.phase === 'intention' && /^Digit[1-5]$/.test(e.code)) s.chooseIntention(INTENTIONS[+e.code.slice(5) - 1])
      else if (st2.phase === 'receiver' && /^Digit[1-9]$/.test(e.code)) s.answerByNumber(+e.code.slice(5))
      else if (st2.phase === 'receiver' && e.code === 'KeyT') s.answer('shot')
      else if (e.code === 'Enter') { if (st2.phase === 'verdict') s.next(); else if (st2.phase === 'intro') s.start() }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [s])
  // save the series
  useEffect(() => {
    if (st?.phase !== 'summary') return
    logAttempt({ game: 'njangi', key: 'lecture', at: Date.now(), level: 'normal', success: st.score >= st.max * 0.6, points: st.score, indice: null, mistakes: st.answers.filter((a) => !a.valid).map((a) => `intention:${a.intention}`) })
  }, [st?.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GameFrame>
      <div ref={ref} className="absolute inset-0" data-testid="game-canvas" />
      {!webgl && <NoWebGL />}
      {webgl && !st && !error && <Spinner label={t('shell.loading')} />}
      <TopBar back="/jeux/code-njangi" title={t('lecture.title')} sub={st && st.phase !== 'intro' && st.phase !== 'summary' ? t('lecture.progress', { n: st.index + 1, total: st.total, score: st.score }) : undefined}
        right={st && <>
          <RoundButton label={t('shell.camera')} onClick={() => s!.cycleCamera()}><Camera size={19} strokeWidth={1.75} /></RoundButton>
          <RoundButton label={t('shell.settings')} onClick={() => setSettings(true)}><Settings2 size={19} strokeWidth={1.75} /></RoundButton>
        </>} />

      {st && s && (
        <div ref={setPanel} className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-2 sm:p-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}>
          {st.phase === 'intro' && (
            <Panel className="w-full max-w-xl p-5">
              <p className="text-[13px] font-semibold text-sun-300">{t('lecture.eyebrow')}</p>
              <h1 className="mt-1 text-[24px] font-semibold leading-tight">{t('lecture.question')}</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-cream/80">{t('lecture.intro')}</p>
              <ol className="mt-3 space-y-1 text-[14px] text-cream/80">
                <li>1. {t('lecture.step1')}</li><li>2. {t('lecture.step2')}</li><li>3. {t('lecture.step3')}</li>
              </ol>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" className="btn-sun" onClick={() => s.start()}>{t('lecture.start')}</button>
                <a href={methodeChapter(5)} className="inline-flex min-h-[44px] items-center gap-2 px-2 text-[14px] font-semibold text-cream/75 hover:text-cream"><BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />{t('lecture.chapter')}</a>
              </div>
            </Panel>
          )}

          {(st.phase === 'intention' || st.phase === 'receiver') && (
            <Panel className="w-full max-w-2xl p-4">
              <p className="text-[12.5px] text-cream/60">{st.drillTitle}</p>
              <p className="mt-0.5 text-[17px] font-semibold">{st.phase === 'intention' ? t('lecture.askIntention') : t('lecture.askReceiver', { intention: t(`intentions.${st.intention}.name`) })}</p>
              <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5" role="radiogroup" aria-label={t('lecture.askIntention')}>
                {INTENTIONS.map((i, k) => (
                  <button key={i} type="button" role="radio" aria-checked={st.intention === i} onClick={() => s.chooseIntention(i)}
                    className={cx('flex min-h-[52px] flex-col items-start justify-center rounded-[12px] px-3 py-1.5 text-left', st.intention === i ? 'bg-cream text-ink' : 'bg-white/10 hover:bg-white/15', k === 4 && 'col-span-2 sm:col-span-1')}>
                    <span className="text-[14.5px] font-semibold">{t(`intentions.${i}.name`)}</span>
                    <span className={cx('text-[11.5px] leading-tight', st.intention === i ? 'text-ink-muted' : 'text-cream/55')}>{t(`intentions.${i}.short`)}</span>
                  </button>
                ))}
              </div>
              {st.phase === 'receiver' && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="text-[13.5px] text-cream/75">{t('lecture.tapHint')}</p>
                  {st.reading?.shot && <button type="button" className="btn-sun btn-sm min-h-[44px]" onClick={() => s.answer('shot')}>{t('lecture.shoot')}</button>}
                </div>
              )}
            </Panel>
          )}

          {st.phase === 'verdict' && st.verdict && st.reading && (
            <Panel className="max-h-[52vh] w-full max-w-2xl overflow-y-auto p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[19px] font-semibold">{t(`lecture.grade.${st.verdict.points}`)}</p>
                  <p className="text-[13.5px] text-cream/65">{t('lecture.points', { count: st.verdict.points, max: st.verdict.max })}</p>
                </div>
                <div className="flex gap-1 pt-1" aria-hidden="true">{[0, 1, 2, 3].map((i) => <span key={i} className={cx('h-2 w-6 rounded-full', i < st.verdict!.points ? 'bg-sun-500' : 'bg-white/15')} />)}</div>
              </div>
              <ul className="mt-2 grid gap-1 text-[14px] sm:grid-cols-2">
                <Check ok={st.verdict.intentionOk} label={t('lecture.check.intention')} />
                <Check ok={st.verdict.intentionBest} label={t('lecture.check.best', { best: t(`intentions.${st.reading.best}.name`) })} />
                <Check ok={st.verdict.serves} label={t('lecture.check.serves')} />
                <Check ok={st.verdict.laneOpen} label={t('lecture.check.lane')} />
              </ul>
              <ul className="mt-2 space-y-1 text-[14px] leading-snug text-cream/85">
                {st.verdict.notes.map((n, i) => <li key={i}>{t(`lecture.notes.${n.key}`, { ...n.params, best: n.params?.best ? t(`intentions.${n.params.best}.name`) : '', who: n.params?.who ?? '' })}</li>)}
              </ul>
              <p className="mt-2 border-l-2 border-sun-500 pl-2.5 text-[13.5px] text-cream/75">{t(`intentions.${st.reading.best}.book`)}</p>
              <p className="mt-1 text-[12px] text-cream/50">{t('lecture.legend')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-outline-light btn-sm min-h-[44px]" onClick={() => s.playOutcome()}>{t('lecture.playOut')}</button>
                <button type="button" className="btn-sun btn-sm ml-auto min-h-[44px] px-5" onClick={() => s.next()}>{st.index + 1 >= st.total ? t('lecture.finish') : t('lecture.next')}<ChevronRight size={16} strokeWidth={1.75} /></button>
              </div>
            </Panel>
          )}

          {st.phase === 'summary' && (
            <Panel className="w-full max-w-xl p-5">
              <p className="text-[13px] font-semibold text-sun-300">{t('lecture.summaryEyebrow')}</p>
              <p className="mt-1 text-[26px] font-semibold tabular-nums">{t('lecture.summaryScore', { n: st.score, max: st.max })}</p>
              <p className="mt-1 text-[14.5px] text-cream/75">{t(st.score >= st.max * 0.75 ? 'lecture.summaryHigh' : st.score >= st.max * 0.5 ? 'lecture.summaryMid' : 'lecture.summaryLow')}</p>
              <IntentionTable answers={st.answers} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-sun" onClick={() => s.restart(Math.floor(Math.random() * 997))}><RotateCcw size={16} strokeWidth={1.75} />{t('lecture.again')}</button>
                <Link to="/jeux/code-njangi" className="btn-outline-light">{t('shell.back')}</Link>
              </div>
            </Panel>
          )}
        </div>
      )}
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </GameFrame>
  )
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={cx('grid h-5 w-5 place-items-center rounded-full', ok ? 'bg-forest-500 text-white' : 'bg-clay-500 text-white')}>{ok ? <CheckIcon size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2.5} />}</span>
      <span className={ok ? 'text-cream' : 'text-cream/70'}>{label}</span>
    </li>
  )
}

function IntentionTable({ answers }: { answers: { intention: Intention; best: Intention; points: number; valid: boolean }[] }) {
  const { t } = useT('jeux')
  const rows = INTENTIONS.map((i) => {
    const asked = answers.filter((a) => a.best === i)
    return { i, asked: asked.length, found: asked.filter((a) => a.intention === i).length }
  }).filter((r) => r.asked)
  return (
    <table className="mt-3 w-full text-left text-[14px]">
      <thead><tr className="text-[12px] text-cream/55"><th className="py-1 font-semibold">{t('lecture.table.intention')}</th><th className="py-1 text-right font-semibold">{t('lecture.table.found')}</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.i} className="border-t border-white/10"><td className="py-1.5">{t(`intentions.${r.i}.name`)}</td><td className="py-1.5 text-right tabular-nums">{r.found} / {r.asked}</td></tr>)}</tbody>
    </table>
  )
}
