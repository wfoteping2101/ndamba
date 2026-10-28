import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, Copy, Dumbbell, MessageCircle, MoreHorizontal, PenLine, Plus, Printer, Trash2 } from 'lucide-react'
import { MolaMark } from '../../ui/brand'
import { Badge, EmptyState, Field, Modal } from '../../ui'
import { useT } from '../../i18n'
import { db } from '../../lib/db'
import { buildBlocks, sessionMinutes, toICS, whatsappLink } from '../../lib/actions'
import { useDocumentTitle, useLiveQuery } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { BRAND, GATES } from '../../lib/config'
import { cx, download, fmtDate, nowISO, uid } from '../../lib/util'
import { INTENTIONS, SKILLS } from '../../content'
import type { Intention, MD, Session, SessionBlock } from '../../lib/types'
import { BlockRow } from './components/BlockRow'
import { AddDrillDrawer } from './components/AddDrillDrawer'
import { PrintSheet } from './components/PrintSheet'
import { ConfirmModal, IntensityLegend, IntensityProfile, MdBadge, useToast } from './components/bits'
import { useSessionQuota } from './components/NewSessionModal'
import { MD_LIST, blockTitle, coverage, drillBlock, sessionLoad } from './components/helpers'
import { SessionJourneyCard } from '../team/components/journey/Entries'

export default function SessionBuilder() {
  const { id } = useParams()
  const nav = useNavigate()
  const { t, lang } = useT('training')
  const { teams } = useSession()
  const quota = useSessionQuota()
  const stored = useLiveQuery(async () => (id ? (await db.sessions.get(id)) ?? null : null), [id], undefined as Session | null | undefined)
  const [s, setS] = useState<Session | null>(null)
  const dirty = useRef(false)
  const [drawer, setDrawer] = useState(false)
  const [freeOpen, setFreeOpen] = useState(false)
  const [freeTitle, setFreeTitle] = useState('')
  const [freeMin, setFreeMin] = useState(10)
  const [autoOpen, setAutoOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [more, setMore] = useState(false)
  const { toast, toastNode } = useToast()
  useDocumentTitle(s?.title || t('builder.docTitle'))
  // the title wraps on phones: grow the field with its text
  const titleRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    const fit = () => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [s?.title])

  // local copy for instant typing; saved to IndexedDB shortly after each change
  useEffect(() => { if (stored && !dirty.current) setS(stored) }, [stored])
  useEffect(() => {
    if (!s || !dirty.current) return
    const h = setTimeout(async () => { await db.sessions.put(s); dirty.current = false }, 350)
    return () => clearTimeout(h)
  }, [s])
  const sRef = useRef<Session | null>(null)
  sRef.current = s
  useEffect(() => () => { if (dirty.current && sRef.current) db.sessions.put(sRef.current) }, [])

  const patch = (p: Partial<Session>) => { dirty.current = true; setS((cur) => (cur ? { ...cur, ...p } : cur)) }
  const setBlocks = (fn: (b: SessionBlock[]) => SessionBlock[]) => { dirty.current = true; setS((cur) => (cur ? { ...cur, blocks: fn(cur.blocks) } : cur)) }

  const stats = useMemo(() => {
    if (!s) return null
    const cov = coverage(s)
    return { minutes: sessionMinutes(s), load: sessionLoad(s), ...cov }
  }, [s])

  if (stored === undefined && !s) return null
  if (!s || !stats) {
    return (
      <div>
        <Link to="/app/seances" className="btn-ghost btn-sm -ml-2 mb-4"><ArrowLeft size={16} aria-hidden="true" />{t('builder.back')}</Link>
        <EmptyState icon={<Dumbbell size={32} />} title={t('builder.missingTitle')} body={t('builder.missingBody')} action={<Link to="/app/seances" className="btn-primary">{t('builder.back')}</Link>} />
      </div>
    )
  }

  const team = teams.find((x) => x.id === s.teamId)
  const move = (i: number, dir: -1 | 1) => setBlocks((bs) => { const a = [...bs]; const j = i + dir; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a })
  const addFree = () => { setBlocks((bs) => [...bs, { id: uid('bl_'), title: freeTitle.trim() || t('builder.freeBlock'), minutes: Math.max(1, freeMin || 10) }]); setFreeOpen(false); setFreeTitle(''); setFreeMin(10) }
  const autoCompose = () => {
    const blocks = buildBlocks({ md: s.md, intention: s.intention, ageGroup: team?.ageGroup, lang })
    setBlocks(() => blocks)
    toast({ text: blocks.length ? t('builder.autoDone', { count: blocks.length }) : t('builder.autoEmpty') })
  }

  const shareText = () => {
    const lines = [
      `${s.title}`,
      `${fmtDate(s.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}, ${t(`common:md.${s.md}`)}${team ? `, ${team.name}` : ''}`,
      s.intention ? `${t('fields.intention')}${t('colon')}${t(`common:intentions.${s.intention}`)}` : '',
      '',
      ...s.blocks.map((b, i) => `${i + 1}. ${b.drillId ? b.drillId + ' ' : ''}${blockTitle(b, lang) || t('builder.freeBlock')} (${b.minutes} min)`),
      '',
      `${t('builder.total')}${t('colon')}${stats.minutes} min`,
      '',
      t('common:brand.motto'),
    ]
    return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').replace(/^\n+/, '')
  }
  const icsFile = () => {
    const desc = s.blocks.map((b, i) => `${i + 1}. ${blockTitle(b, lang) || t('builder.freeBlock')} (${b.minutes} min)`).join('\n')
    const ics = toICS([{ uid: s.id, title: `${s.title} (${s.md === 'youth' ? t('common:md.youth') : s.md})`, date: s.date, time: '16:00', minutes: Math.max(30, stats.minutes), location: team?.name, description: desc }])
    download(`${BRAND.name.toLowerCase()}-${s.date}-${s.md}.ics`, ics, 'text/calendar')
    toast({ text: t('builder.icsDone') })
  }
  const duplicate = async () => {
    if (quota.limited) { toast({ text: t('upgrade.title', { n: GATES.sessionsFree }), to: '/app/premium', action: t('upgrade.cta') }); return }
    const copy: Session = { ...s, id: uid('se_'), title: t('sessions.copyTitle', { title: s.title }), blocks: s.blocks.map((b) => ({ ...b, id: uid('bl_') })), createdBy: 'user', createdAt: nowISO() }
    await db.sessions.put(copy)
    nav(`/app/seances/${copy.id}`)
  }
  const remove = async () => { dirty.current = false; await db.sessions.delete(s.id); nav('/app/seances', { replace: true }) }

  let clock = 0
  const starts = s.blocks.map((b) => { const c = clock; clock += Number(b.minutes) || 0; return c })
  const intentionsList = INTENTIONS.filter((i) => stats.intentions.has(i))
  const skillsList = SKILLS.filter((k) => stats.skills.has(k))

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Link to="/app/seances" className="btn-ghost btn-sm -ml-2"><ArrowLeft size={16} aria-hidden="true" />{t('builder.back')}</Link>
        {s.createdBy === 'mola' && <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest-700"><MolaMark size={15} aria-hidden="true" />{t('sessions.byMola')}</span>}
      </div>

      {/* editable header */}
      <section className="card card-pad mb-6">
        <label htmlFor="sb-title" className="sr-only">{t('fields.title')}</label>
        <div className="flex items-start gap-2">
          <textarea id="sb-title" ref={titleRef} rows={1} value={s.title} onChange={(e) => patch({ title: e.target.value.replace(/\n/g, ' ') })} placeholder={t(`mdTitle.${s.md}`)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
            className="-ml-2 min-w-0 flex-1 resize-none overflow-hidden rounded-xl border border-transparent bg-transparent px-2 py-1 font-display text-[24px] leading-tight text-ink hover:border-line focus:border-forest-500 focus:bg-white focus:outline-none sm:text-[32px]" />
          <PenLine size={18} className="mt-3 shrink-0 text-ink-faint" aria-hidden="true" />
        </div>
        <div className="mt-3 grid gap-x-3 sm:grid-cols-3">
          <Field label={t('fields.date')} htmlFor="sb-date"><input id="sb-date" type="date" className="input" value={s.date} onChange={(e) => e.target.value && patch({ date: e.target.value })} /></Field>
          <Field label={t('fields.intention')} htmlFor="sb-int">
            <select id="sb-int" className="input" value={s.intention ?? ''} onChange={(e) => patch({ intention: (e.target.value || undefined) as Intention | undefined })}>
              <option value="">{t('fields.anyIntention')}</option>
              {INTENTIONS.map((i) => <option key={i} value={i}>{t(`common:intentions.${i}`)}</option>)}
            </select>
          </Field>
          <Field label={t('fields.team')} htmlFor="sb-team">
            <select id="sb-team" className="input" value={s.teamId ?? ''} onChange={(e) => patch({ teamId: e.target.value || undefined })}>
              {teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              <option value="">{t('fields.noTeam')}</option>
            </select>
          </Field>
        </div>
        <div>
          <div className="label">{t('fields.md')}</div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('fields.md')}>
            {MD_LIST.map((m) => (
              <button key={m} type="button" aria-pressed={s.md === m} title={t(`mdName.${m}`)} onClick={() => patch({ md: m as MD })}
                className={cx('chip min-h-[38px] cursor-pointer px-3', s.md === m && 'chip-on')}>{m === 'youth' ? t('common:md.youth') : m}</button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-faint">{t(`mdHint.${s.md}`)}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-baseline gap-2 font-display text-xl text-ink">{t('builder.blocks')}<span className="font-sans text-[15px] font-semibold tabular-nums text-ink-faint" style={{ fontStretch: '100%' }}>{s.blocks.length}</span></h2>
            <button type="button" className="btn-outline btn-sm" onClick={() => (s.blocks.length ? setAutoOpen(true) : autoCompose())}><MolaMark size={15} aria-hidden="true" />{t('builder.auto')}</button>
          </div>

          {s.blocks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-paper/60 px-5 py-8 text-center">
              <h3 className="font-display text-lg text-ink">{t('builder.emptyTitle')}</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{t('builder.emptyBody')}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-primary" onClick={autoCompose}><MolaMark size={16} aria-hidden="true" />{t('builder.autoFirst')}</button>
                <button type="button" className="btn-outline" onClick={() => setDrawer(true)}><Plus size={16} aria-hidden="true" />{t('builder.addDrill')}</button>
              </div>
            </div>
          ) : (
            <ol className="space-y-3">
              {s.blocks.map((b, i) => (
                <BlockRow key={b.id} b={b} index={i} count={s.blocks.length} md={s.md} startMin={starts[i]}
                  onChange={(p) => setBlocks((bs) => bs.map((x) => (x.id === b.id ? { ...x, ...p } : x)))}
                  onMove={(dir) => move(i, dir)} onRemove={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))} />
              ))}
            </ol>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="btn-primary min-h-[48px]" onClick={() => setDrawer(true)}><Plus size={17} aria-hidden="true" />{t('builder.addDrill')}</button>
            <button type="button" className="btn-outline min-h-[48px]" onClick={() => setFreeOpen(true)}><PenLine size={16} aria-hidden="true" />{t('builder.addFree')}</button>
          </div>

          <div className="mt-6">
            <label htmlFor="sb-notes" className="label">{t('builder.sessionNotes')}</label>
            <textarea id="sb-notes" rows={3} className="input resize-y" placeholder={t('builder.sessionNotesPh')} value={s.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })} />
          </div>
        </div>

        {/* totals and actions */}
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <div className="card card-pad">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[12.5px] font-medium text-ink-muted">{t('builder.total')}</div>
                <div className="mt-0.5 font-display text-[40px] leading-none tabular-nums text-ink">{stats.minutes}<span className="ml-1.5 font-sans text-base font-medium text-ink-muted" style={{ fontStretch: '100%' }}>{t('common:misc.minutes')}</span></div>
              </div>
              <div className="text-right">
                <div className="text-[12.5px] font-medium text-ink-muted" title={t('week.loadHint')}>{t('builder.load')}</div>
                <div className="mt-0.5 font-display text-[26px] leading-none tabular-nums text-forest-600">{stats.load}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[12.5px] text-ink-muted"><span>{t('builder.profile')}</span><MdBadge md={s.md} /></div>
              <IntensityProfile session={s} height={64} labels interactive />
              <div className="mt-2"><IntensityLegend /></div>
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <div className="mb-1.5 text-[12.5px] font-medium text-ink-muted">{t('builder.intentions')}</div>
              {intentionsList.length ? (
                <div className="flex flex-wrap gap-1">
                  {intentionsList.map((i) => <Badge key={i} tone={i === s.intention ? 'dark' : 'forest'}>{t(`common:intentions.${i}`)}</Badge>)}
                </div>
              ) : <p className="text-xs text-ink-faint">{t('builder.nothingYet')}</p>}
              {s.intention && !stats.intentions.has(s.intention) && s.blocks.length > 0 && <p className="mt-2 text-xs text-clay-600">{t('builder.intentionMissing', { i: t(`common:intentions.${s.intention}`) })}</p>}
            </div>
            <div className="mt-3 border-t border-line pt-3">
              <div className="mb-1.5 text-[12.5px] font-medium text-ink-muted">{t('builder.skills', { n: skillsList.length })}</div>
              {skillsList.length ? <div className="flex flex-wrap gap-1">{skillsList.map((k) => <Badge key={k}>{t(`common:skills.${k}`)}</Badge>)}</div> : <p className="text-xs text-ink-faint">{t('builder.nothingYet')}</p>}
            </div>
          </div>

          <div className="no-print mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="btn-outline min-h-[48px]" onClick={() => window.print()} disabled={!s.blocks.length}><Printer size={16} aria-hidden="true" />{t('builder.print')}</button>
            <a href={whatsappLink(shareText())} target="_blank" rel="noreferrer" className="btn-outline min-h-[48px]"><MessageCircle size={16} aria-hidden="true" />WhatsApp</a>
            <button type="button" className="btn-outline min-h-[48px]" onClick={icsFile}><CalendarPlus size={16} aria-hidden="true" />{t('builder.ics')}</button>
            <div className="relative">
              <button type="button" className="btn-outline min-h-[48px] w-full" onClick={() => setMore((m) => !m)} aria-expanded={more} aria-haspopup="menu"><MoreHorizontal size={16} aria-hidden="true" />{t('builder.more')}</button>
              {more && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMore(false)} aria-hidden="true" />
                  <div className="absolute bottom-full right-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border border-line bg-paper py-1 shadow-lift" role="menu">
                    <button type="button" role="menuitem" className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm hover:bg-sand" onClick={async () => { setMore(false); try { await navigator.clipboard.writeText(shareText()); toast({ text: t('builder.copied') }) } catch { toast({ text: t('builder.copyFail') }) } }}><Copy size={16} aria-hidden="true" />{t('builder.copyText')}</button>
                    <button type="button" role="menuitem" className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm hover:bg-sand" onClick={() => { setMore(false); duplicate() }}><Copy size={16} aria-hidden="true" />{t('sessions.duplicate')}</button>
                    <button type="button" role="menuitem" className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm text-clay-600 hover:bg-clay-50" onClick={() => { setMore(false); setDelOpen(true) }}><Trash2 size={16} aria-hidden="true" />{t('common:actions.delete')}</button>
                  </div>
                </>
              )}
            </div>
          </div>
          <SessionJourneyCard session={s} />
          <p className="mt-5 text-center text-[14px] font-semibold italic text-ink-muted">{t('common:brand.motto')}</p>
        </aside>
      </div>

      <AddDrillDrawer open={drawer} onClose={() => setDrawer(false)} md={s.md} used={s.blocks.map((b) => b.drillId || '').filter(Boolean)}
        onAdd={(d) => setBlocks((bs) => [...bs, drillBlock(d)])} />

      <Modal open={freeOpen} onClose={() => setFreeOpen(false)} title={t('builder.addFree')}
        footer={<><button type="button" className="btn-ghost" onClick={() => setFreeOpen(false)}>{t('common:actions.cancel')}</button><button type="submit" form="free-block" className="btn-primary">{t('common:actions.add')}</button></>}>
        <form id="free-block" onSubmit={(e) => { e.preventDefault(); addFree() }}>
          <Field label={t('fields.title')} htmlFor="fb-title" hint={t('builder.freeHint')}><input id="fb-title" className="input" value={freeTitle} onChange={(e) => setFreeTitle(e.target.value)} placeholder={t('builder.freeTitlePh')} autoFocus /></Field>
          <Field label={t('builder.minutes')} htmlFor="fb-min"><input id="fb-min" type="number" inputMode="numeric" min={1} max={120} className="input w-32" value={freeMin} onChange={(e) => setFreeMin(Number(e.target.value))} /></Field>
        </form>
      </Modal>

      <ConfirmModal open={autoOpen} onClose={() => setAutoOpen(false)} title={t('builder.autoTitle')} confirm={t('builder.autoConfirm')}
        body={t('builder.autoBody', { md: t(`common:md.${s.md}`), intention: s.intention ? t(`common:intentions.${s.intention}`) : t('fields.anyIntention').toLowerCase(), count: s.blocks.length })} onConfirm={autoCompose} />
      <ConfirmModal open={delOpen} onClose={() => setDelOpen(false)} danger title={t('sessions.deleteTitle')} confirm={t('common:actions.delete')}
        body={t('sessions.deleteBody', { title: s.title, date: fmtDate(s.date, lang, { weekday: 'long', day: 'numeric', month: 'long' }) })} onConfirm={remove} />
      <PrintSheet s={s} team={team} />
      {toastNode}
    </div>
  )
}
