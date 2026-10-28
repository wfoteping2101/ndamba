import { useState } from 'react'
import { Shirt } from 'lucide-react'
import { Field } from '../../../ui'
import { useT } from '../../../i18n'
import { createTeam } from '../../../lib/actions'
import type { Team } from '../../../lib/types'

const AGES = ['U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'Seniors']
const FORMATS: Team['format'][] = [5, 7, 8, 9, 11]

/** Shown when the coach has no team yet: one small form, then the page fills itself. */
export function CreateTeamCard() {
  const { t } = useT('training')
  const [name, setName] = useState('')
  const [age, setAge] = useState('U13')
  const [format, setFormat] = useState<Team['format']>(11)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    await createTeam({ name: name.trim(), ageGroup: age, format })
    setBusy(false)
  }
  return (
    <form onSubmit={submit} className="card card-pad mb-6 border-forest-100">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-600 text-cream"><Shirt size={20} aria-hidden="true" /></div>
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">{t('team.title')}</h2>
          <p className="text-sm text-ink-muted">{t('team.body')}</p>
        </div>
      </div>
      <div className="grid gap-x-3 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label={t('team.name')} htmlFor="ct-name"><input id="ct-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('team.namePh')} required /></Field>
        <Field label={t('team.age')} htmlFor="ct-age"><select id="ct-age" className="input" value={age} onChange={(e) => setAge(e.target.value)}>{AGES.map((a) => <option key={a}>{a}</option>)}</select></Field>
        <Field label={t('team.format')} htmlFor="ct-format"><select id="ct-format" className="input" value={format} onChange={(e) => setFormat(Number(e.target.value) as Team['format'])}>{FORMATS.map((f) => <option key={f} value={f}>{f} {t('common:app.vs')} {f}</option>)}</select></Field>
      </div>
      <button type="submit" className="btn-primary" disabled={!name.trim() || busy}>{t('team.create')}</button>
    </form>
  )
}
