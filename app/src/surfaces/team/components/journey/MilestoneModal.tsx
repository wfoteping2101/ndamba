// Record a moment by hand: a call-up, a move to an older category, the armband, an injury and the return...
// First match, first goal and level changes are added by the app on their own.
import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Field, Modal } from '../../../../ui'
import { useT } from '../../../../i18n'
import { db } from '../../../../lib/db'
import { cx, todayISO } from '../../../../lib/util'
import { saveMilestone } from '../../../../lib/journey'
import type { Milestone, MilestoneKind, Player } from '../../../../lib/types'

const KINDS: MilestoneKind[] = ['callup', 'promotion', 'captain', 'award', 'injury', 'return', 'other']

export function MilestoneModal({ open, onClose, player, existing }: { open: boolean; onClose: () => void; player: Player; existing?: Milestone | null }) {
  const { t } = useT('journey')
  const [kind, setKind] = useState<MilestoneKind>('callup')
  const [date, setDate] = useState(todayISO())
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  useEffect(() => {
    if (!open) return
    setKind(existing?.kind ?? 'callup'); setDate(existing?.date ?? todayISO()); setTitle(existing?.title ?? ''); setNote(existing?.note ?? '')
  }, [open, existing?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    await saveMilestone({ id: existing?.id, createdAt: existing?.createdAt, playerId: player.id, teamId: player.teamId, kind, date, title: title.trim() || t(`milestones.default.${kind}`), note: note.trim() || undefined })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={existing ? t('milestones.editTitle') : t('milestones.newTitle', { name: player.name })}
      footer={<>
        {existing && <button type="button" className="btn-ghost mr-auto text-clay-600" onClick={async () => { await db.milestones.delete(existing.id); onClose() }}><Trash2 size={16} />{t('common:actions.delete')}</button>}
        <button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button>
        <button type="button" className="btn-primary" onClick={save}>{t('milestones.save')}</button>
      </>}>
      <div className="mb-4">
        <div className="label" id="ms-kind">{t('milestones.kindLabel')}</div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="ms-kind">
          {KINDS.map((k) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cx('chip min-h-[40px] cursor-pointer px-3 text-[13px]', kind === k && 'chip-on')}>{t(`milestones.kind.${k}`)}</button>)}
        </div>
      </div>
      <Field label={t('milestones.date')} htmlFor="ms-date"><input id="ms-date" type="date" className="input sm:w-48" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
      <Field label={t('milestones.titleLabel')} htmlFor="ms-title"><input id="ms-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t(`milestones.placeholder.${kind}`)} /></Field>
      <Field label={t('milestones.note')} htmlFor="ms-note"><textarea id="ms-note" rows={2} className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <p className="text-xs text-ink-faint">{t('milestones.autoNote')}</p>
    </Modal>
  )
}
