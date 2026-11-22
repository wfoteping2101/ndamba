// What the report tabs share: the match, its events, the squad, the video, and small helpers.
import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useT } from '../../../../i18n'
import { cx } from '../../../../lib/util'
import type { EventCode, Match, MatchEvent, Player, Team } from '../../../../lib/types'
import type { NjangiResult } from '../../../../lib/njangi'
import { minuteText, videoHref, videoTimes, type HalfFilter } from '../../../../lib/viz'

export interface VizData {
  match: Match
  events: MatchEvent[]
  players: Player[]
  byId: Map<string, Player>
  team?: Team
  teamName: string
  /** the analysed match just before (for comparisons in the assist) */
  prev?: { opponent: string; result: NjangiResult } | null
  /** the video project of the match, when there is one */
  videoId: string | null
}

export const VizContext = createContext<VizData | null>(null)
export function useViz() {
  const v = useContext(VizContext)
  if (!v) throw new Error('useViz outside VizContext')
  return v
}

/** Open the studio at one moment or a list of moments; null when the match has no video. */
export function useOpenVideo() {
  const { videoId } = useViz()
  const navigate = useNavigate()
  return useCallback((events: readonly MatchEvent[]) => {
    if (!videoId) return
    const ts = videoTimes(events)
    if (ts.length) navigate(videoHref(videoId, ts))
  }, [videoId, navigate])
}

export const hasVideo = (videoId: string | null, events: readonly MatchEvent[]) => !!videoId && events.some((e) => typeof e.videoT === 'number')

/** "9 Eyoum": the number and the last name, for tight places. */
export function shortName(p?: Player) {
  if (!p) return ''
  const last = p.name.trim().split(/\s+/).slice(-1)[0] ?? p.name
  return p.number != null ? `${p.number} ${last}` : last
}

/** The label of a code: the shared vocabulary, or this namespace for set pieces. */
export function useCodeLabel() {
  const { t } = useT('viz')
  return useCallback((code: EventCode | string, side: 'us' | 'them' = 'us') => {
    const base = ['CORNER', 'FREEKICK', 'PENALTY', 'THROWIN', 'GOALKICK'].includes(code) ? t(`code.${code}`) : t(`common:events.${code}`)
    return side === 'them' ? t('code.theirs', { label: base }) : base
  }, [t])
}

export function useMinute() {
  const { match } = useViz()
  return useCallback((e: Pick<MatchEvent, 'half' | 't'>) => minuteText(e, match.halfMinutes), [match.halfMinutes])
}

/** Half filter chips: the match, first half, second half. */
export function HalfChips({ value, onChange }: { value: HalfFilter; onChange: (v: HalfFilter) => void }) {
  const { t } = useT('viz')
  const opts: { id: HalfFilter; label: string }[] = [{ id: 'all', label: t('half.all') }, { id: 1, label: t('half.1') }, { id: 2, label: t('half.2') }]
  return (
    <div className="inline-flex rounded-full border border-line bg-paper p-0.5" role="group" aria-label={t('half.label')}>
      {opts.map((o) => (
        <button key={String(o.id)} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={cx('min-h-[38px] rounded-full px-3.5 text-[13px] font-semibold transition-colors', value === o.id ? 'bg-forest-600 text-white' : 'text-ink-muted hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A compact choice between a few options (side, kind of action). */
export function Pills<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode }[]; label: string }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-paper p-0.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={cx('min-h-[38px] whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors', value === o.id ? 'bg-forest-600 text-white' : 'text-ink-muted hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Players who played or were coded, as select options. */
export function PlayerSelect({ value, onChange, ids, label, allLabel, className }: { value: string; onChange: (v: string) => void; ids: string[]; label: string; allLabel?: string; className?: string }) {
  const { byId } = useViz()
  const list = ids.map((id) => byId.get(id)).filter((p): p is Player => !!p).sort((a, b) => (a.number ?? 99) - (b.number ?? 99))
  return (
    <label className={cx('inline-flex min-w-0 items-center', className)}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input min-h-[40px] w-full rounded-full py-1.5 pl-3.5 pr-8 text-[13.5px] font-semibold sm:w-auto">
        {allLabel && <option value="">{allLabel}</option>}
        {list.map((p) => <option key={p.id} value={p.id}>{p.number != null ? `${p.number}. ` : ''}{p.name}</option>)}
      </select>
    </label>
  )
}

/** The play button of a stat or a list: opens the studio on the first moment and passes the others. */
export function PlayButton({ events, label, size = 'md', className }: { events: readonly MatchEvent[]; label: string; size?: 'sm' | 'md'; className?: string }) {
  const { videoId } = useViz()
  const open = useOpenVideo()
  const n = events.filter((e) => typeof e.videoT === 'number').length
  if (!videoId || !n) return null
  return (
    <button type="button" onClick={() => open(events)} aria-label={label} title={label}
      className={cx('grid shrink-0 place-items-center rounded-full bg-forest-50 text-forest-700 transition-colors hover:bg-forest-600 hover:text-white', size === 'sm' ? 'h-9 w-9' : 'h-11 w-11', className)}>
      <Play size={size === 'sm' ? 13 : 15} fill="currentColor" strokeWidth={0} aria-hidden="true" />
    </button>
  )
}

/** A key figure in a side panel row. */
export function Figure({ label, value, hint, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: 'us' | 'them' | 'loss' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/70 py-2.5 last:border-b-0">
      <dt className="min-w-0 text-[13.5px] text-ink-soft">{label}{hint && <span className="block text-[12px] text-ink-faint">{hint}</span>}</dt>
      <dd className={cx('shrink-0 text-right font-display text-[20px] leading-none tabular-nums', tone === 'them' ? 'text-ink-soft' : tone === 'loss' ? 'text-clay-600' : 'text-ink')}>{value}</dd>
    </div>
  )
}

export const pct = (v: number | null | undefined, lang: 'fr' | 'en', digits = 0) => {
  if (v == null || !Number.isFinite(v)) return null
  const n = (v * 100).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return lang === 'fr' ? `${n}\u202f%` : `${n}%`
}
export const num = (v: number | null | undefined, lang: 'fr' | 'en', digits = 1) => (v == null || !Number.isFinite(v) ? null : v.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 }))
