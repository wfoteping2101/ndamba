// A discreet row of doorways at the bottom of the performance pages.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Gauge, NotebookPen, Route } from 'lucide-react'
import { useT } from '../../../../i18n'
import { BOOKS } from '../../../../lib/config'

type Item = 'space' | 'parcours' | 'journal' | 'code'

export function PerfLinks({ items, stack = false }: { items: Item[]; stack?: boolean }) {
  const { t, lang } = useT('player')
  const def: Record<Item, { to: string; external?: boolean; icon: ReactNode; title: string; hint: string }> = {
    space: { to: '/app/joueur', icon: <Gauge size={18} />, title: t('perf.links.space'), hint: t('perf.links.spaceHint') },
    parcours: { to: '/app/joueur/parcours', icon: <Route size={18} />, title: t('journey:playerCard.title'), hint: t('perf.links.parcoursHint') },
    journal: { to: '/app/joueur/carnet', icon: <NotebookPen size={18} />, title: t('perf.journal.title'), hint: t('perf.links.journalHint') },
    code: { to: BOOKS.methode.href, external: true, icon: <BookOpen size={18} />, title: BOOKS.methode.title[lang], hint: t('perf.links.codeHint') },
  }
  const cls = 'flex min-h-[64px] items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 transition hover:border-forest-300'
  return (
    <nav aria-label={t('perf.links.label')} className={stack ? 'grid grid-cols-1 content-start gap-2.5 sm:grid-cols-2 lg:grid-cols-1' : `grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${items.length === 3 ? 'lg:grid-cols-3' : ''}`}>
      {items.map((k) => {
        const it = def[k]
        const body = (
          <>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sand text-ink-soft" aria-hidden="true">{it.icon}</span>
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold text-ink">{it.title}</span>
              <span className="block truncate text-[12.5px] text-ink-muted">{it.hint}</span>
            </span>
          </>
        )
        return it.external ? <a key={k} href={it.to} className={cls}>{body}</a> : <Link key={k} to={it.to} className={cls}>{body}</Link>
      })}
    </nav>
  )
}
