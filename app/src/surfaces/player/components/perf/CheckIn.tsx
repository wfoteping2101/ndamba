// « Ma forme du jour »: the morning questionnaire (five items from 1 to 5) and, after the session or the
// match, the perceived exertion (0 to 10) and the minutes. Le Code Njangi, chapter 29.
import { useEffect, useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { Callout } from '../../../../ui'
import { useT } from '../../../../i18n'
import { sessionMinutes } from '../../../../lib/actions'
import { minutesOf } from '../../../../lib/journey'
import { cx } from '../../../../lib/util'
import type { Score5, Wellness } from '../../../../lib/types'
import { FORM_KEYS, FORM_MAX, FORM_TONE, formBand, formScore, hasForm, loadOf, saveWellness, type FormKey, type PerfData } from './data'
import { PerfHead, ScaleRow, fmtInt, fmtSigned } from './bits'

/** Words for the exertion scale (the table of chapter 29). */
export const rpeWord = (v: number) => (v <= 0 ? 0 : v <= 2 ? 1 : v <= 4 ? 2 : v <= 6 ? 3 : v <= 8 ? 4 : 5)

export function CheckInCard({ d }: { d: PerfData }) {
  const { t, lang } = useT('player')
  const { today, form } = d
  const todays = form.todays
  const [editForm, setEditForm] = useState(false)
  const [editRpe, setEditRpe] = useState(false)
  const done = hasForm(todays)
  const showForm = !done || editForm

  // today's session or match, to prefill the minutes
  const session = d.sessions.find((s) => s.date === today)
  const match = d.matches.find((m) => m.date === today)
  const played = match && d.me ? minutesOf(match, d.me.id) : 0
  const rpeDone = typeof todays?.rpe === 'number'
  const [rpeOpen, setRpeOpen] = useState(false)
  const expectRpe = !!session || !!match
  // the exertion comes after the session: its form opens once the questionnaire is done, or on demand
  const showRpe = (!rpeDone && ((expectRpe && done) || rpeOpen)) || editRpe

  return (
    <section className="flex h-full flex-col rounded-[22px] border border-line bg-paper p-5 sm:p-6" aria-labelledby="ci-h">
      <PerfHead id="ci-h" eyebrow={t('perf.form.eyebrow')} title={t('perf.form.title')}
        hint={showForm ? t('perf.form.hint') : undefined}
        action={done && !editForm ? <button type="button" className="btn-ghost btn-sm min-h-[44px]" onClick={() => setEditForm(true)}><Pencil size={15} aria-hidden="true" />{t('common:actions.edit')}</button> : undefined} />

      {form.dropping && <div className="mb-5"><Callout tone="clay" title={t('perf.form.dropTitle')}>{t('perf.form.dropBody')}</Callout></div>}

      {showForm ? (
        <FormQuestions initial={todays} onSave={async (v) => { await saveWellness(today, { ...v, playerId: d.me?.id }); setEditForm(false) }} onCancel={done ? () => setEditForm(false) : undefined} />
      ) : (
        <FormSummary w={todays!} baseline={form.baseline} />
      )}

      <div className="mt-6 border-t border-line pt-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[17px] leading-tight text-ink">{t('perf.rpe.title')}</h3>
          {rpeDone && !editRpe && <button type="button" className="btn-ghost btn-sm min-h-[44px]" onClick={() => setEditRpe(true)}><Pencil size={15} aria-hidden="true" />{t('common:actions.edit')}</button>}
        </div>
        {showRpe ? (
          <RpeForm initial={todays} defaultMinutes={match ? (played || 90) : session ? sessionMinutes(session) : 60}
            context={match ? t('perf.rpe.ctxMatch', { opponent: match.opponent }) : session ? t('perf.rpe.ctxSession', { title: session.title }) : t('perf.rpe.ctxOwn')}
            onSave={async (rpe, minutes) => { await saveWellness(today, { rpe, minutes, sessionId: match ? undefined : session?.id, matchId: match?.id, playerId: d.me?.id }); setEditRpe(false); setRpeOpen(false) }}
            onCancel={rpeDone || rpeOpen ? () => { setEditRpe(false); setRpeOpen(false) } : undefined} />
        ) : rpeDone ? (
          <p className="text-[14px] text-ink-soft">
            {t('perf.rpe.done', { rpe: todays!.rpe, word: t(`perf.rpe.words.${rpeWord(todays!.rpe!)}`), minutes: todays!.minutes ?? 0 })}
            <span className="ml-1 font-semibold text-ink">{t('perf.load.ua', { n: fmtInt(loadOf(todays), lang) })}</span>
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 flex-1 basis-56 text-[13px] text-ink-muted">{expectRpe ? t('perf.rpe.when') : t('perf.rpe.none')}</p>
            <button type="button" className="btn-outline btn-sm min-h-[44px]" onClick={() => setRpeOpen(true)}>{expectRpe ? t('perf.rpe.addNow') : t('perf.rpe.add')}</button>
          </div>
        )}
      </div>
      <p className="mt-auto pt-5 text-[12.5px] text-ink-muted">{t('perf.form.private')}</p>
    </section>
  )
}

function FormQuestions({ initial, onSave, onCancel }: { initial: Wellness | null; onSave: (v: Record<FormKey, Score5>) => void; onCancel?: () => void }) {
  const { t } = useT('player')
  const [v, setV] = useState<Partial<Record<FormKey, Score5>>>(() => (initial ? Object.fromEntries(FORM_KEYS.filter((k) => initial[k]).map((k) => [k, initial[k]])) : {}))
  const complete = FORM_KEYS.every((k) => v[k])
  const n = FORM_KEYS.filter((k) => v[k]).length
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (complete) onSave(v as Record<FormKey, Score5>) }}>
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        {FORM_KEYS.map((k) => (
          <ScaleRow key={k} id={`f-${k}`} label={t(`perf.form.items.${k}.label`)} value={v[k]} onChange={(x) => setV((p) => ({ ...p, [k]: x as Score5 }))}
            low={t(`perf.form.items.${k}.low`)} high={t(`perf.form.items.${k}.high`)} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" className="btn-primary min-h-[44px]" disabled={!complete}><Check size={16} aria-hidden="true" />{t('perf.form.save')}</button>
        {onCancel && <button type="button" className="btn-ghost min-h-[44px]" onClick={onCancel}>{t('common:actions.cancel')}</button>}
        <span className="text-[13px] tabular-nums text-ink-muted" aria-live="polite">{t('perf.form.progress', { n, total: FORM_KEYS.length })}</span>
      </div>
    </form>
  )
}

function FormSummary({ w, baseline }: { w: Wellness; baseline: number | null }) {
  const { t, lang } = useT('player')
  const score = formScore(w)!
  const band = formBand(score)
  const tone = FORM_TONE[band]
  const diff = baseline !== null ? score - baseline : null
  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="flex items-end gap-1.5">
          <span className={cx('font-display text-[56px] leading-none tabular-nums', tone.text)}>{score}</span>
          <span className="pb-1.5 text-sm font-semibold text-ink-faint">/ {FORM_MAX}</span>
        </div>
        <div className="pb-1">
          <span className={cx('inline-flex rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold', tone.bg, tone.text)}>{t(`perf.form.band.${band}`)}</span>
          <div className="mt-1 text-[12.5px] text-ink-muted">
            {diff !== null ? t('perf.form.vsBaseline', { diff: fmtSigned(diff, lang, 1), avg: baseline!.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 }) }) : t('perf.form.noBaseline')}
          </div>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-5 gap-2" aria-label={t('perf.form.detail')}>
        {FORM_KEYS.map((k) => (
          <li key={k} className="min-w-0">
            <div className="flex h-12 items-end gap-[3px]" role="img" aria-label={`${t(`perf.form.items.${k}.label`)} : ${w[k]} / 5`}>
              {[1, 2, 3, 4, 5].map((l) => <span key={l} className={cx('flex-1 rounded-[2px]', l <= (w[k] ?? 0) ? tone.bar : 'bg-sand')} style={{ height: `${l * 20}%` }} />)}
            </div>
            <div className="mt-1 truncate text-center text-[12px] font-medium text-ink-muted">{t(`perf.form.items.${k}.short`)}</div>
          </li>
        ))}
      </ul>
      {band === 'low' && <p className="mt-3 text-[13.5px] font-medium text-clay-700">{t('perf.form.lowHint')}</p>}
    </div>
  )
}

function RpeForm({ initial, defaultMinutes, context, onSave, onCancel }: { initial: Wellness | null; defaultMinutes: number; context: string; onSave: (rpe: number, minutes: number) => void; onCancel?: () => void }) {
  const { t, lang } = useT('player')
  const [rpe, setRpe] = useState<number | undefined>(initial?.rpe)
  const [minutes, setMinutes] = useState(String(initial?.minutes ?? defaultMinutes))
  useEffect(() => { if (initial?.minutes === undefined) setMinutes(String(defaultMinutes)) }, [defaultMinutes, initial?.minutes])
  const m = Math.max(0, Math.round(Number(minutes) || 0))
  const ok = rpe !== undefined && m > 0
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ok) onSave(rpe!, m) }}>
      <p className="mb-3 text-[13px] text-ink-muted">{context}</p>
      <ScaleRow id="rpe" label={t('perf.rpe.question')} value={rpe} onChange={setRpe} from={0} to={10} low={t('perf.rpe.words.0')} high={t('perf.rpe.words.5')} describe={(v) => t(`perf.rpe.words.${rpeWord(v)}`)} />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="rpe-min" className="mb-1 block text-[12.5px] font-medium text-ink-soft">{t('perf.rpe.minutes')}</label>
          <input id="rpe-min" type="number" inputMode="numeric" min={1} max={240} className="input h-11 w-28" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </div>
        <div className="pb-2.5 text-[13px] text-ink-muted" aria-live="polite">
          {ok ? <>{t('perf.rpe.preview')} <span className="font-semibold tabular-nums text-ink">{t('perf.load.ua', { n: fmtInt(rpe! * m, lang) })}</span></> : t('perf.rpe.formula')}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" className="btn-primary min-h-[44px]" disabled={!ok}><Check size={16} aria-hidden="true" />{t('perf.rpe.save')}</button>
        {onCancel && <button type="button" className="btn-ghost min-h-[44px]" onClick={onCancel}>{t('common:actions.cancel')}</button>}
      </div>
    </form>
  )
}
