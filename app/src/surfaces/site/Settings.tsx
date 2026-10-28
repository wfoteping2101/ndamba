import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, Crown, Database, Download, Info, LoaderCircle, Pencil, Plus, Shirt, Trash2, Upload, UserRound } from 'lucide-react'
import { setLang, type Lang } from '../../i18n'
import { createTeam } from '../../lib/actions'
import { BRAND } from '../../lib/config'
import { db, resetAll } from '../../lib/db'
import { DEFAULT_FORMATION, FORMATIONS } from '../../lib/formations'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import type { Profile, Role, Team } from '../../lib/types'
import { cx, download, fmtDate, nowISO, todayISO } from '../../lib/util'
import { EmptyState, Field, Modal, PageHeader } from '../../ui'
import { useSiteT } from './components/brand'

const APP_VERSION = '1.0.0'
const ROLES: Role[] = ['player', 'coach', 'analyst', 'parent', 'manager', 'federation']
const FORMATS: Team['format'][] = [5, 7, 8, 9, 11]
const AGE_GROUPS = ['U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21', 'Seniors', 'Pro']
const BACKUP_APP = 'njangi' // the database name; kept stable so older backups still restore

export default function Settings() {
  const { t } = useSiteT()
  useDocumentTitle(t('settings.docTitle'))
  const { profile } = useSession()
  if (!profile) return null // AppLayout already sends users without a profile to /bienvenue
  return (
    <div>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-6">
        <div className="space-y-5 lg:space-y-6">
          <ProfileCard key={profile.createdAt} profile={profile} />
          <TeamsCard profile={profile} />
        </div>
        <div className="space-y-5 lg:space-y-6">
          <PlanCard profile={profile} />
          <DataCard />
          <AboutCard />
        </div>
      </div>
    </div>
  )
}

function Panel({ icon, title, lead, action, children }: { icon: ReactNode; title: string; lead?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card card-pad sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-600">{icon}</span>
          <div className="min-w-0">
            <h2 className="font-display text-[20px] font-semibold leading-tight text-ink">{title}</h2>
            {lead && <p className="mt-0.5 text-[14px] leading-snug text-ink-muted">{lead}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Flash({ text, tone = 'ok' }: { text: string; tone?: 'ok' | 'error' }) {
  if (!text) return null
  return (
    <p role="status" className={cx('inline-flex items-center gap-1.5 text-[14px] font-medium', tone === 'ok' ? 'text-ok-500' : 'text-clay-600')}>
      {tone === 'ok' && <Check size={16} />}{text}
    </p>
  )
}

function useFlash(ms = 3500) {
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'error' }>({ text: '', tone: 'ok' })
  useEffect(() => {
    if (!msg.text) return
    const id = window.setTimeout(() => setMsg({ text: '', tone: 'ok' }), ms)
    return () => window.clearTimeout(id)
  }, [msg, ms])
  return [msg, (text: string, tone: 'ok' | 'error' = 'ok') => setMsg({ text, tone })] as const
}

/* ---------------- profile ---------------- */

function ProfileCard({ profile }: { profile: Profile }) {
  const { t } = useSiteT()
  const [f, setF] = useState({ name: profile.name, role: profile.role, lang: profile.lang, country: profile.country || '', city: profile.city || '', club: profile.club || '' })
  const [error, setError] = useState('')
  const [flash, setFlash] = useFlash()
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const name = f.name.trim()
    if (!name) { setError(t('settings.profile.nameRequired')); return }
    setError('')
    await db.profile.update('me', { name, role: f.role, lang: f.lang, country: f.country.trim() || undefined, city: f.city.trim() || undefined, club: f.club.trim() || undefined })
    setLang(f.lang)
    setFlash(t('settings.profile.saved'))
  }

  return (
    <Panel icon={<UserRound size={18} />} title={t('settings.profile.title')}>
      <form onSubmit={submit} noValidate>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label={t('settings.profile.name')} htmlFor="pf-name" hint={error ? <span className="text-clay-600">{error}</span> : undefined}>
            <input id="pf-name" className={cx('input', error && 'border-clay-500')} value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" aria-invalid={!!error} required />
          </Field>
          <Field label={t('settings.profile.role')} htmlFor="pf-role">
            <select id="pf-role" className="input" value={f.role} onChange={(e) => set('role', e.target.value as Role)}>
              {ROLES.map((r) => <option key={r} value={r}>{t(`common:roles.${r}`)}</option>)}
            </select>
          </Field>
          <Field label={t('settings.profile.lang')} htmlFor="pf-lang">
            <select id="pf-lang" className="input" value={f.lang} onChange={(e) => set('lang', e.target.value as Lang)}>
              <option value="fr">{t('settings.profile.langFr')}</option>
              <option value="en">{t('settings.profile.langEn')}</option>
            </select>
          </Field>
          <Field label={t('settings.profile.country')} htmlFor="pf-country">
            <input id="pf-country" className="input" value={f.country} onChange={(e) => set('country', e.target.value)} placeholder={t('settings.profile.countryPh')} autoComplete="country-name" />
          </Field>
          <Field label={t('settings.profile.city')} htmlFor="pf-city">
            <input id="pf-city" className="input" value={f.city} onChange={(e) => set('city', e.target.value)} placeholder={t('settings.profile.cityPh')} autoComplete="address-level2" />
          </Field>
          <Field label={t('settings.profile.club')} htmlFor="pf-club">
            <input id="pf-club" className="input" value={f.club} onChange={(e) => set('club', e.target.value)} autoComplete="organization" />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary min-h-[44px]">{t('settings.profile.save')}</button>
          <Flash text={flash.text} tone={flash.tone} />
        </div>
      </form>
    </Panel>
  )
}

/* ---------------- teams ---------------- */

function TeamsCard({ profile }: { profile: Profile }) {
  const { t } = useSiteT()
  const { teams, team: active } = useSession()
  const counts = useLiveQuery(async () => {
    const out: Record<string, number> = {}
    for (const p of await db.players.toArray()) out[p.teamId] = (out[p.teamId] || 0) + 1
    return out
  }, [], {} as Record<string, number>)
  const [editing, setEditing] = useState<Team | 'new' | null>(null)
  const [flash, setFlash] = useFlash()

  const makeActive = async (tm: Team) => {
    await db.profile.update('me', { activeTeamId: tm.id })
    setFlash(t('settings.teams.activated', { name: tm.name }))
  }

  return (
    <Panel icon={<Shirt size={18} />} title={t('settings.teams.title')} lead={t('settings.teams.lead')}
      action={teams.length > 0 ? <button type="button" className="btn-outline btn-sm min-h-[40px] shrink-0" onClick={() => setEditing('new')}><Plus size={15} /><span className="hidden sm:inline">{t('settings.teams.create')}</span></button> : undefined}>
      {teams.length === 0 ? (
        <EmptyState icon={<Shirt size={28} />} title={t('settings.teams.empty')} body={t('settings.teams.emptyBody')}
          action={<button type="button" className="btn-primary min-h-[44px]" onClick={() => setEditing('new')}><Plus size={16} />{t('settings.teams.create')}</button>} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {teams.map((tm) => {
            const isActive = active?.id === tm.id || (!active && profile.activeTeamId === tm.id)
            return (
              <li key={tm.id} className={cx('flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between', isActive && 'bg-forest-50/60')}>
                <div className="flex min-w-0 items-center gap-3">
                  <span aria-hidden="true" className="h-9 w-9 shrink-0 rounded-full ring-2 ring-paper" style={{ background: `linear-gradient(135deg, ${tm.colors?.primary || '#0B5D3B'} 50%, ${tm.colors?.secondary || '#F5B700'} 50%)` }} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-ink">{tm.name}</span>
                      {isActive && <span className="rounded-full bg-forest-600 px-2 py-0.5 text-[11px] font-bold text-cream">{t('settings.teams.active')}</span>}
                    </div>
                    <div className="text-[13px] text-ink-muted">
                      {tm.ageGroup === 'Seniors' ? t('settings.teams.seniors') : tm.ageGroup === 'Pro' ? t('settings.teams.pro') : tm.ageGroup} · {t('settings.teams.formatOpt', { n: tm.format })} · {tm.formation} · {t('settings.teams.players', { count: counts[tm.id] || 0 })}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!isActive && <button type="button" className="btn-outline btn-sm min-h-[40px]" onClick={() => makeActive(tm)}>{t('settings.teams.makeActive')}</button>}
                  <button type="button" className="btn-ghost btn-sm min-h-[40px]" onClick={() => setEditing(tm)}><Pencil size={15} />{t('settings.teams.edit')}</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {flash.text && <div className="mt-3"><Flash text={flash.text} tone={flash.tone} /></div>}
      {editing && <TeamModal team={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={(msg) => { setEditing(null); setFlash(msg) }} />}
    </Panel>
  )
}

function TeamModal({ team, onClose, onSaved }: { team: Team | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const { t } = useSiteT()
  const [name, setName] = useState(team?.name || '')
  const [ageGroup, setAgeGroup] = useState(team?.ageGroup || 'U13')
  const [format, setFormat] = useState<Team['format']>(team?.format || 11)
  const [formation, setFormation] = useState(team?.formation || DEFAULT_FORMATION[team?.format || 11])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const formations = Object.keys(FORMATIONS[format] || {})
  const ages = AGE_GROUPS.includes(ageGroup) ? AGE_GROUPS : [ageGroup, ...AGE_GROUPS]

  const changeFormat = (v: Team['format']) => {
    setFormat(v)
    if (!Object.keys(FORMATIONS[v] || {}).includes(formation)) setFormation(DEFAULT_FORMATION[v])
  }

  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    const n = name.trim()
    if (!n) { setError(t('settings.profile.nameRequired')); return }
    setBusy(true)
    try {
      if (team) {
        await db.teams.update(team.id, { name: n, ageGroup, format, formation })
        onSaved(t('settings.teams.updated'))
      } else {
        await createTeam({ name: n, ageGroup, format, formation })
        onSaved(t('settings.teams.created'))
      }
    } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={team ? t('settings.teams.editTitle') : t('settings.teams.createTitle')}
      footer={<>
        <button type="button" className="btn-ghost min-h-[44px]" onClick={onClose}>{t('common:actions.cancel')}</button>
        <button type="button" className="btn-primary min-h-[44px]" onClick={() => save()} disabled={busy}>{busy && <LoaderCircle size={16} className="motion-safe:animate-spin" />}{team ? t('common:actions.save') : t('common:actions.create')}</button>
      </>}>
      <form onSubmit={save} noValidate>
        <Field label={t('settings.teams.name')} htmlFor="tm-name" hint={error ? <span className="text-clay-600">{error}</span> : undefined}>
          <input id="tm-name" className={cx('input', error && 'border-clay-500')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('settings.teams.namePh')} autoFocus aria-invalid={!!error} />
        </Field>
        <div className="grid gap-x-4 sm:grid-cols-3">
          <Field label={t('settings.teams.ageGroup')} htmlFor="tm-age">
            <select id="tm-age" className="input" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
              {ages.map((a) => <option key={a} value={a}>{a === 'Seniors' ? t('settings.teams.seniors') : a === 'Pro' ? t('settings.teams.pro') : a}</option>)}
            </select>
          </Field>
          <Field label={t('settings.teams.format')} htmlFor="tm-format">
            <select id="tm-format" className="input" value={format} onChange={(e) => changeFormat(Number(e.target.value) as Team['format'])}>
              {FORMATS.map((n) => <option key={n} value={n}>{t('settings.teams.formatOpt', { n })}</option>)}
            </select>
          </Field>
          <Field label={t('settings.teams.formation')} htmlFor="tm-formation">
            <select id="tm-formation" className="input" value={formation} onChange={(e) => setFormation(e.target.value)}>
              {formations.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
        </div>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}

/* ---------------- plan ---------------- */

function PlanCard({ profile }: { profile: Profile }) {
  const { t } = useSiteT()
  return (
    <Panel icon={<Crown size={18} />} title={t('settings.plan.title')}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand/60 px-4 py-3">
        <div>
          <div className="text-[12px] font-medium text-ink-muted">{t('settings.plan.current')}</div>
          <div className="font-display text-[19px] font-semibold text-ink">{t(`common:plans.${profile.plan}`)}</div>
        </div>
        <Link to="/app/premium" className="btn-outline btn-sm min-h-[40px]">{t('settings.plan.see')}<ArrowRight size={15} /></Link>
      </div>
    </Panel>
  )
}

/* ---------------- data: export, import, reset ---------------- */

interface Backup { app: string; brand?: string; format: number; exportedAt: string; tables: Record<string, unknown[]> }

function parseBackup(text: string): Backup | null {
  try {
    const v = JSON.parse(text) as Partial<Backup>
    if (!v || typeof v !== 'object' || (v.app !== BACKUP_APP && v.app !== BRAND.name.toLowerCase())) return null
    if (!v.tables || typeof v.tables !== 'object') return null
    const known = new Set(db.tables.map((tb) => tb.name))
    const names = Object.keys(v.tables)
    if (!names.length || !names.every((n) => known.has(n) && Array.isArray((v.tables as Record<string, unknown>)[n]))) return null
    return { app: v.app, brand: v.brand, format: Number(v.format) || 1, exportedAt: String(v.exportedAt || ''), tables: v.tables as Record<string, unknown[]> }
  } catch {
    return null
  }
}

function DataCard() {
  const { t, lang } = useSiteT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useFlash(5000)
  const total = useMemo(() => (pending ? Object.values(pending.tables).reduce((s, rows) => s + rows.length, 0) : 0), [pending])

  const exportAll = async () => {
    const tables: Record<string, unknown[]> = {}
    for (const tb of db.tables) tables[tb.name] = await tb.toArray()
    const payload: Backup = { app: BACKUP_APP, brand: BRAND.name, format: 1, exportedAt: nowISO(), tables }
    download(`${BRAND.name.toLowerCase()}-${todayISO()}.json`, JSON.stringify(payload, null, 2), 'application/json')
    setFlash(t('settings.data.exported'))
  }

  const pick = async (file?: File) => {
    if (!file) return
    const b = parseBackup(await file.text())
    if (fileRef.current) fileRef.current.value = ''
    if (!b) { setFlash(t('settings.data.invalid'), 'error'); return }
    setPending(b)
  }

  const restore = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await db.transaction('rw', db.tables, async () => {
        for (const tb of db.tables) {
          await tb.clear()
          const rows = pending.tables[tb.name]
          if (Array.isArray(rows) && rows.length) await tb.bulkPut(rows)
        }
      })
      setPending(null)
      setFlash(t('settings.data.imported'))
    } finally { setBusy(false) }
  }

  const date = pending?.exportedAt ? fmtDate(pending.exportedAt.slice(0, 10), lang, { day: 'numeric', month: 'long', year: 'numeric' }) : '?'

  return (
    <Panel icon={<Database size={18} />} title={t('settings.data.title')} lead={t('settings.data.lead')}>
      <div className="space-y-3">
        <DataRow title={t('settings.data.export')} hint={t('settings.data.exportHint')}
          action={<button type="button" className="btn-outline min-h-[44px] w-full sm:w-auto" onClick={exportAll}><Download size={16} />{t('common:actions.export')}</button>} />
        <DataRow title={t('settings.data.import')} hint={t('settings.data.importHint')}
          action={<>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files?.[0])} />
            <button type="button" className="btn-outline min-h-[44px] w-full sm:w-auto" onClick={() => fileRef.current?.click()}><Upload size={16} />{t('settings.data.importConfirm')}</button>
          </>} />
        <DataRow title={t('settings.data.reset')} hint={t('settings.data.resetHint')} danger
          action={<button type="button" className="btn min-h-[44px] w-full border border-clay-300 bg-paper text-clay-600 hover:bg-clay-50 sm:w-auto" onClick={() => setConfirmReset(true)}><Trash2 size={16} />{t('settings.data.reset')}</button>} />
      </div>
      {flash.text && <div className="mt-3"><Flash text={flash.text} tone={flash.tone} /></div>}

      <Modal open={!!pending} onClose={() => !busy && setPending(null)} title={t('settings.data.importTitle')}
        footer={<>
          <button type="button" className="btn-ghost min-h-[44px]" onClick={() => setPending(null)} disabled={busy}>{t('common:actions.cancel')}</button>
          <button type="button" className="btn-primary min-h-[44px]" onClick={restore} disabled={busy}>{busy ? <LoaderCircle size={16} className="motion-safe:animate-spin" /> : <Upload size={16} />}{busy ? t('settings.data.busy') : t('settings.data.importConfirm')}</button>
        </>}>
        <p className="text-[15px] text-ink-soft">{t('settings.data.importBody', { date, n: total })}</p>
      </Modal>

      <Modal open={confirmReset} onClose={() => !busy && setConfirmReset(false)} title={t('settings.data.resetTitle')}
        footer={<>
          <button type="button" className="btn-ghost min-h-[44px]" onClick={() => setConfirmReset(false)} disabled={busy}>{t('common:actions.cancel')}</button>
          <button type="button" className="btn-danger min-h-[44px]" disabled={busy} onClick={async () => { setBusy(true); await resetAll() }}>
            {busy ? <LoaderCircle size={16} className="motion-safe:animate-spin" /> : <Trash2 size={16} />}{t('settings.data.resetConfirm')}
          </button>
        </>}>
        <p className="text-[15px] text-ink-soft">{t('settings.data.resetBody')}</p>
      </Modal>
    </Panel>
  )
}

function DataRow({ title, hint, action, danger = false }: { title: string; hint: string; action: ReactNode; danger?: boolean }) {
  return (
    <div className={cx('flex flex-col gap-3 rounded-2xl border px-4 py-3.5', danger ? 'border-clay-100 bg-clay-50/40' : 'border-line')}>
      <div className="min-w-0">
        <div className={cx('text-[15px] font-semibold', danger ? 'text-clay-700' : 'text-ink')}>{title}</div>
        <div className="text-[13.5px] leading-snug text-ink-muted">{hint}</div>
      </div>
      <div className="flex">{action}</div>
    </div>
  )
}

/* ---------------- about ---------------- */

function AboutCard() {
  const { t } = useSiteT()
  const rows: [string, string][] = [
    [t('settings.about.version'), `${BRAND.name} ${APP_VERSION}`],
    [t('settings.about.author'), BRAND.author],
    [t('settings.about.company'), BRAND.owner],
    [t('settings.about.storage'), t('settings.about.storageValue')],
  ]
  return (
    <Panel icon={<Info size={18} />} title={t('settings.about.title')}>
      <dl className="divide-y divide-line text-[14.5px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="text-right font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <Link to="/app/livres" className="link mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-[15px]"><BookOpen size={16} />{t('settings.about.books')}</Link>
    </Panel>
  )
}
