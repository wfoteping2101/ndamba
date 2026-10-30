// Mola, the action agent: understands a message (rules engine, optional LLM), asks one follow-up
// when a detail is missing, then DOES the thing through lib/actions, with steps that tick live in
// db.tasks. Anything that leaves the app (WhatsApp, SMS, e-mail, calendar file) stops in
// 'needs_approval': Mola never sends anything by itself; the person approves, then their own app opens.
import i18n from '../../i18n'
import { db } from '../../lib/db'
import {
  addPlayer, convocationText, createAutoSession, createMatch, createTeam, mailLink, matchBusyDays, sessionMinutes, smsLink, toICS, whatsappLink,
} from '../../lib/actions'
import { BOOKS, BRAND, GATES, SERIES, coachLimited } from '../../lib/config'
import { computeNjangi, fmtNjangi, njangiLabel, type NjangiResult, type SubKey } from '../../lib/njangi'
import type { AgentApproval, AgentTask, ChatMessage, Intention, MD, Match, Player, Profile, Session, SkillKey, Team } from '../../lib/types'
import { addDays, daysBetween, fmtDate, nowISO, todayISO, uid, weekStart } from '../../lib/util'
import { DRILLS, drillText, getDrill } from '../../content'
import { buildSummary } from '../analysis/components/summary'
import { allLessons, chapterHref } from '../player/lessons'
import { ACTION_INTENTS, fillSlot, missingSlot, norm, parse, type IntentId, type Lang, type Parsed, type Slots } from './engine'
import { llmParse, type LlmContext } from './llm'
import { getPending, navChip, postMessage, setBusy, setPending, sleep, type Pending, type Resume } from './store'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface TaskItem { label: string; sub?: string; route?: string; code?: string }
export interface TaskPayload {
  items?: TaskItem[]
  resultLabel?: string
  njangi?: { total: number; label: string; sub: Record<SubKey, number> }
  ics?: string
  icsName?: string
  matchId?: string
  motto?: boolean
}
/** An AgentTask with Mola's own extra data (Dexie stores the extra field as is). */
export type MolaTask = AgentTask & { payload?: TaskPayload }

export interface MolaCtx { lang: Lang; today: string; profile: Profile | null; team: Team | null }

export interface Suggestion { id: string; text: string; cta: string; request: string; intent: IntentId; slots: Slots }

/* ------------------------------------------------------------------ */
/* Language helpers                                                    */
/* ------------------------------------------------------------------ */

type TFn = (key: string, vars?: Record<string, unknown>) => string

/** Names that every Mola sentence may use: never hard-coded in the copy. */
export function brandVars(lang: Lang) {
  return {
    app: BRAND.name, tagline: BRAND.tagline[lang], motto: BRAND.motto[lang],
    series: SERIES.name, heroes: SERIES.heroes, tome1: SERIES.tomes[0]?.title ?? '', methode: BOOKS.methode.title[lang],
  }
}
export function tm(lang: Lang): TFn {
  const t = i18n.getFixedT(lang, 'mola') as unknown as (k: string, o?: object) => string
  return (key, vars = {}) => t(key, { ...brandVars(lang), ...vars })
}
const tcommon = (lang: Lang): TFn => {
  const t = i18n.getFixedT(lang, 'common') as unknown as (k: string, o?: object) => string
  return (key, vars = {}) => t(key, vars)
}
export function tList(lang: Lang, key: string): string[] {
  const t = i18n.getFixedT(lang, 'mola') as unknown as (k: string, o?: object) => unknown
  const v = t(key, { returnObjects: true, ...brandVars(lang) })
  return Array.isArray(v) ? (v as string[]) : []
}
const longDay = (iso: string, lang: Lang) => fmtDate(iso, lang, { weekday: 'long', day: 'numeric', month: 'long' })
const shortDay = (iso: string, lang: Lang) => fmtDate(iso, lang)
/** Copy rule: no em or en dashes, even in text written by the model. */
const noDashes = (s: string) => s.replace(/\s*[—–]\s*/g, ', ')
/** "au ven. 13 nov.." : an abbreviated date at the end of a sentence keeps a single period. */
export const tidy = (s: string) => s.replace(/\.\.(?=\s|$)/g, '.')

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export const currentLang = (): Lang => (i18n.language === 'en' ? 'en' : 'fr')

export async function loadCtx(): Promise<MolaCtx> {
  const profile = (await db.profile.get('me')) ?? null
  const teams = await db.teams.orderBy('createdAt').toArray()
  const team = (profile?.activeTeamId && teams.find((x) => x.id === profile.activeTeamId)) || teams[0] || null
  return { lang: currentLang(), today: todayISO(), profile, team }
}

const byDate = (a: Match, b: Match) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))
const sameName = (a: string, b: string) => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)) }

async function teamMatches(ctx: MolaCtx) {
  const all = await db.matches.toArray()
  return ctx.team ? all.filter((m) => m.teamId === ctx.team!.id) : all
}
/** The planned match the person means: by opponent, then by date, then the next one. */
async function findUpcoming(ctx: MolaCtx, slots: Slots): Promise<Match | undefined> {
  const list = (await teamMatches(ctx)).filter((m) => m.status !== 'done' && m.date >= ctx.today).sort(byDate)
  if (slots.opponent) { const m = list.find((x) => sameName(x.opponent, slots.opponent!)); if (m) return m }
  if (slots.date) { const m = list.find((x) => x.date === slots.date); if (m) return m; return undefined }
  return list[0]
}
async function playedMatches(ctx: MolaCtx) {
  return (await teamMatches(ctx)).filter((m) => m.status === 'done').sort((a, b) => byDate(b, a))
}
async function njangiOf(matchId: string): Promise<NjangiResult> {
  return computeNjangi(await db.events.where('matchId').equals(matchId).toArray())
}
const groupNum = (g?: string) => { const m = (g || '').match(/U(\d+)/i); return m ? Number(m[1]) : 99 }
const drillAge = (ages: string) => { const m = ages.match(/U(\d+)/i); return m ? Number(m[1]) : 9 }
const formatFor = (age?: string): Team['format'] => { const n = groupNum(age); return n <= 9 ? 5 : n <= 11 ? 7 : n <= 13 ? 9 : 11 }
const ageOf = (ctx: MolaCtx) => ctx.team?.ageGroup ?? ctx.profile?.ageGroup

/* ------------------------------------------------------------------ */
/* Messages and tasks                                                  */
/* ------------------------------------------------------------------ */

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const pause = (ms: number) => sleep(reduced() ? Math.min(ms, 120) : ms)

async function say(ctx: MolaCtx, key: string, vars: Record<string, unknown> = {}, extra: Partial<ChatMessage> = {}) {
  await pause(260)
  return postMessage('mola', tidy(tm(ctx.lang)(key, vars)), extra)
}
async function sayText(text: string, extra: Partial<ChatMessage> = {}) {
  await pause(260)
  return postMessage('mola', tidy(noDashes(text)), extra)
}

async function startTask(intent: IntentId, request: string, ack: string): Promise<{ task: MolaTask; msgId: string }> {
  const now = nowISO()
  const task: MolaTask = { id: uid('task_'), request, intent, status: 'running', steps: [], createdAt: now, updatedAt: now }
  await db.tasks.put(task)
  await pause(220)
  const msg = await postMessage('mola', tidy(ack), { taskId: task.id })
  return { task, msgId: msg.id }
}

/** One visible step: appears with a spinner, the work runs, then it ticks. */
async function step<R = void>(task: MolaTask, label: string, work?: () => Promise<R>): Promise<R | undefined> {
  task.steps = [...task.steps, { label, done: false }]
  await db.tasks.update(task.id, { steps: task.steps, updatedAt: nowISO() })
  const [res] = await Promise.all([work ? work() : Promise.resolve(undefined), pause(480 + Math.round(Math.random() * 280))])
  task.steps = task.steps.map((s, i) => (i === task.steps.length - 1 ? { ...s, done: true } : s))
  await db.tasks.update(task.id, { steps: task.steps, updatedAt: nowISO() })
  return res
}

async function finish(task: MolaTask, patch: Partial<MolaTask>) {
  if (patch.summary) patch.summary = tidy(patch.summary)
  Object.assign(task, { status: 'done' as const }, patch, { updatedAt: nowISO() })
  await db.tasks.put(task)
}

/** Every fifth finished task, Mola signs off with the motto. */
async function mottoTurn() { return (await db.tasks.where('status').equals('done').count()) % 5 === 4 }

async function setChips(msgId: string, chips: string[]) { if (chips.length) await db.messages.update(msgId, { chips }) }

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

const COACHY = ['coach', 'analyst', 'manager', 'federation']

export function defaultChips(lang: Lang, role?: string): string[] {
  return tList(lang, COACHY.includes(role || 'coach') ? 'chips.coach' : 'chips.player')
}

function slotChips(ctx: MolaCtx, intent: IntentId, slot: keyof Slots): string[] {
  const tc = tcommon(ctx.lang)
  if (slot === 'date') return tList(ctx.lang, 'ask.dateChips')
  if (slot === 'intention') return ['reprendre', 'progresser', 'finir', 'sortir', 'fixer', 'respirer', 'regarder-devant'].map((i) => tc(`intentions.${i}`))
  if (slot === 'md') return (['MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD+1', 'youth'] as MD[]).map((m) => tc(`md.${m}`))
  if (slot === 'name' && intent === 'create_team') {
    const c = ctx.profile?.club
    return c ? [`${c}${ctx.profile?.ageGroup ? ' ' + ctx.profile.ageGroup : ''}`] : []
  }
  return []
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

let chain: Promise<void> = Promise.resolve()

/**
 * Send a message to Mola. Requests are queued, so two quick messages never run at the same time.
 * `direct` skips understanding (one-tap suggestions already know what to do).
 */
export function askMola(text: string, direct?: { intent: IntentId; slots: Slots }) {
  const job = chain.then(() => handle(text, direct)).catch((e) => { console.error('[mola]', e) })
  chain = job
  return job
}

async function handle(text: string, direct?: { intent: IntentId; slots: Slots }) {
  const clean = text.trim().slice(0, 2000)
  if (!clean) return
  await postMessage('user', clean)
  setBusy(true)
  let ctx: MolaCtx | null = null
  try {
    ctx = await loadCtx()
    await pause(280)
    if (direct) { setPending(null); await proceed(ctx, direct.intent, direct.slots, clean); return }
    const parsed = parse(clean, { today: ctx.today, lang: ctx.lang })
    const pend = getPending()
    if (pend && (await handlePending(ctx, pend, parsed, clean))) return
    let p: Parsed & { reply?: string } = parsed
    if (parsed.intent !== 'confirm' && parsed.intent !== 'deny') {
      const l = await llmParse(clean, { lang: ctx.lang, today: ctx.today, context: await llmContext(ctx), brand: brandVars(ctx.lang) })
      if (l) p = mergeLLM(parsed, l)
    }
    await route(ctx, p, clean)
  } catch (e) {
    console.error('[mola]', e)
    await say(ctx ?? { lang: currentLang(), today: todayISO(), profile: null, team: null }, 'error')
  } finally {
    setBusy(false)
  }
}

function mergeLLM(rules: Parsed, llm: Parsed & { reply?: string }): Parsed & { reply?: string } {
  const isAction = (i: IntentId) => ACTION_INTENTS.includes(i)
  if (!isAction(llm.intent) && isAction(rules.intent) && rules.score >= 4) return rules
  if (llm.intent === rules.intent) return { ...llm, slots: { ...rules.slots, ...llm.slots } }
  return llm
}

async function llmContext(ctx: MolaCtx): Promise<LlmContext> {
  const next = await findUpcoming(ctx, {})
  const last = (await playedMatches(ctx))[0]
  return {
    teamName: ctx.team?.name, ageGroup: ageOf(ctx), role: ctx.profile?.role,
    nextMatch: next ? { opponent: next.opponent, date: next.date } : undefined,
    lastMatch: last ? { opponent: last.opponent, date: last.date } : undefined,
  }
}

const strip = (s: Slots): Slots => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && v !== '')) as Slots

function slotFilled(slot: keyof Slots, s: Slots) {
  if (slot === 'name') return !!s.name || !!s.names?.length
  if (slot === 'intention') return !!s.intention || !!s.skill
  return s[slot] !== undefined
}

async function handlePending(ctx: MolaCtx, pend: Pending, parsed: Parsed, text: string): Promise<boolean> {
  if (parsed.intent === 'deny') { setPending(null); await say(ctx, 'cancelled', {}, { chips: defaultChips(ctx.lang, ctx.profile?.role).slice(0, 4) }); return true }
  if (pend.kind === 'confirm') {
    setPending(null)
    if (parsed.intent === 'confirm' || parsed.intent === pend.intent) {
      await proceed(ctx, pend.intent, { ...pend.slots, ...(parsed.intent === pend.intent ? strip(parsed.slots) : {}) }, pend.request, pend.resume)
      return true
    }
    return false
  }
  const isNew = ACTION_INTENTS.includes(parsed.intent) && parsed.intent !== pend.intent && parsed.score >= 4
  if (isNew) { setPending(null); return false }
  const slots = { ...pend.slots, ...strip(fillSlot(pend.slot, pend.intent, text, ctx.today, ctx.lang)) }
  if (!slotFilled(pend.slot, slots)) {
    if (pend.tries >= 1) { setPending(null); await say(ctx, 'giveUp', {}, { chips: defaultChips(ctx.lang, ctx.profile?.role).slice(0, 4) }); return true }
    setPending({ ...pend, tries: pend.tries + 1 })
    await ask(ctx, pend.intent, pend.slot, true)
    return true
  }
  setPending(null)
  await proceed(ctx, pend.intent, slots, pend.request, pend.resume)
  return true
}

async function route(ctx: MolaCtx, p: Parsed & { reply?: string }, text: string) {
  switch (p.intent) {
    case 'confirm': return void (await say(ctx, 'confirmNothing', {}, { chips: defaultChips(ctx.lang, ctx.profile?.role).slice(0, 4) }))
    case 'deny': return void (await say(ctx, 'denyNothing'))
    case 'help': return help(ctx)
    case 'small_talk': return smallTalk(ctx, p.slots.talk, p.reply)
    case 'unknown':
      if (p.reply) return void (await sayText(p.reply, { chips: defaultChips(ctx.lang, ctx.profile?.role).slice(0, 4) }))
      return void (await say(ctx, 'unknown', {}, { chips: defaultChips(ctx.lang, ctx.profile?.role) }))
    default: return proceed(ctx, p.intent, strip(p.slots), text)
  }
}

/** Fill what can be guessed (the day of a session from the next match, the match of a week). */
async function enrich(ctx: MolaCtx, intent: IntentId, slots: Slots): Promise<Slots> {
  const s = { ...slots }
  if (intent === 'create_session') {
    const next = await findUpcoming(ctx, {})
    if (!s.md) {
      const day = s.date ?? ctx.today
      const d = next ? daysBetween(day, next.date) : -1
      if (d >= 1 && d <= 4) { s.md = `MD-${d}` as MD; s.date = day }
      else if (groupNum(ageOf(ctx)) <= 11) s.md = 'youth'
    } else if (!s.date) {
      const off = s.md.startsWith('MD-') ? Number(s.md.slice(3)) : 0
      if (off && next && addDays(next.date, -off) >= ctx.today) s.date = addDays(next.date, -off)
      else if (s.md === 'MD+1') { const last = (await playedMatches(ctx))[0]; if (last && addDays(last.date, 1) >= ctx.today) s.date = addDays(last.date, 1) }
    }
  }
  if (intent === 'plan_week' && !s.date) {
    const m = await findUpcoming(ctx, { opponent: s.opponent })
    if (m) { s.date = m.date; s.opponent = m.opponent }
  }
  return s
}

const NEEDS_TEAM: IntentId[] = ['setup_match', 'add_player', 'send_convocation']

async function proceed(ctx: MolaCtx, intent: IntentId, raw: Slots, request: string, resume?: Resume) {
  if (NEEDS_TEAM.includes(intent) && !ctx.team) {
    setPending({ kind: 'slot', intent: 'create_team', slots: {}, slot: 'name', request, tries: 0, resume: { intent, slots: raw, request } })
    await say(ctx, 'needTeam', {}, { chips: slotChips(ctx, 'create_team', 'name') })
    return
  }
  const slots = await enrich(ctx, intent, raw)
  const miss = missingSlot(intent, slots) ?? (intent === 'create_session' && !slots.md ? 'md' : intent === 'plan_week' && !slots.date ? 'date' : undefined)
  if (miss) {
    setPending({ kind: 'slot', intent, slots, slot: miss, request, tries: 0, resume })
    await ask(ctx, intent, miss)
    return
  }
  const run = EXEC[intent]
  if (!run) return void (await say(ctx, 'unknown', {}, { chips: defaultChips(ctx.lang, ctx.profile?.role) }))
  await run(ctx, slots, request)
  if (resume) await proceed(await loadCtx(), resume.intent, resume.slots, resume.request)
}

async function ask(ctx: MolaCtx, intent: IntentId, slot: keyof Slots, retry = false) {
  const t = tm(ctx.lang)
  const key = `ask.${intent}.${slot}`
  const q = i18n.exists(`mola:${key}`) ? t(key) : t(`ask.${slot}`)
  await sayText(retry ? `${t('askAgain')} ${q}` : q, { chips: slotChips(ctx, intent, slot) })
}

/* ------------------------------------------------------------------ */
/* Talk                                                                */
/* ------------------------------------------------------------------ */

async function help(ctx: MolaCtx) {
  const t = tm(ctx.lang)
  const lines = tList(ctx.lang, 'help.list').map((l) => `• ${l}`).join('\n')
  await sayText(`${t('help.intro')}\n${lines}\n${t('help.trust')}`, { chips: defaultChips(ctx.lang, ctx.profile?.role) })
}

async function smallTalk(ctx: MolaCtx, talk?: string, reply?: string) {
  const name = ctx.profile?.name?.split(' ')[0] ?? ''
  if (reply) return void (await sayText(reply))
  const key = `talk.${talk || 'greet'}${!name && (!talk || talk === 'greet' || talk === 'bye') ? 'Anon' : ''}`
  await say(ctx, key, { name }, { chips: talk === 'greet' || talk === 'who' ? defaultChips(ctx.lang, ctx.profile?.role).slice(0, 4) : undefined })
}

/* ------------------------------------------------------------------ */
/* Executors                                                           */
/* ------------------------------------------------------------------ */

type Exec = (ctx: MolaCtx, slots: Slots, request: string) => Promise<void>

async function sessionsGate(ctx: MolaCtx) {
  if (!coachLimited(ctx.profile?.plan)) return false
  if ((await db.sessions.count()) < GATES.sessionsFree) return false
  await say(ctx, 'gate.sessions', { n: GATES.sessionsFree }, { chips: [navChip('/app/premium', tm(ctx.lang)('gate.cta'))] })
  return true
}

const PRE: [MD, number][] = [['MD-4', 4], ['MD-3', 3], ['MD-2', 2], ['MD-1', 1]]

const planWeekExec: Exec = async (ctx, slots, request) => {
  if (await sessionsGate(ctx)) return
  const t = tm(ctx.lang), tc = tcommon(ctx.lang), lang = ctx.lang
  const match = await findUpcoming(ctx, slots)
  const matchDate = match?.date ?? slots.date!
  const opponent = match?.opponent
  const day = longDay(matchDate, lang)
  const { task, msgId } = await startTask('plan_week', request, opponent ? t('plan.ack', { opponent, day }) : t('plan.ackDate', { day }))
  await step(task, opponent ? t('plan.s.match', { opponent, day }) : t('plan.s.date', { day }))

  let intention: Intention | undefined = slots.intention
  let fromReport: string | undefined
  if (!intention) {
    const last = (await playedMatches(ctx))[0]
    if (last) {
      const r = await njangiOf(last.id)
      if (r.tagged >= 12) { intention = buildSummary(r, lang).intention; fromReport = last.opponent }
    }
  }
  const intentionLabel = intention ? tc(`intentions.${intention}`) : ''
  await step(task, intention ? (fromReport ? t('plan.s.intentionReport', { intention: intentionLabel, opponent: fromReport }) : t('plan.s.intention', { intention: intentionLabel })) : t('plan.s.noIntention'))

  const created: Session[] = []
  let kept = 0, past = 0, busyDays = 0, capped = false
  const max = coachLimited(ctx.profile?.plan) ? GATES.sessionsFree - (await db.sessions.count()) : Infinity
  await step(task, t('plan.s.build'), async () => {
    const busy = await matchBusyDays(matchDate, ctx.team?.id)
    for (const [md, off] of PRE) {
      const date = addDays(matchDate, -off)
      if (date < ctx.today) { past++; continue }
      if (busy.has(date)) { busyDays++; continue }
      if (created.length >= max) { capped = true; break }
      const exists = await db.sessions.where('date').equals(date).filter((s) => !ctx.team || s.teamId === ctx.team.id).count()
      if (exists) { kept++; continue }
      created.push(await createAutoSession({ md, date, teamId: ctx.team?.id, ageGroup: ageOf(ctx), lang, intention, createdBy: 'mola' }))
    }
  })
  await step(task, created.length ? t('plan.s.saved', { count: created.length }) : t('plan.s.nothing'))

  const parts: string[] = []
  if (created.length) {
    parts.push(t('plan.done', { count: created.length, first: shortDay(created[0].date, lang), last: shortDay(created[created.length - 1].date, lang) }))
    if (intention) parts.push(t('plan.oriented', { intention: intentionLabel }))
  } else parts.push(kept ? t('plan.already', { count: kept }) : t('plan.tooLate'))
  if (created.length && kept) parts.push(t('plan.kept', { count: kept }))
  if (past && created.length) parts.push(t('plan.past', { count: past }))
  if (busyDays) parts.push(t('plan.busy', { count: busyDays }))
  if (capped) parts.push(t('plan.capped', { n: GATES.sessionsFree }))
  await finish(task, {
    summary: parts.join(' '),
    resultRoute: `/app/semaine?w=${weekStart(created[0]?.date ?? addDays(matchDate, -1))}`,
    payload: {
      resultLabel: t('open.week'), motto: await mottoTurn(),
      items: created.map((s) => ({ label: s.title, sub: `${s.md}, ${shortDay(s.date, lang)}, ${sessionMinutes(s)} ${tc('misc.minutes')}`, route: `/app/seances/${s.id}` })),
    },
  })
  const chips = match && ctx.team ? [t('chips.sendConvocation'), t('chips.exportCalendar')] : [t('chips.exportCalendar')]
  if (!match && ctx.team) chips.unshift(t('chips.setupMatchOn', { day: shortDay(matchDate, lang) }))
  await setChips(msgId, chips)
}

const createSessionExec: Exec = async (ctx, slots, request) => {
  if (await sessionsGate(ctx)) return
  const t = tm(ctx.lang), tc = tcommon(ctx.lang), lang = ctx.lang
  const md = slots.md!
  const mdLabel = tc(`md.${md}`)
  // no date given: an MD-n session goes on the MD-n day of the next match, when that day is still ahead
  let date = slots.date
  let mdPassed = false
  if (!date) {
    const n = /^MD-(\d)$/.exec(md)?.[1]
    const next = n ? await findUpcoming(ctx, {}) : undefined
    if (n && next) { const d = addDays(next.date, -Number(n)); if (d >= ctx.today) date = d; else mdPassed = true }
  }
  date = date ?? ctx.today
  const { task, msgId } = await startTask('create_session', request, t('session.ack', { md: mdLabel, day: longDay(date, lang) }))
  await step(task, t('session.s.day', { md: mdLabel, day: shortDay(date, lang) }))
  const s = await step(task, slots.intention ? t('session.s.drillsFor', { intention: tc(`intentions.${slots.intention}`) }) : t('session.s.drills', { count: DRILLS.length }),
    () => createAutoSession({ md, date, teamId: ctx.team?.id, intention: slots.intention, ageGroup: ageOf(ctx), minutes: slots.minutes, lang, createdBy: 'mola' }))
  if (!s) throw new Error('session not created')
  const total = sessionMinutes(s)
  const codes = s.blocks.map((b) => b.drillId).filter(Boolean) as string[]
  if (codes.length) await step(task, t('session.s.picked', { list: codes.join(', ') }))
  await step(task, t('session.s.minutes', { minutes: total }))
  await step(task, t('session.s.saved'))
  const summary = [t('session.done', { title: s.title, count: s.blocks.length, minutes: total })]
  if (slots.intention) summary.push(t('session.oriented', { intention: tc(`intentions.${slots.intention}`) }))
  if (mdPassed) summary.push(t('session.mdPassed', { md }))
  await finish(task, {
    summary: summary.join(' '), resultRoute: `/app/seances/${s.id}`,
    payload: {
      resultLabel: t('open.session'), motto: await mottoTurn(),
      items: s.blocks.map((b) => {
        const d = getDrill(b.drillId)
        return { code: d?.id, label: d ? drillText(d, lang).title : b.title || '', sub: `${b.minutes} ${tc('misc.minutes')}`, route: d ? `/app/exercices/${d.id}` : undefined }
      }),
    },
  })
  await setChips(msgId, [t('chips.planWeek'), slots.intention ? t('chips.drillsIntention', { intention: tc(`intentions.${slots.intention}`) }) : t('chips.recommendExample')])
}

const setupMatchExec: Exec = async (ctx, slots, request) => {
  const t = tm(ctx.lang), tc = tcommon(ctx.lang), lang = ctx.lang
  const team = ctx.team!
  const opponent = slots.opponent!, date = slots.date!
  const dup = (await teamMatches(ctx)).find((m) => m.status !== 'done' && m.date === date && sameName(m.opponent, opponent))
  if (dup) { await say(ctx, 'match.exists', { opponent: dup.opponent, day: longDay(dup.date, lang) }, { chips: [navChip(`/app/matchs/${dup.id}`, t('open.match'))] }); return }
  // another opponent the same day: a tournament is possible, so create it, but say so
  const sameDay = (await teamMatches(ctx)).find((m) => m.status !== 'done' && m.date === date)
  const when = longDay(date, lang) + (slots.time ? ` ${t('match.at', { time: slots.time })}` : '')
  const { task, msgId } = await startTask('setup_match', request, t('match.ack', { opponent, when }))
  const m = await step(task, t('match.s.create', { opponent, when }),
    () => createMatch({ teamId: team.id, opponent, date, time: slots.time, venue: slots.venue, home: slots.home, createdBy: 'mola' }))
  if (!m) throw new Error('match not created')
  const players = await db.players.where('teamId').equals(team.id).toArray()
  const starters = m.lineup.filter((l) => l.playerId).length
  await step(task, players.length ? t('match.s.lineup', { starters, slots: m.lineup.length, formation: m.formation, subs: m.subs.length }) : t('match.s.noPlayers'))
  const captain = players.find((p) => p.id === m.captainId)
  if (captain) await step(task, t('match.s.captain', { name: captain.name }))
  await step(task, t('match.s.saved'))
  const summary = [t('match.done', { opponent, when })]
  if (slots.venue) summary.push(t('match.venue', { venue: slots.venue }))
  if (!players.length) summary.push(t('match.addPlayers'))
  if (sameDay) summary.push(t('match.sameDay', { opponent: sameDay.opponent }))
  await finish(task, {
    summary: summary.join(' '), resultRoute: `/app/matchs/${m.id}`,
    payload: { resultLabel: t('open.match'), matchId: m.id, items: [{ label: `${team.name} ${tc('app.vs')} ${opponent}`, sub: when + (slots.venue ? `, ${slots.venue}` : ''), route: `/app/matchs/${m.id}` }] },
  })
  // a natural next step, with a one-word yes
  setPending({ kind: 'confirm', intent: 'plan_week', slots: { opponent, date }, request: t('chips.planWeekFor', { opponent }) })
  await setChips(msgId, [t('chips.yesPlan'), t('chips.sendConvocation')])
}

const addPlayerExec: Exec = async (ctx, slots, request) => {
  const t = tm(ctx.lang), tc = tcommon(ctx.lang)
  const team = ctx.team!
  const names = slots.names?.length ? slots.names : [slots.name!]
  const single = names.length === 1
  const before = await db.players.where('teamId').equals(team.id).toArray()
  const { task, msgId } = await startTask('add_player', request, single ? t('player.ack', { name: names[0], team: team.name }) : t('player.ackMany', { count: names.length, team: team.name }))
  const added: Player[] = []
  await step(task, single ? t('player.s.add', { name: names[0], team: team.name }) : t('player.s.addMany', { list: names.join(', ') }), async () => {
    for (const name of names) added.push(await addPlayer({ teamId: team.id, name, number: single ? slots.number : undefined, position: single ? slots.position : undefined, birthYear: single ? slots.birthYear : undefined }))
  })
  if (single) await step(task, t('player.s.details', { number: slots.number ? `n° ${slots.number}` : t('player.noNumber'), position: tc(`positions.${added[0].position}`) }))
  const total = before.length + added.length
  await step(task, t('player.s.saved', { count: total }))
  const summary = [single ? t('player.done', { name: names[0], team: team.name, count: total }) : t('player.doneMany', { count: added.length, total })]
  const clash = single && slots.number ? before.find((p) => p.number === slots.number) : undefined
  if (clash) summary.push(t('player.numberTaken', { number: slots.number, name: clash.name }))
  if (single && !slots.position) summary.push(t('player.defaultPos', { position: tc('positions.CM') }))
  await finish(task, {
    summary: summary.join(' '), resultRoute: single ? `/app/equipe/${added[0].id}` : '/app/equipe',
    payload: { resultLabel: single ? t('open.player') : t('open.team'), items: added.map((p) => ({ label: p.name, sub: `${p.number ? `n° ${p.number}, ` : ''}${tc(`positions.${p.position}`)}`, route: `/app/equipe/${p.id}` })) },
  })
  await setChips(msgId, [t('chips.addPlayer'), t('chips.setupMatch')])
}

const createTeamExec: Exec = async (ctx, slots, request) => {
  const t = tm(ctx.lang)
  const name = slots.name!
  const ageGroup = slots.ageGroup ?? ctx.profile?.ageGroup ?? 'Seniors'
  const format = slots.format ?? formatFor(ageGroup)
  const { task, msgId } = await startTask('create_team', request, t('team.ack', { name }))
  const team = await step(task, t('team.s.create', { name, age: ageGroup, format }), () => createTeam({ name, ageGroup, format }))
  if (!team) throw new Error('team not created')
  await step(task, t('team.s.formation', { formation: team.formation }))
  await step(task, t('team.s.active'))
  await finish(task, { summary: t('team.done', { name, age: ageGroup, format, formation: team.formation }), resultRoute: '/app/equipe', payload: { resultLabel: t('open.team') } })
  await setChips(msgId, [t('chips.addPlayer'), t('chips.setupMatch')])
}

const sendConvocationExec: Exec = async (ctx, slots, request) => {
  const t = tm(ctx.lang), lang = ctx.lang
  const team = ctx.team!
  const match = await findUpcoming(ctx, slots.opponent ? { opponent: slots.opponent } : {})
  if (!match) { await say(ctx, 'convoc.noMatch', {}, { chips: [t('chips.setupMatchExample'), navChip('/app/matchs/nouveau', t('open.newMatch'))] }); return }
  const players = await db.players.where('teamId').equals(team.id).toArray()
  // the coach's own wording, when they edited the call-up while setting up the match (as on the match sheet)
  const text = (match as Match & { convocation?: string }).convocation || convocationText(match, team, players, lang)
  const channel = slots.channel ?? 'whatsapp'
  const when = longDay(match.date, lang) + (match.time ? ` ${t('match.at', { time: match.time })}` : '')
  const { task } = await startTask('send_convocation', request, t('convoc.ack', { opponent: match.opponent }))
  await step(task, t('convoc.s.match', { opponent: match.opponent, when }))
  const starters = match.lineup.filter((l) => l.playerId).length
  await step(task, starters ? t('convoc.s.lineup', { starters, subs: match.subs.length }) : t('convoc.s.noLineup'))
  await step(task, t('convoc.s.draft', { channel: t(`channel.${channel}`) }))
  task.steps = [...task.steps, { label: t('convoc.s.wait'), done: false }]
  await finish(task, {
    status: 'needs_approval', summary: t('convoc.ready'), resultRoute: `/app/matchs/${match.id}`,
    approval: { kind: 'message', channel, to: slots.to, subject: t('convoc.subject', { team: team.name, opponent: match.opponent }), text },
    payload: { matchId: match.id, resultLabel: t('open.match') },
  })
}

const exportCalendarExec: Exec = async (ctx, slots, request) => {
  const t = tm(ctx.lang), tc = tcommon(ctx.lang), lang = ctx.lang
  const range = async (monday: string) => {
    const sunday = addDays(monday, 6)
    const sessions = (await db.sessions.where('date').between(monday, sunday, true, true).toArray()).filter((s) => !ctx.team || s.teamId === ctx.team.id)
    const matches = (await teamMatches(ctx)).filter((m) => m.status !== 'done' && m.date >= monday && m.date <= sunday)
    return { monday, sunday, sessions, matches }
  }
  let w = await range(weekStart(slots.date ?? ctx.today))
  if (!slots.date && !w.sessions.length && !w.matches.length) {
    const next = await findUpcoming(ctx, {})
    if (next) w = await range(weekStart(next.date))
  }
  if (!w.sessions.length && !w.matches.length) { await say(ctx, 'calendar.empty', {}, { chips: [t('chips.planWeek')] }); return }
  const teamName = ctx.team?.name ?? BRAND.name
  const events = [
    ...w.sessions.map((s) => ({ uid: s.id, title: `${s.title} (${s.md})`, date: s.date, minutes: sessionMinutes(s) || 90, description: s.blocks.map((b) => { const d = getDrill(b.drillId); return `${d ? `${d.id} ${drillText(d, lang).title}` : b.title || ''} (${b.minutes} min)` }).join('\n') })),
    ...w.matches.map((m) => ({ uid: m.id, title: `${teamName} ${tc('app.vs')} ${m.opponent}`, date: m.date, time: m.time, minutes: m.halfMinutes * 2 + 15, location: m.venue })),
  ].sort((a, b) => a.date.localeCompare(b.date))
  const preview = events.map((e) => `${shortDay(e.date, lang)}${'time' in e && e.time ? ` ${e.time}` : ''}${lang === 'fr' ? ' :' : ':'} ${e.title}`).join('\n')
  const { task } = await startTask('export_calendar', request, t('calendar.ack', { from: shortDay(w.monday, lang), to: shortDay(w.sunday, lang) }))
  await step(task, t('calendar.s.collect', { sessions: t('calendar.nSessions', { count: w.sessions.length }), matches: t('calendar.nMatches', { count: w.matches.length }) }))
  const ics = toICS(events)
  await step(task, t('calendar.s.file', { count: events.length }))
  task.steps = [...task.steps, { label: t('calendar.s.wait'), done: false }]
  await finish(task, {
    status: 'needs_approval', summary: t('calendar.ready', { count: events.length }), resultRoute: `/app/semaine?w=${w.monday}`,
    approval: { kind: 'calendar', text: preview },
    payload: { ics, icsName: `${BRAND.name.toLowerCase()}-${w.monday}.ics`, resultLabel: t('open.week') },
  })
}

const analyzeExec: Exec = async (ctx, slots, request) => {
  const t = tm(ctx.lang), tc = tcommon(ctx.lang), lang = ctx.lang
  const played = await playedMatches(ctx)
  const m = (slots.opponent && played.find((x) => sameName(x.opponent, slots.opponent!))) || played[0]
  if (!m) { await say(ctx, 'analysis.none', {}, { chips: [navChip('/app/analyse', t('open.analysis'))] }); return }
  const events = await db.events.where('matchId').equals(m.id).toArray()
  if (!events.length) { await say(ctx, 'analysis.noTags', { opponent: m.opponent }, { chips: [navChip(`/app/matchs/${m.id}`, t('open.match')), navChip('/app/analyse', t('open.analysis'))] }); return }
  const r = computeNjangi(events)
  const prev = played.find((x) => x.id !== m.id && x.date <= m.date)
  const prevR = prev ? await njangiOf(prev.id) : null
  const oppShots = events.filter((e) => e.side === 'them' && e.code === 'SHOT').length
  const s = buildSummary(r, lang, prevR && prevR.tagged ? prevR : null, { oppShots, oppGoals: m.scoreThem })
  const score = `${m.scoreUs}-${m.scoreThem}`
  const { task, msgId } = await startTask('analyze_last_match', request, t('analysis.ack', { opponent: m.opponent }))
  await step(task, t('analysis.s.match', { opponent: m.opponent, score, day: shortDay(m.date, lang) }))
  await step(task, t('analysis.s.count', { count: r.tagged }))
  await step(task, t('analysis.s.indice', { total: fmtNjangi(r.total, lang), label: s.label }))
  await step(task, t('analysis.s.write'))
  const lines = [s.headline]
  if (s.strengths[0]) lines.push(t('analysis.strength', { text: s.strengths[0] }))
  if (s.corrections[0]) lines.push(t('analysis.correction', { text: s.corrections[0] }))
  const drillIds = (s.drills[0]?.ids ?? []).slice(0, 3)
  await finish(task, {
    summary: lines.join('\n'), resultRoute: `/app/analyse/rapport/${m.id}`,
    payload: {
      resultLabel: t('open.report'), njangi: { total: r.total, label: njangiLabel(r.total, lang), sub: r.sub },
      items: drillIds.map((id) => getDrill(id)).filter(Boolean).map((d) => ({ code: d!.id, label: drillText(d!, lang).title, sub: tc(`families.${d!.family}`), route: `/app/exercices/${d!.id}` })),
    },
  })
  const intention = tc(`intentions.${s.intention}`)
  setPending({ kind: 'confirm', intent: 'plan_week', slots: { intention: s.intention }, request: t('chips.planIntention', { intention }) })
  await setChips(msgId, [t('chips.planIntention', { intention }), t('chips.drillsIntention', { intention })])
}

const recommendDrillsExec: Exec = async (ctx, slots, request) => {
  const t = tm(ctx.lang), tc = tcommon(ctx.lang), lang = ctx.lang
  const what = slots.intention ? tc(`intentions.${slots.intention}`) : tc(`skills.${slots.skill}`)
  const { task, msgId } = await startTask('recommend_drills', request, t('drills.ack', { what }))
  await step(task, t('drills.s.search', { count: DRILLS.length, book: brandVars(lang).methode }))
  let pool = DRILLS.filter((d) => (!slots.intention || d.intentions.includes(slots.intention)) && (!slots.skill || d.skills.includes(slots.skill as SkillKey)))
  if (!pool.length && slots.intention) pool = DRILLS.filter((d) => d.intentions.includes(slots.intention!))
  const age = groupNum(ageOf(ctx))
  const fit = pool.filter((d) => drillAge(d.ages) <= age)
  const list = fit.length ? fit : pool
  const ageLabel = ageOf(ctx)
  await step(task, ageLabel && fit.length ? t('drills.s.age', { age: ageLabel, count: fit.length }) : t('drills.s.found', { count: pool.length }))
  const rank = (d: (typeof DRILLS)[number]) => (slots.intention ? (d.intentions.indexOf(slots.intention) === 0 ? 3 : 1) : 0) + (slots.skill && d.skills.includes(slots.skill as SkillKey) ? 2 : 0) + (slots.md && d.md.includes(slots.md) ? 1 : 0) - d.order / 1000
  const top = [...list].sort((a, b) => rank(b) - rank(a)).slice(0, 3)
  await step(task, top.length ? t('drills.s.top', { count: top.length }) : t('drills.s.none'))
  await finish(task, {
    summary: top.length ? t('drills.done', { count: top.length, what }) : t('drills.empty'),
    resultRoute: slots.intention ? `/app/exercices?i=${slots.intention}` : '/app/exercices',
    payload: {
      resultLabel: t('open.drills'),
      items: top.map((d) => { const x = drillText(d, lang); return { code: d.id, label: x.title, sub: `${tc(`families.${d.family}`)}, ${d.minutes} ${tc('misc.minutes')}, ${d.ages}`, route: `/app/exercices/${d.id}` } }),
    },
  })
  const chips = slots.intention ? [t('chips.sessionIntention', { intention: what })] : []
  await setChips(msgId, [...chips, t('chips.planWeek')])
}

const openLessonExec: Exec = async (ctx, slots, request) => {
  const t = tm(ctx.lang), lang = ctx.lang
  const no = slots.lessonNo ?? slots.chapterNo
  const list = allLessons(lang)
  const l = no ? list.find((x) => x.no === no) : undefined
  if (no && !l) { await say(ctx, 'lesson.notFound', { no, count: list.length }, { chips: [navChip('/app/joueur/lecons', t('open.lessons'))] }); return }
  const { task } = await startTask('open_lesson', request, l ? t('lesson.ack', { no }) : t('lesson.ackAll'))
  await step(task, l ? t('lesson.s.find', { no, chapter: l.chapterTitle }) : t('lesson.s.all', { count: list.length }))
  const toChapter = !!slots.chapterNo && slots.book !== 'methode'
  await finish(task, {
    summary: l ? t('lesson.done', { no: l.no, title: l.title, chapter: l.chapterTitle }) : t('lesson.doneAll', { count: list.length }),
    resultRoute: l ? (toChapter ? chapterHref(l.no) : `/app/joueur/lecons?n=${l.no}#lecon-${l.no}`) : '/app/joueur/lecons',
    payload: {
      resultLabel: l && toChapter ? t('open.chapter') : t('open.lesson'),
      items: l ? [
        { label: t('lesson.item', { no: l.no, title: l.title }), sub: l.lines[0], route: `/app/joueur/lecons?n=${l.no}#lecon-${l.no}` },
        { label: t('lesson.readChapter', { no: l.no }), sub: l.chapterTitle, route: chapterHref(l.no) },
      ] : [],
    },
  })
}

const openBookExec: Exec = async (ctx, slots, request) => {
  const t = tm(ctx.lang), lang = ctx.lang
  const ch = slots.chapterNo !== undefined ? `#ch-${String(slots.chapterNo).padStart(2, '0')}` : ''
  const book = slots.book
  const title = book === 'tome1' ? BOOKS.tome1.title[lang] : book === 'methode' ? BOOKS.methode.title[lang] : ''
  const { task } = await startTask('open_book', request, book ? t('book.ack', { title }) : t('book.ackAll'))
  await step(task, book ? (ch ? t('book.s.chapter', { no: slots.chapterNo, title }) : t('book.s.find', { title })) : t('book.s.all'))
  await finish(task, {
    summary: book ? t(`book.done.${book}`) : t('book.done.all'),
    resultRoute: book === 'tome1' ? BOOKS.tome1.href + ch : book === 'methode' ? BOOKS.methode.href + ch : '/app/livres',
    payload: { resultLabel: book ? t('open.read') : t('open.books') },
  })
}

const EXEC: Partial<Record<IntentId, Exec>> = {
  plan_week: planWeekExec, create_session: createSessionExec, setup_match: setupMatchExec, add_player: addPlayerExec, create_team: createTeamExec,
  send_convocation: sendConvocationExec, export_calendar: exportCalendarExec, analyze_last_match: analyzeExec, recommend_drills: recommendDrillsExec,
  open_lesson: openLessonExec, open_book: openBookExec,
}

/* ------------------------------------------------------------------ */
/* Approvals: nothing leaves the app without the person's yes          */
/* ------------------------------------------------------------------ */

/** The link that opens the person's own app with the text ready. Nothing is sent from here. */
export function approvalHref(a: AgentApproval): string | undefined {
  if (a.kind !== 'message') return undefined
  if (a.channel === 'sms') return smsLink(a.text, a.to || '')
  if (a.channel === 'email') return mailLink(a.subject || '', a.text, a.to || '')
  if (a.channel === 'whatsapp') return whatsappLink(a.text, a.to || undefined)
  return undefined
}

export async function saveApproval(taskId: string, patch: Partial<AgentApproval>) {
  const task = (await db.tasks.get(taskId)) as MolaTask | undefined
  if (!task?.approval || task.status !== 'needs_approval') return
  await db.tasks.update(taskId, { approval: { ...task.approval, ...patch }, updatedAt: nowISO() })
}

/** Called right after the person approved and their app was opened (or the file downloaded). */
export async function markApproved(taskId: string, final: AgentApproval) {
  const task = (await db.tasks.get(taskId)) as MolaTask | undefined
  if (!task || task.status !== 'needs_approval') return
  const lang = currentLang()
  const t = tm(lang)
  const how = final.kind === 'calendar' ? 'calendar' : final.channel || 'copy'
  const steps = task.steps.map((s, i) => (i === task.steps.length - 1 && !s.done ? { label: t(`approval.step.${how}`), done: true } : s))
  await db.tasks.update(taskId, { status: 'done', steps, approval: final, summary: t(`approval.summary.${how}`), updatedAt: nowISO() })
  await sayText(t(`approval.after.${how}`))
}

export async function cancelTask(taskId: string) {
  const task = (await db.tasks.get(taskId)) as MolaTask | undefined
  if (!task || (task.status !== 'needs_approval' && task.status !== 'running')) return
  const t = tm(currentLang())
  const steps = task.steps.map((s, i) => (i === task.steps.length - 1 && !s.done ? { label: t('approval.step.cancelled'), done: true } : s))
  await db.tasks.update(taskId, { status: 'cancelled', steps, summary: t('approval.summary.cancelled'), updatedAt: nowISO() })
  await sayText(t('approval.after.cancelled'))
}

/* ------------------------------------------------------------------ */
/* Greetings, welcome, proactive suggestions                          */
/* ------------------------------------------------------------------ */

let greeting = false
/** First visit of the hub with an empty thread: Mola says hello. */
export async function ensureGreeting() {
  if (greeting) return
  greeting = true
  try {
    const n = await db.messages.where('thread').equals('mola').count()
    if (n) return
    const ctx = await loadCtx()
    const name = ctx.profile?.name?.split(' ')[0] ?? ''
    await postMessage('mola', tm(ctx.lang)(name ? 'greetingName' : 'greeting', { name }), { chips: defaultChips(ctx.lang, ctx.profile?.role) })
  } finally { greeting = false }
}

/** The warm hello saved in the Mola thread at the end of onboarding (or when the demo opens). */
export async function postWelcome(opts: { lang: Lang; name: string; role: Profile['role']; teamName?: string; players?: number; demo?: boolean }) {
  const t = tm(opts.lang)
  const first = opts.name.split(' ')[0]
  const coachy = COACHY.includes(opts.role)
  const key = opts.demo ? 'welcome.demo' : coachy ? (opts.teamName ? 'welcome.coachTeam' : 'welcome.coach') : opts.role === 'parent' ? 'welcome.parent' : 'welcome.player'
  const text = t(key, { name: first, team: opts.teamName ?? '', count: opts.players ?? 0 })
  await postMessage('mola', text, { chips: defaultChips(opts.lang, opts.role).slice(0, 4) })
}

/** One-tap ideas when the hub opens, from the person's real data. At most two. */
export async function proactive(ctx: MolaCtx): Promise<Suggestion[]> {
  const t = tm(ctx.lang), lang = ctx.lang
  const out: Suggestion[] = []
  if (!ctx.team) {
    if (COACHY.includes(ctx.profile?.role ?? 'coach')) out.push({ id: 'team', text: t('pro.team'), cta: t('pro.teamCta'), request: t('chips.createTeam'), intent: 'create_team', slots: {} })
    return out
  }
  const next = await findUpcoming(ctx, {})
  const tasks = (await db.tasks.toArray()) as MolaTask[]
  if (next) {
    const d = daysBetween(ctx.today, next.date)
    if (d >= 0 && d <= 6) {
      const from = addDays(next.date, -4), to = addDays(next.date, -1)
      const n = (await db.sessions.where('date').between(from, to, true, true).toArray()).filter((s) => s.teamId === ctx.team!.id).length
      const day = d === 0 ? t('pro.today') : d === 1 ? t('pro.tomorrow') : fmtDate(next.date, lang, { weekday: 'long' })
      if (!n && d >= 2) out.push({ id: `plan_${next.id}`, text: t('pro.plan', { opponent: next.opponent, day }), cta: t('pro.planCta'), request: t('chips.yesPlan'), intent: 'plan_week', slots: { opponent: next.opponent, date: next.date } })
      const sent = tasks.some((x) => x.intent === 'send_convocation' && x.payload?.matchId === next.id && x.status !== 'cancelled')
      if (!sent && d <= 4) out.push({ id: `convoc_${next.id}`, text: t('pro.convoc', { opponent: next.opponent, day }), cta: t('pro.convocCta'), request: t('chips.sendConvocation'), intent: 'send_convocation', slots: { opponent: next.opponent } })
    }
  }
  const last = (await playedMatches(ctx))[0]
  if (last && daysBetween(last.date, ctx.today) <= 7 && out.length < 2) {
    const asked = tasks.some((x) => x.intent === 'analyze_last_match' && x.resultRoute?.endsWith(last.id))
    const tagged = await db.events.where('matchId').equals(last.id).count()
    if (!asked && tagged) out.push({ id: `analyse_${last.id}`, text: t('pro.analyse', { opponent: last.opponent, score: `${last.scoreUs}-${last.scoreThem}` }), cta: t('pro.analyseCta'), request: t('chips.analyse'), intent: 'analyze_last_match', slots: { opponent: last.opponent } })
  }
  return out.slice(0, 2)
}
