// Analytique: a short club overview. The Indice Njangi of the season of every team side by side, the five
// sub-indices per team, and the weak point the club shares. The full tools live in the analysis studio.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3 } from 'lucide-react'
import { useT } from '../../../i18n'
import { drillText, getDrill } from '../../../content'
import { DRILLS_FOR, fmtNjangi, njangiLabel, SUB_KEYS, subLevel, type SubKey } from '../../../lib/njangi'
import type { MatchEvent } from '../../../lib/types'
import { cx } from '../../../lib/util'
import { currentSeason, teamSeason, type ClubData } from '../components/data'
import { shortTeam } from './PlayersTab'

const BANDS = [35, 50, 65, 80]

export function AnalyticsTab({ data, eventsByMatch }: { data: ClubData; eventsByMatch: Map<string, MatchEvent[]> }) {
  const { t, lang } = useT('club')
  const season = currentSeason()
  const seasons = useMemo(() => data.teams.map((tm) => teamSeason(tm, data, eventsByMatch, season)), [data, eventsByMatch, season.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const scored = seasons.filter((s) => s.result)
  const common: { sub: SubKey; avg: number } | null = useMemo(() => {
    if (!scored.length) return null
    const avg = (k: SubKey) => scored.reduce((a, s) => a + s.result!.sub[k], 0) / scored.length
    const sub = [...SUB_KEYS].sort((a, b) => avg(a) - avg(b))[0]
    return { sub, avg: Math.round(avg(sub) * 10) / 10 }
  }, [scored])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 rounded-panel border border-line bg-paper p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="max-w-2xl">
          <h2 className="text-[20px] leading-tight text-ink sm:text-[22px]">{t('analytics.title', { season: season.label })}</h2>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-muted">{t('analytics.lead')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link to="/app/analyse/studio" className="btn-primary min-h-[44px]"><BarChart3 size={17} />{t('analytics.studio')}</Link>
          <Link to="/app/analyse" className="btn-outline min-h-[44px]">{t('analytics.reports')}</Link>
        </div>
      </div>

      <section aria-labelledby="an-indice" className="mb-10">
        <h3 id="an-indice" className="mb-1 text-[18px] leading-tight text-ink">{t('analytics.compare')}</h3>
        <p className="mb-4 text-[13.5px] text-ink-muted">{t('analytics.compareHint')}</p>
        <ul className="space-y-4">
          {seasons.map((s) => (
            <li key={s.team.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-1.5 sm:grid-cols-[11rem_minmax(0,1fr)_7.5rem] sm:items-center">
              <span className="truncate text-[14.5px] font-semibold text-ink">{shortTeam(s.team, data.club?.name)}</span>
              <span className="num text-right font-display text-[20px] leading-none text-ink sm:order-last">{s.result ? fmtNjangi(s.result.total, lang) : '-'}</span>
              <div className="col-span-2 sm:col-span-1">
                <div className="relative h-3 overflow-hidden rounded-full bg-sand" role="img" aria-label={s.result ? t('analytics.barLabel', { team: s.team.name, v: fmtNjangi(s.result.total, lang) }) : t('analytics.none')}>
                  {s.result && <div className="h-full rounded-full bg-forest-600" style={{ width: `${Math.min(100, s.result.total)}%` }} />}
                  {BANDS.map((b) => <span key={b} aria-hidden="true" className="absolute inset-y-0 w-px bg-paper/90" style={{ left: `${b}%` }} />)}
                </div>
                <p className="mt-1 text-[12.5px] text-ink-muted">{s.result ? `${njangiLabel(s.result.total, lang)}. ${t('analytics.matches', { count: s.coded.length })}` : t('analytics.none')}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {scored.length > 0 && (
        <section aria-labelledby="an-subs" className="mb-10">
          <h3 id="an-subs" className="mb-4 text-[18px] leading-tight text-ink">{t('analytics.subsTitle')}</h3>
          <div className="overflow-x-auto rounded-card border border-line bg-paper">
            <table className="table-n min-w-[620px]">
              <thead>
                <tr>
                  <th scope="col" className="pl-4 sm:pl-5">{t('analytics.team')}</th>
                  {SUB_KEYS.map((k) => <th key={k} scope="col" className="num">{t(`subs.${k}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {scored.map((s, si) => {
                  const weakest = s.weakest
                  return (
                    <tr key={s.team.id}>
                      <th scope="row" className={cx('py-3 pl-4 text-[14px] font-semibold text-ink sm:pl-5', si < scored.length - 1 && 'border-b border-line/70')}>{shortTeam(s.team, data.club?.name)}</th>
                      {SUB_KEYS.map((k) => {
                        const v = s.result!.sub[k]
                        const lvl = subLevel(v)
                        return (
                          <td key={k} className="num">
                            <span className={cx('inline-block rounded-full px-2 py-0.5 font-semibold', k === weakest ? 'bg-clay-50 text-clay-700' : lvl === 2 ? 'text-forest-700' : 'text-ink-soft')}>{fmtNjangi(v, lang)}</span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-muted">{t('analytics.subsHint')}</p>
        </section>
      )}

      {common && (
        <section aria-labelledby="an-common" className="rounded-panel bg-forest-50 p-5 sm:p-6">
          <h3 id="an-common" className="text-[18px] leading-tight text-ink">{t('analytics.commonTitle', { sub: t(`subs.${common.sub}`) })}</h3>
          <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-soft">{t('analytics.commonBody', { sub: t(`subs.${common.sub}`).toLowerCase(), v: fmtNjangi(common.avg, lang) })}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {DRILLS_FOR[common.sub].map((d) => { const dr = getDrill(d); return <Link key={d} to={`/app/exercices/${d}`} className="btn-outline btn-sm min-h-[40px] bg-paper"><span className="num font-semibold text-forest-700">{d}</span>{dr ? drillText(dr, lang).title : ''}</Link> })}
          </div>
        </section>
      )}
    </div>
  )
}
