// The club space (Club plan): one club around every team of this device, inspired by what video platforms
// offer clubs. Tabs: Aperçu (/app/club), Équipes, Membres, Vidéothèque, Joueurs, Analytique (/app/club/<slug>).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Building2, Info, LoaderCircle, Pencil, Play, Plus, X } from 'lucide-react'
import { useT } from '../../i18n'
import { useDocumentTitle } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { EmptyState, Tabs } from '../../ui'
import { Crest } from './components/bits'
import { groupBy, useClubData } from './components/data'
import { ClubForm } from './components/ClubForm'
import { Overview } from './tabs/Overview'
import { TeamsTab } from './tabs/TeamsTab'
import { MembersTab } from './tabs/MembersTab'
import { VideosTab } from './tabs/VideosTab'
import { PlayersTab } from './tabs/PlayersTab'
import { AnalyticsTab } from './tabs/AnalyticsTab'

export const CLUB_TABS = ['apercu', 'equipes', 'membres', 'videos', 'joueurs', 'analytique'] as const
export type ClubTab = (typeof CLUB_TABS)[number]
const NOTE_KEY = 'njangi.club.localNote'

export default function ClubHome() {
  const { t, lang } = useT('club')
  const { tab: raw } = useParams()
  const tab: ClubTab = (CLUB_TABS as readonly string[]).includes(raw ?? '') ? (raw as ClubTab) : 'apercu'
  const navigate = useNavigate()
  const { profile } = useSession()
  const data = useClubData()
  const [editing, setEditing] = useState<'create' | 'edit' | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [note, setNote] = useState(() => { try { return localStorage.getItem(NOTE_KEY) !== '1' } catch { return true } })
  useDocumentTitle(data.club ? `${data.club.name}, ${t(`tabs.${tab}`)}` : t('title'))
  const eventsByMatch = useMemo(() => groupBy(data.events, (e) => e.matchId), [data.events])
  const matchesById = useMemo(() => new Map(data.matches.map((m) => [m.id, m])), [data.matches])

  // on a phone the tab row scrolls: keep the open tab in view
  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    const row = el?.parentElement
    if (el && row && row.scrollWidth > row.clientWidth) row.scrollTo({ left: Math.max(0, el.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft - (row.clientWidth - el.offsetWidth) / 2) })
  }, [tab, data.ready, !!data.club]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!data.ready) return <div className="grid min-h-[50vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>

  const hasProDemo = data.teams.some((tm) => tm.id === 'team_etoile')
  const loadDemo = async () => {
    setLoadingDemo(true)
    try { const m = await import('../../lib/seedClub'); await m.seedClub(lang) } finally { setLoadingDemo(false) }
  }

  if (!data.club) {
    return (
      <div className="mx-auto max-w-2xl pt-4">
        <EmptyState icon={<Building2 size={28} />} title={t('empty.title')} body={t('empty.body')}
          action={<>
            <button type="button" className="btn-primary min-h-[44px]" onClick={() => setEditing('create')}><Plus size={17} />{t('empty.create')}</button>
            {hasProDemo && (
              <button type="button" className="btn-outline min-h-[44px]" onClick={loadDemo} disabled={loadingDemo}>
                {loadingDemo ? <LoaderCircle size={16} className="motion-safe:animate-spin" /> : <Play size={16} />}{t('empty.demo')}
              </button>
            )}
          </>} />
        <ClubForm open={editing === 'create'} onClose={() => setEditing(null)} club={null} teams={data.teams} defaultName={profile?.club} />
      </div>
    )
  }

  const club = data.club
  const place = [club.city, club.country].filter(Boolean).join(', ')
  const sub = [place, club.founded ? t('header.founded', { y: club.founded }) : ''].filter(Boolean).join('. ')
  const closeNote = () => { setNote(false); try { localStorage.setItem(NOTE_KEY, '1') } catch { /* storage unavailable */ } }

  return (
    <div>
      <header className="mb-5 flex items-start gap-4 sm:mb-7 sm:items-center sm:gap-5">
        <Crest name={club.name} colors={club.colors} size={56} className="mt-1 sm:mt-0 sm:h-[82px] sm:w-[72px]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink-muted">{t('header.eyebrow')}</p>
          <h1 className="text-balance text-[28px] leading-[1.05] text-ink sm:text-[38px]">{club.name}</h1>
          {sub && <p className="mt-1.5 text-[14.5px] text-ink-muted">{sub}</p>}
        </div>
        <button type="button" className="btn-outline hidden min-h-[44px] shrink-0 sm:inline-flex" onClick={() => setEditing('edit')}><Pencil size={16} />{t('header.edit')}</button>
        <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-paper text-ink-soft sm:hidden" onClick={() => setEditing('edit')} aria-label={t('header.edit')}><Pencil size={17} /></button>
      </header>

      {note && (
        <div className="mb-5 flex items-start gap-3 rounded-card bg-sand px-4 py-3 sm:px-5">
          <Info size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[14px] leading-relaxed text-ink-soft">{t('localNote')}</p>
          <button type="button" onClick={closeNote} className="-my-1 -mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-paper hover:text-ink" aria-label={t('localNoteClose')}><X size={17} /></button>
        </div>
      )}

      <div ref={tabsRef}>
      <Tabs className="mb-6 sm:mb-8" value={tab} onChange={(v) => navigate(v === 'apercu' ? '/app/club' : `/app/club/${v}`)}
        tabs={CLUB_TABS.map((id) => ({ id, label: t(`tabs.${id}`) }))} />
      </div>

      {tab === 'apercu' && <Overview data={data} eventsByMatch={eventsByMatch} plan={profile?.plan} onEdit={() => setEditing('edit')} />}
      {tab === 'equipes' && <TeamsTab data={data} eventsByMatch={eventsByMatch} />}
      {tab === 'membres' && <MembersTab data={data} />}
      {tab === 'videos' && <VideosTab data={data} eventsByMatch={eventsByMatch} matchesById={matchesById} />}
      {tab === 'joueurs' && <PlayersTab data={data} eventsByMatch={eventsByMatch} />}
      {tab === 'analytique' && <AnalyticsTab data={data} eventsByMatch={eventsByMatch} />}

      <ClubForm open={editing === 'edit'} onClose={() => setEditing(null)} club={club} teams={data.teams} />
    </div>
  )
}
