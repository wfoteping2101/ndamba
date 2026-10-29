// /jeux: the two games, each tied to its book. Guests play without an account; nothing is paid.
import { Link } from 'react-router-dom'
import { BookOpen, Gamepad2, Smartphone } from 'lucide-react'
import { useT } from '../../i18n'
import { useDocumentTitle } from '../../lib/hooks'
import { BOOKS } from '../../lib/config'
import { PageFrame } from './components/brand'

const GAMES = [
  { key: 'codeNjangi', to: '/jeux/code-njangi', img: '/jeux/code-njangi-card', book: 'methode' as const, tone: 'bg-forest-800' },
  { key: 'lionceaux', to: '/jeux/lionceaux', img: '/jeux/lionceaux-card', book: 'tome1' as const, tone: 'bg-night-800' },
]

export default function Games() {
  const { t, lang } = useT('jeux')
  useDocumentTitle(t('docTitle'))
  return (
    <PageFrame>
      <header className="max-w-3xl">
        <p className="text-[14px] font-semibold text-forest-600">{t('hub.eyebrow')}</p>
        <h1 className="mt-2 text-balance text-[38px] leading-[1.05] text-ink sm:text-[52px]">{t('hub.title')}</h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">{t('hub.subtitle')}</p>
      </header>
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {GAMES.map((g) => (
          <article key={g.key} className={`surface-dark flex flex-col overflow-hidden rounded-panel ${g.tone} text-cream`} data-testid={`game-card-${g.key}`}>
            <Link to={g.to} className="relative block aspect-[16/9] overflow-hidden bg-night-900" tabIndex={-1} aria-hidden="true">
              <picture>
                <source srcSet={`${g.img}.webp`} type="image/webp" />
                <img src={`${g.img}.jpg`} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" width={1280} height={720} />
              </picture>
            </Link>
            <div className="flex flex-1 flex-col p-6 sm:p-8">
              <p className="text-[13px] font-semibold text-sun-300">{t(`hub.${g.key}.tagline`)}</p>
              <h2 className="mt-2 text-balance text-[28px] leading-[1.1] text-cream sm:text-[32px]">{t(`hub.${g.key}.title`)}</h2>
              <p className="mt-3 text-[16px] leading-relaxed text-cream/80">{t(`hub.${g.key}.body`)}</p>
              <p className="mt-3 text-[14px] text-cream/60">{t(`hub.${g.key}.facts`)}</p>
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                <Link to={g.to} className="btn-sun btn-lg">{t(`hub.${g.key}.cta`)}</Link>
                <a href={BOOKS[g.book].href} className="btn-outline-light btn-lg"><BookOpen size={18} strokeWidth={1.75} aria-hidden="true" />{t('hub.readBook')}</a>
              </div>
              <p className="mt-4 text-[13px] text-cream/55">{t('hub.fromBook')} : {BOOKS[g.book].title[lang]}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-8 grid gap-3 text-[14.5px] text-ink-muted sm:grid-cols-2">
        <p className="flex items-start gap-2.5"><Gamepad2 size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-forest-600" aria-hidden="true" />{t('hub.controls')}. {t('hub.requirements')}</p>
        <p className="flex items-start gap-2.5"><Smartphone size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-forest-600" aria-hidden="true" />{t('hub.guest')}</p>
      </div>
    </PageFrame>
  )
}
