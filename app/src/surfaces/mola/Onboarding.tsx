import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, LoaderCircle, PlayCircle, RotateCcw, Sparkles } from 'lucide-react'
import i18n, { setLang, useT } from '../../i18n'
import { db } from '../../lib/db'
import { addPlayer, createTeam } from '../../lib/actions'
import { BRAND } from '../../lib/config'
import { useDocumentTitle } from '../../lib/hooks'
import { createProfile, seedDemo } from '../../lib/seed'
import { useSession } from '../../lib/session'
import { cx, uid } from '../../lib/util'
import { LangSwitch, Logo } from '../../ui'
import Chips from './components/Chips'
import Composer from './components/Composer'
import MolaAvatar, { TypingDots } from './components/MolaAvatar'
import ProfileCard, { fieldValue } from './components/ProfileCard'
import { parsePlayerList, type Lang } from './engine'
import { postWelcome, tm } from './executors'
import {
  AGE_GROUPS, FORMATS, POSITIONS, QUICK_CITIES, QUICK_COUNTRIES, ROLES, absorb, countryName, defaultFormat, emptyDraft, fieldsFor, goalsFor, isFieldFilled, nextStep,
  type Draft, type Field, type Step,
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
  const { ready, profile } = useSession()
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
      case 'age': case 'childAge': put('ageGroup', c.value); break
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

  const tryDemo = async () => {
    if (demoBusy) return
    setDemoBusy(true)
    try {
      await seedDemo('coach', lang)
      const p = await db.profile.get('me')
      const team = p?.activeTeamId ? await db.teams.get(p.activeTeamId) : undefined
      const players = team ? await db.players.where('teamId').equals(team.id).count() : 0
      await postWelcome({ lang, name: p?.name ?? '', role: p?.role ?? 'coach', teamName: team?.name, players, demo: true })
      clear()
      nav('/app', { replace: true })
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
      case 'team': return draft.club ? [{ label: `${draft.club}${draft.ageGroup ? ' ' + draft.ageGroup : ''}`, value: `${draft.club}${draft.ageGroup ? ' ' + draft.ageGroup : ''}` }] : []
      case 'age': return AGE_GROUPS.filter((a) => a !== 'U7' && a !== 'U21').map((a) => ({ label: a, value: a }))
      case 'childAge': return AGE_GROUPS.filter((a) => a !== 'Seniors' && a !== 'U21').map((a) => ({ label: a, value: a }))
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

  /* ---------- an existing profile: offer to go back to the app ---------- */
  if (ready && profile && !restart && !creating) {
    return (
      <Shell onDemo={tryDemo} demoBusy={demoBusy}>
        <div className="mx-auto flex max-w-lg flex-col items-center px-4 pb-16 pt-14 text-center sm:pt-24">
          <MolaAvatar size={72} />
          <h1 className="mt-5 text-[30px] font-semibold leading-tight text-ink sm:text-[36px]">{t('ob.back.title', { name: profile.name.split(' ')[0] })}</h1>
          <p className="mt-2 text-[16px] text-ink-muted">{t('ob.back.body', { app: BRAND.name })}</p>
          <div className="mt-7 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
            <Link to="/app" className="btn-primary btn-lg whitespace-nowrap">{t('ob.back.open')}<ArrowRight size={18} aria-hidden="true" /></Link>
            <button type="button" className="btn-outline btn-lg" onClick={startOver}><RotateCcw size={17} aria-hidden="true" />{t('ob.back.restart')}</button>
          </div>
          <p className="mt-4 max-w-sm text-[13px] text-ink-faint">{t('ob.back.note')}</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell onDemo={tryDemo} demoBusy={demoBusy}>
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:px-6 lg:py-6">
        <section className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col sm:h-[calc(100dvh-4rem)] lg:card lg:h-[calc(100dvh-7rem)] lg:overflow-hidden" aria-label={t('ob.chatLabel')}>
          {/* phone: the profile, collapsible */}
          <div className="border-b border-line bg-paper/80 lg:hidden">
            <button type="button" onClick={() => setCardOpen(!cardOpen)} aria-expanded={cardOpen} className={cx('flex min-h-[52px] w-full items-center gap-3 px-4 text-left', flash.length > 0 && 'mola-flash')}>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-terra-600">{t('ob.card.eyebrow')}</span>
                <span className="block truncate text-[14px] font-medium text-ink">{draft.name || t('ob.card.title')}{draft.role ? ` · ${t(`ob.roleShort.${draft.role}`)}` : ''}{draft.city ? ` · ${draft.city}` : ''}</span>
              </span>
              <span className="text-[12px] font-semibold tabular-nums text-ink-muted">{done}/{fields.length}</span>
              <ChevronDown size={18} className={cx('shrink-0 text-ink-muted transition', cardOpen && 'rotate-180')} aria-hidden="true" />
            </button>
            {cardOpen && <div className="max-h-[42dvh] overflow-y-auto px-3 pb-3"><ProfileCard draft={draft} onEdit={onEdit} flash={flash} header={<span />} /></div>}
          </div>

          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6" aria-live="polite">
            <div className="mx-auto max-w-2xl space-y-3">
              {msgs.map((m, i) => m.from === 'user' ? (
                <div key={m.id} className="mola-in flex justify-end">
                  <div className="max-w-[86%] whitespace-pre-line rounded-2xl rounded-br-md bg-forest-600 px-4 py-2.5 text-[15px] leading-relaxed text-cream">{m.text}</div>
                </div>
              ) : (
                <div key={m.id} className="mola-in flex items-start gap-2.5">
                  <span className="w-9 shrink-0">{msgs[i - 1]?.from !== 'mola' && <MolaAvatar size={36} busy={typing || creating} ring={i === 0 || msgs[i - 1]?.from === 'user'} />}</span>
                  <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-3 shadow-card">
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{m.text}</p>
                    {m.steps && (
                      <ul className="mt-2.5 space-y-1.5">
                        {m.steps.map((s, j) => (
                          <li key={j} className="flex items-center gap-2.5 text-[14px]">
                            <span className={cx('grid h-5 w-5 place-items-center rounded-full', s.done ? 'bg-forest-600 text-cream' : 'bg-sand text-ink-muted')}>
                              {s.done ? <Check size={12} strokeWidth={3} /> : <LoaderCircle size={12} className="motion-safe:animate-spin" />}
                            </span>
                            <span className={s.done ? 'text-ink-soft' : 'text-ink-muted'}>{s.label}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="mola-in flex items-center gap-2.5">
                  <span className="w-9 shrink-0"><MolaAvatar size={36} busy /></span>
                  <div className="rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-2.5 shadow-card"><TypingDots label={t('typing')} /></div>
                </div>
              )}
            </div>
          </div>

          <div className="safe-bottom border-t border-line bg-paper/95 px-4 pb-3 pt-3 sm:px-6">
            <div className="mx-auto max-w-2xl space-y-2.5">
              {!typing && step === 'goals' && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-2" role="group" aria-label={t('ob.field.goals')}>
                    {goalsFor(draft.role).map((g) => {
                      const on = goalSel.includes(g)
                      return (
                        <button key={g} type="button" aria-pressed={on} onClick={() => setGoalSel(on ? goalSel.filter((x) => x !== g) : [...goalSel, g])}
                          className={cx('inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium transition sm:min-h-[38px]', on ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-forest-300')}>
                          {on && <Check size={14} strokeWidth={3} aria-hidden="true" />}{t(`ob.goal.${g}`)}
                        </button>
                      )
                    })}
                  </div>
                  <button type="button" className="btn-primary min-h-[44px]" onClick={confirmGoals}>{goalSel.length ? t('ob.goalsOk', { count: goalSel.length }) : t('ob.later')}</button>
                </div>
              )}
              {!typing && step === 'review' && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button type="button" className="btn-primary btn-lg" onClick={finish} disabled={creating || !draft.name || !draft.role}>
                    {creating ? <LoaderCircle size={18} className="motion-safe:animate-spin" aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}{t('ob.create')}
                  </button>
                  <span className="text-[13px] text-ink-muted">{t('ob.createHint')}</span>
                </div>
              )}
              {!typing && choices.length > 0 && <Chips chips={choices.map((c) => c.label)} onSend={(label) => { const c = choices.find((x) => x.label === label); if (c) onChoice(c) }} scroll={step !== 'role' && step !== 'lang'} />}
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
          <div className="mola-noscroll sticky top-24 max-h-[calc(100dvh-7rem)] space-y-4 overflow-y-auto pb-2">
            <ProfileCard draft={draft} onEdit={onEdit} flash={flash} />
            <p className="px-1 text-[13px] leading-relaxed text-ink-muted">{t('ob.card.note')}</p>
          </div>
        </aside>
      </div>
    </Shell>
  )
}

function Shell({ children, onDemo, demoBusy }: { children: ReactNode; onDemo: () => void; demoBusy: boolean }) {
  const { t } = useT('mola')
  return (
    <div className="min-h-[100dvh] bg-cream">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <Link to="/" aria-label={BRAND.name}><Logo /></Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onDemo} disabled={demoBusy} className="btn-outline btn-sm min-h-[40px] whitespace-nowrap">
              {demoBusy ? <LoaderCircle size={15} className="motion-safe:animate-spin" aria-hidden="true" /> : <PlayCircle size={15} className="hidden min-[400px]:block" aria-hidden="true" />}{t('ob.demo')}
            </button>
            <LangSwitch />
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
