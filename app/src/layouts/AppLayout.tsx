import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, CalendarDays, CircleHelp, ClipboardList, Compass, Crown, Dumbbell, Gamepad2, Home, LineChart, MoreHorizontal, Settings, Shirt, Trophy, User, X } from 'lucide-react'
import { MolaMark } from '../ui/brand'
import { useEffect, useState, type ReactNode } from 'react'
import { LangSwitch, Logo } from '../ui'
import { useT } from '../i18n'
import { cx } from '../lib/util'
import { useSession } from '../lib/session'
import MolaLauncher from '../surfaces/mola/MolaLauncher'
import type { Team } from '../lib/types'

interface Item { to: string; label: string; icon: (size: number) => ReactNode; end?: boolean; href?: boolean }

/** Each page of the app and the chapter of the guide that explains it (guide/<lang>/ch-NN.html). */
const GUIDE_CHAPTERS: [RegExp, number][] = [
  [/^\/app\/mola/, 18],
  [/^\/app\/exercices/, 7],
  [/^\/app\/seances/, 8],
  [/^\/app\/semaine/, 9],
  [/^\/app\/equipe\/[^/]+\/parcours/, 16],
  [/^\/app\/(equipe|observer)/, 10],
  [/^\/app\/matchs/, 11],
  [/^\/app\/analyse\/rapport/, 13],
  [/^\/app\/analyse\/video/, 14],
  [/^\/app\/analyse/, 12],
  [/^\/app\/joueur\/(lecons|carnet|parcours)/, 16],
  [/^\/app\/joueur/, 15],
  [/^\/app\/livres/, 19],
  [/^\/app\/premium/, 24],
  [/^\/app\/reglages/, 6],
]
export function guideChapter(path: string, role?: string): number {
  if (/^\/app\/?$/.test(path)) return role === 'player' ? 15 : role === 'parent' ? 17 : role === 'analyst' ? 12 : 6
  return GUIDE_CHAPTERS.find(([re]) => re.test(path))?.[1] ?? 4
}

/** "How does it work?": opens the guide chapter of this page, in a new tab so the work stays open. */
function GuideLink({ path, role }: { path: string; role?: string }) {
  const { t, lang } = useT('common')
  const n = guideChapter(path, role)
  return (
    <a href={`/guide/${lang === 'en' ? 'en' : 'fr'}/ch-${String(n).padStart(2, '0')}.html`} target="_blank" rel="noopener"
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-line bg-paper px-3 text-[13px] font-semibold text-forest-700 transition hover:border-forest-300 hover:bg-forest-50">
      <CircleHelp size={15} strokeWidth={1.75} aria-hidden="true" />{t('app.howItWorks', { n })}
    </a>
  )
}
const SW = 1.75 // lucide stroke width (DESIGN.md 2)

export default function AppLayout() {
  const { t } = useT('common')
  const { ready, profile, team } = useSession()
  const loc = useLocation()
  const [more, setMore] = useState(false)
  useEffect(() => { setMore(false) }, [loc.pathname])
  // a new page starts at the top (links with a #section scroll there instead)
  useEffect(() => { if (!loc.hash) window.scrollTo(0, 0) }, [loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!more) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setMore(false) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [more])
  if (!ready) return <div className="grid min-h-screen place-items-center bg-cream"><div className="h-9 w-9 rounded-full border-[3px] border-forest-100 border-t-forest-600 motion-safe:animate-spin" /></div>
  if (!profile) return <Navigate to="/bienvenue" replace />
  const focus = loc.pathname.startsWith('/app/analyse/live/')

  const groups: { title: string; items: Item[] }[] = [
    { title: '', items: [
      { to: '/app', label: t('app.home'), icon: (s) => <Home size={s} strokeWidth={SW} />, end: true },
      { to: '/app/mola', label: t('app.mola'), icon: (s) => <MolaMark size={s} /> },
    ] },
    { title: t('app.groups.training'), items: [
      { to: '/app/exercices', label: t('app.drills'), icon: (s) => <Dumbbell size={s} strokeWidth={SW} /> },
      { to: '/app/seances', label: t('app.sessions'), icon: (s) => <ClipboardList size={s} strokeWidth={SW} /> },
      { to: '/app/semaine', label: t('app.week'), icon: (s) => <CalendarDays size={s} strokeWidth={SW} /> },
    ] },
    { title: t('app.groups.team'), items: [
      { to: '/app/equipe', label: t('app.team'), icon: (s) => <Shirt size={s} strokeWidth={SW} /> },
      { to: '/app/matchs', label: t('app.matches'), icon: (s) => <Trophy size={s} strokeWidth={SW} /> },
    ] },
    { title: t('app.groups.analysis'), items: [
      { to: '/app/analyse', label: t('app.analysis'), icon: (s) => <LineChart size={s} strokeWidth={SW} /> },
    ] },
    { title: t('app.groups.me'), items: [
      { to: '/app/joueur', label: t('app.player'), icon: (s) => <User size={s} strokeWidth={SW} /> },
      { to: '/app/livres', label: t('app.books'), icon: (s) => <BookOpen size={s} strokeWidth={SW} /> },
      { to: '/guide/', label: t('app.guide'), icon: (s) => <Compass size={s} strokeWidth={SW} />, href: true },
      { to: '/football/', label: t('app.football'), icon: (s) => <Gamepad2 size={s} strokeWidth={SW} />, href: true },
      { to: '/app/premium', label: t('app.premium'), icon: (s) => <Crown size={s} strokeWidth={SW} /> },
      { to: '/app/reglages', label: t('app.settings'), icon: (s) => <Settings size={s} strokeWidth={SW} /> },
    ] },
  ]
  const tabs: Item[] = [
    { to: '/app', label: t('app.home'), icon: (s) => <Home size={s} strokeWidth={SW} />, end: true },
    { to: '/app/seances', label: t('app.tabs.training'), icon: (s) => <Dumbbell size={s} strokeWidth={SW} /> },
    { to: '/app/matchs', label: t('app.matches'), icon: (s) => <Trophy size={s} strokeWidth={SW} /> },
    { to: '/app/analyse', label: t('app.tabs.analysis'), icon: (s) => <LineChart size={s} strokeWidth={SW} /> },
  ]
  // the « Plus » tab is the current one when the page is not one of the four tabs (or their children)
  const p = loc.pathname
  const inTabs = p === '/app' || p === '/app/' || ['/app/seances', '/app/matchs', '/app/analyse'].some((b) => p.startsWith(b))
  const initials = profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'N'

  if (focus) return <div className="min-h-screen bg-night-900"><Outlet /></div>

  return (
    <div className="min-h-screen bg-cream lg:flex">
      {/* desktop sidebar: the club room, on pitch green */}
      <aside className="surface-dark sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col bg-forest-800 text-cream lg:flex">
        <div className="flex h-[68px] shrink-0 items-center px-5">
          <Link to="/app" aria-label={t('app.home')} className="rounded-md"><Logo light /></Link>
        </div>
        {team && <TeamPlate team={team} />}
        <nav className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-3 pb-6 pt-1" aria-label={t('app.mainNav')}>
          {groups.map((g, i) => (
            <div key={i}>
              {g.title && <div className="mb-1.5 px-3 text-[12.5px] font-semibold text-cream/45">{g.title}</div>}
              <ul className="space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.to}>
                    {it.href ? (
                      <a href={it.to} className="relative flex h-[38px] items-center gap-3 rounded-[10px] px-3 text-[14.5px] font-medium text-cream/75 transition-colors hover:bg-white/[0.06] hover:text-cream">
                        <span className="grid w-5 place-items-center">{it.icon(18)}</span>{it.label}
                      </a>
                    ) : (
                    <NavLink to={it.to} end={it.end}
                      className={({ isActive }) => cx('relative flex h-[38px] items-center gap-3 rounded-[10px] px-3 text-[14.5px] transition-colors',
                        isActive ? 'bg-white/[0.11] font-semibold text-white' : 'font-medium text-cream/75 hover:bg-white/[0.06] hover:text-cream')}>
                      {({ isActive }) => <>
                        {isActive && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-cream" />}
                        <span className="grid w-5 place-items-center">{it.icon(18)}</span>{it.label}
                      </>}
                    </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-3 border-t border-white/10 px-4 py-3.5">
          <Link to="/app/reglages" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg">
            <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[12px] font-semibold text-cream">{initials}</span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold text-cream">{profile.name}</span>
              <span className="block truncate text-[12px] text-cream/55 first-letter:uppercase">{t(`mola:ob.roleShort.${profile.role}`)}</span>
            </span>
          </Link>
          <LangSwitch dark />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* phone and tablet top bar */}
        <header className="sticky top-0 z-30 border-b border-line/80 bg-cream/90 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <Link to="/app" aria-label={t('app.home')} className="rounded-md"><Logo size="sm" /></Link>
            <div className="flex min-w-0 items-center gap-3">
              {team && <span className="hidden truncate text-[13px] font-semibold text-ink-soft sm:block">{team.name}</span>}
              <LangSwitch />
            </div>
          </div>
        </header>
        <main className="container-page pb-28 pt-4 sm:pt-6 lg:pb-14 lg:pt-6">
          <div className="no-print mb-3 flex justify-end sm:mb-4"><GuideLink path={loc.pathname} role={profile.role} /></div>
          <Outlet />
        </main>
      </div>

      {/* phone tab bar */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur-md lg:hidden" aria-label={t('app.mainNav')}>
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {tabs.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end}
              className={({ isActive }) => cx('relative flex h-[60px] flex-col items-center justify-center gap-1 text-[11.5px] font-semibold transition-colors', isActive ? 'text-forest-600' : 'text-ink-muted hover:text-ink')}>
              {({ isActive }) => <>
                {isActive && <span aria-hidden="true" className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-forest-600" />}
                {it.icon(22)}<span className="max-w-full truncate px-1">{it.label}</span>
              </>}
            </NavLink>
          ))}
          <button type="button" onClick={() => setMore(true)} aria-expanded={more} aria-haspopup="dialog"
            className={cx('relative flex h-[60px] flex-col items-center justify-center gap-1 text-[11.5px] font-semibold transition-colors', !inTabs ? 'text-forest-600' : 'text-ink-muted hover:text-ink')}>
            {!inTabs && <span aria-hidden="true" className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-forest-600" />}
            <MoreHorizontal size={22} strokeWidth={SW} />{t('app.tabs.more')}
          </button>
        </div>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50 bg-night-900/55 lg:hidden" onClick={() => setMore(false)}>
          <div role="dialog" aria-modal="true" aria-label={t('app.tabs.more')}
            className="safe-bottom absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-panel bg-paper px-4 pb-5" onClick={(e) => e.stopPropagation()}>
            <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
            <div className="flex items-center justify-between pb-2 pt-3">
              <h2 className="text-[19px] text-ink">{t('app.tabs.more')}</h2>
              <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-sand hover:text-ink" onClick={() => setMore(false)} aria-label={t('actions.close')} autoFocus><X size={19} strokeWidth={SW} /></button>
            </div>
            {team && <p className="mb-3 text-[13px] text-ink-muted"><span className="font-semibold text-ink-soft">{team.name}</span>, {teamLine(team, t)}</p>}
            {groups.map((g, i) => (
              <div key={i} className="mb-4 last:mb-0">
                {g.title && <div className="mb-1.5 px-1 text-[12.5px] font-semibold text-ink-muted">{g.title}</div>}
                <ul className="grid grid-cols-2 gap-1.5">
                  {g.items.map((it) => (
                    <li key={it.to}>
                      {it.href ? (
                        <a href={it.to} className="flex min-h-[48px] items-center gap-3 rounded-control border border-line px-3 text-[14.5px] font-semibold text-ink-soft transition-colors hover:bg-cream hover:text-ink">
                          <span className="grid w-5 shrink-0 place-items-center">{it.icon(19)}</span><span className="min-w-0 truncate">{it.label}</span>
                        </a>
                      ) : (
                      <NavLink to={it.to} end={it.end} onClick={() => setMore(false)}
                        className={({ isActive }) => cx('flex min-h-[48px] items-center gap-3 rounded-control border px-3 text-[14.5px] font-semibold transition-colors',
                          isActive ? 'border-forest-600 bg-forest-50 text-forest-700' : 'border-line text-ink-soft hover:bg-cream hover:text-ink')}>
                        <span className="grid w-5 shrink-0 place-items-center">{it.icon(19)}</span><span className="min-w-0 truncate">{it.label}</span>
                      </NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mola-dock"><MolaLauncher /></div>
    </div>
  )
}

function teamLine(team: Team, t: ReturnType<typeof useT>['t']) {
  return String(t('app.teamLine', { age: team.ageGroup, format: team.format, formation: team.formation }))
}

/** The active team at the top of the sidebar: its kit colours, its name, its format. */
function TeamPlate({ team }: { team: Team }) {
  const { t } = useT('common')
  const a = team.colors?.primary || '#0B5D3B'
  const b = team.colors?.secondary || '#F5B700'
  return (
    <Link to="/app/reglages" className="mx-3 mb-3 flex items-center gap-3 rounded-card bg-white/[0.06] px-3 py-3 transition-colors hover:bg-white/[0.09]" title={t('app.switchTeam')}>
      <span aria-hidden="true" className="h-8 w-8 shrink-0 rounded-full ring-2 ring-white/20" style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }} />
      <span className="min-w-0">
        <span className="line-clamp-2 block font-display text-[14.5px] leading-tight text-white">{team.name}</span>
        <span className="mt-0.5 block truncate text-[12px] text-cream/60">{teamLine(team, t)}</span>
      </span>
    </Link>
  )
}
