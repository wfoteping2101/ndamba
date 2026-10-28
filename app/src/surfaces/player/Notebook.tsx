// /app/joueur/carnet: the user's own « carnet du Njangi », like BriBri's notebook in the novel.
// Entries live in db.notebook (date, title, text, optional linked lesson): create, edit, delete, print.
// From 16 years old it becomes « Mon journal de joueur »: a sober page, adult prompts, no lesson link.
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, NotebookPen, Pencil, Plus, Printer, Search, Trash2 } from 'lucide-react'
import { Field, Modal, PageHeader } from '../../ui'
import { useT } from '../../i18n'
import { db } from '../../lib/db'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { cx, fmtDate, nowISO, uid } from '../../lib/util'
import type { NotebookEntry } from '../../lib/types'
import { allLessons, lessonOfDay, partOf, type LessonView } from './lessons'
import { NotebookHeader, PaperCard, handCls } from './components/Paper'
import { useToast } from './components/bits'
import { useToday } from './components/data'
import { usePlayerTier } from './tier'

const PROMPTS = ['learned', 'proud', 'work', 'kaydoudou'] as const
const PERF_PROMPTS = ['worked', 'keep', 'adjust', 'video'] as const
const PRINT_CSS = `@media print {
  @page { margin: 14mm; }
  body { background: #fff !important; }
  aside, header, nav { display: none !important; }
  body * { visibility: hidden !important; }
  #carnet-print, #carnet-print * { visibility: visible !important; }
  #carnet-print { position: absolute; inset: 0 auto auto 0; width: 100%; }
  #carnet-print article { break-inside: avoid; box-shadow: none !important; margin-bottom: 10mm; }
}`

/** Keys that have a senior version under perf.journal. */
const PERF_KEYS = new Set(['docTitle', 'new', 'newTitle', 'editTitle', 'search', 'printTitle', 'count', 'saved', 'updated', 'deleted', 'deleteTitle', 'deleteBody', 'fTitlePh', 'fText', 'fTextPh', 'fTextHint'])

type Draft = { id?: string; date: string; title: string; text: string; lessonNo?: number; createdAt?: string }

export default function Notebook() {
  const { t, lang } = useT('player')
  const { performance: perf } = usePlayerTier()
  /** senior wording when the performance space applies, the youth notebook otherwise */
  const k = (key: string) => (perf && PERF_KEYS.has(key) ? `perf.journal.${key}` : `notebook.${key}`)
  useDocumentTitle(t(k('docTitle')))
  const { profile } = useSession()
  const today = useToday()
  const entries = useLiveQuery(() => db.notebook.orderBy('date').reverse().toArray(), [], null as NotebookEntry[] | null)
  const lessons = useMemo(() => allLessons(lang), [lang])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [toDelete, setToDelete] = useState<NotebookEntry | null>(null)
  const [q, setQ] = useState('')
  const [params, setParams] = useSearchParams()
  const { toast, toastNode } = useToast()

  // /app/joueur/carnet?lecon=7 opens a new page linked to that lesson (from the lessons page).
  useEffect(() => {
    const n = Number(params.get('lecon'))
    if (n >= 1 && n <= 40) {
      const l = lessons.find((x) => x.no === n)
      setDraft({ date: today, title: l ? l.title : '', text: '', lessonNo: n })
      params.delete('lecon')
      setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const list = entries ?? []
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return list
    return list.filter((e) => (e.title + ' ' + e.text).toLowerCase().includes(k))
  }, [list, q])
  const ofDay = lessonOfDay(lessons, today)

  async function save(d: Draft) {
    const entry: NotebookEntry = {
      id: d.id ?? uid('nb_'), date: d.date || today, title: d.title.trim() || t('notebook.untitled'), text: d.text.trim(),
      lessonNo: d.lessonNo || undefined, createdAt: d.createdAt ?? nowISO(),
    }
    await db.notebook.put(entry)
    setDraft(null)
    toast({ text: d.id ? t(k('updated')) : t(k('saved')) })
  }
  async function remove(e: NotebookEntry) {
    await db.notebook.delete(e.id)
    setToDelete(null)
    toast({ text: t(k('deleted')), action: t('history.undo'), onAction: () => { db.notebook.put(e) } })
  }

  return (
    <div>
      <style>{PRINT_CSS}</style>
      {(() => {
        const actions = <>
          {list.length > 0 && <button type="button" className="btn-outline min-h-[44px]" onClick={() => window.print()}><Printer size={16} strokeWidth={1.75} aria-hidden="true" />{t('common:actions.print')}</button>}
          <button type="button" className="btn-primary min-h-[44px]" onClick={() => setDraft({ date: today, title: '', text: '' })}><Plus size={16} aria-hidden="true" />{t(k('new'))}</button>
        </>
        const search = list.length > 4 && (
          <div className="no-print relative mt-4 max-w-md">
            <label htmlFor="nb-search" className="sr-only">{t(k('search'))}</label>
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input id="nb-search" type="search" className="input h-11 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(k('search'))} />
          </div>
        )
        return perf ? (
          <div className="no-print mb-8"><PageHeader title={t('perf.journal.heading')} subtitle={t('perf.journal.subtitle')} actions={actions} />{search}</div>
        ) : (
          <NotebookHeader eyebrow={t('notebook.eyebrow')} title={t('notebook.title')} subtitle={t('notebook.subtitle')} actions={actions}>{search}</NotebookHeader>
        )
      })()}

      {entries === null ? null : list.length === 0 && perf ? (
        <section className="max-w-2xl rounded-[22px] border border-line bg-paper p-6 sm:p-8">
          <NotebookPen size={26} strokeWidth={1.75} aria-hidden="true" className="text-forest-600" />
          <h2 className="mt-4 text-[24px] leading-tight text-ink">{t('perf.journal.emptyTitle')}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{t('perf.journal.emptyBody')}</p>
          <button type="button" className="btn-primary mt-5 min-h-[44px]" onClick={() => setDraft({ date: today, title: '', text: '' })}><Plus size={16} aria-hidden="true" />{t('perf.journal.first')}</button>
        </section>
      ) : list.length === 0 ? (
        <PaperCard className="max-w-2xl">
          <div className="py-8 pl-14 pr-6 sm:py-10">
            <NotebookPen size={28} strokeWidth={1.75} aria-hidden="true" className="text-terra-600" />
            <h2 className={cx(handCls, 'mt-3 text-[28px] leading-tight text-ink')}>{t('notebook.emptyTitle')}</h2>
            <p className="mt-2 text-[15.5px] leading-[28px] text-ink-soft">{t('notebook.emptyBody')}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="btn-primary min-h-[44px]" onClick={() => setDraft({ date: today, title: '', text: '' })}><Plus size={16} aria-hidden="true" />{t('notebook.first')}</button>
              <button type="button" className="btn-outline min-h-[44px]" onClick={() => setDraft({ date: today, title: ofDay.title, text: '', lessonNo: ofDay.no })}>
                <BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />{t('notebook.fromLesson', { n: ofDay.no })}
              </button>
            </div>
          </div>
        </PaperCard>
      ) : (
        <div id="carnet-print">
          <div className="mb-4 hidden print:block">
            <div className={cx(handCls, 'text-[26px] font-semibold')}>{t(k('printTitle'), { name: profile?.name ?? '' })}</div>
          </div>
          {shown.length === 0 && <p className="py-8 text-center text-sm text-ink-muted">{t('notebook.noMatch')}</p>}
          <div className="max-w-3xl space-y-5">
            {shown.map((e) => <EntryCard key={e.id} e={e} plain={perf} lesson={perf ? undefined : lessons.find((l) => l.no === e.lessonNo)} onEdit={() => setDraft({ ...e })} onDelete={() => setToDelete(e)} />)}
          </div>
          <p className="no-print mt-6 max-w-3xl text-[13px] text-ink-muted">{t(k('count'), { count: list.length })}</p>
        </div>
      )}

      {draft && <EntryEditor draft={draft} lessons={lessons} perf={perf} onClose={() => setDraft(null)} onSave={save} />}

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title={t(k('deleteTitle'))}
        footer={<>
          <button type="button" className="btn-ghost min-h-[44px]" onClick={() => setToDelete(null)}>{t('common:actions.cancel')}</button>
          <button type="button" className="btn-danger min-h-[44px]" onClick={() => toDelete && remove(toDelete)}><Trash2 size={16} aria-hidden="true" />{t('common:actions.delete')}</button>
        </>}>
        <p className="text-[15px] text-ink-soft">{toDelete ? t(k('deleteBody'), { title: toDelete.title, date: fmtDate(toDelete.date, lang, { day: 'numeric', month: 'long' }) }) : ''}</p>
      </Modal>
      {toastNode}
    </div>
  )
}

function EntryCard({ e, lesson, plain = false, onEdit, onDelete }: { e: NotebookEntry; lesson?: LessonView; plain?: boolean; onEdit: () => void; onDelete: () => void }) {
  const { t, lang } = useT('player')
  const part = lesson ? partOf(lesson.no) : null
  if (plain) return (
    <article className="rounded-[18px] border border-line bg-paper p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <time dateTime={e.date} className="pt-0.5 text-[13.5px] font-semibold text-ink-muted first-letter:uppercase">{fmtDate(e.date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time>
        <div className="no-print -mr-2 -mt-1 flex shrink-0">
          <button type="button" className="btn-ghost h-11 w-11 justify-center p-0" onClick={onEdit} aria-label={t('notebook.edit', { title: e.title })}><Pencil size={16} aria-hidden="true" /></button>
          <button type="button" className="btn-ghost h-11 w-11 justify-center p-0 hover:text-clay-600" onClick={onDelete} aria-label={t('notebook.delete', { title: e.title })}><Trash2 size={16} aria-hidden="true" /></button>
        </div>
      </div>
      <h2 className="mt-1 text-[21px] leading-snug text-ink">{e.title}</h2>
      {e.text && <p className="mt-2 whitespace-pre-line break-words text-[15.5px] leading-relaxed text-ink-soft">{e.text}</p>}
    </article>
  )
  return (
    <PaperCard as="article">
      <div className="py-4 pl-12 pr-4 sm:py-5 sm:pl-14 sm:pr-5">
        <div className="flex items-start justify-between gap-3">
          <time dateTime={e.date} className="pt-0.5 text-[14px] font-semibold text-ink-muted first-letter:uppercase">{fmtDate(e.date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time>
          <div className="no-print -mr-2 -mt-1 flex shrink-0">
            <button type="button" className="btn-ghost h-11 w-11 justify-center p-0" onClick={onEdit} aria-label={t('notebook.edit', { title: e.title })}><Pencil size={16} aria-hidden="true" /></button>
            <button type="button" className="btn-ghost h-11 w-11 justify-center p-0 hover:text-clay-600" onClick={onDelete} aria-label={t('notebook.delete', { title: e.title })}><Trash2 size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <h2 className={cx(handCls, 'mt-1 text-[25px] leading-tight text-ink')}>{e.title}</h2>
        {e.text && <p className="mt-1 whitespace-pre-line break-words text-[16px] leading-[28px] text-ink-soft">{e.text}</p>}
        {lesson && part && (
          <Link to={`/app/joueur/lecons#lecon-${lesson.no}`} className="mt-3 inline-flex min-h-[40px] max-w-full items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1 pr-3.5 text-[13.5px] font-medium text-ink-soft hover:border-terra-300">
            <span className="inline-flex h-7 shrink-0 items-center rounded-full px-2 text-[11px] font-bold tabular-nums" style={{ background: part.tone, color: part.ink }}>{t('lesson.number', { n: lesson.no })}</span>
            <span className="truncate">{lesson.title}</span>
          </Link>
        )}
      </div>
    </PaperCard>
  )
}

function EntryEditor({ draft, lessons, perf, onClose, onSave }: { draft: Draft; lessons: LessonView[]; perf: boolean; onClose: () => void; onSave: (d: Draft) => void }) {
  const { t } = useT('player')
  const k = (key: string) => (perf && PERF_KEYS.has(key) ? `perf.journal.${key}` : `notebook.${key}`)
  const [d, setD] = useState<Draft>(draft)
  const set = (patch: Partial<Draft>) => setD((v) => ({ ...v, ...patch }))
  const addPrompt = (p: string) => set({ text: d.text ? `${d.text.replace(/\s+$/, '')}\n${p} ` : `${p} ` })
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (d.title.trim() || d.text.trim()) onSave(d) }
  const formId = 'nb-form'
  return (
    <Modal open onClose={onClose} title={d.id ? t(k('editTitle')) : t(k('newTitle'))} wide
      footer={<>
        <button type="button" className="btn-ghost min-h-[44px]" onClick={onClose}>{t('common:actions.cancel')}</button>
        <button type="submit" form={formId} className="btn-primary min-h-[44px]" disabled={!d.title.trim() && !d.text.trim()}>{t('common:actions.save')}</button>
      </>}>
      <form id={formId} onSubmit={submit}>
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-[1fr_180px]">
          <Field label={t('notebook.fTitle')} htmlFor="nb-title"><input id="nb-title" className="input" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder={t(k('fTitlePh'))} autoFocus /></Field>
          <Field label={t('notebook.fDate')} htmlFor="nb-date"><input id="nb-date" type="date" className="input" value={d.date} onChange={(e) => set({ date: e.target.value })} required /></Field>
        </div>
        <Field label={t(k('fText'))} htmlFor="nb-text" hint={t(k('fTextHint'))}>
          <textarea id="nb-text" className="input min-h-[200px] leading-7" value={d.text} onChange={(e) => set({ text: e.target.value })} placeholder={t(k('fTextPh'))} />
        </Field>
        <div className="-mt-2 mb-4 flex flex-wrap gap-1.5" role="group" aria-label={t('notebook.prompts')}>
          {(perf ? PERF_PROMPTS : PROMPTS).map((p) => (
            <button key={p} type="button" className="chip min-h-[38px] cursor-pointer px-3 text-[13px] hover:border-forest-300" onClick={() => addPrompt(t(`${perf ? 'perf.journal' : 'notebook'}.prompt.${p}`))}>
              <Plus size={12} aria-hidden="true" />{t(`${perf ? 'perf.journal' : 'notebook'}.prompt.${p}`)}
            </button>
          ))}
        </div>
        {!perf && <Field label={t('notebook.fLesson')} htmlFor="nb-lesson" hint={t('notebook.fLessonHint')}>
          <select id="nb-lesson" className="input" value={d.lessonNo ?? ''} onChange={(e) => set({ lessonNo: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">{t('notebook.noLesson')}</option>
            {lessons.map((l) => <option key={l.no} value={l.no}>{t('notebook.lessonOption', { n: l.no, title: l.title })}</option>)}
          </select>
        </Field>}
      </form>
    </Modal>
  )
}
