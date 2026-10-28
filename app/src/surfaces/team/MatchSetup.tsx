import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Crown, House, Plane, Plus, RefreshCw, Save, Shirt, UserPlus, WandSparkles, X } from 'lucide-react'
import { db } from '../../lib/db'
import { useLiveQuery, useDocumentTitle } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { autoLineup, convocationText, createMatch, skillAvg } from '../../lib/actions'
import { DEFAULT_FORMATION, FORMATIONS, formationSlots } from '../../lib/formations'
import type { GamePlan, LineupSlot, Match, Player, Team } from '../../lib/types'
import { BRAND } from '../../lib/config'
import { EmptyState, Field } from '../../ui'
import { useT } from '../../i18n'
import { addDays, cx, fmtDate, parseISODate, todayISO } from '../../lib/util'
import { assignSlot, byNumber, defaultHalf, normalizeLineup, remapLineup, shortName, type MatchWithConvo } from './components/lineup'
import { LineupBoard } from './components/LineupBoard'
import { PlayerPicker } from './components/PlayerPicker'
import { ShareBar } from './components/ShareBar'
import { NumberBadge, Stepper } from './components/bits'
import { FormatPicker } from './components/forms'

type StepId = 'info' | 'lineup' | 'plan' | 'convo'
const STEPS: StepId[] = ['info', 'lineup', 'plan', 'convo']
const MOMENTS: (keyof GamePlan)[] = ['possession', 'transitionDef', 'defense', 'transitionOff', 'setPieces']
const EMPTY_PLAN: GamePlan = { possession: '', transitionDef: '', defense: '', transitionOff: '', setPieces: '' }

interface Draft {
  opponent: string; competition: string; date: string; time: string; venue: string; home: boolean
  format: Team['format']; formation: string; halfMinutes: number
  lineup: LineupSlot[]; subs: string[]; captainId?: string; plan: GamePlan
}

const nextSaturday = () => { const d = parseISODate(todayISO()).getDay(); return addDays(todayISO(), (6 - d + 7) % 7) }

export default function MatchSetup() {
  const { id } = useParams()
  const isEdit = !!id
  const { t, lang } = useT('team')
  const nav = useNavigate()
  const { team: activeTeam, teams } = useSession()
  useDocumentTitle(isEdit ? t('setup.docEdit') : t('setup.docNew'))

  const existing = useLiveQuery<MatchWithConvo | null | undefined>(async () => (id ? ((await db.matches.get(id)) as MatchWithConvo | undefined) ?? null : null), [id], undefined)
  const team = isEdit ? (existing ? teams.find((x) => x.id === existing.teamId) ?? activeTeam : null) : activeTeam
  const roster = useLiveQuery(async () => (team ? { teamId: team.id, list: await db.players.where('teamId').equals(team.id).toArray() } : null), [team?.id], null as { teamId: string; list: Player[] } | null)
  // only trust the roster once it belongs to the team being edited (avoids a stale empty list)
  const players = roster && team && roster.teamId === team.id ? roster.list : undefined

  const [step, setStep] = useState<StepId>('info')
  const [d, setD] = useState<Draft | null>(null)
  const [convo, setConvo] = useState('')
  const [convoEdited, setConvoEdited] = useState(false)
  const [halfTouched, setHalfTouched] = useState(false)
  const [pickSlot, setPickSlot] = useState<string>()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  // initialise the draft once the data is there
  useEffect(() => {
    if (d || !team || !players) return
    if (isEdit) {
      if (!existing) return
      const slots = formationSlots(existing.format, existing.formation)
      setD({
        opponent: existing.opponent, competition: existing.competition ?? '', date: existing.date, time: existing.time ?? '', venue: existing.venue ?? '', home: existing.home,
        format: existing.format, formation: existing.formation, halfMinutes: existing.halfMinutes,
        lineup: normalizeLineup(existing.lineup, slots), subs: existing.subs.filter((s) => players.some((p) => p.id === s)), captainId: existing.captainId, plan: { ...EMPTY_PLAN, ...existing.plan },
      })
      setHalfTouched(true)
      if (existing.convocation) { setConvo(existing.convocation); setConvoEdited(true) }
    } else {
      const format = team.format, formation = FORMATIONS[format]?.[team.formation] ? team.formation : DEFAULT_FORMATION[format]
      const { lineup, subs } = autoLineup(players, format, formation)
      const captain = [...players].sort((a, b) => skillAvg(b) - skillAvg(a))[0]
      setD({ opponent: '', competition: '', date: nextSaturday(), time: '15:00', venue: '', home: true, format, formation, halfMinutes: defaultHalf(format), lineup, subs, captainId: captain?.id, plan: { ...EMPTY_PLAN } })
    }
  }, [d, team, players, existing, isEdit])

  const asMatch = (x: Draft): Match => ({
    id: existing?.id ?? 'draft', teamId: team?.id ?? '', opponent: x.opponent.trim() || '...', date: x.date, time: x.time || undefined, venue: x.venue.trim() || undefined, home: x.home,
    competition: x.competition.trim() || undefined, format: x.format, formation: x.formation, halfMinutes: x.halfMinutes, lineup: x.lineup, subs: x.subs, captainId: x.captainId,
    plan: x.plan, status: existing?.status ?? 'planned', scoreUs: existing?.scoreUs ?? 0, scoreThem: existing?.scoreThem ?? 0, createdAt: existing?.createdAt ?? '',
  })
  const generated = useMemo(() => (d && team && players ? convocationText(asMatch(d), team, players, lang) : ''), [d, team, players, lang])
  useEffect(() => { if (!convoEdited) setConvo(generated) }, [generated, convoEdited])

  if (isEdit && existing === null) return <div className="mx-auto max-w-lg pt-6"><EmptyState title={t('sheet.notFoundTitle')} body={t('setup.notFound')} action={<Link to="/app/matchs" className="btn-primary">{t('setup.back')}</Link>} /></div>
  if (!isEdit && !activeTeam) return <div className="mx-auto max-w-lg pt-6"><EmptyState icon={<Shirt size={32} />} title={t('noTeam.title')} body={t('setup.noTeamBody')} action={<Link to="/app/equipe" className="btn-primary">{t('noTeam.cta')}</Link>} /></div>
  if (!d || !team || !players) return <div className="grid min-h-[40vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>

  const set = (patch: Partial<Draft>) => setD((cur) => (cur ? { ...cur, ...patch } : cur))
  const idx = STEPS.indexOf(step)
  const canLeaveInfo = d.opponent.trim().length > 0 && !!d.date
  const go = (s: StepId) => {
    if (STEPS.indexOf(s) > 0 && !canLeaveInfo) { setStep('info'); setError(t('setup.info.opponentRequired')); document.getElementById('ms-opp')?.focus(); return }
    setError(''); setStep(s); topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const changeFormat = (format: Team['format']) => {
    const formation = FORMATIONS[format]?.[d.formation] ? d.formation : (team.format === format && FORMATIONS[format]?.[team.formation] ? team.formation : DEFAULT_FORMATION[format])
    const r = remapLineup(d.lineup, d.subs, format, formation, players)
    set({ format, formation, lineup: r.lineup, subs: r.subs, halfMinutes: halfTouched ? d.halfMinutes : defaultHalf(format) })
  }
  const changeFormation = (formation: string) => { const r = remapLineup(d.lineup, d.subs, d.format, formation, players); set({ formation, lineup: r.lineup, subs: r.subs }) }
  const auto = () => { const r = autoLineup(players, d.format, d.formation); const capOk = d.captainId && players.some((p) => p.id === d.captainId); set({ lineup: r.lineup, subs: r.subs, captainId: capOk ? d.captainId : [...players].sort((a, b) => skillAvg(b) - skillAvg(a))[0]?.id }) }

  const save = async () => {
    if (!canLeaveInfo) { go('info'); return }
    setSaving(true)
    const m = asMatch(d)
    const extra = { convocation: convoEdited ? convo : undefined }
    try {
      if (isEdit && existing) {
        await db.matches.update(existing.id, { opponent: m.opponent, competition: m.competition, date: m.date, time: m.time, venue: m.venue, home: m.home, format: m.format, formation: m.formation, halfMinutes: m.halfMinutes, lineup: m.lineup, subs: m.subs, captainId: m.captainId, plan: m.plan, ...extra } as Partial<Match>)
        nav(`/app/matchs/${existing.id}`, { replace: true })
      } else {
        const created = await createMatch({ teamId: team.id, opponent: m.opponent, date: m.date, time: m.time, venue: m.venue, home: m.home, competition: m.competition, halfMinutes: m.halfMinutes })
        await db.matches.update(created.id, { format: m.format, formation: m.formation, lineup: m.lineup, subs: m.subs, captainId: m.captainId, plan: m.plan, ...extra } as Partial<Match>)
        nav(`/app/matchs/${created.id}`, { replace: true })
      }
    } finally { setSaving(false) }
  }

  const draftMatch = asMatch(d)
  return (
    <div ref={topRef} className="scroll-mt-20">
      <Link to={isEdit && existing ? `/app/matchs/${existing.id}` : '/app/matchs'} className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft size={16} />{isEdit ? t('sheet.docTitle') : t('setup.back')}
      </Link>

      {/* progress header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow mb-1">{t('setup.stepOf', { n: idx + 1 })}</div>
            <h1 className="text-[28px] font-semibold leading-tight text-ink sm:text-[34px]">
              {isEdit ? t('setup.titleEdit') : t('setup.titleNew')}
              {d.opponent.trim() && <span className="block truncate font-sans text-base font-medium text-ink-muted sm:inline sm:pl-3">{t('setup.against', { opponent: d.opponent.trim() })}</span>}
            </h1>
          </div>
          {isEdit && <button type="button" className="btn-primary hidden sm:inline-flex" onClick={save} disabled={saving}><Save size={17} />{t('common:actions.save')}</button>}
        </div>
        <ol className="mt-4 grid grid-cols-4 gap-1.5 sm:gap-2" aria-label={t('setup.stepOf', { n: idx + 1 })}>
          {STEPS.map((s, i) => {
            const done = i < idx, cur = i === idx
            return (
              <li key={s}>
                <button type="button" onClick={() => go(s)} aria-current={cur ? 'step' : undefined}
                  className="group flex w-full flex-col gap-1.5 rounded-lg pt-1 text-left focus-visible:outline-offset-2">
                  <span className={cx('h-1.5 w-full rounded-full transition-colors', cur ? 'bg-terra-500' : done ? 'bg-forest-600' : 'bg-line')} />
                  <span className={cx('flex items-center gap-1 text-[12px] font-semibold leading-tight sm:text-[13px]', cur ? 'text-ink' : done ? 'text-forest-700' : 'text-ink-faint')}>
                    <span className={cx('hidden h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums sm:flex', cur ? 'bg-terra-500 text-white' : done ? 'bg-forest-600 text-cream' : 'bg-sand text-ink-muted')}>
                      {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="truncate">{t(`setup.steps.${s}`)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      {step === 'info' && <InfoStep d={d} set={set} error={error} clearError={() => setError('')} onFormat={changeFormat} onHalf={(n) => { setHalfTouched(true); set({ halfMinutes: n }) }} />}
      {step === 'lineup' && (
        <LineupStep d={d} set={set} players={players} onFormation={changeFormation} onAuto={auto} onSlot={setPickSlot} activeSlot={pickSlot} />
      )}
      {step === 'plan' && <PlanStep plan={d.plan} onChange={(plan) => set({ plan })} />}
      {step === 'convo' && (
        <ConvoStep text={convo} edited={convoEdited} onChange={(v) => { setConvo(v); setConvoEdited(true) }} onRegenerate={() => { setConvoEdited(false); setConvo(generated) }}
          match={draftMatch} team={team} players={players} />
      )}

      {/* step footer: sits above the mobile tab bar */}
      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 mt-8 lg:bottom-4">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-paper/95 p-2 shadow-lift backdrop-blur">
          {idx > 0 ? (
            <button type="button" className="btn-ghost min-h-[44px]" onClick={() => go(STEPS[idx - 1])} aria-label={t('common:actions.previous')}><ChevronLeft size={18} /><span className="hidden min-[400px]:inline">{t('common:actions.previous')}</span></button>
          ) : <span className="px-3 text-xs text-ink-faint">{t('setup.stepOf', { n: 1 })}</span>}
          <div className="ml-auto flex gap-2">
            {isEdit && idx < STEPS.length - 1 && <button type="button" className="btn-outline min-h-[44px] sm:hidden" onClick={save} disabled={saving} aria-label={t('common:actions.save')}><Save size={17} /></button>}
            {idx < STEPS.length - 1 ? (
              <button type="button" className="btn-primary min-h-[44px] px-5" onClick={() => go(STEPS[idx + 1])}>{t(`setup.steps.${STEPS[idx + 1]}`)}<ChevronRight size={18} /></button>
            ) : (
              <button type="button" className="btn-accent min-h-[44px] px-5" onClick={save} disabled={saving}><Save size={17} />{saving ? t('setup.saving') : t('setup.save')}</button>
            )}
          </div>
        </div>
      </div>

      <PlayerPicker open={!!pickSlot} onClose={() => setPickSlot(undefined)} slotId={pickSlot} format={d.format} formation={d.formation} lineup={d.lineup} subs={d.subs} players={players}
        onPick={(pid) => { if (!pickSlot) return; const r = assignSlot(d.lineup, d.subs, pickSlot, pid); set({ lineup: r.lineup, subs: r.subs }) }} />
    </div>
  )
}

/* ---------------- step 1 ---------------- */

function StepCard({ title, intro, children, aside }: { title: string; intro?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card card-pad sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="font-display text-xl font-semibold">{title}</h2>{intro && <p className="mt-0.5 max-w-2xl text-sm text-ink-muted">{intro}</p>}</div>
        {aside}
      </div>
      {children}
    </section>
  )
}

function InfoStep({ d, set, error, clearError, onFormat, onHalf }: { d: Draft; set: (p: Partial<Draft>) => void; error: string; clearError: () => void; onFormat: (f: Team['format']) => void; onHalf: (n: number) => void }) {
  const { t, lang } = useT('team')
  const comps = t('setup.info.competitionSuggest', { returnObjects: true }) as unknown as string[]
  return (
    <StepCard title={t('setup.info.title')}>
      <div className="grid gap-x-5 md:grid-cols-2">
        <Field label={t('setup.info.opponent')} htmlFor="ms-opp" hint={error ? <span className="font-medium text-clay-600">{error}</span> : undefined}>
          <input id="ms-opp" className={cx('input text-[17px] font-semibold', error && 'border-clay-500')} value={d.opponent} autoFocus={!d.opponent}
            onChange={(e) => { set({ opponent: e.target.value }); clearError() }} placeholder={t('setup.info.opponentPh')} aria-invalid={!!error} autoComplete="off" />
        </Field>
        <Field label={t('setup.info.competition')} htmlFor="ms-comp">
          <input id="ms-comp" className="input" value={d.competition} onChange={(e) => set({ competition: e.target.value })} placeholder={t('setup.info.competitionPh')} autoComplete="off" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Array.isArray(comps) && comps.map((c) => (
              <button key={c} type="button" className={cx('chip min-h-[32px] cursor-pointer', d.competition === c && 'chip-on')} onClick={() => set({ competition: d.competition === c ? '' : c })}>{c}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-[1.4fr_1fr] gap-3">
          <Field label={t('setup.info.date')} htmlFor="ms-date" hint={d.date ? fmtDate(d.date, lang, { weekday: 'long', day: 'numeric', month: 'long' }) : undefined}>
            <input id="ms-date" type="date" className="input" value={d.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label={t('setup.info.time')} htmlFor="ms-time">
            <input id="ms-time" type="time" className="input" value={d.time} onChange={(e) => set({ time: e.target.value })} />
          </Field>
        </div>
        <Field label={t('setup.info.venue')} htmlFor="ms-venue">
          <input id="ms-venue" className="input" value={d.venue} onChange={(e) => set({ venue: e.target.value })} placeholder={t('setup.info.venuePh')} />
        </Field>
        <Field label={t('setup.info.where')}>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('setup.info.where')}>
            {[true, false].map((h) => (
              <button key={String(h)} type="button" role="radio" aria-checked={d.home === h} onClick={() => set({ home: h })}
                className={cx('flex min-h-[52px] items-center justify-center gap-2 rounded-xl border text-[15px] font-semibold transition', d.home === h ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-ink-faint')}>
                {h ? <House size={18} /> : <Plane size={18} />}{h ? t('setup.info.home') : t('setup.info.away')}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t('setup.info.half')}>
          <div className="flex items-center gap-3">
            <Stepper value={d.halfMinutes} onChange={onHalf} min={5} max={60} step={5} lessLabel="-5 min" moreLabel="+5 min" />
            <span className="text-sm text-ink-muted">{t('setup.info.minutes', { n: d.halfMinutes })}</span>
          </div>
        </Field>
        <div className="md:col-span-2">
          <Field label={t('setup.info.format')} hint={t('setup.info.formatHint')}>
            <FormatPicker value={d.format} onChange={onFormat} />
          </Field>
        </div>
      </div>
    </StepCard>
  )
}

/* ---------------- step 2 ---------------- */

function LineupStep({ d, set, players, onFormation, onAuto, onSlot, activeSlot }: {
  d: Draft; set: (p: Partial<Draft>) => void; players: Player[]; onFormation: (f: string) => void; onAuto: () => void; onSlot: (s: string) => void; activeSlot?: string
}) {
  const { t } = useT('team')
  const byId = new Map(players.map((p) => [p.id, p]))
  const starters = d.lineup.map((l) => (l.playerId ? byId.get(l.playerId) : undefined)).filter((p): p is Player => !!p)
  const bench = d.subs.map((id) => byId.get(id)).filter((p): p is Player => !!p)
  const out = players.filter((p) => !d.subs.includes(p.id) && !d.lineup.some((l) => l.playerId === p.id)).sort(byNumber)
  const formations = Object.keys(FORMATIONS[d.format] || {})

  if (!players.length) return (
    <StepCard title={t('setup.lineup.title')}>
      <EmptyState icon={<UserPlus size={30} />} title={t('roster.emptyTitle')} body={t('setup.lineup.noPlayers')} action={<Link to="/app/equipe" className="btn-primary">{t('setup.lineup.addPlayers')}</Link>} />
    </StepCard>
  )

  const capOptions = [...starters].sort(byNumber)
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start">
      <div className="lg:sticky lg:top-6">
        <div className="mb-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t('setup.lineup.formation')}>
          {formations.map((f) => (
            <button key={f} type="button" role="radio" aria-checked={d.formation === f} onClick={() => onFormation(f)}
              className={cx('min-h-[40px] rounded-xl border px-3.5 text-sm font-semibold tabular-nums transition', d.formation === f ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-ink-faint')}>{f}</button>
          ))}
        </div>
        <div className="mx-auto max-w-[400px] lg:max-w-[min(400px,calc((100vh_-_200px)_*_0.66))]">
          <LineupBoard format={d.format} formation={d.formation} lineup={d.lineup} players={players} captainId={d.captainId} onSlotClick={onSlot} activeSlot={activeSlot} />
          <p className="mt-2 text-center text-xs text-ink-muted">{t('setup.lineup.tapHint')}</p>
        </div>
      </div>

      <div className="space-y-4">
        <section className="card card-pad">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold">{t('setup.lineup.title')}</h2>
              <p className="text-[13px] text-ink-muted">{t('setup.lineup.squad', { starters: starters.length, subs: bench.length })}</p>
            </div>
            <button type="button" className="btn-sun" onClick={onAuto}><WandSparkles size={17} />{t('setup.lineup.auto')}</button>
          </div>
          <p className="mt-2 text-xs text-ink-faint">{t('setup.lineup.autoHint', { app: BRAND.name })}</p>
        </section>

        <section className="card card-pad" aria-labelledby="cap-h">
          <h3 id="cap-h" className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><Crown size={16} className="text-terra-500" />{t('setup.lineup.captain')}</h3>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="cap-h">
            {capOptions.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={d.captainId === p.id} onClick={() => set({ captainId: d.captainId === p.id ? undefined : p.id })}
                className={cx('inline-flex min-h-[40px] items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-[13px] font-semibold transition', d.captainId === p.id ? 'border-terra-500 bg-terra-500 text-white' : 'border-line bg-paper text-ink-soft hover:border-ink-faint')}>
                <span className={cx('flex h-7 w-7 items-center justify-center rounded-full text-[12px] tabular-nums', d.captainId === p.id ? 'bg-white/20' : 'bg-sand')}>{p.number ?? '·'}</span>
                {shortName(p.name)}
              </button>
            ))}
          </div>
        </section>

        <section className="card card-pad" aria-labelledby="bench-h">
          <h3 id="bench-h" className="mb-2 flex items-baseline justify-between text-sm font-semibold text-ink">{t('setup.lineup.bench')}<span className="text-xs tabular-nums text-ink-faint">{bench.length}</span></h3>
          {bench.length === 0 ? <p className="text-sm text-ink-muted">{t('setup.lineup.benchEmpty')}</p> : (
            <ul className="divide-y divide-line/70">
              {bench.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-1.5">
                  <NumberBadge player={p} size="sm" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p.name}</span><span className="text-xs text-ink-muted">{t(`common:positions.${p.position}`)}</span></span>
                  <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-faint hover:bg-sand hover:text-ink" aria-label={t('setup.lineup.fromBench', { name: p.name })}
                    onClick={() => set({ subs: d.subs.filter((x) => x !== p.id), captainId: d.captainId === p.id ? undefined : d.captainId })}><X size={17} /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-dashed border-line bg-paper/60 p-4" aria-labelledby="out-h">
          <h3 id="out-h" className="mb-2 flex items-baseline justify-between text-sm font-semibold text-ink-muted">{t('setup.lineup.out')}<span className="text-xs tabular-nums text-ink-faint">{out.length}</span></h3>
          {out.length === 0 ? <p className="text-sm text-ink-faint">{t('setup.lineup.outEmpty')}</p> : (
            <div className="flex flex-wrap gap-1.5">
              {out.map((p) => (
                <button key={p.id} type="button" onClick={() => set({ subs: [...d.subs, p.id] })} aria-label={t('setup.lineup.toBench', { name: p.name })}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-line bg-paper py-1 pl-1 pr-3 text-[13px] font-semibold text-ink-soft transition hover:border-forest-300">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sand text-[12px] tabular-nums">{p.number ?? '·'}</span>{shortName(p.name)}<Plus size={14} className="text-forest-600" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/* ---------------- step 3 ---------------- */

function PlanStep({ plan, onChange }: { plan: GamePlan; onChange: (p: GamePlan) => void }) {
  const { t } = useT('team')
  const toggle = (k: keyof GamePlan, idea: string) => {
    const cur = plan[k]
    if (cur.includes(idea)) {
      const esc = idea.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const next = cur.replace(new RegExp(`(^|\\n)\\s*${esc}\\.?[ \\t]*(?=\\n|$)`), '').replace(new RegExp(`${esc}\\.?\\s*`), '').replace(/\n{2,}/g, '\n')
      onChange({ ...plan, [k]: next.trim() })
    } else onChange({ ...plan, [k]: cur.trim() ? `${cur.trim()}\n${idea}` : idea })
  }
  return (
    <StepCard title={t('setup.plan.title')} intro={t('setup.plan.intro')}>
      <div className="grid gap-4 lg:grid-cols-2">
        {MOMENTS.map((k, i) => {
          const ideas = t(`suggest.${k}`, { returnObjects: true }) as unknown as string[]
          return (
            <div key={k} className={cx('rounded-2xl border border-line bg-cream/50 p-4', k === 'setPieces' && 'lg:col-span-2')}>
              <div className="mb-2 flex items-start gap-3">
                <span className={cx('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold', k === 'setPieces' ? 'bg-sun-100 text-sun-700' : 'bg-forest-600 text-cream')}>{k === 'setPieces' ? '+' : i + 1}</span>
                <div className="min-w-0">
                  <label htmlFor={`plan-${k}`} className="block font-display text-[17px] font-semibold text-ink">{t(`moments.${k}.title`)}</label>
                  <p className="text-[13px] text-ink-muted">{t(`moments.${k}.q`)}</p>
                </div>
              </div>
              <textarea id={`plan-${k}`} className="input min-h-[96px] bg-white leading-6" value={plan[k]} onChange={(e) => onChange({ ...plan, [k]: e.target.value })} />
              {Array.isArray(ideas) && (
                <div className="mt-2.5">
                  <div className="mb-1.5 text-[11px] font-semibold text-terra-600">{t('setup.plan.suggest')}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ideas.map((idea) => {
                      const on = plan[k].includes(idea)
                      return (
                        <button key={idea} type="button" onClick={() => toggle(k, idea)} aria-pressed={on} aria-label={t('setup.plan.insert', { text: idea })}
                          className={cx('inline-flex min-h-[34px] items-center gap-1 rounded-full border px-3 py-1 text-left text-[12.5px] font-medium leading-snug transition', on ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-forest-300')}>
                          {on ? <Check size={13} strokeWidth={3} /> : <Plus size={13} />}{idea}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </StepCard>
  )
}

/* ---------------- step 4 ---------------- */

function ConvoStep({ text, edited, onChange, onRegenerate, match, team, players }: { text: string; edited: boolean; onChange: (v: string) => void; onRegenerate: () => void; match: Match; team: Team; players: Player[] }) {
  const { t, lang } = useT('team')
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <StepCard title={t('setup.convo.title')} intro={t('setup.convo.intro')}
        aside={<button type="button" className="btn-ghost btn-sm" onClick={onRegenerate} disabled={!edited}><RefreshCw size={15} />{t('setup.convo.regenerate')}</button>}>
        <label htmlFor="ms-convo" className="label">{t('setup.convo.message')}</label>
        <textarea id="ms-convo" className="input min-h-[280px] bg-white text-[15px] leading-6" value={text} onChange={(e) => onChange(e.target.value)} />
        <div className="mt-1 flex justify-between text-xs text-ink-faint"><span>{edited ? t('setup.convo.edited') : ''}</span><span>{t('setup.convo.saveFirst')}</span></div>
        <ShareBar text={text} match={match} team={team} className="mt-4" />
      </StepCard>
      <aside className="card overflow-hidden">
        <div className="bg-forest-600 px-4 py-4 text-cream">
          <div className="text-xs text-cream/70">{match.competition || t(match.home ? 'matches.home' : 'matches.away')}</div>
          <div className="mt-1 font-display text-xl font-semibold leading-tight">{match.home ? `${team.name} ${t('matches.vs')} ${match.opponent}` : `${match.opponent} ${t('matches.vs')} ${team.name}`}</div>
          <div className="mt-1 text-[13px] text-cream/85">{fmtDate(match.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}{match.time ? `, ${match.time}` : ''}{match.venue ? `, ${match.venue}` : ''}</div>
        </div>
        <div className="mx-auto max-w-[260px] p-3"><LineupBoard format={match.format} formation={match.formation} lineup={match.lineup} players={players} captainId={match.captainId} size="sm" /></div>
      </aside>
    </div>
  )
}
