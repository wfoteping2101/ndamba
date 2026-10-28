// Team and player forms (modals) for the team surface.
import { useEffect, useMemo, useState } from 'react'
import { db } from '../../../lib/db'
import { addPlayer, createTeam } from '../../../lib/actions'
import { DEFAULT_FORMATION, FORMATIONS, POSITIONS } from '../../../lib/formations'
import type { Player, Team } from '../../../lib/types'
import { Field, Modal, Segmented } from '../../../ui'
import { useT } from '../../../i18n'
import { cx } from '../../../lib/util'

export const FORMATS: Team['format'][] = [5, 7, 8, 9, 11]
export const AGE_GROUPS = ['U7', 'U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'U20', 'Seniors']

export function FormatPicker({ value, onChange }: { value: Team['format']; onChange: (f: Team['format']) => void }) {
  const { t } = useT('team')
  return <Segmented options={FORMATS.map((f) => ({ id: String(f), label: t('formatLabel', { n: f }) }))} value={String(value)} onChange={(v) => onChange(Number(v) as Team['format'])} />
}

export function FormationPicker({ format, value, onChange }: { format: number; value: string; onChange: (f: string) => void }) {
  return <Segmented options={Object.keys(FORMATIONS[format] || {}).map((f) => ({ id: f, label: f }))} value={value} onChange={onChange} />
}

/** Create a team (team undefined) or edit one. */
export function TeamFormModal({ open, onClose, team, onSaved }: { open: boolean; onClose: () => void; team?: Team | null; onSaved?: (t: Team) => void }) {
  const { t } = useT('team')
  const [name, setName] = useState('')
  const [ageGroup, setAgeGroup] = useState('U13')
  const [format, setFormat] = useState<Team['format']>(11)
  const [formation, setFormation] = useState(DEFAULT_FORMATION[11])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    setName(team?.name ?? ''); setAgeGroup(team?.ageGroup ?? 'U13'); setFormat(team?.format ?? 11); setFormation(team?.formation ?? DEFAULT_FORMATION[team?.format ?? 11]); setError('')
  }, [open, team])
  const pickFormat = (f: Team['format']) => { setFormat(f); if (!FORMATIONS[f]?.[formation]) setFormation(DEFAULT_FORMATION[f]) }
  const save = async () => {
    if (!name.trim()) { setError(t('teamForm.nameRequired')); return }
    if (team) {
      await db.teams.update(team.id, { name: name.trim(), ageGroup, format, formation })
      onSaved?.({ ...team, name: name.trim(), ageGroup, format, formation })
    } else {
      const created = await createTeam({ name: name.trim(), ageGroup, format, formation })
      onSaved?.(created)
    }
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={team ? t('teamForm.editTitle') : t('teamForm.createTitle')}
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button><button type="button" className="btn-primary" onClick={save}>{team ? t('common:actions.save') : t('common:actions.create')}</button></>}>
      <form onSubmit={(e) => { e.preventDefault(); save() }}>
        <Field label={t('teamForm.name')} htmlFor="tf-name" hint={error ? <span className="text-clay-600">{error}</span> : undefined}>
          <input id="tf-name" className="input" value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder={t('teamForm.namePh')} autoFocus aria-invalid={!!error} />
        </Field>
        <Field label={t('teamForm.ageGroup')}>
          <Segmented options={AGE_GROUPS.map((a) => ({ id: a, label: a }))} value={ageGroup} onChange={setAgeGroup} />
        </Field>
        <Field label={t('teamForm.format')}><FormatPicker value={format} onChange={pickFormat} /></Field>
        <Field label={t('teamForm.formation')}><FormationPicker format={format} value={formation} onChange={setFormation} /></Field>
      </form>
    </Modal>
  )
}

const FEET: NonNullable<Player['foot']>[] = ['R', 'L', 'B']

/** Add a player (player undefined) or edit identity fields of one. */
export function PlayerFormModal({ open, onClose, teamId, player, takenNumbers = [] }: { open: boolean; onClose: () => void; teamId: string; player?: Player | null; takenNumbers?: number[] }) {
  const { t } = useT('team')
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [position, setPosition] = useState('CM')
  const [birthYear, setBirthYear] = useState('')
  const [foot, setFoot] = useState<Player['foot']>()
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const reset = (p?: Player | null) => {
    setName(p?.name ?? ''); setNumber(p?.number !== undefined ? String(p.number) : ''); setPosition(p?.position ?? 'CM')
    setBirthYear(p?.birthYear ? String(p.birthYear) : ''); setFoot(p?.foot); setError('')
  }
  useEffect(() => { if (open) { reset(player); setFlash('') } }, [open, player])
  const save = async (again = false) => {
    if (!name.trim()) { setError(t('playerForm.nameRequired')); return }
    const num = number.trim() === '' ? undefined : Math.max(0, Math.min(99, parseInt(number, 10)))
    const by = birthYear.trim() === '' ? undefined : parseInt(birthYear, 10)
    if (player) {
      await db.players.update(player.id, { name: name.trim(), number: Number.isNaN(num as number) ? undefined : num, position, birthYear: Number.isNaN(by as number) ? undefined : by, foot })
      onClose(); return
    }
    const created = await addPlayer({ teamId, name: name.trim(), number: Number.isNaN(num as number) ? undefined : num, position, birthYear: Number.isNaN(by as number) ? undefined : by })
    if (foot) await db.players.update(created.id, { foot })
    if (again) { setFlash(t('playerForm.added', { name: created.name })); reset(null); setPosition(position); document.getElementById('pf-name')?.focus() }
    else onClose()
  }
  const numClash = number.trim() !== '' && takenNumbers.includes(parseInt(number, 10)) && (!player || player.number !== parseInt(number, 10))
  return (
    <Modal open={open} onClose={onClose} title={player ? t('playerForm.editTitle') : t('playerForm.addTitle')}
      footer={<>
        {!player && <button type="button" className="btn-ghost" onClick={() => save(true)}>{t('playerForm.addAnother')}</button>}
        <button type="button" className="btn-primary" onClick={() => save(false)}>{player ? t('common:actions.save') : t('common:actions.add')}</button>
      </>}>
      <form onSubmit={(e) => { e.preventDefault(); save(false) }}>
        {flash && <p className="mb-3 rounded-xl bg-forest-50 px-3 py-2 text-sm font-medium text-forest-700" role="status">{flash}</p>}
        <div className="grid grid-cols-[1fr_88px] gap-3">
          <Field label={t('playerForm.name')} htmlFor="pf-name" hint={error ? <span className="text-clay-600">{error}</span> : undefined}>
            <input id="pf-name" className="input" value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder={t('playerForm.namePh')} autoFocus aria-invalid={!!error} />
          </Field>
          <Field label={t('playerForm.number')} htmlFor="pf-num" hint={numClash ? <span className="text-terra-600">{t('playerForm.numberTaken', { n: number })}</span> : undefined}>
            <input id="pf-num" className="input text-center tabular-nums" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>
        <Field label={t('playerForm.position')}>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {POSITIONS.map((p) => (
              <button key={p} type="button" onClick={() => setPosition(p)} aria-pressed={position === p}
                className={cx('min-h-[44px] rounded-xl border px-2 py-2 text-left text-[13px] font-semibold leading-tight transition', position === p ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft hover:border-ink-faint')}>
                {t(`common:positions.${p}`)}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-[120px_1fr]">
          <Field label={t('playerForm.birthYear')} htmlFor="pf-by">
            <input id="pf-by" className="input tabular-nums" inputMode="numeric" maxLength={4} value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ''))} placeholder="2013" />
          </Field>
          <Field label={t('playerForm.foot')}>
            <div className="flex flex-wrap gap-1.5">
              {FEET.map((f) => (
                <button key={f} type="button" onClick={() => setFoot(foot === f ? undefined : f)} aria-pressed={foot === f}
                  className={cx('min-h-[44px] rounded-xl border px-3 text-[13px] font-semibold transition', foot === f ? 'border-forest-600 bg-forest-600 text-cream' : 'border-line bg-paper text-ink-soft')}>
                  {t(`foot.${f}`)}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </form>
    </Modal>
  )
}

/** Paste a list: one name per line, optional number first ("8 Kaydoudou", "8. Kaydoudou", "#8 Kaydoudou", "Kaydoudou 8"). */
export function parseRoster(text: string) {
  return text.split(/\r?\n/).map((raw) => raw.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean).map((line) => {
    let m = line.match(/^#?(\d{1,2})\s*[.):,-]?\s+(.+)$/)
    if (m) return { number: Number(m[1]), name: m[2].trim() }
    m = line.match(/^(.+?)\s+#?(\d{1,2})$/)
    if (m) return { number: Number(m[2]), name: m[1].trim() }
    return { name: line, number: undefined as number | undefined }
  }).filter((r) => r.name.length > 0)
}

export function ImportModal({ open, onClose, teamId }: { open: boolean; onClose: () => void; teamId: string }) {
  const { t } = useT('team')
  const [text, setText] = useState('')
  const [position, setPosition] = useState('CM')
  useEffect(() => { if (open) setText('') }, [open])
  const rows = useMemo(() => parseRoster(text), [text])
  const run = async () => {
    for (const r of rows) await addPlayer({ teamId, name: r.name, number: r.number, position })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={t('import.title')} wide
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button><button type="button" className="btn-primary" disabled={!rows.length} onClick={run}>{t('import.submit', { count: rows.length })}</button></>}>
      <p className="mb-3 text-sm text-ink-muted">{t('import.body')}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('import.list')} htmlFor="imp-list">
          <textarea id="imp-list" className="input min-h-[220px] font-mono text-[14px] leading-6" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('import.placeholder')} autoFocus />
        </Field>
        <div>
          <Field label={t('import.defaultPosition')} hint={t('import.hint')}>
            <select className="input" value={position} onChange={(e) => setPosition(e.target.value)}>
              {POSITIONS.map((p) => <option key={p} value={p}>{t(`common:positions.${p}`)}</option>)}
            </select>
          </Field>
          <div className="text-sm font-semibold text-ink" aria-live="polite">{t('import.preview', { count: rows.length })}</div>
          <ul className="mt-2 max-h-[150px] space-y-1 overflow-y-auto pr-1">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className={cx('flex h-6 w-7 shrink-0 items-center justify-center rounded-md text-[12px] font-semibold tabular-nums', r.number !== undefined ? 'bg-forest-600 text-cream' : 'bg-sand text-ink-faint')}>{r.number ?? '·'}</span>
                <span className="truncate text-ink-soft">{r.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
