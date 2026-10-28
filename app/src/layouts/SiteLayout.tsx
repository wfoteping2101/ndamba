import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { LangSwitch, Logo } from '../ui'
import { useT } from '../i18n'
import { cx } from '../lib/util'
import { useSession } from '../lib/session'

export default function SiteLayout() {
  const { t } = useT('common')
  const { profile } = useSession()
  const [open, setOpen] = useState(false)
  const links = [
    { to: '/livres', label: t('nav.books') },
    { to: '/#app', label: t('nav.app') },
    { to: '/#mola', label: t('nav.mola') },
    { to: '/premium', label: t('nav.premium') },
  ]
  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/90 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Link to="/" aria-label="Ndamba"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('rounded-xl px-3 py-2 text-sm font-semibold', isActive && !l.to.includes('#') ? 'text-forest-600' : 'text-ink-soft hover:bg-sand')}>{l.label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <Link to={profile ? '/app' : '/bienvenue'} className="btn-primary btn-sm hidden sm:inline-flex">{profile ? t('nav.openApp') : t('nav.start')}</Link>
            <button type="button" className="btn-ghost btn-sm md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {open && (
          <nav className="container-page flex flex-col gap-1 pb-4 md:hidden">
            {links.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-[15px] font-semibold text-ink-soft hover:bg-sand">{l.label}</Link>)}
            <Link to={profile ? '/app' : '/bienvenue'} onClick={() => setOpen(false)} className="btn-primary mt-2">{profile ? t('nav.openApp') : t('nav.start')}</Link>
          </nav>
        )}
      </header>
      <main><Outlet /></main>
      <footer className="mt-16 border-t border-line bg-night-800 text-cream/80">
        <div className="container-page grid gap-8 py-12 sm:grid-cols-3">
          <div>
            <Logo light />
            <p className="mt-3 max-w-xs text-sm text-cream/70">{t('footer.motto')}</p>
          </div>
          <div className="text-sm">
            <div className="mb-2 font-semibold text-cream">{t('footer.products')}</div>
            <ul className="space-y-1.5">
              <li><Link className="hover:text-cream" to="/livres">{t('footer.tome1')}</Link></li>
              <li><Link className="hover:text-cream" to="/livres">{t('footer.methode')}</Link></li>
              <li><Link className="hover:text-cream" to="/app">{t('footer.app')}</Link></li>
              <li><Link className="hover:text-cream" to="/app/mola">{t('footer.mola')}</Link></li>
              <li><Link className="hover:text-cream" to="/revue">{t('site:review.nav')}</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="mb-2 font-semibold text-cream">{t('footer.mantraTitle')}</div>
            <p className="text-cream/70">{t('footer.mantra')}</p>
            <p className="mt-4 text-xs text-cream/50">© {new Date().getFullYear()} William Foteping · Lemon Network Solutions</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
