import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronDown, LoaderCircle, Play, RotateCcw } from 'lucide-react'
import { MolaMark } from '../../ui/brand'
import i18n, { setLang, useT } from '../../i18n'
import { db } from '../../lib/db'
import { addPlayer, createTeam } from '../../lib/actions'
import { BRAND } from '../../lib/config'
import { useDocumentTitle } from '../../lib/hooks'
import { createProfile, seedDemo, type DemoLevel } from '../../lib/seed'
import { useSession } from '../../lib/session'
import { cx, uid } from '../../lib/util'
import { LangSwitch, Logo, Modal } from '../../ui'
import Chips from './components/Chips'
import Composer from './components/Composer'
import MolaAvatar, { TypingDots } from './components/MolaAvatar'
import PassSteps from './components/PassSteps'
import ProfileCard, { fieldValue, levelLabel } from './components/ProfileCard'
import { parsePlayerList, type Lang } from './engine'
import { postWelcome, tm } from './executors'
import {
  CHILD_LEVELS, FORMATS, LEVEL_CHOICES, POSITIONS, QUICK_CITIES, QUICK_COUNTRIES, ROLES, absorb, countryName, defaultFormat, emptyDraft, fieldsFor, goalsFor, isFieldFilled, nextStep,
  teamNameFor, type Draft, type Field, type Step,
} from './onboarding'
import { sleep } from './store'
import './components/mola.css'

interface ObStep { label: string; done: boolean }
interface ObMsg { id: string; from: 'mola' | 'user'; text: string; steps?: ObStep[] }
interface Saved { draft: Draft; msgs: ObMsg[]; step: Step }
interface Choice { label: string; value: string }

const KEY = 'mola.onboarding.v1'
const load = (): Saved | null => { try { const v = sessionStorage.getItem(KEY); return v ? (JSON.parse(v) as Saved) : null } catch { return null } }
const save = (s: Saved) => { try { sessionStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode */ } }
const clear = () => { try { sessionStorage.removeItem(KEY) } catch { /* private mode */ } }

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** The field each step fills (for the ack: everything learned beyond the question asked). */
const STEP_FIELD: Partial<Record<Step, Field>> = { lang: 'lang', name: 'name', role: 'role', team: 'teamName', age: 'ageGroup', childAge: 'ageGroup', format: 'format', players: 'players', position: 'position', club: 'club', org: 'club', city: 'city', country: 'country', goals: 'goals' }

export default function Onboarding() {
  const { t, lang } = useT('mola')
  useDocumentTitle(t('ob.docTitle'))
  const nav = useNavigate()
  const { ready, profile, teams } = useSession()
  const saved = useRef(load()).current
  const [draft, setDraft] = useState<Draft>(saved?.draft ?? emptyDraft())
  const [msgs, setMsgs] = useState<ObMsg[]>(saved?.msgs ?? [])
  const [step, setStep] = useState<Step>(saved?.step ?? 'lang')
  const [typing, setTyping] = useState(false)
  const [flash, setFlash] = useState<Field[]>([])
  const [cardOpen, setCardOpen] = useState(false)
  const [goalSel, setGoalSel] = useState<string[]>(saved?.draft.goals ?? [])
  const [creating, setCreating] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)
  const [restart, setRestart] = useState(false)
  // after a demo is seeded, wait until the session sees it before opening /app (or /app sends us back here)
  const [goApp, setGoApp] = useState(false)
  useEffect(() => { if (goApp && ready && profile) { setGoApp(false); nav('/app', { replace: true }) } }, [goApp, ready, profile]) // eslint-disable-line react-hooks/exhaustive-deps
  const queue = useRef<Promise<void>>(Promise.resolve())
  const scroller = useRef<HTMLDivElement>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft

  useEffect(() => { save({ draft, msgs, step }) }, [draft, msgs, step])
  useLayoutEffect(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight }, [msgs, typing, step])

  const L = (d: Draft = draftRef.current): Lang => d.lang ?? lang
  const tl = (d?: Draft) => tm(L(d))

  /** Mola's bubbles, one by one, with the typing dots in between. */
  const molaSay = useCallback((texts: string[]) => {
    queue.current = queue.current.then(async () => {
      // the dots stay on for the whole batch, so the question always comes last
      setTyping(true)
      for (const text of texts) {
        await sleep(reducedMotion() ? 120 : Math.min(1100, 380 + text.length * 9))
        setMsgs((m) => [...m, { id: uid('ob_'), from: 'mola', text }])
      }
      setTyping(false)
    })
    return queue.current
  }, [])

  const question = (s: Step, d: Draft, again = false) => {
    const tt = tl(d)
    const name = d.name?.split(' ')[0] ?? ''
    const keys = [`ob.q.${s}${again ? 'Again' : ''}_${d.role}`, `ob.q.${s}${again ? 'Again' : ''}`, `ob.q.${s}_${d.role}`, `ob.q.${s}`]
    const key = keys.find((k) => i18n.exists(`mola:${k}`, { lng: L(d) })) ?? `ob.q.${s}`
    return tt(key, { name, team: d.teamName ?? '' })
  }

  // first visit: Mola says hello in both languages (once, even under StrictMode)
  const greeted = useRef(false)
  useEffect(() => {
    if (msgs.length || (ready && profile && !restart)) return
    if (!ready || greeted.current) return
    greeted.current = true
    const first: Lang = lang
    const other: Lang = first === 'fr' ? 'en' : 'fr'
    molaSay([tm(first)('ob.hello'), `${tm(first)('ob.q.lang')}\n${tm(other)('ob.q.lang')}`])
  }, [ready, profile, restart]) // eslint-disable-line react-hooks/exhaustive-deps

  const flashFields = (f: Field[]) => { if (!f.length) return; setFlash(f); setTimeout(() => setFlash([]), 1900) }

  /** After an answer: acknowledge what Mola learned beyond the question, then ask the next one. */
  const advance = (prev: Step, d: Draft, learned: Field[], understood: boolean) => {
    const next = nextStep(d)
    const tt = tl(d)
    const out: string[] = []
    if (prev === 'lang' && learned.includes('lang')) out.push(tt('ob.langOk'))
    let extra = learned.filter((f) => f !== STEP_FIELD[prev] && f !== 'lang')
    // "Coton Sport U15" already says the club and the category; "Garoua (Cameroun)" reads better than two items
    if (extra.includes('teamName')) extra = extra.filter((f) => f !== 'club' && !(f === 'ageGroup' && d.ageGroup && d.teamName?.includes(d.ageGroup)))
    if (extra.length) {
      const vals = extra.filter((f) => !(f === 'country' && extra.includes('city'))).map((f) => {
        if (f === 'role') return tt(`ob.roleShort.${d.role}`)
        if (f === 'city' && extra.includes('country') && d.country) return `${d.city} (${countryName(d.country, L(d))})`
        return fieldValue(tt, L(d), f, d)
      }).filter(Boolean)
      if (vals.length) out.push(tt('ob.ack', { list: vals.join(', ') }))
    }
    if (prev === 'players' && learned.includes('players')) out.push(tt('ob.playersAck', { count: d.players.length }))
    if (!understood) out.push(`${tt('ob.retry')} ${question(prev, d)}`)
    else if (next === 'review') out.push(tt('ob.q.review', { name: d.name?.split(' ')[0] ?? '' }))
    else out.push(question(next, d, next === prev))
    setStep(next)
    if (next === 'goals') setGoalSel(d.goals.length ? d.goals : [])
    if (next === 'review') setCardOpen(true)
    molaSay(out)
  }

  const apply = (prev: Step, d: Draft, learned: Field[], understood: boolean) => {
    setDraft(d)
    flashFields(learned)
    if (learned.includes('lang') && d.lang && d.lang !== i18n.language) setLang(d.lang)
    advance(prev, d, learned, understood)
  }

  const onText = (text: string) => {
    if (creating) return
    setMsgs((m) => [...m, { id: uid('ob_'), from: 'user', text }])
    const r = absorb(draftRef.current, step, text)
    apply(step, r.draft, r.learned, r.understood)
  }

  /** A chip carries a value: no parsing needed. */
  const onChoice = (c: Choice) => {
    if (creating) return
    setMsgs((m) => [...m, { id: uid('ob_'), from: 'user', text: c.label }])
    const d: Draft = { ...draftRef.current, skipped: { ...draftRef.current.skipped } }
    const learned: Field[] = []
    const put = (f: Field, v: unknown) => { (d as unknown as Record<string, unknown>)[f] = v; learned.push(f) }
    if (c.value === '__skip') d.skipped[step] = true
    else switch (step) {
      case 'lang': put('lang', c.value); break
      case 'role': put('role', c.value); break
      case 'team': put('teamName', c.value); break
      case 'age': case 'childAge':
        put('ageGroup', c.value)
        // professional football is eleven against eleven: a coach of a pro team is not asked the format
        if (c.value === 'Pro' && !d.format && d.role !== 'player' && d.role !== 'parent') put('format', 11)
        break
      case 'format': put('format', Number(c.value)); break
      case 'position': put('position', c.value); break
      case 'city': { const r = absorb(d, 'city', c.value); apply(step, r.draft, r.learned, true); return }
      case 'country': put('country', c.value); break
      default: { const r = absorb(d, step, c.value); apply(step, r.draft, r.learned, r.understood); return }
    }
    apply(step, d, learned, true)
  }

  const confirmGoals = () => {
    const d: Draft = { ...draftRef.current, goals: goalSel, skipped: { ...draftRef.current.skipped, goals: true } }
    const tt = tl(d)
    setMsgs((m) => [...m, { id: uid('ob_'), from: 'user', text: goalSel.length ? goalSel.map((g) => tt(`ob.goal.${g}`)).join(', ') : tt('ob.later') }])
    apply('goals', d, goalSel.length ? ['goals'] : [], true)
  }

  /** A correction from the profile card. */
  const onEdit = (f: Field, value: unknown) => {
    const d: Draft = { ...draftRef.current, skipped: { ...draftRef.current.skipped } }
    if (f === 'players') d.players = typeof value === 'string' ? parsePlayerList(value) : d.players
    else if (f === 'goals') { d.goals = value as string[]; setGoalSel(d.goals) }
    else (d as unknown as Record<string, unknown>)[f] = value
    if (f === 'lang' && typeof value === 'string') setLang(value as Lang)
    setDraft(d)
    flashFields([f])
    // the question on screen is answered by the correction: move on
    const next = nextStep(d)
    if (step !== 'review' && next !== step) {
      setStep(next)
      if (next === 'review') setCardOpen(true)
      molaSay([next === 'review' ? tl(d)('ob.q.review', { name: d.name?.split(' ')[0] ?? '' }) : question(next, d)])
    }
  }

  // keep the profile language in step with the FR / EN switch once it has been chosen
  useEffect(() => { if (draftRef.current.lang && draftRef.current.lang !== lang) setDraft((d) => ({ ...d, lang })) }, [lang])

  const finish = async () => {
    const d = draftRef.current
    if (!d.name || !d.role || creating) return
    setCreating(true)
    const l = L(d)
    const tt = tm(l)
    const steps: ObStep[] = [{ label: tt('ob.make.profile'), done: false }]
    const coachTeam = d.role === 'coach' && !!d.teamName
    if (coachTeam) steps.push({ label: tt('ob.make.team', { team: d.teamName }), done: false })
    if (coachTeam && d.players.length) steps.push({ label: tt('ob.make.players', { count: d.players.length }), done: false })
    steps.push({ label: tt('ob.make.mola'), done: false })
    const id = uid('ob_')
    setMsgs((m) => [...m, { id, from: 'mola', text: tt('ob.make.title'), steps: [...steps] }])
    const tick = async (i: number) => { await sleep(reducedMotion() ? 80 : 520); steps[i] = { ...steps[i], done: true }; setMsgs((m) => m.map((x) => (x.id === id ? { ...x, steps: [...steps] } : x))) }
    try {
      let i = 0
      await createProfile({ name: d.name, role: d.role, lang: l, country: countryName(d.country, l) || undefined, city: d.city, club: d.club, ageGroup: d.ageGroup, position: d.position, goals: d.goals })
      await tick(i++)
      let teamName: string | undefined
      if (coachTeam) {
        const team = await createTeam({ name: d.teamName!, ageGroup: d.ageGroup ?? 'Seniors', format: d.format ?? defaultFormat(d.ageGroup) })
        teamName = team.name
        await tick(i++)
        if (d.players.length) { for (const p of d.players) await addPlayer({ teamId: team.id, name: p.name, number: p.number, position: p.position }); await tick(i++) }
      }
      await postWelcome({ lang: l, name: d.name, role: d.role, teamName, players: d.players.length })
      await tick(i++)
      clear()
      setLang(l)
      await sleep(reducedMotion() ? 100 : 650)
      nav('/app', { replace: true })
    } catch (e) {
      console.error('[mola onboarding]', e)
      setCreating(false)
      molaSay([tt('error')])
    }
  }

  // a demo replaces what this browser holds: ask first when the person has their own teams (as on the home page)
  const [pendingDemo, setPendingDemo] = useState<DemoLevel | null>(null)
  const askDemo = (level: DemoLevel) => {
    if (demoBusy) return
    if (profile && teams.some((tm) => !DEMO_IDS.includes(tm.id))) { setPendingDemo(level); return }
    void tryDemo(level)
  }
  const demoDialog = (
    <Modal open={!!pendingDemo} onClose={() => !demoBusy && setPendingDemo(null)} title={t('site:landing.demoModal.title')}
      footer={<>
        <button type="button" className="btn-ghost" onClick={() => setPendingDemo(null)} disabled={demoBusy}>{t('common:actions.cancel')}</button>
        <button type="button" className="btn-primary" disabled={demoBusy} onClick={() => pendingDemo && tryDemo(pendingDemo)}>
          {demoBusy ? <LoaderCircle size={16} className="motion-safe:animate-spin" /> : <Play size={16} />}
          {demoBusy ? t('site:landing.demoModal.busy') : t('site:landing.demoModal.confirm')}
        </button>
      </>}>
      <p className="text-[15px] text-ink-soft">{t('site:landing.demoModal.body', { demo: t(`site:demo.${pendingDemo ?? 'pro'}.team`) })}</p>
    </Modal>
  )

  const tryDemo = async (level: DemoLevel) => {
    if (demoBusy) return
    setDemoBusy(true)
    try {
      await seedDemo('coach', lang, level)
      const p = await db.profile.get('me')
      const team = p?.activeTeamId ? await db.teams.get(p.activeTeamId) : undefined
      const players = team ? await db.players.where('teamId').equals(team.id).count() : 0
      await postWelcome({ lang, name: p?.name ?? '', role: p?.role ?? 'coach', teamName: team?.name, players, demo: true })
      clear()
      setGoApp(true)
    } catch (e) { console.error('[demo]', e); setDemoBusy(false) }
  }

  const startOver = () => {
    clear()
    setDraft(emptyDraft()); setMsgs([]); setStep('lang'); setGoalSel([]); setRestart(true)
  }

  /* ---------- choices under the conversation ---------- */
  const tt = tm(lang)
  const choices = ((): Choice[] => {
    switch (step) {
      case 'lang': return [{ label: tm('fr')('ob.langName.fr'), value: 'fr' }, { label: tm('en')('ob.langName.en'), value: 'en' }]
      case 'role': return ROLES.map((r) => ({ label: t(`common:roles.${r}`), value: r }))
      case 'team': return draft.club ? [{ label: teamNameFor(draft.club, draft.ageGroup), value: teamNameFor(draft.club, draft.ageGroup) }] : []
      case 'age': return LEVEL_CHOICES.map((a) => ({ label: levelLabel(tt, a), value: a }))
      case 'childAge': return CHILD_LEVELS.map((a) => ({ label: a, value: a }))
      case 'format': return FORMATS.map((n) => ({ label: tt('ob.formatLabel', { n }), value: String(n) }))
      case 'players': return [{ label: tt('ob.later'), value: '__skip' }]
      case 'position': return [...POSITIONS.map((p) => ({ label: t(`common:positions.${p}`), value: p })), { label: tt('ob.skip'), value: '__skip' }]
      case 'club': return [{ label: tt(draft.role === 'player' ? 'ob.noClub' : 'ob.skip'), value: '__skip' }]
      case 'org': return [{ label: tt('ob.skip'), value: '__skip' }]
      case 'city': return [...QUICK_CITIES.map((c) => ({ label: c, value: c })), { label: tt('ob.skip'), value: '__skip' }]
      case 'country': return [...QUICK_COUNTRIES.map((c) => ({ label: countryName(c, lang), value: c })), { label: tt('ob.skip'), value: '__skip' }]
      default: return []
    }
  })()

  const fields = fieldsFor(draft.role)
  const done = fields.filter((f) => isFieldFilled(f, draft)).length

  const summary = [draft.role ? t(`ob.roleShort.${draft.role}`) : '', draft.teamName || draft.club || '', draft.city || ''].filter(Boolean).join(', ')
  const grid = step === 'role' || step === 'lang'

  /* ---------- an existing profile: offer to go back to the app ---------- */
  if (ready && profile && !restart && !creating) {
    return (
      <Shell onDemo={askDemo} demoBusy={demoBusy} dialog={demoDialog}>
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 pb-16 pt-16 text-center sm:pt-28">
          <MolaAvatar size={76} />
          <h1 className="mt-6 text-[32px] text-ink sm:text-[40px]">{t('ob.back.title', { name: profile.name.split(' ')[0] })}</h1>
          <p className="mt-3 text-[16px] text-ink-muted">{t('ob.back.body', { app: BRAND.name })}</p>
          <div className="mt-8 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
            <Link to="/app" className="btn-primary btn-lg whitespace-nowrap">{t('ob.back.open')}</Link>
            <button type="button" className="btn-outline btn-lg sm:whitespace-nowrap" onClick={startOver}><RotateCcw size={17} strokeWidth={1.75} aria-hidden="true" />{t('ob.back.restart')}</button>
          </div>
          <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">{t('ob.back.note')}</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell onDemo={askDemo} demoBusy={demoBusy} dialog={demoDialog}>
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-12 lg:px-6">
        <section className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col sm:h-[calc(100dvh-4rem)]" aria-label={t('ob.chatLabel')}>
          {/* phone: the licence, folded */}
          <div className="border-b border-line bg-paper lg:hidden">
            <button type="button" onClick={() => setCardOpen(!cardOpen)} aria-expanded={cardOpen} className={cx('flex min-h-[58px] w-full items-center gap-3 px-4 text-left', flash.length > 0 && 'mola-flash')}>
              <ProgressRing value={done} max={fields.length} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-ink">{draft.name || t('ob.card.eyebrow')}</span>
                <span className="block truncate text-[13px] text-ink-muted first-letter:uppercase">{summary || t('ob.card.title')}</span>
              </span>
              <span className="text-[12.5px] font-semibold tabular-nums text-ink-muted">{t('ob.card.count', { done, total: fields.length })}</span>
              <ChevronDown size={18} className={cx('shrink-0 text-ink-muted transition', cardOpen && 'rotate-180')} aria-hidden="true" />
            </button>
            {cardOpen && <div className="max-h-[46dvh] overflow-y-auto border-t border-line"><ProfileCard draft={draft} onEdit={onEdit} flash={flash} bare className="rounded-none border-0" /></div>}
          </div>

          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-6 sm:px-6 lg:px-0 lg:pt-10" aria-live="polite">
            <div className="mx-auto max-w-[680px]">
              <div className="mb-8 flex items-center gap-4 border-b border-line pb-6">
                <MolaAvatar size={56} />
                <div className="min-w-0">
                  <div className="font-display text-[28px] leading-none text-ink">{t('name')}</div>
                  <p className="mt-2 text-[14.5px] leading-snug text-ink-muted">{t('ob.intro', { app: BRAND.name })}</p>
                </div>
              </div>

              <div>
                {msgs.map((m, i) => {
                  const grouped = msgs[i - 1]?.from === m.from
                  if (m.from === 'user') return (
                    <div key={m.id} className={cx('mola-in flex justify-end', i === 0 ? '' : grouped ? 'mt-1.5' : 'mt-5')}>
                      <div className="max-w-[82%] whitespace-pre-line rounded-[18px] rounded-br-[6px] bg-forest-600 px-4 py-2.5 text-[15px] leading-relaxed text-cream">{m.text}</div>
                    </div>
                  )
                  const firstOpen = m.steps ? m.steps.findIndex((s) => !s.done) : -1
                  return (
                    <div key={m.id} className={cx('mola-in flex items-start gap-3', i === 0 ? '' : grouped ? 'mt-2' : 'mt-5')}>
                      <span className="w-8 shrink-0">{!grouped && <MolaAvatar size={32} ring={false} />}</span>
                      <div className="min-w-0 max-w-[62ch] flex-1 pt-[5px]">
                        <p className="whitespace-pre-line text-[16px] leading-[1.6] text-ink">{m.text}</p>
                        {m.steps && <PassSteps className="mt-3" steps={m.steps.map((s, j) => ({ label: s.label, state: s.done ? 'done' : j === firstOpen ? 'running' : 'todo' }))} />}
                      </div>
                    </div>
                  )
                })}
                {typing && (
                  <div className={cx('mola-in flex items-center gap-3', msgs.length && 'mt-5')}>
                    <span className="w-8 shrink-0"><MolaAvatar size={32} busy /></span>
                    <TypingDots label={t('typing')} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="safe-bottom border-t border-line bg-cream px-4 pb-3 pt-3 sm:px-6 lg:px-0 lg:pb-6">
            <div className="mx-auto max-w-[680px] space-y-2.5">
              {!typing && step === 'goals' && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('ob.field.goals')}>
                    {goalsFor(draft.role).map((g) => {
                      const on = goalSel.includes(g)
                      return (
                        <button key={g} type="button" aria-pressed={on} onClick={() => setGoalSel(on ? goalSel.filter((x) => x !== g) : [...goalSel, g])}
                          className={cx('inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium transition sm:min-h-[40px]', on ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-forest-300')}>
                          {on && <Check size={14} strokeWidth={3} aria-hidden="true" />}{t(`ob.goal.${g}`)}
                        </button>
                      )
                    })}
                  </div>
                  <button type="button" className="btn-primary min-h-[44px]" onClick={confirmGoals}>{goalSel.length ? t('ob.goalsOk', { count: goalSel.length }) : t('ob.later')}</button>
                </div>
              )}
              {!typing && step === 'review' && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <button type="button" className="btn-sun btn-lg" onClick={finish} disabled={creating || !draft.name || !draft.role}>
                    {creating ? <LoaderCircle size={18} className="motion-safe:animate-spin" aria-hidden="true" /> : <MolaMark size={19} ball="#0B5D3B" aria-hidden="true" />}{t('ob.create')}
                  </button>
                  <span className="text-[13.5px] text-ink-muted">{t('ob.createHint')}</span>
                </div>
              )}
              {!typing && choices.length > 0 && (grid ? (
                <div className={cx('grid gap-2', step === 'role' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2')} role="group" aria-label={question(step, draft)}>
                  {choices.map((c) => (
                    <button key={c.value} type="button" onClick={() => onChoice(c)} disabled={creating}
                      className="flex min-h-[48px] items-center rounded-xl border border-line bg-paper px-3.5 py-2 text-left text-[14.5px] font-medium leading-snug text-ink transition hover:border-forest-500 hover:bg-forest-50/40">
                      {c.label}
                    </button>
                  ))}
                </div>
              ) : <Chips chips={choices.map((c) => c.label)} onSend={(label) => { const c = choices.find((x) => x.label === label); if (c) onChoice(c) }} scroll />)}
              {!creating && (
                <Composer onSend={onText} multiline={step === 'players'} autoFocus={typeof window !== 'undefined' && window.innerWidth >= 1024}
                  placeholder={t(step === 'players' ? 'ob.ph.players' : step === 'review' ? 'ob.ph.review' : 'ob.ph.default')}
                  hint={step === 'players' ? t('ob.playersHint') : undefined}
                  label={t('composer.label')} sendLabel={t('composer.send')} id="ob-input" />
              )}
            </div>
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="mola-noscroll sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto pb-6 pt-10">
            <ProfileCard draft={draft} onEdit={onEdit} flash={flash} />
            <p className="mt-4 px-1 text-[13.5px] leading-relaxed text-ink-muted">{t('ob.card.note')}</p>
          </div>
        </aside>
      </div>
    </Shell>
  )
}

/** How much of the licence is filled, as a small ring (phone bar). */
function ProgressRing({ value, max }: { value: number; max: number }) {
  const r = 12, c = 2 * Math.PI * r, f = max ? value / max : 0
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className="-rotate-90 shrink-0">
      <circle cx="15" cy="15" r={r} fill="none" stroke="#ECEFE8" strokeWidth="3.5" />
      <circle cx="15" cy="15" r={r} fill="none" stroke="#0B5D3B" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${c * f} ${c}`} className="transition-all duration-500" />
    </svg>
  )
}

const DEMO_IDS = ['team_etoile', 'team_lionceaux'] // the two demo teams (see DEMO_TEAM_IDS on the site)

function Shell({ children, onDemo, demoBusy, dialog }: { children: ReactNode; onDemo: (level: DemoLevel) => void; demoBusy: boolean; dialog?: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-cream">
      <header className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <Link to="/" aria-label={BRAND.name}><Logo size="sm" className="sm:hidden" /><Logo className="hidden sm:inline-flex" /></Link>
          <div className="flex items-center gap-2">
            <DemoChoice onDemo={onDemo} busy={demoBusy} />
            <LangSwitch />
          </div>
        </div>
      </header>
      {children}
      {dialog}
    </div>
  )
}

/** The two demos: side by side from 640 px, in a small menu on phones. */
function DemoChoice({ onDemo, busy }: { onDemo: (level: DemoLevel) => void; busy: boolean }) {
  const { t } = useT('mola')
  const [open, setOpen] = useState(false)
  const [which, setWhich] = useState<DemoLevel | null>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const off = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', off)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc) }
  }, [open])
  const choose = (level: DemoLevel) => { setOpen(false); setWhich(level); onDemo(level) }
  const spin = <LoaderCircle size={15} className="motion-safe:animate-spin" aria-hidden="true" />
  return (
    <>
      <div className="hidden items-center gap-1 sm:flex">
        {(['pro', 'youth'] as const).map((lv) => (
          <button key={lv} type="button" onClick={() => choose(lv)} disabled={busy} title={t(`ob.demos.${lv}.body`)} className="btn-ghost btn-sm min-h-[40px] whitespace-nowrap px-3 text-[13.5px]">
            {busy && which === lv && spin}{t(`ob.demos.${lv}.cta`)}
          </button>
        ))}
      </div>
      <div ref={box} className="relative sm:hidden">
        <button type="button" onClick={() => setOpen(!open)} disabled={busy} aria-expanded={open} aria-haspopup="menu" className="btn-outline btn-sm min-h-[40px] whitespace-nowrap">
          {busy && spin}{t('ob.demo')}
          <ChevronDown size={14} className={cx('transition', open && 'rotate-180')} aria-hidden="true" />
        </button>
        {open && (
          <div role="menu" aria-label={t('ob.demoMenu')} className="absolute right-0 top-[calc(100%+6px)] z-40 w-[min(18.5rem,calc(100vw-2rem))] overflow-hidden rounded-[14px] border border-line bg-paper p-1 shadow-lift">
            {(['pro', 'youth'] as const).map((lv) => (
              <button key={lv} type="button" role="menuitem" onClick={() => choose(lv)} className="block w-full rounded-[10px] px-3 py-2.5 text-left hover:bg-sand">
                <span className="block text-[14.5px] font-semibold text-ink">{t(`ob.demos.${lv}.cta`)}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{t(`ob.demos.${lv}.body`)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
