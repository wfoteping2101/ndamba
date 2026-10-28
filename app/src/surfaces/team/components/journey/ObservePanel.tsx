// Fast observation: pick one or several players, tap competences and quick tags (strength or to work on),
// an optional rating, a short note or dictation, save. Used by the Observer page and by the live tagger.
import { useMemo, useState } from 'react'
import { Check, Mic, MicOff, Target, ThumbsUp, Trash2, X } from 'lucide-react'
import { useT } from '../../../../i18n'
import { db } from '../../../../lib/db'
import { useLiveQuery } from '../../../../lib/hooks'
import { cx, fmtDate, todayISO } from '../../../../lib/util'
import { addObservations, obsSkillTones, OBS_TAGS, obsTag, SKILL_KEYS } from '../../../../lib/journey'
import type { Observation, ObsTone, Player, SkillKey } from '../../../../lib/types'
import { NumberBadge } from '../bits'
import { shortName } from '../lineup'
import { RatingDots, SkillChip, quote, toneChip, toneSolid, useToast } from './bits'
import { useDictation } from './dictation'

export interface PlayerGroup { id: string; label: string; players: Player[]; muted?: boolean }

export interface ObserveContext { sessionId?: string; matchId?: string; date?: string }

export function ObservePanel({ teamId, groups, context, minute, onMinute, showMinute = false, initialSelected = [], compact = false, stickyClass = 'bottom-[calc(env(safe-area-inset-bottom)+76px)] mr-[66px] lg:bottom-6 lg:mr-[76px]' }: {
  teamId: string
  groups: PlayerGroup[]
  context: ObserveContext
  minute?: number | null
  onMinute?: (m: number | null) => void
  showMinute?: boolean
  initialSelected?: string[]
  compact?: boolean
  stickyClass?: string
}) {
  const { t, lang } = useT('journey')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected))
  const [tone, setTone] = useState<ObsTone>('plus')
  const [skills, setSkills] = useState<Partial<Record<SkillKey, ObsTone>>>({})
  const [tags, setTags] = useState<string[]>([])
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | undefined>()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const { toast, toastNode } = useToast()
  const dict = useDictation(lang, (text) => setNote((n) => (n ? `${n.replace(/\s+$/, '')} ${text}` : text)))

  const all = useMemo(() => groups.flatMap((g) => g.players), [groups])
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all])
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const tapSkill = (k: SkillKey) => setSkills((cur) => { const n = { ...cur }; if (n[k] === tone) delete n[k]; else n[k] = tone; return n })
  const tapTag = (id: string) => setTags((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const content = Object.keys(skills).length + tags.length + (rating ? 1 : 0) + (note.trim() ? 1 : 0)
  const canSave = selected.size > 0 && content > 0 && !busy
  const names = [...selected].map((id) => byId.get(id)).filter(Boolean).map((p) => shortName(p!.name))

  const reset = () => { setSkills({}); setTags([]); setRating(undefined); setNote(''); dict.stop() }
  const save = async () => {
    if (!canSave) return
    setBusy(true)
    try {
      dict.stop()
      const list = await addObservations({ teamId, date: context.date, sessionId: context.sessionId, matchId: context.matchId, minute: minute ?? undefined, skills, tags, rating, note }, [...selected])
      reset()
      toast({ text: t('observe.saved', { count: list.length, names: names.join(', ') }), action: t('timeline.undo'), onAction: () => { db.observations.bulkDelete(list.map((o) => o.id)) } })
    } finally { setBusy(false) }
  }

  const picker = (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">{t('observe.players')}</h2>
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold tabular-nums text-ink-muted" aria-live="polite">{t('observe.selected', { count: selected.size })}</span>
          {selected.size > 0 && <button type="button" className="btn-ghost btn-sm min-h-[36px]" onClick={() => setSelected(new Set())}><X size={14} />{t('observe.clear')}</button>}
        </div>
      </div>
      {groups.filter((g) => g.players.length).map((g) => (
        <div key={g.id} className="mb-3">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="font-sans text-[12px] font-semibold tracking-normal text-ink-muted">{g.label} <span className="tabular-nums text-ink-faint">{g.players.length}</span></h3>
            {!g.muted && g.players.length > 1 && (
              <button type="button" className="text-[12px] font-semibold text-forest-700 hover:underline" onClick={() => setSelected((s) => { const n = new Set(s); const allIn = g.players.every((p) => n.has(p.id)); g.players.forEach((p) => (allIn ? n.delete(p.id) : n.add(p.id))); return n })}>
                {g.players.every((p) => selected.has(p.id)) ? t('observe.noneGroup') : t('observe.allGroup')}
              </button>
            )}
          </div>
          <ul className={cx('grid gap-1.5', compact ? 'grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-3')}>
            {g.players.map((p) => {
              const on = selected.has(p.id)
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => toggle(p.id)} aria-pressed={on} title={p.name}
                    className={cx('relative flex min-h-[52px] w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition',
                      on ? 'border-forest-600 bg-forest-50 ring-1 ring-forest-600' : 'border-line bg-paper hover:border-forest-300', g.muted && !on && 'opacity-55')}>
                    <NumberBadge player={p} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-tight text-ink">{shortName(p.name)}</span>
                    {on && <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-forest-600 text-cream"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {all.length === 0 && <p className="rounded-xl bg-sand/60 px-3 py-3 text-sm text-ink-muted">{t('observe.noPlayers')}</p>}
    </div>
  )

  const form = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('observe.toneLabel')}>
        {(['plus', 'work'] as ObsTone[]).map((x) => (
          <button key={x} type="button" role="radio" aria-checked={tone === x} onClick={() => setTone(x)}
            className={cx('flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 px-3 text-[15px] font-semibold transition',
              tone === x ? toneSolid[x] : 'border-line bg-paper text-ink-soft hover:border-ink-faint')}>
            {x === 'plus' ? <ThumbsUp size={18} aria-hidden="true" /> : <Target size={18} aria-hidden="true" />}{t(`tone.${x}`)}
          </button>
        ))}
      </div>

      <div>
        <h3 className="mb-1.5 font-sans text-[13px] font-semibold tracking-normal text-ink-soft">{t('observe.skills')}</h3>
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-5 lg:grid-cols-4 2xl:grid-cols-5">
          {SKILL_KEYS.map((k) => {
            const v = skills[k]
            return (
              <li key={k}>
                <button type="button" onClick={() => tapSkill(k)} aria-pressed={!!v} title={t(`team:skillDef.${k}`)}
                  className={cx('flex min-h-[44px] w-full items-center justify-center rounded-xl border px-2 text-center text-[13px] font-semibold leading-tight transition',
                    v ? toneSolid[v] : 'border-line bg-paper text-ink-soft hover:border-ink-faint')}>
                  {t(`team:skillsShort.${k}`)}
                  {v && <span className="sr-only">, {t(`tone.${v}`)}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <h3 className="mb-1.5 font-sans text-[13px] font-semibold tracking-normal text-ink-soft">{tone === 'plus' ? t('observe.tagsPlus') : t('observe.tagsWork')}</h3>
        <div className="flex flex-wrap gap-1.5">
          {OBS_TAGS.filter((tg) => tg.tone === tone).map((tg) => {
            const on = tags.includes(tg.id)
            return (
              <button key={tg.id} type="button" onClick={() => tapTag(tg.id)} aria-pressed={on}
                className={cx('min-h-[40px] rounded-full border px-3 text-[13px] font-medium transition', on ? toneSolid[tg.tone] : 'border-line bg-paper text-ink-soft hover:border-ink-faint')}>
                {t(`tags.${tg.id}`)}
              </button>
            )
          })}
        </div>
      </div>

      <div className={cx('grid gap-4', showMinute && 'sm:grid-cols-[1fr_auto]')}>
        <div>
          <h3 className="mb-1.5 font-sans text-[13px] font-semibold tracking-normal text-ink-soft" id="obs-rating">{t('observe.rating')}</h3>
          <div className="flex items-center gap-1.5" role="radiogroup" aria-labelledby="obs-rating">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(rating === n ? undefined : n)}
                className={cx('grid h-11 w-11 place-items-center rounded-full border text-sm font-semibold tabular-nums transition',
                  rating === n ? 'border-sun-500 bg-sun-500 text-night-900' : rating && n < rating ? 'border-sun-100 bg-sun-50 text-sun-700' : 'border-line bg-paper text-ink-muted hover:border-ink-faint')}>{n}</button>
            ))}
          </div>
          <p className="mt-1 text-[11.5px] text-ink-faint">{t('observe.ratingHint')}</p>
        </div>
        {showMinute && (
          <div>
            <label htmlFor="obs-min" className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t('observe.minute')}</label>
            <input id="obs-min" type="number" inputMode="numeric" min={0} max={130} className="input h-11 w-24 text-center tabular-nums" value={minute ?? ''}
              onChange={(e) => onMinute?.(e.target.value === '' ? null : Math.max(0, Math.min(130, Number(e.target.value))))} placeholder="34" />
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor="obs-note" className="text-[13px] font-semibold text-ink-soft">{t('observe.note')}</label>
          {dict.supported ? (
            <button type="button" onClick={dict.listening ? dict.stop : dict.start} aria-pressed={dict.listening}
              className={cx('inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition', dict.listening ? 'bg-clay-500 text-white' : 'bg-sand text-ink-soft hover:bg-line')}>
              {dict.listening ? <><span className="h-2 w-2 animate-pulse rounded-full bg-white" /><MicOff size={15} aria-hidden="true" />{t('observe.stopDictation')}</> : <><Mic size={15} aria-hidden="true" />{t('observe.dictate')}</>}
            </button>
          ) : <span className="text-[11.5px] text-ink-faint">{t('observe.noDictation')}</span>}
        </div>
        <textarea id="obs-note" rows={compact ? 2 : 3} className="input resize-y" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('observe.notePh')} />
        {dict.listening && dict.interim && <p className="mt-1 text-[13px] italic text-ink-muted" aria-live="polite">{dict.interim}</p>}
        {dict.error && <p className="mt-1 text-[12px] text-clay-600">{t('observe.dictationError')}</p>}
      </div>
    </div>
  )

  const summaryChips = obsSkillTones({ skills, tags: [] })
  return (
    <div>
      <div className={cx('grid gap-5', !compact && 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-6')}>
        <section className={cx(!compact && 'card card-pad')} aria-label={t('observe.players')}>{picker}</section>
        <section className={cx(!compact && 'card card-pad')} aria-label={t('observe.what')}>{form}</section>
      </div>
      <div className={cx('sticky z-20 mt-4', stickyClass)}>
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-paper/95 p-2.5 shadow-lift backdrop-blur sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 px-1 text-[12.5px] text-ink-muted">
            {selected.size === 0 ? t('observe.pickFirst') : content === 0 ? t('observe.addSomething', { names: names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '') }) : (
              <span className="flex flex-wrap items-center gap-1">
                <span className="font-semibold text-ink">{names.slice(0, 3).join(', ')}{names.length > 3 ? ` +${names.length - 3}` : ''}</span>
                {summaryChips.slice(0, 4).map(([k, x]) => <SkillChip key={k} skill={k} tone={x} />)}
                {tags.slice(0, 3).map((id) => { const tg = obsTag(id); return tg ? <span key={id} className={cx('rounded-full border px-2 py-0.5 text-[11.5px]', toneChip[tg.tone])}>{t(`tags.${id}`)}</span> : null })}
                {rating && <RatingDots value={rating} />}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {content > 0 && <button type="button" className="btn-ghost min-h-[48px]" onClick={reset}>{t('observe.reset')}</button>}
            <button type="button" className="btn-primary min-h-[48px] flex-1 sm:flex-none" onClick={save} disabled={!canSave}>
              <Check size={17} aria-hidden="true" />{selected.size > 1 ? t('observe.saveMany', { count: selected.size }) : t('observe.save')}
            </button>
          </div>
        </div>
      </div>
      {toastNode}
    </div>
  )
}

/** Observations already taken in this context (or today when there is none), most recent first. */
export function ObservationFeed({ teamId, context, players, limit = 30 }: { teamId: string; context: ObserveContext; players: Player[]; limit?: number }) {
  const { t, lang } = useT('journey')
  const { toast, toastNode } = useToast()
  const list = useLiveQuery(async () => {
    const all = context.sessionId ? await db.observations.where('sessionId').equals(context.sessionId).toArray()
      : context.matchId ? await db.observations.where('matchId').equals(context.matchId).toArray()
        : (await db.observations.where('date').equals(context.date ?? todayISO()).toArray()).filter((o) => o.teamId === teamId && !o.sessionId && !o.matchId)
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [teamId, context.sessionId, context.matchId, context.date], [] as Observation[])
  const byId = new Map(players.map((p) => [p.id, p]))
  // one row per group (the same observation given to several players)
  const rows: Observation[][] = []
  const seen = new Map<string, Observation[]>()
  for (const o of list) {
    if (o.groupId) { const g = seen.get(o.groupId); if (g) { g.push(o); continue } const n = [o]; seen.set(o.groupId, n); rows.push(n) } else rows.push([o])
  }
  const remove = async (group: Observation[]) => {
    await db.observations.bulkDelete(group.map((o) => o.id))
    toast({ text: t('timeline.obsDeleted'), action: t('timeline.undo'), onAction: () => { db.observations.bulkPut(group) } })
  }
  return (
    <section className="card card-pad" aria-labelledby="feed-h">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 id="feed-h" className="font-display text-lg font-semibold text-ink">{context.sessionId ? t('feed.session') : context.matchId ? t('feed.match') : t('feed.today')}</h2>
        <span className="text-xs tabular-nums text-ink-muted">{t('feed.count', { count: list.length })}</span>
      </div>
      {rows.length === 0 ? <p className="text-sm text-ink-muted">{t('feed.empty')}</p> : (
        <ul className="divide-y divide-line/70">
          {rows.slice(0, limit).map((g) => {
            const o = g[0]
            return (
              <li key={o.id} className="flex items-start gap-2 py-2.5">
                <span className="w-12 shrink-0 pt-0.5 text-[12px] font-semibold tabular-nums text-ink-muted">{o.minute ? `${o.minute}'` : o.time ?? fmtDate(o.date, lang, { day: 'numeric', month: 'short' })}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-ink">{g.map((x) => (byId.get(x.playerId) ? shortName(byId.get(x.playerId)!.name) : '?')).join(', ')}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {obsSkillTones({ skills: o.skills, tags: [] }).map(([k, x]) => <SkillChip key={k} skill={k} tone={x} />)}
                    {o.tags.map((id) => { const tg = obsTag(id); return tg ? <span key={id} className={cx('rounded-full border px-2 py-0.5 text-[11.5px]', toneChip[tg.tone])}>{t(`tags.${id}`)}</span> : null })}
                    {o.rating && <RatingDots value={o.rating} className="ml-1" />}
                  </div>
                  {o.note && <p className="mt-1 text-[13px] italic text-ink-soft">{quote(o.note, lang)}</p>}
                </div>
                <button type="button" onClick={() => remove(g)} aria-label={t('timeline.deleteObs')} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-faint hover:bg-clay-50 hover:text-clay-600"><Trash2 size={16} /></button>
              </li>
            )
          })}
        </ul>
      )}
      {toastNode}
    </section>
  )
}
