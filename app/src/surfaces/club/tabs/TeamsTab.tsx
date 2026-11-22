// Équipes: every team of the club with its age group, format, staff, last results and its Indice of the season.
// « Ouvrir » makes it the active team (as in Settings) and opens its page.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { LoaderCircle, Plus, Users } from 'lucide-react'
import { useT } from '../../../i18n'
import { createTeam } from '../../../lib/actions'
import { db } from '../../../lib/db'
import { DEFAULT_FORMATION, FORMATIONS } from '../../../lib/formations'
import { fmtNjangi, njangiLabel } from '../../../lib/njangi'
import { useSession } from '../../../lib/session'
import type { MatchEvent, Team } from '../../../lib/types'
import { cx } from '../../../lib/util'
import { Field, Modal } from '../../../ui'
import { outcome, teamSeason, type ClubData } from '../components/data'
import { useOpenTeam } from '../components/useOpenTeam'

const AGE_GROUPS = ['U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21', 'Seniors']
const FORMATS: Team['format'][] = [5, 7, 8, 9, 11]

export function TeamsTab({ data, eventsByMatch }: { data: ClubData; eventsByMatch: Map<string, MatchEvent[]> }) {
  const { t, lang } = useT('club')
  const { team: active } = useSession()
  const open = useOpenTeam()
  const [creating, setCreating] = useState(false)
  const seasons = useMemo(() => data.teams.map((tm) => teamSeason(tm, data, eventsByMatch)), [data, eventsByMatch])
  const ageLabel = (a: string) => (a === 'Seniors' ? t('teams.seniors') : a)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-ink-muted">{t('teams.lead', { count: data.teams.length })}</p>
        <button type="button" className="btn-primary min-h-[44px]" onClick={() => setCreating(true)}><Plus size={17} />{t('teams.new')}</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {seasons.map((s) => {
          const tm = s.team
          const staff = data.members.filter((m) => (m.role === 'coach' || m.role === 'analyst') && m.teamIds.includes(tm.id))
          const isActive = active?.id === tm.id
          return (
            <article key={tm.id} className={cx('flex flex-col rounded-card border bg-paper', isActive ? 'border-forest-300' : 'border-line')}>
              <div className="flex items-start gap-3 p-4 sm:p-5">
                <span aria-hidden="true" className="mt-0.5 h-10 w-10 shrink-0 rounded-full ring-2 ring-paper" style={{ background: `linear-gradient(135deg, ${tm.colors?.primary || '#0B5D3B'} 50%, ${tm.colors?.secondary || '#F5B700'} 50%)` }} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[18px] leading-tight text-ink">{tm.name}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="chip">{ageLabel(tm.ageGroup)}</span>
                    <span className="chip">{t('teams.format', { n: tm.format })}</span>
                    <span className="chip">{tm.formation}</span>
                    {isActive && <span className="rounded-full bg-forest-600 px-2.5 py-0.5 text-[12px] font-semibold text-white">{t('teams.active')}</span>}
                  </div>
                </div>
              </div>
              <dl className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 border-t border-line px-4 py-4 text-[14px] sm:px-5">
                <div className="min-w-0">
                  <dt className="text-[12.5px] font-semibold text-ink-muted">{t('teams.staff')}</dt>
                  <dd className="mt-0.5 text-ink-soft">{staff.length ? staff.map((m) => `${m.name} (${t(`roles.${m.role}`).toLowerCase()}${m.status === 'invited' ? `, ${t('members.invited').toLowerCase()}` : ''})`).join(', ') : t('teams.noStaff')}</dd>
                </div>
                <div className="text-right">
                  <dt className="text-[12.5px] font-semibold text-ink-muted">{t('teams.players')}</dt>
                  <dd className="num mt-0.5 font-display text-[22px] leading-none text-ink">{s.players.length}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[12.5px] font-semibold text-ink-muted">{t('teams.last')}</dt>
                  <dd className="mt-1">
                    {s.played.length === 0 ? <span className="text-ink-muted">{t('teams.noResults')}</span> : (
                      <ul className="space-y-1">
                        {s.played.slice(0, 3).map((m) => {
                          const o = outcome(m)
                          return (
                            <li key={m.id} className="flex min-w-0 items-center gap-2">
                              <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11.5px] font-bold', o === 'W' ? 'bg-forest-600 text-white' : o === 'L' ? 'bg-clay-50 text-clay-700' : 'bg-sand text-ink-soft')} title={t(`results.${o}`)}>{t(`results.short.${o}`)}</span>
                              <span className="num shrink-0 font-semibold text-ink">{m.scoreUs}-{m.scoreThem}</span>
                              <span className="truncate text-ink-muted">{t('teams.vs', { opponent: m.opponent })}</span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </dd>
                </div>
                <div className="text-right">
                  <dt className="text-[12.5px] font-semibold text-ink-muted">{t('teams.indice')}</dt>
                  {s.result ? (
                    <dd className="mt-0.5">
                      <span className="num block font-display text-[28px] leading-none text-forest-700">{fmtNjangi(s.result.total, lang)}</span>
                      <span className="mt-1 block max-w-[9rem] text-[12px] leading-snug text-ink-muted">{njangiLabel(s.result.total, lang)}</span>
                    </dd>
                  ) : <dd className="mt-0.5 max-w-[8rem] text-[12.5px] leading-snug text-ink-muted">{t('teams.noIndice')}</dd>}
                </div>
              </dl>
              <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3 sm:px-5">
                <button type="button" className="btn-primary min-h-[44px]" onClick={() => open(tm.id)}>{t('teams.open')}</button>
                <button type="button" className="btn-ghost min-h-[44px]" onClick={() => open(tm.id, '/app/matchs')}>{t('teams.matches')}</button>
              </div>
            </article>
          )
        })}
        <button type="button" onClick={() => setCreating(true)} className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line px-6 text-center text-ink-muted transition hover:border-forest-300 hover:text-forest-700">
          <Users size={24} strokeWidth={1.75} aria-hidden="true" />
          <span className="text-[15px] font-semibold">{t('teams.new')}</span>
          <span className="text-[13px]">{t('teams.newHint')}</span>
        </button>
      </div>
      <NewTeamModal open={creating} onClose={() => setCreating(false)} colors={data.club?.colors} />
    </div>
  )
}

function NewTeamModal({ open, onClose, colors }: { open: boolean; onClose: () => void; colors?: Team['colors'] }) {
  const { t } = useT('club')
  const [name, setName] = useState('')
  const [ageGroup, setAgeGroup] = useState('U15')
  const [format, setFormat] = useState<Team['format']>(11)
  const [formation, setFormation] = useState(DEFAULT_FORMATION[11])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setName(''); setAgeGroup('U15'); setFormat(11); setFormation(DEFAULT_FORMATION[11]); setError('') } }, [open])
  const formations = Object.keys(FORMATIONS[format] || {})
  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    const n = name.trim()
    if (!n) { setError(t('teams.nameRequired')); return }
    setBusy(true)
    try {
      const tm = await createTeam({ name: n, ageGroup, format, formation })
      if (colors) await db.teams.update(tm.id, { colors })
      onClose()
    } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} title={t('teams.newTitle')}
      footer={<>
        <button type="button" className="btn-ghost min-h-[44px]" onClick={onClose}>{t('common:actions.cancel')}</button>
        <button type="submit" form="club-newteam" className="btn-primary min-h-[44px]" disabled={busy}>{busy && <LoaderCircle size={16} className="motion-safe:animate-spin" />}{t('teams.create')}</button>
      </>}>
      <form id="club-newteam" onSubmit={save} noValidate>
        <Field label={t('teams.name')} htmlFor="nt-name" hint={error ? <span className="text-clay-600">{error}</span> : t('teams.colorsHint')}>
          <input id="nt-name" className={cx('input', error && 'border-clay-500')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('teams.namePh')} autoFocus aria-invalid={!!error} />
        </Field>
        <div className="grid gap-x-4 sm:grid-cols-3">
          <Field label={t('teams.ageGroup')} htmlFor="nt-age">
            <select id="nt-age" className="input" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
              {AGE_GROUPS.map((a) => <option key={a} value={a}>{a === 'Seniors' ? t('teams.seniors') : a}</option>)}
            </select>
          </Field>
          <Field label={t('teams.formatLabel')} htmlFor="nt-format">
            <select id="nt-format" className="input" value={format} onChange={(e) => { const v = Number(e.target.value) as Team['format']; setFormat(v); setFormation(DEFAULT_FORMATION[v]) }}>
              {FORMATS.map((n) => <option key={n} value={n}>{t('teams.format', { n })}</option>)}
            </select>
          </Field>
          <Field label={t('teams.formation')} htmlFor="nt-formation">
            <select id="nt-formation" className="input" value={formation} onChange={(e) => setFormation(e.target.value)}>
              {formations.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
        </div>
      </form>
    </Modal>
  )
}
