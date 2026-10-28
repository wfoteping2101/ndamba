// A dated evaluation of the ten competences (chapter 25 grid). Prefilled with the current levels,
// with the observations gathered since the last evaluation as evidence.
import { useEffect, useMemo, useState } from 'react'
import { Callout, Field, Modal } from '../../../../ui'
import { useT } from '../../../../i18n'
import { cx, fmtDate, todayISO } from '../../../../lib/util'
import { levelsAt, obsSkillTones, saveEvaluation, SKILL_KEYS, type JourneyData, type Level, type Skills } from '../../../../lib/journey'

const LEVELS: Level[] = [1, 2, 3, 4]
const levelTone: Record<Level, string> = {
  1: 'border-terra-500 bg-terra-500 text-white',
  2: 'border-sun-500 bg-sun-500 text-night-900',
  3: 'border-forest-500 bg-forest-500 text-cream',
  4: 'border-forest-700 bg-forest-700 text-cream',
}

export function EvaluationModal({ open, onClose, data, onSaved }: { open: boolean; onClose: () => void; data: JourneyData; onSaved?: () => void }) {
  const { t, lang } = useT('journey')
  const [date, setDate] = useState(todayISO())
  const [levels, setLevels] = useState<Skills>({})
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setDate(todayISO()); setNote('')
    setLevels({ ...levelsAt(data.evaluations, todayISO()), ...(data.evaluations.length ? {} : data.player.skills) })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // the previous evaluation (strictly before the chosen date): evidence counts from there
  const last = data.evaluations.filter((e) => e.date < date).pop()
  const evidence = useMemo(() => {
    const out: Record<string, { plus: number; work: number }> = {}
    for (const o of data.observations) {
      if (last && o.date < last.date) continue
      if (o.date > date) continue
      for (const [k, tone] of obsSkillTones(o)) { const r = (out[k] ??= { plus: 0, work: 0 }); r[tone] += 1 }
    }
    return out
  }, [data.observations, last, date])
  const prev = levelsAt(data.evaluations.filter((e) => e.date < date), date)
  const sameDay = data.evaluations.find((e) => e.date === date && e.by === 'coach')
  const rated = SKILL_KEYS.filter((k) => levels[k]).length

  const set = (k: (typeof SKILL_KEYS)[number], v: Level) => setLevels((cur) => { const n = { ...cur }; if (n[k] === v) delete n[k]; else n[k] = v; return n })
  const save = async () => {
    if (!rated || busy) return
    setBusy(true)
    try {
      await saveEvaluation({ id: sameDay?.id, createdAt: sameDay?.createdAt, playerId: data.player.id, teamId: data.player.teamId, date, skills: levels, note: note.trim() || undefined, by: 'coach' })
      onSaved?.(); onClose()
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} wide title={t('evaluate.title', { name: data.player.name })}
      footer={<>
        <span className="mr-auto self-center text-xs text-ink-muted">{t('evaluate.rated', { n: rated })}</span>
        <button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button>
        <button type="button" className="btn-primary" onClick={save} disabled={!rated || busy}>{t('evaluate.save')}</button>
      </>}>
      <div className="mb-4 grid gap-3 sm:grid-cols-[180px_1fr] sm:items-start">
        <Field label={t('evaluate.date')} htmlFor="ev-date"><input id="ev-date" type="date" className="input" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
        <Callout tone="forest">{t('evaluate.rule')}</Callout>
      </div>
      {last && <p className="mb-2 text-[13px] text-ink-muted">{t('evaluate.since', { date: fmtDate(last.date, lang, { day: 'numeric', month: 'long' }) })}</p>}
      <ol className="divide-y divide-line/70 rounded-2xl border border-line">
        {SKILL_KEYS.map((k, idx) => {
          const v = levels[k]
          const ev = evidence[k]
          const before = prev[k]
          return (
            <li key={k} className="px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="font-sans text-[15px] font-semibold tracking-normal text-ink"><span className="mr-2 text-xs tabular-nums text-ink-faint">{idx + 1}</span>{t(`common:skills.${k}`)}</h3>
                <span className="flex items-center gap-2 text-[11.5px] font-semibold">
                  {ev?.plus ? <span className="rounded-full bg-forest-50 px-2 py-0.5 text-forest-700">{t('evaluate.plus', { count: ev.plus })}</span> : null}
                  {ev?.work ? <span className="rounded-full bg-terra-50 px-2 py-0.5 text-terra-700">{t('evaluate.work', { count: ev.work })}</span> : null}
                  {before && v && before !== v && <span className={before < v ? 'text-forest-700' : 'text-terra-700'}>{t('evaluate.was', { n: before })}</span>}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={t(`common:skills.${k}`)}>
                {LEVELS.map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={v === l} onClick={() => set(k, l)} title={t(`team:skillDesc.${k}.${l}`)}
                    className={cx('flex min-h-[46px] flex-col items-center justify-center rounded-xl border px-1 py-1 transition',
                      v === l ? levelTone[l] : v && l < v ? 'border-forest-100 bg-forest-50 text-forest-700' : 'border-line bg-paper text-ink-muted hover:border-ink-faint')}>
                    <span className="font-display text-lg font-semibold leading-none">{l}</span>
                    <span className="mt-0.5 max-w-full truncate text-[10.5px] font-semibold">{t(`team:levels.${l}`)}</span>
                  </button>
                ))}
              </div>
              {v && <p className="mt-1.5 text-[12.5px] leading-snug text-ink-muted">{t(`team:skillDesc.${k}.${v}`)}</p>}
            </li>
          )
        })}
      </ol>
      <div className="mt-4">
        <Field label={t('evaluate.note')} htmlFor="ev-note" hint={t('evaluate.noteHint')}>
          <textarea id="ev-note" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('evaluate.notePh')} />
        </Field>
      </div>
    </Modal>
  )
}
