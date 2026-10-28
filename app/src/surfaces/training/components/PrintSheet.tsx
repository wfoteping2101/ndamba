import { createPortal } from 'react-dom'
import { Pitch } from '../../../ui'
import { viewSize } from '../../../lib/pitch.mjs'
import { useT } from '../../../i18n'
import { sessionMinutes } from '../../../lib/actions'
import { fmtDate } from '../../../lib/util'
import { BRAND } from '../../../lib/config'
import { drillText } from '../../../content'
import type { DiagramSpec, Session, Team } from '../../../lib/types'
import { blockDrill, blockIntensity, blockTitle } from './helpers'
import { IntensityProfile } from './bits'

const PRINT_CSS = `
.nj-print { display: none; }
@media print {
  @page { size: A4; margin: 11mm 12mm; }
  html, body { background: #fff !important; }
  #root { display: none !important; }
  .nj-print { display: block !important; color: #12211A; font-size: 10.5pt; }
  .nj-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .nj-print .nj-block { break-inside: avoid; page-break-inside: avoid; }
}
`

/** A diagram that fits a box of w x h millimetres (tall pitches shrink instead of stretching the row). */
function FitPitch({ spec, w, h }: { spec: DiagramSpec; w: number; h: number }) {
  let ratio = 0.66
  try { const s = viewSize(spec); ratio = (s.h + 2) / (s.w + 2) } catch { /* keep default */ }
  return <div style={{ width: `${Math.min(w, h / ratio)}mm` }}><Pitch spec={spec} width={300} /></div>
}

/** The one-page session sheet. Hidden on screen, it replaces the whole app when the coach prints. */
export function PrintSheet({ s, team }: { s: Session; team?: Team | null }) {
  const { t, lang } = useT('training')
  const total = sessionMinutes(s)
  const n = s.blocks.length
  // the more blocks, the smaller the diagrams and the fewer coaching points, so the sheet stays on one A4 page
  const box = n > 6 ? { w: 30, h: 19 } : n > 4 ? { w: 38, h: 28 } : { w: 50, h: 40 }
  const maxPoints = n > 6 ? 1 : n > 4 ? 2 : 3
  let start = 0
  return createPortal(
    <>
      <style>{PRINT_CSS}</style>
      <div className="nj-print" aria-hidden="true">
        <header className="mb-3 flex items-end justify-between gap-4 border-b-2 border-forest-600 pb-2">
          <div>
            <div className="text-[8.5pt] font-semibold text-forest-700">{team?.name ?? t('sheet.session')}</div>
            <h1 className="font-display text-[20pt] leading-tight">{s.title}</h1>
            <div className="text-[9.5pt] text-ink-soft">
              {fmtDate(s.date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, {t(`common:md.${s.md}`)}
              {s.intention ? `. ${t('fields.intention')}${t('colon')}${t(`common:intentions.${s.intention}`)}` : ''}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-[22pt] leading-none tabular-nums text-forest-600">{total}<span className="text-[10pt]"> min</span></div>
            <div className="text-[8.5pt] text-ink-muted">{t('blocksCount', { count: n })}</div>
            <div className="mt-1 w-[42mm]"><IntensityProfile session={s} height={16} /></div>
          </div>
        </header>
        <ol className={n > 6 ? 'space-y-1' : 'space-y-2'}>
          {s.blocks.map((b, i) => {
            const d = blockDrill(b)
            const tx = d ? drillText(d, lang) : undefined
            const from = start; start += b.minutes
            return (
              <li key={b.id} className={`nj-block flex gap-3 border-b border-line ${n > 6 ? 'pb-1' : 'pb-2'}`}>
                <div className="flex shrink-0 justify-center" style={{ width: `${box.w}mm` }}>
                  {d ? <FitPitch spec={d.diagram} w={box.w} h={box.h} /> : <div className="grid w-full place-items-center rounded-lg border border-dashed border-line text-[8pt] text-ink-faint" style={{ height: `${Math.min(box.h, 16)}mm` }}>{t('builder.freeBlock')}</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-semibold"><span className="mr-1 text-forest-600">{i + 1}.</span>{b.drillId && <span className="mr-1 text-[9pt] tabular-nums text-ink-muted">{b.drillId}</span>}{blockTitle(b, lang) || t('builder.freeBlock')}</div>
                    <div className="shrink-0 text-[9pt] font-semibold tabular-nums">{from}' {t('to')} {from + b.minutes}', {b.minutes} min, {t(`common:intensity.${blockIntensity(b, s.md)}`).toLowerCase()}</div>
                  </div>
                  {tx && <div className="text-[9pt] italic text-ink-soft">{tx.subtitle}{d ? `. ${lang === 'en' ? d.players.en : d.players.fr}, ${d.space.w} x ${d.space.h} m` : ''}</div>}
                  {tx?.coaching?.length ? (
                    <ul className="mt-1 list-disc pl-4 text-[9.5pt] leading-snug">
                      {tx.coaching.slice(0, maxPoints).map((c, k) => <li key={k}>{c}</li>)}
                    </ul>
                  ) : null}
                  {b.notes && <div className="mt-1 rounded bg-sand px-2 py-0.5 text-[9pt]"><b>{t('builder.notes')}{t('colon').trimEnd()}</b> {b.notes}</div>}
                </div>
              </li>
            )
          })}
        </ol>
        {s.notes && <p className="mt-2 text-[9.5pt]"><b>{t('builder.sessionNotes')}{t('colon').trimEnd()}</b> {s.notes}</p>}
        <footer className="mt-4 border-t-2 border-forest-600 pt-2 text-center">
          <div className="text-[12pt] font-semibold italic text-forest-700">{lang === 'fr' ? `« ${t('common:brand.motto')} »` : `“${t('common:brand.motto')}”`}</div>
          <div className="mt-0.5 text-[7.5pt] text-ink-faint">{t('sheet.footer', { book: t('common:footer.methode'), app: BRAND.name })}</div>
        </footer>
      </div>
    </>,
    document.body,
  )
}
