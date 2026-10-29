import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { LangSwitch, Logo } from '../ui'
import { MolaMark } from '../ui/brand'
import { useT } from '../i18n'
import { cx } from '../lib/util'
import { useSession } from '../lib/session'

export default function SiteLayout() {
  const { t } = useT('common')
  const { profile } = useSession()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(false) }, [loc.pathname, loc.hash])
  // a new page starts at the top (links with a #section scroll there instead)
  useEffect(() => { if (!loc.hash) window.scrollTo(0, 0) }, [loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])
  const links: { to: string; label: string; icon?: ReactNode }[] = [
    { to: '/livres', label: t('nav.books') },
    { to: '/jeux', label: t('nav.games') },
    { to: '/#app', label: t('nav.app') },
    { to: '/#mola', label: t('nav.mola'), icon: <MolaMark size={16} /> },
    { to: '/premium', label: t('nav.premium') },
  ]
  const cta = profile ? { to: '/app', label: t('nav.openApp') } : { to: '/bienvenue', label: t('nav.start') }
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-cream/90 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label={t('footer.home')} className="shrink-0 rounded-md"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label={t('app.mainNav')}>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) => cx('relative inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-[14.5px] font-semibold transition-colors',
                  isActive && !l.to.includes('#') ? 'text-ink' : 'text-ink-soft hover:bg-sand hover:text-ink')}>
                {({ isActive }) => <>
                  {l.icon}{l.label}
                  {isActive && !l.to.includes('#') && <span aria-hidden="true" className="absolute inset-x-3 -bottom-[13px] h-[2.5px] rounded-full bg-forest-600" />}
                </>}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <Link to={cta.to} className="btn-primary btn-sm hidden sm:inline-flex">{cta.label}</Link>
            <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-sand hover:text-ink md:hidden" onClick={() => setOpen(!open)}
              aria-expanded={open} aria-controls="site-menu" aria-label={open ? t('nav.close') : t('nav.menu')}>
              {open ? <X size={21} strokeWidth={1.75} /> : <Menu size={21} strokeWidth={1.75} />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="site-menu" className="border-t border-line/80 bg-cream md:hidden" aria-label={t('app.mainNav')}>
            <ul className="container-page divide-y divide-line/80">
              {links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="flex min-h-[52px] items-center gap-2.5 text-[16px] font-semibold text-ink">{l.icon}{l.label}</Link>
                </li>
              ))}
            </ul>
            <div className="container-page pb-5 pt-3">
              <Link to={cta.to} className="btn-primary w-full">{cta.label}</Link>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="surface-dark mt-20 bg-night-800 text-cream/75 sm:mt-24">
        <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:py-16">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" aria-label={t('footer.home')} className="inline-block rounded-md"><Logo light /></Link>
            <p className="mt-5 max-w-sm font-display text-[17px] font-medium italic leading-snug text-cream/85" style={{ fontStretch: '100%' }}>{t('footer.motto')}</p>
          </div>
          <FooterCol title={t('footer.products')} links={[
            { to: '/livres#lionceaux', label: t('footer.tome1') },
            { to: '/livres#code-njangi', label: t('footer.methode') },
            { to: '/jeux', label: t('footer.games') },
            { to: '/#app', label: t('footer.app') },
            { to: '/#mola', label: t('footer.mola') },
          ]} />
          <FooterCol title={t('footer.project')} links={[
            { to: '/revue', label: t('footer.review') },
            { to: '/marque', label: t('footer.brand') },
            { to: '/premium', label: t('footer.premium') },
          ]} />
        </div>
        <div className="border-t border-white/10">
          <div className="container-page py-8 sm:py-10">
            <p className="text-[13px] font-semibold text-sun-300">{t('footer.mantraTitle')}</p>
            <p className="mt-2 max-w-3xl text-balance font-display text-[22px] leading-[1.15] text-cream sm:text-[28px]">{t('footer.mantra')}</p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container-page flex flex-col gap-1 py-5 text-[13px] text-cream/50 sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} William Foteping</span>
            <span>{t('footer.rights')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-cream">{title}</p>
      <ul className="mt-2.5">
        {links.map((l) => (
          <li key={l.to}><Link to={l.to} className="inline-flex min-h-[40px] items-center text-[14.5px] text-cream/70 transition-colors hover:text-cream sm:min-h-[34px]">{l.label}</Link></li>
        ))}
      </ul>
    </div>
  )
}
