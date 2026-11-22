// Create or edit the club: name, place, colours (the crest follows them), presentation and game model.
import { useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useT } from '../../../i18n'
import { db } from '../../../lib/db'
import type { Club, Team } from '../../../lib/types'
import { cx, nowISO } from '../../../lib/util'
import { Field, Modal } from '../../../ui'
import { Crest } from './bits'

const HEX = /^#[0-9a-f]{6}$/i

export function ClubForm({ open, onClose, club, teams, defaultName }: { open: boolean; onClose: () => void; club: Club | null; teams: Team[]; defaultName?: string }) {
  const { t } = useT('club')
  const first = teams[0]
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [founded, setFounded] = useState('')
  const [primary, setPrimary] = useState('#0B5D3B')
  const [secondary, setSecondary] = useState('#F5B700')
  const [about, setAbout] = useState('')
  const [model, setModel] = useState('')
  const [applyColors, setApplyColors] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(club?.name ?? defaultName ?? '')
    setCity(club?.city ?? ''); setCountry(club?.country ?? t('form.countryDefault'))
    setFounded(club?.founded ? String(club.founded) : '')
    setPrimary(club?.colors.primary ?? first?.colors?.primary ?? '#0B5D3B'); setSecondary(club?.colors.secondary ?? first?.colors?.secondary ?? '#F5B700')
    setAbout(club?.about ?? ''); setModel(club?.gameModel ?? ''); setApplyColors(!club); setError('')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    const n = name.trim()
    if (!n) { setError(t('form.nameRequired')); return }
    setBusy(true)
    try {
      const colors = { primary: HEX.test(primary) ? primary : '#0B5D3B', secondary: HEX.test(secondary) ? secondary : '#F5B700' }
      const y = Number(founded)
      const next: Club = {
        id: 'club', name: n, city: city.trim() || undefined, country: country.trim() || undefined, founded: y > 1800 && y < 2100 ? y : undefined,
        colors, about: about.trim() || undefined, gameModel: model.trim() || undefined, publicProfiles: club?.publicProfiles ?? false, createdAt: club?.createdAt ?? nowISO(),
      }
      await db.club.put(next)
      if (applyColors && teams.length) await Promise.all(teams.map((tm) => db.teams.update(tm.id, { colors })))
      onClose()
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={club ? t('form.editTitle') : t('form.createTitle')}
      footer={<>
        <button type="button" className="btn-ghost min-h-[44px]" onClick={onClose}>{t('common:actions.cancel')}</button>
        <button type="submit" form="club-form" className="btn-primary min-h-[44px]" disabled={busy}>{busy && <LoaderCircle size={16} className="motion-safe:animate-spin" />}{club ? t('common:actions.save') : t('form.create')}</button>
      </>}>
      <form id="club-form" onSubmit={save} noValidate>
        <div className="mb-5 flex items-center gap-4 rounded-card bg-sand/60 px-4 py-3">
          <Crest name={name || '?'} colors={{ primary, secondary }} size={48} />
          <p className="text-[13.5px] leading-snug text-ink-muted">{t('form.crestHint')}</p>
        </div>
        <Field label={t('form.name')} htmlFor="cf-name" hint={error ? <span className="text-clay-600">{error}</span> : undefined}>
          <input id="cf-name" className={cx('input', error && 'border-clay-500')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('form.namePh')} aria-invalid={!!error} autoFocus={!club} />
        </Field>
        <div className="grid gap-x-4 sm:grid-cols-3">
          <Field label={t('form.city')} htmlFor="cf-city"><input id="cf-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          <Field label={t('form.country')} htmlFor="cf-country"><input id="cf-country" className="input" value={country} onChange={(e) => setCountry(e.target.value)} /></Field>
          <Field label={t('form.founded')} htmlFor="cf-founded"><input id="cf-founded" className="input" inputMode="numeric" value={founded} onChange={(e) => setFounded(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1987" /></Field>
        </div>
        <div className="grid gap-x-4 sm:grid-cols-2">
          {([['primary', primary, setPrimary], ['secondary', secondary, setSecondary]] as const).map(([k, v, set]) => (
            <Field key={k} label={t(`form.${k}`)} htmlFor={`cf-${k}`}>
              <div className="flex items-center gap-2">
                <input type="color" aria-label={t(`form.${k}`)} value={HEX.test(v) ? v : '#000000'} onChange={(e) => set(e.target.value)} className="h-11 w-14 shrink-0 cursor-pointer rounded-control border border-line bg-paper p-1" />
                <input id={`cf-${k}`} className="input font-mono" value={v} onChange={(e) => set(e.target.value.trim())} spellCheck={false} />
              </div>
            </Field>
          ))}
        </div>
        {teams.length > 0 && (
          <label className="mb-4 flex min-h-[44px] cursor-pointer items-center gap-3 text-[14.5px] text-ink-soft">
            <input type="checkbox" className="h-5 w-5 accent-forest-600" checked={applyColors} onChange={(e) => setApplyColors(e.target.checked)} />
            {t('form.applyColors', { count: teams.length })}
          </label>
        )}
        <Field label={t('form.about')} htmlFor="cf-about"><textarea id="cf-about" className="input min-h-[84px]" value={about} onChange={(e) => setAbout(e.target.value)} placeholder={t('form.aboutPh')} /></Field>
        <Field label={t('form.model')} htmlFor="cf-model" hint={t('form.modelHint')}><textarea id="cf-model" className="input min-h-[120px]" value={model} onChange={(e) => setModel(e.target.value)} placeholder={t('form.modelPh')} /></Field>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}
