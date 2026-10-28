// Set, edit or review a personal objective: linked to a competence or to a sub-index of the Indice Njangi,
// for a cycle of six to eight weeks, three at a time at most.
import { useEffect, useState } from 'react'
import { Sparkles, Trash2 } from 'lucide-react'
import { Callout, Field, Modal, Segmented } from '../../../../ui'
import { useT } from '../../../../i18n'
import { db } from '../../../../lib/db'
import { addDays, cx, todayISO } from '../../../../lib/util'
import { CYCLE_WEEKS, levelsAt, MAX_ACTIVE_OBJECTIVES, NJANGI_SUBS, saveObjective, SKILL_KEYS, type JourneyData, type Stage } from '../../../../lib/journey'
import type { NjangiSub, Objective, ObjectiveStatus, SkillKey } from '../../../../lib/types'

const STATUSES: ObjectiveStatus[] = ['active', 'achieved', 'partial', 'notyet']

export function ObjectiveModal({ open, onClose, data, existing, by, stage }: {
  open: boolean; onClose: () => void; data: JourneyData; existing?: Objective | null; by: 'coach' | 'player'; stage: Stage
}) {
  const { t } = useT('journey')
  const [link, setLink] = useState<'skill' | 'sub'>('skill')
  const [skill, setSkill] = useState<SkillKey>('scan')
  const [sub, setSub] = useState<NjangiSub>('progression')
  const [title, setTitle] = useState('')
  const [start, setStart] = useState(todayISO())
  const [review, setReview] = useState(addDays(todayISO(), CYCLE_WEEKS * 7))
  const [status, setStatus] = useState<ObjectiveStatus>('active')
  const [reviewNote, setReviewNote] = useState('')
  const [busy, setBusy] = useState(false)
  const levels = levelsAt(data.evaluations, todayISO())

  useEffect(() => {
    if (!open) return
    if (existing) {
      setLink(existing.sub ? 'sub' : 'skill'); setSkill(existing.skill ?? 'scan'); setSub(existing.sub ?? 'progression')
      setTitle(existing.title); setStart(existing.start); setReview(existing.review); setStatus(existing.status); setReviewNote(existing.reviewNote ?? '')
    } else {
      // suggest the competence with the lowest level (the "next step"), as chapter 25 advises
      const weakest = SKILL_KEYS.filter((k) => levels[k] && levels[k]! < 4).sort((a, b) => levels[a]! - levels[b]!)[0] ?? 'scan'
      setLink('skill'); setSkill(weakest); setSub('progression'); setTitle(''); setStart(todayISO()); setReview(addDays(todayISO(), CYCLE_WEEKS * 7)); setStatus('active'); setReviewNote('')
    }
  }, [open, existing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = data.objectives.filter((o) => o.status === 'active' && o.id !== existing?.id).length
  const full = !existing && active >= MAX_ACTIVE_OBJECTIVES
  const reopenFull = !!existing && existing.status !== 'active' && status === 'active' && active >= MAX_ACTIVE_OBJECTIVES
  const lvl = levels[skill]
  const suggestion = link === 'skill'
    ? (lvl && lvl < 4 ? t('objectives.suggestSkill', { n: lvl + 1, text: t(`team:skillDesc.${skill}.${lvl + 1}`) }) : t(`objectives.suggestSkillBase.${skill}`))
    : t(`objectives.suggestSub.${sub}`)
  const canEdit = by === 'coach' || !existing || existing.by === 'player'

  const save = async () => {
    if (busy || full || reopenFull || !canEdit) return
    setBusy(true)
    try {
      const reviewed = status !== 'active'
      await saveObjective({
        id: existing?.id, createdAt: existing?.createdAt, playerId: data.player.id, teamId: data.player.teamId,
        title: title.trim() || suggestion, skill: link === 'skill' ? skill : undefined, sub: link === 'sub' ? sub : undefined,
        start, review: review < start ? start : review, status, reviewNote: reviewed ? reviewNote.trim() || undefined : existing?.reviewNote,
        reviewedAt: reviewed ? (existing?.status === status && existing.reviewedAt ? existing.reviewedAt : new Date().toISOString()) : undefined,
        by: existing?.by ?? by,
      })
      onClose()
    } finally { setBusy(false) }
  }
  const remove = async () => { if (existing) { await db.objectives.delete(existing.id); onClose() } }

  return (
    <Modal open={open} onClose={onClose} title={existing ? t('objectives.editTitle') : by === 'player' ? t('objectives.newTitlePlayer') : t('objectives.newTitle', { name: data.player.name })}
      footer={<>
        {existing && canEdit && <button type="button" className="btn-ghost mr-auto text-clay-600" onClick={remove}><Trash2 size={16} />{t('common:actions.delete')}</button>}
        <button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button>
        <button type="button" className="btn-primary" onClick={save} disabled={busy || full || reopenFull || !canEdit}>{existing ? t('objectives.saveEdit') : t('objectives.save')}</button>
      </>}>
      {full && <div className="mb-4"><Callout tone="sun" title={t('objectives.fullTitle', { n: MAX_ACTIVE_OBJECTIVES })}>{t('objectives.fullBody')}</Callout></div>}
      {!canEdit && <div className="mb-4"><Callout tone="sun">{t('objectives.coachOnly')}</Callout></div>}
      <fieldset disabled={!canEdit} className="min-w-0">
        <div className="mb-4">
          <div className="label">{t('objectives.linkLabel')}</div>
          <Segmented value={link} onChange={setLink} options={[{ id: 'skill', label: t('objectives.linkSkill') }, { id: 'sub', label: t('objectives.linkSub') }]} />
        </div>
        {link === 'skill' ? (
          <Field label={t('objectives.skill')} htmlFor="ob-skill">
            <select id="ob-skill" className="input" value={skill} onChange={(e) => setSkill(e.target.value as SkillKey)}>
              {SKILL_KEYS.map((k) => <option key={k} value={k}>{t(`common:skills.${k}`)}{levels[k] ? ` (${levels[k]})` : ''}</option>)}
            </select>
          </Field>
        ) : (
          <Field label={t('objectives.sub')} htmlFor="ob-sub" hint={t('objectives.subHint')}>
            <select id="ob-sub" className="input" value={sub} onChange={(e) => setSub(e.target.value as NjangiSub)}>
              {NJANGI_SUBS.map((k) => <option key={k} value={k}>{t(`analysis:sub.${k}.name`)}</option>)}
            </select>
          </Field>
        )}
        <Field label={t('objectives.titleLabel')} htmlFor="ob-title">
          <textarea id="ob-title" rows={2} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={suggestion} />
        </Field>
        {!title.trim() && (
          <button type="button" className="mb-4 -mt-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-1 text-left text-[13px] font-semibold text-forest-700 hover:underline" onClick={() => setTitle(suggestion)}>
            <Sparkles size={14} aria-hidden="true" />{t('objectives.useSuggestion')}
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('objectives.start')} htmlFor="ob-start"><input id="ob-start" type="date" className="input" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} /></Field>
          <Field label={t('objectives.review')} htmlFor="ob-review"><input id="ob-review" type="date" className="input" value={review} min={start} onChange={(e) => e.target.value && setReview(e.target.value)} /></Field>
        </div>
        <div className="-mt-2 mb-4 flex flex-wrap gap-1.5">
          {[6, 8].map((w) => (
            <button key={w} type="button" onClick={() => setReview(addDays(start, w * 7))} aria-pressed={review === addDays(start, w * 7)}
              className={cx('chip min-h-[36px] cursor-pointer px-3', review === addDays(start, w * 7) && 'chip-on')}>{t('objectives.weeks', { n: w })}</button>
          ))}
          <span className="self-center text-xs text-ink-faint">{t('objectives.cycleHint')}</span>
        </div>
        {existing && (
          <div className="rounded-2xl border border-line bg-cream/60 p-3">
            <div className="label">{t('objectives.statusLabel')}</div>
            <Segmented value={status} onChange={setStatus} options={STATUSES.map((s) => ({ id: s, label: t(`objectives.status.${s}${s === 'notyet' && stage === 'adult' ? 'Adult' : ''}`) }))} />
            {reopenFull && <p className="mt-2 text-xs text-clay-600">{t('objectives.fullBody')}</p>}
            {status !== 'active' && (
              <div className="mt-3">
                <Field label={t('objectives.reviewNote')} htmlFor="ob-rn"><textarea id="ob-rn" rows={2} className="input" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder={t('objectives.reviewNotePh')} /></Field>
              </div>
            )}
          </div>
        )}
      </fieldset>
    </Modal>
  )
}
