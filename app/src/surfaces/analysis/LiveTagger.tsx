import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Check, ChevronRight, CircleHelp, Eye, Flag, Keyboard, ListOrdered, Maximize, Minus, Pause, Play, Plus, Settings2, Trash2, Undo2, WifiOff, X,
} from 'lucide-react'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useT } from '../../i18n'
import { cx, fmtClock } from '../../lib/util'
import { uid } from '../../lib/util'
import type { EventCode, Match, MatchEvent, Player, Team } from '../../lib/types'
import { computeNjangi, fmtNjangi, njangiLabel, SUB_KEYS, type NjangiResult } from '../../lib/njangi'
import { buzz, defFor, fmtPct, GROUP_ORDER, shortTeam, halfLength, isTyping, matchSeconds, minuteLabel, shortKey, tagFromKey, TAGS, type GroupId, type LiveKey, type TagDef } from './components/codes'
import { secondsOf, useClock, type Half } from './components/clock'
import { Sheet } from './components/Sheet'
import { useMedia } from './components/data'
import { SubBars } from './components/charts'
import { ObserveSheet } from '../team/components/journey/Entries' // Parcours: observe players during the match

/* ------------------------------------------------------------------ layout of the tag grid */

interface Block { group: GroupId; rows: LiveKey[][] }
type Line = Block[]

const PHONE: Line[] = [
  [{ group: 'possession', rows: [['PASS_OK', 'PASS_LOST'], ['PROG', 'LINE']] }],
  [{ group: 'danger', rows: [['FINAL3', 'BOX'], ['SHOT', 'SHOT_IN', 'GOAL']] }],
  [{ group: 'transition', rows: [['LOSS', 'REGAIN5', 'REGAIN']] }],
  [{ group: 'fixation', rows: [['FIX2', 'SWITCH']] }, { group: 'opponent', rows: [['OPP_SHOT', 'OPP_GOAL']] }],
]
const DESKTOP: Line[] = [
  [{ group: 'possession', rows: [['PASS_OK', 'PASS_LOST', 'PROG', 'LINE']] }],
  [{ group: 'danger', rows: [['FINAL3', 'BOX', 'SHOT', 'SHOT_IN', 'GOAL']] }],
  [{ group: 'fixation', rows: [['FIX2', 'SWITCH']] }, { group: 'transition', rows: [['LOSS', 'REGAIN5', 'REGAIN']] }],
  [{ group: 'opponent', rows: [['OPP_SHOT', 'OPP_GOAL']] }],
]
const OPP_EXTRA: LiveKey[] = ['OPP_PASS', 'OPP_PASS_LOST', 'OPP_FINAL3']
const WEIGHT: Partial<Record<LiveKey, number>> = { PASS_OK: 1.35 }
// on phones the fixation pair shares a line with the opponent pair: give the long labels more room
const PHONE_WEIGHT: Partial<Record<LiveKey, number>> = { ...WEIGHT, FIX2: 1.2, SWITCH: 1.3, OPP_SHOT: 0.85, OPP_GOAL: 0.85 }
const LOSS_WINDOW = 5000
const STRIP_MS = 2500

const groupDot: Record<GroupId, string> = { possession: 'bg-forest-300', danger: 'bg-sun-500', fixation: 'bg-terra-500', transition: 'bg-clay-300', opponent: 'bg-ink-faint' }

interface Prefs { attribution: boolean; oppMode: boolean }
const PREFS_KEY = 'njangi.live.prefs'
const loadPrefs = (): Prefs => { try { return { attribution: true, oppMode: false, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } } catch { return { attribution: true, oppMode: false } } }

/* ------------------------------------------------------------------ page */

export default function LiveTagger() {
  const { id = '' } = useParams()
  const { t } = useT('analysis')
  const match = useLiveQuery<Match | null | undefined>(async () => (await db.matches.get(id)) ?? null, [id], undefined)
  useDocumentTitle(t('live.title'))
  if (match === undefined) return <div className="grid h-[100dvh] place-items-center bg-night-900"><div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-sun-500" /></div>
  if (match === null) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-night-900 px-6 text-center text-cream">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t('live.notFound')}</h1>
          <p className="mt-2 text-cream/70">{t('live.notFoundBody')}</p>
          <Link to="/app/analyse" className="btn-sun mt-6">{t('live.back')}</Link>
        </div>
      </div>
    )
  }
  return <Tagger match={match} />
}

/* ------------------------------------------------------------------ the tagger */

function Tagger({ match }: { match: Match }) {
  const { t, lang } = useT('analysis')
  const navigate = useNavigate()
  const desktop = useMedia('(min-width: 1024px)')
  const events = useLiveQuery(() => db.events.where('matchId').equals(match.id).toArray(), [match.id], [] as MatchEvent[])
  const players = useLiveQuery(() => db.players.where('teamId').equals(match.teamId).toArray(), [match.teamId], [] as Player[])
  const team = useLiveQuery<Team | undefined>(() => db.teams.get(match.teamId), [match.teamId], undefined)
  const clock = useClock(match.id)
  const result = useMemo(() => computeNjangi(events), [events])
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const savePrefs = (p: Prefs) => { setPrefs(p); try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)) } catch { /* private */ } }

  const [sheet, setSheet] = useState<null | 'log' | 'help' | 'end' | 'settings' | 'panel' | 'observe'>(null)
  const [flash, setFlash] = useState<{ key: LiveKey; n: number } | null>(null)
  const [toast, setToast] = useState<{ text: string; n: number; tone?: 'ok' | 'sun' } | null>(null)
  const [lossUntil, setLossUntil] = useState(0)
  const [strip, setStrip] = useState<{ createdAt: string; until: number; label: string } | null>(null)
  const [now, setNow] = useState(Date.now())
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const lastMs = useRef(0)
  const headerRef = useRef<HTMLElement>(null)
  const flashN = useRef(0)

  // squad for player attribution: lineup order, then subs (falls back to the whole team)
  const squad = useMemo(() => {
    const byId = new Map(players.map((p) => [p.id, p]))
    const byNum = (a: Player, b: Player) => (a.number ?? 99) - (b.number ?? 99)
    const pick = (ids: (string | undefined)[]) => (ids.filter(Boolean) as string[]).map((i) => byId.get(i)).filter(Boolean) as Player[]
    const starters = pick(match.lineup.map((l) => l.playerId)).sort(byNum)
    const subs = pick(match.subs).filter((p) => !starters.includes(p)).sort(byNum)
    const list = [...starters, ...subs]
    return list.length ? list : [...players].sort(byNum)
  }, [players, match.lineup, match.subs])
  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  const counts = useMemo(() => {
    const m = new Map<LiveKey, number>()
    for (const e of events) { const k = shortKey(e.code, e.side) as LiveKey; m.set(k, (m.get(k) ?? 0) + 1) }
    return m
  }, [events])

  // timers: loss window and attribution strip
  const lossActive = lossUntil > now
  useEffect(() => {
    if (!lossActive && !strip) return
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [lossActive, strip])
  useEffect(() => { if (strip && strip.until <= now) setStrip(null) }, [strip, now])
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(null), 1400); return () => window.clearTimeout(id) }, [toast])
  useEffect(() => {
    const on = () => setOnline(navigator.onLine)
    window.addEventListener('online', on); window.addEventListener('offline', on)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', on) }
  }, [])

  // keep the screen awake while the clock runs
  useEffect(() => {
    if (!clock.state.running) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const req = async () => { try { if ('wakeLock' in navigator) { lock = await navigator.wakeLock.request('screen'); if (cancelled) lock.release() } } catch { /* refused */ } }
    req()
    const vis = () => { if (document.visibilityState === 'visible') req() }
    document.addEventListener('visibilitychange', vis)
    return () => { cancelled = true; document.removeEventListener('visibilitychange', vis); try { lock?.release() } catch { /* already */ } }
  }, [clock.state.running])

  const label = useCallback((k: LiveKey | 'NOTE') => t(`short.${k}`), [t])

  /* ---- record a tap ---- */
  const record = useCallback(async (def: TagDef) => {
    const tnow = Date.now()
    const ms = Math.max(tnow, lastMs.current + 1)
    lastMs.current = ms
    const createdAt = new Date(ms).toISOString()
    const inWindow = lossUntil > tnow
    let code: EventCode = def.code
    let shownKey: LiveKey = def.key
    if (def.key === 'REGAIN' && inWindow) { code = 'REGAIN5'; shownKey = 'REGAIN5' }
    const codes: EventCode[] = code === def.code ? [code, ...(def.implies ?? [])] : [code]
    const half = clock.state.half
    const sec = Math.round(secondsOf(clock.state, tnow))
    const evs: MatchEvent[] = codes.map((c) => ({ id: uid('ev_'), matchId: match.id, half, t: sec, code: c, side: def.side, createdAt }))

    // feedback first: it must feel instant
    buzz(code === 'GOAL' ? [40, 60, 40] : def.negative ? [18] : 12)
    flashN.current += 1
    setFlash({ key: shownKey, n: flashN.current })
    const mins = minuteLabel(half, sec, match.halfMinutes)
    setToast({ text: `${label(shownKey)} · ${mins}${def.implies?.length && code === def.code ? ` · ${t('live.autoAdded')}` : ''}`, n: flashN.current, tone: shownKey === 'REGAIN5' && def.key === 'REGAIN' ? 'sun' : 'ok' })
    if (def.side === 'us' && (code === 'LOSS' || code === 'PASS_LOST')) setLossUntil(tnow + LOSS_WINDOW)
    else if (def.side === 'us' && (code === 'REGAIN5' || code === 'REGAIN')) setLossUntil(0)
    if (prefs.attribution && def.side === 'us' && squad.length) setStrip({ createdAt, until: tnow + STRIP_MS, label: label(shownKey) })
    else setStrip(null)
    setNow(tnow)

    await db.events.bulkAdd(evs)
    if (code === 'GOAL') await db.matches.where('id').equals(match.id).modify((m) => { if (def.side === 'us') m.scoreUs += 1; else m.scoreThem += 1 })
    if (match.status === 'planned') await db.matches.update(match.id, { status: 'live' })
  }, [clock.state, lossUntil, match.id, match.halfMinutes, match.status, prefs.attribution, squad.length, label, t])

  const assign = useCallback(async (p: Player) => {
    if (!strip) return
    const ca = strip.createdAt
    setStrip(null)
    buzz(8)
    setToast({ text: t('live.assigned', { n: p.number ?? p.name }), n: Date.now() })
    await db.events.where('matchId').equals(match.id).filter((e) => e.createdAt === ca && e.side === 'us').modify({ playerId: p.id })
  }, [strip, match.id, t])

  const undo = useCallback(async () => {
    if (!events.length) { setToast({ text: t('live.nothingToUndo'), n: Date.now() }); return }
    const last = events.reduce((a, e) => (e.createdAt > a ? e.createdAt : a), '')
    const group = events.filter((e) => e.createdAt === last)
    buzz([10, 40, 10])
    setStrip(null)
    if (group.some((e) => (e.code === 'LOSS' || e.code === 'PASS_LOST') && e.side === 'us')) setLossUntil(0)
    setToast({ text: `${t('live.undone')} · ${label(shortKey(group[0].code, group[0].side) as LiveKey)}`, n: Date.now() })
    await db.events.bulkDelete(group.map((e) => e.id))
    const goals = group.filter((e) => e.code === 'GOAL')
    if (goals.length) await db.matches.where('id').equals(match.id).modify((m) => { for (const g of goals) { if (g.side === 'us') m.scoreUs = Math.max(0, m.scoreUs - 1); else m.scoreThem = Math.max(0, m.scoreThem - 1) } })
  }, [events, match.id, t, label])

  const removeOne = useCallback(async (e: MatchEvent) => {
    await db.events.delete(e.id)
    if (e.code === 'GOAL') await db.matches.where('id').equals(match.id).modify((m) => { if (e.side === 'us') m.scoreUs = Math.max(0, m.scoreUs - 1); else m.scoreThem = Math.max(0, m.scoreThem - 1) })
  }, [match.id])

  /* ---- keyboard ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet || isTyping(e) || e.repeat) return
      if (e.code === 'Space') { e.preventDefault(); clock.toggle(); return }
      if (e.key === 'Backspace' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') || e.key.toLowerCase() === 'u') { e.preventDefault(); undo(); return }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'j') { setSheet('log'); return }
      if (k === 'h' || e.key === '?') { setSheet('help'); return }
      const def = tagFromKey(e)
      if (def && (!def.optional || prefs.oppMode)) { e.preventDefault(); record(def) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet, clock, undo, record, prefs.oppMode])

  const endMatch = async (us: number, them: number) => {
    clock.pause()
    await db.matches.update(match.id, { status: 'done', scoreUs: us, scoreThem: them })
    navigate(`/app/analyse/rapport/${match.id}`)
  }

  /* ---- render ---- */
  const half = clock.state.half
  const sec = clock.seconds
  const len = halfLength(half, match.halfMinutes) * 60
  const added = sec > len ? sec - len : 0
  const shown = matchSeconds(half, sec, match.halfMinutes)
  const lines = (desktop ? DESKTOP : PHONE).map((l) => l.map((b) => (b.group === 'opponent' && prefs.oppMode && desktop ? { ...b, rows: [[...b.rows[0], ...OPP_EXTRA]] } : b)))
  if (prefs.oppMode && !desktop) lines.push([{ group: 'opponent', rows: [OPP_EXTRA] }])
  const lossLeft = Math.max(0, (lossUntil - now) / 1000)
  const teamName = team?.name ?? t('live.us')
  const lastEvents = useMemo(() => [...events].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), [events])

  const tagButton = (k: LiveKey) => {
    const def = TAGS.find((x) => x.key === k)!
    const Icon = def.icon
    const isRegain = k === 'REGAIN' && lossActive
    const n = counts.get(k) ?? 0
    return (
      <button key={k} type="button" onClick={() => record(def)} aria-label={`${label(k)}${desktop ? ` (${def.kbd})` : ''}`} title={t(`help.${k}`)}
        style={{ flexGrow: (desktop ? WEIGHT : PHONE_WEIGHT)[k] ?? 1, flexBasis: 0 }}
        className={cx('relative flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-1.5 py-2 font-semibold shadow-[inset_0_-3px_0_rgba(0,0,0,.18)] transition-transform active:scale-[0.97]',
          def.btn, isRegain && 'ring-4 ring-sun-300 ring-offset-2 ring-offset-night-900')}>
        {flash?.key === k && <span key={flash.n} className="nj-flash pointer-events-none absolute inset-0 rounded-2xl bg-white" />}
        <Icon size={desktop ? 24 : 22} strokeWidth={2.4} aria-hidden="true" />
        <span lang={lang} className={cx('max-w-full text-center leading-tight [hyphens:auto]', desktop ? 'text-[15px]' : label(k).length > 11 ? 'text-[12.5px] tracking-[-0.01em]' : 'text-[13.5px]')}>{isRegain ? t('live.regainWindow', { s: Math.ceil(lossLeft) }) : label(k)}</span>
        {n > 0 && !isRegain && <span className="absolute right-2 top-1.5 text-[11px] font-semibold leading-none tabular-nums opacity-60">{n}</span>}
        {desktop && <kbd className="absolute left-2 top-1.5 rounded bg-black/15 px-1.5 text-[11px] font-semibold opacity-70">{def.kbd}</kbd>}
        {isRegain && <LossRing key={lossUntil} left={lossLeft} />}
      </button>
    )
  }

  const grid = (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-2 lg:gap-3 lg:px-0">
      {lines.map((line, li) => (
        <div key={li} className="flex min-h-0 gap-2 lg:gap-3" style={{ flexGrow: Math.max(...line.map((b) => b.rows.length)) * (desktop && line.every((b) => b.group === 'opponent') ? 0.7 : 1), flexBasis: 0 }}>
          {line.map((b, bi) => (
            <div key={bi} className="flex min-w-0 flex-col" style={{ flexGrow: Math.max(...b.rows.map((r) => r.length)), flexBasis: 0 }}>
              <div className="mb-1 flex items-center gap-1.5 px-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-cream/55">
                <span className={cx('h-1.5 w-1.5 rounded-full', groupDot[b.group])} />{t(`groups.${b.group}`)}
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                {b.rows.map((row, ri) => <div key={ri} className="flex min-h-0 flex-1 gap-2">{row.map(tagButton)}</div>)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )

  const halves = (
    <div className="flex rounded-xl bg-white/5 p-0.5 ring-1 ring-white/10" role="group" aria-label={t('live.half')}>
      {([1, 2, 3, 4] as Half[]).map((h) => (
        <button key={h} type="button" onClick={() => clock.setHalf(h)} aria-pressed={half === h} title={t(`live.halvesLong.${h}`)}
          className={cx('min-h-[40px] min-w-[40px] rounded-lg px-2 text-[13px] font-semibold transition', half === h ? 'bg-cream text-ink' : 'text-cream/70 hover:bg-white/10', h > 2 && 'text-[12px]')}>
          {t(`live.halves.${h}`)}
        </button>
      ))}
    </div>
  )

  const clockBtn = (
    <button type="button" onClick={clock.toggle} aria-label={clock.state.running ? t('live.pause') : clock.state.elapsed[half] > 0 ? t('live.resume') : t('live.start')}
      className={cx('flex min-h-[48px] items-center gap-2.5 rounded-2xl px-3 py-1 ring-1 transition', clock.state.running ? 'bg-white/5 ring-white/10' : 'bg-sun-500 text-ink ring-sun-300')}>
      <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', clock.state.running ? 'bg-white/10' : 'bg-ink/10')}>
        {clock.state.running ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </span>
      <span className="font-sans text-[34px] font-semibold leading-none tabular-nums tracking-tight lg:text-[38px]">{fmtClock(added ? len + matchSeconds(half, 0, match.halfMinutes) : shown)}</span>
      {added > 0 && <span className="rounded-md bg-clay-500 px-1.5 py-0.5 text-[13px] font-semibold tabular-nums text-white">+{fmtClock(added)}</span>}
      {!clock.state.running && <span className="hidden text-sm font-semibold sm:inline">{clock.state.elapsed[half] > 0 ? t('live.resume') : t('live.start')}</span>}
    </button>
  )

  const scoreBlock = (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
      <span className="min-w-0 truncate text-right text-[13px] font-semibold text-cream/85 lg:text-[15px]" title={teamName}>{shortTeam(teamName)}</span>
      <span className="shrink-0 rounded-xl bg-white/5 px-2.5 py-1 text-[24px] font-bold leading-none tabular-nums ring-1 ring-white/10 lg:text-[28px]">{match.scoreUs}<span className="mx-1 text-cream/40">:</span>{match.scoreThem}</span>
      <span className="min-w-0 truncate text-[13px] font-semibold text-cream/85 lg:text-[15px]" title={match.opponent}>{shortTeam(match.opponent)}</span>
    </div>
  )

  const iconBtn = (icon: ReactNode, text: string, onClick: () => void, extra?: string, showText = false) => (
    <button type="button" onClick={onClick} aria-label={text} title={text}
      className={cx('flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-2.5 text-cream/85 hover:bg-white/10', extra)}>
      {icon}{showText && <span className="text-[13px] font-semibold">{text}</span>}
    </button>
  )

  const miniPanel = (
    <button type="button" onClick={() => setSheet('panel')} aria-label={t('live.panelOpen')}
      className="mx-3 mb-2 flex min-h-[46px] items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-1.5 text-left ring-1 ring-white/10 lg:hidden">
      <span className="shrink-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-cream/50">{t('live.indice')}</span>
        <span className="block text-[22px] font-bold leading-none tabular-nums text-sun-300">{fmtNjangi(result.total, lang)}</span>
      </span>
      <span className="grid min-w-0 flex-1 grid-cols-5 gap-1.5">
        {SUB_KEYS.map((k) => (
          <span key={k} className="min-w-0">
            <span className="flex items-baseline justify-between text-[10px] font-semibold text-cream/60"><span>{t(`sub.${k}.letter`)}</span><span className="tabular-nums text-cream/85">{Math.round(result.sub[k])}</span></span>
            <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-sun-500 transition-all duration-500" style={{ width: `${(result.sub[k] / 20) * 100}%` }} /></span>
          </span>
        ))}
      </span>
      <ChevronRight size={16} className="shrink-0 text-cream/40" />
    </button>
  )

  return (
    <div className="flex h-[100dvh] select-none flex-col overflow-hidden bg-night-900 text-cream" style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
      <style>{`
        @keyframes njFlash { from { opacity: .55 } to { opacity: 0 } }
        .nj-flash { animation: njFlash .35s ease-out forwards }
        @keyframes njShrink { from { transform: scaleX(1) } to { transform: scaleX(0) } }
        @keyframes njRing { from { stroke-dashoffset: 0 } to { stroke-dashoffset: 113.1 } }
        @keyframes njToast { 0% { opacity: 0; transform: translate(-50%, -6px) } 12% { opacity: 1; transform: translate(-50%, 0) } 80% { opacity: 1 } 100% { opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .nj-flash { animation-duration: .01s } }
      `}</style>

      {/* ---------- top bar ---------- */}
      <header ref={headerRef} className="shrink-0 px-3 pb-2 pt-[max(env(safe-area-inset-top),8px)] lg:px-6 lg:pb-3 lg:pt-4">
        <div className="flex items-center gap-2 lg:gap-4">
          {iconBtn(<X size={22} />, t('live.exit'), () => navigate('/app/analyse'))}
          {desktop ? (
            <>
              {scoreBlock}
              {clockBtn}
              {halves}
              <div className="ml-2 flex items-center gap-1">
                {iconBtn(<Undo2 size={20} />, t('live.undo'), undo, undefined, true)}
                {iconBtn(<ListOrdered size={20} />, t('live.log'), () => setSheet('log'), undefined, true)}
                {iconBtn(<Eye size={20} />, t('journey:actions.observe'), () => setSheet('observe'))}
                {iconBtn(<Keyboard size={20} />, t('live.help'), () => setSheet('help'))}
                {iconBtn(<Settings2 size={20} />, t('live.settings'), () => setSheet('settings'))}
              </div>
            </>
          ) : scoreBlock}
          <button type="button" onClick={() => setSheet('end')} aria-label={t('live.end')} className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-clay-500 px-3 text-[13px] font-semibold text-white">
            <Flag size={16} />{desktop ? t('live.end') : t('live.endShort')}
          </button>
        </div>
        {!desktop && (
          <div className="mt-2 flex items-center justify-between gap-2">
            {clockBtn}
            {halves}
          </div>
        )}
      </header>

      {match.status === 'done' && (
        <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-xl bg-forest-700/60 px-3 py-2 text-[13px] text-cream/90 ring-1 ring-forest-500/50 lg:mx-6">
          <span>{t('live.doneBanner')}</span>
          <Link to={`/app/analyse/rapport/${match.id}`} className="shrink-0 font-semibold text-sun-300 underline underline-offset-4">{t('live.report')}</Link>
        </div>
      )}
      {!online && <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-[12px] text-cream/75 lg:mx-6"><WifiOff size={14} />{t('live.offline')}</div>}

      {!desktop && miniPanel}

      {/* ---------- body ---------- */}
      {desktop ? (
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_330px] gap-6 px-6 pb-5">
          {grid}
          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <LivePanel result={result} />
            <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/55">{t('live.logTitle')}</span>
                <button type="button" onClick={() => setSheet('log')} className="text-[12px] font-semibold text-sun-300">{t('live.tagged', { n: events.length })}</button>
              </div>
              {lastEvents.length === 0 ? <p className="text-[13px] text-cream/60">{t('live.logEmpty')}</p> : (
                <ul className="space-y-1">
                  {lastEvents.slice(0, 8).map((e) => <EventRow key={e.id} e={e} match={match} player={e.playerId ? playerById.get(e.playerId) : undefined} compact />)}
                </ul>
              )}
            </div>
            <button type="button" onClick={() => setSheet('help')} className="px-1 text-left text-[12px] leading-relaxed text-cream/50 hover:text-cream/80">{t('live.keysLine')}</button>
          </aside>
        </div>
      ) : grid}

      {/* ---------- bottom bar (phone) ---------- */}
      {!desktop && (
        <nav className="safe-bottom grid shrink-0 grid-cols-5 border-t border-white/10 bg-night-800/80">
          <BottomBtn icon={<Undo2 size={20} />} label={t('live.undo')} onClick={undo} />
          <BottomBtn icon={<ListOrdered size={20} />} label={`${t('live.log')} · ${events.length}`} onClick={() => setSheet('log')} />
          <BottomBtn icon={<Eye size={20} />} label={t('journey:actions.observe')} onClick={() => setSheet('observe')} />
          <BottomBtn icon={<CircleHelp size={20} />} label={t('live.help')} onClick={() => setSheet('help')} />
          <BottomBtn icon={<Settings2 size={20} />} label={t('live.settingsShort')} onClick={() => setSheet('settings')} />
        </nav>
      )}

      {/* ---------- toast ---------- */}
      {toast && (
        <div key={toast.n} role="status" aria-live="polite" className={cx('pointer-events-none fixed left-1/2 z-50 flex max-w-[92vw] items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold shadow-lift',
          toast.tone === 'sun' ? 'bg-sun-500 text-ink' : 'bg-cream text-ink')} style={{ animation: 'njToast 1.4s ease forwards', top: (headerRef.current?.getBoundingClientRect().bottom ?? 64) + 4 }}>
          <Check size={16} strokeWidth={3} /><span className="truncate">{toast.text}</span>
        </div>
      )}

      {/* ---------- player attribution strip ---------- */}
      {strip && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night-700 shadow-lift">
          <div className="h-1 origin-left bg-sun-500" key={strip.createdAt} style={{ animation: `njShrink ${STRIP_MS}ms linear forwards` }} />
          <div className="flex items-center gap-2 px-3 py-2">
            <button type="button" onClick={undo} aria-label={t('live.undo')} title={t('live.undo')} className="grid h-12 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-cream/85"><Undo2 size={20} /></button>
            <div className="min-w-0 flex-1">
            <div className="mb-1 truncate text-[11.5px] font-semibold leading-none text-cream/65">{t('live.who')} <span className="text-cream">{strip.label}</span></div>
            <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {squad.map((p) => (
                <button key={p.id} type="button" onClick={() => assign(p)} title={p.name} aria-label={p.name}
                  className="grid h-11 min-w-[46px] shrink-0 place-items-center rounded-xl bg-cream px-2 text-[18px] font-bold tabular-nums text-ink active:scale-95">
                  {p.number ?? p.name.slice(0, 2)}
                </button>
              ))}
            </div>
            </div>
            <button type="button" onClick={() => setStrip(null)} aria-label={t('common:actions.close')} className="grid h-12 w-11 shrink-0 place-items-center rounded-xl text-cream/70"><X size={20} /></button>
          </div>
        </div>
      )}

      {/* ---------- sheets ---------- */}
      <Sheet open={sheet === 'panel'} onClose={() => setSheet(null)} title={t('live.panel')} closeLabel={t('common:actions.close')}>
        <LivePanel result={result} flat />
      </Sheet>

      <Sheet open={sheet === 'log'} onClose={() => setSheet(null)} title={`${t('live.logTitle')} · ${events.length}`} closeLabel={t('common:actions.close')} wide>
        {lastEvents.length === 0 ? <p className="py-6 text-center text-cream/60">{t('live.logEmpty')}</p> : (
          <LogList events={lastEvents} match={match} squad={squad} playerById={playerById} onDelete={removeOne} />
        )}
      </Sheet>

      <Sheet open={sheet === 'help'} onClose={() => setSheet(null)} title={t('live.helpTitle')} closeLabel={t('common:actions.close')} wide>
        <HelpBody />
      </Sheet>

      <Sheet open={sheet === 'settings'} onClose={() => setSheet(null)} title={t('live.settings')} closeLabel={t('common:actions.close')}>
        <div className="space-y-5">
          <DarkToggle checked={prefs.attribution} onChange={(v) => savePrefs({ ...prefs, attribution: v })} label={t('live.attribution')} hint={t('live.attributionHint')} />
          <DarkToggle checked={prefs.oppMode} onChange={(v) => savePrefs({ ...prefs, oppMode: v })} label={t('live.oppMode')} hint={t('live.oppModeHint')} />
          <div>
            <div className="mb-2 text-sm font-semibold">{t(`live.halvesLong.${half}`)} · {fmtClock(sec)}</div>
            <div className="grid grid-cols-4 gap-2">
              {[-60, -10, 10, 60].map((d) => (
                <button key={d} type="button" onClick={() => clock.setSeconds(secondsOf(clock.state) + d)} className="min-h-[44px] rounded-xl bg-white/10 text-sm font-semibold tabular-nums">
                  {d > 0 ? '+' : '-'}{Math.abs(d) >= 60 ? `${Math.abs(d) / 60} min` : `${Math.abs(d)} s`}
                </button>
              ))}
            </div>
          </div>
          <ScoreEditor match={match} teamName={teamName} />
          <button type="button" className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold"
            onClick={() => { try { document.documentElement.requestFullscreen?.() } catch { /* not allowed */ } setSheet(null) }}>
            <Maximize size={16} />{t('live.fullscreen')}
          </button>
        </div>
      </Sheet>

      <EndSheet open={sheet === 'end'} onClose={() => setSheet(null)} match={match} teamName={teamName} onConfirm={endMatch} />
      <ObserveSheet open={sheet === 'observe'} onClose={() => setSheet(null)} match={match} squad={squad} minute={Math.floor(shown / 60) + 1} />
    </div>
  )
}

/* ------------------------------------------------------------------ pieces */

function LossRing({ left }: { left: number }) {
  const C = 2 * Math.PI * 18
  return (
    <span className="absolute right-1.5 top-1.5 grid h-10 w-10 place-items-center" aria-hidden="true">
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r="18" fill="rgba(0,0,0,.25)" stroke="rgba(255,255,255,.25)" strokeWidth="4" />
        <circle cx="22" cy="22" r="18" fill="none" stroke="#FFD452" strokeWidth="4" strokeLinecap="round" strokeDasharray={C} style={{ animation: `njRing ${LOSS_WINDOW}ms linear forwards` }} />
      </svg>
      <span className="relative text-[14px] font-bold tabular-nums">{Math.ceil(left)}</span>
    </span>
  )
}

function BottomBtn({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11.5px] font-semibold text-cream/80 active:bg-white/5">
      {icon}<span className="max-w-full truncate px-1">{label}</span>
    </button>
  )
}

function LivePanel({ result, flat = false }: { result: NjangiResult; flat?: boolean }) {
  const { t, lang } = useT('analysis')
  const c = result.counts
  const pct = (v: number) => fmtPct(v, lang)
  const stats: [string, string | number][] = [
    [t('counts.passesTried'), result.passes], [t('counts.conservation'), pct(result.conservation)],
    [t('counts.lines'), c.LINE], [t('counts.progressive'), c.PROG],
    [t('counts.box'), c.BOX], [t('counts.losses'), result.losses],
    [t('counts.regain5'), c.REGAIN5], [t('counts.fixations'), c.FIX2 + c.SWITCH],
  ]
  return (
    <div className={cx(!flat && 'rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10')}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/55">{t('live.panel')}</div>
          <div className="mt-0.5 text-[44px] font-bold leading-none tabular-nums text-sun-300">{fmtNjangi(result.total, lang)}<span className="ml-1 text-base font-semibold text-cream/40">/ 100</span></div>
          <div className="mt-1 font-display text-[16px] font-semibold text-cream">{njangiLabel(result.total, lang)}</div>
        </div>
      </div>
      <SubBars result={result} dark className="mt-4" />
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-white/10 pt-3 text-[12.5px]">
        {stats.map(([k, v]) => <div key={k} className="flex justify-between gap-2"><dt className="truncate text-cream/60">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>)}
      </dl>
    </div>
  )
}

function EventRow({ e, match, player, compact = false, children, onClick }: { e: MatchEvent; match: Match; player?: Player; compact?: boolean; children?: ReactNode; onClick?: () => void }) {
  const { t } = useT('analysis')
  const def = defFor(e.code, e.side)
  const Icon = def?.icon
  const content = (
    <>
      <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums text-cream/70">{minuteLabel(e.half, e.t, match.halfMinutes)}</span>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: def?.color ?? '#5D6C63' }}>{Icon && <Icon size={15} className={def && /text-ink/.test(def.btn) ? 'text-ink' : 'text-white'} />}</span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{t(`short.${shortKey(e.code, e.side)}`)}{e.side === 'them' && def?.side !== 'them' ? ` (${t('live.them')})` : ''}</span>
      {player && <span className="max-w-[40%] truncate text-[12px] text-cream/65">{player.number != null ? `${player.number} · ` : ''}{player.name}</span>}
    </>
  )
  return (
    <li className={cx('flex items-center gap-2', compact ? 'py-0.5' : 'py-1.5')}>
      {onClick ? <button type="button" onClick={onClick} className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-lg text-left hover:bg-white/5">{content}</button> : <div className="flex min-w-0 flex-1 items-center gap-2">{content}</div>}
      {children}
    </li>
  )
}

function LogList({ events, match, squad, playerById, onDelete }: { events: MatchEvent[]; match: Match; squad: Player[]; playerById: Map<string, Player>; onDelete: (e: MatchEvent) => void }) {
  const { t } = useT('analysis')
  const [open, setOpen] = useState<string | null>(null)
  const [limit, setLimit] = useState(80)
  let lastHalf = 0
  return (
    <ul className="divide-y divide-white/5">
      {events.slice(0, limit).map((e) => {
        const head = e.half !== lastHalf ? (lastHalf = e.half, <li key={`h${e.half}-${e.id}`} className="pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-sun-300">{t(`live.halvesLong.${e.half}`)}</li>) : null
        return [
          head,
          <EventRow key={e.id} e={e} match={match} player={e.playerId ? playerById.get(e.playerId) : undefined} onClick={e.side === 'us' && squad.length ? () => setOpen(open === e.id ? null : e.id) : undefined}>
            <button type="button" onClick={() => onDelete(e)} aria-label={t('live.delete')} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-cream/60 hover:bg-white/10 hover:text-clay-300"><Trash2 size={18} /></button>
          </EventRow>,
          open === e.id && (
            <li key={`p${e.id}`} className="flex flex-wrap gap-1.5 pb-3 pl-14">
              {squad.map((p) => (
                <button key={p.id} type="button" title={p.name} onClick={async () => { await db.events.update(e.id, { playerId: e.playerId === p.id ? undefined : p.id }); setOpen(null) }}
                  className={cx('h-10 min-w-[40px] rounded-lg px-2 text-[14px] font-bold tabular-nums', e.playerId === p.id ? 'bg-sun-500 text-ink' : 'bg-white/10 text-cream')}>{p.number ?? p.name.slice(0, 2)}</button>
              ))}
            </li>
          ),
        ]
      })}
      {events.length > limit && <li className="pt-3 text-center"><button type="button" className="min-h-[44px] rounded-xl bg-white/10 px-4 text-sm font-semibold" onClick={() => setLimit(limit + 200)}>+ {events.length - limit}</button></li>}
    </ul>
  )
}

function HelpBody() {
  const { t } = useT('analysis')
  return (
    <div className="space-y-5 text-[14px] leading-relaxed text-cream/85">
      <p>{t('live.helpIntro')}</p>
      <p>{t('live.helpLoss')}</p>
      <p>{t('live.helpAuto')}</p>
      <p>{t('live.helpPlayer')}</p>
      <div>
        <h3 className="mb-2 font-display text-base font-semibold text-cream">{t('live.helpKeys')}</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          {[[t('live.keySpace'), t('live.keyStart')], [t('live.keyUndoKeys'), t('live.keyUndo')], ['J', t('live.keyLog')], ['H, ?', t('live.keyHelp')], ['Esc', t('live.keyEsc')]].map(([k, v]) => (
            <div key={k} className="contents"><dt><kbd className="rounded-md bg-white/10 px-2 py-0.5 text-[12px] font-semibold">{k}</kbd></dt><dd>{v}</dd></div>
          ))}
        </dl>
      </div>
      <div>
        <h3 className="mb-2 font-display text-base font-semibold text-cream">{t('live.codes')}</h3>
        {GROUP_ORDER.map((g) => (
          <div key={g} className="mb-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/55">{t(`groups.${g}`)}</div>
            <ul className="space-y-1.5">
              {TAGS.filter((x) => x.group === g).map((x) => {
                const Icon = x.icon
                return (
                  <li key={x.key} className="flex gap-2.5">
                    <kbd className="mt-0.5 h-6 min-w-[26px] shrink-0 rounded-md bg-white/10 text-center text-[12px] font-semibold leading-6">{x.kbd}</kbd>
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md" style={{ background: x.color }}><Icon size={13} className="text-white" /></span>
                    <span><b className="font-semibold text-cream">{t(`short.${x.key}`)}</b> <span className="text-cream/70">{t(`help.${x.key}`)}</span></span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function DarkToggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-start gap-3 text-left">
      <span className={cx('relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-sun-500' : 'bg-white/15')}>
        <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-cream shadow transition', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
      <span><span className="block text-sm font-semibold">{label}</span>{hint && <span className="block text-[13px] text-cream/60">{hint}</span>}</span>
    </button>
  )
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { t } = useT('analysis')
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 truncate text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`${label} -1`} onClick={() => onChange(Math.max(0, value - 1))} className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><Minus size={18} /></button>
        <span className="w-8 text-center text-2xl font-bold tabular-nums" aria-label={t('live.score')}>{value}</span>
        <button type="button" aria-label={`${label} +1`} onClick={() => onChange(value + 1)} className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><Plus size={18} /></button>
      </div>
    </div>
  )
}

function ScoreEditor({ match, teamName }: { match: Match; teamName: string }) {
  const { t } = useT('analysis')
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-cream/70">{t('live.scoreTitle')}</div>
      <Stepper label={teamName} value={match.scoreUs} onChange={(v) => db.matches.update(match.id, { scoreUs: v })} />
      <Stepper label={match.opponent} value={match.scoreThem} onChange={(v) => db.matches.update(match.id, { scoreThem: v })} />
    </div>
  )
}

function EndSheet({ open, onClose, match, teamName, onConfirm }: { open: boolean; onClose: () => void; match: Match; teamName: string; onConfirm: (us: number, them: number) => void }) {
  const { t } = useT('analysis')
  const [us, setUs] = useState(match.scoreUs)
  const [them, setThem] = useState(match.scoreThem)
  useEffect(() => { if (open) { setUs(match.scoreUs); setThem(match.scoreThem) } }, [open, match.scoreUs, match.scoreThem])
  return (
    <Sheet open={open} onClose={onClose} title={t('live.endTitle')} closeLabel={t('common:actions.close')}
      footer={<>
        <button type="button" onClick={onClose} className="min-h-[48px] rounded-xl px-4 text-sm font-semibold text-cream/80 hover:bg-white/10">{t('common:actions.cancel')}</button>
        <button type="button" onClick={() => onConfirm(us, them)} className="flex min-h-[48px] items-center gap-2 rounded-xl bg-sun-500 px-5 text-sm font-semibold text-ink"><Flag size={16} />{t('live.endConfirm')}</button>
      </>}>
      <p className="mb-4 text-[14px] text-cream/75">{t('live.endBody')}</p>
      <div className="space-y-3">
        <Stepper label={teamName} value={us} onChange={setUs} />
        <Stepper label={match.opponent} value={them} onChange={setThem} />
      </div>
    </Sheet>
  )
}
