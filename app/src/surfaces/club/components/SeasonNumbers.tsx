// A player's season from the coded matches: matches, minutes, goals, actions per 90 minutes,
// and the share of the team's actions behind each sub-index of the Indice Njangi.
import { useT } from '../../../i18n'
import { SUB_KEYS } from '../../../lib/njangi'
import type { EventCode } from '../../../lib/types'
import { cx } from '../../../lib/util'
import type { PlayerSeason } from './data'

const PER90: EventCode[] = ['PASS_OK', 'PROG', 'LINE', 'FINAL3', 'BOX', 'FIX2', 'REGAIN5', 'SHOT']

export function SeasonNumbers({ s, compact = false }: { s: PlayerSeason; compact?: boolean }) {
  const { t, lang } = useT('club')
  const nf = (v: number, d = 1) => v.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
  const pct = (v: number) => `${Math.round(v * 100)}${lang === 'fr' ? ' %' : '%'}`
  const top: [string, string][] = [[t('season.matches'), String(s.matches)], [t('season.minutes'), String(s.minutes)], [t('season.goals'), String(s.goals)]]
  const hasEvents = Object.values(s.actions).some((v) => v > 0) || s.counts.PASS_OK > 0
  return (
    <div>
      <dl className="grid grid-cols-3 divide-x divide-line rounded-card border border-line bg-paper">
        {top.map(([k, v]) => (
          <div key={k} className="px-3 py-3 text-center sm:px-4">
            <dt className="text-[12.5px] font-semibold text-ink-muted">{k}</dt>
            <dd className="num mt-1 font-display text-[26px] leading-none text-ink sm:text-[30px]">{v}</dd>
          </div>
        ))}
      </dl>
      {!hasEvents ? (
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">{t('season.noEvents')}</p>
      ) : (
        <div className={cx('mt-4 grid gap-5', !compact && 'md:grid-cols-2')}>
          <div>
            <h4 className="mb-2 text-[14px] font-semibold text-ink">{t('season.per90')}</h4>
            <table className="w-full text-[14px]">
              <tbody>
                {PER90.map((c) => (
                  <tr key={c} className="border-b border-line/70 last:border-b-0">
                    <td className="py-1.5 text-ink-soft">{t(`common:events.${c}`)}</td>
                    <td className="num py-1.5 text-right font-semibold text-ink">{nf(s.per90(c))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="mb-2 text-[14px] font-semibold text-ink">{t('season.shares')}</h4>
            <ul className="space-y-2.5">
              {SUB_KEYS.map((k) => {
                const v = s.shares[k]
                return (
                  <li key={k}>
                    <div className="flex justify-between text-[13.5px]"><span className="text-ink-soft">{t(`subs.${k}`)}</span><span className="num font-semibold text-ink">{v == null ? '-' : pct(v)}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-forest-600" style={{ width: `${Math.min(100, (v ?? 0) * 100 * 4)}%` }} /></div>
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 text-[12.5px] leading-snug text-ink-muted">{t('season.sharesHint', { count: s.coded })}</p>
          </div>
        </div>
      )}
    </div>
  )
}
