import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, CalendarDays, ClipboardList, Crown, Dumbbell, Home, LineChart, MoreHorizontal, Settings, Shirt, Sparkles, Trophy, User, Video, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { LangSwitch, Logo } from '../ui'
import { useT } from '../i18n'
import { cx } from '../lib/util'
import { useSession } from '../lib/session'
import MolaLauncher from '../surfaces/mola/MolaLauncher'

interface Item { to: string; label: string; icon: ReactNode; end?: boolean }

export default function AppLayout() {
  const { t } = useT('common')
  const { ready, profile, team } = useSession()
  const loc = useLocation()
  const [more, setMore] = useState(false)
  if (!ready) return <div className="grid min-h-screen place-items-center bg-cream"><div className="h-10 w-10 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>
  if (!profile) return <Navigate to="/bienvenue" replace />
  const focus = loc.pathname.startsWith('/app/analyse/live/')

  const groups: { title: string; items: Item[] }[] = [
    { title: '', items: [{ to: '/app', label: t('app.home'), icon: <Home size={18} />, end: true }, { to: '/app/mola', label: t('app.mola'), icon: <Sparkles size={18} /> }] },
    { title: t('app.groups.training'), items: [
      { to: '/app/exercices', label: t('app.drills'), icon: <Dumbbell size={18} /> },
      { to: '/app/seances', label: t('app.sessions'), icon: <ClipboardList size={18} /> },
      { to: '/app/semaine', label: t('app.week'), icon: <CalendarDays size={18} /> },
    ] },
    { title: t('app.groups.team'), items: [
      { to: '/app/equipe', label: t('app.team'), icon: <Shirt size={18} /> },
      { to: '/app/matchs', label: t('app.matches'), icon: <Trophy size={18} /> },
    ] },
    { title: t('app.groups.analysis'), items: [
      { to: '/app/analyse', label: t('app.analysis'), icon: <LineChart size={18} />, end: true },
      { to: '/app/analyse/video', label: t('app.video'), icon: <Video size={18} /> },
    ] },
    { title: t('app.groups.me'), items: [
      { to: '/app/joueur', label: t('app.player'), icon: <User size={18} /> },
      { to: '/app/livres', label: t('app.books'), icon: <BookOpen size={18} /> },
      { to: '/app/premium', label: t('app.premium'), icon: <Crown size={18} /> },
      { to: '/app/reglages', label: t('app.settings'), icon: <Settings size={18} /> },
    ] },
  ]
  const tabs: Item[] = [
    { to: '/app', label: t('app.home'), icon: <Home size={20} />, end: true },
    { to: '/app/seances', label: t('app.tabs.training'), icon: <Dumbbell size={20} /> },
    { to: '/app/matchs', label: t('app.matches'), icon: <Trophy size={20} /> },
    { to: '/app/analyse', label: t('app.tabs.analysis'), icon: <LineChart size={20} /> },
  ]
  const navCls = ({ isActive }: { isActive: boolean }) => cx('flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-semibold transition', isActive ? 'bg-forest-600 text-cream' : 'text-ink-soft hover:bg-sand')

  if (focus) return <div className="min-h-screen bg-night-900"><Outlet /></div>

  return (
    <div className="min-h-screen bg-cream lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-paper lg:flex">
        <div className="flex h-16 items-center px-5"><Link to="/" aria-label="Njangi"><Logo /></Link></div>
        {team && <div className="mx-4 mb-3 rounded-xl bg-sand px-3 py-2 text-xs"><div className="font-semibold text-ink">{team.name}</div><div className="text-ink-muted">{team.ageGroup} · {team.format} {t('app.vs')} {team.format} · {team.formation}</div></div>}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-6">
          {groups.map((g, i) => (
            <div key={i}>
              {g.title && <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{g.title}</div>}
              <div className="space-y-0.5">{g.items.map((it) => <NavLink key={it.to} to={it.to} end={it.end} className={navCls}>{it.icon}{it.label}</NavLink>)}</div>
            </div>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <span className="truncate text-xs text-ink-muted">{profile.name}</span>
          <LangSwitch />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/70 bg-cream/90 px-4 backdrop-blur lg:hidden">
          <Link to="/app" aria-label="Njangi"><Logo /></Link>
          <LangSwitch />
        </header>
        <main className="container-page pb-28 pt-5 sm:pt-8 lg:pb-12"><Outlet /></main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {tabs.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', isActive ? 'text-forest-600' : 'text-ink-muted')}>{it.icon}{it.label}</NavLink>
          ))}
          <button type="button" onClick={() => setMore(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-ink-muted"><MoreHorizontal size={20} />{t('app.tabs.more')}</button>
        </div>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50 bg-night-900/50 lg:hidden" onClick={() => setMore(false)}>
          <div className="safe-bottom absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-paper p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between"><span className="font-display text-lg font-semibold">{t('app.tabs.more')}</span><button type="button" className="btn-ghost btn-sm" onClick={() => setMore(false)} aria-label="Close"><X size={18} /></button></div>
            {groups.map((g, i) => (
              <div key={i} className="mb-3">
                {g.title && <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{g.title}</div>}
                <div className="grid grid-cols-2 gap-1.5">{g.items.map((it) => <NavLink key={it.to} to={it.to} end={it.end} onClick={() => setMore(false)} className={navCls}>{it.icon}{it.label}</NavLink>)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <MolaLauncher />
    </div>
  )
}
