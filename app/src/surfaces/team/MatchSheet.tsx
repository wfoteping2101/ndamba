import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChartLine, Clock, Crown, Goal, House, Lock, MapPin, Pencil, Plane, Printer, Radio, Trash2, Trophy } from 'lucide-react'
import { db } from '../../lib/db'
import { useLiveQuery, useDocumentTitle } from '../../lib/hooks'
import { useSession } from '../../lib/session'
import { convocationText } from '../../lib/actions'
import { computeNjangi, njangiLabel } from '../../lib/njangi'
import { BRAND, GATES } from '../../lib/config'
import type { GamePlan, Match, Player } from '../../lib/types'
import { Callout, EmptyState, Modal } from '../../ui'
import { useT } from '../../i18n'
import { cx, fmtDate, todayISO } from '../../lib/util'
import { byNumber, resultOf, type MatchWithConvo } from './components/lineup'
import { LineupBoard } from './components/LineupBoard'
import { ShareBar } from './components/ShareBar'
import { ConfirmModal, NjangiDial, NumberBadge, StatusBadge, Stepper } from './components/bits'
import { MatchJourneyButtons } from './components/journey/Entries'

const MOMENTS: (keyof GamePlan)[] = ['possession', 'transitionDef', 'defense', 'transitionOff', 'setPieces']

export default function MatchSheet() {
  const { id = '' } = useParams()
  const { t, lang } = useT('team')
  const nav = useNavigate()
  const { profile, teams } = useSession()
  const data = useLiveQuery(async () => {
    const match = (await db.matches.get(id)) as MatchWithConvo | undefined
    if (!match) return null
    const [players, eventCount, liveMatches] = await Promise.all([
      db.players.where('teamId').equals(match.teamId).toArray(),
      db.events.where('matchId').equals(id).count(),
      db.events.orderBy('matchId').uniqueKeys(),
    ])
    const events = eventCount ? await db.events.where('matchId').equals(id).toArray() : []
    return { match, players, eventCount, events, taggedMatchIds: liveMatches as string[] }
  }, [id], undefined as undefined | null | { match: MatchWithConvo; players: Player[]; eventCount: number; events: import('../../lib/types').MatchEvent[]; taggedMatchIds: string[] })
  useDocumentTitle(data?.match ? t('sheet.docTitleVs', { opponent: data.match.opponent }) : t('sheet.docTitle'))
  const [scoreOpen, setScoreOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [convoOpen, setConvoOpen] = useState(false)

  const njangi = useMemo(() => (data?.events.length ? computeNjangi(data.events) : null), [data?.events])

  if (data === undefined) return <div className="grid min-h-[40vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-forest-100 border-t-forest-600" /></div>
  if (data === null) return <div className="mx-auto max-w-lg pt-6"><EmptyState icon={<Trophy size={32} />} title={t('sheet.notFoundTitle')} body={t('sheet.notFoundBody')} action={<Link to="/app/matchs" className="btn-primary">{t('sheet.back')}</Link>} /></div>

  const { match, players, eventCount } = data
  const team = teams.find((x) => x.id === match.teamId) ?? null
  const byId = new Map(players.map((p) => [p.id, p]))
  const bench = match.subs.map((s) => byId.get(s)).filter((p): p is Player => !!p)
  const starters = match.lineup.map((l) => (l.playerId ? byId.get(l.playerId) : undefined)).filter((p): p is Player => !!p)
  const captain = match.captainId ? byId.get(match.captainId) : undefined
  const done = match.status === 'done'
  const hasReport = eventCount > 0 || done
  const convo = match.convocation || convocationText(match, team ?? undefined, players, lang)
  const planFilled = MOMENTS.some((k) => match.plan?.[k]?.trim())
  const res = done ? resultOf(match) : null
  const teamName = team?.name ?? ''
  const left = match.home ? { name: teamName, score: match.scoreUs, us: true } : { name: match.opponent, score: match.scoreThem, us: false }
  const right = match.home ? { name: match.opponent, score: match.scoreThem, us: false } : { name: teamName, score: match.scoreUs, us: true }
  // free plan: one live-tagged match; never gate a match that already has tags
  const otherTagged = data.taggedMatchIds.filter((m) => m !== match.id).length
  const gated = profile?.plan === 'free' && eventCount === 0 && otherTagged >= GATES.liveMatchesFree

  const startLive = async () => {
    if (gated) return
    if (match.status !== 'live') await db.matches.update(match.id, { status: 'live' })
    nav(`/app/analyse/live/${match.id}`)
  }
  const remove = async () => {
    await db.transaction('rw', db.matches, db.events, async () => { await db.events.where('matchId').equals(match.id).delete(); await db.matches.delete(match.id) })
    nav('/app/matchs', { replace: true })
  }

  return (
    <div className="match-sheet">
      <style>{`@media print {
        .match-sheet { font-size: 12px; }
        .match-sheet .print-plate { background: #fff !important; color: #12211A !important; border: 1.5px solid #0B5D3B; }
        .match-sheet .print-plate * { color: #12211A !important; border-color: #DCE2D8 !important; }
        .match-sheet .print-grid { display: grid !important; grid-template-columns: 320px 1fr !important; gap: 16px !important; }
        .match-sheet section, .match-sheet aside { break-inside: avoid; }
        header, nav, aside.sticky, .no-print { display: none !important; }
        main { padding: 0 !important; }
      }`}</style>

      <div className="no-print mb-3 flex items-center justify-between gap-2">
        <Link to="/app/matchs" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink"><ArrowLeft size={16} />{t('sheet.back')}</Link>
        <div className="flex gap-1">
          <button type="button" className="btn-ghost btn-sm min-h-[40px]" onClick={() => window.print()} aria-label={t('sheet.print')}><Printer size={16} /><span className="hidden sm:inline">{t('sheet.print')}</span></button>
          <Link to={`/app/matchs/${match.id}/modifier`} className="btn-ghost btn-sm min-h-[40px]" aria-label={t('sheet.edit')}><Pencil size={16} /><span className="hidden sm:inline">{t('sheet.edit')}</span></Link>
          <button type="button" className="btn-ghost btn-sm min-h-[40px] text-clay-600" onClick={() => setDelOpen(true)} aria-label={t('sheet.delete')}><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="mb-1 hidden text-xs font-semibold text-ink-muted print:block">{t('sheet.printTitle')}, {BRAND.name}</div>

      {/* match plate */}
      <section className="print-plate relative mb-5 overflow-hidden rounded-[22px] bg-forest-600 text-cream">
        <div className="relative px-5 pb-5 pt-4 sm:px-8 sm:pb-7 sm:pt-6">
          <div className="flex flex-wrap items-center justify-center gap-2 text-center">
            <StatusBadge status={match.status} toScore={match.status === 'planned' && match.date < todayISO()} />
            {match.competition && <span className="text-[13px] font-medium text-cream/80">{match.competition}</span>}
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <TeamSide name={left.name} us={left.us} align="right" />
            <div className="text-center">
              {done ? (
                <div className="font-display text-[44px] leading-none tabular-nums sm:text-[60px]">{left.score}<span className="mx-2.5 inline-block h-[0.07em] w-[0.32em] rounded-full bg-cream/40 align-middle sm:mx-3" aria-label="-" />{right.score}</div>
              ) : (
                <div className="font-display text-[30px] leading-none tabular-nums sm:text-[44px]">{match.time || t('matches.vs')}</div>
              )}
              {res && <div className={cx('mt-2 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold', res === 'W' ? 'bg-cream text-forest-700' : res === 'L' ? 'bg-clay-500 text-white' : 'bg-white/15 text-cream')}>{t(`matches.result.${res}`)}</div>}
            </div>
            <TeamSide name={right.name} us={right.us} align="left" />
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1.5 border-t border-white/15 pt-4 text-[13.5px] text-cream/85">
            <span className="inline-flex items-center gap-1.5"><Clock size={15} />{fmtDate(match.date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{match.time ? `, ${match.time}` : ''}</span>
            {match.venue && <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{match.venue}</span>}
            <span className="inline-flex items-center gap-1.5">{match.home ? <House size={15} /> : <Plane size={15} />}{match.home ? t('matches.home') : t('matches.away')}</span>
            <span>{t('formatLabel', { n: match.format })}, {t('sheet.halves', { n: match.halfMinutes })}</span>
          </div>
        </div>
      </section>

      {/* actions */}
      <div className="no-print mb-6 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {!done && (
            <button type="button" onClick={startLive} disabled={gated} className={cx('btn-lg', match.status === 'live' ? 'btn-danger' : 'btn-dark', 'justify-center')}>
              {gated ? <Lock size={18} /> : <Radio size={18} />}{match.status === 'live' ? t('sheet.resumeLive') : t('sheet.live')}
            </button>
          )}
          {hasReport && <Link to={`/app/analyse/rapport/${match.id}`} className="btn-primary btn-lg justify-center"><ChartLine size={18} />{t('sheet.report')}</Link>}
          {eventCount === 0 && (
            <button type="button" className="btn-outline btn-lg justify-center" onClick={() => setScoreOpen(true)}><Goal size={18} />{done ? t('sheet.editScore') : t('sheet.score')}</button>
          )}
          <MatchJourneyButtons match={match} players={players} />
        </div>
        {gated && <Callout tone="sun" title={t('sheet.gateTitle')}>{t('sheet.gateBody')} <Link to="/app/premium" className="link">{t('sheet.gateCta')}</Link></Callout>}
      </div>

      <div className="print-grid grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <section className="card card-pad" aria-labelledby="lu-h">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="lu-h" className="font-display text-lg">{t('sheet.lineup')}</h2>
              <span className="text-sm font-semibold tabular-nums text-ink-muted">{match.formation}</span>
            </div>
            <div className="mx-auto max-w-[360px]">
              <LineupBoard format={match.format} formation={match.formation} lineup={match.lineup} players={players} captainId={match.captainId} />
            </div>
            {captain && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
                <Crown size={16} strokeWidth={1.75} className="text-forest-700" /><span className="text-ink-muted">{t('sheet.captain')}</span><span className="font-semibold text-ink">{captain.name}</span>
              </div>
            )}
          </section>
          <section className="card card-pad" aria-labelledby="bench-h">
            <h2 id="bench-h" className="mb-2 font-display text-lg">{t('sheet.bench')}</h2>
            {bench.length === 0 ? <p className="text-sm text-ink-muted">{t('sheet.noBench')}</p> : (
              <ul className="grid grid-cols-1 gap-1 min-[420px]:grid-cols-2 print:grid-cols-1">
                {[...bench].sort(byNumber).map((p) => (
                  <li key={p.id}><Link to={`/app/equipe/${p.id}`} className="flex min-h-[44px] items-center gap-2.5 rounded-lg px-1.5 hover:bg-sand/60">
                    <NumberBadge player={p} size="sm" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{p.name}</span><span className="text-[11.5px] text-ink-muted">{t(`common:positions.${p.position}`)}</span></span>
                  </Link></li>
                ))}
              </ul>
            )}
          </section>
          {/* print-only squad list */}
          <section className="hidden print:block">
            <h2 className="mb-1 font-display text-base font-semibold">{t('sheet.printSquad')}</h2>
            <ol className="columns-2 text-[11px]">{[...starters].sort(byNumber).map((p) => <li key={p.id}>{p.number ?? ''} {p.name}{p.id === match.captainId ? ' (C)' : ''}</li>)}</ol>
          </section>
        </div>

        <div className="space-y-5">
          {njangi && (
            <Link to={`/app/analyse/rapport/${match.id}`} className="card card-pad flex items-center gap-4 transition hover:border-forest-300">
              <NjangiDial value={njangi.total} size={64} label={t('matches.njangi')} />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-forest-700">{t('matches.njangi')}</div>
                <div className="font-display text-lg text-ink">{njangiLabel(njangi.total, lang)}<span className="ml-2 font-sans text-sm font-semibold tabular-nums text-ink-muted">{njangi.total.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 })} / 100</span></div>
                <div className="text-xs text-ink-muted">{t('sheet.events', { count: eventCount })}</div>
              </div>
            </Link>
          )}

          <section className="card overflow-hidden" aria-labelledby="plan-h">
            <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
              <h2 id="plan-h" className="font-display text-lg">{t('sheet.plan')}</h2>
              <Link to={`/app/matchs/${match.id}/modifier`} className="no-print btn-ghost btn-sm"><Pencil size={14} />{t('sheet.edit')}</Link>
            </div>
            {planFilled ? (
              <dl className="divide-y divide-line/70">
                {MOMENTS.map((k) => (
                  <div key={k} className="grid gap-1 px-4 py-3.5 sm:grid-cols-[180px_1fr] sm:gap-5 sm:px-5">
                    <dt className="text-[14px] font-semibold text-ink">{t(`moments.${k}.title`)}</dt>
                    <dd className={cx('whitespace-pre-line text-[14.5px] leading-6', match.plan?.[k]?.trim() ? 'text-ink-soft' : 'text-ink-faint')}>{match.plan?.[k]?.trim() || t('sheet.planEmpty')}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="px-4 py-6 text-center sm:px-5">
                <p className="text-sm text-ink-muted">{t('sheet.planNone')}</p>
                <Link to={`/app/matchs/${match.id}/modifier`} className="btn-outline btn-sm no-print mt-3">{t('sheet.addPlan')}</Link>
              </div>
            )}
          </section>

          {!done && (
            <section className="card card-pad no-print" aria-labelledby="convo-h">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h2 id="convo-h" className="font-display text-lg">{t('sheet.convocation')}</h2>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setConvoOpen(true)}>{t('common:actions.open')}</button>
              </div>
              <p className="mb-3 text-[13px] text-ink-muted">{t('sheet.convoHint')}</p>
              <ShareBar text={convo} match={match} team={team} compact />
            </section>
          )}
          <p className="hidden pt-2 text-center text-[11px] italic text-ink-muted print:block">{t('sheet.printMotto')}</p>
        </div>
      </div>

      <ScoreModal open={scoreOpen} onClose={() => setScoreOpen(false)} match={match} teamName={teamName} />
      <ConfirmModal open={delOpen} onClose={() => setDelOpen(false)} title={t('sheet.deleteTitle')} body={t('sheet.deleteBody', { opponent: match.opponent })} confirm={t('sheet.delete')} onConfirm={remove} />
      <Modal open={convoOpen} onClose={() => setConvoOpen(false)} title={t('sheet.convocation')} footer={<ShareBar text={convo} match={match} team={team} compact />}>
        <pre className="whitespace-pre-wrap font-sans text-[14.5px] leading-6 text-ink-soft">{convo}</pre>
      </Modal>
    </div>
  )
}

function TeamSide({ name, us, align }: { name: string; us: boolean; align: 'left' | 'right' }) {
  return (
    <div className={cx('min-w-0', align === 'right' ? 'text-right' : 'text-left')}>
      <div className={cx('font-display text-[16px] leading-tight sm:text-[24px]', us ? 'text-cream' : 'text-cream/85')}>{name}</div>
      {us && <div className={cx('mt-1.5 h-1 w-8 rounded-full bg-sun-500', align === 'right' ? 'ml-auto' : '')} aria-hidden="true" />}
    </div>
  )
}

function ScoreModal({ open, onClose, match, teamName }: { open: boolean; onClose: () => void; match: Match; teamName: string }) {
  const { t } = useT('team')
  const [us, setUs] = useState(match.scoreUs)
  const [them, setThem] = useState(match.scoreThem)
  const save = async () => { await db.matches.update(match.id, { scoreUs: us, scoreThem: them, status: 'done' }); onClose() }
  const rows = [
    { name: teamName, v: us, set: setUs },
    { name: match.opponent, v: them, set: setThem },
  ]
  const ordered = match.home ? rows : [rows[1], rows[0]]
  return (
    <Modal open={open} onClose={onClose} title={t('sheet.scoreTitle')}
      footer={<><button type="button" className="btn-ghost" onClick={onClose}>{t('common:actions.cancel')}</button><button type="button" className="btn-primary" onClick={save}>{t('sheet.scoreSave')}</button></>}>
      <p className="mb-4 text-sm text-ink-muted">{t('sheet.scoreHint')}</p>
      <div className="space-y-3">
        {ordered.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
            <span className="min-w-0 truncate font-display text-lg">{r.name}</span>
            <Stepper value={r.v} onChange={r.set} max={40} lessLabel={t('sheet.less', { team: r.name })} moreLabel={t('sheet.more', { team: r.name })} big />
          </div>
        ))}
      </div>
    </Modal>
  )
}
