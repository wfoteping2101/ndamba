import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock, Gauge, Heart, Plus, Ruler, Target, Users } from 'lucide-react'
import { Badge, EmptyState, Pitch } from '../../ui'
import { useT } from '../../i18n'
import { useDocumentTitle } from '../../lib/hooks'
import { BOOKS } from '../../lib/config'
import { DRILLS, drillText, getDrill } from '../../content'
import type { DrillText } from '../../lib/types'
import { IntensityMeter, IntentionBadge, MdBadge, useToast } from './components/bits'
import { AddToSessionModal, PillToggle } from './components/AddToSessionModal'
import { matches, paramsToFilter } from './components/helpers'

/** One line of the drill's spec sheet: label on the left, value on the right. */
function Meta({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[8.5rem_minmax(0,1fr)] items-start gap-3 border-b border-line/70 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <dt className="flex items-center gap-2 text-[13.5px] text-ink-muted"><span className="text-forest-600 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">{icon}</span>{label}</dt>
      <dd className="min-w-0 text-[14px] font-semibold leading-snug text-ink">{children}</dd>
    </div>
  )
}

function ListBlock({ title, items, ordered = false, tone = 'forest' }: { title: string; items?: string[]; ordered?: boolean; tone?: 'forest' | 'muted' }) {
  if (!items?.length) return null
  const dot = tone === 'muted' ? 'bg-ink-faint' : 'bg-forest-600'
  return (
    <section className="mb-7">
      <h2 className="mb-2 font-display text-lg text-ink">{title}</h2>
      <ol className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
            {ordered
              ? <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest-50 text-xs font-bold text-forest-700">{i + 1}</span>
              : <span className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />}
            <span>{it}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function DrillDetail() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const { t, lang } = useT('training')
  const d = getDrill(id?.toUpperCase())
  const tx: DrillText | undefined = d ? drillText(d, lang) : undefined
  useDocumentTitle(d && tx ? `${d.id} ${tx.title}` : t('library.title'))
  const [view, setView] = useState<'1' | '2'>('1')
  const [adding, setAdding] = useState(false)
  const { toast, toastNode } = useToast()
  const search = sp.toString() ? `?${sp.toString()}` : ''

  // previous / next inside the list the coach came from (filters kept)
  const seq = useMemo(() => { const f = paramsToFilter(sp); const l = DRILLS.filter((x) => matches(x, f)); return l.some((x) => x.id === d?.id) ? l : DRILLS }, [sp, d?.id])
  const idx = d ? seq.findIndex((x) => x.id === d.id) : -1
  const prev = idx > 0 ? seq[idx - 1] : undefined
  const next = idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : undefined

  if (!d || !tx) {
    return (
      <div>
        <Link to="/app/exercices" className="btn-ghost btn-sm mb-4 -ml-2"><ArrowLeft size={16} aria-hidden="true" />{t('detail.back')}</Link>
        <EmptyState icon={<BookOpen size={32} />} title={t('detail.missingTitle', { id: id ?? '' })} body={t('detail.missingBody')} action={<Link to="/app/exercices" className="btn-primary">{t('detail.back')}</Link>} />
      </div>
    )
  }
  const spec = view === '2' && d.diagram2 ? d.diagram2 : d.diagram
  const players = lang === 'en' ? d.players.en : d.players.fr

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link to={`/app/exercices${search}`} className="btn-ghost btn-sm -ml-2"><ArrowLeft size={16} aria-hidden="true" />{t('detail.back')}</Link>
        <span className="text-[12.5px] tabular-nums text-ink-faint">{idx >= 0 ? `${idx + 1} / ${seq.length}` : ''}</span>
      </div>

      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-forest-600 px-2 py-0.5 text-[14px] font-semibold tabular-nums text-cream">{d.id}</span>
          <span className="eyebrow">{t(`common:families.${d.family}`)}</span>
        </div>
        <h1 className="text-[30px] leading-tight text-ink sm:text-[42px]">{tx.title}</h1>
        <p className="mt-1.5 max-w-2xl text-[17px] leading-relaxed text-ink-muted">{tx.subtitle}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{d.intentions.map((i) => <IntentionBadge key={i} i={i} />)}</div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="card overflow-hidden p-2 sm:p-3">
            <Pitch spec={spec} width={720} title={tx.title} />
            {d.diagram2 && (
              <div className="flex items-center justify-between gap-2 px-1 pt-3">
                <span className="text-xs text-ink-muted">{view === '1' ? t('detail.diagram1Hint') : t('detail.diagram2Hint')}</span>
                <PillToggle label={t('detail.diagram')} value={view} onChange={setView} options={[{ id: '1', label: t('detail.diagram1') }, { id: '2', label: t('detail.diagram2') }]} />
              </div>
            )}
          </div>
          <div className="no-print mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-primary btn-lg flex-1" onClick={() => setAdding(true)}><Plus size={18} aria-hidden="true" />{t('detail.add')}</button>
            <a href={`${BOOKS.methode.href}#drill-${d.id}`} className="btn-outline btn-lg flex-1"><BookOpen size={18} aria-hidden="true" />{t('detail.read')}</a>
          </div>
        </div>

        <div className="min-w-0">
          <dl className="mb-7 border-t border-line/70">
            <Meta icon={<Users size={14} />} label={t('detail.players')}>{players}</Meta>
            <Meta icon={<Target size={14} />} label={t('detail.ages')}>{d.ages}</Meta>
            <Meta icon={<Ruler size={14} />} label={t('detail.space')}><span className="tabular-nums">{d.space.w} x {d.space.h} m</span></Meta>
            <Meta icon={<Clock size={14} />} label={t('detail.duration')}>{lang === 'en' ? d.duration.en : d.duration.fr} <span className="font-medium tabular-nums text-ink-faint">({d.minutes} {t('common:misc.minutes')})</span></Meta>
            <Meta icon={<Gauge size={14} />} label={t('intensity')}><IntensityMeter level={d.intensity} /></Meta>
            <Meta icon={<CalendarDays size={14} />} label={t('detail.days')}><span className="flex flex-wrap gap-1">{d.md.map((m) => <MdBadge key={m} md={m} />)}</span></Meta>
          </dl>

          {d.pieces?.length > 0 && (
            <div className="mb-7 flex flex-wrap items-center gap-2 text-sm">
              <span className="mr-1 text-[13.5px] text-ink-muted">{t('detail.pieces')}</span>
              {d.pieces.map((p) => <Badge key={p}>{t(`common:pieces.${p}`)}</Badge>)}
            </div>
          )}

          <section className="mb-7 rounded-[14px] bg-forest-600 p-4 text-cream sm:p-5">
            <h2 className="mb-1 font-sans text-[13px] font-semibold tracking-normal text-cream/75" style={{ fontStretch: '100%', lineHeight: 1.4 }}>{t('detail.objective')}</h2>
            <p className="text-[18px] font-semibold leading-snug">{tx.objective}</p>
          </section>

          <ListBlock title={t('detail.organisation')} items={tx.organisation} />
          <ListBlock title={t('detail.rules')} items={tx.rules} />
          {tx.coaching?.length ? (
          <section className="mb-7 rounded-[14px] border border-line bg-sand/50 p-4 sm:p-5">
            <h2 className="mb-2.5 font-display text-lg text-ink">{t('detail.coaching')}</h2>
            <ul className="space-y-2.5">
              {tx.coaching.map((c, i) => <li key={i} className="border-l-2 border-forest-500 pl-3 text-[15px] font-medium italic leading-relaxed text-ink">{c}</li>)}
            </ul>
          </section>
          ) : null}
          <div className="grid gap-x-6 sm:grid-cols-2">
            <ListBlock title={t('detail.progressions')} items={tx.progressions} />
            <ListBlock title={t('detail.regressions')} items={tx.regressions} tone="muted" />
          </div>
          {tx.measure && (
            <section className="mb-7 border-t border-line pt-4">
              <h2 className="mb-1 font-display text-lg text-ink">{t('detail.measure')}</h2>
              <p className="text-[15px] leading-relaxed text-ink-soft">{tx.measure}</p>
            </section>
          )}
          {tx.story && (
            <section className="mb-7 flex gap-3 rounded-[14px] border border-line bg-paper p-4">
              <Heart size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-forest-600" aria-hidden="true" />
              <div>
                <h2 className="font-sans text-[13px] font-semibold tracking-normal text-ink-muted" style={{ fontStretch: '100%', lineHeight: 1.4 }}>{t('detail.story')}</h2>
                <p className="mt-1 text-[16px] font-medium italic leading-snug text-ink">{tx.story}</p>
                <a href={BOOKS.tome1.href} className="link mt-2 inline-block text-sm">{t('detail.storyLink')}</a>
              </div>
            </section>
          )}
        </div>
      </div>

      <nav className="no-print mt-8 grid grid-cols-2 gap-3 border-t border-line pt-6" aria-label={t('detail.nav')}>
        {prev ? (
          <Link to={`/app/exercices/${prev.id}${search}`} className="card flex min-h-[64px] items-center gap-2 p-3 hover:border-forest-300">
            <ChevronLeft size={18} className="shrink-0 text-ink-faint" aria-hidden="true" />
            <span className="min-w-0"><span className="flex gap-2 text-[12px] text-ink-faint"><span>{t('common:actions.previous')}</span><span className="font-semibold tabular-nums text-forest-700">{prev.id}</span></span><span className="block truncate font-semibold text-ink">{drillText(prev, lang).title}</span></span>
          </Link>
        ) : <span />}
        {next ? (
          <Link to={`/app/exercices/${next.id}${search}`} className="card flex min-h-[64px] items-center justify-end gap-2 p-3 text-right hover:border-forest-300">
            <span className="min-w-0"><span className="flex justify-end gap-2 text-[12px] text-ink-faint"><span className="font-semibold tabular-nums text-forest-700">{next.id}</span><span>{t('common:actions.next')}</span></span><span className="block truncate font-semibold text-ink">{drillText(next, lang).title}</span></span>
            <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden="true" />
          </Link>
        ) : <span />}
      </nav>

      <AddToSessionModal drill={d} open={adding} onClose={() => setAdding(false)}
        onDone={(s, created) => toast({ text: created ? t('detail.createdToast', { title: s.title }) : t('detail.addedToast', { title: s.title }), to: `/app/seances/${s.id}`, action: t('detail.openSession') })} />
      {toastNode}
    </div>
  )
}
